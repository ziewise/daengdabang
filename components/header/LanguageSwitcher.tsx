"use client";

/**
 * LanguageSwitcher — 지역/언어 설정 진입 버튼 (지구본 알약형)
 * ---------------------------------------------------------------------
 * 클릭하면 RegionModal(국가·통화·언어) 이 열린다.
 * 표시: 지구본 아이콘 + 현재 국기 + 현재 언어 코드(KR/EN).
 * 사이트 톤(글래스 + 인디고)에 맞춘 슬림한 알약.
 * compact = 모바일 패널용(라벨 축약).
 */

import { useState } from "react";
import Image from "next/image";
import { regionByCode, useI18n } from "@/lib/i18n";
import RegionModal from "./RegionModal";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
    const { region, t } = useI18n();
    const [open, setOpen] = useState(false);
    const cfg = regionByCode(region);

    return (
        <>
            {/* 지구본+발바닥 배지 이미지 (디자이너 제작 PNG, 투명 배경 그대로). 클릭 시 모달 */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={t("settings")}
                aria-haspopup="dialog"
                title={cfg.code}
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
