import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const exports = {};
const code = ts.transpileModule(readFileSync("components/pwa/home-concepts/show-parts-base.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
vm.runInNewContext(code, { exports, require: name => {
    if (name === "@/lib/showcase-image") return { showcaseThumbnailUrl: url => `${url}?size=card`, showcasePhotoRetryUrl: url => url };
    if (name === "./kit") return { TEXT: "#000" };
    if (name === "next/image") return { default: props => createElement("img", props), __esModule: true };
    if (name === "@/components/daeng-showcase/PreparedShowcaseImage") {
        return { default: ({ image }) => createElement("img", { src: image.src, alt: "" }), __esModule: true };
    }
    return require(name);
} });
const src = "https://api.example/post/image";
const render = image => renderToStaticMarkup(createElement(exports.PostPhoto, {
    src, sizes: "45vw", eager: true, thumbnail: true, preparedImage: image,
}));

test("a completed matching handoff paints the photo without a transient loading cover", () => {
    const html = render({ src: `${src}?size=card`, complete: true, naturalWidth: 480 });
    assert.ok(html.includes(`${src}?size=card`));
    assert.ok(!html.includes('role="status"'));
    assert.ok(!html.includes("사진을 불러오고 있어요"));
});

test("pending, failed, absent and unrelated handoffs still display the loading state", () => {
    for (const image of [undefined,
        { src: `${src}?size=card`, complete: false, naturalWidth: 480 },
        { src: `${src}?size=card`, complete: true, naturalWidth: 0 },
        { src: "https://api.example/other/image?size=card", complete: true, naturalWidth: 480 },
    ]) assert.ok(render(image).includes('role="status"'));
});
