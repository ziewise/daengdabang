/**
 * LegalScrollSpy — 약관 · 방침 문서에서 지금 읽는 조항의 목차 줄 표시 · 2026-10-25
 * ---------------------------------------------------------------------
 * main[data-legal-web] 안 목차(nav > a[href^="#"])가 가리키는 본문 구역을 지켜보다가,
 * 화면 위쪽에 들어온 구역의 목차 줄에 data-active 를 붙임(꾸밈은 app/legal-web.css). 그 밖의 동작 없음.
 * 웹에서만 동작(앱 표시가 있으면 아무것도 하지 않음).
 */
"use client";

import { useEffect } from "react";

export default function LegalScrollSpy() {
    useEffect(() => {
        if (document.documentElement.classList.contains("ddb-app-mode")) return;
        const main = document.querySelector("main[data-legal-web]");
        const toc = main?.querySelector<HTMLElement>("nav:not(.lw-docs)");
        if (!main || !toc) return;
        const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
        const targets = links
            .map((link) => ({ link, section: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
            .filter((item): item is { link: HTMLAnchorElement; section: HTMLElement } => Boolean(item.section));
        if (!targets.length) return;

        // 화면 위에서 35% 선을 지나간 마지막 구역을 "지금 읽는 곳"으로
        const update = () => {
            const line = window.innerHeight * 0.35;
            let current = targets[0];
            for (const item of targets) {
                if (item.section.getBoundingClientRect().top <= line) current = item;
            }
            for (const item of targets) {
                if (item === current) item.link.setAttribute("data-active", "true");
                else item.link.removeAttribute("data-active");
            }
        };
        let frame = 0;
        const onScroll = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, []);
    return null;
}
