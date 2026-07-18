export const CHAT_WIDGET_OPEN_EVENT = "ddb:open-chat-widget";
export const CHAT_WIDGET_NAVIGATOR_REVEAL_EVENT = "ddb:reveal-chat-widget-for-navigator";
export const CHAT_WIDGET_VISIBILITY_EVENT = "ddb:chat-widget-visibility";

export type ChatWidgetOpenDetail = {
    productName?: string;
};

export type ChatWidgetVisibilityDetail = {
    open: boolean;
};

export function openChatWidget(detail: ChatWidgetOpenDetail = {}) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent<ChatWidgetOpenDetail>(CHAT_WIDGET_OPEN_EVENT, { detail }));
}
