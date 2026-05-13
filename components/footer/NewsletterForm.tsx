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
        <div className="md:w-[340px]">
            <p className="text-[11px] tracking-[0.25em] font-black text-aurora-indigo mb-1">
                NEWSLETTER
            </p>
            <p className="text-xs text-neutral-500 mb-3">
                신상품 입고 소식과 할인 정보를 가장 먼저 받아보세요
            </p>
            <form
                onSubmit={submit}
                className="flex gap-2 p-1 bg-white border border-neutral-200 rounded-full"
            >
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일을 입력해주세요"
                    className="flex-1 px-4 text-sm outline-none bg-transparent placeholder:text-neutral-400"
                />
                <button
                    type="submit"
                    className="px-5 h-10 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-xs font-bold hover:opacity-90 transition whitespace-nowrap"
                >
                    {subscribed ? "구독 완료!" : "구독하기"}
                </button>
            </form>
        </div>
    );
}
