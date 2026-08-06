type ShopChatConversationOwner = {
    apiUserId?: number;
    email?: string;
} | null | undefined;

const MEMBER_STORAGE_PREFIX = "DDB_SHOP_CHAT_CONVERSATION_V1";

function fingerprint(value: string) {
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        first = Math.imul(first ^ code, 0x01000193);
        second = Math.imul(second ^ code, 0x85ebca6b);
    }
    return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

export function shopChatConversationOwnerKey(owner: ShopChatConversationOwner) {
    if (typeof owner?.apiUserId === "number" && Number.isSafeInteger(owner.apiUserId) && owner.apiUserId > 0) {
        return `member-id:${owner.apiUserId}`;
    }
    const email = typeof owner?.email === "string" ? owner.email.trim().toLowerCase() : "";
    return email ? `member-email:${fingerprint(email)}` : "guest";
}

function validConversationId(value: unknown) {
    if (typeof value !== "string") return "";
    const normalized = value.trim();
    return normalized.length === 36 && /^[A-Za-z0-9._:-]+$/.test(normalized) ? normalized : "";
}

function storageTarget(owner: ShopChatConversationOwner) {
    const ownerKey = shopChatConversationOwnerKey(owner);
    if (ownerKey === "guest") return null;
    return {
        storage: globalThis.localStorage,
        key: `${MEMBER_STORAGE_PREFIX}:${fingerprint(ownerKey)}`,
    };
}

export function loadShopChatConversationId(owner: ShopChatConversationOwner) {
    if (typeof window === "undefined") return "";
    try {
        const target = storageTarget(owner);
        return target ? validConversationId(target.storage.getItem(target.key)) : "";
    } catch {
        return "";
    }
}

export function saveShopChatConversationId(owner: ShopChatConversationOwner, conversationId: string) {
    if (typeof window === "undefined") return;
    const normalized = validConversationId(conversationId);
    if (!normalized) return;
    try {
        const target = storageTarget(owner);
        if (target) target.storage.setItem(target.key, normalized);
    } catch {
        // Chat still works without browser persistence (private mode/storage quota).
    }
}

export function clearShopChatConversationId(owner: ShopChatConversationOwner) {
    if (typeof window === "undefined") return;
    try {
        const target = storageTarget(owner);
        if (target) target.storage.removeItem(target.key);
    } catch {
        // Storage is an optional convenience; there is nothing else to clear.
    }
}
