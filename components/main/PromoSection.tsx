/**
 * PromoSection — 기획전 (1 featured + 4 small)
 * ---------------------------------------------------------------------
 * 각 카드의 배경 미디어는 3가지 타입 지원:
 *   - video: mp4 자동 재생 (loop, muted, playsInline)
 *   - images: 배열 — 3초 간격 cross-fade 교차 전환
 *   - image: 단일 정적 이미지
 * 위에 다크 그라데이션 + 텍스트(타이틀·설명·CTA) 오버레이.
 */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface PromoTile {
    href: string;
    eyebrow?: string;
    title: string;
    desc: string;
    /** 단일 정적 이미지 */
    image?: string;
    /** 교차 표시 이미지 (3초 간격 cross-fade) */
    images?: string[];
    /** 자동 재생 영상 — mp4 URL (외부 CDN 포함) */
    video?: string;
    featured?: boolean;
}

const TILES: PromoTile[] = [
    {
        href: "/promo/active",
        eyebrow: "FEATURED COLLECTION",
        title: "활동견을 위한\n최고의 셀렉션",
        desc: "산책·하이킹·달리기까지 — 활동이 많은 댕댕이를 위한 큐레이션",
        video: "https://res.cloudinary.com/dapuu4gsc/video/upload/v1778710428/swim_qc9zon.mp4",
        featured: true,
    },
    {
        href: "/promo/rainy",
        title: "장마·우천 필수템",
        desc: "방수 의류·우천 산책 가이드",
        image: "/images/promo/rain.png",
    },
    {
        href: "/promo/eye",
        title: "눈·청력 보호",
        desc: "Rex Specs 전문 아이웨어",
        image: "/images/promo/eye.png",
    },
    {
        href: "/promo/food",
        title: "프리미엄 푸드",
        desc: "엄선된 사료·간식 큐레이션",
        images: ["/images/promo/food1.png", "/images/promo/food2.png"],
    },
    {
        href: "/promo/seasonal",
        title: "댕스크림 컬렉션",
        desc: "한정 시즌 — 아이스크림·음료",
        video: "https://res.cloudinary.com/dapuu4gsc/video/upload/v1778710437/icecream_yhwaog.mp4",
    },
];

const IMAGE_SWITCH_INTERVAL = 3000;   // 교차 이미지 전환 간격 (ms)

export default function PromoSection() {
    return (
        <section id="promo" className="py-8 md:py-12">
            <div className="max-w-[1400px] mx-auto px-6">
                <div className="mb-6 md:mb-8">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5">
                        기획전
                    </h2>
                    <p className="text-sm text-neutral-500">
                        우리 댕댕이에게 딱 맞는 큐레이션
                    </p>
                </div>

                {/* 1 featured + 4 small 그리드
                    모바일: 2열 — featured 는 2 col 전폭 1행, 작은 카드 4개는 2x2
                    태블릿/데스크탑: 4열, featured 가 2 col·2 row 차지 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 auto-rows-[130px] md:auto-rows-[200px] lg:auto-rows-[220px]">
                    {TILES.map((t, i) => (
                        <PromoTileCard key={t.href} tile={t} priority={i === 0} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function PromoTileCard({ tile, priority }: { tile: PromoTile; priority: boolean }) {
    const isFeatured = !!tile.featured;
    return (
        <Link
            href={tile.href}
            className={`group relative block rounded-2xl overflow-hidden shadow-card hover:shadow-hover transition-all hover:-translate-y-1 ${
                isFeatured
                    /* featured: 모바일 2 col 전폭 1행 (높이 auto-rows[130px] 그대로) → 가로 긴 배너
                       데스크탑: 2x2 정사각 영역 */
                    ? "col-span-2 md:col-span-2 md:row-span-2"
                    : ""
            }`}
        >
            {/* 배경 미디어 — video / images[] / image 중 하나 */}
            <PromoMedia tile={tile} isFeatured={isFeatured} priority={priority} />

            {/* 다크 그라데이션 (텍스트 가독성) */}
            <div
                className={`absolute inset-0 ${
                    isFeatured
                        ? "bg-gradient-to-br from-black/70 via-black/40 to-black/10"
                        : "bg-gradient-to-t from-black/75 via-black/30 to-transparent"
                }`}
            />

            {/* 텍스트 — featured 는 좌상단, 일반은 좌하단
                모바일에선 카드가 작아져 패딩·폰트 컴팩트하게 */}
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
                    {tile.title}
                </h3>
                <p
                    className={`text-white/85 drop-shadow leading-snug ${
                        isFeatured ? "text-[10px] md:text-sm max-w-md line-clamp-2 md:line-clamp-none" : "text-[10px] md:text-xs line-clamp-1 md:line-clamp-none"
                    }`}
                >
                    {tile.desc}
                </p>
            </div>

            {/* featured 우하단 CTA — 모바일에선 작게 */}
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

/* ============ 배경 미디어 (video / images[] / image) ============
 * 우선순위: video > images > image
 *   - video: 자동 재생 (autoplay loop muted playsInline)
 *   - images: 3초 간격 cross-fade. 동일 위치에 모든 이미지 stack, opacity 만 토글
 *   - image: 단일 정적 이미지, hover 시 살짝 줌인 (group-hover:scale-105) */
function PromoMedia({
    tile, isFeatured, priority,
}: {
    tile: PromoTile;
    isFeatured: boolean;
    priority: boolean;
}) {
    const [imageIdx, setImageIdx] = useState(0);
    const sizes = isFeatured
        ? "(max-width: 768px) 100vw, 50vw"
        : "(max-width: 768px) 50vw, 25vw";

    // images 배열 — 3초 간격으로 인덱스 회전
    useEffect(() => {
        const imgs = tile.images;
        if (!imgs || imgs.length < 2) return;
        const id = setInterval(() => {
            setImageIdx((i) => (i + 1) % imgs.length);
        }, IMAGE_SWITCH_INTERVAL);
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

    // 2) 교차 이미지 — 모든 이미지 absolute stack, 현재 인덱스만 opacity 100
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

    return null;
}
