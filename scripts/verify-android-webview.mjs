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
        socket.close();

        if (
            lastState?.readyState === "complete"
            && new URL(lastState.url).pathname === expectedPath
            && lastState.title.includes("댕다방")
            && lastState.text.includes(expectedText)
        ) {
            process.stdout.write(`${JSON.stringify(lastState, null, 2)}\n`);
            process.exit(0);
        }
    } catch (error) {
        socket?.close();
        lastError = error;
    }

    await delay(1_000);
}

throw new Error(
    `Android WebView did not render the app home. Last state: ${JSON.stringify(lastState)}. ${lastError?.message || ""}`,
);
