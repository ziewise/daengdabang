"use client";

/**
 * 스티커북 시안 — 건강 변화 리포트(/app/sticker/report) · 로컬 시안 전용, 배포 X
 * ---------------------------------------------------------------------
 * 협업자 마이펫 "AI 주간 사진 변화 리포트"(components/my-pet/MyPetHub.tsx #health-report)를 앱 전용 화면으로.
 * 보여 주는 정보 · 문구 · 조건은 웹과 똑같이(새로 더하지 않음), 모양만 스티커북으로 다시 그린다.
 *  - 머리: AI 주간 사진 변화 리포트 · 매주 같은 방향으로 비교해요 · 저장 안내 · 새 주간 분석 시작(와펜)
 *  - 이번 주 사진 분석(테이프 붙인 종이): {n}방향 · 사진 상태 · 제목 · 설명 · 케어 포인트(없으면 관찰 항목) 4개
 *    기록이 없으면 점선 폴라로이드 + "실시간 카메라로 이번 주 첫 사진을 남겨 보세요."
 *  - 이전 주와 비교(메모지): 한 줄 비교 · 최근/이전 날짜 메모 2장 · 새로 확인 2 · 공통 확인 2 (비교 근거 부족이면 안내 문장)
 *  - 주간 사진 히스토리(기록이 있을 때): 웹 그림책 "지난 쪽 모아보기"처럼 최근 8쪽 모두(2026-10-28 사용자 — 예전엔 4개만).
 *    쪽 메모 = n쪽 · 최근/날짜 · 제목 · 네 방향 점. 누르면 그 주 기록이 위 "사진 분석 · 이전 주와 비교"에 펼쳐짐(웹 openPage 와 같음)
 *  - 함께 써 보세요(웹 부록 MORE CARE와 같은 세 곳 — 펫렌즈 · 행동·소리 · 케어톡) · 프로필 고치기(앱 우리 아이)
 *  - 진단 아님 안내
 * 데이터: 실제 주간 기록(협업자 loadWeeklyPhotoAnalyses, 웹 마이펫과 같은 8개) — 배포 전 연결 2026-10-16.
 * 새 주간 분석 시작: 협업자 촬영 화면(WeeklyPhotoComparison)을 그대로 씀(버튼 · 창 모양만 앱 CSS) — 끝나면 새 기록을 맨 앞에(웹과 같음).
 * 로그인 전: 앱 로그인 초대(웹도 회원 전용 화면).
 * 반려견: 웹 MyPetHub 처럼 고를 수 있음(두 마리 이상이면 칩 · 주소 ?profile=N 으로 처음 고를 아이), 없으면 반려견 등록하기 와펜.
 * 불러오는 중 · 실패(분홍 메모) · 기록 없음을 웹 MyPetHub weeklyState 처럼 나눠 보여 줌.
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { haptic } from "../gestures";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { ConceptBar, HC_CSS, useDemoSession, useNow } from "../shared";
import { DiaryBody, PARTS_CSS } from "../sticker-parts";
import { LoginInvite, Patch, STICKER_CSS, Tape } from "../sticker-kit";
import WeeklyPhotoComparison from "@/components/my-pet/WeeklyPhotoComparison";
import { loadWeeklyPhotoAnalyses, type WeeklyPhotoAnalysisRecord } from "@/lib/weekly-photo-analysis";
import { PETLENS_PHOTO_VIEWS } from "@/lib/petlens-multiview";
import { cleanPetLensProfileId, PETLENS_PROFILE_SETUP_HREF } from "@/lib/petlens-routing";
import { useAuth, type PetProfile } from "@/lib/store";

const REDIRECT = "/app/sticker/report/";
/** 웹 마이펫 불러오기 실패 문구(MyPetHub weeklyState.error) 그대로 */
const WEEKLY_ERROR = "주간 사진 기록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";

/** 고를 수 있는 반려견 — 웹 MyPetHub 선택 칩 · AppAiCareOverview availablePets 와 같은 기준(apiProfileId 가 양의 정수) */
function availablePets(pets: PetProfile[]) {
    return pets.filter((p): p is PetProfile & { apiProfileId: number } => Number.isInteger(p.apiProfileId) && Number(p.apiProfileId) > 0);
}

