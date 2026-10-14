export type ChatWindowRect = { x: number; y: number; width: number; height: number };
export type ChatViewport = { width: number; height: number };
export const CHAT_WINDOW_MARGIN = 12;

export function clampChatWindow(rect: ChatWindowRect, viewport: ChatViewport): ChatWindowRect {
    const availableWidth = Math.max(1, viewport.width - CHAT_WINDOW_MARGIN * 2);
    const availableHeight = Math.max(1, viewport.height - CHAT_WINDOW_MARGIN * 2);
    const width = Math.min(availableWidth, Math.max(360, rect.width));
    const height = Math.min(availableHeight, Math.max(360, rect.height));
    return {
        width, height,
        x: Math.max(CHAT_WINDOW_MARGIN, Math.min(rect.x, viewport.width - width - CHAT_WINDOW_MARGIN)),
        y: Math.max(CHAT_WINDOW_MARGIN, Math.min(rect.y, viewport.height - height - CHAT_WINDOW_MARGIN)),
    };
}

export function defaultChatWindow(viewport: ChatViewport): ChatWindowRect {
    return clampChatWindow({ x: viewport.width - 516, y: viewport.height - 620, width: 420, height: 600 }, viewport);
}
