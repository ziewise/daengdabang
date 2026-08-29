import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "public", "ai", "tryon", "model-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.schemaVersion !== "ddb.tryon-model-manifest/v2") {
    throw new Error("unsupported Try-On model manifest schema");
}
if (manifest.privacyDefault !== "local_only" || manifest.fallbackPolicy !== "explicit_user_action_only") {
    throw new Error("Try-On model manifest privacy policy is not fail-closed");
}

const model = manifest.model;
const modelPath = path.join(root, "public", model.url.replace(/^\//, ""));
const bytes = await readFile(modelPath);
const digest = createHash("sha256").update(bytes).digest("hex");
if (bytes.byteLength !== model.bytes || digest !== model.sha256) {
    throw new Error(`Try-On model integrity mismatch: expected ${model.sha256}/${model.bytes}, got ${digest}/${bytes.byteLength}`);
}
if (!Array.isArray(model.executionProviders)
    || !["webgpu", "wasm", "coreml", "nnapi"].every((provider) => model.executionProviders.includes(provider))) {
    throw new Error("Try-On model manifest is missing a required execution provider");
}
console.log(`Try-On model verified: ${model.id}@${model.version} ${digest.slice(0, 12)}`);
