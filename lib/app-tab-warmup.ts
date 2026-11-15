// Only static route code/RSC is warmed. Feed data and private images still
// start on explicit navigation, with their existing freshness/abort rules.
const warmed = new Set<string>();
const tabs = ["/app/sticker/show/", "/app/sticker/shop/"];
const loadTabCode = (href: string) => href === tabs[0]
    ? import("@/components/pwa/home-concepts/pages/StickerShow")
    : import("@/components/pwa/home-concepts/pages/StickerShop");

export function warmAppTabs(prefetch: (href: string) => void, pathname: string) {
    if (typeof window === "undefined" || pathname !== "/app/home-1/") return;
    const connection = (navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (navigator.onLine === false || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || "")) return;

    let stopped = false;
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const remaining = tabs.filter(href => !warmed.has(href));
    if (!remaining.length) return;
    const next = () => {
        if (stopped || document.hidden || !remaining.length) return;
        const href = remaining.shift()!;
        warmed.add(href);
        prefetch(href);
        // Next's segment prefetch fills the RSC cache but leaves client modules
        // cold. Import them without mounting components or running their effects.
        void loadTabCode(href).catch(() => { warmed.delete(href); });
        // Give painting/input another quiet interval before the second route.
        if (remaining.length) timer = setTimeout(schedule, 650);
    };
    const schedule = () => {
        if (stopped || document.hidden) return;
        if ("requestIdleCallback" in window) idle = window.requestIdleCallback(next);
        else next(); // WebKit fallback, already separated from hydration by a timer.
    };
    // Never compete with hydration or a fast first tap. Leaving home cancels
    // pending work; returning can warm whichever route was not started yet.
    timer = setTimeout(schedule, 650);
    return () => {
        stopped = true;
        clearTimeout(timer);
        if (idle !== undefined) window.cancelIdleCallback(idle);
    };
}
