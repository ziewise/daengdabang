import assert from "node:assert/strict";
import test from "node:test";

import {
    ShopChatSseDecoder,
    ShopChatStreamTimeoutGuard,
    SHOP_CHAT_SERVER_PROCESSING_BOUND_MS,
    SHOP_CHAT_SERVER_QUEUE_BOUND_MS,
    SHOP_CHAT_STREAM_IDLE_TIMEOUT_MS,
    SHOP_CHAT_STREAM_OVERALL_TIMEOUT_MS,
    completeShopChatStreamResult,
    createShopChatClientRequestId,
    parseShopChatSseBlock,
    resolveShopChatStreamTimeouts,
    shouldFallbackShopChatStream,
    shopChatProgressLabel,
} from "../lib/shop-chat-stream.ts";

test("shop chat SSE decoder preserves chunk boundaries and public event order", () => {
    const decoder = new ShopChatSseDecoder();
    assert.deepEqual(decoder.push("event: meta\ndata: {\"accepted\":true,\"conversationId\":\"c-1\"}\n\n"), [
        { event: "meta", data: { accepted: true, conversationId: "c-1" } },
    ]);
    assert.deepEqual(decoder.push("event: status\ndata: {\"stage\":\"search"), []);
    assert.deepEqual(decoder.push("ing\"}\r\n\r\nevent: delta\ndata: {\"text\":\"안녕\"}\n\n"), [
        { event: "status", data: { stage: "searching" } },
        { event: "delta", data: { text: "안녕" } },
    ]);
    assert.deepEqual(decoder.finish(), []);
});

test("shop chat SSE decoder ignores unknown events and malformed customer data", () => {
    assert.equal(parseShopChatSseBlock("event: debug\ndata: {\"secret\":true}"), null);
    assert.equal(parseShopChatSseBlock("event: delta\ndata: not-json"), null);
    assert.deepEqual(
        parseShopChatSseBlock("event: done\ndata: {\"answer\":\"완료\",\ndata: \"products\":[]}"),
        { event: "done", data: { answer: "완료", products: [] } },
    );
});

test("POST fallback requires a definitive unsupported stream response before acceptance", () => {
    assert.equal(shouldFallbackShopChatStream({ status: 404, accepted: false }), false);
    assert.equal(shouldFallbackShopChatStream({ status: 405, accepted: false }), true);
    assert.equal(shouldFallbackShopChatStream({ status: 500, accepted: false }), false);
    assert.equal(shouldFallbackShopChatStream({
        status: 404,
        accepted: false,
        errorCode: "shop_chat_stream_unsupported",
    }), true);
    assert.equal(shouldFallbackShopChatStream({ accepted: false, fallbackAllowed: true }), true);
    assert.equal(shouldFallbackShopChatStream({
        status: 405,
        accepted: true,
        fallbackAllowed: true,
        errorCode: "shop_chat_stream_unsupported",
    }), false);
});

test("browser stream deadlines outlive the API queue and processing bounds", () => {
    const serverBound = SHOP_CHAT_SERVER_QUEUE_BOUND_MS + SHOP_CHAT_SERVER_PROCESSING_BOUND_MS;
    assert.ok(SHOP_CHAT_STREAM_IDLE_TIMEOUT_MS > serverBound);
    assert.ok(SHOP_CHAT_STREAM_OVERALL_TIMEOUT_MS > serverBound);
    assert.deepEqual(resolveShopChatStreamTimeouts(5_000), {
        idleTimeoutMs: SHOP_CHAT_STREAM_IDLE_TIMEOUT_MS,
        overallTimeoutMs: SHOP_CHAT_STREAM_OVERALL_TIMEOUT_MS,
    });
    assert.equal(resolveShopChatStreamTimeouts(150_000).overallTimeoutMs, 150_000);
});

test("stream activity resets idle timeout while overall timeout remains bounded", async () => {
    const reasons = [];
    const guard = new ShopChatStreamTimeoutGuard((reason) => reasons.push(reason), 30, 200);
    guard.start();
    await new Promise((resolve) => setTimeout(resolve, 20));
    guard.touch();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(reasons, []);
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.deepEqual(reasons, ["idle"]);
    assert.equal(guard.timeoutReason(), "idle");
    guard.stop();

    const overallReasons = [];
    const overallGuard = new ShopChatStreamTimeoutGuard((reason) => overallReasons.push(reason), 200, 45);
    overallGuard.start();
    await new Promise((resolve) => setTimeout(resolve, 20));
    overallGuard.touch();
    await new Promise((resolve) => setTimeout(resolve, 35));
    assert.deepEqual(overallReasons, ["overall"]);
    overallGuard.stop();
});

test("done metadata is combined with the accumulated public answer", () => {
    assert.deepEqual(
        completeShopChatStreamResult(
            { result: { conversationId: "conversation-final", traceId: "trace-1", products: [] } },
            "스트림으로 완성한 답변",
        ),
        {
            conversationId: "conversation-final",
            traceId: "trace-1",
            products: [],
            answer: "스트림으로 완성한 답변",
        },
    );
});

test("progress labels and client request ids are customer safe", () => {
    assert.match(shopChatProgressLabel("planning"), /핵심/);
    assert.match(shopChatProgressLabel("searching"), /근거/);
    assert.match(shopChatProgressLabel("answering"), /답변/);
    assert.match(createShopChatClientRequestId(), /^[A-Za-z0-9-]+$/);
});
