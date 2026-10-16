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
 *     카드 아래 추천 이유 메모 대신 "추천 기준" 버튼 → 속지(사용한 정보 · 주의 · 상품별 이유 · 관심 없음 · 추천 데이터 관리)
 *     이름표 사진은 실제 반려견 사진(확인된 사진만, 없으면 강아지 그림) — 시연 분기 제거(배포 전 연결 2026-10-16)
 *  ④ 추천 셀렉트 · 신상품 — 색인 탭 2개로 한 섹션(웹 BestSection 4개 · NewArrivalsSection 8개 그대로)
 *  ⑤ 기획전 — 웹 PromoSection 5개(큰 카드 1 + 작은 카드 4) 그대로, 글자는 사진 아래 · 바로 아래 대표 브랜드 2장
 *  ⑥ 인스타 — 맨 아래 작은 링크(핸들 · 팔로우 하러가기 한 줄)
 *  영문 꼬리표(COLLECTION · FEATURED …)와 보조 설명 줄은 빼서 깔끔하게
 *  빠진 것: 인트로 · 앱 설치 띠 · 보물광산 소개(앱엔 홈 · 매일 댕생활이 따로 있음) · 인스타 사진 벽
 *  상품을 누르면 웹 상품 상세 · 장바구니 · 결제 그대로. 산책 친구는 AppShell 이 쇼핑 화면에서만 띄움.
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getBestProducts, getNewProducts } from "@/lib/catalog";
import type { CategorySlug } from "@/lib/catalog/types";
import { CATEGORY_GROUPS, PROMO_CARDS, type PromoCard } from "@/lib/menu-data";
import { PUBLIC_SOCIAL_CHANNELS } from "@/lib/social-channels";
import { hasVerifiedPetPhoto, useAuth } from "@/lib/store";
import { useRecommendationAnalytics } from "@/hooks/useRecommendationAnalytics";
import { useRecommendationPreferences } from "@/hooks/useRecommendationPreferences";
import {
    editorialRecommendationItems,
    RECOMMENDATION_FEATURE_FLAGS,
    recommendationPersonalizationEnabled,
    resolveSelectedRecommendationPet,
    runMemberRecommendation,
    type RecommendationSourceGroup,
} from "@/lib/recommendation";
import { haptic } from "../gestures";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { ConceptBar, HC_CSS, useDemoSession } from "../shared";
import { DiaryBody, DiaryTabs, PARTS_CSS, SectionLabel } from "../sticker-parts";
import { Patch, STICKER_CSS, Tape } from "../sticker-kit";
import ShopHero, { SHOP_HERO_CSS } from "../shop/ShopHero";
import ShopProductCard, { SHOP_CARD_CSS } from "../shop/ShopProductCard";
import { SHOW_PARTS_CSS, Sheet } from "../show-parts";
import { useI18n } from "@/lib/i18n";

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
/* 추천 근거 이름 — 협업자 RecommendationProductCard 와 같은 문구(추천 기준 속지에서 씀) */
const SOURCE_LABEL: Record<RecommendationSourceGroup, string> = {
    profile: "등록한 반려견 프로필",
    petlens: "동의한 펫렌즈 케어 신호",
    editorial: "댕다방 편집 추천",
};
/* ④ 색인 탭 — 다른 화면과 같은 다이어리 탭 */
const SHELF_TABS = [
    { label: "추천 셀렉트", color: "#ffe7c2" },
    { label: "신상품", color: "#dcf3e6" },
];
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
    const [shelf, setShelf] = useState<0 | 1>(0); // 0 추천 셀렉트 · 1 신상품
    const best = useMemo(() => getBestProducts(4), []);
    const fresh = useMemo(() => getNewProducts().slice(0, 8), []);
    // 상품군 스티커 — 웹 메뉴 순서 · 이름 그대로 + 3D 그림
    const cats = useMemo(() => CATEGORY_GROUPS.map((g, i) => {
        const slug = g.href.split("/").filter(Boolean)[1] as CategorySlug;
        return { ...g, slug, tone: CAT_TONES[i % CAT_TONES.length], image: CAT_IMAGES[slug] };
    }), []);

    return (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-14 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + SHOW_PARTS_CSS + SHOP_HERO_CSS + SHOP_CARD_CSS + SHOP_CSS}</style>
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
                    <ShopRecommend />
                </DiaryBody>

                {/* 속지 2 — ④ 추천 셀렉트 · 신상품: 다른 화면과 같은 색인 탭, 옆으로 밀면 넘어감 */}
                <section aria-label="추천 셀렉트와 신상품" className="mt-7">
                    <DiaryTabs tabs={SHELF_TABS} active={shelf} onPick={(i) => setShelf(i as 0 | 1)} />
                    <DiaryBody pageKey={`shelf-${shelf}`} dir={shelf === 0 ? -1 : 1} className="!pl-8 !pr-3"
                        onSwipe={(st) => { const n = shelf + st; if (n === 0 || n === 1) { haptic("light"); setShelf(n); } }}>
                        {shelf === 0 ? (
                            <>
                                <p className="ah-display text-[15px]">댕다방 추천 셀렉트</p>
                                <p className="ah-light mt-0.5 text-[12px]" style={{ color: TEXT_SOFT }}>상품 용도와 브랜드 구성을 살펴 고른 편집 추천</p>
                                <span className="ah-light mt-2 inline-block rounded-full bg-[#e3f6fb] px-2.5 py-1 text-[11px] text-[#1f6f8f]">판매량 순위 아님 · 상품 탐색용</span>
                                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5">{best.map((p, i) => <ShopProductCard key={p.id} product={p} index={i} />)}</div>
                                <div className="mt-5"><Patch href="/best/" tone="cream" small>추천 셀렉트 더 보기<i aria-hidden="true" className="fa-solid fa-arrow-right text-[11px]" /></Patch></div>
                            </>
                        ) : (
                            <>
                                <p className="ah-display text-[15px]">신상품</p>
                                <p className="ah-light mt-0.5 text-[12px]" style={{ color: TEXT_SOFT }}>2026 새로 들어온 컬렉션</p>
                                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5">{fresh.map((p, i) => <ShopProductCard key={p.id} product={p} index={i} />)}</div>
                                <div className="mt-5"><Patch href="/new/" tone="mint" small>신상품 보기<i aria-hidden="true" className="fa-solid fa-arrow-right text-[11px]" /></Patch></div>
                            </>
                        )}
                    </DiaryBody>
                </section>

                {/* 속지 3 — ⑤ 기획전 · 대표 브랜드 · ⑥ 인스타 */}
                <DiaryBody pageKey="shop-3" dir={1} className="mt-7 !pl-8 !pr-3">
                    <section aria-label="기획전">
                        <SectionLabel icon="fa-scissors">기획전</SectionLabel>
                        <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>우리 댕댕이에게 딱 맞는 큐레이션</p>
                        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
                            {PROMO_CARDS.map((t, i) => <PromoSticker key={t.href} tile={t} i={i} />)}
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
function ShopRecommend() {
    const { user, hydrated } = useAuth();
    const personalizationEnabled = recommendationPersonalizationEnabled(RECOMMENDATION_FEATURE_FLAGS, "home");
    const prefState = useRecommendationPreferences({ enabled: personalizationEnabled });
    const prefs = prefState.preferences;
    const selectedPet = personalizationEnabled ? resolveSelectedRecommendationPet(user?.pets ?? [], prefs?.selectedPetProfileId ?? null) : null;
    const personalized = selectedPet && prefs?.enabled ? runMemberRecommendation({ profile: selectedPet, preferences: prefs, surface: "home", limit: 6 }) : null;
    const editorial = !personalizationEnabled || !selectedPet || !prefs || !prefs.enabled;
    const baseItems = editorial ? editorialRecommendationItems(6) : personalized?.items ?? [];
    const analyticsMode = prefs?.enabled ? personalized?.mode ?? "editorial_fallback" : prefs ? "disabled" : "editorial_fallback";
    const analytics = useRecommendationAnalytics({
        enabled: RECOMMENDATION_FEATURE_FLAGS.analytics && hydrated && Boolean(user),
        surface: "home",
        mode: analyticsMode,
        items: baseItems,
        ready: hydrated && Boolean(user) && (!personalizationEnabled || !prefState.isLoading),
    });
    const { productName } = useI18n();
    const [basisOpen, setBasisOpen] = useState(false); // 추천 기준 속지
    if (!hydrated || !user) return null; // 비회원 — 자리 없음(웹과 같음)

    const petName = selectedPet?.name?.trim() || "우리 아이";
    const items = analytics.visibleItems;
    const allItems = baseItems;
    const titleText = personalizationEnabled && selectedPet && prefs?.enabled ? `${petName}를 위한 추천` : "상품 용도와 브랜드를 살펴 골랐어요";
    // 이름표 사진 — 고른 반려견의 확인된 사진(없으면 강아지 그림)
    const petPhoto = selectedPet && hasVerifiedPetPhoto(selectedPet) ? selectedPet.photoDataUrl : "";
    const helper = !personalizationEnabled ? "현재는 회원 정보를 사용하지 않는 댕다방 편집 추천을 보여드려요."
            : !selectedPet ? "반려견 프로필을 등록하면 체형·활동량·관심 케어를 반영할 수 있어요."
                : !prefs ? (prefState.errorMessage || "추천 데이터 설정을 안전하게 확인하고 있어요.")
                    : !prefs.enabled ? "맞춤 추천이 꺼져 있어 회원 정보가 아닌 편집 추천만 보여드려요."
                        : personalized?.mode === "personalized" ? "등록한 프로필과 사용에 동의한 펫렌즈 케어 신호를 함께 반영했어요." : "등록한 체형·활동량·관심 케어 프로필만 반영했어요.";
    const kicker = editorial ? "댕다방 추천 셀렉트" : "우리 아이 맞춤 추천";
    // 관심 없음 · 다시 보기 — 실제 회원은 협업자 훅(hideProduct · resetHidden) 그대로
    const hide = (id: string) => { haptic("light"); analytics.hideProduct(id); };
    const unhide = () => analytics.resetHidden();
    // 추천 기준 속지 열기 — 보이는 상품의 추천 이유를 함께 보여 주므로 웹의 "왜 추천했나요" 펼침과 같은 기록(trackReasonOpened)
    const openBasis = () => {
        haptic("light");
        setBasisOpen(true);
        items.forEach((it) => analytics.trackReasonOpened(it.product.id));
    };
    const usedSources = Array.from(new Set(items.flatMap((it) => it.sourceGroups)));
    const cautions = Array.from(new Set(items.flatMap((it) => it.cautionLabels)));
    const pets = (user?.pets ?? []).filter((p): p is typeof p & { apiProfileId: number } => typeof p.apiProfileId === "number");

    return (
        <section id="recommend" aria-label={titleText} className="mt-8">
            {/* 이름표 — 반려견 폴라로이드 + 제목 */}
            <div className="flex items-center gap-3">
                <span className="st-polaroid relative block w-[3.6rem] shrink-0 bg-white p-1 pb-3" style={{ rotate: "-4deg" }}>
                    <Tape className="-top-1.5 left-1/2 h-3 w-8 -translate-x-1/2" color="rgba(255,226,150,.9)" />
                    <span className="relative block aspect-square overflow-hidden bg-[#fff3e8]">{petPhoto
                        // eslint-disable-next-line @next/next/no-img-element -- 회원이 올린 반려견 사진(data URL)
                        ? <img src={petPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        : <i aria-hidden="true" className="fa-solid fa-dog absolute inset-0 grid place-items-center text-[20px] text-[#e8b9a6]" />}</span>
                </span>
                <div className="min-w-0 flex-1">
                    <p className="ah-light text-[11px] text-[#8b6fd6]"><i aria-hidden="true" className="fa-solid fa-wand-magic-sparkles mr-1 text-[10px]" />{kicker}</p>
                    <p className="ah-display mt-0.5 text-[17px] leading-snug"><span className="st-marker">{titleText}</span></p>
                    <p className="ah-light mt-1 text-[11.5px] leading-snug" style={{ color: TEXT_SOFT }}>{helper}</p>
                </div>
            </div>
            {/* 추천 기준 · 반려견 고르기(여러 마리) · 추천 전체 보기 · 맞춤 추천 켜기 */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {items.length > 0 ? (
                    <button type="button" onClick={openBasis} className="shp-basis ah-display relative px-3 pb-1 pt-1.5 text-[12px]">
                        <span aria-hidden="true" className="st-tape absolute -top-1.5 left-1/2 h-2.5 w-7 -translate-x-1/2" style={{ background: "rgba(255,200,215,.9)", rotate: "-6deg" }} />
                        추천 기준 보기
                    </button>
                ) : null}
                {personalizationEnabled && prefs && selectedPet && pets.length > 1 ? pets.map((p) => (
                    <button key={p.apiProfileId} type="button" disabled={!prefState.isReady || prefState.isSaving} aria-pressed={selectedPet.apiProfileId === p.apiProfileId}
                        onClick={() => { haptic("light"); void prefState.save({ selectedPetProfileId: p.apiProfileId }).catch(() => undefined); }}
                        className={`shp-pet ah-display rounded-full px-3 py-1 text-[12px] ${selectedPet.apiProfileId === p.apiProfileId ? "is-on" : ""}`}>{p.name}</button>
                )) : null}
                <Link href={personalizationEnabled && !selectedPet ? "/mypage/#pet-profiles" : "/recommendations/"} className="ah-display ml-auto text-[12px] text-[#e0557f]">
                    {personalizationEnabled && !selectedPet ? "프로필 등록하기" : "추천 전체 보기"} <i aria-hidden="true" className="fa-solid fa-arrow-right text-[10px]" />
                </Link>
                {personalizationEnabled && prefs && !prefs.enabled ? <Link href="/mypage/recommendations/" className="ah-display text-[12px] text-[#5a6fe0]">맞춤 추천 켜기</Link> : null}
            </div>
            {personalizationEnabled && prefState.errorMessage && selectedPet ? <p role="status" className="ah-light mt-2 rounded-[10px] bg-[#fff4dc] px-3 py-2 text-[12px] text-[#8a5a0c]">{prefState.errorMessage}</p> : null}
            {personalizationEnabled ? personalized?.notices.map((n) => <p key={n} className="ah-light mt-2 rounded-[10px] bg-[#e6f4ff] px-3 py-2 text-[12px] text-[#1f5c8f]">{n}</p>) : null}

            {/* 가로 선반 — 상품 카드 + 추천 이유 메모 */}
            {items.length > 0 ? (
                <ul className="shp-shelf -mr-3 mt-3.5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 pr-3 pt-2.5" data-recommendation-run={analytics.runId}>
                    {items.map((it, i) => (
                        <li key={it.product.id} className="w-[10.4rem] shrink-0 snap-start" data-recommendation-product={it.product.id}
                            onClickCapture={(e) => { const a = (e.target as Element).closest?.("a[href]"); if (a?.getAttribute("href")?.startsWith("/product/")) analytics.trackProductClick(it.product.id); }}>
                            <ShopProductCard product={it.product} index={i} />
                            {/* 추천 이유 · 관심 없음은 카드 대신 "추천 기준" 속지에 모음(사용자 결정, 웹 추천 섹션은 그대로) */}
                        </li>
                    ))}
                </ul>
            ) : allItems.length > 0 ? (
                <div className="shp-empty mt-3 rounded-[14px] px-4 py-6 text-center">
                    <p className="ah-display text-[13.5px]">이 추천 묶음의 상품을 모두 숨겼어요.</p>
                    <button type="button" onClick={unhide} className="ah-display mt-2 text-[12.5px] text-[#e0557f]">숨긴 상품 다시 보기</button>
                </div>
            ) : (
                <div className="shp-empty mt-3 rounded-[14px] px-4 py-6 text-center">
                    <p className="ah-display text-[13.5px]">현재 안전 기준을 통과한 맞춤 상품이 없어요.</p>
                    <Link href="/products/" className="ah-display mt-2 inline-block text-[12.5px] text-[#e0557f]">전체 상품 직접 보기</Link>
                </div>
            )}

            {/* 추천 기준 속지 — 웹 카드의 "왜 추천했나요"(사용한 정보 · 주의 · 추천 데이터 관리)와 상품별 이유 · 관심 없음을 한곳에 */}
            <Sheet open={basisOpen} onClose={() => setBasisOpen(false)} label="추천 기준"
                title={<span className="ah-display st-marker text-[18px]">{petName}를 위한 추천 기준</span>}>
                {/* 반영 기준 — 테이프 붙인 노란 메모지 */}
                <div className="shp-memo relative mt-2 px-4 pb-3 pt-4" style={{ rotate: "-0.8deg" }}>
                    <span aria-hidden="true" className="st-tape absolute -top-2 left-6 h-3.5 w-12" style={{ background: "rgba(200,226,255,.9)", rotate: "-4deg" }} />
                    <p className="ah-light text-[13px] leading-relaxed text-[#5a4a1c]">{helper}</p>
                </div>

                {/* 사용한 정보 — 오려 붙인 스티커 */}
                <SectionLabel className="mt-6" icon="fa-paw">사용한 정보</SectionLabel>
                <ul className="mt-3 flex flex-wrap gap-2">
                    {usedSources.map((src, i) => (
                        <li key={src} className="shp-src ah-display px-3 py-1.5 text-[12px]" style={{ background: ["#efe8ff", "#e1f4ea", "#ffe4ec"][i % 3], rotate: `${[-1.5, 1.2, -0.8][i % 3]}deg` }}>{SOURCE_LABEL[src]}</li>
                    ))}
                </ul>
                {cautions.map((c) => <p key={c} className="shp-caution ah-light mt-3 px-3 py-2 text-[11.5px] leading-snug">{c}</p>)}

                {/* 상품별 추천 이유 — 작은 폴라로이드 + 메모 · 관심 없음 와펜 */}
                <SectionLabel className="mt-7" icon="fa-pen">상품별 추천 이유</SectionLabel>
                <ul className="mt-4 space-y-4 pb-1">
                    {items.map((it, i) => (
                        <li key={it.product.id} className="flex items-start gap-3">
                            <span className="shp-mini-pol relative block w-[3.6rem] shrink-0 bg-white p-1 pb-2" style={{ rotate: `${i % 2 ? 3 : -3}deg` }}>
                                <span aria-hidden="true" className="st-tape absolute -top-1.5 left-1/2 z-[1] h-2.5 w-7 -translate-x-1/2" style={{ background: ["rgba(255,200,215,.9)", "rgba(190,224,255,.9)", "rgba(255,232,170,.95)"][i % 3] }} />
                                <span className="relative block aspect-square overflow-hidden bg-[#fff8ee]">{it.product.image ? <Image src={it.product.image} alt="" fill sizes="56px" className="object-contain" /> : null}</span>
                            </span>
                            <span className="min-w-0 flex-1 pt-0.5">
                                <span className="ah-display line-clamp-2 block text-[12.5px] leading-snug">{productName(it.product)}</span>
                                <span className="ah-light mt-1 block text-[11.5px] leading-snug" style={{ color: TEXT_SOFT }}>{it.reasonLabel}</span>
                            </span>
                            <span className="w-[5.2rem] shrink-0 pt-0.5"><Patch tone="cream" small onClick={() => hide(it.product.id)}>관심 없음</Patch></span>
                        </li>
                    ))}
                </ul>
                {items.length === 0 && allItems.length > 0 ? (
                    <div className="mt-3"><Patch tone="cream" small onClick={unhide}>숨긴 상품 다시 보기</Patch></div>
                ) : null}
                {RECOMMENDATION_FEATURE_FLAGS.preferences ? (
                    <div className="mt-6"><Patch href="/mypage/recommendations/" tone="lavender" small>추천 데이터 관리<i aria-hidden="true" className="fa-solid fa-arrow-right text-[11px]" /></Patch></div>
                ) : null}
            </Sheet>
        </section>
    );
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
    return (
        <Link href={tile.href} aria-label={`${title} — ${tile.desc}`} onClick={() => haptic("light")} className={`shp-promo relative block bg-white p-1.5 pb-2.5 ${featured ? "col-span-2" : ""}`}
            style={{ rotate: `${featured ? -0.6 : [0, 0.9, -0.8, 0.7, -0.9][i % 5]}deg` }}>
            <Tape className="-top-2 left-1/2 z-10 h-3.5 w-12 -translate-x-1/2" color={["rgba(255,200,215,.9)", "rgba(190,224,255,.85)", "rgba(220,205,255,.9)", "rgba(200,240,215,.9)", "rgba(255,232,170,.9)"][i % 5]} />
            <span className={`relative block overflow-hidden rounded-[3px] ${featured ? "aspect-[16/10]" : "aspect-[4/3]"}`} style={{ background: "#f6efe8" }}>
                {tile.video ? <video src={tile.video} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                    : tile.images?.length ? tile.images.map((src, k) => <Image key={src} src={src} alt="" fill sizes="50vw" className={`object-cover transition-opacity duration-700 ${k === idx ? "opacity-100" : "opacity-0"}`} />)
                        : tile.image ? <Image src={tile.image} alt="" fill sizes={featured ? "90vw" : "45vw"} className="object-cover" />
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
    return (
        <Link href={brand.href} aria-label={`${brand.name} ${brand.cta}`} onClick={() => haptic("light")} className="shp-brand relative block rounded-[12px] bg-white p-1.5 pb-2.5" style={{ rotate: `${i ? 0.8 : -0.8}deg` }}>
            {/* 기획전 카드처럼 위에 마스킹테이프 */}
            <Tape className="-top-2 left-1/2 z-10 h-3.5 w-12 -translate-x-1/2" color={i ? "rgba(255,226,150,.9)" : "rgba(200,240,215,.9)"} style={{ rotate: `${i ? 4 : -4}deg` }} />
            <span className="relative block aspect-[4/3] overflow-hidden rounded-[8px] bg-[#f6efe8]">
                {brand.slides.map((sl, n) => <Image key={sl.image} src={sl.image} alt="" fill sizes="45vw" style={{ objectPosition: "pos" in sl ? sl.pos : undefined }} className={`object-cover transition-opacity duration-700 ${n === k ? "opacity-100" : "opacity-0"}`} />)}
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
.shp-mini-pol { box-shadow: 0 6px 10px -6px rgba(90,60,50,.5), 0 1px 2px rgba(90,60,50,.12); }
.shp-empty { background: #fffaf2; border: 2px dashed #f1dccf; }
/* 기획전 · 브랜드 · 인스타 */
.shp-promo, .shp-brand { border-radius: 4px; box-shadow: 0 12px 20px -14px rgba(90,60,50,.55), 0 1px 2px rgba(90,60,50,.12); -webkit-tap-highlight-color: transparent; transition: transform .35s cubic-bezier(.3,1.6,.5,1); }
.shp-brand { border-radius: 12px; }
.shp-promo:active, .shp-brand:active { transform: scale(.97); }
.shp-insta { background: #fff; box-shadow: inset 0 0 0 1.5px #f6dbe4, 0 8px 14px -10px rgba(200,80,120,.4); }
`;
