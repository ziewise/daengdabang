import test from "node:test";
import assert from "node:assert/strict";
import { createProductVideoViewport } from "../lib/product-video-viewport.ts";

function setup(t, touch = true) {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const media = Object.assign(new EventTarget(), { matches: touch });
    const win = Object.assign(new EventTarget(), { innerWidth: 390, innerHeight: 844, matchMedia: () => media });
    const doc = Object.assign(new EventTarget(), { hidden: false, querySelector: () => ({ getBoundingClientRect: () => ({ bottom: 80 }) }) });
    let observed;
    const oldObserver = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
        constructor(callback) { observed = callback; }
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    t.after(() => { globalThis.IntersectionObserver = oldObserver; });
    const controller = createProductVideoViewport(win, doc);
    const card = (top) => {
        const rect = { top, bottom: top + 180, left: 10, right: 190, width: 180, height: 180 };
        const events = [];
        const element = { getBoundingClientRect: () => rect };
        const control = controller.register(element, action => events.push(action));
        t.after(() => control.unregister());
        return { rect, events, control };
    };
    return { win, doc, media, card, observe: () => observed(), settle: () => t.mock.timers.tick(160), scroll: () => doc.dispatchEvent(new Event("scroll")) };
}

test("all visible mobile cards autoplay without a tap; offscreen cards stay stopped", t => {
    const s = setup(t);
    const a = s.card(100), b = s.card(350), outside = s.card(900), underHeader = s.card(-90);
    s.settle();
    assert.deepEqual(a.events, ["play"]);
    assert.deepEqual(b.events, ["play"]);
    assert.deepEqual(outside.events, []);
    assert.deepEqual(underHeader.events, []);
});

test("scrolling pauses, resets cards leaving view, then starts newly visible cards after settling", t => {
    const s = setup(t);
    const a = s.card(100), b = s.card(900);
    s.settle(); s.scroll();
    assert.deepEqual(a.events, ["play", "pause"]);
    a.rect.top = -300; a.rect.bottom = -120;
    b.rect.top = 300; b.rect.bottom = 480;
    s.observe();
    assert.deepEqual(a.events, ["play", "pause", "reset"]);
    assert.deepEqual(b.events, []);
    t.mock.timers.tick(159);
    assert.deepEqual(b.events, []);
    t.mock.timers.tick(1);
    assert.deepEqual(b.events, ["play"]);
});

test("a held touch delays playback until release, without requiring a product tap", t => {
    const s = setup(t), a = s.card(100);
    s.settle();
    s.doc.dispatchEvent(Object.assign(new Event("pointerdown"), { pointerType: "touch" }));
    s.scroll(); s.settle();
    assert.deepEqual(a.events, ["play", "pause"]);
    s.doc.dispatchEvent(new Event("pointerup")); s.settle();
    assert.deepEqual(a.events, ["play", "pause", "play"]);
});

test("color preview remains visible until the next scroll and then automatically resumes", t => {
    const s = setup(t), a = s.card(100);
    s.settle(); a.control.preview(); s.observe(); s.settle();
    assert.deepEqual(a.events, ["play", "reset"]);
    s.scroll(); s.settle();
    assert.deepEqual(a.events, ["play", "reset", "play"]);
});

test("hidden pages stop playback and restore visible cards when returning", t => {
    const s = setup(t), a = s.card(100);
    s.settle();
    s.doc.hidden = true; s.doc.dispatchEvent(new Event("visibilitychange"));
    s.doc.hidden = false; s.doc.dispatchEvent(new Event("visibilitychange"));
    assert.deepEqual(a.events, ["play", "reset", "play"]);
});

test("desktop cards never autoplay; changing input mode stops mobile playback", t => {
    const s = setup(t, false), a = s.card(100);
    s.settle(); s.scroll(); s.settle(); s.observe();
    assert.deepEqual(a.events, []);
    s.media.matches = true; s.media.dispatchEvent(new Event("change"));
    s.media.matches = false; s.media.dispatchEvent(new Event("change"));
    assert.deepEqual(a.events, ["play", "reset"]);
});

test("unmount cancels pending playback and supports a fresh list after navigation", t => {
    const s = setup(t), a = s.card(100);
    a.control.unregister(); s.settle();
    assert.deepEqual(a.events, []);
    const b = s.card(100); s.settle();
    assert.deepEqual(b.events, ["play"]);
});
