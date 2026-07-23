"use client";

import type {
    PetObservationCandidate,
    PetObservationResult,
    PetObservationUrgencyLevel,
} from "@/lib/petlens-observation";


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

const INFERENCE_GROUPS = [
    {
        key: "behaviorCandidates" as const,
        label: "행동 후보",
        empty: "뚜렷하게 분류된 행동 후보가 없어요.",
        icon: "fa-dog",
        bar: "bg-indigo-500",
        accent: "text-indigo-700",
    },
    {
        key: "barkContextCandidates" as const,
        label: "소리 맥락 후보",
        empty: "분석할 짖음이 뚜렷하게 포착되지 않았어요.",
        icon: "fa-volume-high",
        bar: "bg-cyan-500",
        accent: "text-cyan-700",
    },
] as const;

function ConfidenceBand({ confidence }: Pick<PetObservationCandidate, "confidence">) {
    const label = confidence === "medium" ? "중간" : "낮음";
    return (
        <div className="grid grid-cols-2 gap-1" aria-label={`추론 확신도 ${label} 구간`}>
            {(["low", "medium"] as const).map((band) => (
                <span
                    key={band}
                    className={`rounded-md px-2 py-1 text-center text-[10px] font-black ${
                        confidence === band ? "bg-neutral-800 text-white" : "bg-neutral-100 text-neutral-400"
                    }`}
                >
                    {band === "low" ? "낮음" : "중간"}
                </span>
            ))}
        </div>
    );
}

function InferenceConfidenceOverview({ result }: { result: PetObservationResult }) {
    const qualityLabel = result.quality.level === "good"
        ? "관찰 품질 양호"
        : result.quality.level === "limited"
            ? "관찰 품질 제한"
            : "재촬영 권장";

    return (
        <section
            className="overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4 shadow-[0_18px_50px_-34px_rgba(79,70,229,0.65)] sm:p-5"
            data-daenglab-inference-confidence
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-black tracking-[0.12em] text-indigo-600">전반적인 추론 상태</p>
                    <h3 className="mt-1 text-lg font-black text-neutral-950">행동·소리 추론 후보 그래프</h3>
                </div>
                <span className="rounded-full border border-white bg-white/90 px-3 py-1.5 text-[10px] font-black text-neutral-600 shadow-sm">
                    후보 간 비교
                </span>
            </div>
            <p className="mt-2 max-w-3xl text-[11px] font-bold leading-5 text-neutral-600">
                영상·소리 근거를 비교한 상대적 확신도입니다. 100% 정답률을 뜻하지 않으며 실제 발생 확률이나 진단·위험도 수치가 아닙니다.
            </p>

            <div
                className="mt-4 rounded-2xl border border-white/90 bg-white/85 p-3.5 shadow-sm"
                data-daenglab-overall-inference-state
            >
                <p className="text-[10px] font-black text-neutral-400">전반적인 상태</p>
                <p className="mt-1 text-sm font-black leading-6 text-neutral-900">{result.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                        행동 후보 {result.behaviorCandidates.length}개
                    </span>
                    <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-cyan-700">
                        소리 후보 {result.barkContextCandidates.length}개
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">
                        {qualityLabel}
                    </span>
                </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {INFERENCE_GROUPS.map(({ key, label, empty, icon, bar, accent }) => {
                    const items = result[key];
                    return (
                        <div key={key} className="rounded-2xl border border-white/90 bg-white/80 p-3.5 shadow-sm">
                            <div className={`flex items-center gap-2 text-xs font-black ${accent}`}>
                                <i className={`fa-solid ${icon}`} aria-hidden="true" />
                                <span>{label}</span>
                            </div>
                            {items.length === 0 ? (
                                <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-3 text-[11px] font-bold leading-5 text-neutral-500">
                                    {empty}
                                </p>
                            ) : (
                                <div className="mt-3 grid gap-3">
                                    {items.map((item) => {
                                        const percentage = typeof item.confidenceScore === "number"
                                            ? Math.round(item.confidenceScore * 100)
                                            : null;
                                        return (
                                            <div key={`${key}-${item.label}`} className="grid gap-1.5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <p className="text-[11px] font-black leading-5 text-neutral-800">{item.label}</p>
                                                    {percentage !== null && (
                                                        <span className={`shrink-0 text-xs font-black ${accent}`}>
                                                            {percentage}%
                                                        </span>
                                                    )}
                                                </div>
                                                {percentage !== null ? (
                                                    <div
                                                        className="h-2.5 overflow-hidden rounded-full bg-neutral-100"
                                                        role="meter"
                                                        aria-label={`${item.label} 추론 확신도`}
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        aria-valuenow={percentage}
                                                        aria-valuetext={`${percentage}퍼센트, 보정되지 않은 추론 확신도`}
                                                    >
                                                        <div
                                                            className={`h-full rounded-full ${bar}`}
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <ConfidenceBand confidence={item.confidence} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {INFERENCE_GROUPS.some(({ key }) => result[key].some((item) => typeof item.confidenceScore !== "number")) && (
                <p className="mt-3 text-[10px] font-bold leading-4 text-neutral-500">
                    정확한 수치가 없는 이전 분석은 임의의 퍼센트를 만들지 않고 낮음·중간 구간으로 표시합니다.
                </p>
            )}
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
                    이 결과는 진단이 아닙니다. 걱정되는 신호가 지속되거나 심해지면 동물병원에 문의해 주세요.
                </p>
            </section>

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
