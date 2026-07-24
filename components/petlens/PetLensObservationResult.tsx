"use client";

import { useId, type CSSProperties } from "react";
import type {
    PetObservationCandidate,
    PetObservationResult,
    PetObservationUrgencyLevel,
} from "@/lib/petlens-observation";
import PetObservationNutritionRecommendations from "@/components/petlens/PetObservationNutritionRecommendations";


const URGENCY_STYLE: Record<PetObservationUrgencyLevel, string> = {
    emergency: "border-rose-300 bg-rose-50 text-rose-950",
    same_day: "border-amber-300 bg-amber-50 text-amber-950",
    observe: "border-emerald-200 bg-emerald-50 text-emerald-950",
    unclear: "border-sky-200 bg-sky-50 text-sky-950",
};

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
    breathing: "호흡 모습",
    interaction: "반응",
    quality: "촬영 품질",
};

const SOURCE_LABEL: Record<PetObservationResult["observations"][number]["source"], string> = {
    target_dog: "분석 대상",
    other_dog: "다른 강아지",
    dog_unknown: "강아지 구분 어려움",
    cat: "고양이",
    other_animal: "다른 동물",
    human: "사람",
    playback: "재생 매체",
    environment: "환경",
    unknown: "주체 불명확",
    legacy_unknown: "이전 결과",
};

const VOCALIZATION_KIND_LABEL: Record<PetObservationResult["observations"][number]["vocalizationKind"], string> = {
    bark: "짖음",
    whine: "낑낑거림",
    growl: "으르렁거림",
    howl: "하울링",
    yelp: "비명성 발성",
    other: "그 밖의 발성",
    unclear: "종류 구분 어려움",
    not_applicable: "발성 아님",
};

const INTERFERENCE_LABEL: Record<PetObservationResult["quality"]["interferenceSources"][number], string> = {
    human_speech: "사람 말소리",
    other_dog: "다른 강아지",
    cat_or_other_animal: "고양이·다른 동물",
    tv_or_media: "티브이·휴대폰",
    environment: "환경음",
    unknown: "주체 불명확 소리",
};

type InferenceGroupKind = "behavior" | "sound" | "health" | "priority";

type InferenceDisplayItem = {
    label: string;
    confidence: PetObservationCandidate["confidence"];
    confidenceScore?: number;
    timeline: PetObservationCandidate["timeline"];
    evidence: number[];
    action?: PetObservationUrgencyLevel;
};

type InferenceGroupConfig = {
    kind: InferenceGroupKind;
    title: string;
    eyebrow: string;
    description: string;
    empty: string;
    tableTitle: string;
    tableDescription: string;
    icon: string;
    point: string;
    grid: string;
    accent: string;
    badge: string;
    rankBadge: string;
    confidenceBadge: string;
};

const INFERENCE_GROUPS: readonly InferenceGroupConfig[] = [
    {
        kind: "behavior",
        title: "행동 지지도 변화",
        eyebrow: "움직임·자세·반응",
        description: "시간에 따라 어떤 움직임·자세 후보가 두드러졌는지 보여줘요.",
        empty: "뚜렷하게 분류된 행동 후보가 없어요.",
        tableTitle: "행동 후보 결과표",
        tableDescription: "행동 후보별 순위, 추론 신뢰도와 영상 근거를 함께 비교합니다.",
        icon: "fa-dog",
        point: "#4f46e5",
        grid: "#e0e7ff",
        accent: "text-indigo-700",
        badge: "bg-indigo-50 text-indigo-700",
        rankBadge: "bg-indigo-600 text-white",
        confidenceBadge: "bg-indigo-50 text-indigo-700",
    },
    {
        kind: "sound",
        title: "소리 맥락 지지도 변화",
        eyebrow: "반려견 발성 맥락",
        description: "발성이 들린 시점마다 가능한 맥락의 지지도가 어떻게 달라졌는지 보여줘요.",
        empty: "분석 가능한 반려견 발성이 포착되지 않아 소리 후보를 만들지 않았어요.",
        tableTitle: "소리 맥락 후보 결과표",
        tableDescription: "소리 후보별 순위, 추론 신뢰도와 소리·상황 근거를 함께 비교합니다.",
        icon: "fa-volume-high",
        point: "#0891b2",
        grid: "#cffafe",
        accent: "text-cyan-700",
        badge: "bg-cyan-50 text-cyan-700",
        rankBadge: "bg-cyan-600 text-white",
        confidenceBadge: "bg-cyan-50 text-cyan-700",
    },
    {
        kind: "health",
        title: "건강 신호 지지도 변화",
        eyebrow: "신체·컨디션 관찰",
        description: "자세·움직임·호흡 신호가 어느 시점에 두드러졌는지 보여줘요.",
        empty: "이번 영상에서 별도로 분류된 건강 신호가 없어요.",
        tableTitle: "건강 신호 결과표",
        tableDescription: "관찰된 신호별 순위, 추론 신뢰도와 영상 근거를 함께 확인합니다.",
        icon: "fa-heart-pulse",
        point: "#d97706",
        grid: "#fef3c7",
        accent: "text-amber-800",
        badge: "bg-amber-50 text-amber-800",
        rankBadge: "bg-amber-600 text-white",
        confidenceBadge: "bg-amber-50 text-amber-800",
    },
    {
        kind: "priority",
        title: "우선 확인 신호 변화",
        eyebrow: "증상 신호·확인 순서",
        description: "보호자가 먼저 살필 신호가 어느 시점에 두드러졌는지 보여줘요.",
        empty: "이번 영상에서 별도로 분류된 증상 신호가 없어요.",
        tableTitle: "증상·우선 확인 결과표",
        tableDescription: "증상 신호별 추론 신뢰도와 관찰 근거, 보호자 확인 순서를 함께 확인합니다.",
        icon: "fa-stethoscope",
        point: "#e11d48",
        grid: "#ffe4e6",
        accent: "text-rose-700",
        badge: "bg-rose-50 text-rose-700",
        rankBadge: "bg-rose-600 text-white",
        confidenceBadge: "bg-rose-50 text-rose-700",
    },
] as const;

function ConfidenceBand({ confidence }: Pick<PetObservationCandidate, "confidence">) {
    const label = confidence === "high" ? "높음" : confidence === "medium" ? "중간" : "낮음";
    return (
        <div className="grid grid-cols-3 gap-1" aria-label={`추론 신뢰도 ${label} 구간`}>
            {(["low", "medium", "high"] as const).map((band) => (
                <span
                    key={band}
                    className={`rounded-md px-2 py-1 text-center text-[10px] font-black ${
                        confidence === band ? "bg-neutral-800 text-white" : "bg-neutral-100 text-neutral-400"
                    }`}
                >
                    {band === "high" ? "높음" : band === "medium" ? "중간" : "낮음"}
                </span>
            ))}
        </div>
    );
}

