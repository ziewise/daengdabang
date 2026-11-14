// Cover both headers and JSON transfer: a stalled body must not leave the feed
// loading indefinitely. Only reads can be replayed after an unknown outcome.
const READ_TIMEOUT_MS = 8_000;
const TRANSIENT_GATEWAY_STATUS = new Set([502, 503, 504]);

function abortReason(signal: AbortSignal) {
    return signal.reason ?? new DOMException("Request cancelled", "AbortError");
}

function waitForRetry(signal?: AbortSignal | null) {
    return new Promise<void>((resolve, reject) => {
        if (signal?.aborted) return reject(abortReason(signal));
        const onAbort = () => {
            clearTimeout(timer);
            reject(abortReason(signal!));
        };
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, 250 + Math.random() * 250);
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}

export async function fetchShowcaseJson<T>(
    url: string,
    init: RequestInit,
    responseError: (response: Response) => Promise<Error>,
): Promise<T> {
    if ((init.method ?? "GET").toUpperCase() !== "GET") {
        const response = await fetch(url, init);
        if (!response.ok) throw await responseError(response);
        return response.json() as Promise<T>;
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
        if (init.signal?.aborted) throw abortReason(init.signal);
        const controller = new AbortController();
        const onAbort = () => controller.abort(abortReason(init.signal!));
        init.signal?.addEventListener("abort", onAbort, { once: true });
        let timedOut = false;
        const timeoutError = new DOMException("Showcase read timed out", "TimeoutError");
        const timer = setTimeout(() => {
            timedOut = true;
            controller.abort(timeoutError);
        }, READ_TIMEOUT_MS);
        try {
            const response = await fetch(url, { ...init, signal: controller.signal });
            if (response.ok) return await response.json() as T;
            if (attempt === 0 && TRANSIENT_GATEWAY_STATUS.has(response.status)) {
                await response.body?.cancel();
            } else {
                throw await responseError(response);
            }
        } catch (error) {
            if (init.signal?.aborted) throw abortReason(init.signal);
            if (attempt !== 0 || (!timedOut && !(error instanceof TypeError))) {
                throw timedOut ? timeoutError : error;
            }
        } finally {
            clearTimeout(timer);
            init.signal?.removeEventListener("abort", onAbort);
        }
        await waitForRetry(init.signal);
    }
    throw new Error("Showcase read exhausted");
}
