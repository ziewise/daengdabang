import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [store, sidebar] = await Promise.all([
    readFile(new URL("../lib/store.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/mypage/MypageSidebar.tsx", import.meta.url), "utf8"),
]);

test("logout persists a guest snapshot before dispatching the in-memory transition", () => {
    assert.match(store, /function persistLoggedOutState\(currentState\?: State\)/);
    assert.match(store, /JSON\.stringify\(withoutMemberData\(snapshot\)\)/);
    assert.match(store, /catch \{[\s\S]*?localStorage\.removeItem\(STORAGE_KEY\)/);

    const logout = store.match(/logout: \(\) => \{([\s\S]*?)\n\s*\},\n\s*upsertPet:/)?.[1] ?? "";
    const persistIndex = logout.indexOf("clearPersistedMemberSession(state)");
    const dispatchIndex = logout.indexOf('dispatch({ type: "LOGOUT" })');
    assert.ok(persistIndex >= 0, "logout must synchronously clear the persisted member session");
    assert.ok(dispatchIndex > persistIndex, "persisted state must be cleared before the logout dispatch");
});

test("logout and login isolate account-owned orders and wishlists while retaining the cart", () => {
    const memberFree = store.match(/function withoutMemberData\(snapshot: State\): State \{([\s\S]*?)\n\}/)?.[1] ?? "";
    assert.match(memberFree, /cart: snapshot\.cart\.map/);
    assert.match(memberFree, /delete guestLine\.petAssignment/);
    assert.match(memberFree, /user: null/);
    assert.match(memberFree, /wishlist: \[\]/);
    assert.match(memberFree, /orders: \[\]/);
    assert.match(store, /case "LOGIN":[\s\S]*?return \{ \.\.\.withoutMemberData\(state\), user: action\.user \}/);
    assert.match(store, /case "LOGOUT":[\s\S]*?return withoutMemberData\(state\)/);
    assert.doesNotMatch(memberFree, /cart: \[\]/);
});

test("a logout from another tab clears the in-memory member store", () => {
    assert.match(store, /window\.addEventListener\("storage", onStorage\)/);
    assert.match(store, /event\.key !== STORAGE_KEY/);
    assert.match(store, /if \(!next\.user\) dispatch\(\{ type: "LOGOUT" \}\)/);
});

test("every rendered mypage logout uses the durable store logout", () => {
    assert.match(sidebar, /import \{ useAuth \} from "@\/lib\/store"/);
    assert.doesNotMatch(sidebar, /@\/hooks\/useAuth/);
});

test("an expired API session uses the same durable logout path", () => {
    const expiredSession = store.match(/error instanceof DdbApiError && error\.status === 401\) \{([\s\S]*?)\n\s*\}/)?.[1] ?? "";
    assert.match(expiredSession, /clearPersistedMemberSession\(\)/);
    assert.match(expiredSession, /dispatch\(\{ type: "LOGOUT" \}\)/);
});
