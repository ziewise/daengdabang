"use client";

/**
 * 스티커북 시안 — 쇼핑 첫 화면(/app/sticker/shop) · 로컬 시안 전용, 배포 X
 * ---------------------------------------------------------------------
 * 웹 첫 페이지(app/page.tsx)를 그대로 줄인 게 아니라 앱 쇼핑 탭으로 다시 구성(정보 · 데이터는 웹과 같음).
 * 배경: 다른 시안 화면과 같은 점 무늬 다이어리 속지 3장(① ② ③ / ④ 색인 탭 / ⑤ ⑥).
 *  ① 히어로(ShopHero) — 브랜드 문구가 맨 위(쇼핑 제목 테이프 없음) · 폴라로이드 영상 · 날씨 칩 · 견종 얼굴 배지
 *  ② 상품군 5개 스티커 — 웹 상단 메뉴(lib/menu-data CATEGORY_GROUPS) 그대로, 누르면 상품군 화면
 *     그림은 사용자가 만든 3D 이미지(public/images/ui/stickers/cat-*.webp)
 *  ③ "{반려견}를 위한 추천" — 회원만(비회원은 자리 없음, 웹과 같음). 협업자 추천 엔진 · 상황별 안내 그대로.
 *     카드 아래 추천 이유 메모 대신 "추천 기준" 버튼 → 속지(사용한 정보 · 주의 · 상품별 이유 + 접힌 "왜 추천했나요?" · 관심 없음 · 추천 데이터 관리)
 *     이름표 사진은 실제 반려견 사진(확인된 사진만, 없으면 강아지 그림) — 시연 분기 제거(배포 전 연결 2026-10-16)
 *  ④ 댕다방 핫픽 · 신상품 — 색인 탭 2개로 한 섹션. 핫픽은 웹 메인 핫픽(휴대폰 한 줄 B안)과 같은 자료 · 동작(ShopHotPick, 2026-10-26 —
 *     웹처럼 예전 "추천 셀렉트" 자리를 핫픽으로), 신상품은 웹 NewArrivalsSection 8개 그대로
 *  ⑤ 기획전 — 웹 PromoSection 5개(큰 카드 1 + 작은 카드 4) 그대로, 글자는 사진 아래 · 바로 아래 대표 브랜드 2장
 *  ⑥ 인스타 — 맨 아래 작은 링크(핸들 · 팔로우 하러가기 한 줄)
 *  영문 꼬리표(COLLECTION · FEATURED …)와 보조 설명 줄은 빼서 깔끔하게
 *  빠진 것: 인트로 · 앱 설치 띠 · 보물광산 소개(앱엔 홈 · 매일 댕생활이 따로 있음) · 인스타 사진 벽
 *  상품을 누르면 웹 상품 상세 · 장바구니 · 결제 그대로. 산책 친구는 AppShell 이 쇼핑 화면에서만 띄움.
 */

import Image from "next/image";
import dynamic from "next/dynamic";
import DeferredShopContent from "../shop/DeferredShopContent";
const ShopRecommend = dynamic(() => import("../shop/ShopRecommend"), {
    ssr: false,
    loading: () => <div style={{ minHeight: 180 }} role="status" className="ah-light pt-8 text-center text-[12px]">맞춤 상품을 불러오고 있어요.</div>,
});
const ShopShelf = dynamic(() => import("../shop/ShopShelf"), {
    ssr: false,
    loading: () => <div style={{ minHeight: 900 }} role="status" className="ah-light pt-8 text-center text-[12px]">상품을 불러오고 있어요.</div>,
});
import Link from "@/components/app-shell/AppLink";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { CategorySlug } from "@/lib/catalog/types";
import { CATEGORY_GROUPS, WEB_PROMO_CARDS, type PromoCard } from "@/lib/menu-data";
import { promoCardForSeason, seasonOf } from "@/lib/promo-season";
import { PUBLIC_SOCIAL_CHANNELS } from "@/lib/social-channels";
import { haptic } from "../gestures";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { ConceptBar, HC_CSS, useDemoSession } from "../shared";
import { DiaryBody, PARTS_CSS, SectionLabel } from "../sticker-parts";
import { Patch, STICKER_CSS, Tape } from "../sticker-kit";
import ShopHero, { SHOP_HERO_CSS } from "../shop/ShopHero";
import { useShopMedia } from "../shop/useShopMedia";
import { SHOW_PARTS_CSS } from "../show-parts";
// 화면에 보일 때만 재생하는 영상(앱 속도, 2026-10-18)
import InViewVideo from "../InViewVideo";

