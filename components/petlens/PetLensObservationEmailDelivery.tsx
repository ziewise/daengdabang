"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
    confirmCustomerResultEmailRecipientVerification,
    DdbApiError,
    emailPetObservationResult,
    loadCustomerResultEmailStatus,
    requestCustomerResultEmailRecipientVerification,
    type CustomerResultEmailReceipt,
    type CustomerResultEmailRecipientVerification,
    type CustomerResultEmailStatus,
} from "@/lib/customer-api";
import { isSyntheticSocialEmail, normalizeSignupEmail } from "@/lib/signup-email-verification";

type Props = {
    requestId: string;
    accountEmail?: string;
    accessToken?: string;
    onUnauthorized?: () => void;
};

type BusyAction = "requesting_code" | "verifying_code" | "sending" | null;

const DELIVERY_POLL_INTERVAL_MS = 3_000;

function resultEmailIdempotencyKey() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `research-email-${crypto.randomUUID()}`;
    }
    return `research-email-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function deliveryErrorMessage(reason: unknown) {
    if (!(reason instanceof DdbApiError)) {
        return "이메일 처리 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";
    }
    if (
        reason.apiCode === "recipient_email_required"
        || reason.apiCode === "recipient_email_verification_required"
    ) {
        return "결과를 받을 이메일을 먼저 인증해 주세요.";
    }
    if (reason.apiCode === "recipient_email_invalid") {
        return "결과를 받을 이메일 주소를 정확히 입력해 주세요.";
    }
    if (reason.apiCode === "recipient_override_not_allowed") {
        return "계정에 등록된 이메일이 확인되었습니다. 페이지를 새로고침한 뒤 등록 이메일로 보내 주세요.";
    }
    if (reason.apiCode === "recipient_verification_invalid_code") {
        return "인증번호가 맞지 않습니다. 이메일에 적힌 6자리 번호를 확인해 주세요.";
    }
    if (reason.apiCode === "recipient_verification_invalid") {
        return "이메일 또는 인증번호를 다시 확인해 주세요.";
    }
    if (
        reason.apiCode === "recipient_verification_expired"
        || reason.apiCode === "recipient_verification_not_found"
        || reason.apiCode === "recipient_token_invalid"
        || reason.apiCode === "recipient_token_expired"
    ) {
        return "이메일 인증 시간이 끝났습니다. 새 인증번호를 받아 주세요.";
    }
    if (reason.apiCode === "recipient_verification_attempts_exceeded") {
        return "인증번호 입력 횟수를 초과했습니다. 잠시 후 새 인증번호를 받아 주세요.";
    }
    if (
        reason.apiCode === "recipient_verification_resend_too_soon"
        || reason.apiCode === "recipient_verification_rate_limited"
        || reason.apiCode === "recipient_verification_queue_full"
    ) {
        return "이메일 인증 요청이 많습니다. 잠시 기다린 뒤 다시 시도해 주세요.";
    }
    if (reason.apiCode === "recipient_verification_delivery_failed") {
        return "인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.";
    }
    if (reason.apiCode === "research_result_not_found") {
        return "보낼 분석 결과를 찾지 못했습니다. 분석 기록에서 결과를 다시 열어 주세요.";
    }
    if (reason.apiCode === "research_result_unavailable") {
        return "이 분석 결과는 지금 이메일로 보낼 수 없습니다. 다른 분석 기록을 확인해 주세요.";
    }
    if (reason.apiCode === "result_email_idempotency_conflict") {
        return "발송 정보가 변경되었습니다. 잠시 후 다시 눌러 주세요.";
    }
    if (reason.apiCode === "result_email_delivery_not_found") {
        return "이메일 발송 상태를 찾지 못했습니다. 결과 화면에서 다시 요청해 주세요.";
    }
    if (reason.apiCode === "result_email_rate_limited" || reason.status === 429) {
        return "짧은 시간에 발송 요청이 많았습니다. 잠시 후 다시 시도해 주세요.";
    }
    if (
        reason.apiCode === "result_email_temporarily_unavailable"
        || reason.apiCode === "result_email_state_unavailable"
        || reason.status === 503
    ) {
        return "이메일 서비스를 잠시 사용할 수 없습니다. 조금 뒤 다시 시도해 주세요.";
    }
    if (reason.status === 401) {
        return "로그인 시간이 끝났습니다. 다시 로그인한 뒤 이용해 주세요.";
    }
    if (reason.status === 403) {
        return "이 분석 결과를 이메일로 보낼 수 없습니다.";
    }
    return "이메일 처리 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";
}

function statusPresentation(status: CustomerResultEmailStatus) {
    if (status === "sent") {
        return {
            title: "분석 결과를 이메일로 보냈습니다.",
            detail: "받은편지함에 보이지 않으면 스팸함도 확인해 주세요.",
            className: "border-emerald-200 bg-emerald-50 text-emerald-900",
            role: "status" as const,
        };
    }
    if (status === "scheduled") {
        return {
            title: "이메일 발송을 준비하고 있습니다.",
            detail: "이 화면에서 발송 상태를 계속 확인합니다.",
            className: "border-indigo-200 bg-indigo-50 text-indigo-900",
            role: "status" as const,
        };
    }
    if (status === "failed") {
        return {
            title: "이메일을 보내지 못했습니다.",
            detail: "아래 버튼으로 새 발송을 요청해 주세요.",
            className: "border-rose-200 bg-rose-50 text-rose-900",
            role: "alert" as const,
        };
    }
    if (status === "expired") {
        return {
            title: "이메일 발송 요청 시간이 끝났습니다.",
            detail: "아래 버튼으로 새 발송을 요청해 주세요.",
            className: "border-amber-200 bg-amber-50 text-amber-950",
            role: "status" as const,
        };
    }
    return {
        title: "이메일 발송 여부를 확정하지 못했습니다.",
        detail: "중복 발송을 막기 위해 다시 요청하지 말고 받은편지함과 스팸함을 먼저 확인해 주세요.",
        className: "border-amber-300 bg-amber-50 text-amber-950",
        role: "alert" as const,
    };
}

function shouldResetVerification(reason: unknown) {
    return reason instanceof DdbApiError && [
        "recipient_verification_expired",
        "recipient_verification_not_found",
        "recipient_verification_attempts_exceeded",
        "recipient_token_invalid",
        "recipient_token_expired",
    ].includes(reason.apiCode || "");
}

export default function PetLensObservationEmailDelivery({
    requestId,
    accountEmail = "",
    accessToken,
    onUnauthorized,
}: Props) {
    const normalizedAccountEmail = normalizeSignupEmail(accountEmail);
    const registeredEmail = normalizedAccountEmail && !isSyntheticSocialEmail(normalizedAccountEmail)
        ? normalizedAccountEmail
        : "";
    const [requiresManualEmail, setRequiresManualEmail] = useState(!registeredEmail);
    const [email, setEmail] = useState("");
    const [consent, setConsent] = useState(false);
    const [verification, setVerification] = useState<CustomerResultEmailRecipientVerification | null>(null);
    const [verificationExpiresAt, setVerificationExpiresAt] = useState(0);
    const [resendAt, setResendAt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [code, setCode] = useState("");
    const [busyAction, setBusyAction] = useState<BusyAction>(null);
    const [receipt, setReceipt] = useState<CustomerResultEmailReceipt | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [statusError, setStatusError] = useState("");
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const emailRef = useRef<HTMLInputElement | null>(null);
    const codeRef = useRef<HTMLInputElement | null>(null);
    const actionRef = useRef(false);
    const recipientTokenRef = useRef("");
    const statusAbortRef = useRef<AbortController | null>(null);
    const idempotencyRef = useRef<{ recipientIdentity: string; key: string } | null>(null);
    const normalizedInputEmail = normalizeSignupEmail(email);
    const normalizedRecipientEmail = normalizedInputEmail && !isSyntheticSocialEmail(normalizedInputEmail)
        ? normalizedInputEmail
        : null;
    const verificationExpired = Boolean(verification && now >= verificationExpiresAt);
    const resendSeconds = Math.max(0, Math.ceil((resendAt - now) / 1_000));
    const deliveryLocked = Boolean(
        receipt
        && (receipt.status === "scheduled" || receipt.status === "sent" || receipt.status === "uncertain")
    );
    const scheduledDeliveryId = receipt?.status === "scheduled" ? receipt.deliveryId : "";
    const busy = busyAction !== null;
    const canSubmit = Boolean(
        requestId.trim()
        && !busy
        && !deliveryLocked
        && (!requiresManualEmail || (
            normalizedRecipientEmail
            && consent
            && (!verification || (/^\d{6}$/.test(code) && !verificationExpired))
        ))
    );

    useEffect(() => {
        if (!verification) return;
        const timer = window.setInterval(() => setNow(Date.now()), 1_000);
        return () => window.clearInterval(timer);
    }, [verification]);

    useEffect(() => {
        if (!scheduledDeliveryId) return;
        const controller = new AbortController();
        statusAbortRef.current?.abort();
        statusAbortRef.current = controller;
        let polling = false;

        const reconcile = async () => {
            if (polling || controller.signal.aborted) return;
            polling = true;
            setCheckingStatus(true);
            try {
                const next = await loadCustomerResultEmailStatus(scheduledDeliveryId, accessToken, controller.signal);
                if (controller.signal.aborted) return;
                setReceipt(next);
                setStatusError("");
                if (next.status === "failed" || next.status === "expired") {
                    idempotencyRef.current = null;
                }
            } catch (reason) {
                if (controller.signal.aborted || (reason instanceof DOMException && reason.name === "AbortError")) return;
                if (reason instanceof DdbApiError && reason.status === 401) onUnauthorized?.();
                setStatusError("발송 상태 확인이 늦어지고 있습니다. 잠시 후 자동으로 다시 확인합니다.");
            } finally {
                polling = false;
                if (!controller.signal.aborted) setCheckingStatus(false);
            }
        };

        void reconcile();
        const timer = window.setInterval(() => void reconcile(), DELIVERY_POLL_INTERVAL_MS);
        return () => {
            window.clearInterval(timer);
            controller.abort();
        };
    }, [accessToken, onUnauthorized, scheduledDeliveryId]);

    useEffect(() => () => {
        recipientTokenRef.current = "";
        statusAbortRef.current?.abort();
    }, []);

    const clearVerification = (clearAddress = false) => {
        recipientTokenRef.current = "";
        setVerification(null);
        setVerificationExpiresAt(0);
        setResendAt(0);
        setCode("");
        if (clearAddress) {
            setEmail("");
            setConsent(false);
            idempotencyRef.current = null;
        }
    };

    const requestVerificationCode = async (recipientEmail: string) => {
        const next = await requestCustomerResultEmailRecipientVerification(recipientEmail, accessToken);
        const requestedAt = Date.now();
        setNow(requestedAt);
        setVerification(next);
        setVerificationExpiresAt(requestedAt + next.expiresInSeconds * 1_000);
        setResendAt(requestedAt + next.resendAfterSeconds * 1_000);
        setCode("");
        recipientTokenRef.current = "";
        setNotice(`${next.maskedEmail}로 6자리 인증번호를 보냈습니다.`);
        window.setTimeout(() => codeRef.current?.focus(), 0);
    };

    const sendResultEmail = async (recipientIdentity: string, recipientToken?: string) => {
        if (!idempotencyRef.current || idempotencyRef.current.recipientIdentity !== recipientIdentity) {
            idempotencyRef.current = {
                recipientIdentity,
                key: resultEmailIdempotencyKey(),
            };
        }
        const submitted = await emailPetObservationResult(requestId, {
            idempotencyKey: idempotencyRef.current.key,
            ...(recipientToken ? { recipientToken } : {}),
        }, accessToken);
        recipientTokenRef.current = "";
        clearVerification();

        let reconciled = submitted;
        try {
            reconciled = await loadCustomerResultEmailStatus(submitted.deliveryId, accessToken);
            setStatusError("");
        } catch (reason) {
            if (reason instanceof DdbApiError && reason.status === 401) onUnauthorized?.();
            setStatusError("발송 요청은 접수했지만 최신 상태 확인이 늦어지고 있습니다.");
        }
        setReceipt(reconciled);
        if (reconciled.status === "failed" || reconciled.status === "expired") {
            idempotencyRef.current = null;
        }
        setNotice("");
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (actionRef.current || deliveryLocked) return;
        if (!requestId.trim()) {
            setError("이메일로 보낼 분석 결과를 확인하지 못했습니다.");
            return;
        }
        if (receipt?.status === "failed" || receipt?.status === "expired") {
            setReceipt(null);
            setStatusError("");
        }

        if (!requiresManualEmail) {
            actionRef.current = true;
            setBusyAction("sending");
            setError("");
            setNotice("");
            try {
                await sendResultEmail("registered-email");
            } catch (reason) {
                if (reason instanceof DdbApiError && reason.status === 401) onUnauthorized?.();
                if (
                    reason instanceof DdbApiError
                    && (reason.apiCode === "recipient_email_required" || reason.apiCode === "recipient_email_verification_required")
                ) {
                    setRequiresManualEmail(true);
                    window.setTimeout(() => emailRef.current?.focus(), 0);
                }
                if (reason instanceof DdbApiError && reason.apiCode === "result_email_idempotency_conflict") {
                    idempotencyRef.current = null;
                }
                setError(deliveryErrorMessage(reason));
            } finally {
                actionRef.current = false;
                setBusyAction(null);
            }
            return;
        }

        if (!normalizedRecipientEmail) {
            setError("결과를 받을 이메일 주소를 정확히 입력해 주세요.");
            emailRef.current?.focus();
            return;
        }
        if (!consent) {
            setError("이메일 인증과 결과 1회 발송 안내를 확인하고 동의해 주세요.");
            return;
        }

        actionRef.current = true;
        setError("");
        setNotice("");
        let recipientVerified = false;
        try {
            if (!verification || verificationExpired) {
                setBusyAction("requesting_code");
                await requestVerificationCode(normalizedRecipientEmail);
                return;
            }
            if (!/^\d{6}$/.test(code)) {
                setError("이메일에 적힌 인증번호 6자리를 입력해 주세요.");
                codeRef.current?.focus();
                return;
            }

            setBusyAction("verifying_code");
            const token = await confirmCustomerResultEmailRecipientVerification(
                verification.verificationId,
                normalizedRecipientEmail,
                code,
                accessToken,
            );
            recipientTokenRef.current = token.recipientToken;
            recipientVerified = true;
            setCode("");
            setBusyAction("sending");
            await sendResultEmail(normalizedRecipientEmail.toLowerCase(), recipientTokenRef.current);
        } catch (reason) {
            recipientTokenRef.current = "";
            if (reason instanceof DdbApiError && reason.status === 401) onUnauthorized?.();
            if (recipientVerified || shouldResetVerification(reason)) clearVerification();
            if (reason instanceof DdbApiError && reason.apiCode === "result_email_idempotency_conflict") {
                idempotencyRef.current = null;
            }
            setError(deliveryErrorMessage(reason));
        } finally {
            actionRef.current = false;
            setBusyAction(null);
        }
    };

    const resendVerification = async () => {
        if (actionRef.current || !normalizedRecipientEmail || resendSeconds > 0) return;
        actionRef.current = true;
        setBusyAction("requesting_code");
        setError("");
        setNotice("");
        try {
            await requestVerificationCode(normalizedRecipientEmail);
        } catch (reason) {
            if (reason instanceof DdbApiError && reason.status === 401) onUnauthorized?.();
            setError(deliveryErrorMessage(reason));
        } finally {
            actionRef.current = false;
            setBusyAction(null);
        }
    };

    const presentation = receipt ? statusPresentation(receipt.status) : null;
    let submitLabel = requiresManualEmail
        ? verification ? "인증하고 결과 받기" : "인증번호 받기"
        : "분석 결과 이메일로 받기";
    if (busyAction === "requesting_code") submitLabel = "인증번호 보내는 중";
    if (busyAction === "verifying_code") submitLabel = "이메일 확인 중";
    if (busyAction === "sending") submitLabel = "결과 보내는 중";
    if (receipt?.status === "failed" || receipt?.status === "expired") {
        submitLabel = requiresManualEmail ? "새로 인증하고 다시 받기" : "이메일 다시 보내기";
    }
    if (receipt?.status === "sent") submitLabel = "이메일 발송 완료";
    if (receipt?.status === "scheduled") submitLabel = "발송 상태 확인 중";
    if (receipt?.status === "uncertain") submitLabel = "받은편지함 확인 필요";

    return (
        <section
            className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-white via-indigo-50/60 to-cyan-50 p-4 sm:p-5"
            aria-labelledby="pet-observation-email-title"
            aria-busy={busy || checkingStatus}
            data-petlens-observation-email
        >
            <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-700 text-white" aria-hidden="true">
                    <i className="fa-solid fa-envelope" />
                </span>
                <div className="min-w-0">
                    <h3 id="pet-observation-email-title" className="text-sm font-black text-neutral-950">
                        분석 결과 이메일로 소장하기
                    </h3>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-neutral-600">
                        댕다방 연구소 분석 내용을 읽기 쉬운 본문과 파일로 보내 드립니다.
                        발신 주소는 support@daengdabang.com입니다.
                    </p>
                </div>
            </div>

            <form onSubmit={submit} className="mt-4 grid gap-3">
                {requiresManualEmail ? (
                    <>
                        <label htmlFor="pet-observation-result-email" className="min-w-0">
                            <span className="mb-1 block text-xs font-black text-neutral-700">결과를 받을 이메일</span>
                            <input
                                ref={emailRef}
                                id="pet-observation-result-email"
                                type="email"
                                value={email}
                                onChange={(event) => {
                                    setEmail(event.target.value);
                                    clearVerification();
                                    setError("");
                                    setNotice("");
                                }}
                                className="input h-11 w-full"
                                inputMode="email"
                                autoComplete="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                placeholder="hello@example.com"
                                required
                                disabled={busy || deliveryLocked || Boolean(verification)}
                                aria-invalid={Boolean(email) && !normalizedRecipientEmail}
                                aria-describedby="pet-observation-result-email-help pet-observation-email-feedback"
                            />
                        </label>

                        {verification && (
                            <div className="grid gap-2 rounded-xl border border-indigo-100 bg-white/90 p-3" data-result-email-verification>
                                <div className="flex flex-wrap items-end gap-2">
                                    <label htmlFor="pet-observation-result-email-code" className="min-w-0 flex-1">
                                        <span className="mb-1 block text-xs font-black text-neutral-700">이메일 인증번호</span>
                                        <input
                                            ref={codeRef}
                                            id="pet-observation-result-email-code"
                                            value={code}
                                            onChange={(event) => {
                                                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                                                setError("");
                                            }}
                                            className="input h-11 w-full tracking-[0.25em]"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={6}
                                            placeholder="6자리 입력"
                                            disabled={busy || deliveryLocked || verificationExpired}
                                            aria-invalid={Boolean(code) && !/^\d{6}$/.test(code)}
                                            aria-describedby="pet-observation-email-verification-help pet-observation-email-feedback"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            clearVerification(true);
                                            setError("");
                                            setNotice("받을 이메일을 다시 입력해 주세요.");
                                            window.setTimeout(() => emailRef.current?.focus(), 0);
                                        }}
                                        className="btn min-h-11 border border-neutral-200 bg-white px-3 text-xs text-neutral-700"
                                        disabled={busy || deliveryLocked}
                                    >
                                        이메일 수정
                                    </button>
                                </div>
                                <p id="pet-observation-email-verification-help" className="text-[10px] font-bold leading-4 text-neutral-500">
                                    {verification.maskedEmail}로 보낸 번호를 입력해 주세요.
                                    {verificationExpired ? " 인증번호 유효시간이 끝났습니다." : " 인증번호는 잠시 후 만료됩니다."}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => void resendVerification()}
                                    disabled={busy || deliveryLocked || resendSeconds > 0}
                                    className="justify-self-start text-[11px] font-black text-indigo-700 underline underline-offset-2 disabled:cursor-not-allowed disabled:text-neutral-400"
                                >
                                    {resendSeconds > 0 ? `${resendSeconds}초 후 다시 받기` : "새 인증번호 다시 받기"}
                                </button>
                            </div>
                        )}

                        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-indigo-100 bg-white/85 p-3 text-[11px] font-bold leading-5 text-neutral-700">
                            <input
                                type="checkbox"
                                checked={consent}
                                onChange={(event) => {
                                    setConsent(event.target.checked);
                                    setError("");
                                }}
                                className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-700"
                                disabled={busy || deliveryLocked}
                                aria-describedby="pet-observation-result-email-help"
                            />
                            <span>입력한 이메일을 인증하고 이 분석 결과 1회 발송에 사용하는 데 동의합니다.</span>
                        </label>
                        <p id="pet-observation-result-email-help" className="text-[10px] font-bold leading-4 text-neutral-500">
                            입력한 주소는 계정 이메일로 저장되거나 변경되지 않습니다. 이메일 주소·인증번호·인증정보는 브라우저 저장소에 보관하지 않습니다.
                        </p>
                    </>
                ) : (
                    <div className="rounded-xl border border-indigo-100 bg-white/85 px-3 py-3">
                        <p className="text-[10px] font-black text-neutral-500">등록된 이메일</p>
                        <p className="mt-1 break-all text-sm font-black text-neutral-900">{registeredEmail}</p>
                        <p className="mt-1 text-[10px] font-bold leading-4 text-neutral-500">
                            버튼을 누르면 이 주소로만 발송합니다. 별도 인증번호는 필요하지 않습니다.
                        </p>
                    </div>
                )}

                <div id="pet-observation-email-feedback" className="grid gap-2" aria-live="polite" aria-atomic="true">
                    {notice && !receipt && (
                        <p className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-xs font-bold leading-5 text-indigo-900" role="status">
                            {notice}
                        </p>
                    )}
                    {receipt && presentation && (
                        <div className={`rounded-xl border px-3 py-3 ${presentation.className}`} role={presentation.role} data-result-email-status={receipt.status}>
                            <p className="text-sm font-black">{presentation.title}</p>
                            <p className="mt-1 text-[11px] font-bold leading-5 opacity-90">{presentation.detail}</p>
                            {checkingStatus && receipt.status === "scheduled" && (
                                <p className="mt-1 text-[10px] font-black opacity-75">최신 발송 상태 확인 중</p>
                            )}
                        </div>
                    )}
                    {statusError && (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-900" role="status">
                            {statusError}
                        </p>
                    )}
                    {error && (
                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-xs font-bold leading-5 text-rose-800" role="alert">
                            {error}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="btn btn-primary min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:justify-self-start"
                    aria-describedby="pet-observation-email-feedback"
                    data-petlens-observation-email-submit
                >
                    {submitLabel}
                </button>
            </form>
        </section>
    );
}
