"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import SignupBotChallenge, {
    signupTurnstileSiteKey,
} from "@/components/auth/SignupBotChallenge";
import {
    completePasswordReset,
    DdbApiError,
    requestPasswordReset,
    verifyPasswordReset,
} from "@/lib/customer-api";
import { useDdbApiReady } from "@/hooks/useDdbApiReady";

type Step = "email" | "code" | "password" | "done";

type ResetResume = {
    requestId: string;
    email: string;
    resendAt: number;
    expiresAt: number;
};

const RESET_RESUME_KEY = "ddb.passwordReset.resume.v1";

function readResetResume(): ResetResume | null {
    if (typeof window === "undefined") return null;
    try {
        const parsed = JSON.parse(window.sessionStorage.getItem(RESET_RESUME_KEY) || "null") as Partial<ResetResume> | null;
        if (
            !parsed
            || typeof parsed.requestId !== "string"
            || typeof parsed.email !== "string"
            || typeof parsed.resendAt !== "number"
            || typeof parsed.expiresAt !== "number"
            || parsed.expiresAt <= Date.now()
        ) {
            window.sessionStorage.removeItem(RESET_RESUME_KEY);
            return null;
        }
        return parsed as ResetResume;
    } catch {
        window.sessionStorage.removeItem(RESET_RESUME_KEY);
        return null;
    }
}

function saveResetResume(value: ResetResume | null) {
    if (typeof window === "undefined") return;
    if (!value) {
        window.sessionStorage.removeItem(RESET_RESUME_KEY);
        return;
    }
    window.sessionStorage.setItem(RESET_RESUME_KEY, JSON.stringify(value));
}