/* 브랜드 — 웹 BrandSlider 와 같은 내용(브랜드마다 2장).
   pos: 가로로 긴 웹 배너를 4:3 칸에 채울 때 보일 위치(object-position) — 강아지가 한쪽에 있는 사진은 강아지 쪽으로(사용자 2026-10-17) */
const BRANDS = [
    { name: "Ruffwear", cta: "브랜드 둘러보기", href: "/brand/ruffwear", slides: [
        { desc: "활동견을 위한 프리미엄 아웃도어 기어", image: "/images/brands/Ruffwear01.png" },
        { desc: "Front Range · Roamer · Cloud Chaser — 베스트셀러 라인", image: "/images/brands/Ruffwear02.png" },
    ] },
    { name: "Rex Specs", cta: "고글 라인업", href: "/brand/rex-specs", slides: [
        { desc: "강아지 눈 보호 전문 아이웨어 솔루션", image: "/images/brands/Rexspecs01.png", pos: "80% 50%" },
        { desc: "V2 · Air · Sun Visor — 활동량과 날씨에 맞춰", image: "/images/brands/Rexspecs02.png", pos: "93% 50%" },
    ] },
];
const INSTA = PUBLIC_SOCIAL_CHANNELS.find((c) => c.key === "instagram");
const INSTA_URL = INSTA?.href || "https://www.instagram.com/daengdabang/";
const INSTA_HANDLE = INSTA?.handle || "@daengdabang";
/* 상품군 스티커 — 바탕색 · 사용자가 만든 3D 그림 */
const CAT_TONES = ["#dcf3e6", "#fff1c4", "#ece6ff", "#ffe1ea", "#ffe8dc"];
const CAT_IMAGES: Record<CategorySlug, string> = {
    outdoor: "/images/ui/stickers/cat-outdoor.webp",
    food: "/images/ui/stickers/cat-food.webp",
    life: "/images/ui/stickers/cat-life.webp",
    toy: "/images/ui/stickers/cat-toy.webp",
    care: "/images/ui/stickers/cat-care.webp",
};

