export type ChatWindowRect = { x: number; y: number; width: number; height: number };
export type ChatViewport = { width: number; height: number };
export const CHAT_WINDOW_MARGIN = 12;
export const CHAT_RESIZE_EDGES = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;
export type ChatResizeEdge = typeof CHAT_RESIZE_EDGES[number];

// Move only the grabbed edges; the opposite edges stay anchored even at limits.
export function resizeChatWindow(rect: ChatWindowRect, edge: ChatResizeEdge, dx: number, dy: number, viewport: ChatViewport): ChatWindowRect {
    const current = clampChatWindow(rect, viewport);
    const minWidth = Math.min(360, viewport.width - CHAT_WINDOW_MARGIN * 2);
    const minHeight = Math.min(360, viewport.height - CHAT_WINDOW_MARGIN * 2);
    let { x: left, y: top } = current;
    let right = left + current.width;
    let bottom = top + current.height;
    if (edge.includes("w")) left = Math.max(CHAT_WINDOW_MARGIN, Math.min(left + dx, right - minWidth));
    if (edge.includes("e")) right = Math.min(viewport.width - CHAT_WINDOW_MARGIN, Math.max(right + dx, left + minWidth));
    if (edge.includes("n")) top = Math.max(CHAT_WINDOW_MARGIN, Math.min(top + dy, bottom - minHeight));
    if (edge.includes("s")) bottom = Math.min(viewport.height - CHAT_WINDOW_MARGIN, Math.max(bottom + dy, top + minHeight));
    return { x: left, y: top, width: right - left, height: bottom - top };
}

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
