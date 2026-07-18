"use client";

/**
 * RegionModal — 국가 및 언어 선택 모달 (지구본 배지 클릭 시 열림)
 * ---------------------------------------------------------------------
 * 구성:
 *   - 국가/지역: 드롭다운(대한민국 / 미국 …) → 선택 시 통화·언어 자동 적용
 *   - 통화: 국가에 따라 자동(원/달러) — 표시 전용(수동 변경 없음)
 *   - 언어: 드롭다운(한국어 / ENGLISH) — 자동 적용 후 수동 변경 가능
 * 국가·언어는 향후 항목이 늘어날 수 있어 "드롭다운(스크롤)"으로 구성한다.
 * header 의 backdrop-blur 가 position:fixed 기준을 헤더로 가두므로 body 로 portal.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useI18n, type Locale } from "@/lib/i18n";
import { useRegion, COUNTRIES, type Country } from "@/lib/region";

/* ============ 재사용 드롭다운(선택 리스트) ============ */
function Dropdown<T extends string>({
    value,
    options,
    onChange,
    ariaLabel,
}: {
    value: T;
    options: Array<{ value: T; label: string }>;
    onChange: (v: T) => void;
    ariaLabel: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // 바깥 클릭으로 닫기
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    const current = options.find((o) => o.value === value);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
                className="relative flex w-full items-center justify-center rounded-2xl border-2 border-neutral-200 bg-white px-8 py-3 text-sm font-black text-neutral-800 transition hover:border-aurora-indigo/40"
            >
                <span>{current?.label}</span>
                <i className={`fa-solid fa-chevron-down absolute right-4 text-xs text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <ul
                    role="listbox"
                    className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-56 overflow-y-auto rounded-2xl border border-neutral-100 bg-white p-1.5 shadow-[0_20px_50px_-16px_rgba(15,23,42,0.4)] ring-1 ring-neutral-950/5 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                    {options.map((o) => {
                        const sel = o.value === value;
                        return (
                            <li key={o.value} role="option" aria-selected={sel}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(o.value);
                                        setOpen(false);
                                    }}
                                    className={`relative flex w-full items-center justify-center rounded-xl px-8 py-2.5 text-sm font-black transition ${
                                        sel
                                            ? "bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white"
                                            : "text-neutral-700 hover:bg-neutral-100"
                                    }`}
                                >
                                    <span>{o.label}</span>
                                    {sel && <i className="fa-solid fa-check absolute right-3 text-xs" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export default function RegionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { locale, setLocale } = useI18n();
    const { country, setCountry } = useRegion();
    const en = locale === "en";

    // 열려 있는 동안 배경 스크롤 잠금 + ESC 로 닫기
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open || typeof document === "undefined") return null;

    // 현재 국가의 통화 표기(자동)
    const currentCountry = COUNTRIES.find((c) => c.code === country)!;
    // 국가 표기는 고정(자국명) — 영어 상태에서도 대한민국은 "대한민국"
    const countryOptions = COUNTRIES.map((c) => ({ value: c.code, label: c.label }));
    const langOptions: Array<{ value: Locale; label: string }> = [
        { value: "ko", label: "한국어" },
        { value: "en", label: "ENGLISH" },
    ];

    return createPortal(
        <div
            className="fixed inset-0 z-[1300] flex items-center justify-center bg-neutral-950/55 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={en ? "Country & language" : "국가 및 언어 선택"}
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 — 지구본 아이콘 + 제목 + 닫기 */}
                <div className="flex items-center gap-3 border-b border-neutral-100 px-6 py-5">
                    <span className="relative h-10 w-10 shrink-0">
                        <Image src="/images/ui/lang-globe.png" alt="" fill sizes="40px" className="object-contain" />
                    </span>
                    <h2 className="flex-1 text-lg font-black text-neutral-950">
                        {en ? "Country & Language" : "국가 및 언어 선택"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={en ? "Close" : "닫기"}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="space-y-4 px-6 py-5">
                    {/* 국가/지역 — 드롭다운(선택 시 통화·언어 자동 적용) */}
                    <section>
                        <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-neutral-400">
                            {en ? "Country / Region" : "국가 / 지역"}
                        </p>
                        <Dropdown
                            value={country}
                            options={countryOptions}
                            onChange={(v) => setCountry(v as Country)}
                            ariaLabel={en ? "Select country" : "국가 선택"}
                        />
                    </section>

                    {/* 통화 — 국가에 따라 자동(표시 전용) */}
                    <section>
                        <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-neutral-400">
                            {en ? "Currency (auto)" : "통화 (자동)"}
                        </p>
                        <div className="flex items-center justify-center gap-2 rounded-2xl bg-neutral-50 px-4 py-3 text-sm font-black text-neutral-800">
                            <i className="fa-solid fa-coins text-neutral-400" />
                            {en ? currentCountry.currencyEn : currentCountry.currencyKo}
                        </div>
                    </section>

                    {/* 언어 — 드롭다운(자동 적용 후 수동 변경 가능) */}
                    <section>
                        <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-neutral-400">
                            {en ? "Language" : "언어"}
                        </p>
                        <Dropdown
                            value={locale}
                            options={langOptions}
                            onChange={(v) => setLocale(v as Locale)}
                            ariaLabel={en ? "Select language" : "언어 선택"}
                        />
                    </section>
                </div>
            </div>
        </div>,
        document.body,
    );
}
