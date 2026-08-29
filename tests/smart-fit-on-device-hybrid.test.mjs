import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("Smart Fit keeps light photo work local and sends only a coarse client profile", async () => {
    const [onDevice, client, modal, background] = await Promise.all([
        source("lib/on-device-ai.ts"),
        source("lib/pet-tryon.ts"),
        source("components/products/detail/PetTryOnPreview.tsx"),
        source("lib/pet-tryon-background.tsx"),
    ]);

    assert.match(onDevice, /navigator as NavigatorWithDeviceHints/);
    assert.match(onDevice, /typeof WebAssembly === "object"/);
    assert.match(onDevice, /Boolean\(device\.gpu\)/);
    assert.match(onDevice, /canvas\.toDataURL\("image\/webp", 0\.86\)/);
    assert.match(onDevice, /indexedDB\.open\(CACHE_DB, 1\)/);
    assert.match(onDevice, /crypto\.subtle\.digest\("SHA-256"/);

    const serverProfileStart = onDevice.indexOf("export function serverClientProfile");
    const serverProfileEnd = onDevice.indexOf("function dataUrlToBlob", serverProfileStart);
    const serverProfile = onDevice.slice(serverProfileStart, serverProfileEnd);
    assert.match(serverProfile, /tier: capabilities\.tier/);
    assert.match(serverProfile, /webgpu: capabilities\.webgpu/);
    assert.match(serverProfile, /wasm: capabilities\.wasm/);
    assert.doesNotMatch(serverProfile, /logicalProcessors|deviceMemory|saveData/);

    assert.match(client, /execution_mode: capabilities\.tier === "fallback" \? "server" : "hybrid"/);
    assert.match(client, /client_profile: serverClientProfile/);
    assert.match(client, /cached\?\.status === "ready"/);
    assert.match(client, /result\.status === "ready" && result\.imageDataUrl/);
    assert.match(modal, /prepareImageOnDevice\(petReferenceImage\)/);
    assert.match(modal, /localPetPreview\?\.dataUrl/);
    assert.match(modal, /imagePreprocessed: localPetPreview\?\.preprocessed === true/);
    assert.match(background, /hybridContext: PetTryOnHybridContext = \{\}/);
    assert.doesNotMatch(modal, /useEffect\(\(\) => \{[\s\S]{0,300}void generate\(/);
});

test("on-device result cache is versioned, private, bounded, and ready-only", async () => {
    const [onDevice, client] = await Promise.all([
        source("lib/on-device-ai.ts"),
        source("lib/pet-tryon.ts"),
    ]);

    assert.match(onDevice, /ON_DEVICE_PIPELINE_VERSION = "ddb-hybrid-tryon-v1-20260829"/);
    assert.match(onDevice, /CACHE_TTL_MS = 7 \* 24 \* 60 \* 60 \* 1000/);
    assert.match(onDevice, /cached\.pipelineVersion === ON_DEVICE_PIPELINE_VERSION/);
    assert.match(client, /privateCacheKey\(\["pet-tryon-job", jobId\]\)/);
    assert.match(client, /cached\?\.status === "ready" && cached\.jobId === jobId && cached\.imageDataUrl/);
    assert.match(client, /if \(result\.status === "ready" && result\.imageDataUrl\) \{[\s\S]*writeOnDeviceCache/);
});
