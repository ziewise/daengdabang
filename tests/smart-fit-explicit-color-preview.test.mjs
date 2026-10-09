import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const ts = createRequire(import.meta.url)("typescript");
const componentSource = await readFile(new URL("../components/products/detail/PetTryOnPreview.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(componentSource, {
    compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
    },
}).outputText;

function deferred() {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
}

function preview(sourceJobId, productImage, imageDataUrl) {
    return {
        ok: true,
        value: {
            sourceJobId, productImage, imageDataUrl,
            processing: "server_verified", mode: "approximate_color_only", confidence: 0.9,
        },
    };
}

// Execute the real component with deterministic hooks and mocked boundaries.
// This exercises effect cleanup, asynchronous responses, and actual button handlers.
function mount({ geometryVerified = true, localPreview, serverPreview, hasMaster = true } = {}) {
    const slots = [];
    let cursor = 0;
    let dirty = true;
    let tree;
    let pendingEffects = [];
    const localCalls = [];
    const serverCalls = [];
    const generationCalls = [];
    const masterImage = "data:image/webp;base64,MASTER";
    const product = {
        id: "exact-harness", folder: "exact-harness", name: "Exact harness", subcategory: "harness",
        image: "/catalog/master-blue.webp", details: [], raw: { useSub: "harness" },
        colors: [
            { name: "Blue", image: "/catalog/master-blue.webp" },
            { name: "Red", image: "/catalog/red.webp" },
            { name: "Green", image: "/catalog/green.webp" },
        ],
    };
    const pet = { apiProfileId: 17, name: "Dog", size: "small", photoDataUrl: "data:image/webp;base64,PET", photoServerVerified: true };
    const auth = { hydrated: true, user: { apiUserId: 9, pets: [pet] } };
    const readyTask = {
        productImage: product.image,
        result: { jobId: "reviewed-master", status: "ready", imageDataUrl: masterImage, geometryVerified },
    };
    const sameDeps = (before, after) => before && after
        && before.length === after.length && before.every((value, index) => Object.is(value, after[index]));
    const hooks = {
        useState(initial) {
            const index = cursor++;
            if (!slots[index]) slots[index] = { value: typeof initial === "function" ? initial() : initial };
            return [slots[index].value, (value) => {
                const next = typeof value === "function" ? value(slots[index].value) : value;
                if (!Object.is(next, slots[index].value)) {
                    slots[index].value = next;
                    dirty = true;
                }
            }];
        },
        useRef(initial) {
            const index = cursor++;
            if (!slots[index]) slots[index] = { value: { current: initial } };
            return slots[index].value;
        },
        useMemo(factory, deps) {
            const index = cursor++;
            if (!sameDeps(slots[index]?.deps, deps)) slots[index] = { deps, value: factory() };
            return slots[index].value;
        },
        useEffect(effect, deps) {
            const index = cursor++;
            if (!sameDeps(slots[index]?.deps, deps)) {
                pendingEffects.push({ index, effect, cleanup: slots[index]?.cleanup });
                slots[index] = { deps };
            }
        },
    };
    hooks.useCallback = (fn, deps) => hooks.useMemo(() => fn, deps);
    hooks.useLayoutEffect = hooks.useEffect;
    const noProductKind = () => false;
    const petTryOn = {
        getLatestPetTryOnMaster: async () => ({ status: "missing" }),
        getPetTryOnJob: async () => { throw new Error("Unexpected master retrieval"); },
        isPetTryOnFootwearProduct: noProductKind,
        isPetTryOnHarnessJacketProduct: noProductKind,
        isPetTryOnHearingProtectionProduct: noProductKind,
        isPetTryOnLifeJacketProduct: noProductKind,
        isPetTryOnNeckwearProduct: noProductKind,
        isPetTryOnSnoodProduct: noProductKind,
        petTryOnReferencePhoto: (_product, item) => item.photoDataUrl,
        requestPetTryOnColorPreview: (...args) => {
            serverCalls.push(args);
            return serverPreview ? serverPreview(...args) : Promise.resolve(preview(args[0], args[1], "data:image/webp;base64,SERVER"));
        },
        reviewPetTryOnGeometry: async () => ({ ok: true, value: true }),
    };
    const background = {
        notificationEnabled: false,
        start: async (...args) => { generationCalls.push(args); return { status: "started" }; },
        getTaskFor: (_id, _petId, image) => hasMaster && (!image || image === product.image) ? readyTask : null,
        requestCompletionNotification() {},
        setPanelOpen() {},
    };
    const imports = {
        react: hooks,
        "react/jsx-runtime": {
            Fragment: "Fragment",
            jsx: (type, props) => ({ type, props }),
            jsxs: (type, props) => ({ type, props }),
        },
        "next/link": { __esModule: true, default: "Link" },
        "next/image": { __esModule: true, default: "Image" },
        "@/lib/pet-tryon": petTryOn,
        "@/lib/pet-tryon-fit-master": {
            petTryOnReferenceKey: () => "exact-photo-reference",
            readPetTryOnFitMasterWithLegacy: () => ({ status: "missing" }),
            removePetTryOnFitMaster() {}, savePetTryOnFitMaster() {},
        },
        "@/lib/pet-tryon-eligibility": {
            getPetTryOnEligibility: () => ({ eligible: true, zeroAiColorPreview: "server_verified" }),
            isPetTryOnDogPackProduct: noProductKind,
        },
        "@/lib/pet-tryon-background": { usePetTryOnTask: () => background, PetTryOnEmailDeliveryControls: "EmailControls" },
        "@/lib/on-device-ai": { prepareImageOnDevice: async (dataUrl) => ({ dataUrl, preprocessed: false }) },
        "@/lib/on-device-tryon": { runOnDeviceTryOn: async () => ({ status: "unavailable", reason: "quality_gate_failed" }) },
        "@/lib/on-device-color-preview": {
            createOnDeviceColorPreview: (input) => {
                localCalls.push(input);
                return localPreview ? localPreview(input) : Promise.resolve({ status: "unavailable", reason: "unsafe_color_mask" });
            },
        },
        "@/lib/store": { useAuth: () => auth, hasVerifiedPetPhoto: (item) => item.photoServerVerified },
        "@/lib/i18n": { useI18n: () => ({ locale: "ko", productName: (item) => item.name }) },
        "@/lib/shop": { productHref: () => "/product/exact-harness" },
        "@/lib/petlens-routing": { petLensAuthHref: () => "/login" },
        "./ColorSelect": { __esModule: true, default: "ColorSelect" },
    };
    const testModule = { exports: {} };
    new vm.Script(compiled, { filename: "PetTryOnPreview.tsx" }).runInNewContext({
        module: testModule, exports: testModule.exports, AbortController, Date,
        document: { body: { style: { overflow: "" } } },
        window: { addEventListener() {}, removeEventListener() {}, setTimeout, clearTimeout, setInterval, clearInterval },
        require(name) {
            assert.ok(name in imports, `Unexpected import ${name}`);
            return imports[name];
        },
    });
    const props = {
        product, colorIdx: 1, onClose() {},
        onColorChange(index) { props.colorIdx = index; dirty = true; },
    };
    function render() {
        cursor = 0;
        dirty = false;
        pendingEffects = [];
        tree = testModule.exports.default(props);
        for (const { cleanup } of pendingEffects) cleanup?.();
        for (const { index, effect } of pendingEffects) slots[index].cleanup = effect();
    }
    function elements(value, output = []) {
        if (Array.isArray(value)) for (const item of value) elements(item, output);
        else if (value && typeof value === "object") {
            output.push(value);
            elements(value.props?.children, output);
        }
        return output;
    }
    function text(value) {
        if (Array.isArray(value)) return value.map(text).join("");
        if (value && typeof value === "object") return text(value.props?.children);
        return value == null || typeof value === "boolean" ? "" : String(value);
    }
    return {
        localCalls, serverCalls, generationCalls, masterImage, product,
        async flush() {
            for (let pass = 0; pass < 16; pass += 1) {
                if (dirty) render();
                await Promise.resolve();
            }
            assert.equal(dirty, false, "component effects should settle");
        },
        button(label) { return elements(tree).find((element) => element.type === "button" && text(element.props.children) === label); },
        imageUrls() { return elements(tree).filter((element) => element.type === "Image").map((element) => element.props.src); },
        changeColor(index) { elements(tree).find((element) => element.type === "ColorSelect").props.onColorChange(index); },
        unmount() { for (const slot of slots) slot.cleanup?.(); },
    };
}

