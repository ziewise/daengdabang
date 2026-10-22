"use client";

import Image from "next/image";
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
                {/* 웹 연구소 페이지에서만 보이는 그림 · 짧은 설명(app/lab-web.css) — 펫렌즈 창 · 앱에서는 숨김 */}
                <Image src="/images/ui/lab-tab-photo-160.webp" alt="" width={52} height={52} className="lab-tab-art hidden" aria-hidden="true" />
                <span className="lab-tab-text">
                    <i className="fa-solid fa-camera mr-1.5" aria-hidden="true" />
                    {en ? "Photo & profile" : "사진·프로필 분석"}
                    <small className="lab-tab-help hidden">{en ? "Four-angle photos" : "네 방향 사진 · 외형 · 체형 · 털"}</small>
                </span>
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
                <Image src="/images/ui/lab-tab-observation-160.webp" alt="" width={52} height={52} className="lab-tab-art hidden" aria-hidden="true" />
                <span className="lab-tab-text inline-flex min-w-0 items-start justify-center gap-1">
                    <i className="fa-solid fa-wave-square mt-0.5 shrink-0" aria-hidden="true" />
                    <DaengLabServiceTitle
                        en={en}
                        compact
                        suffix={en ? "Behavior & Sound" : "행동·소리"}
                        suffixClassName="break-keep text-[11px] font-black leading-[1.15] sm:text-xs"
                        className="justify-center"
                    />
                    <small className="lab-tab-help hidden">{en ? "Camera + microphone" : "카메라 · 마이크 · 행동 · 소리"}</small>
                </span>
            </button>
        </div>
    );
}
