import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { preparePagesArtifact } from "../scripts/prepare-pages-artifact.mjs";

const COMMIT_SHA = "a".repeat(40);

async function write(root, relative, value = "fixture") {
    const target = path.join(root, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, value);
    return target;
}

async function fixture(t, {
    includeCdnUrl = true,
    includeCdnVisual = true,
    approvedMetadata = false,
    reviewedHoverOverrides = {},
} = {}) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ddb-pages-artifact-"));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    await write(
        root,
        "lib/catalog/raw.json",
        JSON.stringify([
            {
                folder: "sample",
                image: "/images/products/catalog/sample/sample.webp",
                details: ["/images/products/catalog/sample/details/official-visual-01.webp"],
                video: "/images/products/catalog/sample/videos/hover.mp4",
                videoDelivery: "jsdelivr_commit_cdn",
                ...(approvedMetadata ? {
                    videoProvider: "ddb_exact_product_renderer",
                    videoQuality: "approved_exact_product_images",
                    videoJobId: "reviewed-batch",
                } : {}),
            },
        ]),
    );
    await write(
        root,
        "lib/catalog/reviewed-hover-overrides.json",
        JSON.stringify(reviewedHoverOverrides),
    );
    await write(root, "lib/catalog/colors.json", "{}");
    await write(root, "lib/external-products/feed.json", "[]");
    const cdnUrl = includeCdnUrl
        ? `https://cdn.jsdelivr.net/gh/ziewise/daengdabang@${COMMIT_SHA}/public/images/products/catalog/sample/videos/hover.mp4`
        : "/images/products/catalog/sample/videos/hover.mp4";
    const cdnVisual = includeCdnVisual
        ? `https://cdn.jsdelivr.net/gh/ziewise/daengdabang@${COMMIT_SHA}/public/images/products/catalog/sample/details/official-visual-01.webp`
        : "/images/products/catalog/sample/details/official-visual-01.webp";
    await write(root, "out/index.html", `<video src="${cdnUrl}"></video><img src="${cdnVisual}">`);
    await write(root, "out/images/products/catalog/sample/sample.webp", "keep-main");
    await write(root, "out/images/products/catalog/sample/sample.png", "drop-source");
    await write(root, "out/images/products/catalog/sample/details/1.webp", "drop-duplicate");
    await write(root, "out/images/products/catalog/sample/details/official-visual-01.webp", "drop-cdn-visual-copy");
    await write(root, "out/images/products/catalog/sample/videos/hover.mp4", "drop-cdn-copy");
    await write(root, "out/images/products/catalog/stale/videos/hover.mp4", "drop-unused-video");
    await write(root, "out/images/hero/keep.mp4", "keep-unrelated");
    await write(root, "out/images/naver-import/source.webp", "drop-marketplace-source");
    await write(root, "out/images/naver-details/reference.webp", "drop-marketplace-reference");
    await write(root, "out/videos/hero.mp4", "drop-legacy-copy");
    return root;
}

test("Pages artifact keeps referenced images and removes verified CDN video copies and unused product assets", async (t) => {
    const root = await fixture(t);
    const result = await preparePagesArtifact({
        repoRoot: root,
        outRoot: path.join(root, "out"),
        commitSha: COMMIT_SHA,
        maxBytes: 1_000_000,
    });

    assert.equal(result.expectedCdnVideoCount, 1);
    assert.equal(result.externalizedVideoCount, 1);
    assert.equal(result.externalizedOfficialVisualCount, 1);
    assert.equal(result.unusedAssetCount, 3);
    assert.equal(result.omittedLegacyAssetCount, 1);
    assert.equal(result.omittedNonRuntimeAssetCount, 2);
    assert.equal(await fs.readFile(path.join(root, "out/images/products/catalog/sample/sample.webp"), "utf8"), "keep-main");
    assert.equal(await fs.readFile(path.join(root, "out/images/hero/keep.mp4"), "utf8"), "keep-unrelated");
    await assert.rejects(fs.access(path.join(root, "out/videos/hero.mp4")));
    await assert.rejects(fs.access(path.join(root, "out/images/naver-import/source.webp")));
    await assert.rejects(fs.access(path.join(root, "out/images/naver-details/reference.webp")));
    await assert.rejects(fs.access(path.join(root, "out/images/products/catalog/sample/videos/hover.mp4")));
    await assert.rejects(fs.access(path.join(root, "out/images/products/catalog/sample/details/official-visual-01.webp")));
    await assert.rejects(fs.access(path.join(root, "out/images/products/catalog/sample/sample.png")));
});

test("Pages artifact fails closed when an official visual was not commit-pinned into the build", async (t) => {
    const root = await fixture(t, { includeCdnVisual: false });
    await assert.rejects(
        preparePagesArtifact({
            repoRoot: root,
            outRoot: path.join(root, "out"),
            commitSha: COMMIT_SHA,
            maxBytes: 1_000_000,
        }),
        /official visual CDN URL\(s\) were not pinned/,
    );
});

