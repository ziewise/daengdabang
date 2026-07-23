"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileWidgetId = string;

type TurnstileOptions = {
    sitekey: string;
    action?: string;
    appearance?: "always" | "execute" | "interaction-only";
    size?: "normal" | "flexible" | "compact";
    theme?: "auto" | "light" | "dark";
    callback: (token: string) => void;
    "error-callback": (errorCode: string) => boolean;
    "expired-callback": () => void;
    "timeout-callback": () => void;
};

type TurnstileApi = {
    render: (container: HTMLElement | string, options: TurnstileOptions) => TurnstileWidgetId;
    remove: (widgetId: TurnstileWidgetId) => void;
    reset: (widgetId: TurnstileWidgetId) => void;
};

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

const TURNSTILE_TEST_SITE_KEYS = new Set([
    "1x00000000000000000000AA",
    "2x00000000000000000000AB",
    "1x00000000000000000000BB",
    "2x00000000000000000000BB",
    "3x00000000000000000000FF",
]);

// This is a public, hostname-restricted browser identifier, not the server secret.
// Keep a production fallback in the client bundle so static hosting cannot lose the
// challenge when a build runner omits NEXT_PUBLIC_* replacement.
const PRODUCTION_TURNSTILE_SITE_KEY = "0x4AAAAAAD8Fivq7ZEMUPPwX";

export function signupTurnstileSiteKey() {
    const configuredSiteKey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();
    const siteKey = configuredSiteKey
        || (process.env.NODE_ENV === "production" ? PRODUCTION_TURNSTILE_SITE_KEY : "");
    if (!siteKey) return "";
    if (process.env.NODE_ENV === "production" && TURNSTILE_TEST_SITE_KEYS.has(siteKey)) return "";
    return siteKey;
}

type ChallengeStatus = "loading" | "checking" | "verified" | "expired" | "error";

export default function SignupBotChallenge({
    onTokenChange,
    resetKey = 0,
    action = "signup",
    title = "가입 보안 확인",
    description = "자동 가입을 막기 위한 확인을 완료해 주세요.",
    unavailableMessage = "가입 보안 확인을 준비 중입니다. 잠시 후 다시 이용해 주세요.",
}: {
    onTokenChange: (token: string) => void;
    resetKey?: number;
    action?: "signup" | "password_reset";
    title?: string;
    description?: string;
    unavailableMessage?: string;
}) {
    const siteKey = signupTurnstileSiteKey();
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<TurnstileWidgetId | null>(null);
    const previousResetKeyRef = useRef(resetKey);
    const [scriptReady, setScriptReady] = useState(false);
    const [status, setStatus] = useState<ChallengeStatus>("loading");

    const clearToken = useCallback((nextStatus: ChallengeStatus) => {
        onTokenChange("");
        setStatus(nextStatus);
    }, [onTokenChange]);

    const resetChallenge = useCallback(() => {
        clearToken("checking");
        const widgetId = widgetIdRef.current;
        if (widgetId && window.turnstile) {
            window.turnstile.reset(widgetId);
        }
    }, [clearToken]);

    useEffect(() => {
        if (!siteKey || !scriptReady || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) return;

        clearToken("checking");
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            action,
            appearance: "always",
            size: "flexible",
            theme: "light",
            callback: (token) => {
                onTokenChange(token);
                setStatus("verified");
            },
            "error-callback": () => {
                clearToken("error");
                return true;
            },
            "expired-callback": () => clearToken("expired"),
            "timeout-callback": () => clearToken("expired"),
        });

        return () => {
            const widgetId = widgetIdRef.current;
            widgetIdRef.current = null;
            if (widgetId && window.turnstile) {
                window.turnstile.remove(widgetId);
            }
        };
    }, [action, clearToken, onTokenChange, scriptReady, siteKey]);

    useEffect(() => {
        if (previousResetKeyRef.current === resetKey) return;
        previousResetKeyRef.current = resetKey;
        resetChallenge();
    }, [resetChallenge, resetKey]);

    if (!siteKey) {
        return (
            <section
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3"
                role="status"
                data-signup-bot-challenge-unavailable
            >
                <p className="text-xs font-black leading-5 text-amber-800">
                    {unavailableMessage}
                </p>
            </section>
        );
    }

    return (
        <section
            className="grid gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3"
            aria-labelledby="signup-bot-challenge-title"
            data-signup-bot-challenge
        >
            <div>
                <h3 id="signup-bot-challenge-title" className="text-sm font-black text-neutral-950">
                    {title}
                </h3>
                <p className="mt-1 text-xs font-bold leading-5 text-neutral-500">
                    {description}
                </p>
            </div>
            <div ref={containerRef} className="min-h-[65px] w-full overflow-hidden" />
            <div className="flex items-center justify-between gap-3" aria-live="polite">
                <p className={[
                    "text-[11px] font-black leading-5",
                    status === "verified" ? "text-emerald-700" : "text-neutral-500",
                    status === "error" || status === "expired" ? "text-amber-700" : "",
                ].join(" ")}>
                    {status === "verified" && "보안 확인이 완료되었습니다."}
                    {(status === "loading" || status === "checking") && "보안 확인을 불러오는 중입니다."}
                    {status === "expired" && "보안 확인 시간이 지났습니다. 다시 확인해 주세요."}
                    {status === "error" && "보안 확인을 완료하지 못했습니다. 다시 시도해 주세요."}
                </p>
                {(status === "error" || status === "expired") && (
                    <button
                        type="button"
                        onClick={resetChallenge}
                        className="shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-black text-neutral-700"
                    >
                        다시 확인
                    </button>
                )}
            </div>
            <Script
                id="ddb-signup-turnstile"
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                strategy="afterInteractive"
                onReady={() => setScriptReady(true)}
                onError={() => clearToken("error")}
            />
        </section>
    );
}
