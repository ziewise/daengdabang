import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("the header keeps the original direct KR and EN switcher", async () => {
    const [switcher, i18n, header] = await Promise.all([
        source("components/header/LanguageSwitcher.tsx"),
        source("lib/i18n.tsx"),
        source("components/header/Header.tsx"),
    ]);

    assert.match(switcher, /short: "KR"/);
    assert.match(switcher, /short: "EN"/);
    assert.match(switcher, /onClick=\{\(\) => setLocale\(option\.locale\)\}/);
    assert.doesNotMatch(switcher, /RegionModal|regionByCode|aria-haspopup="dialog"/);
    assert.doesNotMatch(i18n, /daengdabang\.region|USD_PER_KRW|RegionCode|CurrencyCode/);
    assert.match(i18n, /formatPrice: \(value\) => locale === "en"/);

    const petLensIndex = header.indexOf("data-pet-guide-target=\"pet-lens\"");
    const switcherIndex = header.indexOf("<LanguageSwitcher />", petLensIndex);
    const searchIndex = header.indexOf("setSearchOpen(true)", petLensIndex);
    assert.ok(petLensIndex >= 0 && switcherIndex > petLensIndex && searchIndex > switcherIndex);
});

test("the removed country and currency modal is not part of the header bundle", async () => {
    await assert.rejects(
        access(new URL("components/header/RegionModal.tsx", root)),
        (error) => error?.code === "ENOENT",
    );
});
