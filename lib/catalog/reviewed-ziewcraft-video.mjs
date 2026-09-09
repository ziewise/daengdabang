const HASH = /^[a-f0-9]{64}$/;
const FOLDER = /^[A-Za-z0-9_.-]+$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/;
const QUALITY = new Set(["approved_dog_wearing", "approved_dog_using", "approved_dog_interacting"]);
export const ZIEWCRAFT_IDENTITY_HASH_FIELDS = [
    "sourceImageSha256", "sourceManifestSha256", "referenceImageSha256", "requestSha256",
    "sourceVideoSha256", "technicalReviewSha256", "visualReviewSha256",
];
export const ZIEWCRAFT_REVIEW_CHECKS = [
    "sourceProvenance", "productIdentity", "colorAndPattern", "structureAndHardware",
    "scaleAndWearLocation", "petAnatomyAndContact", "temporalConsistency", "naturalProductInteraction",
    "branding", "providerMarkPreserved", "fullDecode",
];
const IDENTITY_FIELDS = [
    "kind", "provider", "productId", "folder", "supplierGoodsNo", "productName", "supplierSourceUrl",
    "catalogImage", "colorName", "colorImage", "colorImageRegion", "sourceImage", "planId", "candidateId", "jobId", "artifactId",
    ...ZIEWCRAFT_IDENTITY_HASH_FIELDS,
];
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const text = value => typeof value === "string" && value.length > 0 && value === value.trim();
const hash = value => typeof value === "string" && HASH.test(value);
function publicImage(value) {
    if (!text(value) || /[\\\s]/.test(value)) return false;
    if (value.startsWith("/images/") && !value.includes("..") && !/[?#]/.test(value)) return true;
    try {
        const url = new URL(value);
        return url.protocol === "https:" && !url.username && !url.password && !url.hash;
    } catch { return false; }
}
function validRegion(region) {
    return region === null || (object(region) && Object.keys(region).length === 4
        && ["x", "y", "width", "height"].every(key => typeof region[key] === "number" && Number.isFinite(region[key]))
        && region.x >= 0 && region.y >= 0 && region.width > 0 && region.height > 0
        && region.x + region.width <= 1 && region.y + region.height <= 1);
}
const regionKey = region => region === null ? "" : [region.x, region.y, region.width, region.height].join(",");

export function validZiewcraftVideoIdentity(identity) {
    return Boolean(object(identity) && Object.keys(identity).length === IDENTITY_FIELDS.length
        && IDENTITY_FIELDS.every(key => Object.hasOwn(identity, key))
        && identity.kind === "ziewcraft_director_output.v1" && identity.provider === "ziewcraft"
        && typeof identity.folder === "string" && FOLDER.test(identity.folder)
        && typeof identity.productId === "string" && /^p_[1-9]\d*$/.test(identity.productId)
        && typeof identity.supplierGoodsNo === "string" && /^\d+$/.test(identity.supplierGoodsNo)
        && text(identity.productName) && publicImage(identity.supplierSourceUrl)
        && publicImage(identity.catalogImage) && publicImage(identity.colorImage) && publicImage(identity.sourceImage)
        && (identity.colorName === null || text(identity.colorName)) && validRegion(identity.colorImageRegion)
        && ["planId", "candidateId", "jobId", "artifactId"].every(key => typeof identity[key] === "string" && ID.test(identity[key]))
        && ZIEWCRAFT_IDENTITY_HASH_FIELDS.every(key => hash(identity[key])));
}

export function sameZiewcraftVideoIdentity(a, b) {
    return validZiewcraftVideoIdentity(a) && validZiewcraftVideoIdentity(b)
        && IDENTITY_FIELDS.every(key => key === "colorImageRegion"
            ? regionKey(a[key]) === regionKey(b[key]) : a[key] === b[key]);
}

export function matchesCurrentZiewcraftSource(raw, identity, colors) {
    if (raw?.supplierCatalogSource !== "jsk_approved_account" || raw.supplierCatalogHistorical === true
        || identity.productId !== `p_${raw.no}` || identity.folder !== raw.folder
        || identity.supplierGoodsNo !== raw.supplierGoodsNo || identity.productName !== raw.name
        || identity.supplierSourceUrl !== raw.sourceUrl || identity.catalogImage !== raw.image) return false;
    if (!object(colors)) return false;
    const officialImages = [raw.image, ...(Array.isArray(raw.gallery) ? raw.gallery : []), ...(Array.isArray(raw.details) ? raw.details : [])];
    const entries = colors[identity.folder];
    if (entries !== undefined && !Array.isArray(entries)) return false;
    if (!entries?.length) return identity.colorName === null && identity.colorImage === raw.image && identity.colorImageRegion === null
        && officialImages.includes(identity.sourceImage);
    const matches = entries.filter(color => color?.name === identity.colorName);
    if (matches.length !== 1 || matches[0].imageUnavailable === true) return false;
    const color = matches[0];
    const source = color.image || color.file;
    if (!text(source)) return false;
    const image = /^(https?:\/\/|\/)/.test(source) ? source : `/images/products/catalog/${identity.folder}/colors/${source}`;
    const region = color.imageRegion ?? null;
    return image === identity.colorImage && validRegion(region) && regionKey(region) === regionKey(identity.colorImageRegion)
        && [...officialImages, image].includes(identity.sourceImage);
}

/** Exact registry membership is authority; plausible provider/job/hash values alone are not. */
export function matchesReviewedZiewcraftVideo(product, reviews, colors) {
    const raw = product?.raw;
    const folder = product?.folder || raw?.folder || "";
    if (!object(reviews) || !Object.hasOwn(reviews, folder)) return false;
    const record = reviews[folder];
    const identity = raw?.videoZiewcraftIdentity;
    if (!object(record) || !sameZiewcraftVideoIdentity(identity, record.videoZiewcraftIdentity)) return false;
    const review = record.review;
    const technical = record.technical;
    return Boolean(record.schema === "ddb.ziewcraft-hover-review.v1" && record.publicationStatus === "approved"
        && record.folder === folder && raw.folder === folder && identity.folder === folder
        && record.productId === product.id && identity.productId === product.id
        && record.videoProvider === "ziewcraft" && raw.videoProvider === "ziewcraft"
        && record.videoJobId === identity.jobId && raw.videoJobId === identity.jobId
        && QUALITY.has(record.videoQuality) && raw.videoQuality === record.videoQuality
        && raw.videoGenerationIdentity == null && raw.videoEditIdentity == null && raw.videoReviewClass == null
        && hash(record.sha256) && record.video === `/images/products/catalog/${folder}/videos/${record.sha256}/hover.mp4`
        && product.video === record.video && raw.video === record.video
        && matchesCurrentZiewcraftSource(raw, identity, colors)
        && technical?.container === "mp4" && ["h264", "avc1", "avc3"].includes(technical.codec)
        && Number.isInteger(technical.width) && technical.width >= 1080 && technical.height === technical.width
        && Number.isFinite(technical.durationSeconds) && Math.abs(technical.durationSeconds - 8) <= 0.1
        && technical.pixelFormat === "yuv420p" && technical.audioStreams === 0 && technical.fastStart === true
        && review?.decision === "approved" && text(review.reviewer)
        && typeof review.reviewedAt === "string" && /^\d{4}-\d\d-\d\dT/.test(review.reviewedAt) && Number.isFinite(Date.parse(review.reviewedAt))
        && hash(review.sha256) && raw.videoReviewSha256 === review.sha256
        && ZIEWCRAFT_REVIEW_CHECKS.every(key => review.checks?.[key] === true)
        && Array.isArray(review.limitations) && review.limitations.every(text));
}
