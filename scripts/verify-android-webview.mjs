import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const devtoolsEndpoint = "http://127.0.0.1:9222/json";
// 2026-10-18: 앱은 /app/index.html 로 시작한 뒤 앱 틀(AppShell)이 새 앱 홈(/app/home-1/)으로 보낸다.
// 예전 "댕다방 앱 홈"(/app/) 화면은 브라우저 설치 안내 페이지가 되어, 확인 기준을 새 앱 홈(비회원 인사 문구)으로 바꿈.
const expectedText = "댕다방에 오신 걸 환영해요";
const expectedPath = "/app/home-1/";
const maximumAttempts = 20;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function connect(url) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(url);
        const timer = setTimeout(() => {
            socket.close();
            reject(new Error("Timed out while connecting to the Android WebView debugger."));
        }, 5_000);

        socket.addEventListener("open", () => {
            clearTimeout(timer);
            resolve(socket);
        }, { once: true });
        socket.addEventListener("error", () => {
            clearTimeout(timer);
            reject(new Error("Could not connect to the Android WebView debugger."));
        }, { once: true });
    });
}

let nextRequestId = 0;

function evaluateDocument(socket, expression = `(() => ({
    url: window.location.href,
    title: document.title,
    readyState: document.readyState,
    text: document.body?.innerText || "",
    nativeInteractiveMs: performance.getEntriesByName("ddb-native-interactive")[0]?.startTime ?? null,
    tabInteractive: typeof document.querySelector('.app-tabbar a[href="/app/sticker/shop/"]')?.onclick === "function",
}))()`, timeoutMs = 5_000) {
    return new Promise((resolve, reject) => {
        const requestId = ++nextRequestId;
        const timer = setTimeout(() => {
            socket.removeEventListener("message", onMessage);
            reject(new Error("Timed out while reading the Android WebView document."));
        }, timeoutMs);

        const onMessage = (event) => {
            const message = JSON.parse(String(event.data));
            if (message.id !== requestId) return;

            clearTimeout(timer);
            socket.removeEventListener("message", onMessage);
            if (message.error || message.result?.exceptionDetails) {
                const detail = message.error?.message || message.result?.exceptionDetails?.exception?.description
                    || message.result?.exceptionDetails?.text || "unknown error";
                reject(new Error(`Android WebView document evaluation failed: ${detail}`));
                return;
            }
            resolve(message.result?.result?.value);
        };

        socket.addEventListener("message", onMessage);
        socket.send(JSON.stringify({
            id: requestId,
            method: "Runtime.evaluate",
            params: {
                expression,
                awaitPromise: true,
                returnByValue: true,
            },
        }));
    });
}

async function verifyPetCompanion(socket) {
    await evaluateDocument(socket, `(() => {
        sessionStorage.setItem("ddb.petCompanion.guestHeroVisual.v1", JSON.stringify({
            breedId: "toy-poodle", characterId: "poodle",
        }));
        document.querySelector('a.app-tab[href="/app/sticker/shop/"]').click();
    })()`);
    let companion;
    for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
        companion = await evaluateDocument(socket, `(() => {
            const root = document.querySelector('[data-pet-companion-root]');
            const character = root?.querySelector('[data-breed]');
            const canvas = character?.querySelector('canvas');
            // The hero can occupy the whole initial viewport. Move to the
            // shopping content where the walker has space to become visible.
            if (character && window.scrollY === 0) window.scrollTo(0, 430);
            let visible = Boolean(canvas);
            for (let element = canvas; element; element = element.parentElement) {
                const style = getComputedStyle(element);
                if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) visible = false;
            }
            return {
                src: character?.dataset.breedAsset,
                poster: character?.dataset.breedPoster,
                status: canvas?.dataset.petSpriteStatus,
                width: character?.getBoundingClientRect().width || 0,
                hidden: root?.getAttribute('aria-hidden'),
                visible,
            };
        })()`);
        if (companion?.status === "ready" && companion.visible && companion.width > 0 && companion.hidden !== "true") break;
        await delay(1_000);
    }
    if (companion?.status !== "ready" || !companion.visible || companion.width <= 0 || companion.hidden === "true"
        || !companion.src.startsWith("https://www.daengdabang.com/images/pet-companion/")) {
        throw new Error(`Android shopping companion did not render: ${JSON.stringify(companion)}`);
    }
    // Load the fallback independently: a successful motion atlas must not hide
    // a missing offline poster (the original APK failed both requests).
    companion.posterLoaded = await evaluateDocument(socket, `new Promise(resolve => {
        const poster = document.querySelector('[data-pet-companion-root] [data-breed]')?.dataset.breedPoster;
        if (!poster?.startsWith('/images/pet-companion/')) return resolve(false);
        const image = new Image();
        image.onload = () => resolve(image.naturalWidth > 0);
        image.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 3000);
        image.src = poster;
    })`);
    if (!companion.posterLoaded) throw new Error("Android companion offline poster is missing.");
    return companion;
}

