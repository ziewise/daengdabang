export const CHAT_WIDGET_OPEN_EVENT = "ddb:open-chat-widget";
export const CHAT_WIDGET_NAVIGATOR_REVEAL_EVENT = "ddb:reveal-chat-widget-for-navigator";

export type ChatWidgetOpenDetail = {
    productName?: string;
};

export function openChatWidget(detail: ChatWidgetOpenDetail = {}) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent<ChatWidgetOpenDetail>(CHAT_WIDGET_OPEN_EVENT, { detail }));
}
