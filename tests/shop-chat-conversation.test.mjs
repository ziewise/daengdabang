import assert from "node:assert/strict";
import test from "node:test";

import { shopChatConversationOwnerKey } from "../lib/shop-chat-conversation.ts";

test("conversation storage owners are account scoped without exposing email", () => {
    assert.equal(shopChatConversationOwnerKey({ apiUserId: 42, email: "member@example.com" }), "member-id:42");
    const first = shopChatConversationOwnerKey({ email: "FIRST@example.com" });
    const same = shopChatConversationOwnerKey({ email: " first@example.com " });
    const second = shopChatConversationOwnerKey({ email: "second@example.com" });
    assert.equal(first, same);
    assert.notEqual(first, second);
    assert.equal(first.includes("first@example.com"), false);
    assert.equal(shopChatConversationOwnerKey(null), "guest");
});