export default function StickerShop() {
    const [session, setSession] = useDemoSession();
    // 상품군 스티커 — 웹 메뉴 순서 · 이름 그대로 + 3D 그림
    const cats = useMemo(() => CATEGORY_GROUPS.map((g, i) => {
        const slug = g.href.split("/").filter(Boolean)[1] as CategorySlug;
        return { ...g, slug, tone: CAT_TONES[i % CAT_TONES.length], image: CAT_IMAGES[slug] };
    }), []);

    return (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-14 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + SHOW_PARTS_CSS + SHOP_HERO_CSS + SHOP_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">
                <ConceptBar session={session} onSession={setSession} />

                {/* 속지 1 — ① 히어로 · ② 상품군 · ③ 맞춤 추천 (점 무늬 다이어리 속지 + 왼쪽 링 구멍) */}
                <DiaryBody pageKey="shop-1" dir={1} className="!pl-8 !pr-3">
                    <ShopHero />

                    {/* ② 상품군 5개 */}
                    <nav aria-label="상품군" className="mt-6 flex justify-between gap-1">
                        {cats.map((c, i) => (
                            <Link key={c.href} href={c.href} onClick={() => haptic("light")} className="shp-cat flex w-[19%] flex-col items-center text-center">
                                <span className="shp-cat-sticker relative block aspect-square w-full max-w-[3.6rem] overflow-hidden rounded-full" style={{ background: c.tone, rotate: `${[-4, 3, -2, 4, -3][i]}deg` }}>
                                    <Image src={c.image} alt="" fill sizes="64px" className="object-contain p-1" />
                                </span>
                                <span className="ah-light mt-1.5 text-[12px] leading-tight">{c.title.split("/").map((t, k) => <span key={k} className="block">{t}</span>)}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* ③ 맞춤 추천 — 회원만 */}
                    {session === "member" ? <DeferredShopContent minHeight={180}><ShopRecommend /></DeferredShopContent> : null}
                </DiaryBody>

                {/* 속지 2 — ④ 댕다방 핫픽 · 신상품: 다른 화면과 같은 색인 탭, 옆으로 밀면 넘어감 */}
                <DeferredShopContent minHeight={900}><ShopShelf /></DeferredShopContent>

                {/* 속지 3 — ⑤ 기획전 · 대표 브랜드 · ⑥ 인스타 */}
                <DiaryBody pageKey="shop-3" dir={1} className="mt-7 !pl-8 !pr-3">
                    <section aria-label="기획전">
                        <SectionLabel icon="fa-scissors">기획전</SectionLabel>
                        <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>우리 댕댕이에게 딱 맞는 큐레이션</p>
                        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
                            {/* 2026-10-26 사용자: 앱 기획전도 웹과 같은 5칸(시즌 · 산책용 · 눈·청력 보호 · 프리미엄 푸드 · 세트) — AppPromoCards */}
                            <AppPromoCards />
                        </div>
                    </section>

                    {/* 대표 브랜드 — 기획전과 같은 제목 줄(형광펜 + 점선 + 아이콘) */}
                    <section aria-label="대표 브랜드">
                        <SectionLabel className="mt-9" icon="fa-tag">대표 브랜드</SectionLabel>
                        <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>댕다방이 자신있게 큐레이션하는 정식 수입 브랜드</p>
                        <div className="mt-3.5 grid grid-cols-2 gap-3">
                            {BRANDS.map((b, i) => <BrandSticker key={b.name} brand={b} i={i} />)}
                        </div>
                        {/* 브랜드 전체 보기 — 웹 상단바 메뉴 · 푸터의 "브랜드"와 같은 기존 브랜드 목록(/brands/)으로 (앱엔 그 메뉴가 없어서) */}
                        <div className="mx-auto mt-4 w-[190px]">
                            <Patch href="/brands/" small tone="cream">브랜드 전체 보기<i aria-hidden="true" className="fa-solid fa-arrow-right text-[11px]" /></Patch>
                        </div>
                    </section>

                    {/* ⑥ 인스타 — 작은 링크 */}
                    <a href={INSTA_URL} target="_blank" rel="noopener noreferrer" aria-label={`${INSTA_HANDLE} 인스타그램 프로필 열기 (새 창)`}
                        className="shp-insta mx-auto mt-10 flex w-fit items-center gap-2.5 rounded-full py-2 pl-2.5 pr-4">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ffe1ea] text-[15px] text-[#d6457a]"><i aria-hidden="true" className="fa-brands fa-instagram" /></span>
                        <span className="ah-display text-[12.5px]">{INSTA_HANDLE} · 팔로우 하러가기</span>
                    </a>
                </DiaryBody>
            </div>
        </div>
    );
}

/* ───────── ③ 맞춤 추천 — 협업자 RecommendSection 과 같은 엔진 · 문구 ───────── */
/* 기획전 사진 — 원본(1499px PNG 장당 2MB대, 앱 묶음 밖이라 앱은 매번 인터넷으로 받음 · 화면엔 140px)을
   같은 그림 480px webp(장당 20KB대, 앱 묶음 images/ui/promo)로(2026-10-21 속도). 웹 메인 기획전은 원본 그대로 */
const APP_PROMO_IMG: Record<string, string> = {
    "/images/promo/rain.png": "/images/ui/promo/rain-480.webp",
    "/images/promo/eye.png": "/images/ui/promo/eye-480.webp",
    "/images/promo/food1.png": "/images/ui/promo/food1-480.webp",
    "/images/promo/food2.png": "/images/ui/promo/food2-480.webp",
    "/images/promo/bundles.png": "/images/ui/promo/bundles-480.webp",
};
const promoSrc = (src: string) => APP_PROMO_IMG[src] ?? src;

/* ───────── ⑤ 기획전 5칸 — 웹 메인과 같은 목록(WEB_PROMO_CARDS, 2026-10-26) ─────────
   시즌 칸은 화면이 붙은 뒤 손님 기기의 오늘 날짜로 계절 제목 · 그림(lib/promo-season.ts). 첫 그림(미리 만든 HTML)은 "시즌 기획전" 그대로라 어긋남 없음.
   그림은 휴대폰용 한 장(imageMobile, 없으면 image) — 모두 앱 묶음 images/ui/promo 안 파일이라 앱 용량은 그대로. */
const noopSubscribe = () => () => {};
function AppPromoCards() {
    const season = useSyncExternalStore(noopSubscribe, () => seasonOf(), () => null);
    const cards = WEB_PROMO_CARDS.map((card) => (season ? promoCardForSeason(card, season) : card)).map((card) => ({ ...card, image: card.imageMobile ?? card.image }));
    return <>{cards.map((t, i) => <PromoSticker key={t.href} tile={t} i={i} />)}</>;
}

/* ───────── ⑤ 기획전 카드 — 사진(영상)은 위, 아래는 제목만(큰 카드도 한 줄) ───────── */
function PromoSticker({ tile, i }: { tile: PromoCard; i: number }) {
    const featured = Boolean(tile.featured);
    const [idx, setIdx] = useState(0);
    useEffect(() => {
        const n = tile.images?.length ?? 0;
        if (n < 2) return;
        const t = window.setInterval(() => setIdx((v) => (v + 1) % n), 3000); // 웹과 같이 3초마다 바뀜
        return () => window.clearInterval(t);
    }, [tile.images]);
    const title = featured ? (tile.titleFull ?? tile.title).replace(/\s*\n\s*/g, " ") : tile.title; // 큰 카드 제목도 한 줄
    const media = useShopMedia(); // 사진 · 영상 주소(네이티브 앱은 운영 사이트 파일) — 준비 전엔 빈 사진 자리
    return (
        <Link href={tile.href} aria-label={`${title} — ${tile.desc}`} onClick={() => haptic("light")} className={`shp-promo relative block bg-white p-1.5 pb-2.5 ${featured ? "col-span-2" : ""}`}
            style={{ rotate: `${featured ? -0.6 : [0, 0.9, -0.8, 0.7, -0.9][i % 5]}deg` }}>
            <Tape className="-top-2 left-1/2 z-10 h-3.5 w-12 -translate-x-1/2" color={["rgba(255,200,215,.9)", "rgba(190,224,255,.85)", "rgba(220,205,255,.9)", "rgba(200,240,215,.9)", "rgba(255,232,170,.9)"][i % 5]} />
            <span className={`relative block overflow-hidden rounded-[3px] ${featured ? "aspect-[16/10]" : "aspect-[4/3]"}`} style={{ background: "#f6efe8" }}>
                {!media ? null
                    : tile.video ? <InViewVideo src={media(tile.video)} muted loop playsInline preload="metadata" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                    : tile.images?.length ? tile.images.map((src, k) => <Image key={src} src={media(promoSrc(src)) ?? promoSrc(src)} alt="" fill sizes="50vw" className={`object-cover transition-opacity duration-700 ${k === idx ? "opacity-100" : "opacity-0"}`} />)
                        : tile.image ? <Image src={media(promoSrc(tile.image)) ?? promoSrc(tile.image)} alt="" fill sizes={featured ? "90vw" : "45vw"} className="object-cover" />
                            : <i aria-hidden="true" className={`fa-solid ${tile.icon} absolute inset-0 grid place-items-center text-4xl text-[#e8c9b8]`} />}
            </span>
            <span className="block px-1 pt-2">
                {/* 제목만(설명 · 컬렉션 보기 버튼 없이) — 카드 전체가 기획전 링크 */}
                <span className={`ah-display block truncate leading-snug ${featured ? "text-[17px]" : "text-[13.5px]"}`}>{title}</span>
            </span>
        </Link>
    );
}

/* ───────── 대표 브랜드 스티커 — 웹 슬라이더처럼 4.5초마다 그 브랜드의 두 장이 바뀜 · 글자는 브랜드 이름만 ───────── */
function BrandSticker({ brand, i }: { brand: (typeof BRANDS)[number]; i: number }) {
    const [k, setK] = useState(0);
    useEffect(() => {
        const t = window.setInterval(() => setK((v) => (v + 1) % brand.slides.length), 4500);
        return () => window.clearInterval(t);
    }, [brand.slides.length]);
    const media = useShopMedia(); // 브랜드 사진 주소(네이티브 앱은 운영 사이트 파일)
    return (
        <Link href={brand.href} aria-label={`${brand.name} ${brand.cta}`} onClick={() => haptic("light")} className="shp-brand relative block rounded-[12px] bg-white p-1.5 pb-2.5" style={{ rotate: `${i ? 0.8 : -0.8}deg` }}>
            {/* 기획전 카드처럼 위에 마스킹테이프 */}
            <Tape className="-top-2 left-1/2 z-10 h-3.5 w-12 -translate-x-1/2" color={i ? "rgba(255,226,150,.9)" : "rgba(200,240,215,.9)"} style={{ rotate: `${i ? 4 : -4}deg` }} />
            <span className="relative block aspect-[4/3] overflow-hidden rounded-[8px] bg-[#f6efe8]">
                {media && brand.slides.map((sl, n) => <Image key={sl.image} src={media(sl.image) ?? sl.image}alt="" fill sizes="45vw" style={{ objectPosition: "pos" in sl ? sl.pos : undefined }} className={`object-cover transition-opacity duration-700 ${n === k ? "opacity-100" : "opacity-0"}`} />)}
            </span>
            {/* 브랜드 이름만(설명 · 버튼 문구 없이) — 카드 전체가 브랜드 화면 링크 */}
            <span className="ah-display block px-1 pt-2 text-center text-[14.5px]">{brand.name}</span>
        </Link>
    );
}

const SHOP_CSS = `
/* 상품군 스티커: 오려 붙인 동그라미(흰 테두리) · 누르면 꾹 */
.shp-cat { -webkit-tap-highlight-color: transparent; }
.shp-cat-sticker { box-shadow: 0 0 0 3px #fff, 0 7px 12px -7px rgba(90,60,50,.5); transition: transform .35s cubic-bezier(.3,1.6,.5,1); }
.shp-cat:active .shp-cat-sticker { transform: scale(.9) rotate(4deg); }
/* 추천 선반 · 이유 메모 · 반려견 이름표 */
.shp-shelf { scrollbar-width: none; }
.shp-shelf::-webkit-scrollbar { display: none; }
.shp-pet { background: #fff; color: #8f7a70; box-shadow: inset 0 0 0 1.5px #f1e3da; }
.shp-pet.is-on { background: #ffe1ea; color: #c23d6c; box-shadow: inset 0 0 0 1.5px #f6a9bf; }
/* 추천 기준 — 노란 포스트잇 꼬리표 버튼 · 속지 안 메모지 · 오린 스티커 · 작은 폴라로이드 */
.shp-basis { background: #fff3a6; color: #8f5e12; border-radius: 3px 3px 8px 3px; rotate: -2deg; box-shadow: 0 6px 9px -6px rgba(110,80,40,.5);
  -webkit-tap-highlight-color: transparent; transition: transform .35s cubic-bezier(.3,1.6,.5,1); }
.shp-basis:active { transform: translateY(-2px) scale(1.06); }
.shp-memo { background: #fff6c9; border-radius: 4px 4px 12px 4px; box-shadow: 0 8px 12px -9px rgba(110,80,40,.5); }
.shp-src { color: #5a4038; border-radius: 999px; box-shadow: 0 0 0 2.5px #fff, 0 5px 8px -5px rgba(90,60,50,.4); }
.shp-caution { background: #fff0e0; color: #8a5a0c; border-radius: 4px 10px 10px 10px; box-shadow: inset 0 0 0 1.5px #f6dcc0; }
/* 상품별 "왜 추천했나요?" — 눌러 펼치는 작은 글자 버튼 · 펼친 내용은 연보라 쪽지 */
.shp-why { -webkit-tap-highlight-color: transparent; }
.shp-why:active { transform: scale(.96); }
.shp-why-memo { background: #f3efff; color: #5a4a6e; border-radius: 4px 10px 10px 10px; box-shadow: inset 0 0 0 1.5px #e4dcff; }
.shp-mini-pol { box-shadow: 0 6px 10px -6px rgba(90,60,50,.5), 0 1px 2px rgba(90,60,50,.12); }
.shp-empty { background: #fffaf2; border: 2px dashed #f1dccf; }
/* 기획전 · 브랜드 · 인스타 */
.shp-promo, .shp-brand { border-radius: 4px; box-shadow: 0 12px 20px -14px rgba(90,60,50,.55), 0 1px 2px rgba(90,60,50,.12); -webkit-tap-highlight-color: transparent; transition: transform .35s cubic-bezier(.3,1.6,.5,1); }
.shp-brand { border-radius: 12px; }
.shp-promo:active, .shp-brand:active { transform: scale(.97); }
.shp-insta { background: #fff; box-shadow: inset 0 0 0 1.5px #f6dbe4, 0 8px 14px -10px rgba(200,80,120,.4); }
`;
