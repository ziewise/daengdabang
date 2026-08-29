import { access, copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDist = path.join(root, "node_modules", "onnxruntime-web", "dist");
const output = path.join(root, "public", "ai", "runtime", "onnxruntime-web-1.29.0");
const required = [
    "ort-wasm-simd-threaded.mjs",
    "ort-wasm-simd-threaded.wasm",
    "ort-wasm-simd-threaded.jsep.mjs",
    "ort-wasm-simd-threaded.jsep.wasm",
];

await mkdir(output, { recursive: true });
const available = new Set(await readdir(packageDist));
for (const file of required) {
    if (!available.has(file)) {
        throw new Error(`onnxruntime-web runtime artifact is missing: ${file}`);
    }
    const source = path.join(packageDist, file);
    await access(source);
    await copyFile(source, path.join(output, file));
}
console.log(`ONNX Runtime Web assets synced (${required.length} files)`);
