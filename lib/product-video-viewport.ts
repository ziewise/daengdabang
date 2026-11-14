export type VideoAction = "play" | "pause" | "reset";

const TOUCH_MEDIA = "(hover: none), (pointer: coarse)";
export function isProductVideoTouch(win: Window) {
    return win.matchMedia(TOUCH_MEDIA).matches
        || ((win.navigator?.maxTouchPoints ?? 0) > 0 && win.innerWidth <= 1024);
}

type Entry = {
    element: HTMLElement;
    update: (action: VideoAction) => void;
    action: VideoAction;
    preview: boolean;
};

/** One observer and scroll listener for every product grid on the page. */
export function createProductVideoViewport(win: Window, doc: Document) {
    const entries = new Map<HTMLElement, Entry>();
    const mobile = win.matchMedia(TOUCH_MEDIA);
    const native = doc.documentElement?.dataset.ddbNativeApp === "true";
    let timer: ReturnType<typeof setTimeout> | undefined;
    let scrolling = false;
    let touching = false;
    let mounted = false;

    const send = (entry: Entry, action: VideoAction, retry = false) => {
        if (entry.action === action && !retry) return;
        entry.action = action;
        entry.update(action);
    };
    const visible = (element: HTMLElement, top: number, bottom: number) => {
        const rect = element.getBoundingClientRect();
        const height = Math.max(0, Math.min(rect.bottom, bottom) - Math.max(rect.top, top));
        const width = Math.max(0, Math.min(rect.right, win.innerWidth) - Math.max(rect.left, 0));
        return rect.width > 0 && rect.height > 0 && width * height >= rect.width * rect.height * 0.5;
    };
    const update = (retry = false) => {
        const touch = isProductVideoTouch(win);
        // Read the fixed chrome once, not once per product on every scroll.
        const header = doc.querySelector(native ? ".app-bar" : "[data-site-header]")?.getBoundingClientRect();
        const top = Math.max(0, header?.bottom ?? 0);
        const tabbar = native ? doc.querySelector(".app-tabbar")?.getBoundingClientRect() : undefined;
        const bottom = Math.min(win.innerHeight, tabbar?.top ?? win.innerHeight);
        const shown = new Set([...entries.values()].filter(entry => touch && !doc.hidden && visible(entry.element, top, bottom)));
        // Android was decoding four 1080px videos at once while loading photos.
        // Keep one preview playing and leave the other products as photographs.
        const selected = native ? [...shown].find(entry => !entry.preview && entry.action === "play")
            ?? [...shown].find(entry => !entry.preview) : undefined;
        for (const entry of entries.values()) {
            if (!shown.has(entry) || (native && entry !== selected)) {
                // Leave desktop hover playback to the card.
                if (touch || entry.action !== "reset") send(entry, "reset");
            } else if (entry.preview) {
                send(entry, "reset");
            } else if (scrolling) {
                if (entry.action === "play") send(entry, "pause");
            } else {
                send(entry, "play", retry);
            }
        }
    };
    const settle = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            if (touching) return;
            scrolling = false;
            update();
        }, 160);
    };
    const onScroll = () => {
        if (!isProductVideoTouch(win)) return;
        scrolling = true;
        for (const entry of entries.values()) entry.preview = false;
        if (native) {
            // Scrolling must not force a layout read for every card per event.
            for (const entry of entries.values()) if (entry.action === "play") send(entry, "pause");
        } else update();
        settle();
    };
    const onPointerDown = (event: PointerEvent) => {
        if (event.pointerType === "touch") touching = true;
    };
    const onPointerUp = () => {
        touching = false;
        if (scrolling) settle();
        else if (isProductVideoTouch(win) && !doc.hidden) {
            // Retry a browser-blocked initial play inside a real touch gesture.
            update(true);
        }
    };
    const onVisibility = () => {
        touching = false;
        scrolling = false;
        clearTimeout(timer);
        update(true);
    };
    const observer = new IntersectionObserver(() => update(), { threshold: [0, 0.5, 1] });
    const mount = () => {
        if (mounted) return;
        mounted = true;
        doc.addEventListener("scroll", onScroll, { capture: true, passive: true });
        doc.addEventListener("pointerdown", onPointerDown, { passive: true });
        doc.addEventListener("pointerup", onPointerUp, { passive: true });
        doc.addEventListener("pointercancel", onPointerUp, { passive: true });
        doc.addEventListener("visibilitychange", onVisibility);
        win.addEventListener("resize", onScroll, { passive: true });
        win.addEventListener("pageshow", onVisibility);
        mobile.addEventListener("change", onVisibility);
    };
    const unmount = () => {
        if (entries.size) return;
        mounted = false;
        touching = false;
        scrolling = false;
        clearTimeout(timer);
        observer.disconnect();
        doc.removeEventListener("scroll", onScroll, true);
        doc.removeEventListener("pointerdown", onPointerDown);
        doc.removeEventListener("pointerup", onPointerUp);
        doc.removeEventListener("pointercancel", onPointerUp);
        doc.removeEventListener("visibilitychange", onVisibility);
        win.removeEventListener("resize", onScroll);
        win.removeEventListener("pageshow", onVisibility);
        mobile.removeEventListener("change", onVisibility);
    };
    return {
        register(element: HTMLElement, callback: Entry["update"]) {
            const entry: Entry = { element, update: callback, action: "reset", preview: false };
            entries.set(element, entry);
            mount();
            observer.observe(element);
            // Initial load, pagination and returning from a product detail also autoplay.
            settle();
            return {
                preview() {
                    entry.preview = true;
                    send(entry, "reset");
                },
                unregister() {
                    send(entry, "reset");
                    observer.unobserve(element);
                    entries.delete(element);
                    unmount();
                },
            };
        },
    };
}

let viewport: ReturnType<typeof createProductVideoViewport> | undefined;
export function productVideoViewport() {
    return viewport ??= createProductVideoViewport(window, document);
}
