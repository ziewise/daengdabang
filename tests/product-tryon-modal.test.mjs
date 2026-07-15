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

test("price row opens the try-on modal and the old inline section is gone", async () => {
    const [info, detail] = await Promise.all([
        source("components/products/detail/ProductInfo.tsx"),
        source("app/(shop)/product/[slug]/ProductDetailClient.tsx"),
    ]);

    assert.match(info, /우리 아이에게 바로 입혀보기/);
    assert.match(info, /onClick=\{onTryOn\}/);
    assert.match(detail, /onTryOn=\{\(\) => setTryOnOpen\(true\)\}/);
    assert.match(detail, /\{tryOnOpen && \(/);
    assert.doesNotMatch(detail, /<PetTryOnPreview product=\{product\} \/>/);
});

test("try-on is a click-triggered branded modal with actual progress and background controls", async () => {
    const [modal, layout, background] = await Promise.all([
        source("components/products/detail/PetTryOnPreview.tsx"),
        source("app/layout.tsx"),
        source("lib/pet-tryon-background.tsx"),
    ]);

    assert.match(modal, /fixed inset-0 z-\[2400\]/);
    assert.match(modal, /role="progressbar"/);
    assert.match(modal, /사진과 선택 상품을 확인하고 있어요/);
    assert.match(modal, /자연스럽게 입히고 있어요/);
    assert.match(modal, /start\(product, pet\)/);
    assert.match(modal, /DDB SMART FIT/);
    assert.match(modal, /자연스러운 착용 미리보기/);
    assert.match(modal, /이 창을 닫아도 입혀보기는 계속 진행됩니다/);
    assert.match(modal, /계속 쇼핑/);
    assert.match(modal, /완성되면 알려줘/);
    assert.match(modal, /결과 다시 보기/);
    assert.doesNotMatch(modal, /Create again|다시 입혀보기/);
    assert.match(modal, /회원가입하고 우리 아이 등록하기/);
    assert.match(modal, /이미 회원이면 로그인/);
    assert.match(layout, /<PetTryOnTaskProvider>/);
    assert.match(background, /ddb\.tryon\.background\.v1/);
    assert.match(background, /Notification\.requestPermission\(\)/);
    assert.match(background, /try \{[\s\S]*new Notification/);
    assert.match(background, /Optional OS notifications must never downgrade a completed fitting/);
    assert.match(background, /Notification\.requestPermission\(\)[\s\S]*catch \{/);
    assert.match(background, /setNotificationEnabled\(false\)/);
    assert.match(background, /petImage: undefined/);
    assert.match(background, /getPetTryOnJob/);
    assert.match(background, /productHref: storefrontProductHref\(product\)/);
    assert.match(background, /accountKey: undefined/);
    assert.match(background, /parsed\.ownerKey !== ownerKey/);
    assert.match(background, /clearTaskForAccountChange/);
    assert.match(background, /submitAbort\.current\?\.abort\(\)/);
    assert.match(background, /restoreController\.abort\(\)/);
    assert.match(background, /accountKeyRef\.current !== initialTask\.accountKey/);
    assert.match(background, /status: "failed"/);
    assert.match(background, /Date\.now\(\) - current\.startedAt >= MAX_MONITOR_MS/);
    assert.match(background, /deadlineReached = true/);
    assert.match(background, /if \(!restoreStarted\) restoredOnce\.current = false/);
    assert.doesNotMatch(background, /productHref: `\/product\/\$\{encodeURIComponent\(product\.id\)\}`/);
    assert.equal(
        [...background.matchAll(/if \(!restoredOnce\.current\) return;/g)].length,
        2,
        "initial persistence effects must not clear the recovery record before it is read",
    );
    assert.doesNotMatch(modal, /value \+ 5|value >= 92/);
    assert.doesNotMatch(modal, /mixBlendMode|PRESETS|productImage.*absolute/);
    assert.doesNotMatch(modal, /OpenAI|Gemini|GPT IMAGE|API (?:key|settings|quota|limit)/i);
});

test("try-on uses the authenticated browser-RPA queue and polls for completion", async () => {
    const client = await source("lib/pet-tryon.ts");

    assert.match(client, /ddb\.tryon\.rpa\.v1/);
    assert.match(client, /getCustomerToken/);
    assert.match(client, /authorization: `Bearer \$\{token\}`/);
    assert.match(client, /pet_profile_id: pet\.apiProfileId/);
    assert.match(client, /pet-tryon\/jobs\/\$\{encodeURIComponent\(jobId\)\}/);
    assert.match(client, /15 \* 60 \* 1000/);
    assert.match(client, /result\.status === "ready"/);
    assert.match(client, /progress_stage/);
    assert.match(client, /progress_percent/);
    assert.match(client, /estimated_seconds/);
    assert.match(client, /START_REQUEST_TIMEOUT_MS = 45_000/);
    assert.match(client, /STATUS_REQUEST_TIMEOUT_MS = 20_000/);
    assert.match(client, /fetchWithTimeout/);
    assert.match(client, /clearPetTryOnSessionCache/);
    assert.doesNotMatch(client, /sessionStorage\.setItem/);
    assert.doesNotMatch(client, /photo\.slice/);
    assert.doesNotMatch(client, /pet_photo_data_url/);
});

test("background async responses are guarded before state updates", async () => {
    const background = await source("lib/pet-tryon-background.tsx");

    assertOrdered(background, [
        "const monitor = useCallback",
        "const next = await getPetTryOnJob(jobId, controller.signal)",
        "if (controller.signal.aborted || accountKeyRef.current !== initialTask.accountKey) break",
        "if (!next)",
        "setTask(current)",
    ], "monitor guard");
    assertOrdered(background, [
        "const start = useCallback",
        "const first = await startPetTryOn(product, pet, submitController.signal)",
        "submitController.signal.aborted",
        "if (!first)",
        "setTask(failed)",
    ], "submit guard");
    assertOrdered(background, [
        "void getPetTryOnJob(jobId, restoreController.signal).then",
        "restoreController.signal.aborted",
        "taskRef.current?.taskKey !== restored.task.taskKey",
        "if (!fresh)",
        "setTask(refreshed)",
    ], "restore guard");
    assertOrdered(background, [
        "deadlineReached = true",
        "controller.abort()",
        "} finally {",
        "deadlineReached",
        "latest?.result?.jobId === jobId",
        "ACTIVE_STATUSES.has(latest.result.status)",
        "const failed = asMonitorFailure",
    ], "hard deadline terminalization");
    assertOrdered(background, [
        "const restoreTimer = window.setTimeout",
        "restoreStarted = true",
        "window.clearTimeout(restoreTimer)",
        "if (!restoreStarted) restoredOnce.current = false",
    ], "StrictMode restore replay");
});

test("try-on only uses a member photo after the customer API confirms it", async () => {
    const [modal, store, customerApi, page, modalLens] = await Promise.all([
        source("components/products/detail/PetTryOnPreview.tsx"),
        source("lib/store.tsx"),
        source("lib/customer-api.ts"),
        source("app/pet-lens/PetLensClient.tsx"),
        source("components/petlens/PetLensModalContent.tsx"),
    ]);

    assert.match(store, /photoServerVerified\?: boolean/);
    assert.match(store, /pet\.photoDataUrl && pet\.photoServerVerified/);
    assert.match(customerApi, /photoServerVerified: Boolean\(row\.photoDataUrl\)/);
    assert.match(modal, /filter\(hasVerifiedPetPhoto\)/);
    assert.doesNotMatch(modal, /filter\(\(item\) => item\.photoDataUrl\)/);
    for (const client of [page, modalLens]) {
        assert.match(client, /const saved = await savePetProfileSmart/);
        assert.match(client, /photoServerVerified: Boolean\(saved\.photoDataUrl\)/);
    }
});
