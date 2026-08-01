import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

const cssBlock = (css, selector) => {
    const start = css.indexOf(`${selector} {`);
    assert.ok(start >= 0, `${selector} block must exist`);
    const end = css.indexOf("\n}", start);
    assert.ok(end > start, `${selector} block must close`);
    return css.slice(start, end + 2);
};

test("CareTalk keeps crayon accents while using clean paper behind customer text", async () => {
    const css = await source("components/site/ChatWidget.module.css");
    const header = cssBlock(css, ".header");
    const messageList = cssBlock(css, ".messageList");
    const emptyNote = cssBlock(css, ".emptyNote");
    const composer = cssBlock(css, ".composer");
    const emptyCopy = cssBlock(css, ".emptyNote p");
    const eyebrow = cssBlock(css, ".noteEyebrow");
    const userBubble = cssBlock(css, ".userBubble");

    assert.doesNotMatch(header, /repeating-linear-gradient/);
    assert.match(header, /#fffaf2/);
    assert.match(messageList, /#fffdf8/);
    assert.match(messageList, /rgba\(38, 152, 199, 0\.08\)/);
    assert.match(emptyNote, /background: #fffefa/);
    assert.match(emptyNote, /border: 2px solid rgba\(91, 91, 214, 0\.72\)/);
    assert.doesNotMatch(composer, /repeating-linear-gradient/);
    assert.match(composer, /#fffaf3/);
    assert.match(emptyCopy, /font-family: var\(--font-wanted-sans\)/);
    assert.match(emptyCopy, /color: #41465e/);
    assert.match(eyebrow, /color: #ad3f50/);
    assert.match(userBubble, /#187da5/);
});
