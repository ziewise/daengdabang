/**
 * PetlensModeSelect — Step 1: 입력 방식 선택
 * ---------------------------------------------------------------------
 * "촬영하기" / "불러오기" 두 카드. 선택 시 부모 onSelect.
 */
"use client";

import type { PetlensInputMode } from "@/lib/types";

export default function PetlensModeSelect({
    onSelect,
}: {
    onSelect: (mode: PetlensInputMode) => void;
}) {
    return (
        <div className="text-center">
            <h3 className="text-lg font-extrabold mb-1.5">
                어떻게 사진을 가져올까요?
            </h3>
            <p className="text-xs text-neutral-500 mb-6">
                3장 모두 같은 방식으로 입력해요
            </p>
            <div className="grid grid-cols-2 gap-3">
                <ModeCard
                    icon="fa-camera"
                    label="촬영하기"
                    desc="카메라로 바로 찍기"
                    onClick={() => onSelect("camera")}
                />
                <ModeCard
                    icon="fa-image"
                    label="불러오기"
                    desc="기존 사진 선택"
                    onClick={() => onSelect("file")}
                />
            </div>
        </div>
    );
}

function ModeCard({
    icon, label, desc, onClick,
}: { icon: string; label: string; desc: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-neutral-200 bg-white hover:border-aurora-indigo hover:shadow-card transition-all"
        >
            <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-aurora-blue to-aurora-indigo text-white flex items-center justify-center text-xl">
                <i className={`fa-solid ${icon}`} />
            </span>
            <strong className="text-sm font-extrabold">{label}</strong>
            <span className="text-[11px] text-neutral-500">{desc}</span>
        </button>
    );
}
