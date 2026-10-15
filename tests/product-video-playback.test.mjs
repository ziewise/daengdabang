import test from "node:test";
import assert from "node:assert/strict";
import { createProductVideoPlayback, PRODUCT_VIDEO_PHOTO_MS } from "../lib/product-video-playback.ts";

function fixture(t, options = {}) {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let visible = false;
    const video = {
        readyState: 2, currentTime: 0, paused: true, ended: false, seeking: false, plays: 0,
        play() { this.plays++; this.paused = false; this.ended = false; return Promise.resolve(); },
        pause() { this.paused = true; }, ...options,
    };
    const player = createProductVideoPlayback(video, value => { visible = value; });
    t.after(() => player.dispose());
    return { video, player, visible: () => visible, tick: ms => t.mock.timers.tick(ms),
        end() { video.ended = true; video.paused = true; video.currentTime = 4; player.onEnded(); } };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test("continuous engagement cycles video, original photo for two seconds, then video repeatedly", t => {
    const f = fixture(t); f.player.play(); f.player.onPlaying();
    for (let cycle = 1; cycle <= 3; cycle++) {
        assert.equal(f.visible(), true); assert.equal(f.video.plays, cycle);
        f.end(); assert.equal(f.visible(), false); assert.equal(f.video.currentTime, 0);
        f.player.onSeeked(); f.player.onReady(); f.player.play();
        f.tick(PRODUCT_VIDEO_PHOTO_MS - 1); assert.equal(f.video.plays, cycle);
        f.tick(1); f.player.onPlaying(); assert.equal(f.video.plays, cycle + 1);
    }
});
test("leaving during the photo pause cancels replay; re-entry starts immediately", t => {
    const f = fixture(t); f.player.play(); f.end(); f.player.reset(); f.tick(5000);
    assert.equal(f.video.plays, 1); assert.equal(f.visible(), false);
    f.player.play(); assert.equal(f.video.plays, 2);
});
test("scroll or background suspension pauses the cycle until resumed", t => {
    const f = fixture(t); f.player.play(); f.end(); f.player.pause(); f.tick(5000);
    assert.equal(f.video.plays, 1); f.player.resume(); f.tick(1999);
    assert.equal(f.video.plays, 1); f.tick(1); assert.equal(f.video.plays, 2);
});
test("Android deferred playback becomes visible after decoding without waiting for playing", t => {
    const f = fixture(t, { readyState: 0, play() { this.plays++; return new Promise(() => {}); } });
    f.player.play(); assert.equal(f.visible(), false);
    f.video.readyState = 2; f.player.onReady();
    assert.equal(f.visible(), true); assert.equal(f.video.plays, 1);
    assert.equal(f.video.muted, true); assert.equal(f.video.defaultMuted, true); assert.equal(f.video.playsInline, true);
    f.player.reset(); f.player.onReady(); assert.equal(f.visible(), false);
});
test("a rejected initial play retries while visible, but retry stops after leaving", async t => {
    const f = fixture(t, { play() { this.plays++; return this.plays === 1 ? Promise.reject(new Error("interrupted")) : Promise.resolve(); } });
    f.player.play(); await flush(); assert.equal(f.visible(), false);
    f.tick(400); assert.equal(f.video.plays, 2); f.player.onPlaying(); assert.equal(f.visible(), true);
    f.player.onPause(); f.player.reset(); f.tick(5000); assert.equal(f.video.plays, 2);
});
test("persistent autoplay rejection has bounded retries and can retry on a later gesture", async t => {
    const f = fixture(t, { play() { this.plays++; return Promise.reject(new Error("blocked")); } });
    f.player.play(); await flush();
    for (const delay of [400, 800, 1200, 10000]) { f.tick(delay); await flush(); }
    assert.equal(f.video.plays, 4); f.player.play(); await flush(); assert.equal(f.video.plays, 5);
});
test("late play failures and events after disposal cannot restart a removed product", async t => {
    let reject;
    const f = fixture(t, { play() { this.plays++; return new Promise((_, fail) => { reject = fail; }); } });
    f.player.play(); f.player.dispose(); reject(new Error("late")); await flush();
    f.player.onReady(); f.player.onPlaying(); f.player.onEnded(); f.tick(5000);
    assert.equal(f.video.plays, 1); assert.equal(f.visible(), false);
});
