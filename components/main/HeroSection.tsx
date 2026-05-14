/**
 * HeroSection — 메인 페이지 히어로 (영상 풀블리드 + 좌상단 텍스트)
 * ---------------------------------------------------------------------
 * - 비디오: hero.mp4 (autoplay muted loop)
 * - 텍스트: 좌상단 (PC), 좌상단 작게 (mobile)
 * - GSAP : 비디오 페이드 인 + 텍스트 stagger 등장
 */
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import styles from "./hero.module.css";
import PreviewToggle from "@/components/preview/PreviewToggle";

export default function HeroSection() {
    const rootRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!rootRef.current) return;
        const ctx = gsap.context(() => {
            gsap.from("[data-hero-video]", {
                opacity: 0, scale: 1.04, duration: 1.2, ease: "power2.out",
            });
            gsap.from("[data-hero-eyebrow]", {
                opacity: 0, y: -8, duration: 0.5, delay: 0.4, ease: "power2.out",
            });
            gsap.from("[data-hero-title]", {
                opacity: 0, y: 16, duration: 0.7, delay: 0.55, ease: "power2.out",
            });
            gsap.from("[data-hero-desc]", {
                opacity: 0, y: 12, duration: 0.6, delay: 0.85, ease: "power2.out",
            });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={rootRef}
            id="hero"
            className="relative w-full h-[100svh] overflow-hidden -mt-[var(--header-height)]"
        >
            {/* 비디오 풀블리드 */}
            <video
                data-hero-video
                src="/videos/hero.mp4"
                autoPlay
                muted
                loop
                playsInline
                className={`absolute inset-0 w-full h-full object-cover ${styles.heroVideo}`}
            />

            {/* 어두운 그라데이션 오버레이 — 텍스트 가독성 */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/10 to-transparent pointer-events-none" />

            {/* 데모용 Preview 토글 — 헤더 아래 좌상단 (고객 데모 후 컴포넌트 삭제만 하면 정리됨) */}
            <div className="absolute top-[calc(var(--header-height)+16px)] left-4 md:left-10 z-20">
                <PreviewToggle />
            </div>

            {/* 좌측 텍스트 — 모바일: 좌상단(헤더 아래 여백), 데스크탑: 좌측 세로 가운데
                pointer-events-none: 텍스트는 클릭 받을 필요 없음 → 히어로 영역 위 어디든 헤더/메뉴 클릭이 통하도록 */}
            <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10 h-full flex items-start md:items-center pt-[calc(var(--header-height)+20px)] md:pt-0 pointer-events-none">
                <div className="max-w-xl text-white">
                    <p
                        data-hero-eyebrow
                        className="text-xs md:text-sm font-extrabold tracking-[0.3em] text-white/90 mb-3 md:mb-5"
                    >
                        DAENGDABANG · COLLECTION
                    </p>
                    <h1
                        data-hero-title
                        className="text-3xl md:text-6xl font-black tracking-tight leading-[1.1] mb-4 md:mb-6 drop-shadow-md"
                    >
                        매일이 더 특별한
                        <br />
                        <span className="text-aurora-pink">댕댕이의 일상</span>
                    </h1>
                    <p
                        data-hero-desc
                        className="text-sm md:text-base text-white/90 leading-relaxed drop-shadow max-w-md"
                    >
                        사료부터 산책 용품, 의류·케어까지<br className="hidden md:inline" />
                        진짜 필요한 것만 골라 담았습니다.
                    </p>
                </div>
            </div>
        </section>
    );
}
