import { writeFileSync } from "node:fs";
import { createCatalogLoader, runtimeCatalogSnapshot } from "./catalog-build.mjs";
import { generateNativeShopMedia } from "./native-shop-media.mjs";

const output = JSON.stringify(runtimeCatalogSnapshot());
writeFileSync(new URL("../lib/catalog/runtime-catalog.generated.json", import.meta.url), output + "\n");
console.log(`Validated runtime catalog: ${Buffer.byteLength(output)} bytes`);

// Select the first shelf with the existing publication and ranking rules.
const load = createCatalogLoader();
const { nativeShopSnapshot } = load("lib/catalog/native-shop-snapshot.ts");
const snapshot = nativeShopSnapshot();
const shop = JSON.stringify(snapshot);
writeFileSync(new URL("../lib/catalog/native-shop.generated.json", import.meta.url), shop + "\n");
console.log(`Validated first shop shelf: ${Buffer.byteLength(shop)} bytes`);
const { productCardImage } = load("lib/catalog/card-image.ts");
await generateNativeShopMedia(snapshot.products.map(productCardImage));
