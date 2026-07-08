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
            className={`inline-flex shrink-0 items-center rounded-full border border-neutral-200 bg-white/85 p-0.5 shadow-sm backdrop-blur ${
                compact ? "h-9" : "h-10"
            }`}
            aria-label={t("language")}
            role="group"
        >
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
                        className={`flex h-full min-w-9 items-center justify-center gap-1 rounded-full px-2 text-xs font-black transition ${
                            active
                                ? "bg-neutral-950 text-white"
                                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                        }`}
                    >
                        <FlagIcon locale={option.locale} />
                        <span className={compact ? "sr-only" : ""}>{option.short}</span>
                    </button>
                );
            })}
        </div>
    );
}

function FlagIcon({ locale }: { locale: Locale }) {
    if (locale === "ko") {
        return (
            <span aria-hidden="true" className="relative h-4 w-5 overflow-hidden rounded-[3px] bg-white ring-1 ring-neutral-200">
                <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full">
                    <span className="absolute inset-x-0 top-0 h-1/2 bg-rose-500" />
                    <span className="absolute inset-x-0 bottom-0 h-1/2 bg-blue-600" />
                </span>
                <span className="absolute left-0.5 top-0.5 h-0.5 w-1 bg-neutral-800 rotate-[-24deg]" />
                <span className="absolute right-0.5 bottom-0.5 h-0.5 w-1 bg-neutral-800 rotate-[-24deg]" />
            </span>
        );
    }

    return (
        <span
            aria-hidden="true"
            className="relative h-4 w-5 overflow-hidden rounded-[3px] bg-white ring-1 ring-neutral-200"
            style={{
                backgroundImage: "repeating-linear-gradient(to bottom, #ef4444 0 2px, #ffffff 2px 4px)",
            }}
        >
            <span className="absolute left-0 top-0 h-2.5 w-2.5 bg-blue-700" />
            <span className="absolute left-[3px] top-[2px] h-0.5 w-0.5 rounded-full bg-white shadow-[4px_0_0_white,0_3px_0_white,4px_3px_0_white]" />
        </span>
    );
}
