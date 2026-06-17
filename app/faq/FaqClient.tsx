/**
 * app/faq/FaqClient.tsx — 자주 묻는 질문 아코디언 (client)
 * ---------------------------------------------------------------------
 * 카테고리별 Q&A 를 아코디언으로 펼침/접기. 한 번에 하나만 열림.
 */
"use client";

import { useState } from "react";

interface Faq {
    category: string;
    q: string;
    a: string;
}

const FAQS: Faq[] = [
    { category: "주문/결제", q: "주문은 어떻게 하나요?", a: "원하는 상품을 장바구니에 담은 뒤 장바구니에서 결제를 진행하시면 됩니다. 비회원도 주문 가능하지만, 회원으로 주문하시면 주문 내역과 배송 조회를 마이페이지에서 편하게 확인하실 수 있습니다." },
    { category: "주문/결제", q: "주문 취소는 어디서 하나요?", a: "마이페이지 > 주문 내역에서 배송 준비 전 상태의 주문을 취소하실 수 있습니다. 이미 배송이 시작된 경우 1:1 문의로 연락 주시면 도와드리겠습니다." },
    { category: "배송", q: "배송은 얼마나 걸리나요?", a: "결제 완료 후 영업일 기준 1~3일 이내 출고됩니다. 폭염·장마 등 기상 상황이나 도서산간 지역은 추가 시간이 소요될 수 있습니다." },
    { category: "배송", q: "배송 조회는 어디서 하나요?", a: "마이페이지 > 주문 내역에서 각 주문의 배송 상태를 확인하실 수 있습니다." },
    { category: "교환/반품", q: "교환·반품은 어떻게 신청하나요?", a: "상품 수령 후 7일 이내에 1:1 문의로 신청해 주세요. 교환·반품 안내 페이지에서 자세한 기준을 확인하실 수 있습니다." },
    { category: "회원", q: "간편 로그인은 어떤 걸 지원하나요?", a: "네이버·카카오·구글 간편 로그인을 지원합니다. 로그인 페이지에서 원하는 방법을 선택하세요." },
    { category: "펫렌즈/AI", q: "펫렌즈 AI 분석은 무엇인가요?", a: "우리 아이의 사진과 생활 정보를 입력하면, 등록된 상품 중 어울리는 후보를 골라주는 보조 기능입니다. 수의학적 진단이 아니므로 건강 이상이 의심되면 전문가 상담을 받아주세요." },
];

export default function FaqClient() {
    const [open, setOpen] = useState<number | null>(0);

    return (
        <div className="mt-8 grid gap-2.5">
            {FAQS.map((f, i) => {
                const isOpen = open === i;
                return (
                    <div
                        key={f.q}
                        className="rounded-2xl bg-white/70 backdrop-blur border border-white/60 shadow-card overflow-hidden"
                    >
                        <button
                            type="button"
                            onClick={() => setOpen(isOpen ? null : i)}
                            aria-expanded={isOpen}
                            className="w-full flex items-center gap-3 px-5 md:px-6 py-4 text-left hover:bg-aurora-indigo/[0.03] transition"
                        >
                            <span className="px-2 py-0.5 rounded-full bg-aurora-indigo/10 text-aurora-indigo text-[10px] font-extrabold shrink-0">
                                {f.category}
                            </span>
                            <span className="flex-1 text-sm md:text-base font-black text-foreground">
                                {f.q}
                            </span>
                            <i className={`fa-solid fa-chevron-down text-xs text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isOpen && (
                            <div className="px-5 md:px-6 pb-5 pt-0">
                                <p className="text-sm font-bold leading-7 text-neutral-600 border-t border-neutral-100 pt-4">
                                    {f.a}
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
