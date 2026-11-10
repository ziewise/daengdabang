import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const nativeRequire = createRequire(import.meta.url);

/** Execute the existing publication gates at build time, with no browser bundle. */
export function loadBuildCatalog() {
    const cache = new Map();
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
            if (!id.startsWith(".")) return nativeRequire(id);
            const base = resolve(dirname(file), id);
            const target = [base, `${base}.ts`, `${base}.mjs`, `${base}.json`, resolve(base, "index.ts")]
                .find(path => existsSync(path) && statSync(path).isFile());
            if (!target) throw new Error(`Unresolved catalog dependency: ${id}`);
            return load(target);
        };
        new Function("require", "module", "exports", compiled)(requireLocal, loadedModule, loadedModule.exports);
        return loadedModule.exports;
    }
    return load(resolve(root, "lib/catalog/data.ts"));
}

export function runtimeCatalogSnapshot() {
    const { ALL_CATALOG, CATALOG } = loadBuildCatalog();
    // Retain every product field and historical route. Only the bulky source
    // receipts and the work of rebuilding/validating the catalog stay on CI.
    return { products: ALL_CATALOG, visibleIds: CATALOG.map(product => product.id) };
}
