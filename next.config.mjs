import { readFileSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, parse, resolve } from "node:path";

function commonAncestor(first, second) {
    let current = first;
    const root = parse(current).root;
    while (current !== root && second !== current && !second.startsWith(`${current}\\`) && !second.startsWith(`${current}/`)) {
        current = dirname(current);
    }
    return current || root;
}

const projectRoot = realpathSync(process.cwd());
const storefrontAssetCommitSha = (
    process.env.NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA
    || process.env.CF_PAGES_COMMIT_SHA
    || ""
).trim();
let dependencyRoot = projectRoot;
try {
    dependencyRoot = realpathSync(resolve(projectRoot, "node_modules"));
} catch {
    // A normal CI install resolves node_modules after dependency setup.
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Bound local builds on the host that also serves the API; CI keeps its default.
    ...(process.env.DDB_BUILD_CPUS ? { experimental: { cpus: Math.max(1, Math.min(8, Number(process.env.DDB_BUILD_CPUS) || 4)) } } : {}),
    output: "export",
    trailingSlash: true,
    // Next 16/Turbopack did not inline this value from client-side catalog code
    // reliably. Declare it in Next config so every rendered video URL is tied to
    // the immutable commit that contains the reviewed media.
    env: {
        NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA: storefrontAssetCommitSha,
        // Cache-bust the exported CSS without shipping/building its 440 KB
        // string in the client bundle just to calculate a version hash.
        NEXT_PUBLIC_APP_SKIN_VERSION: createHash("sha256")
            .update(readFileSync(new URL("./components/app-shell/appShopSkin.ts", import.meta.url)))
            .digest("hex").slice(0, 12),
    },
    images: {
        unoptimized: true,
    },
    // Keep Turbopack inside a root that contains both the project and a linked
    // dependency directory. In normal CI installs this resolves to projectRoot.
    turbopack: {
        root: commonAncestor(projectRoot, dependencyRoot),
    },
};

export default nextConfig;
