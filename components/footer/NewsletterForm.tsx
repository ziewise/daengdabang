/**
 * NewsletterForm — 푸터 뉴스레터 구독 폼 (mock)
 * ---------------------------------------------------------------------
 * onSubmit 은 alert 로 mock. 실제 백엔드 연동 시 fetch 로 교체.
 */
"use client";

import { useState } from "react";

export default function NewsletterForm() {
    const [email, setEmail] = useState("");
    const [subscribed, setSubscribed] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        // TODO: POST /api/newsletter/subscribe
        setSubscribed(true);
        setEmail("");
        setTimeout(() => setSubscribed(false), 3000);
    };

    return (
        <div className="md:w-[300px]">
            <p className="text-[9px] tracking-[0.3em] font-black text-aurora-indigo mb-0.5">
                NEWSLETTER
            </p>
            <p className="text-[11px] text-neutral-500 mb-2">
                신상품·할인 소식을 가장 먼저 받아보세요
            </p>
            <form
                onSubmit={submit}
                className="flex gap-1.5 p-1 bg-white border border-neutral-200 rounded-full"
            >
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일을 입력해주세요"
                    className="flex-1 px-3.5 text-xs outline-none bg-transparent placeholder:text-neutral-400"
                />
                <button
                    type="submit"
                    className="px-4 h-8 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-[11px] font-bold hover:opacity-90 transition whitespace-nowrap"
                >
                    {subscribed ? "완료!" : "구독하기"}
                </button>
            </form>
        </div>
    );
}
