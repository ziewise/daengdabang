"use client";

import { useEffect, useMemo, useState } from "react";
import { ddbApiBase, loadSocialProviders, startSocialLogin, type SocialProvider } from "@/lib/customer-api";

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

export default function SocialAuthButtons({
    mode,
    variant = "full",
}: {
    mode: "login" | "signup";
    /** full = 라벨 있는 직사각(기본) / compact = 로그인 카드용 원형 아이콘 */
    variant?: "full" | "compact";
}) {
    const apiReady = Boolean(ddbApiBase());
    const [enabledByProvider, setEnabledByProvider] = useState<Record<SocialProvider, boolean> | null>(null);
    const [statusChecked, setStatusChecked] = useState(false);

    useEffect(() => {
        let alive = true;
        if (!apiReady) {
            setEnabledByProvider(null);
            setStatusChecked(false);
            return;
        }
        setStatusChecked(false);
        loadSocialProviders()
            .then((rows) => {
                if (!alive) return;
                if (!rows) {
                    setEnabledByProvider(null);
                    return;
                }
                setEnabledByProvider(
                    rows.reduce(
                        (acc, row) => ({ ...acc, [row.id]: Boolean(row.enabled) }),
                        {} as Record<SocialProvider, boolean>
                    )
                );
            })
            .catch(() => {
                if (alive) setEnabledByProvider(null);
            })
            .finally(() => {
                if (alive) setStatusChecked(true);
            });
        return () => {
            alive = false;
        };
    }, [apiReady]);

    const disabledCount = useMemo(() => {
        if (!apiReady || !enabledByProvider) return 0;
        return PROVIDERS.filter((provider) => enabledByProvider[provider.id] === false).length;
    }, [apiReady, enabledByProvider]);

    const start = (provider: SocialProvider) => {
        if (!apiReady || enabledByProvider?.[provider] === false) return;
        startSocialLogin(provider, "/mypage");
    };

    // compact — 로그인 카드용 원형 아이콘(라벨 없음, 비활성은 흐리게)
    if (variant === "compact") {
        return (
            <div className="flex items-center justify-center gap-3">
                {PROVIDERS.map((provider) => {
                    const disabled = !apiReady || enabledByProvider?.[provider.id] === false;
                    return (
                        <button
                            key={provider.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => start(provider.id)}
                            aria-label={`${provider.label} ${mode === "signup" ? "간편가입" : "간편로그인"}`}
                            title={provider.label}
                            className={[
                                "flex h-11 w-11 items-center justify-center rounded-full border text-base font-black shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50",
                                provider.className,
                            ].join(" ")}
                        >
                            {provider.icon === "N" ? <span>N</span> : <i className={provider.icon} />}
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <section className="surface mt-6 grid gap-3 p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-black text-neutral-950">
                    {mode === "signup" ? "간편가입" : "간편로그인"}
                </h2>
                {!apiReady && <span className="text-xs font-black text-amber-700">서비스 준비 중</span>}
                {apiReady && !statusChecked && <span className="text-xs font-black text-neutral-500">확인 중</span>}
                {apiReady && statusChecked && disabledCount > 0 && (
                    <span className="text-xs font-black text-amber-700">준비 중</span>
                )}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
                {PROVIDERS.map((provider) => {
                    const disabled = !apiReady || enabledByProvider?.[provider.id] === false;
                    return (
                        <button
                            key={provider.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => start(provider.id)}
                            aria-label={`${provider.label} ${mode === "signup" ? "간편가입" : "간편로그인"}`}
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
                    );
                })}
            </div>
        </section>
    );
}
