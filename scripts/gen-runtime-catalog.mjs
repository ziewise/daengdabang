import { writeFileSync } from "node:fs";
import { runtimeCatalogSnapshot } from "./catalog-build.mjs";

const output = JSON.stringify(runtimeCatalogSnapshot());
writeFileSync(new URL("../lib/catalog/runtime-catalog.generated.json", import.meta.url), output + "\n");
console.log(`Validated runtime catalog: ${Buffer.byteLength(output)} bytes`);
