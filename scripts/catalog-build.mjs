import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const nativeRequire = createRequire(import.meta.url);

/** Execute the existing publication gates at build time, with no browser bundle. */
export function createCatalogLoader() {
    const cache = new Map();
    // Match next.config.mjs in both GitHub Actions and Cloudflare Pages.
    // Build scripts execute before Next injects its `env` values, so the
    // Cloudflare commit must also be resolved here for immutable detail URLs.
    const buildProcess = Object.create(process);
    buildProcess.env = {
        ...process.env,
        NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA:
            process.env.NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA || "",
    };
    function load(file) {
        file = resolve(file);
        if (cache.has(file)) return cache.get(file).exports;
        const loadedModule = { exports: {} };
        cache.set(file, loadedModule);
        const source = readFileSync(file, "utf8");
        if (file.endsWith(".json")) {
            loadedModule.exports = JSON.parse(source);
            return loadedModule.exports;
        }
        const compiled = ts.transpileModule(source, {
            fileName: file.replace(/\.mjs$/, ".ts"),
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
        }).outputText;
        const requireLocal = (id) => {
            if (!id.startsWith(".") && !id.startsWith("@/")) return nativeRequire(id);
            const base = id.startsWith("@/") ? resolve(root, id.slice(2)) : resolve(dirname(file), id);
            const target = [base, `${base}.ts`, `${base}.mjs`, `${base}.json`, resolve(base, "index.ts")]
                .find(path => existsSync(path) && statSync(path).isFile());
            if (!target) throw new Error(`Unresolved catalog dependency: ${id}`);
            return load(target);
        };
        new Function("require", "module", "exports", "process", compiled)(requireLocal, loadedModule, loadedModule.exports, buildProcess);
        return loadedModule.exports;
    }
    return entry => load(resolve(root, entry));
}

export function loadBuildCatalog() {
    return createCatalogLoader()("lib/catalog/data.ts");
}

export function runtimeCatalogSnapshot() {
    const { ALL_CATALOG, CATALOG } = loadBuildCatalog();
    // Retain every product field and historical route. Only the bulky source
    // receipts and the work of rebuilding/validating the catalog stay on CI.
    return { products: ALL_CATALOG, visibleIds: CATALOG.map(product => product.id) };
}