const INFERENCE_GRAPH_TICKS = [100, 75, 50, 25, 0] as const;
const INFERENCE_CHART_TOP = 34;
const INFERENCE_CHART_RIGHT = 28;
const INFERENCE_CHART_BOTTOM = 54;
const INFERENCE_CHART_LEFT = 60;
const INFERENCE_CHART_HEIGHT = 360;
const MOBILE_GRAPH_WIDTH = 360;
const MOBILE_GRAPH_HEIGHT = 300;
const MOBILE_GRAPH_TOP = 30;
const MOBILE_GRAPH_RIGHT = 20;
const MOBILE_GRAPH_BOTTOM = 50;
const MOBILE_GRAPH_LEFT = 54;
const INFERENCE_SERIES_COLORS: Record<InferenceGroupKind, readonly string[]> = {
    behavior: ["#dc2626", "#16a34a", "#7c3aed", "#0284c7"],
    sound: ["#0891b2", "#ea580c", "#7c3aed", "#16a34a"],
    health: ["#d97706", "#2563eb", "#16a34a", "#9333ea"],
    priority: ["#e11d48", "#f97316", "#7c3aed", "#0284c7"],
};

function peakLabelY(
    peakY: number,
    seriesIndex: number,
    seriesCount: number,
    plotTop: number,
    plotBottom: number,
) {
    const gap = 18;
    const crowdedSpan = Math.max(1, seriesCount) * gap;
    if (peakY <= plotTop + crowdedSpan) {
        return Math.min(plotBottom - 8, peakY + 24 + seriesIndex * gap);
    }
    if (peakY >= plotBottom - crowdedSpan) {
        return Math.max(plotTop + 14, peakY - 14 - seriesIndex * gap);
    }
    const lane = Math.floor(seriesIndex / 2);
    return peakY + (seriesIndex % 2 === 0 ? -(14 + lane * gap) : 26 + lane * gap);
}

type InferenceGraphPoint = {
    id: string;
    item: InferenceDisplayItem;
    percentage: number | null;
};

function inferencePercentage(item: Pick<InferenceDisplayItem, "confidenceScore">) {
    if (typeof item.confidenceScore !== "number" || !Number.isFinite(item.confidenceScore)) return null;
    return Math.max(0, Math.min(100, Math.round(item.confidenceScore * 100)));
}

function hasInferencePercentage(
    point: InferenceGraphPoint,
): point is InferenceGraphPoint & { percentage: number } {
    return point.percentage !== null;
}

function candidateConfidenceLabel(confidence: PetObservationCandidate["confidence"]) {
    if (confidence === "high") return "강한 근거";
    if (confidence === "medium") return "비교 필요";
    return "낮은 가능성";
}

