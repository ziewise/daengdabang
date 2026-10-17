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
 *  - 주간 사진 히스토리(기록이 있을 때): 최근 4회 메모 — 최근/n번째 · 날짜 · 제목 두 줄
 *  - 진단 아님 안내
 * 데이터: 실제 주간 기록(협업자 loadWeeklyPhotoAnalyses, 웹 마이펫과 같은 8개) — 배포 전 연결 2026-10-16.
 * 새 주간 분석 시작: 협업자 촬영 화면(WeeklyPhotoComparison)을 그대로 씀(버튼 · 창 모양만 앱 CSS) — 끝나면 새 기록을 맨 앞에(웹과 같음).
 * 로그인 전: 앱 로그인 초대(웹도 회원 전용 화면).
 * 반려견: 웹 MyPetHub 처럼 고를 수 있음(두 마리 이상이면 칩 · 주소 ?profile=N 으로 처음 고를 아이), 없으면 반려견 등록하기 와펜.
 * 불러오는 중 · 실패(분홍 메모) · 기록 없음을 웹 MyPetHub weeklyState 처럼 나눠 보여 줌.
 */

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { haptic } from "../gestures";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { ConceptBar, HC_CSS, useDemoSession, useNow } from "../shared";
import { DiaryBody, PARTS_CSS } from "../sticker-parts";
import { LoginInvite, Patch, STICKER_CSS, Tape } from "../sticker-kit";
import WeeklyPhotoComparison from "@/components/my-pet/WeeklyPhotoComparison";
import { loadWeeklyPhotoAnalyses, type WeeklyPhotoAnalysisRecord } from "@/lib/weekly-photo-analysis";
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
    const latest = list[0];
    const previous = list[1];
    const points = latest ? (latest.careActions.length ? latest.careActions : latest.observations).slice(0, 4) : [];

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
                                            onClick={() => { haptic("light"); setSelectedPetId(p.apiProfileId); }}
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
                                        onCompleted={(record) => setWeeklyState((current) => ({
                                            profileId: pet.apiProfileId,
                                            loading: false,
                                            items: [record, ...current.items.filter((item) => item.id !== record.id)].slice(0, 8),
                                        }))}
                                    />
                                ) : null}
                            </div>
                            {/* 불러오기 실패 — 웹 MyPetHub 빨간 안내 줄과 같은 문구, 앱은 분홍 메모지 */}
                            {loadError ? (
                                <p role="alert" className="st-postit ah-light relative mt-4 px-3.5 pb-2.5 pt-3 text-[12px]" style={{ background: "#ffd6e2", rotate: "0.8deg" }}>{loadError}</p>
                            ) : null}

                            {/* ── 이번 주 사진 분석: 테이프 붙인 종이 ── */}
                            <section className="rp-paper relative mt-7 rounded-[14px] px-4 pb-4 pt-5" style={{ rotate: "-0.6deg" }}>
                                <Tape className="-top-2 left-5 h-4 w-14" color="rgba(170,230,200,.9)" style={{ rotate: "-4deg" }} />
                                <p className="ah-display text-[12px] text-[#1f9e75]">이번 주 사진 분석</p>
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
                                <p className="ah-display text-[12px] text-[#6a52c4]">이전 주와 비교</p>
                                {/* 불러오는 동안엔 비교 기준 안내(기록 없음 문구)를 띄우지 않음 */}
                                {loading ? (
                                    <p className="ah-light mt-2 text-[12.5px]" style={{ color: TEXT_SOFT }}>주간 사진 기록을 불러오는 중입니다.</p>
                                ) : latest ? (
                                    <>
                                        <h3 className="ah-display mt-2 text-[15.5px] leading-snug">{latest.comparison.headline}</h3>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <span className="rp-date rounded-[10px] px-2.5 py-2" style={{ background: "#efe9ff", rotate: "-1deg" }}>
                                                <span className="ah-display block text-[11px] text-[#6a52c4]">최근</span>
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

                            {/* ── 주간 사진 히스토리: 기록이 있을 때, 최근 4회 메모 ── */}
                            {list.length > 0 ? (
                                <section className="mt-6">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="ah-display st-marker text-[14.5px]">주간 사진 히스토리</h3>
                                        <span className="ah-light text-[11px]" style={{ color: TEXT_SOFT }}>최근 {list.length}회</span>
                                    </div>
                                    <ol className="mt-3 grid grid-cols-2 gap-2.5">
                                        {list.slice(0, 4).map((item, index) => (
                                            <li key={item.id} className="rp-hist rounded-[10px] px-3 pb-2.5 pt-2.5" style={{ rotate: `${[-0.8, 0.7, 0.6, -0.7][index]}deg` }}>
                                                <span className="ah-display text-[10.5px] text-[#6a52c4]">{index === 0 ? "최근" : `${index + 1}번째`}</span>
                                                <span className="ah-display mt-0.5 block text-[11.5px] leading-snug">{date(item.analyzedAt)}</span>
                                                <span className="ah-light mt-1 line-clamp-2 block text-[10.5px] leading-snug" style={{ color: TEXT_SOFT }}>{item.title}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </section>
                            ) : null}

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
/* 히스토리: 작은 메모지 */
.rp-hist { background: #fffaf2; box-shadow: inset 0 0 0 1.5px #f3e6d6, 0 7px 11px -9px rgba(110,80,40,.45); }
`;
