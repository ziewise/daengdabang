"use client";

import { ddbApiBase, startSocialLogin, type SocialProvider } from "@/lib/customer-api";

const PROVIDERS: Array<{
    id: SocialProvider;
    label: string;
    icon: string;
    className: string;
}> = [
    {
        id: "naver",
        label: "네이버",
        icon: "N",
        className: "border-[#03c75a] bg-[#03c75a] text-white hover:bg-[#02b351]",
    },
    {
        id: "kakao",
        label: "카카오",
        icon: "fa-solid fa-comment",
        className: "border-[#fee500] bg-[#fee500] text-neutral-950 hover:bg-[#f4dc00]",
    },
    {
        id: "google",
        label: "구글",
        icon: "fa-brands fa-google",
        className: "border-neutral-200 bg-white text-neutral-800 hover:border-indigo-300",
    },
];

export default function SocialAuthButtons({ mode }: { mode: "login" | "signup" }) {
    const apiReady = Boolean(ddbApiBase());

    const start = (provider: SocialProvider) => {
        if (!apiReady) return;
        startSocialLogin(provider, "/mypage");
    };

    return (
        <section className="surface mt-6 grid gap-3 p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-black text-neutral-950">
                    {mode === "signup" ? "간편가입" : "간편로그인"}
                </h2>
                {!apiReady && <span className="text-xs font-black text-amber-700">API 연결 필요</span>}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
                {PROVIDERS.map((provider) => (
                    <button
                        key={provider.id}
                        type="button"
                        disabled={!apiReady}
                        onClick={() => start(provider.id)}
                        className={[
                            "flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50",
                            provider.className,
                        ].join(" ")}
                    >
                        {provider.icon === "N" ? (
                            <span className="text-base font-black">N</span>
                        ) : (
                            <i className={`${provider.icon} text-sm`} />
                        )}
                        {provider.label}
                    </button>
                ))}
            </div>
        </section>
    );
}
