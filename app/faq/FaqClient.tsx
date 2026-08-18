/**
 * app/faq/FaqClient.tsx — 자주 묻는 질문 아코디언 (client)
 * ---------------------------------------------------------------------
 * 카테고리별 Q&A 를 아코디언으로 펼침/접기. 한 번에 하나만 열림.
 */
"use client";

import { useState } from "react";
import Link from "next/link";

interface Faq {
    category: string;
    q: string;
    a: string;
    links?: Array<{ label: string; href: string; icon: string }>;
}

const FAQS: Faq[] = [
    { category: "주문/결제", q: "주문은 어떻게 하나요?", a: "원하는 상품을 장바구니에 담은 뒤 주문서에서 배송정보와 결제수단을 선택합니다. 현재 테스트 결제창은 로그인한 심사용 계정에서 열 수 있으며, 비회원은 주문서 화면만 미리 볼 수 있습니다." },
    { category: "주문/결제", q: "주문 취소는 어디서 하나요?", a: "마이페이지 > 주문 내역에서 배송 준비 전 상태의 주문을 취소하실 수 있습니다. 이미 배송이 시작된 경우 1:1 문의로 연락 주시면 도와드리겠습니다.", links: [{ label: "주문 내역 보기", href: "/mypage", icon: "fa-box" }, { label: "주문 취소 문의", href: "/inquiry?category=refund#inquiry-form", icon: "fa-envelope" }] },
    { category: "배송", q: "배송비와 배송기간은 어떻게 되나요?", a: "배송비는 3,000원이며 30,000원 이상 구매 시 기본 배송비가 무료입니다. 제주도는 3,000원, 그 외 도서지역은 5,000원이 추가됩니다. 한진택배 또는 CJ대한통운으로 1~2영업일 이내 출고하며, 결제일로부터 최대 7일 이내 배송 완료(도착)를 원칙으로 합니다." },
    { category: "배송", q: "배송 조회는 어디서 하나요?", a: "마이페이지 > 주문 내역에서 각 주문의 배송 상태를 확인하실 수 있습니다.", links: [{ label: "배송 조회하기", href: "/mypage", icon: "fa-truck" }, { label: "배송 문의 접수", href: "/inquiry?category=delivery#inquiry-form", icon: "fa-envelope" }] },
    { category: "교환/반품", q: "교환·반품은 어떻게 신청하나요?", a: "상품 수령 후 7일 이내에 먼저 판매자와 반품사유·택배사·배송비·반품지를 협의한 뒤 발송해 주세요. 단순 변심 반품비는 편도 3,000원(최초 무료배송 시 6,000원), 교환비는 6,000원입니다. 자세한 제한 사유는 교환·반품 안내에서 확인할 수 있습니다.", links: [{ label: "교환·반품 기준 보기", href: "/return", icon: "fa-rotate-left" }, { label: "교환·반품 접수", href: "/inquiry?category=exchange#inquiry-form", icon: "fa-envelope" }] },
    { category: "회원", q: "간편 로그인은 어떤 걸 지원하나요?", a: "네이버·카카오·구글 간편 로그인을 지원합니다. 로그인 페이지에서 원하는 방법을 선택하세요." },
    { category: "펫렌즈/맞춤 추천", q: "펫렌즈 사진 분석은 무엇인가요?", a: "우리 아이의 사진과 생활 정보를 입력하면, 등록된 상품 중 어울리는 후보를 골라주는 보조 기능입니다. 수의학적 진단이 아니므로 건강 이상이 의심되면 전문가 상담을 받아주세요." },
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
                                {f.links?.length ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {f.links.map((link) => (
                                            <Link
                                                key={`${f.q}-${link.href}`}
                                                href={link.href}
                                                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-aurora-indigo/20 bg-white px-3.5 py-2 text-sm font-extrabold text-aurora-indigo shadow-sm transition hover:-translate-y-0.5 hover:border-aurora-indigo/40 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-indigo"
                                            >
                                                <i className={`fa-solid ${link.icon} text-xs`} aria-hidden="true" />
                                                {link.label}
                                                <i className="fa-solid fa-chevron-right text-[9px]" aria-hidden="true" />
                                            </Link>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
