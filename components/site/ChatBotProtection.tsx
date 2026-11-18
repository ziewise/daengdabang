"use client";
import { useI18n } from "@/lib/i18n";
import { useCareTalkCopy } from "@/hooks/useCareTalkCopy";
import Link from "next/link";
import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useRef, useState } from "react";
import SignupBotChallenge, { signupTurnstileSiteKey } from "@/components/auth/SignupBotChallenge";
import { ddbApiBase } from "@/lib/ddb-api-base";
import { chatSubmissionDecision, loadChatSecurityPolicy, normalizeChatBotToken, type ChatSecurityPolicy } from "@/lib/shop-chat-security";

export function useChatBotProtection(open: boolean, accessToken?: string) {
    const copy = useCareTalkCopy();
    const { locale } = useI18n();
    const [policy, setPolicy] = useState<ChatSecurityPolicy | null>(null);
    const [unavailable, setUnavailable] = useState(false);
    const [revision, setRevision] = useState(0);
    const [resetKey, setResetKey] = useState(0);
    const tokenRef = useRef("");
    const native = typeof window !== "undefined" && Capacitor.isNativePlatform();
    const authenticated = Boolean(accessToken?.trim());
    const siteKey = signupTurnstileSiteKey();
    const onTokenChange = useCallback((token: string) => { tokenRef.current = normalizeChatBotToken(token); }, []);
    const clearToken = useCallback(() => { tokenRef.current = ""; setResetKey(value => value + 1); }, []);
    const refresh = useCallback(() => { clearToken(); setPolicy(null); setUnavailable(false); setRevision(value => value + 1); }, [clearToken]);
    useEffect(() => {
        tokenRef.current = "";
        if (!open || authenticated) return;
        const controller = new AbortController();
        const base = ddbApiBase();
        const timer = setTimeout(() => { setUnavailable(true); controller.abort(); }, 8000);
        const request = base ? loadChatSecurityPolicy(base, controller.signal) : Promise.reject(new Error("chat_api_unavailable"));
        void request.then(value => {
            if (!controller.signal.aborted) setPolicy(value);
        }).catch(() => { if (!controller.signal.aborted) setUnavailable(true); }).finally(() => clearTimeout(timer));
        return () => { clearTimeout(timer); controller.abort(); };
    }, [open, authenticated, revision]);
    const decision = () => chatSubmissionDecision(policy, accessToken, native, tokenRef.current, Boolean(siteKey));
    const consume = () => { const value = decision(); if (value.allowed && value.token) clearToken(); return { allowed: value.allowed, proof: value.token, message: value.message }; };
    const challenge = !authenticated && open && (unavailable ? (
        <section role="status" className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs">
            {copy("보안 설정을 확인하지 못했어요.")} <button type="button" className="underline" onClick={refresh}>{copy("다시 확인")}</button>
        </section>
    ) : policy?.guestChallengeRequired ? native ? (
        <section role="status" className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs">
            {locale === "en" ? "To start a secure chat in the app, " : "이 앱의 보안 확인 연결을 준비 중이에요. "}<Link href="/auth/login/?redirect=%2Fchat%2F" className="underline">{copy("로그인 후 상담")}</Link>{locale === "en" ? "." : "을 이용해 주세요."}
        </section>
    ) : <SignupBotChallenge action="shop_chat" headingId="shop-chat-bot-challenge-title"
        title={copy("상담 보안 확인")} description={copy("자동으로 반복되는 요청을 막기 위한 확인이에요.")}
        unavailableMessage={copy("상담 보안 확인을 준비 중입니다. 잠시 후 다시 이용해 주세요.")}
        onTokenChange={onTokenChange} resetKey={resetKey} /> : null);
    return { consume, refresh, clearToken, challenge, ready: authenticated || policy !== null || unavailable };
}
