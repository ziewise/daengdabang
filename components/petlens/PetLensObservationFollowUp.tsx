"use client";

import { useEffect, useRef, useState } from "react";
import {
    refinePetObservation,
    type PetObservationGuardianAnswer,
    type PetObservationResult,
} from "@/lib/petlens-observation";


const ANSWER_OPTIONS: Array<{
    value: PetObservationGuardianAnswer["answer"];
    label: string;
}> = [
    { value: "yes", label: "예" },
    { value: "no", label: "아니오" },
    { value: "unknown", label: "잘 모르겠어요" },
];

const ANSWER_LABEL: Record<PetObservationGuardianAnswer["answer"], string> = {
    yes: "예",
    no: "아니오",
    unknown: "잘 모르겠어요",
};

type Props = {
    result: PetObservationResult;
    requestId?: string;
    petProfileId: number;
    accessToken?: string;
    onUpdated: (result: PetObservationResult) => void;
};

export default function PetLensObservationFollowUp({
    result,
    requestId,
    petProfileId,
    accessToken,
    onUpdated,
}: Props) {
    const abortRef = useRef<AbortController | null>(null);
    const [answers, setAnswers] = useState<Record<string, PetObservationGuardianAnswer["answer"]>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => () => abortRef.current?.abort(), []);

    if (result.followUpQuestions.length === 0) return null;

    if (result.guardianFollowUpAnswers.length > 0) {
        return (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4" data-daenglab-guardian-refinement>
                <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-emerald-700" aria-hidden="true">
                        <i className="fa-solid fa-circle-check text-xs" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-black text-emerald-950">보호자 답변 메모를 결과에 저장했어요</p>
                        <p className="mt-1 text-[11px] font-bold leading-5 text-emerald-800">
                            {result.guardianContextSummary || "보호자 답변을 기존 영상 관찰에 확인 메모로 저장했습니다."}
                        </p>
                    </div>
                </div>
                <dl className="mt-3 grid gap-2">
                    {result.guardianFollowUpAnswers.map((item) => (
                        <div key={item.question} className="rounded-xl bg-white/85 p-3">
                            <dt className="text-[11px] font-bold leading-5 text-neutral-600">{item.question}</dt>
                            <dd className="mt-1 text-xs font-black text-neutral-950">{ANSWER_LABEL[item.answer]}</dd>
                            {item.note && <dd className="mt-1 text-[11px] font-bold leading-5 text-neutral-500">메모: {item.note}</dd>}
                        </div>
                    ))}
                </dl>
                <p className="mt-3 text-[10px] font-bold leading-4 text-emerald-800">
                    추가 코인은 차감되지 않았습니다. 보호자 답변은 진단이 아니며 기존 긴급 안내를 낮추지 않습니다.
                </p>
            </section>
        );
    }

    const allAnswered = result.followUpQuestions.every((question) => Boolean(answers[question]));

    const submit = async () => {
        if (!requestId || !allAnswered || submitting) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setSubmitting(true);
        setError("");
        try {
            const refined = await refinePetObservation({
                requestId,
                petProfileId,
                accessToken,
                answers: result.followUpQuestions.map((question) => ({
                    question,
                    answer: answers[question],
                    note: (notes[question] || "").trim(),
                })),
                signal: controller.signal,
            });
            onUpdated(refined);
        } catch (reason) {
            if (!(reason instanceof DOMException && reason.name === "AbortError")) {
                setError(reason instanceof Error ? reason.message : "보호자 답변 메모를 저장하지 못했습니다.");
            }
        } finally {
            if (!controller.signal.aborted) setSubmitting(false);
        }
    };

    return (
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4" data-daenglab-guardian-follow-up>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-black text-indigo-950">보호자가 확인한 내용을 결과와 함께 남길 수 있어요</p>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-indigo-700">
                        기존 영상 결과에 보호자 확인 메모로 저장됩니다. 후보와 점수는 자동 재판정하지 않습니다.
                    </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-indigo-700">
                    추가 차감 0C
                </span>
            </div>

            <div className="mt-4 grid gap-3">
                {result.followUpQuestions.map((question, index) => (
                    <fieldset key={question} className="rounded-2xl border border-white bg-white/85 p-3.5">
                        <legend className="px-1 text-xs font-black leading-5 text-neutral-900">
                            {index + 1}. {question}
                        </legend>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {ANSWER_OPTIONS.map((option) => (
                                <label
                                    key={option.value}
                                    className={`cursor-pointer rounded-full border px-3 py-2 text-[11px] font-black ${
                                        answers[question] === option.value
                                            ? "border-indigo-600 bg-indigo-600 text-white"
                                            : "border-neutral-200 bg-white text-neutral-600"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name={`guardian-answer-${requestId || "legacy"}-${index}`}
                                        value={option.value}
                                        checked={answers[question] === option.value}
                                        onChange={() => setAnswers((current) => ({ ...current, [question]: option.value }))}
                                        className="sr-only"
                                        disabled={submitting}
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                        <label className="mt-3 block">
                            <span className="text-[10px] font-black text-neutral-500">선택 메모</span>
                            <input
                                type="text"
                                value={notes[question] || ""}
                                onChange={(event) => setNotes((current) => ({
                                    ...current,
                                    [question]: event.target.value.slice(0, 200),
                                }))}
                                maxLength={200}
                                className="input mt-1 min-h-10 w-full text-xs"
                                placeholder="필요한 경우에만 적어 주세요."
                                disabled={submitting}
                            />
                        </label>
                    </fieldset>
                ))}
            </div>

            <p className="mt-3 text-[10px] font-bold leading-4 text-neutral-500">
                메모에는 사람의 이름·연락처 등 개인정보를 적지 마세요. 답변은 결과와 함께 저장되며 후보·점수를 자동 재해석하거나 진단을 확정하지 않습니다.
            </p>
            {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" role="alert">{error}</p>}
            <button
                type="button"
                onClick={() => void submit()}
                disabled={!requestId || !allAnswered || submitting}
                className="btn btn-primary mt-4 min-h-11 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
                data-daenglab-refine-result
            >
                {submitting
                    ? <><i className="fa-solid fa-circle-notch fa-spin mr-2 text-xs" /> 답변 메모 저장 중</>
                    : <><i className="fa-solid fa-note-sticky mr-2 text-xs" /> 보호자 답변 메모 저장</>}
            </button>
            {!requestId && (
                <p className="mt-2 text-center text-[10px] font-bold text-neutral-500">
                    이 이전 기록은 새 분석에서 보호자 답변 메모를 저장할 수 있어요.
                </p>
            )}
        </section>
    );
}
