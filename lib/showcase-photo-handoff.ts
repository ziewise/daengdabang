import { showcaseThumbnailUrl } from "./showcase-image";

type PhotoPost = { imageUrl: string };
type PendingPhoto = { image: HTMLImageElement; discard: () => void; detach: () => void };
const pending = new WeakMap<PhotoPost, PendingPhoto>();

/** Only the first visible rows of an explicitly requested feed. Transfer the
 * actual image node: a second img/src would re-download private/no-store media
 * in Chromium. Unused nodes expire or abort; no response/blob/storage cache. */
export function prepareShowcasePhotos(posts: PhotoPost[], signal?: AbortSignal) {
    if (typeof Image === "undefined" || signal?.aborted) return;
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
