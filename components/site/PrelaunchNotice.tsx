/**
 * PrelaunchNotice — 정식 오픈 준비 안내 창(첫 방문 팝업 + 상품 "오픈 준비 중" 단추로 여는 같은 창)
 * ---------------------------------------------------------------------
 * 동작(열기 · 닫기 · 오늘은 그만 보기)과 문구는 그대로.
 * 2026-10-26 웹 겉모양: data-prelaunch-web 이름표 + PrelaunchNotice.module.css "웹 크레파스" 구역
 * (흰 쿠션 창 · 주아 제목 세 색 밑줄 · 분홍 알약 주 단추 · 흰 알약 보조 · 점선 · 기울기 없음). 앱은 예전 모양 그대로.
 */
"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { PRELAUNCH_NOTICE_EVENT } from "@/lib/prelaunch";
import styles from "./PrelaunchNotice.module.css";

const SEEN_KEY = "ddb.prelaunch.seen.v1";
const HIDE_UNTIL_KEY = "ddb.prelaunch.hide-until.v1";

export default function PrelaunchNotice() {
    const { locale } = useI18n();
    const english = locale === "en";
    const pathname = usePathname();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const todayRef = useRef<HTMLInputElement>(null);
    const unlockRef = useRef<(() => void) | null>(null);

    function close() {
        try {
            sessionStorage.setItem(SEEN_KEY, "1");
            if (todayRef.current?.checked) {
                const tomorrow = new Date();
                tomorrow.setHours(24, 0, 0, 0);
                localStorage.setItem(HIDE_UNTIL_KEY, String(tomorrow.getTime()));
            }
        } catch { /* Closing still works when storage is unavailable. */ }
        dialogRef.current?.close();
        unlockRef.current?.();
        unlockRef.current = null;
    }

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog || pathname.startsWith("/checkout") || pathname.startsWith("/auth")) return;
        let dismissed = false;
        const show = () => {
            if (dialog.open || !dialog.isConnected) return;
            const previousOverflow = document.body.style.overflow;
            dialog.showModal();
            document.body.style.overflow = "hidden";
            unlockRef.current = () => { document.body.style.overflow = previousOverflow; };
        };
        const onClose = () => { dismissed = true; };
        const maybeShow = () => {
            if (dismissed || document.body.classList.contains("ddb-intro-active")) return;
            try {
                if (sessionStorage.getItem(SEEN_KEY) || Number(localStorage.getItem(HIDE_UNTIL_KEY)) > Date.now()) return;
            } catch { /* The notice remains usable without browser storage. */ }
            show();
        };
        // The home intro establishes its body class after hydration. Wait for
        // that effect, then show this notice only after the intro has finished.
        const timer = window.setTimeout(maybeShow, 450);
        const observer = new MutationObserver(maybeShow);
        observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        window.addEventListener(PRELAUNCH_NOTICE_EVENT, show);
        dialog.addEventListener("close", onClose);
        return () => {
            window.clearTimeout(timer);
            observer.disconnect();
            window.removeEventListener(PRELAUNCH_NOTICE_EVENT, show);
            dialog.removeEventListener("close", onClose);
            dialog.close();
            unlockRef.current?.();
            unlockRef.current = null;
        };
    }, [pathname]);

    return (
        // data-prelaunch-web — 웹 크레파스 겉모양 이름표(PrelaunchNotice.module.css 아래 "웹 크레파스" 구역, html:not(.ddb-app-mode) 에서만). 앱 그대로
        <dialog ref={dialogRef} className={styles.dialog} data-prelaunch-web aria-labelledby="prelaunch-title" aria-describedby="prelaunch-description"
            onCancel={(event) => { event.preventDefault(); close(); }}
            onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
            <div className={styles.card}>
                <header className={styles.header}>
                    <Image src="/images/wordmark.png" alt="댕다방" width={100} height={40} className={styles.wordmark} />
                    <button type="button" className={styles.close} onClick={close} aria-label={english ? "Close opening notice" : "오픈 안내 닫기"}>
                        <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                    </button>
                </header>

                <div className={styles.illustration} aria-hidden="true">
                    <span className={styles.handwritten}>{english ? "See you soon!" : "반가워요, 곧 만나요!"}</span>
                    <svg className={styles.sparkle} width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 2v28M2 16h28M6 6l20 20M26 6 6 26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                    <div className={styles.shopWindow}>
                        <div className={styles.awning} />
                        <Image src="/images/logo-black-poodle-v2.png" alt="" width={200} height={200} className={styles.poodle} />
                        <span className={styles.windowSill} />
                    </div>
                    <span className={styles.littleHeart}>♡</span>
                    <span className={styles.sign}>OPENING SOON</span>
                </div>

                <div className={styles.content}>
                    <p className={styles.eyebrow}><span />{english ? "GETTING READY TO OPEN" : "정식 오픈 준비 중"}</p>
                    <h2 id="prelaunch-title" className={styles.title}>
                        {english ? <>A little more care.<br /><em>Then, a big hello.</em></> : <>설레는 첫 만남을 위해,<br /><em>조금만 더 준비할게요.</em></>}
                    </h2>
                    <p id="prelaunch-description" className={styles.description}>
                        {english ? <>We’re getting DaengDaBang ready for you.<br />Enjoy a first look at our collection.<br />Orders will open with our official launch.</> : <>댕댕이의 일상을 채울 댕다방을 준비하고 있어요.<br />마음에 드는 상품을 먼저 둘러보세요.<br /><strong>주문은 정식 오픈 후에 만나요.</strong></>}
                    </p>
                    <button type="button" className={styles.explore} onClick={close}>
                        {english ? "Take a first look" : "댕다방 먼저 둘러보기"}
                        <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 10h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <label className={styles.today}>
                        <input ref={todayRef} type="checkbox" />
                        <span>{english ? "Don’t show again today" : "오늘은 그만 보기"}</span>
                    </label>
                </div>
                <div className={styles.signature} aria-hidden="true">LITTLE PAWS, LOVELY DAYS.</div>
            </div>
        </dialog>
    );
}
