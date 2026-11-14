"use client";
import Image from "next/image";
import Link from "@/components/app-shell/AppLink";
import { useMemo, useState } from "react";
import { productCardImage } from "@/lib/catalog/card-image";
import { hasVerifiedPetPhoto, useAuth } from "@/lib/store";
import { useRecommendationAnalytics } from "@/hooks/useRecommendationAnalytics";
import { useRecommendationPreferences } from "@/hooks/useRecommendationPreferences";
import { editorialRecommendationItems, runMemberRecommendation } from "@/lib/catalog/native-shop-data";
import { RECOMMENDATION_FEATURE_FLAGS, recommendationPersonalizationEnabled } from "@/lib/recommendation/feature-flags";
import { resolveSelectedRecommendationPet } from "@/lib/recommendation/member-core";
import type { RecommendationSourceGroup } from "@/lib/recommendation/types";
import { haptic } from "../gestures";
import { TEXT_SOFT } from "../kit";
import { SectionLabel } from "../sticker-parts";
import { Patch, Tape } from "../sticker-kit";
import ShopProductCard, { SHOP_CARD_CSS } from "./ShopProductCard";
import { useShopMedia } from "./useShopMedia";
import { Sheet } from "../show-parts";
import { useI18n } from "@/lib/i18n";

const SOURCE_LABEL: Record<RecommendationSourceGroup, string> = {
    profile: "등록한 반려견 프로필",
    petlens: "동의한 펫렌즈 케어 신호",
    editorial: "댕다방 편집 추천",
};

export default function ShopRecommend() {
    const { user, hydrated } = useAuth();
    const personalizationEnabled = recommendationPersonalizationEnabled(RECOMMENDATION_FEATURE_FLAGS, "home");
    const prefState = useRecommendationPreferences({ enabled: personalizationEnabled });
    const prefs = prefState.preferences;
    const selectedPet = personalizationEnabled ? resolveSelectedRecommendationPet(user?.pets ?? [], prefs?.selectedPetProfileId ?? null) : null;
    const personalized = useMemo(() => selectedPet && prefs?.enabled ? runMemberRecommendation({ profile: selectedPet, preferences: prefs, surface: "home", limit: 6 }) : null, [selectedPet, prefs]);
    const editorial = !personalizationEnabled || !selectedPet || !prefs || !prefs.enabled;
    const baseItems = useMemo(() => editorial ? editorialRecommendationItems(6) : personalized?.items ?? [], [editorial, personalized]);
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
    const [openReasons, setOpenReasons] = useState<ReadonlySet<string>>(() => new Set()); // 속지 안에서 "왜 추천했나요?"를 펼친 상품
    const media = useShopMedia(); // 추천 상품 사진 주소(네이티브 앱은 운영 사이트 파일)
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
    // 추천 기준 속지 열기 — 여는 것만으로는 기록하지 않음(웹은 상품별 "왜 추천했나요?"를 펼칠 때만 기록)
    const openBasis = () => {
        haptic("light");
        setBasisOpen(true);
    };
    // 속지 닫기 — 다음에 열 때 상품별 이유는 다시 접힌 상태(웹 details 기본값과 같음)
    const closeBasis = () => {
        setBasisOpen(false);
        setOpenReasons(new Set());
    };
    // 상품별 "왜 추천했나요?" 펼침 · 접기 — 웹 RecommendationProductCard 의 details onToggle 처럼 펼칠 때마다 trackReasonOpened
    const toggleReason = (id: string) => {
        haptic("light");
        const opening = !openReasons.has(id);
        setOpenReasons((cur) => {
            const next = new Set(cur);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
        if (opening) analytics.trackReasonOpened(id);
    };
    const usedSources = Array.from(new Set(items.flatMap((it) => it.sourceGroups)));
    const cautions = Array.from(new Set(items.flatMap((it) => it.cautionLabels)));
    // 고를 수 있는 반려견 — 웹 RecommendationPetSelector 와 같은 조건(서버 프로필 번호가 1 이상의 정수)
    const pets = (user?.pets ?? []).filter((p): p is typeof p & { apiProfileId: number } => Number.isInteger(p.apiProfileId) && Number(p.apiProfileId) > 0);
    // 지금 고른 반려견 — 웹 선택 상자와 같게, 목록에 없으면 첫 번째 아이
    const selectedPetId = pets.some((p) => p.apiProfileId === selectedPet?.apiProfileId) ? Number(selectedPet?.apiProfileId) : pets[0]?.apiProfileId;
    // 반려견 고르기 — 웹 선택 상자는 값이 바뀔 때만 저장하므로 이미 고른 아이를 다시 눌러도 저장하지 않음
    const pickPet = (profileId: number) => {
        if (profileId === selectedPetId) return;
        haptic("light");
        void prefState.save({ selectedPetProfileId: profileId }).catch(() => undefined);
    };

    return (
        <section id="recommend" aria-label={titleText} className="mt-8">
            <style>{SHOP_CARD_CSS}</style>
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
                    <button key={p.apiProfileId} type="button" disabled={!prefState.isReady || prefState.isSaving} aria-pressed={selectedPetId === p.apiProfileId}
                        onClick={() => pickPet(p.apiProfileId)}
                        className={`shp-pet ah-display rounded-full px-3 py-1 text-[12px] ${selectedPetId === p.apiProfileId ? "is-on" : ""}`}>
                        {/* 이름표 — 웹 선택 상자와 같은 글자(이름이 없으면 "우리 아이", 견종이 있으면 " · 견종") */}
                        {p.name || "우리 아이"}{p.breed ? ` · ${p.breed}` : ""}
                    </button>
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
            <Sheet open={basisOpen} onClose={closeBasis} label="추천 기준"
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
                                <span className="relative block aspect-square overflow-hidden bg-[#fff8ee]">{media && productCardImage(it.product) ? <Image src={media(productCardImage(it.product)) ?? productCardImage(it.product)!} alt="" fill sizes="56px" className="object-contain" /> : null}</span>
                            </span>
                            <span className="min-w-0 flex-1 pt-0.5">
                                <span className="ah-display line-clamp-2 block text-[12.5px] leading-snug">{productName(it.product)}</span>
                                <span className="ah-light mt-1 block text-[11.5px] leading-snug" style={{ color: TEXT_SOFT }}>{it.reasonLabel}</span>
                                {/* 왜 추천했나요? — 웹 카드처럼 접혀 있다가 누르면 이 상품에 쓴 정보 · 주의 문구를 펼침 */}
                                <button type="button" onClick={() => toggleReason(it.product.id)} aria-expanded={openReasons.has(it.product.id)} aria-controls={`shp-why-${it.product.id}`}
                                    className="shp-why ah-display mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-[#5a6fe0]">
                                    왜 추천했나요?<i aria-hidden="true" className={`fa-solid fa-chevron-down text-[9px] transition-transform duration-300 ${openReasons.has(it.product.id) ? "rotate-180" : ""}`} />
                                </button>
                                {openReasons.has(it.product.id) ? (
                                    <span id={`shp-why-${it.product.id}`} className="shp-why-memo ah-light mt-1.5 block px-2.5 py-2 text-[11px] leading-snug">
                                        <span className="block">사용한 정보</span>
                                        {it.sourceGroups.map((src) => <span key={src} className="block">· {SOURCE_LABEL[src]}</span>)}
                                        {it.cautionLabels.map((c) => <span key={c} className="mt-1 block text-[#8a5a0c]">{c}</span>)}
                                    </span>
                                ) : null}
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