async function verifyShoppingMedia(socket) {
    const screenshot = (name) => writeFileSync(
        `android/app/build/outputs/apk/debug/app-debug-${name}.png`,
        execFileSync("adb", ["exec-out", "screencap", "-p"]),
    );
    const posterLoaded = await evaluateDocument(socket, `new Promise(resolve => {
        window.scrollTo({top: 0, behavior: 'instant'});
        const image = new Image();
        image.onload = () => resolve(image.naturalWidth >= 600);
        image.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 3000);
        image.src = '/images/ui/shop-hero-poster.webp';
    })`);
    if (!posterLoaded) throw new Error("The native shopping hero offline poster is missing.");
    await evaluateDocument(socket, `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    screenshot("shop-media");
    await evaluateDocument(socket, `document.querySelector('nav[aria-label="상품군"] a').click()`);
    let products;
    for (let attempt = 0; attempt < maximumAttempts; attempt++) {
        products = await evaluateDocument(socket, `(() => {
            const cards = [...document.querySelectorAll('article[data-pet-product]')];
            if (cards.length && window.scrollY < 100) cards[0].scrollIntoView({block:'center'});
            return {
                photos: cards.slice(0, 2).map(card => {
                    const image = card.querySelector('a img');
                    return {src:image?.currentSrc, width:image?.naturalWidth, opacity:image && getComputedStyle(image).opacity};
                }),
                playing: cards.flatMap(card => [...card.querySelectorAll('video')]).filter(video => !video.paused && video.readyState >= 2).length,
                hiddenVideos: cards.flatMap(card => [...card.querySelectorAll('video')]).every(video => !video.classList.contains('opacity-0') || getComputedStyle(video).visibility === 'hidden'),
            };
        })()`);
        if (products.photos.length === 2 && products.photos.every(photo => photo.width > 0)) break;
        await delay(1_000);
    }
    if (products.photos.length !== 2 || products.photos.some(photo => !photo.width || photo.opacity !== "1"
        || !new URL(photo.src).pathname.startsWith("/images/products/card/") || new URL(photo.src).hostname !== "localhost")) {
        throw new Error(`Native product photographs are not local and visible: ${JSON.stringify(products)}`);
    }
    screenshot("product-media");
    let maxPlaying = 0;
    for (let sample = 0; sample < 12; sample++) {
        const state = await evaluateDocument(socket, `(() => {
            const videos = [...document.querySelectorAll('article[data-pet-product] video')];
            return {playing: videos.filter(video => !video.paused && video.readyState >= 2).length,
                // A decoded video starts its fade at computed opacity 0 while
                // already active. Only inactive surfaces must be hidden.
                hiddenVideos: videos.every(video => !video.classList.contains('opacity-0') || getComputedStyle(video).visibility === 'hidden')};
        })()`);
        maxPlaying = Math.max(maxPlaying, state.playing);
        if (state.playing > 1 || !state.hiddenVideos) throw new Error(`Native preview surface regression: ${JSON.stringify(state)}`);
        await delay(500);
    }
    screenshot("product-media");
    await evaluateDocument(socket, `document.querySelector('.app-tabbar a[href="/app/sticker/show/"]').click()`);
    let community;
    for (let attempt = 0; attempt < maximumAttempts; attempt++) {
        community = await evaluateDocument(socket, `(() => {
            const photos = [...document.querySelectorAll('.sh-photo > img')].slice(0, 4);
            if (photos.length && window.scrollY < 100) photos[0].scrollIntoView({block:'center'});
            return {photos:photos.map(image => ({width:image.naturalWidth, height:image.naturalHeight,
                ready:image.complete && image.naturalWidth > 0 && !image.parentElement.querySelector('[role="status"]')})),
                retry:document.body.innerText.includes('사진 다시 불러오기')};
        })()`);
        if (community.photos.length >= 2 && community.photos.every(photo => photo.ready)) break;
        await delay(1_000);
    }
    await evaluateDocument(socket, `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    screenshot("community-media");
    if (community.photos.length < 2 || community.photos.some(photo => !photo.ready)) {
        throw new Error(`Native community photographs did not load: ${JSON.stringify(community)}`);
    }
    return {posterLoaded, products, maxPlaying, community};
}

async function verifyOnDemandInference(socket) {
    // Synthetic images remain on the emulator. Loading the runtime only here
    // proves that removing its startup provider preserves the optional feature.
    const result = await evaluateDocument(socket, `(async () => {
        const started = performance.now();
        const capabilities = await window.Capacitor.nativePromise('OnDeviceTryOn', 'getCapabilities', {});
        if (!capabilities.available || !capabilities.modelAvailable) throw new Error('Bundled on-device model unavailable');
        const image = (color) => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 32;
            const context = canvas.getContext('2d');
            context.fillStyle = color;
            context.fillRect(0, 0, 32, 32);
            return canvas.toDataURL('image/png');
        };
        const output = await window.Capacitor.nativePromise('OnDeviceTryOn', 'run', {
            petDataUrl: image('#d8b48a'), productDataUrl: image('#3258a8'), layout: 'torso',
            modelSha256: capabilities.modelSha256,
        });
        const decoded = new Image();
        decoded.src = output.imageDataUrl;
        await decoded.decode();
        return {width: decoded.naturalWidth, height: decoded.naturalHeight,
            runtimeVersion: output.runtimeVersion, provider: output.provider,
            modelMatches: output.modelSha256 === capabilities.modelSha256,
            inferenceMs: output.durationMs, totalMs: performance.now() - started};
    })()`, 30_000);
    if (result.width !== 256 || result.height !== 256 || !result.modelMatches || !result.runtimeVersion) {
        throw new Error(`On-demand Android inference failed: ${JSON.stringify(result)}`);
    }
    return result;
}

let lastState;
let lastError;

for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    let socket;
    try {
        const targets = await fetch(devtoolsEndpoint).then((response) => {
            if (!response.ok) throw new Error(`DevTools target request failed (${response.status}).`);
            return response.json();
        });
        const target = targets.find(({ type, webSocketDebuggerUrl }) => type === "page" && webSocketDebuggerUrl);
        if (!target) throw new Error("No debuggable Android WebView page was found.");

        socket = await connect(target.webSocketDebuggerUrl);
        lastState = await evaluateDocument(socket);

        if (
            lastState?.readyState === "complete"
            // 끝에 index.html 이 붙은 시작 주소(/app/home-1/index.html)도 같은 앱 홈으로 본다(2026-10-18)
            && new URL(lastState.url).pathname.replace(/index\.html$/, "") === expectedPath
            && lastState.title.includes("댕다방")
            && lastState.text.includes(expectedText)
            && lastState.tabInteractive
            && Number.isFinite(lastState.nativeInteractiveMs)
        ) {
            lastState.companion = await verifyPetCompanion(socket);
            lastState.media = await verifyShoppingMedia(socket);
            lastState.onDeviceTryOn = await verifyOnDemandInference(socket);
            socket.close();
            process.stdout.write(`${JSON.stringify(lastState, null, 2)}\n`);
            process.exit(0);
        }
        socket.close();
    } catch (error) {
        socket?.close();
        lastError = error;
    }

    await delay(1_000);
}

throw new Error(
    `Android WebView did not render the app home. Last state: ${JSON.stringify(lastState)}. ${lastError?.message || ""}`,
);
