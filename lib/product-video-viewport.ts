export type VideoAction = "play" | "pause" | "reset";

type Entry = {
    element: HTMLElement;
    update: (action: VideoAction) => void;
    action: VideoAction;
    preview: boolean;
};

/** One observer and scroll listener for every product grid on the page. */
export function createProductVideoViewport(win: Window, doc: Document) {
    const entries = new Map<HTMLElement, Entry>();
    const mobile = win.matchMedia("(hover: none) and (pointer: coarse)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let scrolling = false;
    let touching = false;
    let mounted = false;

    const send = (entry: Entry, action: VideoAction) => {
        if (entry.action === action) return;
        entry.action = action;
        entry.update(action);
    };
    const visible = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const header = doc.querySelector("[data-site-header]")?.getBoundingClientRect();
        const top = Math.max(0, header?.bottom ?? 0);
        const height = Math.max(0, Math.min(rect.bottom, win.innerHeight) - Math.max(rect.top, top));
        const width = Math.max(0, Math.min(rect.right, win.innerWidth) - Math.max(rect.left, 0));
        return rect.width > 0 && rect.height > 0 && width * height >= rect.width * rect.height * 0.5;
    };
    const update = () => {
        for (const entry of entries.values()) {
            if (!mobile.matches || doc.hidden || !visible(entry.element)) {
                // Leave desktop hover playback to the card.
                if (mobile.matches || entry.action !== "reset") send(entry, "reset");
            } else if (entry.preview) {
                send(entry, "reset");
            } else if (scrolling) {
                if (entry.action === "play") send(entry, "pause");
            } else {
                send(entry, "play");
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
        if (!mobile.matches) return;
        scrolling = true;
        for (const entry of entries.values()) entry.preview = false;
        update();
        settle();
    };
    const onPointerDown = (event: PointerEvent) => {
        if (event.pointerType === "touch") touching = true;
    };
    const onPointerUp = () => {
        touching = false;
        if (scrolling) settle();
    };
    const onVisibility = () => {
        touching = false;
        scrolling = false;
        clearTimeout(timer);
        update();
    };
    const observer = new IntersectionObserver(update, { threshold: [0, 0.5, 1] });
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