function resetErrorMessage(error: unknown, step: Step) {
    if (error instanceof DdbApiError) {
        if (error.apiCode === "bot_verification_failed") {
            return "보안 확인 시간이 지났거나 확인되지 않았습니다. 다시 확인해 주세요.";
        }
        if (error.apiCode === "bot_verification_unavailable" || error.status === 503) {
            return "본인 확인 서비스를 잠시 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.";
        }
        if (error.apiCode === "password_reset_rate_limited" || error.status === 429) {
            return "요청이 많아 잠시 보호 중입니다. 잠시 후 다시 시도해 주세요.";
        }
        if (error.apiCode === "password_reset_superseded") {
            return "새 인증번호가 발급되었습니다. 가장 최근에 받은 번호를 입력해 주세요.";
        }
        if (error.apiCode === "password_reset_password_reused") {
            return "현재 비밀번호와 다른 새 비밀번호를 입력해 주세요.";
        }
        if (
            error.apiCode === "password_reset_expired"
            || error.apiCode === "reset_request_expired"
            || error.status === 410
        ) {
            return "인증 시간이 지났습니다. 이메일부터 다시 확인해 주세요.";
        }
        if (
            error.apiCode === "invalid_password_reset_code"
            || error.apiCode === "password_reset_invalid"
            || error.apiCode === "invalid_otp"
            || (step === "code" && error.status === 400)
        ) {
            return "인증번호가 맞지 않거나 사용할 수 없습니다. 최근에 받은 번호를 확인해 주세요.";
        }
        if (step === "password" && (error.status === 400 || error.status === 401)) {
            return "재설정 시간이 지났거나 이미 사용된 요청입니다. 이메일 확인부터 다시 진행해 주세요.";
        }
    }
    return "요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function formatSeconds(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export default function ForgotPasswordPage() {
    const apiReady = useDdbApiReady();
    const challengeConfigured = Boolean(signupTurnstileSiteKey());
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [requestId, setRequestId] = useState("");
    const [code, setCode] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [botToken, setBotToken] = useState("");
    const [challengeResetKey, setChallengeResetKey] = useState(0);
    const [resendAt, setResendAt] = useState(0);
    const [expiresAt, setExpiresAt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const codeRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const resume = readResetResume();
        if (!resume) return;
        setEmail(resume.email);
        setRequestId(resume.requestId);
        setResendAt(resume.resendAt);
        setExpiresAt(resume.expiresAt);
        setStep("code");
        setNotice("진행 중이던 이메일 확인을 이어서 할 수 있습니다.");
    }, []);

    useEffect(() => {
        if (step !== "code") return;
        const timer = window.setInterval(() => setNow(Date.now()), 1_000);
        return () => window.clearInterval(timer);
    }, [step]);

    useEffect(() => {
        if (step !== "code" || !expiresAt || expiresAt > now) return;
        saveResetResume(null);
        setRequestId("");
        setCode("");
        setStep("email");
        setNotice("");
        setError("인증 시간이 지났습니다. 이메일부터 다시 확인해 주세요.");
    }, [expiresAt, now, step]);

    const resendSeconds = Math.max(0, Math.ceil((resendAt - now) / 1_000));
    const expirySeconds = Math.max(0, Math.ceil((expiresAt - now) / 1_000));

    const sendCode = async (event?: FormEvent) => {
        event?.preventDefault();
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            setError("본인 확인에 사용할 이메일을 입력해 주세요.");
            return;
        }
        if (!challengeConfigured || !botToken || loading) return;

        setLoading(true);
        setError("");
        setNotice("");
        try {
            const response = await requestPasswordReset({
                email: normalizedEmail,
                bot_token: botToken,
            });
            const requestedAt = Date.now();
            const resume: ResetResume = {
                requestId: response.requestId,
                email: normalizedEmail,
                resendAt: requestedAt + response.resendAfterSeconds * 1_000,
                expiresAt: requestedAt + response.expiresInSeconds * 1_000,
            };
            setEmail(normalizedEmail);
            setRequestId(response.requestId);
            setResendAt(resume.resendAt);
            setExpiresAt(resume.expiresAt);
            setNow(requestedAt);
            setCode("");
            setStep("code");
            setNotice("입력한 주소가 등록되어 있고 이메일 로그인이 가능한 계정이면 인증번호를 보내드립니다.");
            saveResetResume(resume);
            window.setTimeout(() => codeRef.current?.focus(), 0);
        } catch (reason) {
            setError(resetErrorMessage(reason, "email"));
        } finally {
            setBotToken("");
            setChallengeResetKey((value) => value + 1);
            setLoading(false);
        }
    };

    const verifyCode = async (event: FormEvent) => {
        event.preventDefault();
        if (!requestId || !/^\d{6}$/.test(code) || loading) {
            setError("이메일로 받은 인증번호 6자리를 입력해 주세요.");
            return;
        }
        setLoading(true);
        setError("");
        setNotice("");
        try {
            const response = await verifyPasswordReset({
                request_id: requestId,
                email: email.trim().toLowerCase(),
                code,
            });
            setResetToken(response.resetToken);
            setStep("password");
            setCode("");
            saveResetResume(null);
            setNotice(`이메일 확인이 완료되었습니다. ${Math.max(1, Math.floor(response.expiresInSeconds / 60))}분 안에 새 비밀번호를 설정해 주세요.`);
        } catch (reason) {
            setError(resetErrorMessage(reason, "code"));
        } finally {
            setLoading(false);
        }
    };

    const setPassword = async (event: FormEvent) => {
        event.preventDefault();
        const passwordBytes = new TextEncoder().encode(newPassword).length;
        if (newPassword.length < 8 || passwordBytes > 72) {
            setError("새 비밀번호는 8자 이상, UTF-8 기준 72바이트 이하로 입력해 주세요.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("새 비밀번호가 서로 일치하지 않습니다.");
            return;
        }
        if (!requestId || !resetToken || loading) {
            setError("재설정 시간이 지났습니다. 이메일 확인부터 다시 진행해 주세요.");
            return;
        }
        setLoading(true);
        setError("");
        setNotice("");
        try {
            await completePasswordReset({
                request_id: requestId,
                reset_token: resetToken,
                new_password: newPassword,
            });
            setResetToken("");
            setNewPassword("");
            setConfirmPassword("");
            setRequestId("");
            setStep("done");
            saveResetResume(null);
        } catch (reason) {
            setError(resetErrorMessage(reason, "password"));
        } finally {
            setLoading(false);
        }
    };

    const restart = () => {
        saveResetResume(null);
        setStep("email");
        setRequestId("");
        setCode("");
        setResetToken("");
        setNewPassword("");
        setConfirmPassword("");
        setNotice("");
        setError("");
        setBotToken("");
        setChallengeResetKey((value) => value + 1);
    };

    return (
        <div className="w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-card md:px-9 md:py-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-2xl text-amber-600">
                <i className={`fa-solid ${step === "done" ? "fa-check" : "fa-key"}`} aria-hidden="true" />
            </div>
            <h1 className="text-center text-2xl font-black tracking-tight text-neutral-950 md:text-3xl">
                {step === "done" ? "비밀번호 재설정 완료" : "비밀번호 재설정"}
            </h1>
            <p className="mt-3 text-center text-sm font-bold leading-6 text-neutral-600">
                {step === "email" && "자사몰 가입 이메일로 본인 확인을 시작합니다."}
                {step === "code" && "이메일로 받은 인증번호를 입력해 주세요."}
                {step === "password" && "앞으로 사용할 새 비밀번호를 설정해 주세요."}
                {step === "done" && "새 비밀번호로 다시 로그인해 주세요."}
            </p>

            {apiReady === false && (
                <p className="mt-5 rounded-md bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800" role="status">
                    지금은 본인 확인 서비스를 준비 중입니다. 잠시 후 다시 이용해 주세요.
                </p>
            )}
            {notice && (
                <p className="mt-5 rounded-md bg-emerald-50 px-3 py-2 text-xs font-bold leading-5 text-emerald-800" role="status" aria-live="polite">
                    {notice}
                </p>
            )}
            {error && (
                <p className="mt-5 rounded-md bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-700" role="alert">
                    {error}
                </p>
            )}

            {step === "email" && (
                <form onSubmit={sendCode} className="mt-6 grid gap-4">
                    <label className="grid gap-2 text-sm font-black text-neutral-800">
                        가입 이메일
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            required
                            placeholder="email@example.com"
                            className="h-12 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                        />
                    </label>
                    <SignupBotChallenge
                        action="password_reset"
                        title="본인 확인 보호"
                        description="자동 요청을 막기 위한 확인을 완료해 주세요."
                        unavailableMessage="본인 확인 보호 기능을 준비 중입니다. 잠시 후 다시 이용해 주세요."
                        onTokenChange={setBotToken}
                        resetKey={challengeResetKey}
                    />
                    <button
                        type="submit"
                        disabled={loading || apiReady !== true || !challengeConfigured || !botToken}
                        className="h-12 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-sm font-black text-white shadow-[0_8px_20px_rgba(245,158,11,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "확인 중..." : "인증번호 받기"}
                    </button>
                </form>
            )}

            {step === "code" && (
                <form onSubmit={verifyCode} className="mt-6 grid gap-4">
                    <div className="rounded-xl bg-neutral-50 px-4 py-3 text-xs font-bold leading-5 text-neutral-600">
                        인증 유효시간 <strong className="text-neutral-950">{formatSeconds(expirySeconds)}</strong>
                    </div>
                    <label className="grid gap-2 text-sm font-black text-neutral-800">
                        인증번호 6자리
                        <input
                            ref={codeRef}
                            type="text"
                            value={code}
                            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            required
                            className="h-12 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-center text-lg font-black tracking-[0.35em] outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={loading || code.length !== 6}
                        className="h-12 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "확인 중..." : "이메일 확인"}
                    </button>
                    {resendSeconds === 0 && (
                        <SignupBotChallenge
                            action="password_reset"
                            title="재전송 보호"
                            description="인증번호를 다시 받을 때 필요한 확인입니다."
                            unavailableMessage="재전송 보호 기능을 준비 중입니다. 잠시 후 다시 이용해 주세요."
                            onTokenChange={setBotToken}
                            resetKey={challengeResetKey}
                        />
                    )}
                    <button
                        type="button"
                        onClick={() => void sendCode()}
                        disabled={loading || resendSeconds > 0 || !botToken}
                        className="h-10 rounded-xl border border-neutral-200 text-xs font-black text-neutral-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {resendSeconds > 0 ? `${resendSeconds}초 후 다시 받기` : "인증번호 다시 받기"}
                    </button>
                    <button type="button" onClick={restart} className="text-xs font-bold text-neutral-500 underline">
                        이메일 다시 입력하기
                    </button>
                </form>
            )}

            {step === "password" && (
                <form onSubmit={setPassword} className="mt-6 grid gap-4">
                    <label className="grid gap-2 text-sm font-black text-neutral-800">
                        새 비밀번호
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            minLength={8}
                            maxLength={72}
                            autoComplete="new-password"
                            required
                            placeholder="8자 이상·최대 72바이트"
                            className="h-12 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                        />
                    </label>
                    <label className="grid gap-2 text-sm font-black text-neutral-800">
                        새 비밀번호 확인
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            minLength={8}
                            maxLength={72}
                            autoComplete="new-password"
                            required
                            className="h-12 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={loading}
                        className="h-12 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "변경 중..." : "새 비밀번호 저장"}
                    </button>
                </form>
            )}

            {step === "done" && (
                <Link href="/auth/login" className="btn btn-primary mt-7 w-full">
                    로그인하기
                </Link>
            )}

            {step !== "done" && (
                <Link href="/auth/login" className="mt-6 block text-center text-xs font-bold text-neutral-500 hover:text-amber-700">
                    로그인으로 돌아가기
                </Link>
            )}
        </div>
    );
}
