export function isTextEntry(element: Element | null): boolean {
    if (element instanceof HTMLTextAreaElement) return true;
    if (element instanceof HTMLElement && element.isContentEditable) return true;
    return element instanceof HTMLInputElement && ["text", "search", "email", "tel", "url", "password", "number"].includes(element.type);
}

/** Focus can survive Android's keyboard Back button; viewport size is authoritative. */
export function trackKeyboardVisibility() {
    const html = document.documentElement;
    const viewport = window.visualViewport;
    let fullHeight = window.innerHeight;
    let frame = 0;
    const sync = () => {
        frame = 0;
        const height = Math.min(window.innerHeight, viewport?.height ?? window.innerHeight);
        if (!isTextEntry(document.activeElement)) fullHeight = Math.max(fullHeight, window.innerHeight);
        // Pinch zoom is not a keyboard. Do not change the user's zoom level.
        const keyboard = isTextEntry(document.activeElement) && (viewport?.scale ?? 1) <= 1.05 && fullHeight - height > 120;
        html.classList.toggle("ddb-app-typing", keyboard);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(sync); };
    const rotate = () => { fullHeight = window.innerHeight; schedule(); };
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", rotate);
    window.addEventListener("ddb-keyboard-refresh", schedule);
    viewport?.addEventListener("resize", schedule);
    sync();
    return () => {
        window.cancelAnimationFrame(frame);
        document.removeEventListener("focusin", schedule);
        document.removeEventListener("focusout", schedule);
        window.removeEventListener("resize", schedule);
        window.removeEventListener("orientationchange", rotate);
        window.removeEventListener("ddb-keyboard-refresh", schedule);
        viewport?.removeEventListener("resize", schedule);
        html.classList.remove("ddb-app-typing");
    };
}
