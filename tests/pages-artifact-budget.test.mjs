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

async function fixture(t, { includeCdnUrl = true } = {}) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ddb-pages-artifact-"));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    await write(
        root,
        "lib/catalog/raw.json",
        JSON.stringify([
            {
                image: "/images/products/catalog/sample/sample.webp",
                video: "/images/products/catalog/sample/videos/hover.mp4",
                videoDelivery: "jsdelivr_commit_cdn",
            },
        ]),
    );
    await write(root, "lib/catalog/colors.json", "{}");
    await write(root, "lib/external-products/feed.json", "[]");
    const cdnUrl = includeCdnUrl
        ? `https://cdn.jsdelivr.net/gh/ziewise/daengdabang@${COMMIT_SHA}/public/images/products/catalog/sample/videos/hover.mp4`
        : "/images/products/catalog/sample/videos/hover.mp4";
    await write(root, "out/index.html", `<video src="${cdnUrl}"></video>`);
    await write(root, "out/images/products/catalog/sample/sample.webp", "keep-main");
    await write(root, "out/images/products/catalog/sample/sample.png", "drop-source");
    await write(root, "out/images/products/catalog/sample/details/1.webp", "drop-duplicate");
    await write(root, "out/images/products/catalog/sample/videos/hover.mp4", "drop-cdn-copy");
    await write(root, "out/images/products/catalog/stale/videos/hover.mp4", "drop-unused-video");
    await write(root, "out/images/hero/keep.mp4", "keep-unrelated");
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
    assert.equal(result.unusedAssetCount, 3);
    assert.equal(await fs.readFile(path.join(root, "out/images/products/catalog/sample/sample.webp"), "utf8"), "keep-main");
    assert.equal(await fs.readFile(path.join(root, "out/images/hero/keep.mp4"), "utf8"), "keep-unrelated");
    await assert.rejects(fs.access(path.join(root, "out/images/products/catalog/sample/videos/hover.mp4")));
    await assert.rejects(fs.access(path.join(root, "out/images/products/catalog/sample/sample.png")));
});

test("Pages artifact refuses to remove local videos before every expected CDN URL is in the build", async (t) => {
    const root = await fixture(t, { includeCdnUrl: false });

    await assert.rejects(
        preparePagesArtifact({
            repoRoot: root,
            outRoot: path.join(root, "out"),
            commitSha: COMMIT_SHA,
            maxBytes: 1_000_000,
        }),
        /CDN URL\(s\) are missing/,
    );
    assert.equal(
        await fs.readFile(path.join(root, "out/images/products/catalog/sample/videos/hover.mp4"), "utf8"),
        "drop-cdn-copy",
    );
});

test("Pages deployment workflow pins video URLs to the build SHA and uses Node 24-based action majors", async () => {
    const [catalogSource, workflow] = await Promise.all([
        fs.readFile(new URL("../lib/catalog/data.ts", import.meta.url), "utf8"),
        fs.readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8"),
    ]);

    assert.match(catalogSource, /NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA/);
    assert.match(catalogSource, /cdn\.jsdelivr\.net\/gh\/ziewise\/daengdabang/);
    assert.match(catalogSource, /videoDelivery !== "jsdelivr_commit_cdn"/);
    assert.match(workflow, /NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA: \$\{\{ github\.sha \}\}/);
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
    assert.match(workflow, /prepare-pages-artifact\.mjs --out out --max-bytes 950000000/);
});
