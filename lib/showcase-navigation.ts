import { getCustomerToken } from "./customer-api";
import { loadShowcaseFeed, type ShowcaseFeed } from "./daeng-showcase";
import { prepareShowcasePhotos } from "./showcase-photo-handoff";

// Start the first page on an explicit navigation intent, alongside route code.
// This is a single-use handoff, never a persistent feed/photo cache.
const LIFETIME_MS = 8_000;
type PreparedFeed = {
    token: string;
    expires: number;
    controller: AbortController;
    result: Promise<ShowcaseFeed | null>;
    timer: ReturnType<typeof setTimeout>;
};
let prepared: PreparedFeed | null = null;
const identity = (token: string) => token || getCustomerToken() || "";

export function clearPreparedShowcaseFeed() {
    if (!prepared) return;
    clearTimeout(prepared.timer);
    prepared.controller.abort();
    prepared = null;
}

export function prepareShowcaseFeed(token = "") {
    const key = identity(token);
    if (prepared?.token === key && prepared.expires > Date.now()) return;
    clearPreparedShowcaseFeed();
    const controller = new AbortController();
    const entry: PreparedFeed = {
        token: key,
        expires: Date.now() + LIFETIME_MS,
        controller,
        result: loadShowcaseFeed("all", { limit: 12, token: key || undefined, signal: controller.signal }).then(feed => {
            prepareShowcasePhotos(feed.items, controller.signal);
            return feed;
        }).catch(() => null),
        timer: setTimeout(() => { if (prepared === entry) clearPreparedShowcaseFeed(); }, LIFETIME_MS),
    };
    prepared = entry;
}

export async function takePreparedShowcaseFeed(token: string, signal?: AbortSignal): Promise<ShowcaseFeed | null> {
    const entry = prepared;
    if (!entry) return null;
    if (entry.token !== identity(token) || entry.expires <= Date.now()) {
        clearPreparedShowcaseFeed();
        return null;
    }
    prepared = null;
    clearTimeout(entry.timer);
    const abort = () => entry.controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    try {
        if (signal?.aborted) { abort(); return null; }
        return await entry.result;
    } finally {
        signal?.removeEventListener("abort", abort);
    }
}
