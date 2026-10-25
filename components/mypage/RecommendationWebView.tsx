/**
 * RecommendationWebView — 웹 마이페이지 "추천 데이터 관리" 화면(2026-10-24 사용자: 어중간한 화면을 비주얼하게 다시)
 * ---------------------------------------------------------------------
 * 설정값 · 저장(saveSetting) · 반려견 목록은 app/mypage/recommendations/page.tsx 가 넘겨줌 — 기능 그대로, 겉모양만 웹 전용.
 * 앱은 같은 페이지의 기존 화면 그대로(이 부품은 hidden → 웹 CSS 에서만 보임, app/mypage-web.css "추천 데이터 관리").
 *  1) 상태 판: 지금 추천 방식(주아 큰 제목) · 전체 켜기 단추 · 추천 재료 흐름(프로필 + 펫렌즈 + 행동 → 맞춤 추천, 쓰는 재료만 불 켜짐)
 *  2) 재료 카드 셋: 3D 그림 · 쓰는 정보 칩 · 켜기 단추(행동 데이터는 준비 중)
 *  3) 기본 추천 반려견: 아이 사진 카드 고르기(라디오)
 *  4) 내 데이터 관리: 3D 그림 타일 넷(프로필 · 분석 기록 · 삭제 요청 창 · 개인정보 창) + 동의 기준
 */
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import MypageInquiryLink from "@/components/mypage/MypageInquiryLink";
import type { RecommendationPreferences } from "@/lib/customer-api";
import type { PetProfile } from "@/lib/store";

type Patch = Partial<Omit<RecommendationPreferences, "consentVersion">>;

type Props = {
    preferences: RecommendationPreferences;
    disabled: boolean;
    saving: boolean;
    pets: (PetProfile & { apiProfileId: number })[];
    analysisHref: string;
    onSave: (patch: Patch, message: string) => void;
};

/** 켜기 단추(스위치) — 기존 체크 상자와 같은 값 */
function Switch({ checked, disabled, label, onChange, tone = "mint" }: { checked: boolean; disabled: boolean; label: string; onChange: (next: boolean) => void; tone?: "mint" | "pink" }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            className="rw-switch"
            data-tone={tone}
            onClick={() => onChange(!checked)}
        >
            <span className="rw-switch-track" aria-hidden="true"><span /></span>
            <span className="rw-switch-text">{checked ? "켜짐" : "꺼짐"}</span>
        </button>
    );
}

// 추천 재료 카드 문구 — 2026-10-26 웹 해요체로 다듬음(이 화면은 웹 전용, 앱은 기존 화면 그대로)
const INGREDIENTS = [
    {
        key: "profile" as const,
        tone: "mint",
        art: "/images/ui/mypet-view-front-160.webp",
        kicker: "PROFILE",
        title: "반려견 프로필",
        desc: "등록한 체형, 생애단계, 활동량, 모질과 직접 고른 관심사만 사용해요.",
        chips: ["체형", "생애단계", "활동량", "모질", "관심사"],
    },
    {
        key: "petlens" as const,
        tone: "lav",
        art: "/images/ui/header-petlens-128.webp",
        kicker: "PETLENS",
        title: "펫렌즈 케어 신호",
        desc: "켜면 분석 결과 중 허용된 착용 실측·시인성·피모 관리 코드만 보조 신호로 사용해요. 사진과 분석 원문은 추천 이유에 보이지 않아요.",
        chips: ["착용 실측", "시인성", "피모 관리"],
    },
    {
        key: "behavior" as const,
        tone: "yellow",
        art: "/images/ui/lab-summary-256.webp",
        kicker: "BEHAVIOR",
        title: "행동 데이터",
        desc: "클릭·구매 행동 기반 개인화는 아직 사용하지 않아요.",
        chips: ["클릭", "구매"],
    },
];

