import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import postcss from "postcss";
import test from "node:test";

test("home CSS exactly preserves the shared screens' canonical styles", () => {
    execFileSync(process.execPath, ["scripts/gen-home-styles.mjs", "--check"]);
});

test("deferred web decoration cannot style any native app element", () => {
    const css = postcss.parse(readFileSync("app/web-decoration.css", "utf8"));
    let count = 0;
    css.walkRules(rule => {
        let scope = rule;
        while (scope.parent?.type === "rule") scope = scope.parent;
        assert.ok(scope.selectors.every(selector => selector.trim().startsWith("html:not(.ddb-app-mode)")), rule.selector);
        count++;
    });
    assert.ok(count > 100, "Keep web-only styling out of native startup");
});
