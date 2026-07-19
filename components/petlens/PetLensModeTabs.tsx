"use client";

import DaengLabServiceTitle from "@/components/petlens/DaengLabServiceTitle";
import { useI18n } from "@/lib/i18n";

export type PetLensMode = "photo" | "observation";

export default function PetLensModeTabs({ mode, onChange }: { mode: PetLensMode; onChange: (mode: PetLensMode) => void }) {
    const { locale } = useI18n();
    const en = locale === "en";

    return (
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-neutral-200 bg-neutral-100 p-1.5" data-petlens-mode-tabs>
            <button
                type="button"
                onClick={() => onChange("photo")}
                aria-pressed={mode === "photo"}
                className={`min-h-14 rounded-xl px-2 py-2 text-xs font-black transition ${
                    mode === "photo" ? "bg-white text-indigo-700 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                }`}
            >
                <i className="fa-solid fa-camera mr-1.5" aria-hidden="true" />
                {en ? "Photo & profile" : "사진·프로필 분석"}
            </button>
            <button
                type="button"
                onClick={() => onChange("observation")}
                aria-pressed={mode === "observation"}
                className={`min-h-14 rounded-xl px-2 py-2 text-xs font-black transition ${
                    mode === "observation" ? "bg-white text-indigo-700 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                }`}
                data-petlens-observation-tab
            >
                <span className="inline-flex min-w-0 items-start justify-center gap-1">
                    <i className="fa-solid fa-wave-square mt-0.5 shrink-0" aria-hidden="true" />
                    <DaengLabServiceTitle
                        en={en}
                        compact
                        suffix={en ? "Behavior & Sound" : "행동·소리"}
                        suffixClassName="break-keep text-[11px] font-black leading-[1.15] sm:text-xs"
                        className="justify-center"
                    />
                </span>
            </button>
        </div>
    );
}
