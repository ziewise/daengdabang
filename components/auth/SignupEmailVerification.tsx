"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
    confirmSignupEmailVerification,
    DdbApiError,
    loadSignupBonusStatus,
    requestSignupEmailVerification,
    type DaengLabWallet,
    type SignupBonusStatus,
} from "@/lib/customer-api";
import {
    isSyntheticSocialEmail,
    normalizeSignupEmail,
} from "@/lib/signup-email-verification";
import DaengLabCoinMark from "@/components/petlens/DaengLabCoinMark";

export type SignupEmailVerificationResult = {
    status: "credited" | "already_claimed";
    awardedDaengLabCoins: number;
    wallet: DaengLabWallet;
    maskedEmail: string;
    verifiedEmail?: string;
};

type Props = {
    accessToken?: string;
    accountEmail?: string;
    onComplete?: (result: SignupEmailVerificationResult) => void;
    onContinueWithoutBonus?: () => void;
    hideWhenSettled?: boolean;
};

function errorMessage(error: unknown, step: "request" | "confirm" | "status") {
    if (error instanceof DdbApiError) {
        if (error.apiCode === "signup_bonus_already_claimed") {
            return "가입 축하 코인이 이미 지급된 인증 정보입니다.";
        }
        if (error.apiCode === "no_pending_eligibility") {
            return "현재 계정에는 인증을 기다리는 가입 혜택이 없습니다.";
        }
        if (error.apiCode === "signup_bonus_expired") {
            return "가입 축하 혜택의 인증 가능 기간이 지났습니다.";
        }
        if (error.apiCode === "invalid_email") {
            return "이메일 주소를 다시 확인해 주세요.";
        }
        if (error.apiCode === "verification_email_required") {
            return "인증받을 실제 이메일 주소를 입력해 주세요.";
        }
        if (
            error.apiCode === "email_already_in_use"
            || error.apiCode === "email_conflict"
            || error.apiCode === "email_already_registered"
            || error.apiCode === "verified_email_already_registered"
        ) {
            return "이미 다른 계정에서 사용 중인 이메일입니다. 다른 이메일을 입력해 주세요.";
        }
        if (error.apiCode === "email_claim_conflict") {
            return "다른 인증 요청에서 이 이메일을 먼저 확정했습니다. 이메일을 다시 확인해 주세요.";
        }
        if (error.apiCode === "verified_email_change_locked") {
            return "이미 이메일 인증이 완료되어 이 화면에서는 주소를 변경할 수 없습니다.";
        }
        if (error.apiCode === "email_already_verified") {
            return "이메일 인증이 이미 완료되었습니다. 가입 혜택 상태를 새로고침해 주세요.";
        }
        if (error.apiCode === "otp_resend_too_soon") {
            return "인증번호를 다시 받을 수 있을 때까지 잠시 기다려 주세요.";
        }
        if (error.apiCode === "otp_rate_limited" || error.apiCode === "otp_attempts_exceeded" || error.status === 429) {
            return "요청 횟수가 많습니다. 잠시 후 다시 시도해 주세요.";
        }
        if (
            error.apiCode === "email_provider_unavailable"
            || error.apiCode === "mail_provider_unavailable"
            || error.apiCode === "email_delivery_failed"
            || error.apiCode === "otp_verification_unavailable"
            || error.status === 503
        ) {
            return "이메일 인증 서비스를 준비하고 있어요. 잠시 후 다시 시도해 주세요.";
        }
        if (error.apiCode === "otp_expired" || error.status === 410) {
            return "인증번호 유효시간이 지났습니다. 새 인증번호를 받아 주세요.";
        }
        if (error.apiCode === "otp_superseded") {
            return "새 인증번호가 발송되었습니다. 가장 최근에 받은 6자리 번호를 입력해 주세요.";
        }
        if (error.apiCode === "otp_email_mismatch") {
            return "인증번호를 요청한 이메일과 현재 이메일이 다릅니다. 이메일 오타 수정을 눌러 다시 요청해 주세요.";
        }
        if (error.apiCode === "invalid_otp" || (step === "confirm" && error.status === 400)) {
            return "인증번호 6자리를 다시 확인해 주세요.";
        }
        if (error.status === 401) return "로그인 정보가 만료되었습니다. 다시 로그인해 주세요.";
    }
    if (step === "status") return "가입 혜택 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    if (step === "request") return "인증번호를 보내지 못했습니다. 이메일 주소를 확인한 뒤 다시 시도해 주세요.";
    return "이메일 인증을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function settledMessage(status: SignupBonusStatus["welcomeBonus"]["status"]) {
    if (status === "claimed") return "가입 축하 20C가 이미 지급되었습니다.";
    if (status === "repeat") return "중복 또는 부정 수령 이력이 확인되어 가입 축하 코인이 추가 지급되지 않습니다.";
    if (status === "expired") return "가입 축하 혜택의 인증 가능 기간이 지났습니다.";
    return "현재 계정은 가입 축하 혜택 지급 대상이 아닙니다.";
}

