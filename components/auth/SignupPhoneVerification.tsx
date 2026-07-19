"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
    confirmSignupPhoneVerification,
    DdbApiError,
    loadSignupBonusStatus,
    requestSignupPhoneVerification,
    type DaengLabWallet,
    type SignupBonusStatus,
} from "@/lib/customer-api";
import {
    formatKoreanMobileNumber,
    normalizeKoreanMobileNumber,
} from "@/lib/signup-phone-verification";
import DaengLabCoinMark from "@/components/petlens/DaengLabCoinMark";

export type SignupPhoneVerificationResult = {
    status: "credited" | "already_claimed";
    awardedDaengLabCoins: number;
    wallet: DaengLabWallet;
    maskedPhone: string;
};

type Props = {
    accessToken?: string;
    defaultPhone?: string;
    onComplete?: (result: SignupPhoneVerificationResult) => void;
    onContinueWithoutBonus?: () => void;
    hideWhenSettled?: boolean;
};

function errorMessage(error: unknown, step: "request" | "confirm" | "status") {
    if (error instanceof DdbApiError) {
        if (error.apiCode === "signup_bonus_already_claimed") {
            return "이 휴대전화번호에는 가입 축하 코인이 이미 지급되었습니다.";
        }
        if (error.apiCode === "no_pending_eligibility") {
            return "현재 계정에는 인증을 기다리는 가입 혜택이 없습니다.";
        }
        if (error.apiCode === "signup_bonus_expired") {
            return "가입 축하 혜택의 인증 가능 기간이 지났습니다.";
        }
        if (error.apiCode === "unsupported_phone_region") {
            return "국내 010 휴대전화번호만 인증할 수 있습니다.";
        }
        if (error.apiCode === "otp_resend_too_soon") {
            return "인증번호를 다시 받을 수 있을 때까지 잠시 기다려 주세요.";
        }
        if (error.apiCode === "otp_rate_limited" || error.apiCode === "otp_attempts_exceeded") {
            return "요청 횟수가 많습니다. 잠시 후 다시 시도해 주세요.";
        }
        if (error.apiCode === "sms_provider_unavailable" || error.status === 503) {
            return "문자 인증 서비스를 준비하고 있어요. 잠시 후 다시 시도해 주세요.";
        }
        if (error.apiCode === "otp_expired" || error.status === 410) {
            return "인증번호 유효시간이 지났습니다. 새 인증번호를 받아 주세요.";
        }
        if (error.apiCode === "invalid_otp" || (step === "confirm" && error.status === 400)) {
            return "인증번호 6자리를 다시 확인해 주세요.";
        }
        if (error.status === 401) return "로그인 정보가 만료되었습니다. 다시 로그인해 주세요.";
        if (error.message) return error.message;
    }
    if (step === "status") return "가입 혜택 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    if (step === "request") return "인증번호를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.";
    return "휴대전화 인증을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function settledMessage(status: SignupBonusStatus["welcomeBonus"]["status"]) {
    if (status === "claimed") return "가입 축하 20C가 이미 지급되었습니다.";
    if (status === "repeat") return "이미 가입 혜택을 받은 휴대전화번호로 확인되어 추가 지급되지 않습니다.";
    if (status === "expired") return "가입 축하 혜택의 인증 가능 기간이 지났습니다.";
    return "현재 계정은 가입 축하 혜택 지급 대상이 아닙니다.";
}

