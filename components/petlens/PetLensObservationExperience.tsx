"use client";

import { useEffect, useRef, useState } from "react";
import { analyzePetObservation, type PetObservationResult, type PetObservationSituation } from "@/lib/petlens-observation";
import type { PetProfile } from "@/lib/store";
import { usePetLensMediaCapture } from "@/hooks/usePetLensMediaCapture";
import PetLensObservationResult from "@/components/petlens/PetLensObservationResult";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";


const SITUATIONS: Array<{ value: PetObservationSituation; label: string }> = [
    { value: "unknown", label: "잘 모르겠어요" },
    { value: "alone", label: "혼자 있을 때" },
    { value: "visitor", label: "낯선 사람·소리" },
    { value: "play", label: "놀이나 흥분 중" },
    { value: "meal", label: "식사 전후" },
    { value: "walk", label: "산책 중·전후" },
    { value: "rest", label: "쉬거나 자는 중" },
    { value: "other", label: "그 밖의 상황" },
];

type Props = {
    pet: Pick<PetProfile, "name" | "breed" | "age">;
    accessToken?: string;
    variant?: "page" | "modal";
};

export default function PetLensObservationExperience({ pet, accessToken, variant = "page" }: Props) {
    const {
        videoRef,
        phase,
        supported,
        secondsLeft,
        clip,
        clipUrl,
        durationSeconds,
        error: captureError,
        startCamera,
        startRecording,
        selectFile,
        reset: resetCapture,
        cancelCapture,
    } = usePetLensMediaCapture();
    const abortRef = useRef<AbortController | null>(null);
    const [consent, setConsent] = useState(false);
    const [situation, setSituation] = useState<PetObservationSituation>("unknown");
    const [note, setNote] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState("");
    const [result, setResult] = useState<PetObservationResult | null>(null);

    useEffect(() => () => abortRef.current?.abort(), []);

    const analyze = async () => {
        if (!clip || !durationSeconds || !consent) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setAnalyzing(true);
        setAnalysisError("");
        trackStorefrontEvent("petlens_started", { mode: "observation", surface: variant });
        try {
            const next = await analyzePetObservation({
                clip,
                durationSeconds,
                petName: pet.name,
                breed: pet.breed,
                age: pet.age,
                situation,
                note,
                accessToken,
                signal: controller.signal,
            });
            setResult(next);
            trackStorefrontEvent("petlens_completed", { mode: "observation", surface: variant });
            resetCapture();
        } catch (reason) {
            if (controller.signal.aborted) return;
            resetCapture();
            trackStorefrontEvent("petlens_failed", {
                mode: "observation",
                surface: variant,
                errorCode: "analysis_failed",
            });
            setAnalysisError(reason instanceof Error ? reason.message : "관찰 분석을 완료하지 못했습니다.");
        } finally {
            if (!controller.signal.aborted) setAnalyzing(false);
        }
    };

    const resetAll = () => {
        abortRef.current?.abort();
        abortRef.current = null;
        setAnalyzing(false);
        setAnalysisError("");
        setResult(null);
        resetCapture();
    };

    if (result) {
        return (
            <section className="grid gap-4" data-petlens-observation-experience data-variant={variant}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-black text-indigo-700">펫렌즈 · 짖음·행동 관찰 결과</p>
                        <h2 className="mt-1 text-xl font-black text-neutral-950">{pet.name || "우리 아이"}의 짧은 관찰 결과</h2>
                    </div>
                    <button type="button" onClick={resetAll} className="btn btn-secondary min-h-10 px-4 text-xs">
                        <i className="fa-solid fa-video mr-1.5 text-[10px]" /> 새로 관찰
                    </button>
                </div>
                <PetLensObservationResult result={result} />
            </section>
        );
    }

    const compact = variant === "modal";
    const busy = analyzing || phase === "requesting" || phase === "recording";

    return (
        <section className="grid gap-4" data-petlens-observation-experience data-variant={variant}>
            <div className={`rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 ${compact ? "p-4" : "p-5 sm:p-6"}`}>
                <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-700 text-white">
                        <i className="fa-solid fa-video" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-[11px] font-black text-indigo-700">PC·모바일 카메라 + 마이크</p>
                        <h2 className="mt-1 text-lg font-black text-neutral-950">10초 동안 소리와 행동을 함께 관찰해요</h2>
                        <p className="mt-1 text-xs font-bold leading-5 text-neutral-600">
                            짖음만 번역하지 않고 자세·움직임·호흡 모습·상황을 같이 봐서 가능한 맥락과 확인할 신호를 정리합니다.
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4" data-petlens-emergency-preflight>
                <p className="text-xs font-black text-rose-900">이럴 때는 촬영보다 병원 연락이 먼저예요</p>
                <p className="mt-1 text-[11px] font-bold leading-5 text-rose-800">
                    숨을 매우 힘들게 쉼, 입 벌린 호흡·푸르거나 회색 잇몸, 쓰러짐·의식 저하, 계속되는 발작,
                    심한 출혈, 갑자기 부푼 배와 헛구역질, 열사병·중독 의심이 있으면 즉시 응급 동물병원에 연락하세요.
                </p>
            </div>

            <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]"}`}>
                <div className="grid gap-3">
                    <div className="relative aspect-video overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950" data-petlens-live-camera>
                        <video
                            ref={videoRef}
                            src={clipUrl || undefined}
                            autoPlay={!clipUrl}
                            muted={!clipUrl}
                            controls={Boolean(clipUrl)}
                            playsInline
                            className={`h-full w-full object-contain ${phase === "preview" || phase === "recording" || clipUrl ? "block" : "invisible"}`}
                        />
                        {phase !== "preview" && phase !== "recording" && !clipUrl && (
                            <div
                                className="absolute inset-0 grid place-items-center p-6 text-center text-white"
                                role={phase === "requesting" ? "status" : undefined}
                                aria-live={phase === "requesting" ? "polite" : undefined}
                            >
                                <div>
                                    <i className="fa-solid fa-camera text-3xl text-white/70" aria-hidden="true" />
                                    <p className="mt-3 text-sm font-black">
                                        {phase === "requesting" ? "카메라·마이크 권한을 기다리는 중" : "카메라를 연결하면 여기에 미리보기가 나와요"}
                                    </p>
                                    <p className="mt-1 text-[11px] font-bold text-white/60">강아지 옆면과 가슴 움직임이 함께 보이게 해주세요.</p>
                                </div>
                            </div>
                        )}
                        {phase === "recording" && (
                            <div className="absolute inset-x-3 top-3 flex items-center justify-between rounded-full bg-black/65 px-4 py-2 text-white" role="status" aria-live="polite">
                                <span className="inline-flex items-center gap-2 text-xs font-black">
                                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" /> 녹화 중
                                </span>
                                <span className="text-sm font-black">{secondsLeft}초</span>
                            </div>
                        )}
                    </div>

                    {captureError && (
                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold leading-5 text-rose-700" role="alert">
                            {captureError}
                        </p>
                    )}
                    {analysisError && (
                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold leading-5 text-rose-700" role="alert">
                            {analysisError}
                        </p>
                    )}

                    <div className="grid gap-2 sm:grid-cols-2">
                        {(phase === "idle" || phase === "error") && (
                            <button
                                type="button"
                                disabled={!consent || supported === false || analyzing}
                                onClick={() => void startCamera()}
                                className="btn btn-primary min-h-12 justify-center disabled:cursor-not-allowed disabled:opacity-50"
                                data-petlens-connect-camera
                            >
                                <i className="fa-solid fa-camera mr-2 text-xs" /> 카메라·마이크 연결
                            </button>
                        )}
                        {phase === "preview" && (
                            <>
                                <button
                                    type="button"
                                    disabled={!consent}
                                    onClick={startRecording}
                                    className="btn btn-primary min-h-12 justify-center disabled:opacity-50"
                                    data-petlens-start-observation
                                >
                                    <i className="fa-solid fa-circle-dot mr-2 text-xs" /> 10초 관찰 시작
                                </button>
                                <button type="button" onClick={resetCapture} className="btn btn-secondary min-h-12 justify-center">
                                    연결 끊기
                                </button>
                            </>
                        )}
                        {phase === "recording" && (
                            <button
                                type="button"
                                onClick={() => cancelCapture("촬영을 중단했습니다. 다시 연결해 주세요.")}
                                className="btn btn-secondary min-h-12 justify-center"
                            >
                                촬영 중단
                            </button>
                        )}
                        {phase === "recorded" && (
                            <>
                                <button
                                    type="button"
                                    disabled={analyzing || !consent}
                                    onClick={() => void analyze()}
                                    className="btn btn-primary min-h-12 justify-center disabled:opacity-50"
                                    data-petlens-analyze-observation
                                >
                                    {analyzing ? (
                                        <><i className="fa-solid fa-circle-notch fa-spin mr-2 text-xs" /> 영상·소리 분석 중</>
                                    ) : (
                                        <><i className="fa-solid fa-wave-square mr-2 text-xs" /> 이 영상 분석하기</>
                                    )}
                                </button>
                                <button type="button" disabled={analyzing} onClick={resetCapture} className="btn btn-secondary min-h-12 justify-center">
                                    다시 촬영
                                </button>
                            </>
                        )}
                        <label
                            className={`btn btn-secondary min-h-12 cursor-pointer justify-center ${busy || !consent ? "pointer-events-none opacity-50" : ""}`}
                            aria-disabled={busy || !consent}
                        >
                            <i className="fa-solid fa-file-video mr-2 text-xs" /> 촬영한 영상 선택
                            <input
                                type="file"
                                accept="video/webm,video/mp4,video/quicktime,video/mov,.webm,.mp4,.mov"
                                disabled={busy || !consent}
                                className="sr-only"
                                onChange={(event) => {
                                    void selectFile(event.target.files?.[0]);
                                    event.currentTarget.value = "";
                                }}
                            />
                        </label>
                    </div>
                    <span className="sr-only" role="status" aria-live="polite">
                        {analyzing ? "영상과 소리를 분석하는 중입니다." : phase === "recording" ? "10초 관찰 영상을 녹화하는 중입니다." : ""}
                    </span>
                    <p className="text-[11px] font-bold leading-5 text-neutral-500">
                        실시간 촬영이 안 되는 브라우저에서는 2~12초 WebM·MP4·MOV 영상을 선택할 수 있어요. 최대 12MB입니다.
                    </p>
                </div>

                <div className="grid h-fit gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
                    <label>
                        <span className="mb-1.5 block text-xs font-black text-neutral-600">촬영 당시 상황</span>
                        <select value={situation} onChange={(event) => setSituation(event.target.value as PetObservationSituation)} className="input w-full" disabled={busy}>
                            {SITUATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                    </label>
                    <label>
                        <span className="mb-1.5 block text-xs font-black text-neutral-600">직전에 있었던 일 · 평소와 다른 점</span>
                        <textarea
                            value={note}
                            onChange={(event) => setNote(event.target.value.slice(0, 300))}
                            className="input min-h-24 w-full resize-y py-3"
                            placeholder="예: 초인종이 울린 뒤 시작했어요. 평소보다 숨이 빨라 보여요."
                            disabled={busy}
                        />
                        <span className="mt-1 block text-right text-[10px] font-bold text-neutral-400">{note.length}/300</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                        <input
                            type="checkbox"
                            checked={consent}
                            onChange={(event) => {
                                const nextConsent = event.target.checked;
                                setConsent(nextConsent);
                                if (!nextConsent) resetCapture();
                            }}
                            disabled={busy}
                            className="mt-0.5 h-4 w-4 shrink-0"
                        />
                        <span className="text-[11px] font-bold leading-5 text-neutral-700">
                            카메라·마이크 원본, 등록된 반려견 정보와 입력한 촬영 상황이 분석을 위해 외부 자동 분석 서비스로 암호화 전송되는 데 동의합니다.
                            원본은 댕다방 서버에 저장하지 않으며 분석 요청이 끝나면 브라우저에서도 비웁니다.
                        </span>
                    </label>
                    <div className="rounded-xl bg-neutral-50 p-3 text-[10px] font-bold leading-5 text-neutral-500">
                        사람의 얼굴·대화와 집 안 개인정보가 담기지 않게 촬영해 주세요. 이 기능은 진단이 아니며 상품 추천에는 자동 사용하지 않습니다.
                    </div>
                </div>
            </div>
        </section>
    );
}
