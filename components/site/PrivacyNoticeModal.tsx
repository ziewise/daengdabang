/**
 * PrivacyNoticeModal — 웹 "개인정보 처리 안내" 창(2026-10-24 사용자 결정)
 * ---------------------------------------------------------------------
 * 양식 작성 · 분석 · 마이페이지 등 다른 일을 하던 화면에서 개인정보처리방침 링크를 누르면
 * 페이지를 떠나지 않고 이 창에서 방침을 보여 준다(닫으면 하던 자리 그대로).
 *  - 내용은 /privacy/ 페이지를 그대로 불러와 본문만 보여 줌(방침 문구는 한 곳에서만 관리 — 페이지가 바뀌면 창도 같이 바뀜)
 *  - 링크에 #항목이 있으면 그 항목부터, 창 안 목차를 누르면 창 안에서 이동
 *  - "전체 페이지에서 보기"는 새 탭으로 /privacy/
 * 이 창을 쓰지 않고 원래대로 페이지로 가는 경우: 앱 화면 · 푸터 링크 · 방침 페이지 자신 ·
 * Ctrl/⌘/Shift/가운데 클릭(새 탭) · data-privacy-page 를 붙인 링크.
 * 꾸밈은 app/globals.css "개인정보 처리 안내 창" 묶음(웹 크레파스 K5 결).
 */
"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

// 불러온 방침 본문(한 번 불러오면 다시 받지 않음)
let cachedBody: string | null = null;

async function loadPrivacyBody(): Promise<string> {
    if (cachedBody) return cachedBody;
    const response = await fetch("/privacy/", { credentials: "same-origin" });
    if (!response.ok) throw new Error("개인정보처리방침을 불러오지 못했습니다.");
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const main = doc.querySelector("main");
    if (!main) throw new Error("개인정보처리방침을 불러오지 못했습니다.");
    // 창 머리에 제목이 있으니 페이지 꼬리표 · 큰 제목은 빼고, 스크립트는 혹시라도 남기지 않음
    main.querySelectorAll("script, style, noscript").forEach((node) => node.remove());
    const heading = main.querySelector("h1");
    const kicker = heading?.previousElementSibling;
    if (kicker?.tagName === "P" && (kicker.textContent ?? "").trim().length < 20) kicker.remove();
    heading?.remove();
    cachedBody = main.innerHTML;
    return cachedBody;
}

// 이 링크를 창으로 열어도 되는가
function privacyLinkToOpen(event: MouseEvent): { anchor: HTMLAnchorElement; hash: string } | null {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
    if (document.documentElement.classList.contains("ddb-app-mode")) return null;
    const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("data-privacy-page")) return null;
    if (anchor.closest("footer, [data-privacy-modal]")) return null;
    let url: URL;
    try {
        url = new URL(anchor.href, window.location.href);
    } catch {
        return null;
    }
    if (url.origin !== window.location.origin || url.pathname.replace(/\/+$/, "") !== "/privacy") return null;
    if (window.location.pathname.replace(/\/+$/, "") === "/privacy") return null;
    return { anchor, hash: url.hash };
}

export default function PrivacyNoticeModal() {
    const [open, setOpen] = useState(false);
    const [hash, setHash] = useState("");
    const [body, setBody] = useState<string | null>(cachedBody);
    const [error, setError] = useState("");
    const bodyRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);

    const close = useCallback(() => {
        setOpen(false);
        returnFocusRef.current?.focus?.();
    }, []);

    // 본문 속 개인정보처리방침 링크 → 창 열기(문서 캡처 단계에서 가로채 페이지 이동을 막음)
    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            const target = privacyLinkToOpen(event);
            if (!target) return;
            event.preventDefault();
            returnFocusRef.current = target.anchor;
            setHash(target.hash);
            setError("");
            setOpen(true);
            loadPrivacyBody()
                .then((html) => setBody(html))
                .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "개인정보처리방침을 불러오지 못했습니다."));
        };
        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, []);

    // 열려 있는 동안: 뒤 화면 스크롤 잠금 · Esc 로 닫기 · 닫기 단추에 초점
    useEffect(() => {
        if (!open) return;
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = "hidden";
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
        window.addEventListener("keydown", onKey);
        closeRef.current?.focus();
        return () => {
            root.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, close]);

    // 본문이 들어오면 #항목으로 이동(없으면 맨 위)
    useEffect(() => {
        if (!open || !body || !bodyRef.current) return;
        const box = bodyRef.current;
        const section = hash ? box.querySelector<HTMLElement>(`[id="${CSS.escape(hash.slice(1))}"]`) : null;
        box.scrollTop = section ? section.offsetTop - 12 : 0;
    }, [open, body, hash]);

    // 창 안 목차(#항목) 누르면 창 안에서 이동
    const onBodyClick = (event: ReactMouseEvent<HTMLDivElement>) => {
        const anchor = (event.target as Element).closest?.("a[href^='#']") as HTMLAnchorElement | null;
        if (!anchor || !bodyRef.current) return;
        const section = bodyRef.current.querySelector<HTMLElement>(`[id="${CSS.escape(anchor.getAttribute("href")!.slice(1))}"]`);
        if (!section) return;
        event.preventDefault();
        bodyRef.current.scrollTo({ top: section.offsetTop - 12, behavior: "smooth" });
    };

    if (!open) return null;

    return (
        <div className="ddb-privacy-modal" data-privacy-modal role="dialog" aria-modal="true" aria-labelledby="ddb-privacy-modal-title">
            <div className="ddb-pm-backdrop" onClick={close} aria-hidden="true" />
            <section className="ddb-pm-card">
                <header className="ddb-pm-head">
                    <p className="ddb-pm-kicker">PRIVACY</p>
                    <h2 id="ddb-privacy-modal-title">개인정보 처리 안내</h2>
                    <p className="ddb-pm-sub">댕다방 개인정보처리방침 전문이에요. 닫으면 보던 화면으로 돌아가요.</p>
                    <button ref={closeRef} type="button" className="ddb-pm-close" onClick={close} aria-label="개인정보 처리 안내 닫기">×</button>
                </header>
                <div className="ddb-pm-body" ref={bodyRef} onClick={onBodyClick}>
                    {error ? (
                        <p className="ddb-pm-state">{error} 아래 ‘전체 페이지에서 보기’로 확인해 주세요.</p>
                    ) : body ? (
                        <div className="ddb-pm-doc" dangerouslySetInnerHTML={{ __html: body }} />
                    ) : (
                        <p className="ddb-pm-state" aria-live="polite">개인정보처리방침을 불러오는 중이에요.</p>
                    )}
                </div>
                <footer className="ddb-pm-foot">
                    <a href={`/privacy/${hash}`} target="_blank" rel="noopener noreferrer" className="ddb-pm-page" data-privacy-page>전체 페이지에서 보기 ↗</a>
                    <button type="button" className="ddb-pm-ok" onClick={close}>확인했어요</button>
                </footer>
            </section>
        </div>
    );
}
