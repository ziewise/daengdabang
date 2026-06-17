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
import Image from "next/image";
import styles from "./brand-slider.module.css";

interface BrandSlide {
    brandId: "ruffwear" | "rexspecs";
    brandName: string;
    desc: string;
    cta: string;
    href: string;
    image: string;
}

const SLIDES: BrandSlide[] = [
    {
        brandId: "ruffwear", brandName: "Ruffwear",
        desc: "활동견을 위한 프리미엄 아웃도어 기어",
        cta: "브랜드 둘러보기", href: "/brand/ruffwear",
        image: "/images/brands/Ruffwear01.png",
    },
    {
        brandId: "ruffwear", brandName: "Ruffwear",
        desc: "Front Range · Roamer · Cloud Chaser — 베스트셀러 라인",
        cta: "브랜드 둘러보기", href: "/brand/ruffwear",
        image: "/images/brands/Ruffwear02.png",
    },
    {
        brandId: "rexspecs", brandName: "Rex Specs",
        desc: "강아지 눈 보호 전문 아이웨어 솔루션",
        cta: "고글 라인업", href: "/brand/rex-specs",
        image: "/images/brands/Rexspecs01.png",
    },
    {
        brandId: "rexspecs", brandName: "Rex Specs",
        desc: "V2 · Air · Sun Visor — 활동량과 날씨에 맞춰",
        cta: "고글 라인업", href: "/brand/rex-specs",
        image: "/images/brands/Rexspecs02.png",
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
        <section id="brand" className="py-8 md:py-12">
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
                    {/* 슬라이드 4장 — fade-cross. 각 슬라이드 내부에 Next.js Image 로 브랜드 사진 */}
                    {SLIDES.map((s, i) => (
                        <div
                            key={i}
                            className={`${styles.slide} ${i === idx ? styles.active : ""}`}
                            aria-hidden={i !== idx}
                        >
                            <Image
                                src={s.image}
                                alt={`${s.brandName} - ${s.desc}`}
                                fill
                                sizes="(max-width: 768px) 100vw, 1400px"
                                priority={i === 0}
                                className="object-cover"
                            />
                        </div>
                    ))}

                    {/* 다크 오버레이 — 브랜드별로 어두운 쪽 다름
                        Ruffwear(텍스트 우측) → 우측 어둡게 / Rex Specs(텍스트 좌측) → 좌측 어둡게 */}
                    <div className={current.brandId === "ruffwear" ? styles.overlayRight : styles.overlayLeft} />

                    {/* 텍스트 영역 — 브랜드별로 정렬 좌/우 분기
                        Ruffwear: 우측 정렬 / Rex Specs: 좌측 정렬 */}
                    <div
                        key={idx}
                        className={`absolute z-10 left-5 md:left-10 right-5 md:right-10 top-1/2 -translate-y-1/2 text-white flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500 ${
                            current.brandId === "ruffwear"
                                ? "text-right items-end"
                                : "text-left items-start"
                        }`}
                    >
                        <p className="text-[9px] md:text-[11px] font-extrabold tracking-[0.25em] md:tracking-[0.3em] text-white/80 mb-1 md:mb-1.5">
                            FEATURED BRAND
                        </p>
                        <h3 className="text-xl md:text-4xl font-black tracking-tight mb-1 md:mb-2 drop-shadow-md">
                            {current.brandName}
                        </h3>
                        <p className="text-[11px] md:text-[15px] text-white/90 mb-2.5 md:mb-4 max-w-md drop-shadow line-clamp-2 md:line-clamp-none">
                            {current.desc}
                        </p>
                        <Link
                            href={current.href}
                            className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-1.5 md:py-2.5 rounded-full bg-white text-neutral-900 text-[11px] md:text-sm font-extrabold hover:bg-neutral-100 shadow-md transition"
                        >
                            {current.cta}
                            <i className="fa-solid fa-arrow-right text-[10px] md:text-xs" />
                        </Link>
                    </div>

                    {/* 페이지네이션 — 텍스트 반대편 하단
                        Ruffwear(텍스트 우측) → 좌하단 / Rex Specs(텍스트 좌측) → 우하단 */}
                    <div
                        className={`absolute z-10 bottom-5 md:bottom-6 flex gap-4 md:gap-6 ${
                            current.brandId === "ruffwear"
                                ? "left-6 md:left-10"
                                : "right-6 md:right-10"
                        }`}
                    >
                        <PagGroup
                            label="RUFFWEAR"
                            active={current.brandId === "ruffwear"}
                            dots={[0, 1]}
                            currentIdx={idx}
                            onClick={goTo}
                            alignEnd={current.brandId !== "ruffwear"}
                        />
                        <PagGroup
                            label="REX SPECS"
                            active={current.brandId === "rexspecs"}
                            dots={[2, 3]}
                            currentIdx={idx}
                            onClick={goTo}
                            alignEnd={current.brandId !== "ruffwear"}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

function PagGroup({
    label, active, dots, currentIdx, onClick, alignEnd = false,
}: {
    label: string; active: boolean;
    dots: number[]; currentIdx: number;
    onClick: (i: number) => void;
    /** 페이지네이션이 우하단에 있을 때 라벨·도트도 우측 정렬 */
    alignEnd?: boolean;
}) {
    return (
        <div className={`flex flex-col gap-1.5 transition-opacity ${alignEnd ? "items-end" : "items-start"} ${active ? "opacity-100" : "opacity-50"}`}>
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