test("failed local recolor keeps the original and makes zero server calls until explicit action", async (t) => {
    const ui = mount();
    t.after(() => ui.unmount());
    await ui.flush();
    assert.equal(ui.localCalls.length, 1);
    assert.equal(ui.serverCalls.length, 0);
    assert.equal(ui.generationCalls.length, 0);
    assert.ok(ui.imageUrls().includes(ui.masterImage));
    const action = ui.button("저장된 결과로 이 색상 비교");
    assert.ok(action);
    action.props.onClick();
    await ui.flush();
    assert.equal(ui.serverCalls.length, 1);
    const [jobId, catalogImage, signal] = ui.serverCalls[0];
    assert.equal(jobId, "reviewed-master");
    assert.equal(catalogImage, ui.product.colors[1].image);
    assert.ok(signal instanceof AbortSignal);
    assert.ok(ui.imageUrls().includes("data:image/webp;base64,SERVER"));
    assert.equal(ui.generationCalls.length, 0);
});

test("unreviewed geometry exposes neither local recoloring nor the server comparison action", async (t) => {
    const ui = mount({ geometryVerified: false });
    t.after(() => ui.unmount());
    await ui.flush();
    assert.equal(ui.localCalls.length, 0);
    assert.equal(ui.serverCalls.length, 0);
    assert.equal(ui.button("저장된 결과로 이 색상 비교"), undefined);
    assert.ok(ui.imageUrls().includes(ui.masterImage));
    assert.ok(ui.button("제품 모양 맞아요"));
    assert.equal(ui.generationCalls.length, 0);
});

