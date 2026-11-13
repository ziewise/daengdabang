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
}))()`) {
    return new Promise((resolve, reject) => {
        const requestId = ++nextRequestId;
        const timer = setTimeout(() => {
            reject(new Error("Timed out while reading the Android WebView document."));
        }, 5_000);

        const onMessage = (event) => {
            const message = JSON.parse(String(event.data));
            if (message.id !== requestId) return;

            clearTimeout(timer);
            socket.removeEventListener("message", onMessage);
            if (message.error || message.result?.exceptionDetails) {
                reject(new Error("Android WebView document evaluation failed."));
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
        ) {
            lastState.companion = await verifyPetCompanion(socket);
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
