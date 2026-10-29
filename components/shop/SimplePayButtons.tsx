"use client";

/**
 * 구매 옵션/장바구니에서 선호 결제수단을 주문서로 전달하는 빠른 선택 버튼.
 * 실제 승인은 아직 주문서 이후 PG 계약/SDK가 담당하므로 여기서는 결제를
 * 완료했다고 표시하지 않는다.
 * 2026-10-28 결제 모드(테스트 · 실결제)는 주문서에서 서버가 알려 주므로 여기서는 테스트 전용 배지 · 문구를 빼고
 * 두 모드 모두 맞는 안내만 둔다.
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
                    disabled
                    aria-disabled="true"
                    aria-label={locale === "en" ? "Kakao Pay activates after merchant review" : "카카오페이 심사 후 활성화"}
                    className="flex h-12 min-w-0 cursor-not-allowed items-center justify-center gap-1.5 rounded-md bg-[#FFEB00] px-2 text-[#3A1D1D] opacity-50"
                >
                    <i className="fa-solid fa-comment text-[15px]" />
                    <span className="flex min-w-0 flex-col text-left leading-tight">
                        <span className="whitespace-nowrap text-sm font-black">{locale === "en" ? "Kakao Pay" : "카카오페이"}</span>
                        <span className="break-keep text-[9px] font-black">{locale === "en" ? "After review" : "심사 후 활성화"}</span>
                    </span>
                </button>
            </div>
            <p className="mt-2 text-[10px] font-bold leading-4 text-neutral-400">
                {locale === "en"
                    ? "Your selection is carried to checkout, where payment continues in the Toss Payments secure window."
                    : "선택한 수단은 주문서로 이어지며, 결제는 주문서에서 토스페이먼츠 보안 결제창으로 진행됩니다."}
            </p>
        </div>
    );
}
