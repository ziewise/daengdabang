const ORIGIN = "https://www.daengdabang.com";
const BUNDLED = ["/images/ui/", "/images/brand/", "/images/breeds/", "/images/pwa/", "/fonts/", "/_next/", "/ai/",
    "/images/products/card/",
    "/images/pet-companion/cute-v4-breeds/posters/",
    "/images/logo-black-poodle-v2.png", "/images/wordmark.png", "/images/og-ai-platform-"];

export function nativeMediaUrl(value: string): string {
    return value.startsWith("/") && !value.startsWith("//") && !BUNDLED.some(prefix => value.startsWith(prefix))
        ? `${ORIGIN}${value}` : value;
}

/** Idempotent: writing an unchanged srcset retriggers the observing microtask. */
export function fixNativeMediaElement(element: Element): void {
    for (const attribute of ["src", "poster", "srcset"]) {
        const before = element.getAttribute(attribute);
        if (!before) continue;
        const after = attribute === "srcset"
            ? before.replace(/(^|,\s*)(\/[^\s,]+)(?=\s|,|$)/g, (_match, separator: string, url: string) => `${separator}${nativeMediaUrl(url)}`)
            : nativeMediaUrl(before);
        if (after !== before) element.setAttribute(attribute, after);
    }
}
