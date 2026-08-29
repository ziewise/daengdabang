import { access, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDist = path.join(root, "node_modules", "onnxruntime-web", "dist");
const output = path.join(root, "public", "ai", "runtime", "onnxruntime-web-1.29.0");
const required = ["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"];

const available = new Set(await readdir(packageDist));
for (const file of required) {
    if (!available.has(file)) {
        throw new Error(`onnxruntime-web runtime artifact is missing: ${file}`);
    }
    const source = path.join(packageDist, file);
    await access(source);
}
await rm(output, { recursive: true, force: true });
console.log("ONNX Runtime Web 1.29.0 verified; Pages uses the version-pinned official CDN runtime");
