"use client";

import { useId } from "react";
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
    posture: "자세",
    movement: "움직임",
    breathing: "호흡 모습",
    interaction: "반응",
    quality: "촬영 품질",
};

type InferenceGroupKind = "behavior" | "sound" | "health" | "priority";

type InferenceDisplayItem = {
    label: string;
    confidence: PetObservationCandidate["confidence"];
    confidenceScore?: number;
    evidence: number[];
    action?: PetObservationUrgencyLevel;
    comment?: string;
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
        title: "행동 추론 그래프",
        eyebrow: "움직임·자세·반응",
        description: "몸의 움직임, 자세와 주변 반응을 함께 비교한 행동 후보입니다.",
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
        title: "소리 맥락 해석 그래프",
        eyebrow: "짖음·울음 맥락",
        description: "짖음·울음의 높낮이, 반복, 간격과 당시 상황을 함께 본 가능한 맥락입니다. 사람 문장처럼 확정 번역하지 않아요.",
        empty: "뚜렷한 짖음이나 울음이 포착되지 않아 소리 후보를 만들지 않았어요.",
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
        title: "건강 상태 신호 그래프",
        eyebrow: "신체·컨디션 관찰",
        description: "영상에서 관찰된 자세, 움직임, 호흡 등 신체·컨디션 신호를 평소 상태와 비교합니다.",
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
        title: "증상·우선 확인 신호 그래프",
        eyebrow: "증상 신호·확인 순서",
        description: "영상에서 보이거나 들린 증상 신호를 추론 근거가 높은 순서로 비교하고, 보호자가 확인할 순서를 함께 표시합니다.",
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

const INFERENCE_GRAPH_TICKS = [100, 80, 60, 40, 20, 0] as const;
const INFERENCE_CHART_TOP = 54;
const INFERENCE_CHART_RIGHT = 34;
const INFERENCE_CHART_BOTTOM = 96;
const INFERENCE_CHART_LEFT = 58;
const INFERENCE_CHART_HEIGHT = 338;

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

function compactGraphLabel(label: string) {
    const normalized = label
        .replace(/\s*(가능성|행동 패턴|행동|맥락|신호)\s*$/u, "")
        .trim();
    if (normalized.length <= 12) return normalized;
    return `${normalized.slice(0, 11)}…`;
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
}: {
    config: InferenceGroupConfig;
    items: InferenceDisplayItem[];
    observations: PetObservationResult["observations"];
    urgency: PetObservationUrgencyLevel;
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
    const chartWidth = Math.max(
        680,
        INFERENCE_CHART_LEFT + INFERENCE_CHART_RIGHT + Math.max(1, rankedPoints.length) * 148,
    );
    const plotWidth = chartWidth - INFERENCE_CHART_LEFT - INFERENCE_CHART_RIGHT;
    const plotHeight = INFERENCE_CHART_HEIGHT - INFERENCE_CHART_TOP - INFERENCE_CHART_BOTTOM;
    const xForIndex = (index: number) => rankedPoints.length <= 1
        ? INFERENCE_CHART_LEFT + plotWidth / 2
        : INFERENCE_CHART_LEFT + (plotWidth * index) / (rankedPoints.length - 1);
    const yForPercentage = (percentage: number) => (
        INFERENCE_CHART_TOP + ((100 - percentage) / 100) * plotHeight
    );
    const linePoints = rankedPoints
        .map((point, index) => `${xForIndex(index)},${yForPercentage(point.percentage)}`)
        .join(" ");
    const topCommentPoint = rankedPoints[0] ?? legacyPoints[0];
    const topCommentEvidence = topCommentPoint?.item.evidence
        .map((index) => observations[index])
        .find(Boolean);
    const hasPriorityHealthSignal = config.kind === "health"
        && (urgency === "emergency" || urgency === "same_day");
    const interpretationComment = topCommentPoint
        ? [
            `가장 먼저 확인된 후보는 ‘${topCommentPoint.item.label}’입니다.`,
            topCommentPoint.percentage !== null
                ? `관찰 근거 지지도는 추론 ${topCommentPoint.percentage}%입니다.`
                : "이전 분석은 신뢰도 구간으로 확인해 주세요.",
            topCommentEvidence
                ? `${topCommentEvidence.timeSeconds.toFixed(1)}초의 ${topCommentEvidence.description} 장면이 주요 근거입니다.`
                : "",
            topCommentPoint.item.comment || "",
        ].filter(Boolean).join(" ")
        : config.empty;

    return (
        <article
            className="overflow-hidden rounded-2xl border border-white/90 bg-white/90 p-3.5 shadow-sm sm:p-4"
            data-daenglab-inference-line-graph={config.kind}
            data-daenglab-behavior-inference-graph={config.kind === "behavior" ? "" : undefined}
            data-daenglab-sound-inference-graph={config.kind === "sound" ? "" : undefined}
            data-daenglab-health-inference-graph={config.kind === "health" ? "" : undefined}
            data-daenglab-priority-inference-graph={config.kind === "priority" ? "" : undefined}
            aria-labelledby={`${graphId}-title`}
            aria-describedby={`${graphId}-description`}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className={`text-[10px] font-black ${config.accent}`}>{config.eyebrow}</p>
                    <h4 id={`${graphId}-title`} className="mt-1 text-sm font-black text-neutral-950">
                        <i className={`fa-solid ${config.icon} mr-2`} aria-hidden="true" />
                        {config.title}
                    </h4>
                    <p id={`${graphId}-description`} className="mt-1 max-w-3xl text-[10px] font-bold leading-4 text-neutral-500">
                        {config.description}
                    </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${config.badge}`}>
                    높은 추론 → 낮은 추론
                </span>
            </div>

            {rankedPoints.length > 0 ? (
                    <div className="mt-3 overflow-x-auto pb-1" data-daenglab-inference-line-scroll={config.kind}>
                        <svg
                            viewBox={`0 0 ${chartWidth} ${INFERENCE_CHART_HEIGHT}`}
                            className="block w-full max-w-none"
                            style={{ minWidth: `${chartWidth}px` }}
                            role="img"
                            aria-label={rankedPoints
                                .map((point) => `${point.item.label} 추론 ${point.percentage}%`)
                                .join(", ")}
                        >
                            <defs>
                                <linearGradient id={`${graphId}-line-gradient`} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={config.point} stopOpacity="1" />
                                    <stop offset="100%" stopColor={config.point} stopOpacity="0.55" />
                                </linearGradient>
                                <filter id={`${graphId}-point-shadow`} x="-50%" y="-50%" width="200%" height="200%">
                                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={config.point} floodOpacity="0.18" />
                                </filter>
                            </defs>

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
                                            fontSize="10"
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
                                fontSize="10"
                                fontWeight="900"
                                fill="#475569"
                                transform={`rotate(-90 17 ${INFERENCE_CHART_TOP + plotHeight / 2})`}
                                data-inference-axis="y"
                            >
                                추론 신뢰도 (%)
                            </text>

                            {rankedPoints.length > 1 && (
                                <polyline
                                    points={linePoints}
                                    fill="none"
                                    stroke={`url(#${graphId}-line-gradient)`}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    data-inference-ranked-line
                                />
                            )}

                            {rankedPoints.map((point, index) => {
                                const x = xForIndex(index);
                                const y = yForPercentage(point.percentage);
                                const bubbleBelow = point.percentage >= 84;
                                const bubbleY = bubbleBelow ? y + 13 : y - 49;
                                const compactLabel = compactGraphLabel(point.item.label);
                                return (
                                    <g
                                        key={point.id}
                                        data-inference-line-point
                                        data-inference-percentage={point.percentage}
                                    >
                                        <line
                                            x1={x}
                                            x2={x}
                                            y1={bubbleBelow ? y + 8 : bubbleY + 38}
                                            y2={bubbleBelow ? bubbleY : y - 8}
                                            stroke={config.point}
                                            strokeWidth="1"
                                            strokeDasharray="2 3"
                                            opacity="0.55"
                                        />
                                        <rect
                                            x={x - 59}
                                            y={bubbleY}
                                            width="118"
                                            height="38"
                                            rx="10"
                                            fill="white"
                                            stroke={config.point}
                                            strokeOpacity="0.3"
                                            filter={`url(#${graphId}-point-shadow)`}
                                        />
                                        <text
                                            x={x}
                                            y={bubbleY + 15}
                                            textAnchor="middle"
                                            fontSize="11"
                                            fontWeight="900"
                                            fill={config.point}
                                        >
                                            추론 {point.percentage}%
                                        </text>
                                        <text
                                            x={x}
                                            y={bubbleY + 30}
                                            textAnchor="middle"
                                            fontSize="9"
                                            fontWeight="800"
                                            fill="#334155"
                                        >
                                            “{compactLabel}”
                                        </text>
                                        <circle cx={x} cy={y} r="12" fill={config.point} fillOpacity="0.14" />
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r="6.5"
                                            fill={config.point}
                                            stroke="white"
                                            strokeWidth="3"
                                        />
                                        <text
                                            x={x}
                                            y={INFERENCE_CHART_TOP + plotHeight + 28}
                                            textAnchor="middle"
                                            fontSize="10"
                                            fontWeight="900"
                                            fill="#0f172a"
                                        >
                                            {compactLabel}
                                        </text>
                                        <text
                                            x={x}
                                            y={INFERENCE_CHART_TOP + plotHeight + 45}
                                            textAnchor="middle"
                                            fontSize="9"
                                            fontWeight="800"
                                            fill={config.point}
                                        >
                                            {index + 1}순위
                                        </text>
                                    </g>
                                );
                            })}
                            <text
                                x={INFERENCE_CHART_LEFT + plotWidth / 2}
                                y={INFERENCE_CHART_HEIGHT - 15}
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="900"
                                fill="#475569"
                                data-inference-axis="x"
                            >
                                {config.title.replace(" 그래프", "")} (높은 추론 → 낮은 추론)
                            </text>
                        </svg>
                    </div>
                ) : (
                    <div className="mt-3 grid min-h-44 place-items-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 text-center">
                        <div>
                            <i className="fa-solid fa-chart-line text-xl text-neutral-300" aria-hidden="true" />
                            <p className="mt-2 text-xs font-black text-neutral-700">
                                {items.length > 0 ? "이 분석에는 퍼센트 수치가 제공되지 않았어요." : config.empty}
                            </p>
                            {items.length > 0 && (
                                <p className="mt-1 text-[10px] font-bold text-neutral-500">
                                    수치를 임의로 만들지 않고 제공된 신뢰도 구간만 아래에 표시합니다.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            <p className="mt-2 text-[10px] font-bold leading-4 text-neutral-500">
                선은 후보를 신뢰도 순서로 비교하기 위한 연결선입니다. 후보끼리 원인·결과 관계가 있다는 뜻은 아닙니다.
            </p>
            <div
                className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50/70 px-3.5 py-3"
                data-daenglab-inference-comment={config.kind}
            >
                <p className={`text-[10px] font-black ${config.accent}`}>그래프 해석 코멘트</p>
                <p className="mt-1 text-[11px] font-bold leading-5 text-neutral-700">
                    {interpretationComment}
                </p>
            </div>

            {legacyPoints.length > 0 && (
                <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5" data-daenglab-inference-legacy={config.kind}>
                    <p className="text-[10px] font-black text-neutral-600">구간만 제공된 이전 분석</p>
                    <p className="mt-1 text-[10px] font-bold leading-4 text-neutral-500">
                        원본 영상이 저장되지 않아 정확한 %를 새로 만들 수 없습니다. 임의의 수치 대신 당시 구간을 그대로 표시합니다.
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

            <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
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
    const behaviorItems: InferenceDisplayItem[] = result.behaviorCandidates.map((candidate) => ({
        ...candidate,
        comment: candidate.otherPossibility
            ? `함께 비교할 다른 가능성은 ${candidate.otherPossibility}입니다.`
            : "",
    }));
    const soundItems: InferenceDisplayItem[] = result.barkContextCandidates.map((candidate) => ({
        ...candidate,
        comment: candidate.otherPossibility
            ? `같은 소리에서 비교할 다른 맥락은 ${candidate.otherPossibility}입니다.`
            : "",
    }));
    const healthItems: InferenceDisplayItem[] = result.healthCandidates.map((candidate) => ({
        ...candidate,
        comment: candidate.otherPossibility
            ? `평소 상태와 함께 비교할 신호는 ${candidate.otherPossibility}입니다.`
            : "",
    }));
    const priorityItems: InferenceDisplayItem[] = result.symptomSignals.map((signal) => ({
        ...signal,
        comment: signal.action === "emergency"
            ? "그래프 순위와 관계없이 즉시 확인 안내가 가장 우선입니다."
            : signal.action === "same_day"
                ? "그래프 순위와 관계없이 오늘 안에 확인해 주세요."
                : "평소 모습과 비교하며 반복 여부를 확인해 주세요.",
    }));
    const groupedItems: Record<InferenceGroupKind, InferenceDisplayItem[]> = {
        behavior: behaviorItems,
        sound: soundItems,
        health: healthItems,
        priority: priorityItems,
    };
    const rankedOverall = Object.values(groupedItems)
        .flat()
        .map((item, index) => ({
            id: `${index}-${item.label}`,
            item,
            percentage: inferencePercentage(item),
        }))
        .filter(hasInferencePercentage)
        .sort((a, b) => b.percentage - a.percentage || a.item.label.localeCompare(b.item.label, "ko"));
    const topPoint = rankedOverall[0];
    const leadGap = rankedOverall.length > 1
        ? Math.max(0, rankedOverall[0].percentage - rankedOverall[1].percentage)
        : null;

    return (
        <section
            className="overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4 shadow-[0_18px_50px_-34px_rgba(79,70,229,0.65)] sm:p-5"
            data-daenglab-inference-confidence
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-black tracking-[0.12em] text-indigo-600">전반적인 추론 상태</p>
                    <h3 className="mt-1 text-lg font-black text-neutral-950">행동·소리·건강·우선 확인 추론 그래프</h3>
                </div>
                <span className="rounded-full border border-white bg-white/90 px-3 py-1.5 text-[10px] font-black text-neutral-600 shadow-sm">
                    높은 추론 → 낮은 추론
                </span>
            </div>
            <p className="mt-2 max-w-3xl text-[11px] font-bold leading-5 text-neutral-600">
                행동, 소리 맥락, 건강 상태와 우선 확인 신호를 각각 나누어 후보별 추론 신뢰도를 비교합니다.
                표시된 %는 100% 정답률이나 실제 발생 확률, 진단·위험도 수치가 아닙니다.
            </p>

            <div
                className="mt-4 rounded-2xl border border-white/90 bg-white/85 p-3.5 shadow-sm"
                data-daenglab-overall-inference-state
            >
                <p className="text-[10px] font-black text-neutral-400">전반적인 상태</p>
                <p className="mt-1 text-sm font-black leading-6 text-neutral-900">{result.summary}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-3 py-2.5 text-white">
                        <p className="text-[9px] font-black text-indigo-100">가장 높은 추론</p>
                        <p className="mt-1 truncate text-xs font-black" title={topPoint?.item.label}>
                            {topPoint ? compactGraphLabel(topPoint.item.label) : "수치 확인 필요"}
                        </p>
                    </div>
                    <div className="rounded-xl bg-indigo-50 px-3 py-2.5 text-indigo-800">
                        <p className="text-[9px] font-black text-indigo-500">대표 신뢰도</p>
                        <p className="mt-1 text-lg font-black">{topPoint ? `추론 ${topPoint.percentage}%` : "—"}</p>
                    </div>
                    <div className="rounded-xl bg-cyan-50 px-3 py-2.5 text-cyan-800">
                        <p className="text-[9px] font-black text-cyan-600">다음 후보와 차이</p>
                        <p className="mt-1 text-lg font-black">{leadGap === null ? "비교 대기" : `${leadGap}%p`}</p>
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
                    />
                ))}
            </div>
        </section>
    );
}

function CandidateCards({
    items,
    observations,
}: {
    items: PetObservationCandidate[];
    observations: PetObservationResult["observations"];
}) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
                <article key={`${item.label}-${item.evidence.join("-")}`} className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-black leading-6 text-neutral-950">{item.label}</p>
                        <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">
                            확신 {item.confidence === "medium" ? "중간" : "낮음"}
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

export default function PetLensObservationResult({ result }: { result: PetObservationResult }) {
    return (
        <div className="grid gap-4" data-petlens-observation-result>
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
                        강아지 {result.quality.dogVisible ? "확인" : "확인 어려움"}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1.5">
                        소리 {result.quality.audioAvailable ? "확인" : "확인 어려움"}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1.5">
                        짖음 {result.quality.barkDetected ? "포착" : "미포착"}
                    </span>
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
                                        관찰 {index + 1} · {MODALITY_LABEL[item.modality]} · 확신 {item.confidence === "high" ? "높음" : item.confidence === "medium" ? "중간" : "낮음"}
                                    </p>
                                    <p className="mt-0.5 text-xs font-bold leading-5 text-neutral-700">{item.description}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>
            )}

            {result.barkContextCandidates.length > 0 && (
                <section>
                    <div className="mb-3">
                        <p className="text-sm font-black text-neutral-950">짖음의 가능한 맥락</p>
                        <p className="mt-1 text-[11px] font-bold text-neutral-500">말 번역이 아니라 소리·자세·상황이 함께 맞는 후보입니다.</p>
                    </div>
                    <CandidateCards items={result.barkContextCandidates} observations={result.observations} />
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
