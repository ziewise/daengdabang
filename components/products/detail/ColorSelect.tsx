"use client";

/**
 * ColorSelect — 색상 변형 칩 선택 박스 (제품 상세 공용).
 * --------------------------------------------------------------------
 * 칩 클릭 시 onColorChange(idx) → 좌측 메인 이미지 교체는 부모(ProductDetailClient)가 처리.
 * 같은 컴포넌트를 PC(우측 구매정보, hidden lg:block)와 모바일(이미지 바로 아래, lg:hidden)에
 * 각각 배치해, 모바일에서 이미지와 색상 선택이 한 화면에 보이게 한다(위아래로 오갈 필요 없음).
 */

import Image from "next/image";
import type { ProductColor } from "@/lib/catalog";

interface Props {
    colors: ProductColor[];
    /** 선택 색상 인덱스(null=미선택) */
    colorIdx: number | null;
    onColorChange?: (idx: number) => void;
    className?: string;
}

export default function ColorSelect({ colors, colorIdx, onColorChange, className = "" }: Props) {
    if (colors.length === 0) return null;
    return (
        <div className={`rounded-lg border border-neutral-200 bg-neutral-50 p-4 ${className}`}>
            <div className="flex flex-wrap gap-2">
                {colors.map((c, i) => (
                    <button
                        key={c.image}
                        type="button"
                        onClick={() => onColorChange?.(i)}
                        aria-label={c.name}
                        aria-current={i === colorIdx}
                        title={c.name}
                        className={`relative h-9 w-9 overflow-hidden rounded-full transition ${
                            i === colorIdx
                                ? "ring-2 ring-indigo-600 ring-offset-2"
                                : "ring-1 ring-neutral-300 hover:ring-indigo-300"
                        }`}
                    >
                        <Image src={c.chip} alt={c.name} fill sizes="36px" className="object-cover" />
                    </button>
                ))}
            </div>
        </div>
    );
}
