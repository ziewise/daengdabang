"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    consentOutboundEmailPreference,
    DdbApiError,
    getCustomerToken,
    loadOutboundEmailPreference,
} from "@/lib/customer-api";
import { useI18n } from "@/lib/i18n";
import { isInternalSocialEmail } from "@/lib/member-account-display";
import { useAuth } from "@/lib/store";

export default function NewsletterForm() {
    const { locale } = useI18n();
    const { hydrated, user } = useAuth();
    const [consentChecked, setConsentChecked] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState("");
    const token = user?.apiAccessToken || getCustomerToken();
    const routableEmail = Boolean(user?.email && !isInternalSocialEmail(user.email));

    useEffect(() => {
        if (!hydrated || !user || !token || !routableEmail) return;
        let cancelled = false;
        loadOutboundEmailPreference(token)
            .then((preference) => {
                if (!cancelled) setSubscribed(preference.sendAuthorized);
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, [hydrated, routableEmail, token, user]);

    if (!hydrated) {
        return <div className="h-10 w-full max-w-[320px] animate-pulse rounded-full bg-neutral-100" aria-hidden="true" />;
    }
    if (!user) {
        return (
            <Link href="/auth/login/?return_to=%2F" className="inline-flex h-10 items-center rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo px-5 text-xs font-black text-white">
                {locale === "en" ? "Sign in to subscribe" : "로그인하고 소식 받기"}
            </Link>
        );
    }
    if (!routableEmail) {
        return (
            <Link href="/inquiry/?category=other#inquiry-form" className="inline-flex h-10 items-center rounded-full border border-neutral-200 bg-white px-4 text-xs font-black text-neutral-700">
                {locale === "en" ? "Connect an email" : "수신 이메일 연결하기"}
            </Link>
        );
    }

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!token || pending || subscribed || !consentChecked) return;
        setPending(true);
        setMessage("");
        try {
            const preference = await consentOutboundEmailPreference(token);
            setSubscribed(preference.sendAuthorized);
            setMessage(preference.sendAuthorized
                ? "댕다방 소식 구독이 저장됐어요."
                : "구독은 저장됐지만 수신 주소 확인이 필요해요.");
        } catch (caught) {
            setMessage(caught instanceof DdbApiError
                ? caught.message
                : "구독을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setPending(false);
        }
    };

    return (
        <form onSubmit={submit} className="w-full max-w-[360px]" aria-label="댕다방 뉴스레터 구독">
            <div className="flex gap-1.5 rounded-full border border-neutral-200 bg-white p-1">
                <input
                    type="email"
                    value={user.email}
                    readOnly
                    aria-label="구독 이메일"
                    className="min-w-0 flex-1 bg-transparent px-3.5 text-xs font-bold outline-none"
                />
                <button
                    type="submit"
                    disabled={pending || subscribed || !consentChecked}
                    className="h-8 flex-shrink-0 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo px-4 text-[11px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                    {pending ? "저장 중…" : subscribed ? "구독 중" : "구독하기"}
                </button>
            </div>
            {!subscribed && (
                <label className="mt-2 flex items-start gap-1.5 text-[10px] font-bold leading-4 text-neutral-500">
                    <input
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(event) => setConsentChecked(event.target.checked)}
                        className="mt-0.5"
                    />
                    이벤트·신상품 등 마케팅 이메일 수신에 동의합니다. 언제든 철회할 수 있습니다.
                </label>
            )}
            {message && <p className="mt-1.5 text-[10px] font-bold text-neutral-600" role="status">{message}</p>}
        </form>
    );
}
