import { pathToFileURL } from "node:url";

const devtoolsEndpoint = "http://127.0.0.1:9222/json";
const expectedText = "댕다방 앱 홈";
const expectedPath = "/app/index.html";
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

function evaluateDocument(socket) {
    return new Promise((resolve, reject) => {
        const requestId = 1;
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
                expression: `(() => ({
                    url: window.location.href,
                    title: document.title,
                    readyState: document.readyState,
                    text: document.body?.innerText || "",
                }))()`,
                returnByValue: true,
            },
        }));
    });
}

export function isAppHome(state) {
    try {
        const url = new URL(state?.url);
        return url.origin === "https://localhost"
            && url.pathname === expectedPath
            && state.readyState === "complete"
            && state.title?.includes("댕다방")
            && state.text?.includes(expectedText);
    } catch {
        return false;
    }
}

export async function verifyWebView({
    fetchTargets = async () => {
        const response = await fetch(devtoolsEndpoint, { signal: AbortSignal.timeout(5_000) });
        if (!response.ok) throw new Error(`DevTools target request failed (${response.status}).`);
        return response.json();
    },
    readDocument = async (target) => {
        const socket = await connect(target.webSocketDebuggerUrl);
        try { return await evaluateDocument(socket); }
        finally { socket.close(); }
    },
    wait = delay,
    attempts = maximumAttempts,
} = {}) {
    let lastState = null;
    let lastTargets = [];
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const targets = await fetchTargets();
            if (!Array.isArray(targets)) throw new Error("DevTools target response was not an array.");
            lastTargets = targets.map(({ id, type, url, title, description, webSocketDebuggerUrl }) => ({
                id, type, url, title, description, debuggable: Boolean(webSocketDebuggerUrl),
            }));
            const pages = targets.filter(({ type, webSocketDebuggerUrl }) => type === "page" && webSocketDebuggerUrl);
            const target = pages.find(({ url }) => {
                try { return new URL(url).origin === "https://localhost" && new URL(url).pathname === expectedPath; }
                catch { return false; }
            }) || pages[0];
            if (!target) throw new Error("No debuggable Android WebView page was found.");
            lastState = await readDocument(target);
            lastError = null;
            if (isAppHome(lastState)) return { passed: true, attempt, state: lastState, targets: lastTargets };
        } catch (error) {
            lastError = error.message;
        }
        if (attempt < attempts) await wait(1_000);
    }
    return { passed: false, attempts, state: lastState, targets: lastTargets, error: lastError || "App home document did not satisfy the startup checks." };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const result = await verifyWebView();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.passed) {
        process.stderr.write(`Android WebView did not render the app home. ${result.error}\n`);
        process.exitCode = 1;
    }
}
