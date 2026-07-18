import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("the header opens the latest country and language modal from the globe badge", async () => {
    const [switcher, header, brandLogo, mobilePanel] = await Promise.all([
        source("components/header/LanguageSwitcher.tsx"),
        source("components/header/Header.tsx"),
        source("components/header/BrandLogo.tsx"),
        source("components/header/MobilePanel.tsx"),
    ]);

    assert.match(switcher, /import RegionModal from "\.\/RegionModal"/);
    assert.match(switcher, /src="\/images\/ui\/lang-globe\.png"/);
    assert.match(switcher, /onClick=\{\(\) => setOpen\(true\)\}/);
    assert.match(switcher, /aria-haspopup="dialog"/);
    assert.match(switcher, /aria-expanded=\{open\}/);
    assert.match(switcher, /<RegionModal open=\{open\} onClose=\{\(\) => setOpen\(false\)\} \/>/);

    const petLensIndex = header.indexOf("data-pet-guide-target=\"pet-lens\"");
    const switcherIndex = header.indexOf("<LanguageSwitcher />", petLensIndex);
    const searchIndex = header.indexOf("setSearchOpen(true)", petLensIndex);
    assert.ok(petLensIndex >= 0 && switcherIndex > petLensIndex && searchIndex > switcherIndex);
    assert.match(header, /gap-1 px-2 min-\[360px\]:gap-1\.5 sm:gap-6 sm:px-6/);
    assert.match(header, /gap-1 min-\[360px\]:gap-1\.5 sm:gap-2/);
    assert.match(header, /<BrandLogo mobileEmphasis \/>/);
    assert.match(brandLogo, /mobileEmphasis\?: boolean/);
    assert.match(brandLogo, /min-\[360px\]:h-\[60px\] min-\[360px\]:w-\[60px\]/);
    assert.match(brandLogo, /min-\[360px\]:h-11/);
    assert.match(brandLogo, /shrink-0 flex-nowrap items-center whitespace-nowrap/);
    assert.match(mobilePanel, /<LanguageSwitcher compact \/>/);
});

test("country selection automatically applies display currency and language", async () => {
    const [modal, region, currencyStore, i18n, layout] = await Promise.all([
        source("components/header/RegionModal.tsx"),
        source("lib/region.tsx"),
        source("lib/currency-store.ts"),
        source("lib/i18n.tsx"),
        source("app/layout.tsx"),
    ]);

    assert.match(modal, /if \(!open \|\| typeof document === "undefined"\) return null/);
    assert.match(modal, /return createPortal\(/);
    assert.match(modal, /role="dialog"/);
    assert.match(modal, /aria-modal="true"/);
    assert.match(modal, /document\.body\.style\.overflow = "hidden"/);
    assert.match(modal, /if \(e\.key === "Escape"\) onClose\(\)/);
    assert.match(modal, /value=\{country\}/);
    assert.match(modal, /onChange=\{\(v\) => setCountry\(v as Country\)\}/);
    assert.match(modal, /value=\{locale\}/);
    assert.match(modal, /onChange=\{\(v\) => setLocale\(v as Locale\)\}/);

    assert.match(region, /code: "KR"[^\n]+currency: "KRW"[^\n]+locale: "ko"/);
    assert.match(region, /code: "US"[^\n]+currency: "USD"[^\n]+locale: "en"/);
    assert.match(region, /setCurrency\(meta\.currency\)/);
    assert.match(region, /setLocale\(meta\.locale\)/);
    assert.match(currencyStore, /export type Currency = "KRW" \| "USD"/);
    assert.match(currencyStore, /return cur === "USD" \? krw \/ KRW_PER_USD : krw/);
    assert.match(i18n, /const currency = useCurrency\(\)/);
    assert.match(i18n, /if \(currency === "USD"\)/);
    assert.match(i18n, /convertFromKRW\(value, "USD"\)/);

    const languageProviderIndex = layout.indexOf("<LanguageProvider>");
    const regionProviderIndex = layout.indexOf("<RegionProvider>");
    const storeProviderIndex = layout.indexOf("<StoreProvider>");
    assert.ok(languageProviderIndex >= 0 && regionProviderIndex > languageProviderIndex && storeProviderIndex > regionProviderIndex);
});

test("desktop navigation hover draws a subtle motion-safe crayon sketch", async () => {
    const [header, css] = await Promise.all([
        source("components/header/Header.tsx"),
        source("components/header/Header.module.css"),
    ]);

    assert.match(header, /import headerStyles from "\.\/Header\.module\.css"/);
    assert.equal((header.match(/headerStyles\.desktopNavItem/g) || []).length, 2);
    assert.match(header, /data-nav-open=\{open \? "true" : "false"\}/);
    assert.match(css, /\.desktopNavItem::before/);
    assert.match(css, /\.desktopNavItem::after/);
    assert.match(css, /@keyframes navCrayonDraw/);
    assert.match(css, /@keyframes navCrayonStrokeWiggle/);
    assert.match(css, /@keyframes navCrayonWiggle/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