export default function SignupPhoneVerification({
    accessToken,
    defaultPhone = "",
    onComplete,
    onContinueWithoutBonus,
    hideWhenSettled = false,
}: Props) {
    const [status, setStatus] = useState<SignupBonusStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [phone, setPhone] = useState(() => formatKoreanMobileNumber(defaultPhone));
    const [verificationId, setVerificationId] = useState("");
    const [maskedPhone, setMaskedPhone] = useState("");
    const [code, setCode] = useState("");
    const [resendAt, setResendAt] = useState(0);
    const [expiresAt, setExpiresAt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [requesting, setRequesting] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [completed, setCompleted] = useState<SignupPhoneVerificationResult | null>(null);
    const phoneRef = useRef<HTMLInputElement>(null);
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
    const normalizedPhone = normalizeKoreanMobileNumber(phone);

    const requestCode = async () => {
        if (!normalizedPhone) {
            setError("휴대전화번호를 010-1234-5678 형식으로 입력해 주세요.");
            phoneRef.current?.focus();
            return;
        }
        if (!status?.providerReady || status.welcomeBonus.status !== "pending" || requesting || resendSeconds > 0) return;
        setRequesting(true);
        setError("");
        setNotice("");
        try {
            const response = await requestSignupPhoneVerification(normalizedPhone, accessToken);
            const requestedAt = Date.now();
            setNow(requestedAt);
            setVerificationId(response.verificationId);
            setMaskedPhone(response.maskedPhone);
            setResendAt(requestedAt + response.resendAfterSeconds * 1_000);
            setExpiresAt(requestedAt + response.expiresInSeconds * 1_000);
            setCode("");
            setNotice(`${response.maskedPhone}로 인증번호를 보냈습니다.`);
            window.setTimeout(() => codeRef.current?.focus(), 0);
        } catch (reason) {
            setError(errorMessage(reason, "request"));
        } finally {
            setRequesting(false);
        }
    };

    const confirmCode = async (event: FormEvent) => {
        event.preventDefault();
        if (!verificationId || confirming) return;
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
            const response = await confirmSignupPhoneVerification(verificationId, code, accessToken);
            const result: SignupPhoneVerificationResult = {
                ...response,
                maskedPhone,
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
            if (reason instanceof DdbApiError && (reason.apiCode === "otp_expired" || reason.apiCode === "otp_attempts_exceeded" || reason.status === 410)) {
                setVerificationId("");
                setCode("");
            }
            setError(errorMessage(reason, "confirm"));
        } finally {
            setConfirming(false);
        }
    };

    const changePhone = () => {
        setVerificationId("");
        setMaskedPhone("");
        setCode("");
        setResendAt(0);
        setExpiresAt(0);
        setError("");
        setNotice("");
        window.setTimeout(() => phoneRef.current?.focus(), 0);
    };

    if (hideWhenSettled && !statusLoading && status && status.welcomeBonus.status !== "pending" && !completed) {
        return null;
    }

    return (
        <section
            className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-cyan-50 p-4 sm:p-5"
            aria-labelledby="signup-phone-verification-title"
            data-signup-phone-verification
        >
            <div className="flex flex-wrap items-center gap-2">
                <DaengLabCoinMark compact />
                <h2 id="signup-phone-verification-title" className="text-base font-black text-neutral-950">
                    휴대전화 인증하고 20C 받기
                </h2>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-indigo-700 shadow-sm">
                    행동·소리 분석 2회
                </span>
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-neutral-600">
                인증된 휴대전화번호 1개당 최초 1회만 지급됩니다. 인증번호는 6자리이며 다른 용도로 사용하지 않습니다.
            </p>

            {statusLoading ? (
                <p role="status" className="mt-4 text-sm font-bold text-neutral-500">
                    <i className="fa-solid fa-circle-notch fa-spin mr-2" />가입 혜택을 확인하는 중입니다.
                </p>
            ) : completed ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4" role="status">
                    <p className="font-black text-emerald-900">
                        {completed.status === "credited" && completed.awardedDaengLabCoins > 0
                            ? `휴대전화 인증이 완료되어 ${completed.awardedDaengLabCoins}C가 지급되었습니다.`
                            : "휴대전화 인증은 완료되었습니다. 이 번호에는 가입 축하 코인이 이미 지급되어 추가 지급되지 않습니다."}
                    </p>
                    <p className="mt-1 text-xs font-bold text-emerald-800">인증 번호: {completed.maskedPhone}</p>
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
                    문자 인증 서비스를 준비하고 있어요. 계정 가입은 완료되었지만 20C 지급은 인증 서비스가 준비된 뒤 진행할 수 있습니다.
                </p>
            ) : status && !status.phoneVerificationRequired ? (
                <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-bold leading-6 text-amber-900">
                    가입 혜택 지급 상태를 서버에서 확인하고 있습니다. 잠시 후 다시 시도해 주세요.
                </p>
            ) : status ? (
                <div className="mt-4 grid gap-3">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <label htmlFor="signup-bonus-phone" className="min-w-0">
                            <span className="mb-1 block text-xs font-black text-neutral-700">휴대전화번호</span>
                            <input
                                ref={phoneRef}
                                id="signup-bonus-phone"
                                type="tel"
                                value={phone}
                                onChange={(event) => setPhone(formatKoreanMobileNumber(event.target.value))}
                                className="input h-11 w-full"
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="010-1234-5678"
                                aria-invalid={Boolean(phone) && !normalizedPhone}
                                aria-describedby="signup-bonus-phone-help"
                                disabled={Boolean(verificationId)}
                            />
                        </label>
                        {verificationId ? (
                            <button type="button" onClick={changePhone} className="btn mt-auto h-11 border border-neutral-200 bg-white px-4 text-neutral-700">
                                번호 변경
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => void requestCode()}
                                disabled={!normalizedPhone || requesting}
                                className="btn btn-primary mt-auto h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {requesting ? "전송 중" : "인증번호 받기"}
                            </button>
                        )}
                    </div>
                    <p id="signup-bonus-phone-help" className="text-[11px] font-bold leading-4 text-neutral-500">
                        국내 010 휴대전화번호만 인증할 수 있습니다.
                    </p>

                    {verificationId && (
                        <form onSubmit={confirmCode} className="grid gap-2 rounded-xl border border-indigo-100 bg-white p-3">
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                                <label htmlFor="signup-bonus-code" className="min-w-0">
                                    <span className="mb-1 block text-xs font-black text-neutral-700">문자 인증번호</span>
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
                                    {maskedPhone} · {expirySeconds > 0 ? `남은 시간 ${Math.floor(expirySeconds / 60)}:${String(expirySeconds % 60).padStart(2, "0")}` : "인증번호 만료"}
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
