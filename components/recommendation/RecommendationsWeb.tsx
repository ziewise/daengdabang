/**
 * RecommendationsWeb — 웹 맞춤 추천 페이지(/recommendations) 겉모양 · 2026-10-25
 * ---------------------------------------------------------------------
 * 추천 계산 · 데이터 설정 · 숨기기 · 기록은 app/recommendations/RecommendationsClient 그대로, 이 파일은 결과만 받아 그림.
 *  - 머리 판(분홍~연보라 파스텔 쿠션): 손글씨 꼬리표 · 주아 제목 + 세 색 밑줄 · 지금 상태 한 줄 · 추천 방식/안전 알약 ·
 *    오른쪽 3D 그림, 아이 고르기(기존 RecommendationPetSelector) · 추천 데이터 관리
 *  - 이렇게 골라요 세 칸(추천에 쓰는 것 · 펫렌즈 신호 · 쓰지 않는 것) — 기존 화면 문구 범위 안에서만
 *  - 다음 할 일 판(로그인 · 프로필 등록 · 설정 확인)과 확인 중/오류 판
 *  - 이유별 묶음: 색 동그라미 아이콘 · 주아 제목 · 개수 알약 + 기존 추천 카드(이유 칸은 CSS 로 파스텔)
 *  - 빈 상태: 크림 쿠션 · 3D 그림 · 알약 단추
 * 웹(html:not(.ddb-app-mode))에서만 그려짐 — 앱은 기존 화면 그대로.
 */
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import RecommendationPetSelector from "@/components/recommendation/RecommendationPetSelector";
import RecommendationProductCard from "@/components/recommendation/RecommendationProductCard";
import type { RecommendationItem, RecommendationMode, RecommendationReasonCode } from "@/lib/recommendation";
import type { PetProfile } from "@/lib/store";
import "@/app/recommend-web.css";

const UI = "/images/ui/";

/** 이유별 묶음 아이콘 · 색 */
const GROUP_LOOK: Record<RecommendationReasonCode, { icon: string; tone: string }> = {
    matches_size: { icon: "fa-ruler-combined", tone: "sky" },
    matches_life_stage: { icon: "fa-seedling", tone: "mint" },
    matches_activity: { icon: "fa-person-running", tone: "yellow" },
    matches_coat_care: { icon: "fa-paw", tone: "lav" },
    matches_member_interest: { icon: "fa-heart", tone: "pink" },
    matches_petlens_fit_note: { icon: "fa-ruler", tone: "yellow" },
    matches_petlens_visibility: { icon: "fa-sun", tone: "sky" },
    matches_petlens_coat_care: { icon: "fa-camera", tone: "lav" },
    editorial_fallback: { icon: "fa-star", tone: "pink" },
};

export type RecommendationsWebProps = {
    title: string;
    lead: string;
    modeLabel: string;
    mode: RecommendationMode;
    personalizedAvailable: boolean;
    showPreferencesLink: boolean;
    petSelector: { pets: readonly PetProfile[]; selectedPetProfileId: number | null; disabled: boolean; onSelect: (id: number) => void } | null;
    /** 다음 할 일 판(로그인 · 프로필 · 설정) */
    action: { title: string; description: string; href: string; label: string; art: string } | null;
    /** 설정 확인 중 · 오류 */
    checking: { message: string; canRetry: boolean; onRetry: () => void } | null;
    notices: string[];
    groups: Array<[RecommendationReasonCode, RecommendationItem[]]>;
    groupTitle: Record<RecommendationReasonCode, string>;
    runId?: string;
    allHidden: boolean;
    onResetHidden: () => void;
    onProductClick: (productId: string) => void;
    onReasonOpened: (productId: string) => void;
    onHide: (productId: string) => void;
    mainAttrs: Record<string, string | boolean>;
};

