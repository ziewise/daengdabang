"use client";

/**
 * 구매 옵션/장바구니에서 선호 결제수단을 주문서로 전달하는 빠른 선택 버튼.
 * 실제 승인은 아직 주문서 이후 PG 계약/SDK가 담당하므로 여기서는 결제를
 * 완료했다고 표시하지 않는다.
 */

import { useI18n } from "@/lib/i18n";
import type { QuickPaymentMethod } from "@/lib/payment-methods";

export type { QuickPaymentMethod } from "@/lib/payment-methods";

type Props = {
    disabled?: boolean;
    onSelect: (method: QuickPaymentMethod) => void;
};

export default function SimplePayButtons({ disabled = false, onSelect }: Props) {
    const { locale } = useI18n();

    return (
        <div className="mt-2">
            <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-black text-neutral-500">
                    {locale === "en" ? "Quick payment selection" : "빠른 결제수단 선택"}
                </p>
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700">
                    {locale === "en" ? "Setup in progress" : "연동 준비 중"}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => onSelect("toss_pay")}
                    disabled={disabled}
                    aria-label={locale === "en" ? "Continue with Toss Pay" : "토스페이로 주문서 이동"}
                    className="flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-md bg-[#0064FF] px-2 text-sm font-black text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <span aria-hidden="true" className="text-base font-black tracking-[-0.08em]">toss</span>
                    <span className="whitespace-nowrap">{locale === "en" ? "Pay" : "결제"}</span>
                </button>
                <button
                    type="button"
                    onClick={() => onSelect("phone")}
                    disabled={disabled}
                    aria-label={locale === "en" ? "Continue with mobile payment" : "휴대폰 결제로 주문서 이동"}
                    className="flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-md border-2 border-neutral-200 bg-white px-2 text-sm font-black text-neutral-800 transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <i className="fa-solid fa-mobile-screen-button shrink-0 text-[15px] text-indigo-600" />
                    <span className="break-keep text-center leading-tight">{locale === "en" ? "Mobile" : "휴대폰 결제"}</span>
                </button>
                {/* 네이버페이 — 네이버 그린 + 검정 원형 N 배지 */}
                <button
                    type="button"
                    onClick={() => onSelect("naver_pay")}
                    disabled={disabled}
                    aria-label={locale === "en" ? "Continue with Naver Pay" : "네이버페이로 주문서 이동"}
                    className="flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-md bg-[#03C75A] px-2 text-sm font-black text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black text-[10px] font-black leading-none text-white">N</span>
                    <span className="whitespace-nowrap">{locale === "en" ? "Pay" : "네이버페이"}</span>
                </button>
                {/* 카카오페이 — 카카오 옐로 + 말풍선 */}
                <button
                    type="button"
                    onClick={() => onSelect("kakao_pay")}
                    disabled={disabled}
                    aria-label={locale === "en" ? "Continue with Kakao Pay" : "카카오페이로 주문서 이동"}
                    className="flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-md bg-[#FFEB00] px-2 text-sm font-black text-[#3A1D1D] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <i className="fa-solid fa-comment text-[15px]" />
                    <span className="whitespace-nowrap">{locale === "en" ? "Pay" : "카카오페이"}</span>
                </button>
            </div>
            <p className="mt-2 text-[10px] font-bold leading-4 text-neutral-400">
                {locale === "en"
                    ? "Your selection is carried to checkout. Payment is completed only after provider approval."
                    : "선택한 수단은 주문서로 이어지며, 실제 결제는 결제사 승인 후 완료됩니다."}
            </p>
        </div>
    );
}
