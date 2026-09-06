/** Exact reviewed reuse is independent of the unknown original generator. */
export function matchesReviewedLegacyVideo(product, reviews) {
    const raw = product.raw;
    const folder = product.folder || raw?.folder || "";
    const review = reviews?.[folder];
    return Boolean(review?.publicationStatus === "approved"
        && review.reviewClass === "legacy_reviewed"
        && review.provider === "unknown" && review.model === "unknown" && review.jobId === null
        && /^[a-f0-9]{64}$/.test(review.assetSha256)
        && /^[a-f0-9]{64}$/.test(review.sourceVideoSha256)
        && /^[a-f0-9]{64}$/.test(review.reviewSha256)
        && review.folder === folder && product.id === review.productId && raw?.folder === folder
        && product.video === review.assetPath && raw.video === review.assetPath
        && review.assetPath === `/images/products/catalog/${folder}/videos/${review.assetSha256}/hover.mp4`
        && raw.videoProvider === "unknown" && raw.videoJobId === null
        && raw.videoReviewClass === "legacy_reviewed" && raw.videoReviewSha256 === review.reviewSha256
        && raw.videoQuality === review.quality && review.quality === "approved_dog_using"
        && review.durationSeconds === 8 && review.width === 720 && review.height === 720
        && ["productIdentity", "scale", "motion", "branding", "providerMarkPreserved"].every(key => review.checks?.[key] === true));
}
