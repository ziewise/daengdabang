import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAT_RESIZE_EDGES, resizeChatWindow } from '../lib/chat-window-geometry.ts';
const viewport = { width: 1440, height: 900 };
const rect = { x: 400, y: 200, width: 500, height: 500 };
test('all edges resize continuously and keep the opposite edge anchored', () => {
    for (const edge of CHAT_RESIZE_EDGES) {
        const r = resizeChatWindow(rect, edge, 37, 19, viewport);
        assert.equal(r.x, rect.x + (edge.includes('w') ? 37 : 0));
        assert.equal(r.y, rect.y + (edge.includes('n') ? 19 : 0));
        assert.equal(r.x + r.width, rect.x + rect.width + (edge.includes('e') ? 37 : 0));
        assert.equal(r.y + r.height, rect.y + rect.height + (edge.includes('s') ? 19 : 0));
    }
});
test('dragging beyond bounds stops at the viewport or minimum, without moving the opposite edge', () => {
    for (const edge of CHAT_RESIZE_EDGES) for (const delta of [-9999, 9999]) {
        const r = resizeChatWindow(rect, edge, delta, delta, viewport);
        assert.ok(r.x >= 12 && r.y >= 12 && r.x + r.width <= 1428 && r.y + r.height <= 888);
        assert.ok(r.width >= 360 && r.height >= 360);
        if (!edge.includes('w')) assert.equal(r.x, rect.x);
        if (!edge.includes('e')) assert.equal(r.x + r.width, 900);
        if (!edge.includes('n')) assert.equal(r.y, rect.y);
        if (!edge.includes('s')) assert.equal(r.y + r.height, 700);
    }
});
