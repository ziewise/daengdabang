"use client";

/**
 * LanguageSwitcher — 한/영 배지(2026-10-18 지구본에서 바꿈) · 누르면 언어가 바로 바뀜
 * ---------------------------------------------------------------------
 * 2026-11-11 사용자: 국가/언어 선택 창(RegionModal) 없이 누를 때마다 한국어 ↔ English 바로 전환(toggleLocale — 기존 기능).
 *   가격은 언어와 상관없이 원화(₩) 그대로(사용자 "원화 그대로" — 결제도 원화). 처음 접속 언어는 i18n 이 접속 국가로 자동(한국 = 한국어, 해외 = 영어).
 *   RegionModal 파일은 지우지 않고 남겨 둠(지금은 열지 않음).
 * 트리거: 최적화한 lang-globe WebP 배지. compact = 모바일 패널용(조금 크게).
 */
import Image from "next/image";
import { useI18n } from "@/lib/i18n";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
    const { locale, toggleLocale } = useI18n();
    // 누르면 바뀔 언어 — 읽어 주는 이름 · 말풍선에 씀
    const nextLabel = locale === "en" ? "한국어로 보기" : "View in English";

    return (
        <button
            type="button"
            onClick={toggleLocale}
            aria-label={nextLabel}
            // 헤더(compact 아님)에서만 마우스를 올리면 아이콘 아래 이름 말풍선(globals.css .ddb-header-tip)
            data-header-tip={compact ? undefined : locale === "en" ? "한국어" : "English"}
            data-lang-toggle={locale}
            className={`${compact ? "" : "ddb-header-tip "}group relative inline-flex shrink-0 items-center justify-center transition hover:-translate-y-px ${
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
    );
}
