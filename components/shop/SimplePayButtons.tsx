"use client";

/**
 * 구매 옵션/장바구니에서 선호 결제수단을 주문서로 전달하는 빠른 선택 버튼.
 * 실제 승인은 아직 주문서 이후 PG 계약/SDK가 담당하므로 여기서는 결제를
 * 완료했다고 표시하지 않는다.
 * 2026-10-28 결제 모드(테스트 · 실결제)는 주문서에서 서버가 알려 주므로 여기서는 테스트 전용 배지 · 문구를 빼고
 * 두 모드 모두 맞는 안내만 둔다.
 * 2026-11-11 사용자 A안: 네 버튼 모두 같은 둥근 알약. 토스 파랑 · 네이버 초록 · 카카오 노랑은 브랜드 색 그대로,
 *   휴대폰 결제는 흰 알약 + 연보라 동그라미 휴대폰 표시(예전 네모 테두리 칸이 촌스럽다는 의견).
 *   data-quick-pay 표시 — 웹 구매 창의 "분홍 알약" 규칙(product-detail-web.css)이 이 버튼을 덮지 않게 빼는 데 씀.
 *   누르면 하는 일(onSelect → 주문서로 결제수단 넘김) · 카카오페이 비활성은 그대로.
 */

import { useI18n } from "@/lib/i18n";
import type { QuickPaymentMethod } from "@/lib/payment-methods";

export type { QuickPaymentMethod } from "@/lib/payment-methods";

type Props = {
    disabled?: boolean;
    onSelect: (method: QuickPaymentMethod) => void;
};

// 네 버튼 공통 — 같은 높이 · 둥근 알약 · 가운데 정렬
const PILL = "flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40";

export default function SimplePayButtons({ disabled = false, onSelect }: Props) {
    const { locale } = useI18n();

    return (
        <div className="mt-2" data-quick-pay-group>
            <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-black text-neutral-500">
                    {locale === "en" ? "Quick payment selection" : "빠른 결제수단 선택"}
                </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {/* 토스페이 — 토스 파랑 + 흰 글자 */}
                <button
                    type="button"
                    onClick={() => onSelect("toss_pay")}
                    disabled={disabled}
                    aria-label={locale === "en" ? "Continue with Toss Pay" : "토스페이로 주문서 이동"}
                    data-quick-pay="toss_pay"
                    className={`${PILL} bg-[#0064FF] text-white hover:brightness-95`}
                >
                    <span aria-hidden="true" className="text-base font-black tracking-[-0.06em]">toss</span>
                    <span className="whitespace-nowrap">pay</span>
                </button>
                {/* 휴대폰 결제 — 흰 알약 + 연보라 동그라미 휴대폰 표시(다른 셋과 같은 모양) */}
                <button
                    type="button"
                    onClick={() => onSelect("phone")}
                    disabled={disabled}
                    aria-label={locale === "en" ? "Continue with mobile payment" : "휴대폰 결제로 주문서 이동"}
                    data-quick-pay="phone"
                    className={`${PILL} bg-white text-slate-700 shadow-[0_0_0_1.5px_#e7dccb] hover:shadow-[0_0_0_1.5px_#cfc2f2]`}
                >
                    <span aria-hidden="true" className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[#f3f0fe] text-[#6b51c9]">
                        <svg viewBox="0 0 12 16" className="h-[14px] w-3">
                            <rect x="1" y="0.8" width="10" height="14.4" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                            <rect x="4.2" y="12" width="3.6" height="1.4" rx="0.7" fill="currentColor" />
                        </svg>
                    </span>
                    <span className="break-keep text-center leading-tight">{locale === "en" ? "Mobile" : "휴대폰 결제"}</span>
                </button>
                {/* 네이버페이 — 네이버 초록 + 흰 원형 N 표시 */}
                <button
                    type="button"
                    onClick={() => onSelect("naver_pay")}
                    disabled={disabled}
                    aria-label={locale === "en" ? "Continue with Naver Pay" : "네이버페이로 주문서 이동"}
                    data-quick-pay="naver_pay"
                    className={`${PILL} bg-[#03C75A] text-white hover:brightness-95`}
                >
                    <span aria-hidden="true" className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-[10px] font-black leading-none text-[#03C75A]">N</span>
                    <span className="whitespace-nowrap">{locale === "en" ? "Pay" : "네이버페이"}</span>
                </button>
                {/* 카카오페이 — 카카오 노랑, 심사 전이라 흐리게 · 누를 수 없음 */}
                <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    aria-label={locale === "en" ? "Kakao Pay activates after merchant review" : "카카오페이 심사 후 활성화"}
                    data-quick-pay="kakao_pay"
                    className={`${PILL} flex-col !gap-0 bg-[#FFEB00] text-[#191919] opacity-50`}
                >
                    <span className="whitespace-nowrap text-sm font-black leading-tight">{locale === "en" ? "Kakao Pay" : "카카오페이"}</span>
                    <span className="break-keep text-[9.5px] font-black leading-tight">{locale === "en" ? "After review" : "심사 후 열려요"}</span>
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
