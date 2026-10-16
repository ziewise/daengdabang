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
 */

import Image from "next/image";
import { useEffect, useState } from "react";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { ConceptBar, HC_CSS, useDemoSession, useMember, useNow } from "../shared";
import { DiaryBody, PARTS_CSS } from "../sticker-parts";
import { LoginInvite, STICKER_CSS, Tape } from "../sticker-kit";
import WeeklyPhotoComparison from "@/components/my-pet/WeeklyPhotoComparison";
import { loadWeeklyPhotoAnalyses, type WeeklyPhotoAnalysisRecord } from "@/lib/weekly-photo-analysis";
import { useAuth } from "@/lib/store";

const REDIRECT = "/app/sticker/report/";

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
    // 실제 반려견 · 주간 기록 — 웹 마이펫(MyPetHub)과 같은 불러오기(첫 반려견, 최근 8개)
    const { user } = useAuth();
    const { pet, petName } = useMember();
    const accessToken = user?.apiAccessToken || "";
    const [history, setHistory] = useState<WeeklyPhotoAnalysisRecord[] | null>(null);
    useEffect(() => {
        if (!pet?.apiProfileId || !accessToken) return;
        let active = true;
        loadWeeklyPhotoAnalyses({ petProfileId: pet.apiProfileId, accessToken, limit: 8 })
            .then((items) => { if (active) setHistory(items); })
            .catch(() => { if (active) setHistory([]); });
        return () => { active = false; };
    }, [pet?.apiProfileId, accessToken]);
    // 날짜는 화면을 그린 뒤에 — 서버와 기기의 날짜 표기(PM/오후)가 달라 생기는 충돌 방지
    const ready = useNow(3_600_000) !== null;
    const date = (value?: string) => (ready ? formatDate(value) : " ");

    const list = history ?? [];
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
                    ) : (
                        <>
                            {/* ── 머리: 웹과 같은 제목 · 안내 · 새 주간 분석 시작 ── */}
                            <p className="ah-light text-[11.5px] text-[#c4567a]">AI 주간 사진 변화 리포트</p>
                            <h2 className="ah-display mt-1 text-[20px] leading-snug"><span className="st-marker">매주 같은 방향으로 비교해요</span></h2>
                            <p className="ah-light mt-2 text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>
                                새로 촬영한 사진은 선택한 {petName}의 주간 기록으로만 저장되며, 최초 등록 사진을 덮어쓰지 않습니다.
                            </p>
                            <div className="mt-3.5">
                                {/* 협업자 촬영 화면 그대로(웹 마이펫과 같은 조건: 반려견 프로필 · 로그인 토큰이 있을 때) */}
                                {pet?.apiProfileId && accessToken ? (
                                    <WeeklyPhotoComparison
                                        key={pet.apiProfileId}
                                        pet={pet}
                                        history={list}
                                        onCompleted={(record) => setHistory((current) => [record, ...(current ?? []).filter((item) => item.id !== record.id)].slice(0, 8))}
                                    />
                                ) : (
                                    <p className="ah-light text-[12px]" style={{ color: TEXT_SOFT }}>반려견 프로필을 먼저 등록하면 주간 분석을 시작할 수 있어요.</p>
                                )}
                            </div>

                            {/* ── 이번 주 사진 분석: 테이프 붙인 종이 ── */}
                            <section className="rp-paper relative mt-7 rounded-[14px] px-4 pb-4 pt-5" style={{ rotate: "-0.6deg" }}>
                                <Tape className="-top-2 left-5 h-4 w-14" color="rgba(170,230,200,.9)" style={{ rotate: "-4deg" }} />
                                <p className="ah-display text-[12px] text-[#1f9e75]">이번 주 사진 분석</p>
                                {latest ? (
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
                                {latest ? (
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
/* 히스토리: 작은 메모지 */
.rp-hist { background: #fffaf2; box-shadow: inset 0 0 0 1.5px #f3e6d6, 0 7px 11px -9px rgba(110,80,40,.45); }
`;
