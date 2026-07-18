"use client";

/**
 * LanguageSwitcher — 지구본 배지 → 국가/언어 선택 모달 트리거
 * ---------------------------------------------------------------------
 * 트리거: lang-globe.png 배지(투명 배경 그대로). 클릭 시 RegionModal 열림.
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
            {/* 지구본 배지 트리거 */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={t("language")}
                className={`group relative inline-flex shrink-0 items-center justify-center transition hover:-translate-y-px ${
                    compact ? "h-11 w-11" : "h-[50px] w-[50px]"
                }`}
            >
                <Image
                    src="/images/ui/lang-globe.png"
                    alt=""
                    fill
                    sizes="50px"
                    className="object-contain transition-transform duration-500 group-hover:scale-105"
                    priority
                />
            </button>

            <RegionModal open={open} onClose={() => setOpen(false)} />
        </>
    );
}
