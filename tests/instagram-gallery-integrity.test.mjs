import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);

function loadModule(path, dependencies = {}) {
    const source = readFileSync(new URL(path, root), "utf8");
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true,
        },
    });
    const module = { exports: {} };
    new Function("require", "module", "exports", outputText)(
        (id) => dependencies[id] ?? require(id), module, module.exports,
    );
    return module.exports;
}

const channels = loadModule("lib/social-channels.ts");
const { default: InstaSection } = loadModule("components/main/InstaSection.tsx", {
    "@/lib/social-channels": channels,
    "next/image": (props) => {
        const imageProps = { ...props };
        delete imageProps.fill;
        return React.createElement("img", imageProps);
    },
});
const html = renderToStaticMarkup(React.createElement(InstaSection));
const anchors = [...html.matchAll(/<a\b([^>]+)>(.*?)<\/a>/gs)];
const tiles = anchors.filter(([, , contents]) => contents.includes("<img"));

test("Instagram keeps eight gallery images linking to the official profile", () => {
    const profile = channels.PUBLIC_SOCIAL_CHANNELS.find((channel) => channel.key === "instagram");
    assert.equal(anchors.length, 9);
    assert.equal(tiles.length, 8);
    for (const [, attributes] of anchors) {
        assert.ok(attributes.includes(`href="${profile.href}"`));
        assert.match(attributes, /target="_blank"/);
        assert.match(attributes, /rel="noopener noreferrer"/);
        assert.match(attributes, /aria-label="[^"]*새 창/);
    }
    for (let index = 1; index <= 8; index += 1) {
        assert.ok(html.includes(`/images/instagram/i${index}.jpg`));
    }
});

test("gallery offers profile navigation without invented engagement counts", () => {
    for (const [, , contents] of tiles) {
        assert.match(contents, /인스타그램에서 만나기/);
        assert.doesNotMatch(contents, /fa-heart|fa-comment|좋아요|댓글|\b\d+(?:\.\d+)?k\b/);
        const visibleText = contents.replace(/<[^>]+>/g, "");
        assert.doesNotMatch(visibleText, /\d/);
    }
});

test("keyboard focus reveals each gallery overlay and remains visibly marked", () => {
    for (const [, attributes, contents] of tiles) {
        assert.match(attributes, /focus-visible:outline-2/);
        assert.match(attributes, /focus-visible:outline-offset-4/);
        assert.match(contents, /group-focus-visible:opacity-100/);
        assert.match(contents, /motion-reduce:transition-none/);
        assert.match(contents, /motion-reduce:group-hover:scale-100/);
    }
});
