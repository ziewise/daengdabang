import { readFileSync } from "node:fs";
import ts from "typescript";
import * as viewport from "../../lib/product-video-viewport.ts";
import * as playback from "../../lib/product-video-playback.ts";

const compiled = ts.transpileModule(readFileSync(new URL("../../components/products/useProductVideo.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
export function productVideoHook(react, window = { matchMedia: () => ({ matches: false }) }) {
    const loaded = { exports: {} };
    const imports = { react, "@/lib/product-video-viewport": viewport, "@/lib/product-video-playback": playback };
    new Function("require", "module", "exports", "window", compiled)(id => imports[id], loaded, loaded.exports, window);
    return loaded.exports;
}