test("Pages artifact recognizes content-addressed video paths and rejects undeclared versions", async (t) => {
    const root = await fixture(t);
    const asset = `/images/products/catalog/sample/videos/${"b".repeat(64)}/hover.mp4`;
    const raw = JSON.parse(await fs.readFile(path.join(root, "lib/catalog/raw.json"), "utf8"));
    raw[0].video = asset;
    await write(root, "lib/catalog/raw.json", JSON.stringify(raw));
    const html = await fs.readFile(path.join(root, "out/index.html"), "utf8");
    await write(root, "out/index.html", html.replace("/sample/videos/hover.mp4", `/sample/videos/${"b".repeat(64)}/hover.mp4`));
    await write(root, `out${asset}`, "immutable-video");
    const result = await preparePagesArtifact({ repoRoot: root, outRoot: path.join(root, "out"), commitSha: COMMIT_SHA, maxBytes: 1_000_000 });
    assert.equal(result.expectedCdnVideoCount, 1);
    assert.equal(result.externalizedVideoCount, 1);
    await assert.rejects(fs.access(path.join(root, `out${asset}`)));
    raw[0].video = asset.replace("b".repeat(64), "c".repeat(64));
    await write(root, "lib/catalog/raw.json", JSON.stringify(raw));
    await assert.rejects(preparePagesArtifact({ repoRoot: root, outRoot: path.join(root, "out"), commitSha: COMMIT_SHA, maxBytes: 1_000_000 }), /absent from the catalog/);
});

test("branding and audit records do not retain withdrawn video copies in Pages", async (t) => {
    const root = await fixture(t);
    const withdrawn = "/images/products/catalog/stale/videos/hover.mp4";
    await write(root, "lib/catalog/video-branding.json", JSON.stringify({ [withdrawn]: { sourceAssetPath: withdrawn } }));
    await write(root, "lib/catalog/hover-review-20260906.json", JSON.stringify({ withdrawn }));
    const result = await preparePagesArtifact({ repoRoot: root, outRoot: path.join(root, "out"), commitSha: COMMIT_SHA, maxBytes: 1_000_000 });
    assert.equal(result.expectedCdnVideoCount, 1);
    await assert.rejects(fs.access(path.join(root, `out${withdrawn}`)));
});

test("Pages artifact omits catalog videos that the storefront safety gate did not publish", async (t) => {
    const root = await fixture(t, { includeCdnUrl: false });
    const result = await preparePagesArtifact({
        repoRoot: root,
        outRoot: path.join(root, "out"),
        commitSha: COMMIT_SHA,
        maxBytes: 1_000_000,
    });

    assert.equal(result.expectedCdnVideoCount, 0);
    assert.equal(result.catalogCdnVideoCount, 1);
    await assert.rejects(fs.access(path.join(root, "out/images/products/catalog/sample/videos/hover.mp4")));
});

test("Pages artifact fails closed when a reviewed video was not commit-pinned into the build", async (t) => {
    const root = await fixture(t, { includeCdnUrl: false, approvedMetadata: true });
    await assert.rejects(
        preparePagesArtifact({
            repoRoot: root,
            outRoot: path.join(root, "out"),
            commitSha: COMMIT_SHA,
            maxBytes: 1_000_000,
        }),
        /reviewed video CDN URL\(s\) were not pinned/,
    );
});

test("Pages artifact uses the same reviewed hover withdrawal gate as the storefront", async (t) => {
    const root = await fixture(t, {
        includeCdnUrl: false,
        approvedMetadata: true,
        reviewedHoverOverrides: { sample: null },
    });
    const result = await preparePagesArtifact({
        repoRoot: root,
        outRoot: path.join(root, "out"),
        commitSha: COMMIT_SHA,
        maxBytes: 1_000_000,
    });

    assert.equal(result.requiredReviewedCdnVideoCount, 0);
    assert.equal(result.catalogCdnVideoCount, 0);
    await assert.rejects(fs.access(path.join(root, "out/images/products/catalog/sample/videos/hover.mp4")));
});

test("Pages artifact quarantines reviewed still-photo pan-zoom overrides", async (t) => {
    const root = await fixture(t, {
        includeCdnUrl: false,
        approvedMetadata: true,
        reviewedHoverOverrides: {
            sample: {
                video: "/images/products/catalog/sample/videos/hover.mp4",
                videoDelivery: "jsdelivr_commit_cdn",
                videoProvider: "ddb_exact_product_renderer",
                videoQuality: "approved_exact_product_images",
                videoJobId: "still-photo-render",
            },
        },
    });
    const result = await preparePagesArtifact({
        repoRoot: root,
        outRoot: path.join(root, "out"),
        commitSha: COMMIT_SHA,
        maxBytes: 1_000_000,
    });

    assert.equal(result.requiredReviewedCdnVideoCount, 0);
    assert.equal(result.catalogCdnVideoCount, 0);
    await assert.rejects(fs.access(path.join(root, "out/images/products/catalog/sample/videos/hover.mp4")));
});

