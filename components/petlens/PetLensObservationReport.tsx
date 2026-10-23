/**
 * PetLensObservationReport — 행동·소리 분석 결과 "한 장 리포트" 머리 판(웹 연구소 페이지 전용 · 2026-10-23 사용자 선택 R1)
 * ---------------------------------------------------------------------
 * 실제 분석 결과(PetObservationResult)만으로 그린다 — 지어낸 값 없음.
 *  - 요약 한 줄 · 우선 확인 상태 칩 · 촬영 품질 칩
 *  - 작은 그래프 하나: 분야(행동 · 소리 · 건강 · 우선 확인)마다 가장 강한 후보 1개의 시간별 근거를 겹쳐 그림.
 *    원래 결과 화면과 같은 규칙 — 확인된 시점만 직선으로 잇고, 한 시점뿐이면 짧은 선 + 점(가짜 추세 없음).
 *    아래에는 그 후보들의 근거가 된 순간(관찰)을 작은 표시로.
 *  - 분야 카드: 가장 강한 후보 · 근거 % · 가장 두드러진 시점 · 다음 후보
 * 대상견을 구분하지 못한 결과는 그래프 · 카드를 그리지 않는다(원래 보류 리포트가 그대로 보임).
 * 기본은 hidden — app/lab-web.css(웹 연구소 페이지)에서만 보이고, 앱 · 펫렌즈 창은 원래 결과 화면 그대로.
 */
import type { CSSProperties } from "react";
import Image from "next/image";
import type { PetObservationCandidate, PetObservationResult, PetObservationUrgencyLevel } from "@/lib/petlens-observation";

type ReportItem = {
    label: string;
    confidence: PetObservationCandidate["confidence"];
    confidenceScore?: number;
    timeline: PetObservationCandidate["timeline"];
    evidence: number[];
};

// 분야 — 이름 · 선 색 · 그림
const GROUPS = [
    { kind: "behavior", label: "행동", color: "#8a6fe0", art: "/images/ui/lab-dog-256.webp" },
    { kind: "sound", label: "소리", color: "#ee7fa0", art: "/images/ui/lab-sound-160.webp" },
    { kind: "health", label: "건강", color: "#f0a020", art: "/images/ui/lab-health-160.webp" },
    { kind: "priority", label: "우선 확인", color: "#e2557a", art: "/images/ui/lab-priority-160.webp" },
] as const;

const URGENCY_LABEL: Record<PetObservationUrgencyLevel, string> = {
    emergency: "즉시 병원 연락",
    same_day: "오늘 병원 문의",
    observe: "평소와 비교 관찰",
    unclear: "판단 어려움",
};

const MODALITY_LABEL: Record<PetObservationResult["observations"][number]["modality"], string> = {
    vocalization: "소리",
    environment_sound: "주변 소리",
    posture: "자세",
    movement: "움직임",
    breathing: "호흡",
    interaction: "반응",
    quality: "촬영",
};

const CONFIDENCE_LABEL = { high: "확신 높음", medium: "확신 중간", low: "확신 낮음" } as const;

// 그래프 칸(viewBox)
const W = 600;
const H = 160;
const PAD = 12;

function score(item: ReportItem) {
    return typeof item.confidenceScore === "number" ? item.confidenceScore : -1;
}

function ranked(items: ReportItem[]) {
    return [...items].sort((left, right) => score(right) - score(left));
}

function percent(item: ReportItem) {
    return typeof item.confidenceScore === "number" ? Math.round(item.confidenceScore * 100) : null;
}

// 가장 두드러진 시점 — 시간별 근거의 최고점, 없으면 첫 근거 관찰 시점
function peakSeconds(item: ReportItem, observations: PetObservationResult["observations"]) {
    if (item.timeline.length > 0) {
        return item.timeline.reduce((best, point) => (point.confidenceScore > best.confidenceScore ? point : best)).timeSeconds;
    }
    const first = item.evidence.map((index) => observations[index]).find(Boolean);
    return first ? first.timeSeconds : null;
}

