// Yield to input/paint during CPU work. Cancellation never starts a server request.
export function assertLocalWorkActive(signal?: AbortSignal) {
    if (signal?.aborted || (typeof document !== "undefined" && document.visibilityState === "hidden")) {
        throw new DOMException("Aborted", "AbortError");
    }
}

export async function yieldLocalWork(signal?: AbortSignal) {
    assertLocalWorkActive(signal);
    await new Promise<void>((resolve, reject) => {
        const abort = () => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", abort);
            reject(new DOMException("Aborted", "AbortError"));
        };
        const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, 0);
        signal?.addEventListener("abort", abort, { once: true });
    });
    assertLocalWorkActive(signal);
}
