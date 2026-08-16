import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

function assertOrdered(text, markers, message) {
    let cursor = -1;
    for (const marker of markers) {
        const next = text.indexOf(marker, cursor + 1);
        assert.notEqual(next, -1, `${message}: missing ${marker}`);
        assert.ok(next > cursor, `${message}: ${marker} is out of order`);
        cursor = next;
    }
}

test("Smart Fit transport returns typed, customer-safe failures for every operational class", async () => {
    const client = await source("lib/pet-tryon.ts");

    for (const code of [
        "invalid_request",
        "login_required",
        "not_found",
        "already_running",
        "rate_limited",
        "temporarily_unavailable",
        "server_error",
        "network",
        "timeout",
        "aborted",
        "invalid_response",
    ]) {
        assert.match(client, new RegExp(`"${code}"`));
    }
    assert.match(client, /export type PetTryOnApiOutcome<T> =/);
    assert.match(client, /\| \{ ok: true; value: T \}/);
    assert.match(client, /\| \{ ok: false; error: PetTryOnApiError \}/);
    assert.match(client, /response\.status === 400 \|\| response\.status === 422[\s\S]*failure\("invalid_request", false/);
    assert.match(client, /response\.status === 401 \|\| response\.status === 403[\s\S]*failure\("login_required", false/);
    assert.match(client, /response\.status === 409[\s\S]*failure\("already_running", false/);
    assert.match(client, /response\.status === 429[\s\S]*failure\("rate_limited", true/);
    assert.match(client, /response\.status === 503[\s\S]*failure\("temporarily_unavailable", true/);
    assert.match(client, /response\.status >= 500[\s\S]*failure\("server_error", true/);
    assert.match(client, /if \(callerAborted\) throw new PetTryOnTransportError\("aborted"\)/);
    assert.match(client, /if \(timedOut\) throw new PetTryOnTransportError\("timeout"\)/);
    assert.match(client, /throw new PetTryOnTransportError\("network"\)/);
    assert.doesNotMatch(client, /Promise<PetTryOnResult \| null>|Promise<PetTryOnColorPreview \| null>/);
});

test("queued and running jobs remain server-owned and survive transient polling failures", async () => {
    const [client, background] = await Promise.all([
        source("lib/pet-tryon.ts"),
        source("lib/pet-tryon-background.tsx"),
    ]);

    assert.match(client, /START_REQUEST_TIMEOUT_MS = 45_000/);
    assert.match(client, /STATUS_REQUEST_TIMEOUT_MS = 20_000/);
    assert.match(client, /Math\.min\(900, Number\(data\.poll_after_seconds/);
    assert.match(client, /while \(\["queued", "running"\]\.includes\(result\.status\) && result\.jobId\)/);
    assert.match(client, /if \(polled\.error\.code === "aborted" \|\| !polled\.error\.retryable\) return polled/);
    assert.match(client, /transientFailures \+= 1;[\s\S]*minimumRetryDelaySeconds = polled\.error\.retryAfterSeconds \|\| 0;[\s\S]*continue;/);

    assert.match(background, /while \(current\.result && ACTIVE_STATUSES\.has\(current\.result\.status\)\)/);
    assert.match(background, /if \(polled\.error\.retryable\) \{[\s\S]*transientFailures \+= 1;[\s\S]*continue;/);
    assert.match(background, /minimumRetryDelaySeconds = polled\.error\.retryAfterSeconds \|\| 0/);
    assert.match(background, /fresh\.error\.retryAfterSeconds \|\| 0/);
    assert.match(background, /작업은 그대로 보관되며 상태를 자동으로 다시 확인합니다/);
    assert.doesNotMatch(background, /MAX_MONITOR_MS|deadlineReached|Date\.now\(\) - current\.startedAt/);
    assert.doesNotMatch(client, /15 \* 60 \* 1000|const deadline =/);
});

test("single-flight submission and persisted job identity prevent duplicate generations", async () => {
    const [modal, background] = await Promise.all([
        source("components/products/detail/PetTryOnPreview.tsx"),
        source("lib/pet-tryon-background.tsx"),
    ]);

    assert.match(modal, /if \(generationRequestPendingRef\.current\) return/);
    assert.match(modal, /generationRequestPendingRef\.current = true/);
    assert.match(modal, /finally \{[\s\S]*generationRequestPendingRef\.current = false/);
    assertOrdered(background, [
        "const existing = tasksRef.current.find",
        "if (isActive(existing))",
        "const first = await startPetTryOn(",
    ], "existing active task must win before POST");
    assert.match(background, /window\.sessionStorage\.setItem\(STORAGE_KEY/);
    assert.match(background, /result: task\.result \? \{ \.\.\.task\.result, imageDataUrl: undefined \} : null/);
    assert.match(background, /const jobId = storedTask\.result\?\.jobId/);
    assert.match(background, /const fresh = await getPetTryOnJob\(jobId, restoreController\.signal\)/);
    assert.match(background, /void monitorRef\.current\(refreshed\)/);
});

test("a terminal retry creates a new server attempt and never just reopens the failed job", async () => {
    const [client, background, modal] = await Promise.all([
        source("lib/pet-tryon.ts"),
        source("lib/pet-tryon-background.tsx"),
        source("components/products/detail/PetTryOnPreview.tsx"),
    ]);

    assert.match(client, /failureCode: String\(data\.failure_code \|\| ""\)/);
    assert.match(client, /retryAttempt: Math\.max\(0, Number\(data\.retry_attempt \|\| 0\)\)/);
    assert.match(background, /result\.failureCode === "retry_submit_not_started"/);
    assertOrdered(background, [
        "const retry = useCallback",
        "const catalogProduct = findProduct(failedTask.productId)",
        "return start(",
        "failedTask.correctionIssues || []",
        "true,",
    ], "terminal retry must submit a fresh confirmed attempt");
    assert.match(background, /onClick=\{\(\) => void retry\(visibleTask\)\}/);
    assert.match(background, /새 작업으로 다시 시도/);
    assert.match(modal, /Boolean\(sourceFit \|\| fitMasterRestoreBlocked \|\| finalGenerationFailed\)/);
});

test("a refreshed login token resumes the same member's paused Smart Fit job", async () => {
    const background = await source("lib/pet-tryon-background.tsx");

    assert.match(background, /const authSessionKey = user\?\.apiAccessToken/);
    assert.match(background, /previousAuthSessionKeyRef/);
    assert.match(background, /previousAccount === accountKey && previousAuthSession === authSessionKey/);
    assert.match(background, /previousAccount === accountKey && accountKey/);
    assert.match(background, /function resumeTasksAfterAuthentication/);
    assert.match(background, /task\.apiErrorCode === "login_required" && !task\.result/);
    assert.match(background, /task\.apiErrorCode === "login_required"[\s\S]*error: "", apiErrorCode: undefined/);
    assert.match(background, /commitTasks\(resumedTasks\)[\s\S]*setPanelOpen\(false\)/);
    assert.match(background, /\[accountKey, authSessionKey,/);
});

test("Smart Fit announces only status changes instead of every elapsed-second render", async () => {
    const background = await source("lib/pet-tryon-background.tsx");

    assert.doesNotMatch(background, /<section\s+aria-live="polite"/);
    assert.match(background, /role="status"[\s\S]*aria-live="polite"/);
});

test("Smart Fit never labels a result-less error placeholder as a saved job", async () => {
    const background = await source("lib/pet-tryon-background.tsx");

    assert.match(background, /loginRequired && !result[\s\S]*로그인하면 입혀보기 상태를 다시 확인해요/);
    assert.match(background, /invalidRequest && !result[\s\S]*새 입혀보기 작업은 시작되지 않았어요/);
    assert.match(background, /missingTask && !result[\s\S]*이 화면에서 새 작업을 만들지 않았어요/);
    assert.match(background, /existingTaskRunning && !result[\s\S]*중복 작업은 새로 만들지 않았어요/);
    assert.match(background, /\{panelSubtext\}/);
});

test("auth hydration and ineligible products keep a visible explanatory surface", async () => {
    const [modal, background] = await Promise.all([
        source("components/products/detail/PetTryOnPreview.tsx"),
        source("lib/pet-tryon-background.tsx"),
    ]);

    assert.match(modal, /const \{ user, hydrated \} = useAuth\(\)/);
    assert.match(modal, /!hydrated \? \(/);
    assert.match(modal, /회원 정보를 확인하고 있어요/);
    assert.match(modal, /!eligible \? \(/);
    assert.match(modal, /이 상품은 스마트 입혀보기를 지원하지 않아요/);
    assert.doesNotMatch(modal, /if \(!eligible\) return null/);
    assert.match(modal, /displayedErrorCode === "login_required"/);
    assert.match(modal, /displayedErrorCode === "already_running" \|\| loading/);

    const pauseStart = background.indexOf("const pauseTasksForAuthentication");
    const pauseEnd = background.indexOf("useEffect(() => {", pauseStart);
    assert.ok(pauseStart >= 0 && pauseEnd > pauseStart);
    const pause = background.slice(pauseStart, pauseEnd);
    assert.match(pause, /controller\.abort\(\)/);
    assert.doesNotMatch(pause, /setTasks\(\[\]\)|sessionStorage\.removeItem/);
    assert.match(background, /다시 로그인해 작업 이어보기/);
    assert.match(background, /href=\{`\/auth\/login\?returnTo=/);
});
