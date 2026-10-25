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
 *
 * 웹(2026-10-24 J5): 왼쪽 큰 사진 + 오른쪽 가로 사진 4장, 흰 액자 아래 여백에만 글(data-promo-cap).
 * 사진 위 오버레이 글 · 그늘은 웹 CSS(app/globals.css)에서만 숨김 — 앱 화면 · 링크는 그대로.
 *
 * 2026-10-25 사용자 결정: 웹 기획전 5칸 = 시즌 기획전 · 산책용 · 눈·청력 보호 · 프리미엄 푸드 · 세트(WEB_PROMO_CARDS).
 *  - 시즌 칸은 손님 기기의 오늘 날짜로 계절(봄 3~5 · 여름 6~8 · 가을 9~11 · 겨울 12~2)을 정해 제목 · 설명 · 그림을 바꿈(lib/promo-season.ts).
 *    미리 만든 페이지에는 만든 날의 계절(season 인자)로 그려 두고, 화면에 붙은 뒤 오늘 날짜로 다시 맞춤(배포 없이 계절이 바뀜).
 *  - 칸마다 그림 한 장(시즌은 PC용 · 휴대폰용 중 화면에 맞는 한 장). 영상 · 그림 바꾸기 효과는 나중에.
 */
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { SEASONS, seasonOf, type SeasonKey } from "@/lib/promo-season";
import Link from "next/link";
import { WEB_PROMO_CARDS, type PromoCard } from "@/lib/menu-data";

// color → 배경 class (Tailwind JIT 가 잡도록 명시 매핑, 헤더 드롭다운과 동일 팔레트)
const COLOR_BG: Record<PromoCard["color"], string> = {
    indigo: "bg-aurora-indigo",
    blue: "bg-aurora-blue",
    purple: "bg-aurora-purple",
    green: "bg-success",
    pink: "bg-aurora-pink",
};

const IMAGE_SWITCH_INTERVAL = 3000; // 교차 이미지 전환 간격 (ms)

const noopSubscribe = () => () => {};

/** 시즌 칸이면 지금 계절의 제목 · 설명 · 그림으로 */
function withSeason(card: PromoCard, season: SeasonKey): PromoCard {
    if (!card.season) return card;
    const look = SEASONS[season];
    return { ...card, title: look.title, titleFull: look.titleFull, desc: look.desc, eyebrow: look.eyebrow, image: look.image.pc, imageMobile: look.image.mobile };
}

export default function PromoSection({ season: builtSeason = "autumn" }: { season?: SeasonKey } = {}) {
    // 미리 만든 페이지 = 만든 날의 계절, 화면에 붙은 뒤 = 오늘 날짜의 계절
    const season = useSyncExternalStore(noopSubscribe, () => seasonOf(), () => builtSeason);
    return (
        <section id="promo" className="py-8 md:py-12">
            <div className="max-w-[1400px] mx-auto px-6">
                <div className="mb-6 md:mb-8">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5">기획전</h2>
                    <p className="text-sm text-neutral-500">우리 댕댕이에게 딱 맞는 큐레이션</p>
                </div>

                {/* 1 featured + 4 small 그리드 — 헤더 드롭다운과 동일한 PROMO_CARDS 사용 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 auto-rows-[130px] md:auto-rows-[200px] lg:auto-rows-[220px]">
                    {WEB_PROMO_CARDS.map((card) => withSeason(card, season)).map((t, i) => (
                        <PromoTileCard key={t.href} tile={t} priority={i === 0} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function PromoTileCard({ tile, priority, index }: { tile: PromoCard; priority: boolean; index: number }) {
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
            {/* 배경 미디어 — video / images[] / image / (없으면) color+아이콘.
                사진 틀(data-promo-photo): 앱은 칸 전체 그대로, 웹은 흰 액자 안 사진 자리(아래 글 칸만큼 비움) */}
            <span data-promo-photo className="absolute inset-0 block">
                <PromoMedia tile={tile} isFeatured={isFeatured} priority={priority} />
            </span>

            {/* 웹 전용 액자 아래 글(앱은 hidden) — 번호 · 제목 · 설명 · 보러 가기. 웹은 사진 위 글자 없이 여기만 보임 */}
            <span data-promo-cap className="hidden">
                <span data-promo-no>{String(index + 1).padStart(2, "0")}</span>
                <span data-promo-title>{tile.title}</span>
                <span data-promo-desc>{tile.desc}</span>
                <span data-promo-go>
                    {isFeatured ? "기획전 보러 가기" : "보러 가기"} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </span>
            </span>

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

    // 3) 단일 이미지 — 휴대폰용 그림이 따로 있으면 화면 폭에 맞는 한 장만 받음(picture)
    if (tile.image && tile.imageMobile) {
        return (
            <picture>
                <source media="(max-width: 767px)" srcSet={tile.imageMobile} />
                <img
                    src={tile.image}
                    alt={tile.title}
                    loading={priority ? "eager" : "lazy"}
                    fetchPriority={priority ? "high" : undefined}
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            </picture>
        );
    }
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
