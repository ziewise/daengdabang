import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicRoot = fileURLToPath(new URL("../public/", import.meta.url));
const destination = path.join(publicRoot, "images/ui/shop-media");
const brandImages = ["Ruffwear01", "Ruffwear02", "Rexspecs01", "Rexspecs02"]
    .map(name => `/images/brands/${name}.png`);

/** Build display-sized copies of the first shop shelf's remaining originals.
 * Product data and full-size detail images keep their original URLs. */
export async function generateNativeShopMedia(productImages) {
    const sources = [...new Set([...brandImages, ...productImages])]
        .filter(src => typeof src === "string" && /^\/images\/(brands|products\/catalog)\//.test(src))
        .sort();
    mkdirSync(destination, { recursive: true });
    const mapping = {};
    let originalBytes = 0;
    let bundledBytes = 0;
    for (const src of sources) {
        const source = path.resolve(publicRoot, src.slice(1));
        if (!source.startsWith(publicRoot) || !existsSync(source)) {
            throw new Error(`Missing local shop image: ${src}`);
        }
        const input = readFileSync(source);
        // Content addressing refreshes the cache when a source image changes.
        const hash = createHash("sha256").update("shop-640-q80-v1:").update(input).digest("hex").slice(0, 20);
        const name = `shop-${hash}.webp`;
        const output = path.join(destination, name);
        if (!existsSync(output)) {
            await sharp(input).rotate().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
                .webp({ quality: 80, effort: 5 }).toFile(output);
        }
        mapping[src] = `/images/ui/shop-media/${name}`;
        originalBytes += input.length;
        bundledBytes += statSync(output).size;
    }
    writeFileSync(new URL("../lib/catalog/native-shop-media.generated.json", import.meta.url), `${JSON.stringify(mapping)}\n`);
    console.log(`Native shop media: ${sources.length} images, ${originalBytes} original bytes -> ${bundledBytes} bundled bytes`);
    return mapping;
}
