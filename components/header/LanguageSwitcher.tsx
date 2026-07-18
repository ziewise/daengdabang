"use client";

import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";

const OPTIONS: Array<{ locale: Locale; labelKey: "korean" | "english"; short: string }> = [
    { locale: "ko", labelKey: "korean", short: "KR" },
    { locale: "en", labelKey: "english", short: "EN" },
];

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
    const { locale, setLocale, t } = useI18n();

    return (
        <div
            className={`inline-flex shrink-0 items-center rounded-full border border-white/70 bg-white/75 p-1 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.7)] backdrop-blur-xl ring-1 ring-neutral-950/5 ${
                compact ? "h-9" : "h-10"
            }`}
            aria-label={t("language")}
            role="group"
        >
            <span
                className={`items-center gap-1.5 pl-2 pr-1 text-[11px] font-black text-neutral-500 ${
                    compact ? "sr-only" : "hidden xl:inline-flex"
                }`}
                aria-hidden="true"
            >
                <i className="fa-solid fa-globe text-[10px] text-aurora-indigo" />
                <span>{t("language")}</span>
            </span>
            {OPTIONS.map((option) => {
                const active = option.locale === locale;
                return (
                    <button
                        key={option.locale}
                        type="button"
                        onClick={() => setLocale(option.locale)}
                        aria-pressed={active}
                        aria-label={t(option.labelKey)}
                        title={t(option.labelKey)}
                        className={`inline-flex h-full items-center justify-center rounded-full text-xs font-black transition ${
                            active
                                ? "bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white shadow-[0_6px_16px_-10px_rgba(67,56,202,0.8)]"
                                : "text-neutral-500 hover:bg-white hover:text-neutral-950"
                        } ${
                            compact
                                ? "min-w-9 px-2"
                                : "min-w-9 px-2.5"
                        }`}
                    >
                        <span className={compact ? "text-[11px]" : "text-xs"}>{option.short}</span>
                    </button>
                );
            })}
        </div>
    );
}
