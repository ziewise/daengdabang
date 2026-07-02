/**
 * PromoSection — 기획전 (1 featured + 4 small)
 * ---------------------------------------------------------------------
 * 데이터는 lib/menu-data.ts 의 PROMO_CARDS 하나로 통합 — 헤더 "기획전"
 * 드롭다운과 완전히 동일한 항목을 공유한다(연동). 항목/제목/링크 변경은
 * menu-data 만 고치면 드롭다운·섹션에 동시 반영된다.
 *
 * 각 카드의 배경 미디어(우선순위 video > images > image):
 *   - video: mp4 자동 재생 (loop, muted, playsInline)
 *   - images: 배열 — 3초 간격 cross-fade
 *   - image: 단일 정적 이미지
 *   - (미디어 없음): color 배경 + 아이콘 — 예: 세트 상품
 * 위에 다크 그라데이션 + 텍스트(타이틀·설명·CTA) 오버레이.
 */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PROMO_CARDS, type PromoCard } from "@/lib/menu-data";

// color → 배경 class (Tailwind JIT 가 잡도록 명시 매핑, 헤더 드롭다운과 동일 팔레트)
const COLOR_BG: Record<PromoCard["color"], string> = {
    indigo: "bg-aurora-indigo",
    blue: "bg-aurora-blue",
    purple: "bg-aurora-purple",
    green: "bg-success",
    pink: "bg-aurora-pink",
};

const IMAGE_SWITCH_INTERVAL = 3000; // 교차 이미지 전환 간격 (ms)

export default function PromoSection() {
    return (
        <section id="promo" className="py-8 md:py-12">
            <div className="max-w-[1400px] mx-auto px-6">
                <div className="mb-6 md:mb-8">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5">기획전</h2>
                    <p className="text-sm text-neutral-500">우리 댕댕이에게 딱 맞는 큐레이션</p>
                </div>

                {/* 1 featured + 4 small 그리드 — 헤더 드롭다운과 동일한 PROMO_CARDS 사용 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 auto-rows-[130px] md:auto-rows-[200px] lg:auto-rows-[220px]">
                    {PROMO_CARDS.map((t, i) => (
                        <PromoTileCard key={t.href} tile={t} priority={i === 0} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function PromoTileCard({ tile, priority }: { tile: PromoCard; priority: boolean }) {
    const isFeatured = !!tile.featured;
    // 섹션은 긴 제목(titleFull) 우선, 없으면 공용 title
    const title = tile.titleFull ?? tile.title;
    return (
        <Link
            href={tile.href}
            className={`group relative block rounded-2xl overflow-hidden shadow-card hover:shadow-hover transition-all hover:-translate-y-1 ${
                isFeatured ? "col-span-2 md:col-span-2 md:row-span-2" : ""
            }`}
        >
            {/* 배경 미디어 — video / images[] / image / (없으면) color+아이콘 */}
            <PromoMedia tile={tile} isFeatured={isFeatured} priority={priority} />

            {/* 다크 그라데이션 (텍스트 가독성) */}
            <div
                className={`absolute inset-0 ${
                    isFeatured
                        ? "bg-gradient-to-br from-black/70 via-black/40 to-black/10"
                        : "bg-gradient-to-t from-black/75 via-black/30 to-transparent"
                }`}
            />

            {/* 텍스트 — featured 는 좌상단, 일반은 좌하단 */}
            <div
                className={`absolute z-10 left-3.5 right-3.5 md:left-5 md:right-5 text-white ${
                    isFeatured ? "top-3.5 md:top-8" : "bottom-3 md:bottom-5"
                }`}
            >
                {tile.eyebrow && (
                    <p className="text-[9px] md:text-xs font-extrabold tracking-[0.2em] md:tracking-[0.25em] text-white/85 mb-1 md:mb-3">
                        {tile.eyebrow}
                    </p>
                )}
                <h3
                    className={`font-black tracking-tight whitespace-pre-line drop-shadow-md mb-1 md:mb-2 ${
                        isFeatured
                            ? "text-base md:text-4xl leading-tight md:leading-[1.15]"
                            : "text-sm md:text-xl leading-tight"
                    }`}
                >
                    {title}
                </h3>
                <p
                    className={`text-white/85 drop-shadow leading-snug ${
                        isFeatured
                            ? "text-[10px] md:text-sm max-w-md line-clamp-2 md:line-clamp-none"
                            : "text-[10px] md:text-xs line-clamp-1 md:line-clamp-none"
                    }`}
                >
                    {tile.desc}
                </p>
            </div>

            {/* featured 우하단 CTA */}
            {isFeatured && (
                <span className="absolute z-10 bottom-3 md:bottom-8 left-3.5 md:left-5 inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-full bg-white/95 text-foreground text-[10px] md:text-sm font-extrabold group-hover:bg-white">
                    컬렉션 보기 <i className="fa-solid fa-arrow-right text-[9px] md:text-xs" />
                </span>
            )}

            {/* 작은 카드 우하단 화살표 */}
            {!isFeatured && (
                <span className="absolute z-10 right-3 md:right-4 bottom-3 md:bottom-4 w-7 h-7 md:w-9 md:h-9 rounded-full bg-white/90 text-foreground flex items-center justify-center group-hover:bg-white">
                    <i className="fa-solid fa-arrow-right text-[10px] md:text-xs" />
                </span>
            )}
        </Link>
    );
}

/* ============ 배경 미디어 (video / images[] / image / color+아이콘) ============ */
function PromoMedia({
    tile,
    isFeatured,
    priority,
}: {
    tile: PromoCard;
    isFeatured: boolean;
    priority: boolean;
}) {
    const [imageIdx, setImageIdx] = useState(0);
    const sizes = isFeatured ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw";

    // images 배열 — 3초 간격으로 인덱스 회전
    useEffect(() => {
        const imgs = tile.images;
        if (!imgs || imgs.length < 2) return;
        const id = setInterval(() => setImageIdx((i) => (i + 1) % imgs.length), IMAGE_SWITCH_INTERVAL);
        return () => clearInterval(id);
    }, [tile.images]);

    // 1) 영상
    if (tile.video) {
        return (
            <video
                src={tile.video}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover"
            />
        );
    }

    // 2) 교차 이미지
    if (tile.images && tile.images.length > 0) {
        return (
            <>
                {tile.images.map((src, i) => (
                    <Image
                        key={src}
                        src={src}
                        alt={tile.title}
                        fill
                        sizes={sizes}
                        priority={priority && i === 0}
                        className={`object-cover transition-opacity duration-700 ${i === imageIdx ? "opacity-100" : "opacity-0"}`}
                    />
                ))}
            </>
        );
    }

    // 3) 단일 이미지
    if (tile.image) {
        return (
            <Image
                src={tile.image}
                alt={tile.title}
                fill
                sizes={sizes}
                priority={priority}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
        );
    }

    // 4) 미디어 없음 — color 배경 + 큰 아이콘 (예: 세트 상품). hover 시 살짝 확대
    return (
        <div className={`absolute inset-0 flex items-center justify-center ${COLOR_BG[tile.color]}`}>
            <i
                className={`fa-solid ${tile.icon} text-white/90 transition-transform duration-500 group-hover:scale-110 ${
                    isFeatured ? "text-6xl md:text-7xl" : "text-4xl md:text-5xl"
                }`}
            />
        </div>
    );
}
