"use client";

/**
 * SimplePayButtons — 네이버페이·카카오페이 간편결제 버튼 (장바구니·옵션시트 공용).
 * ---------------------------------------------------------------------
 * PG 연동 전이라 클릭 시 "준비 중" 안내만 띄운다.
 * 연동 시 pay() 안을 각 PG 결제창(SDK) 호출로 교체하면 된다.
 * disabled — 옵션 미선택 등으로 결제 불가일 때 함께 비활성(시트에서 사용).
 */

export default function SimplePayButtons({ disabled = false }: { disabled?: boolean }) {
    const pay = (provider: "naver" | "kakao") => {
        const label = provider === "naver" ? "네이버페이" : "카카오페이";
        window.alert(`${label} 간편결제는 준비 중입니다. 곧 제공될 예정이에요!`);
    };

    return (
        <div className="mt-2 grid grid-cols-2 gap-2">
            {/* 네이버페이 — 네이버 그린 + 검정 원형 N 배지 */}
            <button
                type="button"
                onClick={() => pay("naver")}
                disabled={disabled}
                className="flex h-12 items-center justify-center gap-1.5 rounded-md bg-[#03C75A] text-sm font-black text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black text-[10px] font-black leading-none text-white">N</span>
                pay 결제
            </button>
            {/* 카카오페이 — 카카오 옐로 + 말풍선 */}
            <button
                type="button"
                onClick={() => pay("kakao")}
                disabled={disabled}
                className="flex h-12 items-center justify-center gap-1.5 rounded-md bg-[#FFEB00] text-sm font-black text-[#3A1D1D] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <i className="fa-solid fa-comment text-[15px]" />
                pay 결제
            </button>
        </div>
    );
}
