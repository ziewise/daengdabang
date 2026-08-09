import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

function sectionBetween(value, startMarker, endMarker) {
    const start = value.indexOf(startMarker);
    const end = value.indexOf(endMarker, start + startMarker.length);

    assert.notEqual(start, -1, `missing section start: ${startMarker}`);
    assert.notEqual(end, -1, `missing section end: ${endMarker}`);
    return value.slice(start, end);
}

test("the q query waits for the hydrated conversation owner and dispatches once", async () => {
    const page = await source("app/chat/ChatPageClient.tsx");
    const ownerEffectMarker = "if (!hydrated) return;\n        const previousOwner";
    const queryEffectMarker = "if (!hydrated || conversationOwnerRef.current !== conversationOwnerKey) return;";
    const ownerEffectStart = page.indexOf(ownerEffectMarker);
    const queryEffectStart = page.indexOf(queryEffectMarker);

    assert.match(page, /const \{ user, hydrated \} = useAuth\(\)/);
    assert.ok(ownerEffectStart >= 0, "conversation owner must wait for auth hydration");
    assert.ok(queryEffectStart > ownerEffectStart, "owner initialization must precede q dispatch");

    const queryEffect = sectionBetween(page, queryEffectMarker, "useLayoutEffect");
    assert.match(queryEffect, /const initialQuestion = params\.get\("q"\)\?\.trim\(\)/);
    assert.match(queryEffect, /initialQuestionSentRef\.current === initialQuestion/);
    assert.match(queryEffect, /initialQuestionSentRef\.current = initialQuestion;\s*void ask\(initialQuestion\)/);
    assert.match(queryEffect, /\[params, ask, conversationOwnerKey, hydrated\]/);
    assert.equal(page.match(/void ask\(initialQuestion\)/g)?.length, 1);
});

test("owner changes and request cancellation restore the interrupted question", async () => {
    const page = await source("app/chat/ChatPageClient.tsx");
    const ownerChange = sectionBetween(
        page,
        "const previousOwner = conversationOwnerRef.current;",
        "const clearChat = () => {",
    );
    const petChange = sectionBetween(
        page,
        "const resetChatForPetChange = useCallback",
        "useEffect(() => {",
    );
    const cancelledRequest = sectionBetween(
        page,
        "if (reason instanceof ShopChatRequestCancelledError) {",
        "if (reason instanceof ShopChatReferenceRequestError) {",
    );

    assert.match(ownerChange, /const interruptedQuestion = activeQuestionRef\.current;\s*activeRequestRef\.current\?\.abort\(\)/);
    assert.match(ownerChange, /setInput\(\(current\) => current\.trim\(\) \? current : interruptedQuestion\)/);
    assert.match(petChange, /const interruptedQuestion = activeQuestionRef\.current;\s*activeRequestRef\.current\?\.abort\(\)/);
    assert.match(petChange, /setInput\(\(current\) => current\.trim\(\) \? current : interruptedQuestion\)/);
    assert.match(cancelledRequest, /setInput\(\(current\) => current\.trim\(\) \? current : trimmed\)/);
    assert.match(cancelledRequest, /pending\?\.role === "user" && pending\.text === trimmed[\s\S]*?current\.slice\(0, -1\)/);
});
