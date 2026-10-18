type JobReply = { state?: string; stage?: string; result?: unknown };
type JobOutcome = { kind: "result"; result: unknown } | { kind: "unsupported" } | { kind: "failed" };

/** A transport timeout only reconnects to the same server-owned request. */
export async function awaitShopChatJob(input: {
    base: string;
    headers: Record<string, string>;
    payload: { clientRequestId: string } & Record<string, unknown>;
    signal: AbortSignal;
    onProgress: (stage: string, message?: string) => void;
    fetcher?: typeof fetch;
    pollMs?: number;
    requestTimeoutMs?: number;
}): Promise<JobOutcome> {
    const fetcher = input.fetcher ?? fetch;
    const root = `${input.base.replace(/\/$/, "")}/api/v1/shop-chat/jobs`;
    const url = `${root}/${encodeURIComponent(input.payload.clientRequestId)}`;
    let accepted = false;
    let submit = true;
    let attempted = false;
    let retry = 0;
    const checkCancelled = () => input.signal.throwIfAborted();
    const delay = async () => {
        checkCancelled();
        await new Promise<void>((resolve, reject) => {
            const abort = () => { clearTimeout(timer); reject(input.signal.reason); };
            const timer = setTimeout(() => { input.signal.removeEventListener("abort", abort); resolve(); },
                input.pollMs ?? Math.min(5000, 1000 + retry * 500));
            input.signal.addEventListener("abort", abort, { once: true });
        });
    };
    try {
        while (true) {
            checkCancelled();
            const controller = new AbortController();
            const abort = () => controller.abort(input.signal.reason);
            input.signal.addEventListener("abort", abort, { once: true });
            const timer = setTimeout(() => controller.abort(), input.requestTimeoutMs ?? 20_000);
            let response: Response;
            let value: JobReply;
            const wasSubmit = submit;
            try {
                attempted = true;
                response = await fetcher(submit ? root : url, {
                    method: submit ? "POST" : "GET",
                    headers: input.headers,
                    ...(submit ? { body: JSON.stringify(input.payload) } : {}),
                    cache: "no-store",
                    signal: controller.signal,
                });
                value = await response.json().catch(() => ({}));
            } catch {
                checkCancelled();
                // The POST may have reached the server: look up its ID first.
                submit = false;
                retry += 1;
                input.onProgress("answering", "연결을 다시 확인하고 있어요. 같은 답변을 이어서 기다릴게요.");
                await delay();
                continue;
            } finally {
                clearTimeout(timer);
                input.signal.removeEventListener("abort", abort);
            }
            checkCancelled();
            if (!accepted && wasSubmit && [404, 405, 501].includes(response.status)) {
                return { kind: "unsupported" };
            }
            if (!accepted && !wasSubmit && response.status === 404) {
                submit = true; // Idempotent creation after a lost initial response.
                await delay();
                continue;
            }
            if (response.status >= 500 || response.status === 429) {
                submit = false;
                retry += 1;
                input.onProgress("answering", "연결을 다시 확인하고 있어요. 잠시만 기다려 주세요.");
                await delay();
                continue;
            }
            if (!response.ok) return { kind: "failed" };
            accepted = true;
            submit = false;
            retry = 0;
            if (value.state === "completed" && value.result) return { kind: "result", result: value.result };
            if (value.state !== "pending") return { kind: "failed" };
            input.onProgress(value.stage || "answering");
            await delay();
        }
    } finally {
        if (input.signal.aborted && attempted) {
            // Separate from the aborted polling signal; the server cancels the
            // provider task and retains a tombstone against a delayed POST.
            void fetcher(url, { method: "DELETE", headers: input.headers,
                keepalive: true, signal: AbortSignal.timeout(10_000) }).catch(() => undefined);
        }
    }
}
