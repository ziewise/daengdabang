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
            <section className={`rounded-2xl border p-4 sm:p-5 ${URGENCY_STYLE[result.urgency.level]}`} data-observation-urgency={result.urgency.level}>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black">
                        {URGENCY_LABEL[result.urgency.level]}
                    </span>
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black">
                        영상·소리 통합 관찰
                    </span>
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black">
                        댕다방 원본 미저장
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

            {result.followUpQuestions.length > 0 && (
                <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                    <p className="mb-3 text-xs font-black text-indigo-800">보호자가 확인하면 더 정확해져요</p>
                    <ul className="grid gap-2 text-xs font-bold leading-5 text-neutral-700">
                        {result.followUpQuestions.map((question) => <li key={question}>• {question}</li>)}
                    </ul>
                </section>
            )}

            {result.retakeGuidance.length > 0 && (
                <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <p className="mb-2 text-xs font-black text-sky-900">다시 촬영하면 좋아지는 점</p>
                    <p className="text-xs font-bold leading-5 text-sky-800">{result.retakeGuidance.join(" · ")}</p>
                </section>
            )}

            <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-black text-neutral-700">분석의 한계</p>
                <ul className="mt-2 grid gap-1 text-[11px] font-bold leading-5 text-neutral-500">
                    {result.limitations.map((item) => <li key={item}>• {item}</li>)}
                </ul>
            </section>
        </div>
    );
}