export default function RecommendationsWeb(props: RecommendationsWebProps) {
    const total = props.groups.reduce((sum, [, items]) => sum + items.length, 0);
    return (
        <main className="rc-web" data-recommendations-page {...props.mainAttrs}>
            {/* 머리 판 */}
            <header className="rc-hero">
                <span className="rc-hero-text">
                    <span className="rc-kicker">PICKED FOR YOU</span>
                    <h1 className="rc-title">{props.title}</h1>
                    <p className="rc-lead">{props.lead}</p>
                    <span className="rc-chips">
                        <span><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />{props.modeLabel}</span>
                        <span className="is-mint"><i className="fa-solid fa-shield-heart" aria-hidden="true" />질환·치료 효능을 추천 이유로 사용하지 않음</span>
                    </span>
                </span>
                <span className="rc-hero-side">
                    <span className="rc-hero-art" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}stickers/my-recommend.webp`} alt="" />
                    </span>
                    {props.showPreferencesLink && (
                        <Link href="/mypage/recommendations/" className="rc-manage"><i className="fa-solid fa-sliders" aria-hidden="true" />추천 데이터 관리</Link>
                    )}
                </span>
            </header>

            {props.petSelector && (
                <div className="rc-pets">
                    <RecommendationPetSelector
                        pets={props.petSelector.pets}
                        selectedPetProfileId={props.petSelector.selectedPetProfileId}
                        disabled={props.petSelector.disabled}
                        onSelect={props.petSelector.onSelect}
                    />
                </div>
            )}

            {/* 이렇게 골라요 */}
            <ul className="rc-how" aria-label="추천을 고르는 방법">
                <HowItem tone="sky" icon="fa-dog" title="우리 아이 프로필" text="체형 · 생애단계 · 활동량 · 직접 등록한 관심사를 살펴요." />
                <HowItem tone="lav" icon="fa-camera" title="동의한 펫렌즈 신호만" text="사용에 동의한 케어 신호만 반영하고, 끄면 프로필만 써요." />
                <HowItem tone="mint" icon="fa-shield-heart" title="효능은 이유로 쓰지 않아요" text="질환 · 치료 효능을 추천 이유로 사용하지 않아요." />
            </ul>

            {props.action && (
                <section className="rc-action">
                    <span className="rc-action-art" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}${props.action.art}`} alt="" />
                    </span>
                    <span className="rc-action-text">
                        <h2>{props.action.title}</h2>
                        <p>{props.action.description}</p>
                    </span>
                    <Link href={props.action.href} className="rc-pill is-pink">{props.action.label}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                </section>
            )}

            {props.checking && (
                <section className="rc-action is-amber" role="status">
                    <span className="rc-action-art" aria-hidden="true"><i className="fa-solid fa-hourglass-half" /></span>
                    <span className="rc-action-text">
                        <h2>{props.checking.message}</h2>
                        <p>확인 전에는 회원 정보를 사용하지 않고 편집 추천만 표시합니다.</p>
                    </span>
                    {props.checking.canRetry && <button type="button" className="rc-pill" onClick={props.checking.onRetry}>다시 확인</button>}
                </section>
            )}

            {props.notices.map((notice) => (
                <p key={notice} className="rc-notice"><i className="fa-solid fa-circle-info" aria-hidden="true" />{notice}</p>
            ))}

            {total > 0 ? (
                <div className="rc-groups" data-recommendation-run={props.runId}>
                    {props.groups.map(([reason, items]) => {
                        const look = GROUP_LOOK[reason] ?? GROUP_LOOK.editorial_fallback;
                        return (
                            <section key={reason} className="rc-group" data-tone={look.tone} aria-labelledby={`recommendation-group-${reason}`}>
                                <div className="rc-group-h">
                                    <span aria-hidden="true"><i className={`fa-solid ${look.icon}`} /></span>
                                    <h2 id={`recommendation-group-${reason}`}>{props.groupTitle[reason]}</h2>
                                    <em>{items.length}개</em>
                                </div>
                                <div className="rc-grid">
                                    {items.map((item) => (
                                        <RecommendationProductCard
                                            key={item.product.id}
                                            item={item}
                                            onProductClick={props.onProductClick}
                                            onReasonOpened={props.onReasonOpened}
                                            onHide={props.onHide}
                                        />
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            ) : props.allHidden ? (
                <Empty art="stickers/search-empty.webp" title="이 추천 묶음의 상품을 모두 숨겼어요." text="숨긴 상품은 언제든 다시 볼 수 있어요.">
                    <button type="button" className="rc-pill is-pink" onClick={props.onResetHidden}><i className="fa-solid fa-eye" aria-hidden="true" />숨긴 상품 다시 보기</button>
                </Empty>
            ) : (
                <Empty art="stickers/search-empty.webp" title="현재 안전 기준을 통과한 추천 상품이 없어요." text="프로필을 수정하거나 전체 상품을 직접 둘러볼 수 있어요.">
                    <Link href="/mypage/#pet-profiles" className="rc-pill"><i className="fa-solid fa-pen" aria-hidden="true" />프로필 수정</Link>
                    <Link href="/products/" className="rc-pill is-pink">전체 상품 보기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                </Empty>
            )}
        </main>
    );
}

function HowItem({ tone, icon, title, text }: { tone: string; icon: string; title: string; text: string }) {
    return (
        <li data-tone={tone}>
            <span aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
            <b>{title}</b>
            <small>{text}</small>
        </li>
    );
}

function Empty({ art, title, text, children }: { art: string; title: string; text: string; children: ReactNode }) {
    return (
        <section className="rc-empty">
            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
            <img src={`${UI}${art}`} alt="" aria-hidden="true" />
            <h2>{title}</h2>
            <p>{text}</p>
            <div>{children}</div>
        </section>
    );
}
