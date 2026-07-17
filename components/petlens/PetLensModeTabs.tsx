"use client";

export type PetLensMode = "photo" | "observation";

export default function PetLensModeTabs({ mode, onChange }: { mode: PetLensMode; onChange: (mode: PetLensMode) => void }) {
    return (
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-neutral-200 bg-neutral-100 p-1.5" data-petlens-mode-tabs>
            <button
                type="button"
                onClick={() => onChange("photo")}
                aria-pressed={mode === "photo"}
                className={`min-h-11 rounded-xl px-3 text-xs font-black transition ${
                    mode === "photo" ? "bg-white text-indigo-700 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                }`}
            >
                <i className="fa-solid fa-camera mr-2" aria-hidden="true" /> 사진·프로필 분석
            </button>
            <button
                type="button"
                onClick={() => onChange("observation")}
                aria-pressed={mode === "observation"}
                className={`min-h-11 rounded-xl px-3 text-xs font-black transition ${
                    mode === "observation" ? "bg-white text-indigo-700 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                }`}
                data-petlens-observation-tab
            >
                <i className="fa-solid fa-wave-square mr-2" aria-hidden="true" /> 짖음·행동 관찰
            </button>
        </div>
    );
}