test("Pages artifact requires a reviewed override that the storefront publishes", async (t) => {
    const root = await fixture(t, {
        includeCdnUrl: false,
        reviewedHoverOverrides: {
            sample: {
                video: "/images/products/catalog/sample/videos/hover.mp4",
                videoDelivery: "jsdelivr_commit_cdn",
                videoProvider: "ziewcraft",
                videoQuality: "approved_dog_wearing",
                videoJobId: "reviewed-override",
            },
        },
    });
    await assert.rejects(
        preparePagesArtifact({
            repoRoot: root,
            outRoot: path.join(root, "out"),
            commitSha: COMMIT_SHA,
            maxBytes: 1_000_000,
        }),
        /reviewed video CDN URL\(s\) were not pinned/,
    );
});

test("Pages deployment workflow pins video URLs to the build SHA and uses Node 24-based action majors", async () => {
    const [catalogSource, workflow, nextConfig] = await Promise.all([
        fs.readFile(new URL("../lib/catalog/data.ts", import.meta.url), "utf8"),
        fs.readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8"),
        fs.readFile(new URL("../next.config.mjs", import.meta.url), "utf8"),
    ]);

    assert.match(catalogSource, /NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA/);
    assert.match(catalogSource, /cdn\.jsdelivr\.net\/gh\/ziewise\/daengdabang/);
    assert.match(catalogSource, /videoDelivery !== "jsdelivr_commit_cdn"/);
    assert.match(catalogSource, /storefrontOfficialVisualUrl/);
    assert.match(workflow, /NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA: \$\{\{ github\.sha \}\}/);
    assert.match(nextConfig, /env:\s*\{[\s\S]*NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA: storefrontAssetCommitSha/);
    assert.match(nextConfig, /process\.env\.CF_PAGES_COMMIT_SHA/);
    for (const action of [
        "actions/checkout@v6",
        "actions/configure-pages@v6",
        "actions/setup-node@v6",
        "actions/setup-python@v6",
        "actions/upload-pages-artifact@v5",
        "actions/deploy-pages@v5",
    ]) {
        assert.ok(workflow.includes(action), `missing ${action}`);
    }
    assert.match(workflow, /prepare-pages-artifact\.mjs --out out --max-bytes 965000000/);
});

async function flowFixture(t, { includeVideo = true, job = "flow-reviewed-job", includeReview = true } = {}) {
    const root = await fixture(t, { includeCdnUrl: false });
    const hash = "b".repeat(64);
    const video = `/images/products/catalog/sample/videos/${hash}/hover.mp4`;
    const rows = JSON.parse(await fs.readFile(path.join(root, "lib/catalog/raw.json"), "utf8"));
    rows[0].no = 67;
    await write(root, "lib/catalog/raw.json", JSON.stringify(rows));
    await write(root, "lib/catalog/reviewed-hover-overrides.json", JSON.stringify({
        sample: { video, videoDelivery: "jsdelivr_commit_cdn", videoProvider: "google_flow_web", videoQuality: "approved_dog_wearing", videoJobId: job },
    }));
    await write(root, "lib/catalog/reviewed-flow-videos.json", JSON.stringify(includeReview ? {
        sample: { folder: "sample", productId: "p_67", video, sha256: hash, videoJobId: "flow-reviewed-job", videoQuality: "approved_dog_wearing", publicationStatus: "approved", sourceAssetPath: "/images/products/catalog/stale/videos/hover.mp4" },
    } : {}));
    await write(root, `out${video}`, "immutable-flow-fixture");
    if (includeVideo) {
        const html = await fs.readFile(path.join(root, "out/index.html"), "utf8");
        await write(root, "out/index.html", `${html}<video src="https://cdn.jsdelivr.net/gh/ziewise/daengdabang@${COMMIT_SHA}/public${video}"></video>`);
    }
    return { root, video };
}

test("Pages includes the exact reviewed Flow asset through the effective catalog, not review-only references", async (t) => {
    const { root, video } = await flowFixture(t);
    const result = await preparePagesArtifact({ repoRoot: root, outRoot: path.join(root, "out"), commitSha: COMMIT_SHA, maxBytes: 1_000_000 });
    assert.equal(result.requiredReviewedCdnVideoCount, 1);
    assert.equal(result.expectedCdnVideoCount, 1);
    assert.equal(result.externalizedVideoCount, 1);
    await assert.rejects(fs.access(path.join(root, `out${video}`)));
    await assert.rejects(fs.access(path.join(root, "out/images/products/catalog/stale/videos/hover.mp4")));
});

test("Pages refuses an approved Flow clip missing its commit-pinned build URL", async (t) => {
    const { root } = await flowFixture(t, { includeVideo: false });
    await assert.rejects(preparePagesArtifact({ repoRoot: root, outRoot: path.join(root, "out"), commitSha: COMMIT_SHA, maxBytes: 1_000_000 }), /reviewed video CDN URL\(s\) were not pinned/);
});

test("Pages refuses Flow CDN references with an unreviewed job or missing review", async (t) => {
    for (const options of [{ job: "wrong-job" }, { includeReview: false }]) {
        const { root } = await flowFixture(t, options);
        await assert.rejects(preparePagesArtifact({ repoRoot: root, outRoot: path.join(root, "out"), commitSha: COMMIT_SHA, maxBytes: 1_000_000 }), /product video CDN URL\(s\) absent from the catalog/);
    }
});
