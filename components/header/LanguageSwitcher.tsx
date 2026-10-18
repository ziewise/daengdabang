"use client";

/**
 * LanguageSwitcher — 한/영 배지(2026-10-18 지구본에서 바꿈) → 국가/언어 선택 모달 트리거
 * ---------------------------------------------------------------------
 * 트리거: 최적화한 lang-globe WebP 배지. 클릭 시 RegionModal 열림.
 * 모달에서 국가/지역·통화(자동)·언어를 선택한다.
 * compact = 모바일 패널용(조금 크게).
 */
import { useState } from "react";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import RegionModal from "./RegionModal";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* 한/영 배지 트리거 */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={t("language")}
                className={`group relative inline-flex shrink-0 items-center justify-center transition hover:-translate-y-px ${
                    compact ? "h-11 w-11" : "h-8 w-8"
                }`}
            >
                {/* 한/영 아이콘(2026-10-18 사용자 그림) — 검색 · 장바구니 · 마이페이지와 같은 네모 3D 아이콘이라 같은 32px */}
                <Image
                    src="/images/ui/header-lang-128.webp"
                    alt=""
                    fill
                    sizes="44px"
                    className="object-contain transition-transform duration-500 group-hover:scale-105"
                    priority
                />
            </button>

            <RegionModal open={open} onClose={() => setOpen(false)} />
        </>
    );
}
