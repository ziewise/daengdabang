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
 * Mobile-only collision state for the independent house, settings and chat
 * launchers. Nothing is unmounted, so chat history and companion motion state
 * survive while the launchers are temporarily out of the way.
 */
export function useMobileFloatingVisibility({ ignoreDialogsWithin, heroRouteActive = false }: Options = {}) {
    const [isMobile, setIsMobile] = useState(false);
    const [isMobileHeroViewport, setIsMobileHeroViewport] = useState(false);
    const [isScrolling, setIsScrolling] = useState(false);
    const [hasBlockingDialog, setHasBlockingDialog] = useState(false);
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
        if (!isMobile) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- dialog collisions are intentionally mobile-only.
            setHasBlockingDialog(false);
            return;
        }

        let frame = 0;
        let settleTimer = 0;
        const update = () => {
            frame = 0;
            const ignoredRoot = ignoreDialogsWithin?.current;
            const next = Array.from(document.querySelectorAll<HTMLElement>("[role='dialog']"))
                .some((dialog) => !ignoredRoot?.contains(dialog) && isVisibleDialog(dialog));
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
            attributeFilter: ["aria-hidden", "class", "hidden", "open", "style"],
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

    const isHeroVisible = heroRouteActive && (
        heroVisibility.routeActive === heroRouteActive ? heroVisibility.visible : true
    );

    return {
        hasBlockingDialog,
        hidden: isMobile && (isScrolling || hasBlockingDialog),
        isHeroVisible,
        isAtPageTop,
        isMobile,
        isMobileHeroViewport,
        isScrolling,
    };
}