test("a successful local color comparison never asks the server", async (t) => {
    const ui = mount({ localPreview: async (input) => ({
        status: "ready",
        value: { ...preview(input.sourceJobId, input.targetProductImage, "data:image/webp;base64,LOCAL").value, processing: "on_device" },
    }) });
    t.after(() => ui.unmount());
    await ui.flush();
    assert.equal(ui.localCalls.length, 1);
    assert.equal(ui.serverCalls.length, 0);
    assert.equal(ui.button("저장된 결과로 이 색상 비교"), undefined);
    assert.ok(ui.imageUrls().includes("data:image/webp;base64,LOCAL"));
    assert.equal(ui.generationCalls.length, 0);
});

test("tapping the already selected color keeps the explicit comparison available", async (t) => {
    const ui = mount();
    t.after(() => ui.unmount());
    await ui.flush();
    ui.changeColor(1);
    await ui.flush();
    assert.equal(ui.localCalls.length, 1);
    assert.equal(ui.serverCalls.length, 0);
    assert.ok(ui.button("저장된 결과로 이 색상 비교"));
    ui.button("저장된 결과로 이 색상 비교").props.onClick();
    await ui.flush();
    assert.equal(ui.serverCalls.length, 1);
});

test("rapid color changes abort the requested comparison and discard a late response", async (t) => {
    const requests = [];
    const ui = mount({ serverPreview: () => {
        const request = deferred();
        requests.push(request);
        return request.promise;
    } });
    t.after(() => ui.unmount());
    await ui.flush();
    const oldAction = ui.button("저장된 결과로 이 색상 비교");
    oldAction.props.onClick();
    // A second click before React renders must not create a duplicate request.
    oldAction.props.onClick();
    assert.equal(ui.serverCalls.length, 1);
    await ui.flush();
    ui.changeColor(2);
    assert.equal(ui.serverCalls[0][2].aborted, true);
    await ui.flush();
    oldAction.props.onClick();
    assert.equal(ui.serverCalls.length, 1, "a stale handler cannot request the previous catalog color");
    requests[0].resolve(preview("reviewed-master", ui.product.colors[1].image, "data:image/webp;base64,STALE_RED"));
    await ui.flush();
    assert.ok(ui.imageUrls().includes(ui.masterImage));
    assert.ok(!ui.imageUrls().includes("data:image/webp;base64,STALE_RED"));
    ui.button("저장된 결과로 이 색상 비교").props.onClick();
    assert.equal(ui.serverCalls.length, 2);
    assert.equal(ui.serverCalls[1][1], ui.product.colors[2].image);
    requests[1].resolve(preview("reviewed-master", ui.product.colors[2].image, "data:image/webp;base64,GREEN"));
    await ui.flush();
    assert.ok(ui.imageUrls().includes("data:image/webp;base64,GREEN"));
    assert.equal(ui.generationCalls.length, 0);
});