export default function RecommendationWebView({ preferences, disabled, saving, pets, analysisHref, onSave }: Props) {
    const on = preferences.enabled;
    const used = {
        profile: on && preferences.profileSignalsEnabled,
        petlens: on && preferences.petLensSignalsEnabled,
        behavior: false,
    };
    const mode = !on
        ? { title: "편집 추천만 보여 드려요", sub: "회원 정보를 추천에 쓰지 않아요. 댕다방이 고른 편집 추천과 일반 쇼핑은 그대로예요.", badge: "편집 추천" }
        : used.petlens
            ? { title: "맞춤 추천이 켜져 있어요", sub: "프로필과 펫렌즈 허용 신호로 우리 아이에게 맞는 상품을 먼저 보여 드려요.", badge: "프로필 + 펫렌즈" }
            : used.profile
                ? { title: "프로필로 추천하고 있어요", sub: "등록한 반려견 프로필만 써서 추천해요. 펫렌즈 신호는 쓰지 않아요.", badge: "프로필만" }
                : { title: "맞춤 추천이 켜져 있지만 재료가 없어요", sub: "아래에서 쓸 재료를 하나 이상 켜면 맞춤 추천이 시작돼요. 지금은 편집 추천을 보여 드려요.", badge: "재료 없음" };
    const selectedId = preferences.selectedPetProfileId ?? pets[0]?.apiProfileId;

    return (
        <div className="hidden" data-rec-web data-on={on || undefined} data-saving={saving || undefined}>
            {/* 1) 상태 판 */}
            <section className="rw-hero" aria-labelledby="rw-hero-title">
                <div className="rw-hero-main">
                    <p className="rw-kicker">MY RECOMMENDATION</p>
                    <h2 id="rw-hero-title">{mode.title}</h2>
                    <p className="rw-hero-sub">{mode.sub}</p>
                    <div className="rw-hero-switch">
                        <Switch
                            checked={on}
                            disabled={disabled}
                            label="맞춤 추천 전체"
                            tone="pink"
                            onChange={(next) => onSave({ enabled: next }, next ? "맞춤 추천을 켰습니다." : "맞춤 추천을 껐습니다.")}
                        />
                        <span>맞춤 추천 전체 · 끄면 아래 선택과 관계없이 회원 정보를 쓰지 않아요</span>
                    </div>
                </div>
                {/* 추천 재료 흐름 */}
                <div className="rw-flow" aria-label="지금 추천에 쓰는 재료">
                    <ol>
                        {INGREDIENTS.map((item, index) => (
                            <li key={item.key} data-tone={item.tone} className={used[item.key] ? "is-on" : ""}>
                                {index > 0 && <b className="rw-plus" aria-hidden="true">+</b>}
                                <span className="rw-flow-art">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                                    <img src={item.art} alt="" aria-hidden="true" />
                                </span>
                                <small>{item.title}</small>
                                <em>{used[item.key] ? "쓰는 중" : item.key === "behavior" ? "준비 중" : "안 씀"}</em>
                            </li>
                        ))}
                    </ol>
                    <div className="rw-flow-out">
                        <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                        <span className="rw-flow-badge"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />{mode.badge}</span>
                    </div>
                </div>
            </section>

            {/* 2) 재료 카드 셋 */}
            <section className="rw-sec" aria-labelledby="rw-ing-title">
                <header className="rw-sec-head">
                    <span className="rw-no">1</span>
                    <div>
                        <h2 id="rw-ing-title">추천에 쓸 재료 고르기</h2>
                        <p>켠 재료만 추천에 써요. 언제든 끄면 바로 빠져요.</p>
                    </div>
                </header>
                <div className="rw-cards">
                    {INGREDIENTS.map((item) => {
                        const checked = item.key === "profile" ? preferences.profileSignalsEnabled : item.key === "petlens" ? preferences.petLensSignalsEnabled : false;
                        return (
                            <article key={item.key} className={`rw-card${checked ? " is-on" : ""}${item.key === "behavior" ? " is-soon" : ""}`} data-tone={item.tone}>
                                <div className="rw-card-top">
                                    <span className="rw-card-art">
                                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                        <img src={item.art} alt="" aria-hidden="true" />
                                    </span>
                                    {item.key === "behavior" && <span className="rw-soon">준비 중</span>}
                                </div>
                                <p className="rw-card-kicker">{item.kicker}</p>
                                <h3>{item.title}</h3>
                                <p className="rw-card-desc">{item.desc}</p>
                                <ul className="rw-chips" aria-label="쓰는 정보">
                                    {item.chips.map((chip) => <li key={chip}>{chip}</li>)}
                                </ul>
                                <div className="rw-card-foot">
                                    {item.key === "behavior" ? (
                                        <span className="rw-off">꺼짐 · 아직 사용하지 않아요</span>
                                    ) : (
                                        <Switch
                                            checked={checked}
                                            disabled={disabled}
                                            label={item.key === "profile" ? "반려견 프로필 활용" : "펫렌즈 케어 신호 활용"}
                                            onChange={(next) => onSave(
                                                item.key === "profile" ? { profileSignalsEnabled: next } : { petLensSignalsEnabled: next },
                                                item.key === "profile"
                                                    ? (next ? "프로필 활용을 켰습니다." : "프로필 활용을 껐습니다.")
                                                    : (next ? "현재 동의 버전으로 펫렌즈 케어 신호 활용을 켰습니다." : "펫렌즈 케어 신호 활용을 껐습니다."),
                                            )}
                                        />
                                    )}
                                    {!on && item.key !== "behavior" && <span className="rw-paused">전체가 꺼져 있어 쓰지 않아요</span>}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            {/* 3) 기본 추천 반려견 */}
            <section className="rw-sec" aria-labelledby="rw-pet-title">
                <header className="rw-sec-head">
                    <span className="rw-no">2</span>
                    <div>
                        <h2 id="rw-pet-title">먼저 추천받을 아이</h2>
                        <p>홈과 전체 추천에서 먼저 보여줄 반려견이에요. 최근 분석 시각으로 자동으로 바뀌지 않아요.</p>
                    </div>
                </header>
                {pets.length > 0 ? (
                    <div className="rw-pets" role="radiogroup" aria-label="기본 추천 반려견">
                        {pets.map((pet) => {
                            const active = pet.apiProfileId === selectedId;
                            return (
                                <button
                                    key={pet.apiProfileId}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    disabled={disabled}
                                    className={`rw-pet${active ? " is-on" : ""}`}
                                    onClick={() => { if (!active) onSave({ selectedPetProfileId: pet.apiProfileId }, "기본 추천 반려견을 변경했습니다."); }}
                                >
                                    <span className={`rw-pet-face${pet.photoDataUrl ? " is-photo" : ""}`}>
                                        {/* eslint-disable-next-line @next/next/no-img-element -- 회원 사진(data URL) · 3D 그림 */}
                                        <img src={pet.photoDataUrl || "/images/ui/stickers/my-pets.webp"} alt="" aria-hidden="true" />
                                    </span>
                                    <span className="rw-pet-text">
                                        <b>{pet.name || "우리 아이"}</b>
                                        {pet.breed && <small>{pet.breed}</small>}
                                    </span>
                                    <span className="rw-pet-mark" aria-hidden="true">{active ? <><i className="fa-solid fa-check" />기본</> : "고르기"}</span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rw-empty">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src="/images/ui/stickers/my-pets.webp" alt="" aria-hidden="true" />
                        <span>서버에 저장된 반려견 프로필이 없습니다.</span>
                        <Link href="/mypage/#pet-profiles">프로필 등록하기</Link>
                    </div>
                )}
            </section>

            {/* 4) 내 데이터 관리 */}
            <section className="rw-sec" aria-labelledby="rw-data-title">
                <header className="rw-sec-head">
                    <span className="rw-no">3</span>
                    <div>
                        <h2 id="rw-data-title">내 데이터 확인 · 관리</h2>
                        <p>추천 화면에서는 원문을 보여주지 않습니다. 각 화면에서 직접 확인하거나 수정할 수 있어요.</p>
                    </div>
                </header>
                <div className="rw-tiles">
                    <Tile href="/mypage/#pet-profiles" art="/images/ui/stickers/my-pets.webp" title="반려견 프로필 수정" sub="체형 · 활동량 · 관심사" tone="mint" go="inside" />
                    <Tile href={analysisHref} art="/images/ui/header-petlens-128.webp" title="분석 기록 확인" sub="펫렌즈 · 행동 분석 요약" tone="lav" go="inside" />
                    <MypageInquiryLink
                        href="/inquiry/?category=other#inquiry-form"
                        className="rw-tile"
                        data-tone="pink"
                        data-go="modal"
                        preset={{
                            kicker: "MY DATA",
                            title: "분석 결과 삭제 요청",
                            sub: "지우고 싶은 분석 기록(반려견 이름 · 날짜)을 적어 주세요. 확인 후 처리 결과를 알려 드려요.",
                            art: "/images/ui/lab-summary-256.webp",
                            category: "other",
                            subject: "[기타 문의] 분석 결과 삭제 요청",
                            hint: "처리 결과는 입력한 이메일로 알려 드려요.",
                        }}
                    >
                        <TileInner art="/images/ui/lab-summary-256.webp" title="분석 결과 삭제 요청" sub="이 창에서 바로 요청" />
                    </MypageInquiryLink>
                    <Tile href="/privacy/" art="/images/ui/policy-info-192.webp" title="개인정보 처리 안내" sub="추천에 쓰는 정보 기준" tone="sky" />
                </div>
                <p className="rw-consent"><i className="fa-solid fa-shield-heart" aria-hidden="true" />동의 기준: {preferences.consentVersion}</p>
            </section>
        </div>
    );
}

function TileInner({ art, title, sub }: { art: string; title: string; sub: string }): ReactNode {
    return (
        <>
            <span className="rw-tile-art">
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img src={art} alt="" aria-hidden="true" />
            </span>
            <span className="rw-tile-text"><b>{title}</b><small>{sub}</small></span>
        </>
    );
}

function Tile({ href, art, title, sub, tone, go }: { href: string; art: string; title: string; sub: string; tone: string; go?: string }) {
    return (
        <Link href={href} className="rw-tile" data-tone={tone} data-go={go}>
            <TileInner art={art} title={title} sub={sub} />
        </Link>
    );
}
