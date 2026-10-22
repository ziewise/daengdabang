"use client";

/*
 * MyPetHub — 웹 "우리 아이 기록"(/my-pet/) 화면
 * ---------------------------------------------------------------------
 * 2026-10-22 사용자 선택 "우리 아이 그림책": 펼친 그림책(왼쪽 쪽 = 주인공 소개, 오른쪽 쪽 = 주간 사진 이야기)
 * + 새 쪽 그리기(주간 촬영) + 지난 쪽 모아보기(히스토리) + 그림책 부록(별도 기능 바로가기).
 * 기능은 그대로: 기록 불러오기(loadWeeklyPhotoAnalyses) · 주간 촬영(WeeklyPhotoComparison) · 아이 바꾸기 · ?profile= 선택.
 * 새로 생긴 "다른 쪽 펼치기"는 이미 불러온 기록 중 하나를 그림책에 보여 줄 뿐(서버 요청 없음).
 * 꾸밈 CSS 는 app/daily-web.css 의 dw-book* (웹 data-daily-web 범위). 앱의 /my-pet 은 앱 리포트 화면이라 이 화면은 웹 전용.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import WeeklyPhotoComparison from "@/components/my-pet/WeeklyPhotoComparison";
import { useAuth, type PetProfile } from "@/lib/store";
import { PETLENS_PHOTO_VIEWS } from "@/lib/petlens-multiview";
import {
    loadWeeklyPhotoAnalyses,
    type WeeklyPhotoAnalysisRecord,
} from "@/lib/weekly-photo-analysis";

function formatDate(value?: string) {
    if (!value) return "아직 기록 없음";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "기록 날짜 확인 필요";
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

// 그림책 쪽 머리에 쓰는 짧은 날짜("10월 21일")
function formatShortDate(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" }).format(date);
}

// 촬영 방향 그림(정면 · 왼쪽 · 오른쪽 · 뒷면)
const VIEW_ICONS: Record<string, string> = {
    front: "fa-face-smile",
    left: "fa-arrow-left",
    right: "fa-arrow-right",
    back: "fa-arrow-rotate-left",
};

// 지난 쪽 카드 바탕 차례(분홍 · 노랑 · 민트 · 하늘 · 보라)
const PAGE_TINTS = ["is-pink", "is-yellow", "is-mint", "is-sky", "is-lav"];

// 주인공 소개 칸 — 값이 없으면 "아직 몰라요" 류로
function petFacts(pet: PetProfile) {
    const sex = pet.sex === "female" ? "여아" : pet.sex === "male" ? "남아" : "";
    const neutered = pet.neutered === "yes" ? "중성화" : pet.neutered === "no" ? "중성화 전" : "";
    return [
        { key: "breed", icon: "fa-dog", label: "견종", value: pet.breed || "견종 확인 전", tint: "is-pink" },
        { key: "age", icon: "fa-cake-candles", label: "나이", value: pet.age || "나이 기록 전", tint: "is-yellow" },
        { key: "weight", icon: "fa-weight-scale", label: "체중", value: pet.weightKg ? `${pet.weightKg}kg` : "체중 기록 전", tint: "is-mint" },
        { key: "sex", icon: "fa-venus-mars", label: "성별", value: [sex, neutered].filter(Boolean).join(" · ") || "기록 전", tint: "is-sky" },
        { key: "care", icon: "fa-heart", label: "관심 케어", value: pet.concerns.length ? pet.concerns.slice(0, 2).join(", ") : "아직 선택 전", tint: "is-pink" },
        { key: "allergy", icon: "fa-triangle-exclamation", label: "알레르기", value: pet.allergies?.length ? pet.allergies.slice(0, 2).join(", ") : "등록 없음", tint: "is-yellow" },
    ];
}

// 크레파스로 그린 낙서(발바닥 · 뼈다귀 · 하트 · 별) — 결은 #dw-crayon-grain 필터
function CrayonDoodle({ kind, className = "" }: { kind: "paw" | "bone" | "heart" | "star"; className?: string }) {
    return (
        <svg viewBox="0 0 48 48" className={`dw-doodle ${className}`} aria-hidden="true" focusable="false">
            <g filter="url(#dw-crayon-grain)" fill="currentColor">
                {kind === "paw" && (
                    <>
                        <ellipse cx="24" cy="31" rx="9.5" ry="8" />
                        <circle cx="12.5" cy="20" r="4.2" />
                        <circle cx="19.5" cy="12.5" r="4.2" />
                        <circle cx="28.5" cy="12.5" r="4.2" />
                        <circle cx="35.5" cy="20" r="4.2" />
                    </>
                )}
                {kind === "bone" && (
                    <>
                        <rect x="12" y="20" width="24" height="8" rx="4" />
                        <circle cx="12" cy="19" r="5" />
                        <circle cx="12" cy="29" r="5" />
                        <circle cx="36" cy="19" r="5" />
                        <circle cx="36" cy="29" r="5" />
                    </>
                )}
                {kind === "heart" && <path d="M24 40C8 28 6 16 15 12c5-2 8 1 9 4 1-3 4-6 9-4 9 4 7 16-9 28z" />}
                {kind === "star" && <path d="M24 6l5 11 12 1.5-9 8.5 2.5 12L24 33l-10.5 6 2.5-12-9-8.5L19 17z" />}
            </g>
        </svg>
    );
}

export default function MyPetHub() {
    const { hydrated, user } = useAuth();
    const [selectedPetId, setSelectedPetId] = useState<number | undefined>();
    // 그림책에 펼친 주간 기록(없으면 가장 최근 기록)
    const [openedRecordId, setOpenedRecordId] = useState<string | undefined>();
    const bookRef = useRef<HTMLDivElement>(null);
    const [weeklyState, setWeeklyState] = useState<{
        profileId?: number;
        items: WeeklyPhotoAnalysisRecord[];
        loading: boolean;
        error?: string;
    }>({ items: [], loading: false });
    const pet = user?.pets.find((candidate) => candidate.apiProfileId === selectedPetId) || user?.pets[0];
    const petProfileId = pet?.apiProfileId;
    const accessToken = user?.apiAccessToken;
    const weeklyHistory = weeklyState.profileId === petProfileId ? weeklyState.items : [];
    const weeklyLoading = Boolean(petProfileId && accessToken)
        && (weeklyState.profileId !== petProfileId || weeklyState.loading);
    const latestWeekly = weeklyHistory[0];
    const openedIndex = Math.max(0, weeklyHistory.findIndex((item) => item.id === openedRecordId));
    const openedWeekly = weeklyHistory[openedIndex];
    const openedPrevious = weeklyHistory[openedIndex + 1];

    useEffect(() => {
        const profileId = Number(new URLSearchParams(window.location.search).get("profile"));
        const timer = window.setTimeout(() => {
            if (Number.isInteger(profileId) && profileId > 0 && user?.pets.some((item) => item.apiProfileId === profileId)) {
                setSelectedPetId(profileId);
            }
        }, 0);
        return () => window.clearTimeout(timer);
    }, [user?.pets]);

    useEffect(() => {
        if (!petProfileId || !accessToken) return;
        let active = true;
        const timer = window.setTimeout(() => {
            if (!active) return;
            setWeeklyState({ profileId: petProfileId, items: [], loading: true });
            void loadWeeklyPhotoAnalyses({
                petProfileId,
                accessToken,
                limit: 8,
            }).then((items) => {
                if (active) setWeeklyState({ profileId: petProfileId, items, loading: false });
            }).catch(() => {
                if (active) setWeeklyState({
                    profileId: petProfileId,
                    items: [],
                    loading: false,
                    error: "주간 사진 기록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
                });
            });
        }, 0);
        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [accessToken, petProfileId]);

    // 지난 쪽을 누르면 그 기록을 그림책에 펼치고 그림책으로 올라감
    const openPage = (recordId: string) => {
        setOpenedRecordId(recordId);
        bookRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    if (!hydrated) {
        return <main className="mx-auto grid min-h-[50vh] w-full max-w-[1280px] place-items-center px-4 py-10 text-sm font-black text-neutral-500" data-daily-web>우리 아이 기록을 불러오는 중입니다.</main>;
    }

    if (!user) {
        return (
            <main className="mx-auto w-full max-w-[860px] px-4 py-14 text-center md:px-6" data-daily-web>
                <div className="dw-gate dw-tint-sky">
                    <span className="dw-gate-art" aria-hidden="true">
                        <Image src="/images/ui/daily-hero-mypet-384.webp" alt="" width={170} height={170} priority />
                    </span>
                    <h1 className="ddb-crayon-title dw-h2">우리 아이 기록은 로그인 후 볼 수 있어요</h1>
                    <p className="dw-sub">선택한 우리 아이의 주간 사진 분석과 변화 기록을 회원 계정에 안전하게 연결합니다.</p>
                    <Link href="/auth/login/?redirect=%2Fmy-pet" className="ddb-crayon-link dw-pill dw-pill-main mt-6">로그인하기</Link>
                </div>
            </main>
        );
    }

    if (!pet) {
        return (
            <main className="mx-auto w-full max-w-[860px] px-4 py-14 text-center md:px-6" data-daily-web>
                <div className="dw-gate dw-tint-yellow">
                    <span className="dw-gate-art" aria-hidden="true">
                        <Image src="/images/ui/daily-care-256.webp" alt="" width={150} height={150} priority />
                    </span>
                    <h1 className="ddb-crayon-title dw-h2">먼저 우리 아이를 등록해 주세요</h1>
                    <p className="dw-sub">프로필이 생기면 주간 사진 분석과 건강 관찰 기록이 이곳에 차곡차곡 쌓입니다.</p>
                    <Link href="/mypage/?profile=required#pet-profiles" className="ddb-crayon-link dw-pill dw-pill-main mt-6">반려견 등록하기</Link>
                </div>
            </main>
        );
    }

    const switchablePets = user.pets.filter((item) => item.apiProfileId);
    // 쪽 번호: 1쪽 = 주인공 소개, 주간 기록은 오래된 것부터 2쪽 · 3쪽 …
    const pageNumber = (index: number) => weeklyHistory.length - index + 1;

    return (
        <main className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-6 md:py-14" data-my-pet-hub data-daily-web>
            {/* 크레파스 결 필터 — 낙서 그림이 같이 씀 */}
            <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
                <filter id="dw-crayon-grain" x="-10%" y="-10%" width="120%" height="120%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" result="wobble" />
                    <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.7 1.5" result="grain" />
                    <feComposite in="wobble" in2="grain" operator="in" />
                </filter>
            </svg>

            {/* 그림책 제목 — 발바닥 낙서가 둘레를 걸어감 */}
            <header className="dw-book-head">
                <CrayonDoodle kind="paw" className="dw-doodle-a" />
                <CrayonDoodle kind="paw" className="dw-doodle-b" />
                <CrayonDoodle kind="heart" className="dw-doodle-c" />
                <CrayonDoodle kind="bone" className="dw-doodle-d" />
                <p className="ddb-crayon-kicker dw-kicker">MY PET PICTURE BOOK</p>
                <h1 className="ddb-crayon-title ddb-crayon-underline dw-book-title">{pet.name}의 그림책</h1>
                <p className="dw-sub">매주 한 쪽씩, {pet.name}의 모습이 그림책으로 차곡차곡 쌓여요.</p>
            </header>

            <section id="health-report" className="scroll-mt-28" aria-labelledby="health-report-title">
                {weeklyState.error && weeklyState.profileId === petProfileId && (
                    <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700" role="alert">{weeklyState.error}</p>
                )}

                {/* 펼친 그림책 — 분홍 크레파스 표지 위에 두 쪽 */}
                <div ref={bookRef} className="dw-book-cover scroll-mt-28">
                    <div className="dw-book">
                        {/* 왼쪽 쪽 — 이 책의 주인공 */}
                        <div className="dw-book-page dw-book-left">
                            <CrayonDoodle kind="heart" className="dw-page-doodle is-left" />
                            <p className="dw-hand dw-hand-pink">이 책의 주인공</p>
                            <div className="dw-book-hero">
                                <div className="dw-book-ring">
                                    <div>
                                        {pet.photoDataUrl ? (
                                            <Image src={pet.photoDataUrl} alt={`${pet.name} 프로필`} fill sizes="200px" className="object-cover" unoptimized />
                                        ) : (
                                            <Image src="/images/ui/logo-poodle-384.webp" alt="" width={170} height={170} className="dw-book-ring-art" aria-hidden="true" />
                                        )}
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <h2 className="dw-book-name">{pet.name}</h2>
                                    <p className="dw-hand dw-hand-soft">{[pet.age, pet.breed].filter(Boolean).join(" ") || "우리 집 귀염둥이"}</p>
                                    <p className="dw-book-count"><i className="fa-solid fa-book-open" aria-hidden="true" />{latestWeekly ? `주간 기록 ${weeklyHistory.length}쪽 · 최근 ${formatShortDate(latestWeekly.analyzedAt)}` : "첫 쪽을 기다리는 중"}</p>
                                </div>
                            </div>

                            <p className="dw-hand dw-hand-pink mt-7">주인공을 소개해요</p>
                            <dl className="dw-book-facts">
                                {petFacts(pet).map((fact) => (
                                    <div key={fact.key}>
                                        <span className={`dw-book-fact-icon ${fact.tint}`} aria-hidden="true"><i className={`fa-solid ${fact.icon}`} /></span>
                                        <div className="min-w-0">
                                            <dt>{fact.label}</dt>
                                            <dd>{fact.value}</dd>
                                        </div>
                                    </div>
                                ))}
                            </dl>

                            <div className="dw-book-switch">
                                {switchablePets.length > 1 && <p className="dw-book-switch-label">다른 아이 그림책</p>}
                                <div className="flex flex-wrap gap-2">
                                    {switchablePets.length > 1 && switchablePets.map((item) => (
                                        <button key={item.apiProfileId} type="button" onClick={() => { setSelectedPetId(item.apiProfileId); setOpenedRecordId(undefined); }} className={`dw-book-pill ${item.apiProfileId === pet.apiProfileId ? "is-on" : ""}`} aria-pressed={item.apiProfileId === pet.apiProfileId}>
                                            <i className="fa-solid fa-paw" aria-hidden="true" />{item.name}
                                        </button>
                                    ))}
                                    <Link href="/mypage/#pet-profiles" className="dw-book-pill is-edit"><i className="fa-solid fa-pen" aria-hidden="true" />프로필 고치기</Link>
                                </div>
                            </div>
                            <span className="dw-book-no is-left" aria-hidden="true">1</span>
                        </div>

                        {/* 오른쪽 쪽 — 펼친 주의 사진 이야기 */}
                        <div className="dw-book-page dw-book-right" aria-live="polite">
                            <CrayonDoodle kind="bone" className="dw-page-doodle is-right" />
                            {weeklyLoading ? (
                                <div className="dw-book-blank">
                                    <CrayonDoodle kind="paw" className="dw-book-blank-paw" />
                                    <p className="dw-hand dw-hand-sky">그림책을 펼치는 중이에요</p>
                                    <p className="mt-1 text-sm font-bold text-neutral-500">주간 사진 기록을 불러오는 중입니다.</p>
                                </div>
                            ) : openedWeekly ? (
                                <>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="dw-hand dw-hand-sky">{formatShortDate(openedWeekly.analyzedAt)} 이야기{openedIndex === 0 ? " · 최근" : ""}</p>
                                        <span className="dw-book-chips">
                                            <span className="is-sky">{openedWeekly.viewCount}방향</span>
                                            {openedWeekly.photoQualityLabel && <span className="is-yellow">{openedWeekly.photoQualityLabel}</span>}
                                        </span>
                                    </div>
                                    <h3 className="dw-book-story-title">{openedWeekly.title || "저장된 주간 사진 분석"}</h3>
                                    {openedWeekly.description && <p className="dw-book-story-body">{openedWeekly.description}</p>}
                                    <ul className="dw-book-ticks">
                                        {(openedWeekly.careActions.length ? openedWeekly.careActions : openedWeekly.observations).slice(0, 4).map((item) => <li key={item}>{item}</li>)}
                                    </ul>
                                    <div className="dw-book-compare">
                                        <p className="dw-hand dw-hand-pink">
                                            {openedPrevious || openedWeekly.comparison.previousAnalyzedAt
                                                ? `지난 쪽(${formatShortDate(openedWeekly.comparison.previousAnalyzedAt || openedPrevious?.analyzedAt)})과 비교하면`
                                                : "이전 주와 비교"}
                                        </p>
                                        <p className="dw-book-compare-head">{openedWeekly.comparison.headline}</p>
                                        {openedWeekly.comparison.status === "ready" ? (
                                            <ul className="dw-book-compare-list">
                                                {openedWeekly.comparison.newObservations.slice(0, 2).map((item) => <li key={item}><i className="fa-solid fa-wand-magic-sparkles text-orange-500" aria-hidden="true" /><span>새로 확인: {item}</span></li>)}
                                                {openedWeekly.comparison.commonObservations.slice(0, 2).map((item) => <li key={item}><i className="fa-solid fa-equals text-teal-600" aria-hidden="true" /><span>공통 확인: {item}</span></li>)}
                                            </ul>
                                        ) : <p className="mt-1 text-xs font-bold leading-5 text-neutral-500">다음 주 같은 방향 사진이 쌓이면 변화 여부를 단정하지 않고 확인된 항목만 비교합니다.</p>}
                                    </div>
                                    <p className="dw-book-when">{formatDate(openedWeekly.analyzedAt)} 기록</p>
                                </>
                            ) : (
                                <div className="dw-book-blank">
                                    <Image src="/images/ui/daily-checkin-256.webp" alt="" width={110} height={110} aria-hidden="true" className="mx-auto" />
                                    <p className="dw-hand dw-hand-sky mt-2">아직 비어 있는 쪽이에요</p>
                                    <p className="mt-1 text-sm font-black text-neutral-800">실시간 카메라로 이번 주 첫 사진을 남겨 보세요.</p>
                                    <p className="mt-1 text-xs font-bold leading-5 text-neutral-500">첫 주간 분석은 비교 기준이 되고, 다음 기록부터 이전 주와 나란히 표시됩니다.</p>
                                </div>
                            )}
                            <span className="dw-book-no is-right" aria-hidden="true">{openedWeekly ? pageNumber(openedIndex) : 2}</span>
                        </div>
                    </div>
                </div>
                <p className="dw-book-fine">이 리포트는 사진에서 확인된 관찰 항목을 정리하며, 촬영 조건에 따라 달라질 수 있고 수의학적 진단을 대신하지 않습니다.</p>

                {/* 그림책에서 새 쪽으로 걸어 내려가는 발자국 */}
                <div className="dw-paw-trail" aria-hidden="true">
                    {[0, 1, 2, 3].map((step) => <CrayonDoodle key={step} kind="paw" />)}
                </div>

                {/* 새 쪽 찍기 — 크레파스 카메라(2026-10-22 사용자 선택 N2): 크레파스 렌즈 + 네 방향 순서 + 주간 촬영(기존 WeeklyPhotoComparison) */}
                <div className="dw-cam">
                    <span className="dw-cam-flash" aria-hidden="true" />
                    <div className="dw-cam-lens" aria-hidden="true">
                        <div className="dw-cam-glass">
                            <span className="dw-cam-shine" />
                            <CrayonDoodle kind="paw" className="dw-cam-paw" />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <p className="ddb-crayon-kicker dw-kicker">AI 주간 사진 변화 리포트</p>
                        <h2 id="health-report-title" className="ddb-crayon-title dw-cam-title">찰칵! 이번 주 {pet.name}의 모습을 담아 볼까요?</h2>
                        <p className="dw-cam-sub">새로 촬영한 사진은 선택한 {pet.name}의 주간 기록으로만 저장되며, 최초 등록 사진을 덮어쓰지 않습니다.</p>
                        <ol className="dw-cam-steps" aria-label="촬영 방향 순서">
                            {PETLENS_PHOTO_VIEWS.map((view, index) => (
                                <li key={view.id}>
                                    <span aria-hidden="true"><i className={`fa-solid ${VIEW_ICONS[view.id]}`} /></span>
                                    <strong>{index + 1}. {view.label}</strong>
                                    <small>{view.helper}</small>
                                </li>
                            ))}
                        </ol>
                        <div className="dw-cam-action">
                            {pet.apiProfileId && accessToken ? (
                                <WeeklyPhotoComparison
                                    key={pet.apiProfileId}
                                    pet={pet}
                                    history={weeklyHistory}
                                    onCompleted={(record) => {
                                        setOpenedRecordId(undefined);
                                        setWeeklyState((current) => ({
                                            profileId: pet.apiProfileId,
                                            loading: false,
                                            items: [record, ...current.items.filter((item) => item.id !== record.id)].slice(0, 8),
                                        }));
                                    }}
                                />
                            ) : (
                                <Link href="/auth/login/?redirect=%2Fmy-pet" className="ddb-crayon-link dw-pill dw-pill-main">다시 로그인하고 사진 남기기</Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* 지난 쪽 모아보기 — 누르면 그림책에 펼침 */}
                {weeklyHistory.length > 0 && (
                    <div className="dw-pages" data-weekly-photo-history>
                        <div className="dw-pages-head">
                            <h3 className="ddb-crayon-title ddb-crayon-underline dw-pages-title">주간 사진 히스토리</h3>
                            <span className="dw-hand dw-hand-soft">지난 쪽을 누르면 그림책에 펼쳐져요 · 최근 {weeklyHistory.length}회</span>
                        </div>
                        <ol className="dw-pages-list">
                            {weeklyHistory.map((item, index) => (
                                <li key={item.id}>
                                    <button type="button" onClick={() => openPage(item.id)} className={`dw-page-card ${PAGE_TINTS[index % PAGE_TINTS.length]} ${item.id === openedWeekly?.id ? "is-open" : ""}`} aria-pressed={item.id === openedWeekly?.id}>
                                        <span className="dw-page-no">{pageNumber(index)}쪽</span>
                                        <span className="dw-page-date">{index === 0 ? "최근 · " : ""}{formatShortDate(item.analyzedAt)}</span>
                                        <strong className="dw-page-title">{item.title || "주간 사진 분석"}</strong>
                                        <span className="dw-page-views" aria-label={`${item.viewCount}방향 촬영`}>
                                            {PETLENS_PHOTO_VIEWS.map((view) => <i key={view.id} className={item.viewIds.includes(view.id) ? "is-on" : ""} />)}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </section>

            {/* 그림책 부록 — 둥근 쿠션 셋(2026-10-22 사용자 선택 N2): 펫렌즈 · 행동·소리 · 케어톡(모두 기존 페이지) */}
            <section className="dw-appendix" aria-labelledby="dw-appendix-title">
                <div className="dw-appendix-head">
                    <p className="ddb-crayon-kicker dw-kicker">BOOK APPENDIX</p>
                    <h2 id="dw-appendix-title" className="ddb-crayon-title ddb-crayon-underline dw-pages-title">그림책과 함께 쓰면 좋아요</h2>
                </div>
                <div className="dw-rounds">
                    {[
                        { href: "/pet-lens/", art: "/images/ui/pet-lens-v2-256.webp", title: "펫렌즈 사진 분석", body: "오늘 모습을 한 장으로 바로 살펴봐요.", go: "바로 살펴보기", tint: "is-pink" },
                        { href: "/pet-lens/?mode=observation#observation", art: "/images/ui/menu-lab-observation-128.webp", title: "행동·소리 분석", body: "궁금한 행동·소리 영상을 따로 관찰해요.", go: "열어 보기", tint: "is-lav" },
                        { href: "/chat/", art: "/images/ui/caretalk-web-128.webp", title: "케어톡 상담", body: "그림책을 보다 궁금한 점을 물어봐요.", go: "물어보기", tint: "is-yellow" },
                    ].map((item) => (
                        <Link key={item.href} href={item.href} className={`dw-round ${item.tint}`}>
                            <span className="dw-round-art" aria-hidden="true"><Image src={item.art} alt="" width={120} height={120} /></span>
                            <strong className="dw-round-title">{item.title}</strong>
                            <span className="dw-round-body">{item.body}</span>
                            <span className="dw-round-go">{item.go} <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" /></span>
                        </Link>
                    ))}
                </div>
                <p className="dw-appendix-note">
                    <i className="fa-solid fa-circle-info" aria-hidden="true" />
                    <span><strong id="independent-observation-title">행동·소리 분석은 등록한 우리 아이와 별개예요.</strong> 궁금한 강아지의 행동·소리 영상을 관찰하는 독립 기능이며, 주간 사진 변화 기록과 섞이지 않습니다. <Link href="/pet-lens/?mode=observation#observation" className="dw-appendix-note-link">행동·소리 분석 열기</Link></span>
                </p>
            </section>
        </main>
    );
}