/** 날짜 — 협업자 마이펫(MyPetHub formatDate)과 같은 표기 */
function formatDate(value?: string) {
    if (!value) return "아직 기록 없음";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "기록 날짜 확인 필요";
    return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** 쪽 머리 짧은 날짜("10월 21일") — 웹 MyPetHub formatShortDate 와 같은 표기 */
function formatShortDate(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" }).format(date);
}

/* 지난 쪽 메모 바탕 차례(분홍 · 노랑 · 민트 · 하늘 · 보라 — 웹 PAGE_TINTS 와 같은 순서) */
const PAGE_TONES = ["#ffeef3", "#fff6d6", "#e8f7ef", "#e9f4fb", "#f3f0fe"];
/* 함께 써 보세요 — 웹 마이펫 부록(MORE CARE)과 같은 세 곳 · 같은 그림 · 같은 글 */
const MORE_CARE = [
    { href: "/pet-lens/", art: "/images/ui/mypet-analysis-256.webp", title: "펫렌즈 사진 분석", body: "오늘 모습을 한 장으로 바로 살펴봐요.", tone: "#ffeef3", ink: "#c4456f" },
    { href: "/pet-lens/?mode=observation#observation", art: "/images/ui/menu-lab-observation-128.webp", title: "행동·소리 분석", body: "궁금한 행동·소리 영상을 따로 관찰해요.", tone: "#f3f0fe", ink: "#6a52c4" },
    { href: "/chat/", art: "/images/ui/mypet-caretalk-256.webp", title: "케어톡 상담", body: "기록을 보다 궁금한 점을 물어봐요.", tone: "#fff6d6", ink: "#a8720f" },
];

export default function StickerReport() {
    const [session, setSession] = useDemoSession();
    const member = session === "member";
    // 실제 반려견 · 주간 기록 — 웹 마이펫(MyPetHub)과 같은 불러오기(고른 반려견, 최근 8개)
    const { user } = useAuth();
    const allPets = user?.pets;
    const pets = useMemo(() => availablePets(allPets ?? []), [allPets]);
    // 반려견 고르기 — 웹 MyPetHub setSelectedPetId 와 같음(고르지 않았으면 첫 반려견)
    const [selectedPetId, setSelectedPetId] = useState<number | undefined>();
    const pet = pets.find((p) => p.apiProfileId === selectedPetId) || pets[0];
    const petName = pet?.name ?? "우리 아이";
    const petProfileId = pet?.apiProfileId;
    const accessToken = user?.apiAccessToken || "";
    // 주소 ?profile=N 으로 처음 고를 아이 — 웹 MyPetHub 와 같이(내 반려견일 때만, 검사는 협업자 cleanPetLensProfileId)
    useEffect(() => {
        const profileId = cleanPetLensProfileId(new URLSearchParams(window.location.search).get("profile"));
        const timer = window.setTimeout(() => {
            if (profileId && pets.some((p) => p.apiProfileId === profileId)) setSelectedPetId(profileId);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [pets]);
    // 불러오는 중 · 실패 · 기록 없음을 나눠 둠 — 웹 MyPetHub weeklyState(profileId · items · loading · error)와 같은 모양
    const [weeklyState, setWeeklyState] = useState<{ profileId?: number; items: WeeklyPhotoAnalysisRecord[]; loading: boolean; error?: string }>({ items: [], loading: false });
    useEffect(() => {
        if (!petProfileId || !accessToken) return;
        let active = true;
        const timer = window.setTimeout(() => {
            if (!active) return;
            setWeeklyState({ profileId: petProfileId, items: [], loading: true });
            loadWeeklyPhotoAnalyses({ petProfileId, accessToken, limit: 8 })
                .then((items) => { if (active) setWeeklyState({ profileId: petProfileId, items, loading: false }); })
                .catch(() => { if (active) setWeeklyState({ profileId: petProfileId, items: [], loading: false, error: WEEKLY_ERROR }); });
        }, 0);
        return () => { active = false; window.clearTimeout(timer); };
    }, [petProfileId, accessToken]);
    const loading = Boolean(petProfileId && accessToken) && (weeklyState.profileId !== petProfileId || weeklyState.loading);
    const loadError = weeklyState.profileId === petProfileId ? weeklyState.error : undefined;
    // 날짜는 화면을 그린 뒤에 — 서버와 기기의 날짜 표기(PM/오후)가 달라 생기는 충돌 방지
    const ready = useNow(3_600_000) !== null;
    const date = (value?: string) => (ready ? formatDate(value) : " ");

    const list = weeklyState.profileId === petProfileId ? weeklyState.items : [];
    // 펼친 쪽 — 웹 MyPetHub openedRecordId 와 같음(고르지 않았으면 최근 쪽). 지난 쪽을 누르면 그 주 기록을 위에 펼침
    const [openedId, setOpenedId] = useState<string | undefined>();
    const openedIndex = Math.max(0, list.findIndex((item) => item.id === openedId));
    const latest = list[openedIndex];
    const previous = list[openedIndex + 1];
    const isRecent = openedIndex === 0;
    const points = latest ? (latest.careActions.length ? latest.careActions : latest.observations).slice(0, 4) : [];
    const storyRef = useRef<HTMLElement>(null);
    const openPage = (id: string) => {
        haptic("light");
        setOpenedId(id);
        storyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    // 쪽 번호 — 웹과 같이 1쪽 = 주인공 소개, 주간 기록은 오래된 것부터 2쪽 · 3쪽 …
    const pageNumber = (index: number) => list.length - index + 1;

    return (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + REPORT_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">
                <ConceptBar session={session} onSession={setSession} />

                <DiaryBody pageKey={session} dir={1}>
                    {!member ? (
                        <LoginInvite redirect={REDIRECT} title={["로그인하고", "주간 리포트 보기"]} cta="로그인하고 보기"
                            items={[{ icon: "fa-camera", text: "매주 같은 방향 사진으로 변화 비교" }]} />
                    ) : !pet ? (
                        /* ── 반려견이 없을 때(또는 서버 프로필이 없을 때) — 웹 MyPetHub "먼저 우리 아이를 등록해 주세요" 화면과 같은 안내 + 반려견 등록하기.
                           등록 주소는 협업자 PETLENS_PROFILE_SETUP_HREF(마이페이지가 읽는 petProfile=required) ── */
                        <section className="rp-paper relative rounded-[14px] px-4 pb-5 pt-6 text-center" style={{ rotate: "-0.6deg" }}>
                            <Tape className="-top-2 left-1/2 h-4 w-16 -translate-x-1/2" color="rgba(255,226,150,.9)" style={{ rotate: "-3deg" }} />
                            <i aria-hidden="true" className="fa-solid fa-dog text-[26px] text-[#f4b9ca]" />
                            {/* 반려견은 있는데 서버 프로필이 없으면 앱 홈 웹 카드(AppAiCareOverview) 제목 */}
                            <p className="ah-display mt-2 text-[16px] leading-snug">{allPets?.length ? "우리 아이부터 연결해 주세요" : "먼저 우리 아이를 등록해 주세요"}</p>
                            <p className="ah-light mt-1.5 text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>프로필이 생기면 주간 사진 분석과 건강 관찰 기록이 이곳에 차곡차곡 쌓입니다.</p>
                            <Patch href={PETLENS_PROFILE_SETUP_HREF} small className="mt-4">반려견 등록하기<i aria-hidden="true" className="fa-solid fa-paw text-[12px]" /></Patch>
                        </section>
                    ) : (
                        <>
                            {/* ── 머리: 웹과 같은 제목 · 안내 · 새 주간 분석 시작 ── */}
                            <p className="ah-light text-[11.5px] text-[#c4567a]">AI 주간 사진 변화 리포트</p>
                            <h2 className="ah-display mt-1 text-[20px] leading-snug"><span className="st-marker">매주 같은 방향으로 비교해요</span></h2>
                            <p className="ah-light mt-2 text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>
                                새로 촬영한 사진은 선택한 {petName}의 주간 기록으로만 저장되며, 최초 등록 사진을 덮어쓰지 않습니다.
                            </p>
                            {/* 우리 아이 고르기 — 웹 MyPetHub 이름 버튼(setSelectedPetId)과 같음, 두 마리 이상일 때만 작은 스티커 칩 */}
                            {pets.length > 1 ? (
                                <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="리포트를 볼 반려견">
                                    {pets.map((p, i) => (
                                        <button key={p.apiProfileId} type="button" aria-pressed={p.apiProfileId === petProfileId}
                                            onClick={() => { haptic("light"); setSelectedPetId(p.apiProfileId); setOpenedId(undefined); }}
                                            className="rp-chip ah-display px-3 py-1 text-[12px]" style={{ rotate: `${i % 2 ? 1 : -1}deg` }}>
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                            <div className="mt-3.5">
                                {/* 협업자 촬영 화면 그대로(웹 마이펫과 같은 조건: 반려견 프로필 · 로그인 토큰이 있을 때) — 고른 아이가 바뀌면 새로(key) */}
                                {accessToken ? (
                                    <WeeklyPhotoComparison
                                        key={pet.apiProfileId}
                                        pet={pet}
                                        history={list}
                                        onCompleted={(record) => { setOpenedId(undefined); setWeeklyState((current) => ({
                                            profileId: pet.apiProfileId,
                                            loading: false,
                                            items: [record, ...current.items.filter((item) => item.id !== record.id)].slice(0, 8),
                                        })); }}
                                    />
                                ) : null}
                            </div>
                            {/* 불러오기 실패 — 웹 MyPetHub 빨간 안내 줄과 같은 문구, 앱은 분홍 메모지 */}
                            {loadError ? (
                                <p role="alert" className="st-postit ah-light relative mt-4 px-3.5 pb-2.5 pt-3 text-[12px]" style={{ background: "#ffd6e2", rotate: "0.8deg" }}>{loadError}</p>
                            ) : null}

                            {/* ── 이번 주 사진 분석: 테이프 붙인 종이 ── */}
                            <section ref={storyRef} className="rp-paper relative mt-7 scroll-mt-24 rounded-[14px] px-4 pb-4 pt-5" style={{ rotate: "-0.6deg" }}>
                                <Tape className="-top-2 left-5 h-4 w-14" color="rgba(170,230,200,.9)" style={{ rotate: "-4deg" }} />
                                {/* 지난 쪽을 펼쳤으면 그 주 날짜 · "최근으로" 되돌리기 */}
                                <div className="flex items-center justify-between gap-2">
                                    <p className="ah-display text-[12px] text-[#1f9e75]">{isRecent || !latest ? "이번 주 사진 분석" : `${ready ? formatShortDate(latest.analyzedAt) : ""} 사진 분석 · ${pageNumber(openedIndex)}쪽`}</p>
                                    {!isRecent ? (
                                        <button type="button" onClick={() => { haptic("light"); setOpenedId(undefined); }} className="rp-back ah-display shrink-0 px-2.5 text-[11px]">
                                            <i aria-hidden="true" className="fa-solid fa-rotate-left text-[9px]" />최근 쪽
                                        </button>
                                    ) : null}
                                </div>
                                {/* 불러오는 동안엔 "기록 없음" 대신 웹 MyPetHub(weeklyLoading) 문구 */}
                                {loading ? (
                                    <p className="ah-light mt-2.5 text-[12.5px]" style={{ color: TEXT_SOFT }}>주간 사진 기록을 불러오는 중입니다.</p>
                                ) : latest ? (
                                    <>
                                        <p className="mt-2.5 flex flex-wrap gap-1.5">
                                            <span className="ah-display rounded-full bg-[#dff3fb] px-2.5 py-0.5 text-[11px] text-[#1f6f8f]">{latest.viewCount}방향</span>
                                            {latest.photoQualityLabel ? <span className="ah-display rounded-full bg-[#fff0e0] px-2.5 py-0.5 text-[11px] text-[#b4632a]">{latest.photoQualityLabel}</span> : null}
                                        </p>
                                        <h3 className="ah-display mt-2.5 text-[16px] leading-snug">{latest.title || "저장된 주간 사진 분석"}</h3>
                                        <p className="ah-light mt-1.5 text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>{latest.description}</p>
                                        {points.length ? (
                                            <ul className="mt-3 space-y-2">
                                                {points.map((item) => (
                                                    <li key={item} className="ah-light flex items-start gap-2 text-[12.5px] leading-snug">
                                                        <span aria-hidden="true" className="rp-check mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full"><i className="fa-solid fa-check text-[9px]" /></span>
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : null}
                                    </>
                                ) : (
                                    <div className="rp-empty mt-3 rounded-[12px] px-4 py-5 text-center">
                                        <Image src="/images/ui/stickers/caretalk-photo.webp" alt="" width={44} height={44} className="mx-auto h-11 w-11" />
                                        <p className="ah-display mt-2 text-[13.5px]">실시간 카메라로 이번 주 첫 사진을 남겨 보세요.</p>
                                        <p className="ah-light mt-1 text-[11.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>촬영 화면, 방향별 썸네일, 업로드 진행률을 직접 확인할 수 있어요.</p>
                                    </div>
                                )}
                            </section>

                            {/* ── 이전 주와 비교: 메모지 ── */}
                            <section className="rp-memo relative mt-6 rounded-[14px] px-4 pb-4 pt-5" style={{ rotate: "0.6deg" }}>
                                <Tape className="-top-2 right-6 h-4 w-14" color="rgba(220,205,255,.92)" style={{ rotate: "4deg" }} />
                                <p className="ah-display text-[12px] text-[#6a52c4]">{latest && ready && (previous || latest.comparison.previousAnalyzedAt) ? `지난 쪽(${formatShortDate(latest.comparison.previousAnalyzedAt || previous?.analyzedAt)})과 비교` : "이전 주와 비교"}</p>
                                {/* 불러오는 동안엔 비교 기준 안내(기록 없음 문구)를 띄우지 않음 */}
                                {loading ? (
                                    <p className="ah-light mt-2 text-[12.5px]" style={{ color: TEXT_SOFT }}>주간 사진 기록을 불러오는 중입니다.</p>
                                ) : latest ? (
                                    <>
                                        <h3 className="ah-display mt-2 text-[15.5px] leading-snug">{latest.comparison.headline}</h3>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <span className="rp-date rounded-[10px] px-2.5 py-2" style={{ background: "#efe9ff", rotate: "-1deg" }}>
                                                <span className="ah-display block text-[11px] text-[#6a52c4]">{isRecent ? "최근" : "이 쪽"}</span>
                                                <span className="ah-display mt-0.5 block text-[12px] leading-snug">{date(latest.analyzedAt)}</span>
                                            </span>
                                            <span className="rp-date rounded-[10px] px-2.5 py-2" style={{ background: "#f6f1ec", rotate: "1deg" }}>
                                                <span className="ah-display block text-[11px]" style={{ color: TEXT_SOFT }}>이전</span>
                                                <span className="ah-display mt-0.5 block text-[12px] leading-snug">{date(latest.comparison.previousAnalyzedAt || previous?.analyzedAt)}</span>
                                            </span>
                                        </div>
                                        {latest.comparison.status === "ready" ? (
                                            <ul className="mt-3 space-y-1.5">
                                                {latest.comparison.newObservations.slice(0, 2).map((item) => (
                                                    <li key={`n-${item}`} className="ah-light flex items-start gap-2 text-[12px] leading-snug"><i aria-hidden="true" className="fa-solid fa-wand-magic-sparkles mt-0.5 text-[11px] text-[#f08a3c]" /><span>새로 확인: {item}</span></li>
                                                ))}
                                                {latest.comparison.commonObservations.slice(0, 2).map((item) => (
                                                    <li key={`c-${item}`} className="ah-light flex items-start gap-2 text-[12px] leading-snug"><i aria-hidden="true" className="fa-solid fa-equals mt-0.5 text-[11px] text-[#1f9e8a]" /><span>공통 확인: {item}</span></li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="ah-light mt-3 text-[11.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>다음 주 같은 방향 사진이 쌓이면 변화 여부를 단정하지 않고 확인된 항목만 비교합니다.</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="ah-light mt-2 text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>첫 주간 분석은 비교 기준이 되고, 다음 기록부터 이전 주와 나란히 표시됩니다.</p>
                                )}
                            </section>

                            {/* ── 주간 사진 히스토리: 웹 "지난 쪽 모아보기"와 같이 최근 8쪽 모두 · 누르면 위에 펼침 ── */}
                            {list.length > 0 ? (
                                <section className="mt-6">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="ah-display st-marker text-[14.5px]">주간 사진 히스토리</h3>
                                        <span className="ah-light text-[11px]" style={{ color: TEXT_SOFT }}>최근 {list.length}회</span>
                                    </div>
                                    <p className="ah-light mt-1 text-[11.5px]" style={{ color: TEXT_SOFT }}>지난 쪽을 누르면 위에 펼쳐져요</p>
                                    <ol className="mt-3 grid grid-cols-2 gap-2.5">
                                        {list.map((item, index) => {
                                            const on = index === openedIndex;
                                            return (
                                                <li key={item.id}>
                                                    <button type="button" onClick={() => openPage(item.id)} aria-pressed={on} aria-label={`${pageNumber(index)}쪽 ${item.title || "주간 사진 분석"} 펼치기`}
                                                        className="rp-hist block h-full w-full rounded-[4px_4px_12px_4px] px-3 pb-2.5 pt-2.5 text-left"
                                                        style={{ background: PAGE_TONES[index % PAGE_TONES.length], rotate: `${[-0.8, 0.7, 0.6, -0.7][index % 4]}deg` }}>
                                                        <span className="flex items-center justify-between gap-1">
                                                            <span className="ah-display text-[10.5px] text-[#6a52c4]">{pageNumber(index)}쪽{index === 0 ? " · 최근" : ""}</span>
                                                            {/* 네 방향 점(정면 · 왼쪽 · 오른쪽 · 뒷면) — 찍은 방향만 채움 */}
                                                            <span className="flex gap-[3px]" aria-label={`${item.viewCount}방향 촬영`}>
                                                                {PETLENS_PHOTO_VIEWS.map((view) => <i key={view.id} className={`rp-dot${item.viewIds.includes(view.id) ? " is-on" : ""}`} />)}
                                                            </span>
                                                        </span>
                                                        <span className="ah-display mt-0.5 block text-[11.5px] leading-snug">{ready ? formatShortDate(item.analyzedAt) : " "}</span>
                                                        <span className="ah-light mt-1 line-clamp-2 block text-[10.5px] leading-snug" style={{ color: TEXT_SOFT }}>{item.title || "주간 사진 분석"}</span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </section>
                            ) : null}

                            {/* ── 함께 써 보세요: 웹 부록과 같은 세 곳 — 파스텔 메모 줄(3D 그림 · 이름 · 한 줄 설명) ── */}
                            <section className="mt-7">
                                <h3 className="ah-display text-[14.5px]"><span className="st-marker">{petName}의 기록과 함께 써 보세요</span></h3>
                                <ul className="mt-3 grid gap-2.5">
                                    {MORE_CARE.map((item, i) => (
                                        <li key={item.href}>
                                            <Link href={item.href} className="rp-more flex items-center gap-3 rounded-[4px_4px_14px_4px] px-3 py-2.5" style={{ background: item.tone, rotate: `${i % 2 ? 0.4 : -0.4}deg` }}>
                                                <Image src={item.art} alt="" width={44} height={44} className="h-11 w-11 shrink-0 object-contain drop-shadow-[0_2px_2px_rgba(120,70,50,.2)]" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="ah-display block text-[13.5px]" style={{ color: item.ink }}>{item.title}</span>
                                                    <span className="ah-light block text-[11.5px] leading-snug" style={{ color: TEXT_SOFT }}>{item.body}</span>
                                                </span>
                                                <i aria-hidden="true" className="fa-solid fa-chevron-right text-[10px] text-[#c9b4a8]" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                {/* 웹 그림책 "프로필 고치기"와 같은 자리 — 앱 우리 아이 화면 */}
                                <Link href={`/app/sticker/pets/`} className="ah-display mt-3 inline-flex items-center gap-1.5 text-[12px] text-[#c4456f]">
                                    <i aria-hidden="true" className="fa-solid fa-pen text-[10px]" />{petName} 프로필 고치기
                                </Link>
                                <p className="ah-light mt-2 text-[11px] leading-relaxed" style={{ color: TEXT_SOFT }}>행동·소리 분석은 등록한 우리 아이와 별개예요. 궁금한 강아지의 영상을 관찰하는 독립 기능이며, 주간 사진 변화 기록과 섞이지 않아요.</p>
                            </section>

                            <p className="ah-light mt-5 text-[11px] leading-relaxed" style={{ color: TEXT_SOFT }}>이 리포트는 사진에서 확인된 관찰 항목을 정리하며, 촬영 조건에 따라 달라질 수 있고 수의학적 진단을 대신하지 않습니다.</p>
                        </>
                    )}
                </DiaryBody>

            </div>
        </div>
    );
}

const REPORT_CSS = `
/* 이번 주 사진 분석: 흰 종이 · 이전 주와 비교: 연보라 메모지 (줄 없음) */
.rp-paper { background: #fff; box-shadow: inset 0 0 0 1.5px #f1e6de, 0 12px 20px -14px rgba(110,70,55,.45); }
.rp-memo { background: #fbf8ff; box-shadow: inset 0 0 0 1.5px #e8e0fb, 0 12px 20px -14px rgba(90,70,160,.4); }
.rp-check { background: #dcf3e6; color: #1f9e75; box-shadow: 0 0 0 1.5px #fff; }
.rp-empty { background: #f3fbfe; border: 2px dashed #bfe3ee; }
.rp-date { box-shadow: 0 6px 10px -8px rgba(90,70,60,.45); }
/* 우리 아이 고르기 칩: 흰 종이 스티커, 고른 아이는 분홍 · 누르면 살짝 눌림(터치 반응만) */
.rp-chip { border-radius: 999px; background: #fff; color: #7a6a63; box-shadow: inset 0 0 0 1.5px #f3e3da, 0 5px 8px -6px rgba(120,80,60,.45);
  transition: transform .3s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.rp-chip[aria-pressed="true"] { background: #ffe1ea; color: #c4456f; box-shadow: inset 0 0 0 1.5px #f4a9bf, 0 5px 8px -6px rgba(196,69,111,.45); }
.rp-chip:active { transform: scale(.94); }
/* 히스토리: 파스텔 쪽 메모(누르면 살짝 눌림 · 펼친 쪽은 분홍 테 + 들림) */
.rp-hist { box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.9), 0 7px 11px -9px rgba(110,80,40,.45); -webkit-tap-highlight-color: transparent; transition: transform .3s cubic-bezier(.3,1.6,.5,1); }
.rp-hist:active { transform: scale(.95); }
.rp-hist[aria-pressed="true"] { box-shadow: inset 0 0 0 2px #f283a3, 0 10px 14px -9px rgba(200,70,110,.45); transform: translateY(-2px); }
/* 네 방향 점: 찍은 방향은 보라 · 안 찍은 방향은 빈 점 */
.rp-dot { display: block; width: 6px; height: 6px; border-radius: 999px; box-shadow: inset 0 0 0 1.2px #cbbdf2; }
.rp-dot.is-on { background: #8f78e6; box-shadow: none; }
/* 최근 쪽으로: 흰 작은 알약 */
.rp-back { display: inline-flex; align-items: center; gap: 4px; height: 24px; border-radius: 999px; background: #fff; color: #1f9e75; box-shadow: inset 0 0 0 1.5px #bfe8d6; }
.rp-back:active { transform: scale(.94); }
/* 함께 써 보세요: 파스텔 메모 줄(누르면 살짝 눌림) */
.rp-more { box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.9), 0 8px 12px -10px rgba(110,80,40,.45); -webkit-tap-highlight-color: transparent; transition: transform .3s cubic-bezier(.3,1.6,.5,1); }
.rp-more:active { transform: scale(.97); }
`;
