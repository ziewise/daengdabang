import { showcaseThumbnailUrl } from "./showcase-image";

type PhotoPost = { imageUrl: string; author?: { displayName: string } };
type PendingPhoto = { image: HTMLImageElement; discard: () => void; detach: () => void };
const pending = new WeakMap<PhotoPost, PendingPhoto>();
const requestedGlyphs = new WeakMap<FontFaceSet, Set<string>>();

/** Only the first visible rows of an explicitly requested feed. Transfer the
 * actual image node: a second img/src would re-download private/no-store media
 * in Chromium. Unused nodes expire or abort; no response/blob/storage cache. */
export function prepareShowcasePhotos(posts: PhotoPost[], signal?: AbortSignal) {
    if (typeof Image === "undefined" || signal?.aborted) return;
    // Names vary by feed. Waiting until card layout discovers their glyphs
    // creates another font download/reflow after the photos are already ready.
    // Request only this page's name glyphs, using the existing local font slices.
    if (typeof document !== "undefined" && document.fonts) {
        const fonts = document.fonts;
        const known = requestedGlyphs.get(fonts) ?? new Set<string>();
        requestedGlyphs.set(fonts, known);
        const names = posts.slice(0, 12).map(post => post.author?.displayName.slice(0, 64) || "").join("");
        const missing = [...new Set(names)].filter(glyph => !known.has(glyph));
        if (missing.length) {
            missing.forEach(glyph => known.add(glyph));
            const retryLater = () => missing.forEach(glyph => known.delete(glyph));
            // Remember individual glyphs only, never names or feed content.
            // Avoid another FontFaceSet layout flush on return visits.
            void fonts.load('400 12.5px "Cafe24Ssurround"', missing.join(""))
                .then(faces => { if (!faces.length) retryLater(); }).catch(retryLater);
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