function emailIdentity(value: string | null | undefined) {
    return String(value || "").trim().toLowerCase();
}

export default function SignupEmailVerification({
    accessToken,
    accountEmail = "",
    onComplete,
    onContinueWithoutBonus,
    hideWhenSettled = false,
}: Props) {
    const visibleAccountEmail = isSyntheticSocialEmail(accountEmail) ? "" : accountEmail.trim();
    const [status, setStatus] = useState<SignupBonusStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [email, setEmail] = useState(visibleAccountEmail);
    const [verificationId, setVerificationId] = useState("");
    const [maskedEmail, setMaskedEmail] = useState("");
    const [code, setCode] = useState("");
    const [resendAt, setResendAt] = useState(0);
    const [expiresAt, setExpiresAt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [requesting, setRequesting] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [completed, setCompleted] = useState<SignupEmailVerificationResult | null>(null);
    const initialAutoEmailRef = useRef(normalizeSignupEmail(visibleAccountEmail));
    const autoRequestAttemptedRef = useRef(false);
    const emailRef = useRef<HTMLInputElement>(null);
    const codeRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let active = true;
        void loadSignupBonusStatus(accessToken)
            .then((next) => {
                if (active) setStatus(next);
            })
            .catch((reason) => {
                if (active) setError(errorMessage(reason, "status"));
            })
            .finally(() => {
                if (active) setStatusLoading(false);
            });
        return () => {
            active = false;
        };
    }, [accessToken]);

    useEffect(() => {
        if (!verificationId) return;
        const timer = window.setInterval(() => setNow(Date.now()), 1_000);
        return () => window.clearInterval(timer);
    }, [verificationId]);

    const resendSeconds = Math.max(0, Math.ceil((resendAt - now) / 1_000));
    const expirySeconds = Math.max(0, Math.ceil((expiresAt - now) / 1_000));
    const normalizedEmail = normalizeSignupEmail(email);

    const requestCode = useCallback(async () => {
        const requestedEmail = normalizeSignupEmail(email);
        if (!requestedEmail) {
            setError("인증받을 이메일 주소를 정확히 입력해 주세요.");
            emailRef.current?.focus();
            return;
        }
        if (!status?.providerReady || status.welcomeBonus.status !== "pending" || requesting || resendSeconds > 0) return;

        const accountIdentity = emailIdentity(accountEmail);
        const needsEmailOverride = !accountIdentity
            || isSyntheticSocialEmail(accountEmail)
            || emailIdentity(requestedEmail) !== accountIdentity;

        setRequesting(true);
        setError("");
        setNotice("");
        try {
            const response = await requestSignupEmailVerification(
                needsEmailOverride ? requestedEmail : undefined,
                accessToken
            );
            const requestedAt = Date.now();
            setNow(requestedAt);
            setVerificationId(response.verificationId);
            setMaskedEmail(response.maskedEmail);
            setResendAt(requestedAt + response.resendAfterSeconds * 1_000);
            setExpiresAt(requestedAt + response.expiresInSeconds * 1_000);
            setCode("");
            setNotice(`${response.maskedEmail}로 인증번호를 보냈습니다.`);
            window.setTimeout(() => codeRef.current?.focus(), 0);
        } catch (reason) {
            setError(errorMessage(reason, "request"));
        } finally {
            setRequesting(false);
        }
    }, [accessToken, accountEmail, email, requesting, resendSeconds, status]);

    useEffect(() => {
        const initialEmail = initialAutoEmailRef.current;
        if (
            autoRequestAttemptedRef.current
            || !initialEmail
            || emailIdentity(normalizedEmail) !== emailIdentity(initialEmail)
            || !status?.providerReady
            || status.welcomeBonus.status !== "pending"
            || !status.emailVerificationRequired
            || verificationId
            || completed
        ) return;
        autoRequestAttemptedRef.current = true;
        void requestCode();
    }, [completed, normalizedEmail, requestCode, status, verificationId]);

    const confirmCode = async (event: FormEvent) => {
        event.preventDefault();
        if (!verificationId || confirming) return;
        const confirmationEmail = normalizedEmail;
        if (!confirmationEmail) {
            changeEmail();
            setError("인증번호를 요청한 이메일을 다시 확인해 주세요.");
            return;
        }
        if (expirySeconds <= 0) {
            setError("인증번호 유효시간이 지났습니다. 새 인증번호를 받아 주세요.");
            return;
        }
        if (!/^\d{6}$/.test(code)) {
            setError("인증번호 6자리를 다시 확인해 주세요.");
            codeRef.current?.focus();
            return;
        }
        setConfirming(true);
        setError("");
        setNotice("");
        try {
            const response = await confirmSignupEmailVerification(
                verificationId,
                confirmationEmail,
                code,
                accessToken
            );
            const result: SignupEmailVerificationResult = {
                ...response,
                maskedEmail,
            };
            setCompleted(result);
            setStatus((current) => current ? {
                ...current,
                welcomeBonus: {
                    ...current.welcomeBonus,
                    status: response.status === "credited" ? "claimed" : "repeat",
                },
            } : current);
            onComplete?.(result);
        } catch (reason) {
            if (
                reason instanceof DdbApiError
                && (reason.apiCode === "otp_expired" || reason.apiCode === "otp_attempts_exceeded" || reason.status === 410)
            ) {
                setVerificationId("");
                setCode("");
            }
            setError(errorMessage(reason, "confirm"));
        } finally {
            setConfirming(false);
        }
    };

    const changeEmail = () => {
        setVerificationId("");
        setMaskedEmail("");
        setCode("");
        setResendAt(0);
        setExpiresAt(0);
        setError("");
        setNotice("이메일을 수정한 뒤 인증번호를 다시 받아 주세요.");
        window.setTimeout(() => emailRef.current?.focus(), 0);
    };

    if (hideWhenSettled && !statusLoading && status && status.welcomeBonus.status !== "pending" && !completed) {
        return null;
    }

    return (
        <section
            className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-cyan-50 p-4 sm:p-5"
            aria-labelledby="signup-email-verification-title"
            data-signup-email-verification
        >
            <div className="flex flex-wrap items-center gap-2">
                <DaengLabCoinMark compact />
                <h2 id="signup-email-verification-title" className="text-base font-black text-neutral-950">
                    이메일 인증하고 20C 받기
                </h2>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-indigo-700 shadow-sm">
                    행동·소리 분석 2회
                </span>
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-neutral-600">
                가입 이메일로 6자리 인증번호를 보내 드려요. 인증번호는 5분 동안 유효하며, 가입 혜택은 회원 1인당 한 번만 지급됩니다.
                반복 가입 등 부정 수령이 확인되면 지급 코인이 회수되거나 서비스 이용이 제한될 수 있습니다.
            </p>

            {statusLoading ? (
                <p role="status" className="mt-4 text-sm font-bold text-neutral-500">
                    <i className="fa-solid fa-circle-notch fa-spin mr-2" />가입 혜택을 확인하는 중입니다.
                </p>
            ) : completed ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4" role="status">
                    <p className="font-black text-emerald-900">
                        {completed.status === "credited" && completed.awardedDaengLabCoins > 0
                            ? `이메일 인증이 완료되어 ${completed.awardedDaengLabCoins}C가 지급되었습니다.`
                            : "이메일 인증은 완료되었습니다. 가입 혜택 지급 이력을 확인해 추가 코인은 지급되지 않았습니다."}
                    </p>
                    <p className="mt-1 text-xs font-bold text-emerald-800">인증 이메일: {completed.maskedEmail}</p>
                    <p className="mt-1 text-[11px] font-bold leading-4 text-emerald-700">
                        인증 완료 후에는 이 화면에서 이메일을 변경할 수 없습니다.
                    </p>
                    {onContinueWithoutBonus && (
                        <button type="button" onClick={onContinueWithoutBonus} className="btn btn-primary mt-3 w-full sm:w-auto">
                            계속하기
                        </button>
                    )}
                </div>
            ) : status && status.welcomeBonus.status !== "pending" ? (
                <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
                    <p role="status" className="text-sm font-bold leading-6 text-neutral-700">
                        {settledMessage(status.welcomeBonus.status)}
                    </p>
                    {onContinueWithoutBonus && (
                        <button type="button" onClick={onContinueWithoutBonus} className="btn btn-primary mt-3 w-full sm:w-auto">
                            계속하기
                        </button>
                    )}
                </div>
            ) : status && !status.providerReady ? (
                <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-bold leading-6 text-amber-900">
                    이메일 인증 서비스를 준비하고 있어요. 계정 가입과 기본 서비스 이용은 정상적으로 가능하며,
                    20C는 인증 서비스가 준비된 뒤 이메일 인증을 완료하면 지급됩니다.
                </p>
            ) : status && !status.emailVerificationRequired ? (
                <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-bold leading-6 text-amber-900">
                    가입 혜택 지급 상태를 서버에서 확인하고 있습니다. 잠시 후 다시 시도해 주세요.
                </p>
            ) : status ? (
                <div className="mt-4 grid gap-3">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <label htmlFor="signup-bonus-email" className="min-w-0">
                            <span className="mb-1 block text-xs font-black text-neutral-700">인증받을 이메일</span>
                            <input
                                ref={emailRef}
                                id="signup-bonus-email"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="input h-11 w-full"
                                inputMode="email"
                                autoComplete="email"
                                placeholder="hello@example.com"
                                aria-invalid={Boolean(email) && !normalizedEmail}
                                aria-describedby="signup-bonus-email-help"
                                disabled={Boolean(verificationId)}
                            />
                        </label>
                        {verificationId ? (
                            <button type="button" onClick={changeEmail} className="btn mt-auto h-11 border border-neutral-200 bg-white px-4 text-neutral-700">
                                이메일 오타 수정
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => void requestCode()}
                                disabled={!normalizedEmail || requesting}
                                className="btn btn-primary mt-auto h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {requesting ? "전송 중" : "인증번호 받기"}
                            </button>
                        )}
                    </div>
                    <p id="signup-bonus-email-help" className="text-[11px] font-bold leading-4 text-neutral-500">
                        가입 때 입력한 이메일에는 인증번호가 자동 발송됩니다. 이메일이 임시 주소이거나 오타가 있으면 인증 전에 수정할 수 있어요.
                    </p>

                    {verificationId && (
                        <form onSubmit={confirmCode} className="grid gap-2 rounded-xl border border-indigo-100 bg-white p-3">
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                                <label htmlFor="signup-bonus-code" className="min-w-0">
                                    <span className="mb-1 block text-xs font-black text-neutral-700">이메일 인증번호</span>
                                    <input
                                        ref={codeRef}
                                        id="signup-bonus-code"
                                        value={code}
                                        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                        className="input h-11 w-full tracking-[0.3em]"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        pattern="[0-9]{6}"
                                        maxLength={6}
                                        placeholder="6자리 입력"
                                        aria-invalid={Boolean(code) && !/^\d{6}$/.test(code)}
                                    />
                                </label>
                                <button
                                    type="submit"
                                    disabled={confirming || !/^\d{6}$/.test(code) || expirySeconds <= 0}
                                    className="btn btn-primary mt-auto h-11 px-5 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {confirming ? "확인 중" : "인증 완료"}
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
                                <span className={expirySeconds > 0 ? "text-neutral-500" : "text-rose-700"}>
                                    {maskedEmail} · {expirySeconds > 0
                                        ? `남은 시간 ${Math.floor(expirySeconds / 60)}:${String(expirySeconds % 60).padStart(2, "0")}`
                                        : "인증번호 만료"}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => void requestCode()}
                                    disabled={requesting || resendSeconds > 0}
                                    className="font-black text-indigo-700 disabled:text-neutral-400"
                                >
                                    {resendSeconds > 0 ? `${resendSeconds}초 후 재전송` : "인증번호 재전송"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            ) : null}

            {notice && <p role="status" aria-live="polite" className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold leading-5 text-emerald-800">{notice}</p>}
            {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-800">{error}</p>}
            {onContinueWithoutBonus && !completed && (!status || status.welcomeBonus.status === "pending") && (
                <button type="button" onClick={onContinueWithoutBonus} className="mt-4 w-full text-center text-xs font-black text-neutral-500 underline underline-offset-4">
                    20C 혜택 없이 계속하기
                </button>
            )}
        </section>
    );
}