function InferenceGroupLinePanel({
    config,
    items,
    observations,
    urgency,
    durationSeconds,
}: {
    config: InferenceGroupConfig;
    items: InferenceDisplayItem[];
    observations: PetObservationResult["observations"];
    urgency: PetObservationUrgencyLevel;
    durationSeconds?: number;
}) {
    const graphId = useId().replace(/:/g, "");
    const graphPoints: InferenceGraphPoint[] = items.map((item, index) => ({
            id: `${config.kind}-${index}-${item.label}`,
            item,
            percentage: inferencePercentage(item),
        }));
    const rankedPoints = graphPoints
        .filter(hasInferencePercentage)
        .sort((a, b) => b.percentage - a.percentage || a.item.label.localeCompare(b.item.label, "ko"));
    const legacyPoints = graphPoints.filter((point) => point.percentage === null);
    const tablePoints = [...rankedPoints, ...legacyPoints];
    const chartWidth = 760;
    const plotWidth = chartWidth - INFERENCE_CHART_LEFT - INFERENCE_CHART_RIGHT;
    const plotHeight = INFERENCE_CHART_HEIGHT - INFERENCE_CHART_TOP - INFERENCE_CHART_BOTTOM;
    const inferredDuration = Math.max(
        1,
        durationSeconds || 0,
        ...observations.map((observation) => observation.timeSeconds),
        ...items.flatMap((item) => item.timeline.map((point) => point.timeSeconds)),
    );
    const timelineDuration = Math.min(30, inferredDuration);
    const xForTime = (timeSeconds: number) => (
        INFERENCE_CHART_LEFT + (Math.min(timelineDuration, Math.max(0, timeSeconds)) / timelineDuration) * plotWidth
    );
    const yForPercentage = (percentage: number) => (
        INFERENCE_CHART_TOP + ((100 - percentage) / 100) * plotHeight
    );
    const mobilePlotWidth = MOBILE_GRAPH_WIDTH - MOBILE_GRAPH_LEFT - MOBILE_GRAPH_RIGHT;
    const mobilePlotHeight = MOBILE_GRAPH_HEIGHT - MOBILE_GRAPH_TOP - MOBILE_GRAPH_BOTTOM;
    const mobileXForTime = (timeSeconds: number) => (
        MOBILE_GRAPH_LEFT
        + (Math.min(timelineDuration, Math.max(0, timeSeconds)) / timelineDuration) * mobilePlotWidth
    );
    const mobileYForPercentage = (percentage: number) => (
        MOBILE_GRAPH_TOP + ((100 - percentage) / 100) * mobilePlotHeight
    );
    const timelineSeries = rankedPoints
        .map((point, index) => ({
            ...point,
            color: INFERENCE_SERIES_COLORS[config.kind][index % INFERENCE_SERIES_COLORS[config.kind].length],
            timeline: point.item.timeline
                .filter((timelinePoint) => timelinePoint.timeSeconds <= timelineDuration)
                .sort((left, right) => left.timeSeconds - right.timeSeconds),
        }))
        .filter((point) => point.timeline.length > 0);
    const timelineSeriesIds = new Set(timelineSeries.map((series) => series.id));
    const numericPointsWithoutTimeline = rankedPoints.filter((point) => !timelineSeriesIds.has(point.id));
    const topCommentPoint = rankedPoints[0] ?? legacyPoints[0];
    const topCommentEvidence = topCommentPoint?.item.evidence
        .map((index) => observations[index])
        .find(Boolean);
    const hasPriorityHealthSignal = config.kind === "health"
        && (urgency === "emergency" || urgency === "same_day");
    const topTimelineSeries = timelineSeries.find((series) => series.id === topCommentPoint?.id);
    const topPeak = topTimelineSeries?.timeline.reduce((highest, point) => (
        point.confidenceScore > highest.confidenceScore ? point : highest
    ));
    const interpretationComment = topCommentPoint
        ? topPeak
            ? `${topPeak.timeSeconds.toFixed(1)}초에 ‘${topCommentPoint.item.label}’ 근거가 ${Math.round(topPeak.confidenceScore * 100)}%로 가장 두드러졌어요.`
            : topCommentEvidence && topCommentPoint.percentage !== null
                ? `${topCommentEvidence.timeSeconds.toFixed(1)}초 장면을 근거로 ‘${topCommentPoint.item.label}’을 전체 ${topCommentPoint.percentage}% 후보로 봤어요.`
                : `‘${topCommentPoint.item.label}’은 이전 결과의 신뢰도 구간으로 확인해 주세요.`
        : config.empty;
    const urgentGraphGuidance = config.kind === "priority"
        ? items.some((item) => item.action === "emergency")
            ? "그래프의 순서나 점수와 관계없이 즉시 동물병원 연락 안내가 가장 우선이에요."
            : items.some((item) => item.action === "same_day")
                ? "그래프의 순서나 점수와 관계없이 오늘 안에 동물병원에 문의해 주세요."
                : ""
        : "";

    return (
        <article
            id={`daenglab-${config.kind}-inference-graph`}
            className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/90 bg-white/90 p-3.5 shadow-sm sm:p-4"
            data-daenglab-inference-line-graph={config.kind}
            data-daenglab-behavior-inference-graph={config.kind === "behavior" ? "" : undefined}
            data-daenglab-sound-inference-graph={config.kind === "sound" ? "" : undefined}
            data-daenglab-health-inference-graph={config.kind === "health" ? "" : undefined}
            data-daenglab-priority-inference-graph={config.kind === "priority" ? "" : undefined}
            aria-labelledby={`${graphId}-title`}
            aria-describedby={`${graphId}-description`}
        >
            <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0 sm:flex-1">
                    <p className={`text-xs font-black ${config.accent}`}>{config.eyebrow}</p>
                    <h4 id={`${graphId}-title`} className="mt-1 text-base font-black text-neutral-950 sm:text-lg">
                        <i className={`fa-solid ${config.icon} mr-2`} aria-hidden="true" />
                        {config.title}
                    </h4>
                    <p id={`${graphId}-description`} className="mt-1 max-w-3xl text-xs font-bold leading-5 text-neutral-600 sm:text-[13px]">
                        {config.description}
                    </p>
                </div>
                <span className={`rounded-full px-2.5 py-1.5 text-[11px] font-black ${config.badge}`}>
                    가로 시간 · 세로 지지도
                </span>
            </div>

            {timelineSeries.length > 0 ? (
                <>
                    <div
                        className="mt-3 min-w-0 lg:hidden"
                        data-daenglab-inference-mobile-graph={config.kind}
                    >
                        <svg
                            viewBox={`0 0 ${MOBILE_GRAPH_WIDTH} ${MOBILE_GRAPH_HEIGHT}`}
                            className="block h-auto w-full max-w-full"
                            preserveAspectRatio="xMidYMid meet"
                            role="img"
                            aria-label={timelineSeries
                                .map((point) => point.timeline.length === 1
                                    ? `${point.item.label} ${point.timeline[0].timeSeconds.toFixed(1)}초 한 시점 포착`
                                    : `${point.item.label} 시간별 영상 근거 지지도`)
                                .join(", ")}
                        >
                            <text
                                x={MOBILE_GRAPH_LEFT}
                                y="16"
                                fontSize="12"
                                fontWeight="900"
                                fill="#334155"
                            >
                                영상 근거 지지도(%)
                            </text>
                            {INFERENCE_GRAPH_TICKS.map((tick) => {
                                const y = mobileYForPercentage(tick);
                                return (
                                    <g key={`mobile-${tick}`}>
                                        <line
                                            x1={MOBILE_GRAPH_LEFT}
                                            x2={MOBILE_GRAPH_WIDTH - MOBILE_GRAPH_RIGHT}
                                            y1={y}
                                            y2={y}
                                            stroke={tick === 0 ? "#64748b" : config.grid}
                                            strokeWidth={tick === 0 ? 1.25 : 1}
                                            strokeDasharray={tick === 0 ? undefined : "4 5"}
                                        />
                                        <text
                                            x={MOBILE_GRAPH_LEFT - 7}
                                            y={y + 4}
                                            textAnchor="end"
                                            fontSize="11"
                                            fontWeight="800"
                                            fill="#64748b"
                                        >
                                            {tick}%
                                        </text>
                                    </g>
                                );
                            })}
                            {[0, timelineDuration / 2, timelineDuration].map((tick, index) => {
                                const x = mobileXForTime(tick);
                                return (
                                    <g key={`mobile-time-${index}`}>
                                        <line
                                            x1={x}
                                            x2={x}
                                            y1={MOBILE_GRAPH_TOP}
                                            y2={MOBILE_GRAPH_TOP + mobilePlotHeight}
                                            stroke="#e2e8f0"
                                            strokeWidth="1"
                                            strokeDasharray="3 5"
                                        />
                                        <text
                                            x={x}
                                            y={MOBILE_GRAPH_TOP + mobilePlotHeight + 20}
                                            textAnchor="middle"
                                            fontSize="11"
                                            fontWeight="800"
                                            fill="#64748b"
                                        >
                                            {tick.toFixed(tick % 1 === 0 ? 0 : 1)}초
                                        </text>
                                    </g>
                                );
                            })}
                            {timelineSeries.map((series, seriesIndex) => {
                                const polylinePoints = series.timeline
                                    .map((point) => `${mobileXForTime(point.timeSeconds)},${mobileYForPercentage(point.confidenceScore * 100)}`)
                                    .join(" ");
                                const peak = series.timeline.reduce((highest, point) => (
                                    point.confidenceScore > highest.confidenceScore ? point : highest
                                ));
                                const peakX = mobileXForTime(peak.timeSeconds);
                                const peakY = mobileYForPercentage(peak.confidenceScore * 100);
                                const labelY = peakLabelY(
                                    peakY,
                                    seriesIndex,
                                    timelineSeries.length,
                                    MOBILE_GRAPH_TOP,
                                    MOBILE_GRAPH_TOP + mobilePlotHeight,
                                );
                                return (
                                    <g
                                        key={`mobile-series-${series.id}`}
                                        style={{ "--daenglab-series-delay": `${seriesIndex * 130}ms` } as CSSProperties}
                                    >
                                        {series.timeline.length > 1 ? (
                                            <polyline
                                                points={polylinePoints}
                                                fill="none"
                                                stroke={series.color}
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                opacity="0.9"
                                                className="daenglab-timeline-line"
                                                data-inference-mobile-timeline-line
                                            />
                                        ) : (
                                            <line
                                                x1={Math.max(MOBILE_GRAPH_LEFT, peakX - 28)}
                                                x2={Math.min(MOBILE_GRAPH_WIDTH - MOBILE_GRAPH_RIGHT, peakX + 28)}
                                                y1={peakY}
                                                y2={peakY}
                                                stroke={series.color}
                                                strokeWidth="5"
                                                strokeLinecap="round"
                                                opacity="0.9"
                                                className="daenglab-timeline-single-point"
                                                data-inference-mobile-single-point-marker
                                            />
                                        )}
                                        {series.timeline.map((timelinePoint) => (
                                            <circle
                                                key={`${series.id}-${timelinePoint.timeSeconds}`}
                                                cx={mobileXForTime(timelinePoint.timeSeconds)}
                                                cy={mobileYForPercentage(timelinePoint.confidenceScore * 100)}
                                                r="4.5"
                                                fill="white"
                                                stroke={series.color}
                                                strokeWidth="3"
                                                className="daenglab-timeline-point"
                                                data-inference-mobile-point
                                            />
                                        ))}
                                        <circle
                                            cx={peakX}
                                            cy={peakY}
                                            r="10"
                                            fill={series.color}
                                            fillOpacity="0.18"
                                            className="daenglab-timeline-peak-halo"
                                        />
                                        <circle
                                            cx={peakX}
                                            cy={peakY}
                                            r="6.5"
                                            fill={series.color}
                                            stroke="white"
                                            strokeWidth="2.5"
                                            className="daenglab-timeline-peak"
                                            data-inference-peak
                                            data-inference-percentage={Math.round(peak.confidenceScore * 100)}
                                        />
                                        <text
                                            x={Math.max(MOBILE_GRAPH_LEFT + 24, Math.min(MOBILE_GRAPH_WIDTH - MOBILE_GRAPH_RIGHT - 24, peakX))}
                                            y={labelY}
                                            textAnchor="middle"
                                            fontSize="14"
                                            fontWeight="900"
                                            fill={series.color}
                                            className="daenglab-timeline-peak-label"
                                        >
                                            {Math.round(peak.confidenceScore * 100)}%
                                        </text>
                                    </g>
                                );
                            })}
                            <text
                                x={MOBILE_GRAPH_LEFT + mobilePlotWidth / 2}
                                y={MOBILE_GRAPH_HEIGHT - 8}
                                textAnchor="middle"
                                fontSize="12"
                                fontWeight="900"
                                fill="#475569"
                                data-inference-axis="x"
                            >
                                관찰 시간
                            </text>
                        </svg>
                    </div>

                    <div className="mt-3 hidden overflow-x-auto pb-1 lg:block" data-daenglab-inference-line-scroll={config.kind}>
                        <svg
                            viewBox={`0 0 ${chartWidth} ${INFERENCE_CHART_HEIGHT}`}
                            className="block w-full max-w-none"
                            style={{ minWidth: `${chartWidth}px` }}
                            role="img"
                            aria-label={timelineSeries
                                .map((point) => point.timeline.length === 1
                                    ? `${point.item.label} ${point.timeline[0].timeSeconds.toFixed(1)}초 한 시점 포착`
                                    : `${point.item.label} 시간별 영상 근거 지지도`)
                                .join(", ")}
                        >
                            {INFERENCE_GRAPH_TICKS.map((tick) => {
                                const y = yForPercentage(tick);
                                return (
                                    <g key={tick} data-inference-y-tick={tick}>
                                        <line
                                            x1={INFERENCE_CHART_LEFT}
                                            x2={chartWidth - INFERENCE_CHART_RIGHT}
                                            y1={y}
                                            y2={y}
                                            stroke={tick === 0 ? "#64748b" : config.grid}
                                            strokeWidth={tick === 0 ? 1.5 : 1}
                                            strokeDasharray={tick === 0 ? undefined : "5 6"}
                                        />
                                        <text
                                            x={INFERENCE_CHART_LEFT - 10}
                                            y={y + 4}
                                            textAnchor="end"
                                            fontSize="12"
                                            fontWeight="800"
                                            fill="#64748b"
                                        >
                                            {tick}%
                                        </text>
                                    </g>
                                );
                            })}
                            <text
                                x="17"
                                y={INFERENCE_CHART_TOP + plotHeight / 2}
                                textAnchor="middle"
                                fontSize="12"
                                fontWeight="900"
                                fill="#475569"
                                transform={`rotate(-90 17 ${INFERENCE_CHART_TOP + plotHeight / 2})`}
                                data-inference-axis="y"
                            >
                                영상 근거 지지도 (%)
                            </text>

                            {[0, timelineDuration / 2, timelineDuration].map((tick, index) => {
                                const x = xForTime(tick);
                                return (
                                    <g key={`time-${index}`}>
                                        <line
                                            x1={x}
                                            x2={x}
                                            y1={INFERENCE_CHART_TOP}
                                            y2={INFERENCE_CHART_TOP + plotHeight}
                                            stroke="#e2e8f0"
                                            strokeWidth="1"
                                            strokeDasharray="3 5"
                                        />
                                        <text
                                            x={x}
                                            y={INFERENCE_CHART_TOP + plotHeight + 22}
                                            textAnchor="middle"
                                            fontSize="12"
                                            fontWeight="800"
                                            fill="#64748b"
                                        >
                                            {tick.toFixed(tick % 1 === 0 ? 0 : 1)}초
                                        </text>
                                    </g>
                                );
                            })}

                            {timelineSeries.map((series, seriesIndex) => {
                                const polylinePoints = series.timeline
                                    .map((point) => `${xForTime(point.timeSeconds)},${yForPercentage(point.confidenceScore * 100)}`)
                                    .join(" ");
                                const peak = series.timeline.reduce((highest, point) => (
                                    point.confidenceScore > highest.confidenceScore ? point : highest
                                ));
                                const peakX = xForTime(peak.timeSeconds);
                                const peakY = yForPercentage(peak.confidenceScore * 100);
                                const labelY = peakLabelY(
                                    peakY,
                                    seriesIndex,
                                    timelineSeries.length,
                                    INFERENCE_CHART_TOP,
                                    INFERENCE_CHART_TOP + plotHeight,
                                );
                                return (
                                    <g
                                        key={`series-${series.id}`}
                                        style={{ "--daenglab-series-delay": `${seriesIndex * 130}ms` } as CSSProperties}
                                    >
                                        {series.timeline.length > 1 ? (
                                            <polyline
                                                points={polylinePoints}
                                                fill="none"
                                                stroke={series.color}
                                                strokeWidth="4.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                opacity="0.9"
                                                className="daenglab-timeline-line"
                                                data-inference-ranked-line
                                                data-inference-timeline-line
                                            />
                                        ) : (
                                            <line
                                                x1={Math.max(INFERENCE_CHART_LEFT, peakX - 32)}
                                                x2={Math.min(chartWidth - INFERENCE_CHART_RIGHT, peakX + 32)}
                                                y1={peakY}
                                                y2={peakY}
                                                stroke={series.color}
                                                strokeWidth="5"
                                                strokeLinecap="round"
                                                opacity="0.9"
                                                className="daenglab-timeline-single-point"
                                                data-inference-single-point-marker
                                            />
                                        )}
                                        {series.timeline.map((timelinePoint) => (
                                            <circle
                                                key={`${series.id}-${timelinePoint.timeSeconds}`}
                                                cx={xForTime(timelinePoint.timeSeconds)}
                                                cy={yForPercentage(timelinePoint.confidenceScore * 100)}
                                                r="4.5"
                                                fill="white"
                                                stroke={series.color}
                                                strokeWidth="3"
                                                className="daenglab-timeline-point"
                                                data-inference-line-point
                                            />
                                        ))}
                                        <circle
                                            cx={peakX}
                                            cy={peakY}
                                            r="12"
                                            fill={series.color}
                                            fillOpacity="0.16"
                                            className="daenglab-timeline-peak-halo"
                                        />
                                        <circle
                                            cx={peakX}
                                            cy={peakY}
                                            r="7"
                                            fill={series.color}
                                            stroke="white"
                                            strokeWidth="3"
                                            className="daenglab-timeline-peak"
                                            data-inference-peak
                                            data-inference-percentage={Math.round(peak.confidenceScore * 100)}
                                        />
                                        <text
                                            x={Math.max(INFERENCE_CHART_LEFT + 28, Math.min(chartWidth - INFERENCE_CHART_RIGHT - 28, peakX))}
                                            y={labelY}
                                            textAnchor="middle"
                                            fontSize="15"
                                            fontWeight="900"
                                            fill={series.color}
                                            className="daenglab-timeline-peak-label"
                                        >
                                            {Math.round(peak.confidenceScore * 100)}%
                                        </text>
                                    </g>
                                );
                            })}
                            <text
                                x={INFERENCE_CHART_LEFT + plotWidth / 2}
                                y={INFERENCE_CHART_HEIGHT - 15}
                                textAnchor="middle"
                                fontSize="12"
                                fontWeight="900"
                                fill="#475569"
                                data-inference-axis="x"
                            >
                                관찰 시간
                            </text>
                        </svg>
                    </div>
                </>
                ) : (
                    <div className="mt-3 grid min-h-44 place-items-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 text-center">
                        <div>
                            <i className="fa-solid fa-chart-line text-xl text-neutral-300" aria-hidden="true" />
                            <p className="mt-2 text-sm font-black text-neutral-700">
                                {rankedPoints.length > 0
                                    ? "이전 결과에는 시간별 지지도 좌표가 없어요."
                                    : items.length > 0 ? "이 분석에는 퍼센트 수치가 제공되지 않았어요." : config.empty}
                            </p>
                            {items.length > 0 && (
                                <p className="mt-1 text-xs font-bold leading-5 text-neutral-500">
                                    없는 시간 변화를 만들지 않고, 제공된 전체 지지도나 신뢰도 구간만 아래에 표시합니다.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            {timelineSeries.length > 0 && (
                <ol
                    className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2"
                    data-daenglab-inference-mobile-labels={config.kind}
                    data-daenglab-inference-series-legend={config.kind}
                >
                    {timelineSeries.map((series) => {
                        const peak = series.timeline.reduce((highest, timelinePoint) => (
                            timelinePoint.confidenceScore > highest.confidenceScore ? timelinePoint : highest
                        ));
                        return (
                            <li
                                key={`series-label-${series.id}`}
                                className="grid min-w-0 grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl bg-neutral-50 px-3 py-2.5"
                            >
                                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: series.color }} aria-hidden="true" />
                                <span className="min-w-0 [overflow-wrap:anywhere] text-[13px] font-black leading-5 text-neutral-800">
                                    {series.item.label}
                                    {series.timeline.length === 1 && (
                                        <span className="ml-1.5 inline-flex rounded-full bg-white px-1.5 py-0.5 align-middle text-[9px] font-black text-neutral-500">
                                            한 시점 포착
                                        </span>
                                    )}
                                </span>
                                <span className="whitespace-nowrap text-base font-black" style={{ color: series.color }}>
                                    {Math.round(peak.confidenceScore * 100)}%
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}
            {numericPointsWithoutTimeline.length > 0 && timelineSeries.length > 0 && (
                <p
                    className="mt-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-bold leading-5 text-neutral-500"
                    data-daenglab-inference-missing-timeline={config.kind}
                >
                    시간좌표가 없는 후보 {numericPointsWithoutTimeline.length}개는 임의의 선을 만들지 않고 아래 결과표에만 표시해요.
                </p>
            )}
            <p className="mt-3 text-xs font-bold leading-5 text-neutral-600">
                2개 이상은 실제 확인 시점을 선으로 연결하고, 한 시점만 확인되면 가짜 추세 없이 짧은 선과 점으로 표시해요. 큰 점과 %는 가장 강하게 포착된 시점이에요.
            </p>
            <div
                className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50/70 px-3.5 py-3"
                data-daenglab-inference-comment={config.kind}
            >
                <p className={`text-xs font-black ${config.accent}`}>한 줄 설명</p>
                <p className="mt-1 [overflow-wrap:anywhere] text-[13px] font-bold leading-6 text-neutral-700">
                    {interpretationComment}
                </p>
            </div>
            {urgentGraphGuidance && (
                <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-black leading-5 text-rose-800" role="alert">
                    {urgentGraphGuidance}
                </p>
            )}

            {legacyPoints.length > 0 && (
                <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5" data-daenglab-inference-legacy={config.kind}>
                    <p className="text-[10px] font-black text-neutral-600">구간만 제공된 이전 분석</p>
                    <p className="mt-1 text-[10px] font-bold leading-4 text-neutral-500">
                        과거 결과는 원본 영상이 없어 임의의 시간선을 만들지 않고 당시 전체 신뢰도 구간만 표시해요.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {legacyPoints.map((point) => (
                            <div key={point.id} className="rounded-xl bg-neutral-50 p-3">
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <span className="text-[11px] font-black leading-5 text-neutral-800">{point.item.label}</span>
                                    <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${config.badge}`}>
                                        {config.eyebrow}
                                    </span>
                                </div>
                                <ConfidenceBand confidence={point.item.confidence} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {config.kind === "health" && (
                <div
                    className={`mt-3 rounded-xl border px-3 py-2.5 text-[10px] font-bold leading-4 ${
                        hasPriorityHealthSignal
                            ? "border-amber-200 bg-amber-50 text-amber-900"
                            : "border-emerald-100 bg-emerald-50 text-emerald-900"
                    }`}
                    data-daenglab-health-nutrition-guidance
                >
                    {hasPriorityHealthSignal
                        ? "긴급 또는 당일 확인 신호가 있으면 영양식 추천보다 건강 관리 안내와 동물병원 문의를 먼저 확인해 주세요."
                        : "영양식은 관찰 신호와 강아지 프로필·알레르기·기저질환을 함께 확인한 뒤 참고용으로 제안해야 합니다."}
                </div>
            )}

            <section
                className="mt-4 min-w-0 rounded-xl border border-neutral-200 bg-white p-3 lg:hidden"
                data-daenglab-inference-result-cards={config.kind}
            >
                <h5 className="text-sm font-black text-neutral-950">{config.tableTitle}</h5>
                <p className="mt-1 text-xs font-bold leading-5 text-neutral-500">{config.tableDescription}</p>
                <div className="mt-3 grid min-w-0 gap-2">
                    {tablePoints.length > 0 ? tablePoints.map((point) => {
                        const numericRank = point.percentage === null
                            ? null
                            : rankedPoints.findIndex((candidate) => candidate.id === point.id) + 1;
                        const evidenceItems = point.item.evidence
                            .map((evidenceIndex) => observations[evidenceIndex])
                            .filter(Boolean)
                            .slice(0, 2);
                        return (
                            <article key={`mobile-table-${point.id}`} className="min-w-0 rounded-xl bg-neutral-50 p-3">
                                <div className="flex min-w-0 items-start gap-2.5">
                                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${
                                        numericRank === 1 ? config.rankBadge : "bg-white text-neutral-600"
                                    }`}>
                                        {numericRank ?? "—"}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="[overflow-wrap:anywhere] text-[13px] font-black leading-5 text-neutral-900">
                                            {point.item.label}
                                        </p>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                            <span className={`rounded-lg px-2 py-1 text-xs font-black ${config.confidenceBadge}`}>
                                                {point.percentage === null ? "구간형 결과" : `추론 ${point.percentage}%`}
                                            </span>
                                            <span className={`text-xs font-black ${
                                                numericRank === 1 ? config.accent : "text-neutral-600"
                                            }`}>
                                                {point.item.action
                                                    ? URGENCY_LABEL[point.item.action]
                                                    : numericRank === 1
                                                        ? "최상위 후보"
                                                        : candidateConfidenceLabel(point.item.confidence)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-2 [overflow-wrap:anywhere] text-xs font-bold leading-5 text-neutral-600">
                                    {evidenceItems.length > 0
                                        ? evidenceItems.map((evidence) => `${evidence.timeSeconds.toFixed(1)}초 ${evidence.description}`).join(" · ")
                                        : "관찰 근거를 다시 확인해 주세요."}
                                </p>
                            </article>
                        );
                    }) : (
                        <p className="rounded-xl bg-neutral-50 px-3 py-6 text-center text-[11px] font-bold text-neutral-500">
                            {config.empty}
                        </p>
                    )}
                </div>
            </section>

            <div className="mt-4 hidden overflow-x-auto rounded-xl border border-neutral-200 bg-white lg:block">
                <table
                    className="w-full min-w-[680px] border-collapse text-left"
                    data-daenglab-inference-result-table={config.kind}
                    data-daenglab-behavior-result-table={config.kind === "behavior" ? "" : undefined}
                    data-daenglab-sound-result-table={config.kind === "sound" ? "" : undefined}
                    data-daenglab-health-result-table={config.kind === "health" ? "" : undefined}
                    data-daenglab-priority-result-table={config.kind === "priority" ? "" : undefined}
                >
                    <caption className="border-b border-neutral-100 px-4 py-3 text-left">
                        <span className="block text-sm font-black text-neutral-950">{config.tableTitle}</span>
                        <span className="mt-0.5 block text-[10px] font-bold text-neutral-500">
                            {config.tableDescription}
                        </span>
                    </caption>
                    <thead className="bg-neutral-50 text-[10px] font-black text-neutral-500">
                        <tr>
                            <th className="w-14 px-3 py-2.5 text-center">순위</th>
                            <th className="min-w-44 px-3 py-2.5">추론 후보</th>
                            <th className="w-28 px-3 py-2.5">신뢰도</th>
                            <th className="min-w-64 px-3 py-2.5">관찰 근거</th>
                            <th className="w-24 px-3 py-2.5">상태</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-[11px] font-bold text-neutral-700">
                        {tablePoints.length > 0 ? tablePoints.map((point) => {
                            const numericRank = point.percentage === null
                                ? null
                                : rankedPoints.findIndex((candidate) => candidate.id === point.id) + 1;
                            const evidenceItems = point.item.evidence
                                .map((evidenceIndex) => observations[evidenceIndex])
                                .filter(Boolean)
                                .slice(0, 2);
                            return (
                                <tr key={`table-${point.id}`} className="align-top">
                                    <td className="px-3 py-3 text-center">
                                        {numericRank ? (
                                            <span className={`inline-grid h-7 w-7 place-items-center rounded-full font-black ${
                                                numericRank === 1 ? config.rankBadge : "bg-neutral-100 text-neutral-600"
                                            }`}>
                                                {numericRank}
                                            </span>
                                        ) : "—"}
                                    </td>
                                    <td className="px-3 py-3 font-black leading-5 text-neutral-900">{point.item.label}</td>
                                    <td className="px-3 py-3">
                                        {point.percentage === null ? (
                                            <span className="text-neutral-500">구간형 결과</span>
                                        ) : (
                                            <span className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 font-black ${config.confidenceBadge}`}>
                                                추론 {point.percentage}%
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 leading-5 text-neutral-600">
                                        {evidenceItems.length > 0
                                            ? evidenceItems.map((evidence) => `${evidence.timeSeconds.toFixed(1)}초 ${evidence.description}`).join(" · ")
                                            : "관찰 근거를 다시 확인해 주세요."}
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className={`whitespace-nowrap font-black ${
                                            numericRank === 1 ? config.accent : "text-neutral-600"
                                        }`}>
                                            {point.item.action
                                                ? URGENCY_LABEL[point.item.action]
                                                : numericRank === 1
                                                    ? "최상위 후보"
                                                    : candidateConfidenceLabel(point.item.confidence)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                                    {config.empty}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </article>
    );
}

function InferenceConfidenceOverview({ result }: { result: PetObservationResult }) {
    const qualityLabel = result.quality.level === "good"
        ? "관찰 품질 양호"
        : result.quality.level === "limited"
            ? "관찰 품질 제한"
            : "재촬영 권장";
    const behaviorItems: InferenceDisplayItem[] = result.behaviorCandidates;
    const soundItems: InferenceDisplayItem[] = result.barkContextCandidates;
    const healthItems: InferenceDisplayItem[] = result.healthCandidates;
    const priorityItems: InferenceDisplayItem[] = result.symptomSignals;
    const groupedItems: Record<InferenceGroupKind, InferenceDisplayItem[]> = {
        behavior: behaviorItems,
        sound: soundItems,
        health: healthItems,
        priority: priorityItems,
    };
    const highPriority = result.urgency.level === "emergency" || result.urgency.level === "same_day";

    return (
        <section
            className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4 shadow-[0_18px_50px_-34px_rgba(79,70,229,0.65)] sm:p-5"
            data-daenglab-inference-confidence
        >
            <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-black tracking-[0.1em] text-indigo-600">
                        {typeof result.durationSeconds === "number"
                            ? `${Number.isInteger(result.durationSeconds) ? result.durationSeconds : result.durationSeconds.toFixed(1)}초 관찰 흐름`
                            : "관찰 흐름"}
                    </p>
                    <h3 className="mt-1 text-xl font-black text-neutral-950">시간별 행동·소리·건강 관찰</h3>
                </div>
                <span className="rounded-full border border-white bg-white/90 px-3 py-1.5 text-[11px] font-black text-neutral-600 shadow-sm">
                    최고 지점 표시
                </span>
            </div>
            <p className="mt-2 max-w-3xl text-[13px] font-bold leading-6 text-neutral-600">
                각 %는 정답률이나 진단 확률이 아니라, 그 시점의 영상·소리 근거가 후보를 얼마나 뒷받침하는지 보여줍니다.
            </p>

            <div
                className="mt-4 rounded-2xl border border-white/90 bg-white/85 p-3.5 shadow-sm"
                data-daenglab-overall-inference-state
            >
                <p className="text-[10px] font-black text-neutral-400">전반적인 상태</p>
                <p className="mt-1 text-sm font-black leading-6 text-neutral-900">{result.summary}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className={`rounded-xl bg-gradient-to-br px-3 py-2.5 text-white ${
                        highPriority ? "from-rose-600 to-rose-700" : "from-indigo-600 to-indigo-700"
                    }`}>
                        <p className={`text-[9px] font-black ${highPriority ? "text-rose-100" : "text-indigo-100"}`}>
                            우선 확인 상태
                        </p>
                        <p className="mt-1 text-xs font-black">
                            {URGENCY_LABEL[result.urgency.level]}
                        </p>
                    </div>
                    <div className="rounded-xl bg-neutral-100 px-3 py-2.5 text-neutral-700">
                        <p className="text-[9px] font-black text-neutral-500">촬영·분석 상태</p>
                        <p className="mt-1 text-xs font-black">{qualityLabel}</p>
                        <p className="mt-1 text-[9px] font-bold text-neutral-500">
                            행동 {groupedItems.behavior.length} · 소리 {groupedItems.sound.length} · 건강 {groupedItems.health.length} · 확인 {groupedItems.priority.length}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-4 grid gap-4">
                {INFERENCE_GROUPS.map((config) => (
                    <InferenceGroupLinePanel
                        key={config.kind}
                        config={config}
                        items={groupedItems[config.kind]}
                        observations={result.observations}
                        urgency={result.urgency.level}
                        durationSeconds={result.durationSeconds}
                    />
                ))}
            </div>
        </section>
    );
}

function CandidateCards({
    items,
    observations,
    ranked = false,
}: {
    items: PetObservationCandidate[];
    observations: PetObservationResult["observations"];
    ranked?: boolean;
}) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item, itemIndex) => (
                <article key={`${item.label}-${item.evidence.join("-")}`} className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            {ranked && (
                                <span className="mb-1 inline-flex rounded-full bg-cyan-600 px-2 py-0.5 text-[9px] font-black text-white">
                                    {itemIndex + 1}순위
                                </span>
                            )}
                            <p className="break-words text-sm font-black leading-6 text-neutral-950">{item.label}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">
                            {typeof item.confidenceScore === "number"
                                ? `근거 ${Math.round(item.confidenceScore * 100)}%`
                                : `확신 ${item.confidence === "high" ? "높음" : item.confidence === "medium" ? "중간" : "낮음"}`}
                        </span>
                    </div>
                    <ul className="mt-3 grid gap-1.5 text-xs font-bold leading-5 text-neutral-600">
                        {item.evidence.map((index) => observations[index] && (
                            <li key={index} className="flex gap-2">
                                <span className="font-black text-indigo-600">{observations[index].timeSeconds.toFixed(1)}초</span>
                                <span>{observations[index].description}</span>
                            </li>
                        ))}
                    </ul>
                    {item.otherPossibility && (
                        <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-[11px] font-bold leading-5 text-neutral-600">
                            다른 가능성: {item.otherPossibility}
                        </p>
                    )}
                </article>
            ))}
        </div>
    );
}

function TargetAttributionPanel({ result }: { result: PetObservationResult }) {
    const isLegacy = result.analysisContractVersion < 2;
    const targetIdentified = result.quality.targetStatus === "identified";
    const targetVocalizations = result.observations
        .filter((item) => item.modality === "vocalization" && item.source === "target_dog")
        .slice(0, 4);
    const omittedVocalizationCount = Math.max(
        0,
        result.observations.filter(
            (item) => item.modality === "vocalization" && item.source === "target_dog",
        ).length - targetVocalizations.length,
    );
    const companionBadges = [
        result.quality.visibleDogCount > 0 ? `강아지 ${result.quality.visibleDogCount}마리` : "",
        result.quality.peopleVisible ? "사람 함께 있음" : "",
        result.quality.catVisible ? "고양이 함께 있음" : "",
        result.quality.otherAnimalsVisible ? "다른 동물 함께 있음" : "",
        result.quality.mixedAudio ? "혼합 소리" : "",
    ].filter(Boolean);

    if (isLegacy) {
        return (
            <section
                className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                data-daenglab-target-attribution="legacy"
            >
                <p className="text-xs font-black text-neutral-800">이전 분석 결과</p>
                <p className="mt-1 text-[11px] font-bold leading-5 text-neutral-600">
                    이 결과에는 행동·발성 주체를 나눈 정보가 없어, 영상 속 특정 강아지와 등록 반려견이 같다고 단정하지 않습니다.
                </p>
            </section>
        );
    }

    return (
        <section
            className={`rounded-3xl border p-4 sm:p-5 ${
                targetIdentified
                    ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50"
                    : "border-amber-300 bg-amber-50"
            }`}
            data-daenglab-target-attribution={result.quality.targetStatus}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className={`text-[10px] font-black tracking-[0.1em] ${
                        targetIdentified ? "text-emerald-700" : "text-amber-800"
                    }`}>
                        분석 대상 분리
                    </p>
                    <h3 className="mt-1 break-words text-lg font-black leading-7 text-neutral-950">
                        {targetIdentified
                            ? result.quality.targetDescriptor || "영상에서 한 마리로 구분된 강아지"
                            : result.quality.targetStatus === "not_visible"
                                ? "분석할 강아지를 확인하지 못했어요"
                                : "한 마리의 분석 대상으로 구분하지 못했어요"}
                    </h3>
                </div>
                {targetIdentified && (
                    <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-emerald-800 shadow-sm">
                        대상 구분 근거 {Math.round(result.quality.targetConfidenceScore * 100)}%
                    </span>
                )}
            </div>

            {companionBadges.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {companionBadges.map((label) => (
                        <span key={label} className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-neutral-700">
                            {label}
                        </span>
                    ))}
                </div>
            )}

            <p className="mt-3 text-xs font-bold leading-5 text-neutral-700">
                {targetIdentified
                    ? "아래 행동·발성·건강 후보에는 이 대상으로 귀속된 근거만 사용했어요."
                    : "잘못된 귀속을 피하려고 행동·짖음 맥락·건강 후보를 만들지 않았어요. 구분 가능한 영상으로 다시 촬영해 주세요."}
            </p>
            {result.quality.attributionReason && (
                <p className="mt-2 text-[11px] font-bold leading-5 text-neutral-500">
                    구분 근거: {result.quality.attributionReason}
                </p>
            )}

            {targetVocalizations.length > 0 && (
                <div className="mt-4 border-t border-emerald-200/70 pt-3">
                    <p className="text-[10px] font-black text-emerald-800">대상 강아지 발성으로 분리된 시점</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {targetVocalizations.map((item) => (
                            <span
                                key={`${item.timeSeconds}-${item.vocalizationKind}-${item.description}`}
                                className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-cyan-800 shadow-sm"
                            >
                                {item.timeSeconds.toFixed(1)}초 · {VOCALIZATION_KIND_LABEL[item.vocalizationKind]}
                            </span>
                        ))}
                        {omittedVocalizationCount > 0 && (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-neutral-600">
                                +{omittedVocalizationCount}개 시점
                            </span>
                        )}
                    </div>
                </div>
            )}

            {result.quality.interferenceSources.length > 0 && (
                <p className="mt-3 text-[10px] font-bold leading-5 text-neutral-500">
                    대상견 근거에서 제외한 소리: {result.quality.interferenceSources.map((source) => INTERFERENCE_LABEL[source]).join(" · ")}
                </p>
            )}
        </section>
    );
}

function BarkContextTranslator({ result }: { result: PetObservationResult }) {
    const isLegacy = result.analysisContractVersion < 2;
    if (isLegacy && result.barkContextCandidates.length === 0) return null;

    const translated = result.barkContextCandidates.length > 0;
    const targetAmbiguous = result.quality.targetStatus === "ambiguous";
    const vocalizationPossible = result.quality.targetVocalizationStatus === "possible";
    const noTargetVocalization = result.quality.targetVocalizationStatus === "not_detected";
    const emptyMessage = targetAmbiguous
        ? "분석할 강아지를 한 마리로 구분하지 못해 발성 맥락을 번역하지 않았어요."
        : vocalizationPossible
            ? "발성일 수 있는 소리는 있었지만 어느 동물의 소리인지 분리하지 못해 번역하지 않았어요."
            : noTargetVocalization
                ? "분석 대상 강아지의 발성이 확인되지 않아 번역 후보를 만들지 않았어요."
                : "발성은 확인했지만 맥락을 좁힐 영상·상황 근거가 부족했어요.";

    return (
        <section
            className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-indigo-50 p-4 sm:p-5"
            data-daenglab-bark-context-translator={translated ? "ready" : "abstained"}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black tracking-[0.1em] text-cyan-700">맥락 번역</p>
                    <h3 className="mt-1 text-lg font-black text-neutral-950">짖음·발성 맥락 번역 후보</h3>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-cyan-800 shadow-sm">
                    사람 문장 번역 아님
                </span>
            </div>
            <p className="mt-2 text-[11px] font-bold leading-5 text-neutral-600">
                발성 종류와 같은 시점의 자세·움직임·주변 자극을 묶어 “왜 그랬을 가능성이 큰지”를 최대 세 가지로 보여줘요.
            </p>
            {translated ? (
                <div className="mt-4">
                    <CandidateCards
                        ranked
                        items={result.barkContextCandidates}
                        observations={result.observations}
                    />
                </div>
            ) : (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-black leading-5 text-amber-950">
                    {emptyMessage}
                </div>
            )}
            {isLegacy && (
                <p className="mt-3 text-[10px] font-bold text-neutral-500">
                    이전 결과라 발성 주체 분리 정보가 없습니다. 새 분석부터 대상견 귀속이 확인된 경우에만 후보를 표시합니다.
                </p>
            )}
        </section>
    );
}

export default function PetLensObservationResult({ result }: { result: PetObservationResult }) {
    return (
        <div className="grid min-w-0 max-w-full gap-4" data-petlens-observation-result>
            <TargetAttributionPanel result={result} />
            <BarkContextTranslator result={result} />
            <InferenceConfidenceOverview result={result} />

            <section className={`rounded-2xl border p-4 sm:p-5 ${URGENCY_STYLE[result.urgency.level]}`} data-observation-urgency={result.urgency.level}>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black">
                        {URGENCY_LABEL[result.urgency.level]}
                    </span>
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black">
                        영상·소리 통합 관찰
                    </span>
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black">
                        원본 영상 미저장
                    </span>
                </div>
                <h3 className="mt-3 text-lg font-black leading-7">{result.urgency.headline}</h3>
                <p className="mt-2 text-sm font-bold leading-6 opacity-85">{result.summary}</p>
                {result.urgency.reasons.length > 0 && (
                    <ul className="mt-3 grid gap-1.5 text-xs font-bold leading-5">
                        {result.urgency.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
                    </ul>
                )}
                {result.urgency.actions.length > 0 && (
                    <div className="mt-4 grid gap-2 rounded-xl bg-white/75 p-3 text-xs font-black leading-5">
                        {result.urgency.actions.map((action) => <p key={action}>{action}</p>)}
                    </div>
                )}
                {result.urgency.level === "emergency" && (
                    <a
                        href="https://map.kakao.com/link/search/24%EC%8B%9C%20%EB%8F%99%EB%AC%BC%EB%B3%91%EC%9B%90"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-700 px-4 text-sm font-black text-white"
                    >
                        가까운 24시 동물병원 찾기
                    </a>
                )}
                <p className="mt-4 border-t border-current/15 pt-3 text-[10px] font-bold leading-4 opacity-75">
                    건강 신호는 평소 상태와 비교해 확인해 주세요. 걱정되는 변화가 지속되거나 심해지면 동물병원에 문의해 주세요.
                </p>
            </section>

            <PetObservationNutritionRecommendations result={result} />

            <section
                className="rounded-2xl border border-sky-200 bg-sky-50 p-4"
                data-daenglab-video-retention-notice
            >
                <div className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sky-700" aria-hidden="true">
                        <i className="fa-solid fa-shield-halved text-xs" />
                    </span>
                    <div>
                        <p className="text-xs font-black leading-5 text-sky-950">
                            분석한 동영상은 저장되지 않습니다. 분석 중에만 일시 처리됩니다.
                        </p>
                        <p className="mt-1 text-[11px] font-bold leading-5 text-sky-800">
                            보안 연결로 분석 중에만 일시 처리하며, 댕다방은 원본이 아닌 분석 결과만 보관합니다.
                        </p>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-black text-neutral-500">촬영 품질</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
                    <span className="rounded-full bg-neutral-100 px-3 py-1.5">
                        강아지 {result.quality.dogVisible ? `${result.quality.visibleDogCount || 1}마리 확인` : "확인 어려움"}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1.5">
                        소리 {result.quality.audioAvailable ? "확인" : "확인 어려움"}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1.5">
                        대상견 발성 {result.quality.vocalizationDetected ? "주체 확인" : result.quality.targetVocalizationStatus === "possible" ? "주체 불명확" : "미포착"}
                        {result.quality.barkDetected ? " · 짖음 포함" : ""}
                    </span>
                    {result.analysisContractVersion >= 2 && (
                        <span className="rounded-full bg-neutral-100 px-3 py-1.5">
                            대상 {result.quality.targetStatus === "identified" ? "구분됨" : result.quality.targetStatus === "ambiguous" ? "구분 어려움" : "미확인"}
                        </span>
                    )}
                </div>
                {result.quality.issues.length > 0 && (
                    <p className="mt-3 text-xs font-bold leading-5 text-neutral-600">{result.quality.issues.join(" · ")}</p>
                )}
            </section>

            {result.observations.length > 0 && (
                <section className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="mb-3">
                        <p className="text-xs font-black text-neutral-500">영상에서 포착된 관찰 근거</p>
                        <p className="mt-1 text-[11px] font-bold text-neutral-400">화면·소리에서 잡힌 내용과 자동 분석 확신도를 함께 표시합니다.</p>
                    </div>
                    <ol className="grid gap-2">
                        {result.observations.map((item, index) => (
                            <li key={`${item.timeSeconds}-${item.description}`} className="flex gap-3 rounded-xl bg-neutral-50 p-3">
                                <span className="mt-0.5 shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-indigo-700">
                                    {item.timeSeconds.toFixed(1)}초
                                </span>
                                <div>
                                    <p className="text-[10px] font-black text-neutral-400">
                                        관찰 {index + 1} · {MODALITY_LABEL[item.modality]} · {SOURCE_LABEL[item.source]} · 확신 {item.confidence === "high" ? "높음" : item.confidence === "medium" ? "중간" : "낮음"}
                                    </p>
                                    <p className="mt-0.5 text-xs font-bold leading-5 text-neutral-700">{item.description}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>
            )}

            {result.behaviorCandidates.length > 0 && (
                <section>
                    <p className="mb-3 text-sm font-black text-neutral-950">행동 패턴 후보</p>
                    <CandidateCards items={result.behaviorCandidates} observations={result.observations} />
                </section>
            )}

            {result.symptomSignals.length > 0 && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                    <p className="text-sm font-black text-amber-950">증상으로 이어질 수 있어 확인할 신호</p>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-amber-800">질병 진단이 아니라 영상에서 보이거나 들린 신호입니다.</p>
                    <div className="mt-3 grid gap-2">
                        {result.symptomSignals.map((signal) => (
                            <article key={`${signal.label}-${signal.evidence.join("-")}`} className="rounded-xl bg-white/80 p-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <p className="text-xs font-black text-neutral-900">{signal.label}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-black text-neutral-700">
                                            확신 {signal.confidence === "medium" ? "중간" : "낮음"}
                                        </span>
                                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-900">
                                            {URGENCY_LABEL[signal.action]}
                                        </span>
                                    </div>
                                </div>
                                <ul className="mt-2 grid gap-1 text-[11px] font-bold leading-5 text-neutral-600">
                                    {signal.evidence.map((index) => result.observations[index] && (
                                        <li key={index}>
                                            <span className="mr-1.5 font-black text-amber-800">{result.observations[index].timeSeconds.toFixed(1)}초</span>
                                            {result.observations[index].description}
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {result.retakeGuidance.length > 0 && (
                <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <p className="mb-2 text-xs font-black text-sky-900">다시 촬영하면 좋아지는 점</p>
                    <p className="text-xs font-bold leading-5 text-sky-800">{result.retakeGuidance.join(" · ")}</p>
                </section>
            )}

        </div>
    );
}
