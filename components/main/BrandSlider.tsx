/**
 * BrandSlider — 대표 브랜드 자동 슬라이더 (Ruffwear / Rex Specs)
 * ---------------------------------------------------------------------
 * 4슬라이드 (각 브랜드 2장씩) — 4.5초마다 자동 전환.
 * 텍스트(브랜드명·태그라인·CTA) 와 페이지네이션은 슬라이드 인덱스에 동기화.
 * 사용자가 dot 클릭 시 자동 전환 일시 정지 → 5초 후 재개.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./brand-slider.module.css";

interface BrandSlide {
    brandId: "ruffwear" | "rexspecs";
    brandName: string;
    desc: string;
    cta: string;
    href: string;
    style: "ruff1" | "ruff2" | "rex1" | "rex2";
}

const SLIDES: BrandSlide[] = [
    {
        brandId: "ruffwear", brandName: "Ruffwear",
        desc: "활동견을 위한 프리미엄 아웃도어 기어",
        cta: "브랜드 둘러보기", href: "#brand-ruffwear",
        style: "ruff1",
    },
    {
        brandId: "ruffwear", brandName: "Ruffwear",
        desc: "Front Range · Roamer · Cloud Chaser — 베스트셀러 라인",
        cta: "브랜드 둘러보기", href: "#brand-ruffwear",
        style: "ruff2",
    },
    {
        brandId: "rexspecs", brandName: "Rex Specs",
        desc: "강아지 눈 보호 전문 아이웨어 솔루션",
        cta: "고글 라인업", href: "#brand-rexspecs",
        style: "rex1",
    },
    {
        brandId: "rexspecs", brandName: "Rex Specs",
        desc: "V2 · Air · Sun Visor — 활동량과 날씨에 맞춰",
        cta: "고글 라인업", href: "#brand-rexspecs",
        style: "rex2",
    },
];

const AUTO_INTERVAL = 4500;
const RESUME_DELAY = 5000;

export default function BrandSlider() {
    const [idx, setIdx] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const advance = useCallback(() => {
        setIdx((i) => (i + 1) % SLIDES.length);
    }, []);

    const startAuto = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(advance, AUTO_INTERVAL);
    }, [advance]);

    const stopAuto = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
    }, []);

    useEffect(() => {
        startAuto();
        return () => {
            stopAuto();
            if (resumeRef.current) clearTimeout(resumeRef.current);
        };
    }, [startAuto, stopAuto]);

    /** dot 클릭 — 일시 정지 + 5초 후 재개 */
    const goTo = (i: number) => {
        setIdx(i);
        stopAuto();
        if (resumeRef.current) clearTimeout(resumeRef.current);
        resumeRef.current = setTimeout(startAuto, RESUME_DELAY);
    };

    const current = SLIDES[idx];

    return (
        <section id="brand" className="py-12 md:py-20">
            <div className="max-w-[1400px] mx-auto px-6">
                <div className="mb-6 md:mb-8">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5">
                        대표 브랜드
                    </h2>
                    <p className="text-sm text-neutral-500">
                        댕다방이 자신있게 큐레이션하는 정식 수입 브랜드
                    </p>
                </div>

                <div className={styles.wrap}>
                    {/* 슬라이드 4장 — fade-cross */}
                    {SLIDES.map((s, i) => (
                        <div
                            key={i}
                            className={`${styles.slide} ${styles[s.style]} ${i === idx ? styles.active : ""}`}
                            aria-hidden={i !== idx}
                        />
                    ))}

                    {/* 다크 오버레이 (텍스트 가독성) */}
                    <div className={styles.overlay} />

                    {/* 좌하단(PC) / 하단(mobile) 정보 */}
                    <div
                        key={idx}
                        className="absolute z-10 left-6 md:left-12 right-6 md:right-12 bottom-20 md:bottom-12 text-white animate-in fade-in slide-in-from-bottom-2 duration-500"
                    >
                        <p className="text-[10px] md:text-xs font-extrabold tracking-[0.3em] text-white/80 mb-2">
                            FEATURED BRAND
                        </p>
                        <h3 className="text-3xl md:text-5xl font-black tracking-tight mb-2 md:mb-3 drop-shadow-md">
                            {current.brandName}
                        </h3>
                        <p className="text-sm md:text-base text-white/90 mb-4 max-w-md drop-shadow">
                            {current.desc}
                        </p>
                        <Link
                            href={current.href}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/95 text-foreground text-xs md:text-sm font-extrabold hover:bg-white transition"
                        >
                            {current.cta}
                            <i className="fa-solid fa-arrow-right" />
                        </Link>
                    </div>

                    {/* 페이지네이션 — 우하단(PC) / 우상단(mobile) */}
                    <div className="absolute z-10 right-6 md:right-12 bottom-6 md:bottom-12 flex gap-4 md:gap-6">
                        <PagGroup
                            label="RUFFWEAR"
                            active={current.brandId === "ruffwear"}
                            dots={[0, 1]}
                            currentIdx={idx}
                            onClick={goTo}
                        />
                        <PagGroup
                            label="REX SPECS"
                            active={current.brandId === "rexspecs"}
                            dots={[2, 3]}
                            currentIdx={idx}
                            onClick={goTo}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

function PagGroup({
    label, active, dots, currentIdx, onClick,
}: {
    label: string; active: boolean;
    dots: number[]; currentIdx: number;
    onClick: (i: number) => void;
}) {
    return (
        <div className={`flex flex-col items-end gap-1.5 transition-opacity ${active ? "opacity-100" : "opacity-50"}`}>
            <span className="text-[9px] md:text-[10px] font-extrabold tracking-[0.2em] text-white/90">
                {label}
            </span>
            <div className="flex gap-1.5">
                {dots.map((i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => onClick(i)}
                        className={`h-1.5 rounded-full transition-all ${
                            i === currentIdx
                                ? "w-6 bg-white"
                                : "w-1.5 bg-white/50 hover:bg-white/80"
                        }`}
                        aria-label={`${label} ${i % 2 + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
