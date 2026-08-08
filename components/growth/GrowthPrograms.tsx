"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    cancelGrowthInterest,
    DdbApiError,
    loadGrowthInterests,
    submitGrowthInterest,
    type GrowthInterestReceipt,
} from "@/lib/customer-api";
import {
    GROWTH_PROGRAM_CARDS,
    growthInterestLabel,
    type GrowthProgramId,
} from "@/lib/growth-programs";
import { useAuth } from "@/lib/store";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";

const LOGIN_HREF = "/auth/login/?redirect=%2Ftreasure-mine%2F%23growth-programs";

function interestErrorMessage(error: unknown): string {
    if (error instanceof DdbApiError) {
        if (error.status === 401) return "로그인 시간이 끝났어요. 다시 로그인한 뒤 관심등록을 이어가 주세요.";
        if (error.status === 422) return "동의 항목을 다시 확인해 주세요.";
        if (error.status === 429) return "요청이 많아 잠시 보호 중이에요. 잠시 후 다시 시도해 주세요.";
        if (error.code === "missing_api_base") return "지금은 관심등록 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.";
    }
    return "관심등록 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}

function sessionFingerprint(token: string | undefined): number {
    if (!token) return 0;
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
        hash ^= token.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) || 1;
}

export default function GrowthPrograms() {
    const { hydrated, user } = useAuth();
    const [selectedProgram, setSelectedProgram] = useState<GrowthProgramId | null>(null);
    const [consent, setConsent] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [receipt, setReceipt] = useState<GrowthInterestReceipt | null>(null);
    const [error, setError] = useState("");
    const [registrations, setRegistrations] = useState<GrowthInterestReceipt[]>([]);
    const [loadedSession, setLoadedSession] = useState(0);
    const [cancelling, setCancelling] = useState<GrowthProgramId | null>(null);
    const [programNotice, setProgramNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
    const formHeadingRef = useRef<HTMLHeadingElement>(null);
    const receiptHeadingRef = useRef<HTMLHeadingElement>(null);
    const accessToken = user?.apiAccessToken;
    const currentSession = sessionFingerprint(accessToken);
    const registrationsReady = !accessToken || loadedSession === currentSession;

    useEffect(() => {
        if (!accessToken) return;
        let active = true;
        loadGrowthInterests(accessToken)
            .then((values) => {
                if (!active) return;
                setRegistrations(values);
                setLoadedSession(currentSession);
            })
            .catch(() => {
                if (!active) return;
                setRegistrations([]);
                setLoadedSession(currentSession);
                setProgramNotice({ tone: "error", message: "관심등록 상태를 불러오지 못했어요. 새 등록은 중복 없이 안전하게 처리됩니다." });
                trackStorefrontEvent("growth_program_interest_failed", {
                    surface: "treasure_mine",
                    stage: "load",
                });
            });
        return () => {
            active = false;
        };
    }, [accessToken, currentSession]);

    useEffect(() => {
        if (receipt) receiptHeadingRef.current?.focus();
        else if (selectedProgram) formHeadingRef.current?.focus();
    }, [receipt, selectedProgram]);

    const selectProgram = (programId: GrowthProgramId) => {
        if (!accessToken) return;
        setSelectedProgram(programId);
        setConsent(false);
        setReceipt(null);
        setError("");
        trackStorefrontEvent("growth_program_interest_opened", {
            surface: "treasure_mine",
            programId,
        });
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedProgram || !accessToken || submitting) return;
        setSubmitting(true);
        setError("");
        try {
            const next = await submitGrowthInterest({
                programId: selectedProgram,
                consentToContact: consent,
            }, accessToken);
            setReceipt(next);
            setRegistrations((current) => [
                next,
                ...current.filter((item) => item.programId !== next.programId),
            ]);
            trackStorefrontEvent("growth_program_interest_submitted", {
                surface: "treasure_mine",
                programId: next.programId,
                alreadyRegistered: next.alreadyRegistered,
                outcome: "completed",
            });
        } catch (caught) {
            setError(interestErrorMessage(caught));
            trackStorefrontEvent("growth_program_interest_failed", {
                surface: "treasure_mine",
                programId: selectedProgram,
                stage: "submit",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const cancelRegistration = async (programId: GrowthProgramId) => {
        if (!accessToken || cancelling) return;
        setCancelling(programId);
        setProgramNotice(null);
        try {
            await cancelGrowthInterest(programId, accessToken);
            setRegistrations((current) => current.filter((item) => item.programId !== programId));
            if (selectedProgram === programId) {
                setSelectedProgram(null);
                setReceipt(null);
            }
            setProgramNotice({
                tone: "success",
                message: `${growthInterestLabel(programId)} 관심등록을 취소했어요. 언제든 다시 등록할 수 있습니다.`,
            });
        } catch {
            setProgramNotice({ tone: "error", message: "관심등록을 취소하지 못했어요. 잠시 후 다시 시도해 주세요." });
            trackStorefrontEvent("growth_program_interest_failed", {
                surface: "treasure_mine",
                programId,
                stage: "cancel",
            });
        } finally {
            setCancelling(null);
        }
    };

    return (
        <section id="growth-programs" className="scroll-mt-28 py-10 md:py-14" aria-labelledby="growth-programs-title">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="ddb-crayon-kicker text-xs">GROWTH PROGRAMS</p>
                        <h2 id="growth-programs-title" className="ddb-crayon-title ddb-crayon-underline mt-2 text-3xl text-neutral-950 md:text-4xl">다음 보물은 함께 검증해요</h2>
                        <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-neutral-600">
                            아직 판매·예약 가능한 서비스가 아닙니다. 관심 수요를 확인한 뒤 운영 조건과 시작 일정을 별도로 안내하며, 등록은 이 화면에서 언제든 취소할 수 있어요.
                        </p>
                    </div>
                    <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-900">
                        전 프로그램 준비 중
                    </span>
                </div>

                <div className="mt-7 grid gap-4 lg:grid-cols-2">
                    {GROWTH_PROGRAM_CARDS.map((program) => (
                        <article key={program.id} className="ddb-crayon-paper flex h-full flex-col rounded-[28px] border p-5 sm:p-6">
                            <div className="flex items-start gap-4">
                                <span className="ddb-crayon-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg" data-crayon-tone={program.tone}>
                                    <i className={`fa-solid ${program.icon}`} aria-hidden="true" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="ddb-crayon-kicker text-[10px]">{program.eyebrow}</p>
                                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-900">준비 중</span>
                                    </div>
                                    <h3 className="ddb-crayon-title mt-1 text-2xl text-neutral-950">{program.title}</h3>
                                    <p className="mt-1 text-xs font-black text-indigo-700">{program.status}</p>
                                </div>
                            </div>

                            <p className="mt-4 text-sm font-bold leading-6 text-neutral-650">{program.description}</p>
                            <ul className="mt-4 grid gap-2 text-xs font-bold leading-5 text-neutral-600">
                                {program.details.map((detail) => (
                                    <li key={detail} className="flex gap-2">
                                        <i className="fa-solid fa-check mt-1 text-[9px] text-emerald-600" aria-hidden="true" />
                                        <span>{detail}</span>
                                    </li>
                                ))}
                            </ul>

                            {program.existingFeature ? (
                                <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/80 p-3">
                                    <Link href={program.existingFeature.href} className="inline-flex min-h-10 items-center gap-2 text-xs font-black text-sky-900 underline decoration-sky-300 underline-offset-4">
                                        <i className="fa-solid fa-location-crosshairs" aria-hidden="true" />
                                        {program.existingFeature.label}
                                    </Link>
                                    <p className="mt-1 text-[10px] font-bold leading-4 text-sky-800">{program.existingFeature.helper}</p>
                                </div>
                            ) : null}

                            <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
                                {program.interestOptions.map((option) => {
                                    if (!hydrated) {
                                        return <span key={option.programId} className="h-11 animate-pulse rounded-full bg-neutral-100" aria-label="회원 상태 확인 중" />;
                                    }
                                    if (!accessToken) {
                                        return (
                                            <Link
                                                key={option.programId}
                                                href={LOGIN_HREF}
                                                className="inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-300 bg-white px-4 text-center text-xs font-black text-neutral-700 transition hover:border-indigo-400 hover:text-indigo-800"
                                            >
                                                로그인 후 관심등록
                                            </Link>
                                        );
                                    }
                                    if (!registrationsReady) {
                                        return <span key={option.programId} className="grid h-11 place-items-center rounded-full bg-neutral-100 text-[10px] font-black text-neutral-500">등록 상태 확인 중</span>;
                                    }
                                    const registered = registrations.some((item) => item.programId === option.programId);
                                    if (registered) {
                                        return (
                                            <button
                                                key={option.programId}
                                                type="button"
                                                disabled={cancelling !== null}
                                                onClick={() => void cancelRegistration(option.programId)}
                                                className="inline-flex min-h-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-black text-rose-800 transition hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60"
                                            >
                                                {cancelling === option.programId ? <><i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true" />취소 중…</> : "관심 등록 취소"}
                                            </button>
                                        );
                                    }
                                    return (
                                        <button
                                            key={option.programId}
                                            type="button"
                                            aria-expanded={selectedProgram === option.programId}
                                            aria-controls="growth-interest-form"
                                            onClick={() => selectProgram(option.programId)}
                                            className="ddb-crayon-link inline-flex min-h-11 items-center justify-center rounded-full px-4 text-xs"
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </article>
                    ))}
                </div>

                {programNotice ? (
                    <div
                        role={programNotice.tone === "error" ? "alert" : "status"}
                        aria-live="polite"
                        className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-bold leading-5 ${programNotice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}
                    >
                        {programNotice.message}
                    </div>
                ) : null}

                {selectedProgram && accessToken ? (
                    <div id="growth-interest-form" className="ddb-crayon-paper mt-6 scroll-mt-28 rounded-[30px] border p-5 sm:p-7">
                        {receipt ? (
                            <div role="status" aria-live="polite">
                                <span className="ddb-crayon-icon grid h-12 w-12 place-items-center rounded-2xl text-lg" data-crayon-tone="teal">
                                    <i className="fa-solid fa-check" aria-hidden="true" />
                                </span>
                                <p className="ddb-crayon-kicker mt-4 text-xs">INTEREST SAVED</p>
                                <h3 ref={receiptHeadingRef} tabIndex={-1} className="ddb-crayon-title mt-1 text-2xl text-neutral-950 outline-none">
                                    {receipt.alreadyRegistered ? "이미 관심을 남겨두셨어요" : "관심등록을 저장했어요"}
                                </h3>
                                <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                                    {receipt.alreadyRegistered
                                        ? "중복 신청을 만들지 않고 기존 등록을 확인했습니다."
                                        : `${growthInterestLabel(receipt.programId)} 준비 소식이 확정되면 안내할게요.`}
                                </p>
                                <p className="mt-1 text-xs font-bold text-neutral-500">접수번호 {receipt.id} · 지금은 주문·예약·선정이 확정된 상태가 아닙니다.</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedProgram(null);
                                        setReceipt(null);
                                    }}
                                    className="mt-5 inline-flex min-h-11 items-center rounded-full border border-neutral-300 bg-white px-5 text-xs font-black text-neutral-700"
                                >
                                    닫기
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={submit} className="grid gap-5">
                                <div>
                                    <p className="ddb-crayon-kicker text-xs">INTEREST CONSENT</p>
                                    <h3 ref={formHeadingRef} tabIndex={-1} className="ddb-crayon-title mt-1 text-2xl text-neutral-950 outline-none">
                                        {growthInterestLabel(selectedProgram)}
                                    </h3>
                                    <p className="mt-2 text-xs font-bold leading-5 text-neutral-600">
                                        회원 계정으로만 접수합니다. 이름·이메일·건강정보·자유입력 메모는 이 화면에서 받지 않아요.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-neutral-200 bg-white/80 px-4 py-4 text-sm font-bold leading-6 text-neutral-700">
                                    <label className="flex items-start gap-3">
                                        <input
                                            required
                                            type="checkbox"
                                            checked={consent}
                                            onChange={(event) => setConsent(event.target.checked)}
                                            className="mt-1 h-4 w-4 shrink-0 accent-indigo-700"
                                        />
                                        <span>
                                            <b className="text-neutral-950">(필수)</b> 선택한 프로그램의 준비·모집 소식을 회원 계정에 등록된 이메일로 받는 데 동의합니다.
                                        </span>
                                    </label>
                                    <dl className="ml-7 mt-3 grid gap-1.5 border-t border-neutral-100 pt-3 text-xs leading-5 text-neutral-600">
                                        <div><dt className="inline font-black text-neutral-800">수집·연계 항목</dt><dd className="inline"> · 회원 식별번호, 선택 프로그램, 동의 버전·상태·시각. 실제 안내 시 회원 계정 이메일을 연결해 사용하며 관심등록 파일에는 이메일을 복사 저장하지 않습니다.</dd></div>
                                        <div><dt className="inline font-black text-neutral-800">이용 목적</dt><dd className="inline"> · 프로그램 수요 확인 및 준비·모집 소식 이메일 안내</dd></div>
                                        <div><dt className="inline font-black text-neutral-800">보유 기간</dt><dd className="inline"> · 관심등록 취소 시 즉시 삭제 또는 회원 탈퇴 시까지</dd></div>
                                        <div><dt className="inline font-black text-neutral-800">거부 안내</dt><dd className="inline"> · 동의를 거부할 수 있으며 관심등록만 제한됩니다. 쇼핑과 기본 돌봄 기능에는 영향이 없습니다.</dd></div>
                                    </dl>
                                    <p className="ml-7 mt-2 text-xs font-bold text-neutral-500">
                                        자세한 내용은 {" "}<Link href="/privacy/" className="font-black text-indigo-700 underline underline-offset-2">개인정보처리방침</Link>에서 확인할 수 있습니다.
                                    </p>
                                </div>

                                {error ? (
                                    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-900">
                                        {error}
                                        {error.includes("로그인") ? <Link href={LOGIN_HREF} className="ml-2 font-black underline">다시 로그인</Link> : null}
                                    </div>
                                ) : null}

                                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => setSelectedProgram(null)}
                                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-300 bg-white px-5 text-xs font-black text-neutral-700 disabled:opacity-50"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !consent}
                                        className="ddb-crayon-link inline-flex min-h-11 items-center justify-center rounded-full px-6 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {submitting ? <><i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true" />저장 중…</> : "관심등록 저장"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
