"use client";

/**
 * RegionModal — 국가/통화/언어 선택 모달 (지구본 버튼으로 열림)
 * ---------------------------------------------------------------------
 * - 국가를 바꾸면 통화·언어가 그 국가 기본값으로 자동 변경(currency 는 국가에 종속).
 * - 언어는 자동 변경 후에도 셀렉트로 수동 재선택 가능(ko/en).
 * - "저장하기" 를 눌러야 실제 반영(초안 상태 → 확정). 취소/닫기는 미반영.
 * - 지금은 한국/미국만. lib/i18n 의 REGIONS 에 항목만 추가하면 자동 확장.
 * 사이트 톤(글래스 카드 + 인디고 포인트)에 맞춘 디자인.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
    REGIONS,
    regionByCode,
    useI18n,
    type Locale,
    type RegionCode,
} from "@/lib/i18n";

/* 공통 셀렉트 — 라벨 위, 값은 가운데 정렬, 우측 chevron (둥근 흰 필드) */
function FieldSelect<T extends string>({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: T;
    onChange: (v: T) => void;
    options: Array<{ value: T; label: string }>;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-black text-neutral-500">{label}</span>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value as T)}
                    className="h-14 w-full appearance-none rounded-2xl border border-neutral-200 bg-white px-11 text-center text-[15px] font-bold text-neutral-900 shadow-sm transition focus:border-aurora-indigo focus:outline-none focus:ring-2 focus:ring-aurora-indigo/15"
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
                <i className="fa-solid fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-400" />
            </div>
        </label>
    );
}

export default function RegionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { region, setRegion, locale, setLocale, t } = useI18n();

    // 초안(draft) — 저장 전까지 실제 컨텍스트에 반영하지 않는다
    const [draftRegion, setDraftRegion] = useState<RegionCode>(region);
    const [draftLocale, setDraftLocale] = useState<Locale>(locale);

    // 열릴 때 현재값으로 초기화
    useEffect(() => {
        if (open) {
            setDraftRegion(region);
            setDraftLocale(locale);
        }
    }, [open, region, locale]);

    // ESC 로 닫기 + 열렸을 때 배경 스크롤 잠금
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    // portal 은 클라이언트 마운트 후에만 — SSR/hydration 안전
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!open || !mounted) return null;

    const draftCfg = regionByCode(draftRegion);

    // 국가 변경 → 통화(자동, draftCfg.currency)·언어(그 국가 기본값)로 초안 갱신. 언어는 이후 수동 변경 가능.
    const onRegionChange = (code: RegionCode) => {
        setDraftRegion(code);
        setDraftLocale(regionByCode(code).defaultLocale);
    };

    const save = () => {
        // 국가부터 반영(내부에서 통화+기본언어 동기화) → 사용자가 고른 언어로 덮어쓰기
        if (draftRegion !== region) setRegion(draftRegion);
        setLocale(draftLocale);
        onClose();
    };

    const isKo = locale === "ko";

    // body 로 포탈 — 헤더의 backdrop-blur containing block 을 벗어나 뷰포트 기준 고정
    return createPortal(
        // 뷰포트보다 모달이 커도 위가 안 잘리게 — 오버레이 자체를 세로 스크롤 가능하게
        <div className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain">
            {/* 백드롭(고정) */}
            <div
                className="fixed inset-0 bg-neutral-900/45 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* 세로 중앙 정렬하되, 넘치면 위아래 여백 안에서 스크롤 */}
            <div className="relative flex min-h-full items-center justify-center p-4">
                {/* 카드 */}
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={t("regionModalTitle")}
                    className="relative z-10 my-auto w-full max-w-[440px] overflow-hidden rounded-[28px] bg-white shadow-[0_40px_100px_-20px_rgba(15,23,42,0.4)] animate-in fade-in zoom-in-95 duration-200"
                >
                {/* 상단 그라데이션 헤더 */}
                <div className="relative bg-gradient-to-br from-aurora-blue via-aurora-indigo to-aurora-pink px-7 pb-8 pt-7 text-white">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t("close")}
                        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                    {/* 아이콘(우리 배지) 왼쪽 + 제목 오른쪽, 가로 정렬 */}
                    <div className="flex items-center gap-3">
                        <span className="relative inline-flex h-[60px] w-[60px] shrink-0 items-center justify-center">
                            <Image src="/images/ui/lang-globe.png" alt="" fill sizes="60px" className="object-contain" />
                        </span>
                        <h2 className="text-xl font-black leading-tight">{t("regionModalTitle")}</h2>
                    </div>
                </div>

                {/* 본문 */}
                <div className="grid gap-5 px-7 py-7">
                    {/* 국가/지역 */}
                    <div>
                        <FieldSelect<RegionCode>
                            label={t("regionField")}
                            value={draftRegion}
                            onChange={onRegionChange}
                            options={REGIONS.map((r) => ({
                                value: r.code,
                                label: `${r.code}  ${isKo ? r.labelKo : r.labelEn}`,
                            }))}
                        />
                        <p className="mt-2 text-xs font-medium leading-5 text-neutral-400">
                            {t("regionChangeWarning")}
                        </p>
                    </div>

                    {/* 통화 — 국가에 종속(비활성, 자동 결정) */}
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-black text-neutral-500">{t("currencyField")}</span>
                        <div className="relative flex h-14 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 px-11 text-[15px] font-bold text-neutral-700">
                            <span>{isKo ? draftCfg.currencyLabelKo : draftCfg.currencyLabelEn}</span>
                            <i className="fa-solid fa-lock absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-300" />
                        </div>
                    </label>

                    {/* 언어 — 자동 설정 후 수동 변경 가능 */}
                    <FieldSelect<Locale>
                        label={t("languageField")}
                        value={draftLocale}
                        onChange={setDraftLocale}
                        options={[
                            { value: "ko", label: "한국어" },
                            { value: "en", label: "English" },
                        ]}
                    />

                    {/* 저장 */}
                    <button
                        type="button"
                        onClick={save}
                        className="mt-1 h-14 rounded-2xl bg-gradient-to-r from-aurora-blue to-aurora-indigo text-[15px] font-black text-white shadow-[0_14px_30px_-12px_rgba(67,56,202,0.7)] transition hover:opacity-95"
                    >
                        {t("save")}
                    </button>
                </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