test("geometry revocation aborts the optional request and keeps its late result hidden", async (t) => {
    const request = deferred();
    const ui = mount({ serverPreview: () => request.promise });
    t.after(() => ui.unmount());
    await ui.flush();
    const oldAction = ui.button("저장된 결과로 이 색상 비교");
    oldAction.props.onClick();
    await ui.flush();
    ui.button("실제 상품과 달라요").props.onClick();
    assert.equal(ui.serverCalls[0][2].aborted, true);
    oldAction.props.onClick();
    assert.equal(ui.serverCalls.length, 1);
    request.resolve(preview("reviewed-master", ui.product.colors[1].image, "data:image/webp;base64,REVOKED"));
    await ui.flush();
    assert.equal(ui.button("저장된 결과로 이 색상 비교"), undefined);
    assert.ok(!ui.imageUrls().includes("data:image/webp;base64,REVOKED"));
    assert.ok(ui.imageUrls().includes(ui.masterImage));
    assert.equal(ui.generationCalls.length, 0);
});

test("a refused server comparison keeps the master and never retries automatically", async (t) => {
    const ui = mount({ serverPreview: async () => ({ ok: false, error: { code: "invalid_response", retryable: false } }) });
    t.after(() => ui.unmount());
    await ui.flush();
    ui.button("저장된 결과로 이 색상 비교").props.onClick();
    await ui.flush();
    assert.equal(ui.serverCalls.length, 1);
    assert.ok(ui.imageUrls().includes(ui.masterImage));
    assert.ok(ui.button("저장된 결과로 이 색상 비교"));
    await ui.flush();
    assert.equal(ui.serverCalls.length, 1);
    assert.equal(ui.generationCalls.length, 0);
});

test("closing the modal aborts an optional server comparison", async () => {
    const request = deferred();
    const ui = mount({ serverPreview: () => request.promise });
    await ui.flush();
    ui.button("저장된 결과로 이 색상 비교").props.onClick();
    ui.unmount();
    assert.equal(ui.serverCalls[0][2].aborted, true);
    request.resolve(preview("reviewed-master", ui.product.colors[1].image, "data:image/webp;base64,AFTER_CLOSE"));
    await Promise.resolve();
    assert.equal(ui.generationCalls.length, 0);
});

test("a quality-blocked local full fitting never starts a server job automatically", async (t) => {
    const ui = mount({ hasMaster: false });
    t.after(() => ui.unmount());
    await ui.flush();
    assert.equal(ui.localCalls.length, 0);
    assert.equal(ui.serverCalls.length, 0);
    assert.equal(ui.generationCalls.length, 0);
    assert.equal(ui.button("저장된 결과로 이 색상 비교"), undefined);
    assert.ok(ui.button("우리 아이 착용 모습 만들기"));
});
