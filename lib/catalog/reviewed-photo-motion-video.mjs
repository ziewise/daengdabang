const HASH = /^[a-f0-9]{64}$/;
export const PHOTO_MOTION_HASH_FIELDS = [
    "sourceImageSha256", "recipeSha256", "technicalReviewSha256", "visualReviewSha256",
];

/** Publication of a reviewed source-photo edit; this never grants an AI job approval. */
export function matchesReviewedPhotoMotionVideo(product, reviews) {
    const raw = product.raw;
    const folder = product.folder || raw?.folder || "";
    const review = reviews?.[folder];
    const identity = raw?.videoEditIdentity;
    const approved = review?.videoEditIdentity;
    return Boolean(review?.publicationStatus === "approved"
        && review.productId === product.id && review.folder === folder && raw?.folder === folder
        && review.videoProvider === "ddb_exact_product_renderer"
        && raw.videoProvider === review.videoProvider
        && review.videoQuality === "approved_product_contents" && raw.videoQuality === review.videoQuality
        && review.videoJobId === null && raw.videoJobId === null
        && raw.videoGenerationIdentity == null && raw.videoReviewClass == null
        && HASH.test(review.sha256)
        && review.video === `/images/products/catalog/${folder}/videos/${review.sha256}/hover.mp4`
        && product.video === review.video && raw.video === review.video
        && typeof review.sourceImagePath === "string"
        && review.sourceImagePath.startsWith(`/images/products/catalog/${folder}/details/`)
        && review.reviewScope === "verified_product_contents_without_live_dog"
        && review.width === 720 && review.height === 720
        && review.durationSeconds === 4 && review.frameCount === 96 && review.fps === 24
        && identity?.method === "source_photo_motion_edit" && approved?.method === identity.method
        && identity.durationSeconds === 4 && approved.durationSeconds === 4
        && PHOTO_MOTION_HASH_FIELDS.every(key => HASH.test(approved[key]) && identity[key] === approved[key])
        && ["sourceProvenance", "contentsMatch", "sourcePhotoOnly", "branding", "loop", "fullDecode", "noLiveDog", "noNewProductGeometry"]
            .every(key => review.checks?.[key] === true));
}
