/**
 * NewsletterForm — 푸터 뉴스레터 구독 폼 (mock)
 * ---------------------------------------------------------------------
 * onSubmit 은 alert 로 mock. 실제 백엔드 연동 시 fetch 로 교체.
 */
"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export default function NewsletterForm() {
    const [email, setEmail] = useState("");
    const [subscribed, setSubscribed] = useState(false);
    const { locale } = useI18n();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        // TODO: POST /api/newsletter/subscribe
        setSubscribed(true);
        setEmail("");
        setTimeout(() => setSubscribed(false), 3000);
    };

    return (
        <form
            onSubmit={submit}
            className="flex gap-1.5 p-1 bg-white border border-neutral-200 rounded-full w-full max-w-[280px]"
        >
            <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={locale === "en" ? "Enter your email" : "이메일을 입력해주세요"}
                className="flex-1 min-w-0 px-3.5 text-xs outline-none bg-transparent placeholder:text-neutral-400"
            />
            <button
                type="submit"
                className="flex-shrink-0 px-4 h-8 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-[11px] font-bold hover:opacity-90 transition whitespace-nowrap"
            >
                {subscribed ? (locale === "en" ? "Done" : "완료!") : (locale === "en" ? "Subscribe" : "구독하기")}
            </button>
        </form>
    );
}
