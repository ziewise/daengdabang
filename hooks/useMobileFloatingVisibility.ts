"use client";

import { type RefObject, useEffect, useState } from "react";

const MOBILE_FLOATING_QUERY = "(max-width: 680px)";
const MOBILE_HERO_QUERY = "(max-width: 767px)";
export const MOBILE_FLOATING_SCROLL_IDLE_MS = 180;

function isVisibleDialog(dialog: HTMLElement) {
    if (dialog.closest("[hidden], [aria-hidden='true']")) return false;
    let current: HTMLElement | null = dialog;
    while (current) {
        const style = window.getComputedStyle(current);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity || "1") <= 0) {
            return false;
        }
        current = current.parentElement;
    }

    const rect = dialog.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    return rect.width > 0
        && rect.height > 0
        && rect.right > 0
        && rect.bottom > 0
        && rect.left < viewportWidth
        && rect.top < viewportHeight;
}

type Options = {
    ignoreDialogsWithin?: RefObject<HTMLElement | null>;
    heroRouteActive?: boolean;
};

/**
 * Responsive collision state for the independent house, settings and chat
 * launchers. Mobile yields to any visible dialog; desktop yields only to an
 * aria-modal or explicit floating blocker. Nothing is unmounted, so state is
 * preserved while the launchers are temporarily out of the way.
 */
export function useMobileFloatingVisibility({ ignoreDialogsWithin, heroRouteActive = false }: Options = {}) {
    const [isMobile, setIsMobile] = useState(false);
    const [isMobileHeroViewport, setIsMobileHeroViewport] = useState(false);
    const [isScrolling, setIsScrolling] = useState(false);
    const [hasBlockingDialog, setHasBlockingDialog] = useState(false);
    const [isDaengLabResultVisible, setIsDaengLabResultVisible] = useState(false);
    const [isAtPageTop, setIsAtPageTop] = useState(true);
    const [heroVisibility, setHeroVisibility] = useState(() => ({
        routeActive: heroRouteActive,
        visible: heroRouteActive,
    }));

    useEffect(() => {
        const query = window.matchMedia(MOBILE_FLOATING_QUERY);
        const update = () => setIsMobile(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        const query = window.matchMedia(MOBILE_HERO_QUERY);
        const update = () => setIsMobileHeroViewport(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        const update = () => setIsAtPageTop(window.scrollY <= 0);
        update();
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, []);

    useEffect(() => {
        if (!heroRouteActive) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the route-scoped boundary before a later return to the hero.
            setHeroVisibility((current) => current.routeActive || current.visible
                ? { routeActive: false, visible: false }
                : current);
            return;
        }

        const update = () => {
            const sentinel = document.getElementById("fab-reveal-sentinel");
            const visible = Boolean(sentinel && sentinel.getBoundingClientRect().top > 0);
            setHeroVisibility((current) => current.routeActive && current.visible === visible
                ? current
                : { routeActive: true, visible });
        };

        update();
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, [heroRouteActive]);

    useEffect(() => {
        if (!isMobile) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale mobile-only interaction state after a viewport change.
            setIsScrolling(false);
            return;
        }

        let idleTimer = 0;
        let scrollAnchorY = window.scrollY;
        let scrollingActive = false;
        const onScroll = () => {
            const nextScrollY = window.scrollY;
            if (!scrollingActive && Math.abs(nextScrollY - scrollAnchorY) < 2) return;
            if (!scrollingActive) {
                scrollingActive = true;
                setIsScrolling(true);
            }
            scrollAnchorY = nextScrollY;
            window.clearTimeout(idleTimer);
            idleTimer = window.setTimeout(() => {
                scrollingActive = false;
                scrollAnchorY = window.scrollY;
                setIsScrolling(false);
            }, MOBILE_FLOATING_SCROLL_IDLE_MS);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.clearTimeout(idleTimer);
            window.removeEventListener("scroll", onScroll);
        };
    }, [isMobile]);

    useEffect(() => {
        let frame = 0;
        let settleTimer = 0;
        const update = () => {
            frame = 0;
            const ignoredRoot = ignoreDialogsWithin?.current;
            const next = Array.from(document.querySelectorAll<HTMLElement>("[role='dialog']"))
                .some((dialog) => {
                    if (ignoredRoot?.contains(dialog)) return false;
                    const blocksDesktop = dialog.getAttribute("aria-modal") === "true"
                        || dialog.dataset.floatingBlocker === "true";
                    return (isMobile || blocksDesktop) && isVisibleDialog(dialog);
                });
            setHasBlockingDialog(next);
        };
        const scheduleUpdate = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(update);
        };
        const scheduleTransitionAwareUpdate = () => {
            scheduleUpdate();
            window.clearTimeout(settleTimer);
            settleTimer = window.setTimeout(scheduleUpdate, 460);
        };

        scheduleUpdate();
        const observer = new MutationObserver(scheduleTransitionAwareUpdate);
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["aria-hidden", "aria-modal", "class", "data-floating-blocker", "hidden", "open", "style"],
            childList: true,
            subtree: true,
        });
        window.addEventListener("resize", scheduleUpdate);

        return () => {
            if (frame) window.cancelAnimationFrame(frame);
            window.clearTimeout(settleTimer);
            observer.disconnect();
            window.removeEventListener("resize", scheduleUpdate);
        };
    }, [ignoreDialogsWithin, isMobile]);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
            const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
            const visible = Array.from(
                document.querySelectorAll<HTMLElement>("[data-daenglab-inference-confidence]"),
            ).some((result) => {
                const rect = result.getBoundingClientRect();
                return rect.width > 0
                    && rect.height > 0
                    && rect.right > 0
                    && rect.bottom > 0
                    && rect.left < viewportWidth
                    && rect.top < viewportHeight;
            });
            setIsDaengLabResultVisible(visible);
        };
        const scheduleUpdate = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(update);
        };
        scheduleUpdate();
        const observer = new MutationObserver(scheduleUpdate);
        observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", scheduleUpdate);
        return () => {
            if (frame) window.cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener("scroll", scheduleUpdate);
            window.removeEventListener("resize", scheduleUpdate);
        };
    }, []);

    const isHeroVisible = heroRouteActive && (
        heroVisibility.routeActive === heroRouteActive ? heroVisibility.visible : true
    );

    return {
        hasBlockingDialog,
        // The analysis graph needs its full plotting area on both portrait and
        // landscape phones. A landscape handset can exceed the old 680px
        // "mobile" breakpoint, so yield to a visible result at every width.
        hidden: hasBlockingDialog || isDaengLabResultVisible || (isMobile && isScrolling),
        isDaengLabResultVisible,
        isHeroVisible,
        isAtPageTop,
        isMobile,
        isMobileHeroViewport,
        isScrolling,
    };
}
