import { showcaseThumbnailUrl } from "./showcase-image";

type PhotoPost = { imageUrl: string; author?: { displayName: string } };
type PendingPhoto = { image: HTMLImageElement; discard: () => void; detach: () => void };
const pending = new WeakMap<PhotoPost, PendingPhoto>();
let initialFontsRequested = false;

/** Only the first visible rows of an explicitly requested feed. Transfer the
 * actual image node: a second img/src would re-download private/no-store media
 * in Chromium. Unused nodes expire or abort; no response/blob/storage cache. */
export function prepareShowcasePhotos(posts: PhotoPost[], signal?: AbortSignal) {
    if (typeof Image === "undefined" || signal?.aborted) return;
    // Prime the first feed's name glyphs while its photos are in flight. Even
    // reading document.fonts can flush layout, so never touch it on re-entry.
    // Later names use the normal optional font faces; no author data is kept.
    if (!initialFontsRequested && typeof document !== "undefined") {
        const names = posts.slice(0, 12).map(post => post.author?.displayName.slice(0, 64) || "").join("");
        const fonts = names ? document.fonts : undefined;
        if (fonts) {
            initialFontsRequested = true;
            void fonts.load('400 12.5px "Cafe24Ssurround"', [...new Set(names)].join(""))
                .catch(() => undefined);
        }
    }
    for (const post of posts.slice(0, 4)) {
        if (pending.has(post)) continue;
        const image = new Image();
        image.decoding = "async";
        image.loading = "eager";
        image.fetchPriority = "high";
        const detach = () => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", discard);
            pending.delete(post);
        };
        const discard = () => { detach(); image.removeAttribute("src"); };
        const timer = setTimeout(discard, 8_000);
        pending.set(post, { image, discard, detach });
        signal?.addEventListener("abort", discard, { once: true });
        image.src = showcaseThumbnailUrl(post.imageUrl);
        // Begin decoding while route/render work runs. Failure remains a normal
        // image error/retry in the mounted card, never an unhandled rejection.
        void image.decode().catch(() => undefined);
    }
}

export function takePreparedShowcasePhoto(post: PhotoPost): HTMLImageElement | undefined {
    const photo = pending.get(post);
    if (!photo) return;
    photo.detach();
    return photo.image;
}