export default function PetLensObservationReport({ result }: { result: PetObservationResult }) {
    const targetAmbiguous = result.analysisContractVersion >= 2 && result.quality.targetStatus === "ambiguous";
    const itemsByKind: Record<(typeof GROUPS)[number]["kind"], ReportItem[]> = {
        behavior: result.behaviorCandidates,
        sound: result.barkContextCandidates,
        health: result.healthCandidates,
        priority: result.symptomSignals,
    };
    const groups = targetAmbiguous
        ? []
        : GROUPS.map((group) => {
            const list = ranked(itemsByKind[group.kind]);
            return { ...group, top: list[0], next: list[1] };
        }).filter((group): group is typeof group & { top: ReportItem } => Boolean(group.top));

    // 그래프 가로 길이 — 영상 길이(최대 30초), 없으면 찍힌 시점 중 가장 늦은 때
    const latest = Math.max(1, ...groups.flatMap((group) => group.top.timeline.map((point) => point.timeSeconds)));
    const duration = Math.min(30, typeof result.durationSeconds === "number" && result.durationSeconds > 0 ? result.durationSeconds : latest);
    const x = (seconds: number) => (Math.min(duration, Math.max(0, seconds)) / duration) * W;
    const y = (value: number) => PAD + (1 - Math.min(1, Math.max(0, value))) * (H - PAD * 2);
    const series = groups
        .map((group) => ({ ...group, points: [...group.top.timeline].filter((point) => point.timeSeconds <= duration).sort((a, b) => a.timeSeconds - b.timeSeconds) }))
        .filter((group) => group.points.length > 0);

    // 근거 순간 — 그래프에 나온 후보들의 근거 관찰(겹치지 않게 시간순 최대 6개)
    const momentIndexes = [...new Set(series.flatMap((group) => group.top.evidence))]
        .filter((index) => result.observations[index])
        .sort((a, b) => result.observations[a].timeSeconds - result.observations[b].timeSeconds)
        .slice(0, 6);

    const urgencyHigh = result.urgency.level === "emergency" || result.urgency.level === "same_day";
    const qualityChips = [
        !result.quality.dogVisible ? "강아지 확인 어려움" : result.quality.visibleDogCount > 0 ? `강아지 ${result.quality.visibleDogCount}마리 확인` : "",
        result.quality.audioAvailable ? "소리 확인" : "소리 확인 어려움",
        result.quality.level === "good" ? "관찰 품질 양호" : result.quality.level === "limited" ? "관찰 품질 제한" : "다시 찍기 권장",
    ].filter(Boolean);
    const durationLabel = Number.isInteger(duration) ? `${duration}` : duration.toFixed(1);

    return (
        <section className={`dw-csheet ${urgencyHigh ? "is-pink" : "is-lav"} lab-obs-report hidden`} aria-labelledby="lab-obs-report-title">
            {/* 머리 — 요약 한 줄 · 상태 칩 · 그림 고리 */}
            <div className="lab-obs-report-head">
                <div>
                    <p className="ddb-crayon-kicker dw-kicker">{durationLabel}초 관찰 리포트</p>
                    <h2 id="lab-obs-report-title">{result.summary}</h2>
                    <ul className="lab-obs-report-chips">
                        <li className={urgencyHigh ? "is-alert" : "is-calm"}>
                            <i className={`fa-solid ${urgencyHigh ? "fa-triangle-exclamation" : "fa-circle-check"}`} aria-hidden="true" />
                            {URGENCY_LABEL[result.urgency.level]}
                        </li>
                        {qualityChips.map((chip) => <li key={chip}>{chip}</li>)}
                    </ul>
                </div>
                <span className="lab-obs-report-ring" aria-hidden="true">
                    <span><Image src="/images/ui/lab-researcher-384.webp" alt="" width={96} height={96} /></span>
                </span>
            </div>

            {/* 그래프 하나 — 분야별 가장 강한 후보의 시간별 근거 */}
            {series.length > 0 && (
                <figure className="lab-obs-chart lab-obs-report-chart">
                    <figcaption className="lab-obs-legend">
                        {series.map((group) => (
                            <span key={group.kind}><i style={{ background: group.color }} aria-hidden="true" />{group.top.label}<small>{group.label}</small></span>
                        ))}
                        <em>가로 시간 · 세로 지지도</em>
                    </figcaption>
                    <div className="lab-obs-plot">
                        <svg
                            viewBox={`0 0 ${W} ${H}`}
                            preserveAspectRatio="none"
                            role="img"
                            aria-label={series.map((group) => {
                                const pct = percent(group.top);
                                const at = peakSeconds(group.top, result.observations);
                                return `${group.label} ${group.top.label}${pct !== null ? ` ${pct}%` : ""}${at !== null ? ` ${at.toFixed(1)}초` : ""}`;
                            }).join(", ")}
                        >
                            <g stroke="#eef0f4" strokeWidth="1">
                                {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1="0" y1={H * ratio} x2={W} y2={H * ratio} />)}
                            </g>
                            {series.map((group) => (
                                <path
                                    key={group.kind}
                                    d={group.points.length === 1
                                        ? `M${Math.max(0, x(group.points[0].timeSeconds) - 16)} ${y(group.points[0].confidenceScore)} L${Math.min(W, x(group.points[0].timeSeconds) + 16)} ${y(group.points[0].confidenceScore)}`
                                        : group.points.map((point, index) => `${index ? "L" : "M"}${x(point.timeSeconds).toFixed(1)} ${y(point.confidenceScore).toFixed(1)}`).join(" ")}
                                    fill="none"
                                    stroke={group.color}
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                />
                            ))}
                        </svg>
                        {/* 최고점 동그라미(늘어나는 그래프 위에 따로 — 찌그러지지 않게) */}
                        <div className="lab-obs-peaks" aria-hidden="true">
                            {series.map((group) => {
                                const best = group.points.reduce((top, point) => (point.confidenceScore > top.confidenceScore ? point : top));
                                return <span key={group.kind} style={{ left: `${(x(best.timeSeconds) / W) * 100}%`, top: `${(y(best.confidenceScore) / H) * 100}%`, borderColor: group.color }} />;
                            })}
                        </div>
                    </div>
                    <div className="lab-obs-axis" aria-hidden="true"><span>0초</span><span>{(duration / 2).toFixed(duration % 2 ? 1 : 0)}초</span><span>{durationLabel}초</span></div>
                    {momentIndexes.length > 0 && (
                        <ol className="lab-obs-moments" aria-label="근거가 된 순간">
                            {momentIndexes.map((index, order) => {
                                const fact = result.observations[index];
                                return (
                                    <li key={index} className={order % 2 ? "is-low" : ""} style={{ left: `${(x(fact.timeSeconds) / W) * 100}%` }} title={fact.description}>
                                        {fact.timeSeconds.toFixed(1)}초 {MODALITY_LABEL[fact.modality]}
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </figure>
            )}

            {/* 분야 카드 — 가장 강한 후보 · 근거 % · 시점 · 다음 후보 */}
            {groups.length > 0 && (
                <ul className="lab-obs-groups">
                    {groups.map((group) => {
                        const pct = percent(group.top);
                        const at = peakSeconds(group.top, result.observations);
                        const nextPct = group.next ? percent(group.next) : null;
                        return (
                            <li key={group.kind} style={{ "--c": group.color } as CSSProperties}>
                                <div className="lab-obs-group-top">
                                    <Image src={group.art} alt="" width={44} height={44} aria-hidden="true" />
                                    <div><small>{group.label}</small><b>{group.top.label}</b></div>
                                </div>
                                {pct !== null && <div className="lab-obs-meter" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>}
                                <p className="lab-obs-group-foot">
                                    <span>{at !== null ? `${at.toFixed(1)}초 무렵` : "시점 없음"}</span>
                                    <b>{pct !== null ? `${pct}%` : CONFIDENCE_LABEL[group.top.confidence]}</b>
                                </p>
                                <p className="lab-obs-group-more">
                                    {group.next ? `다음 후보 · ${group.next.label}${nextPct !== null ? ` ${nextPct}%` : ""}` : "후보 1개"}
                                </p>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
