/**
 * OrderHelpModal — 웹 마이페이지 주문 내역 "배송 문의" · "교환·반품 안내" 창(2026-10-24 사용자: 마이페이지를 벗어나지 않게)
 * ---------------------------------------------------------------------
 * 겉 틀은 반려견 프로필 창(.ddb-petform)과 같은 결, 안쪽 꾸밈은 app/mypage-web.css "주문 도움 창".
 *  - 머리: 3D 고객센터 그림 쿠션 · 손글씨 꼬리표 · 주아 제목(세 색 밑줄) · 설명 · 닫기
 *  - 주문 표: "이 주문으로 문의해요" — 상품 그림 · 주문 이름 · 날짜 · 금액 · 상태 칩 · 주문번호(문의 양식에 자동으로 들어감)
 *  - 배송 문의(inquiry): 1:1 문의 양식 그대로(CustomerInquiryPanel embedded — 접수 · 검사 · 문구 그대로), 유형 = 배송
 *  - 교환·반품 안내(return): 네 단계(크레파스 배지 · 세 색 줄로 이음) · 정책 묶음 카드 · 환불 처리 → 아래 분홍 "교환·반품 접수하기"를
 *    누르면 같은 창에서 교환 문의 양식으로 넘어감(뒤로 가면 안내로)
 * 주문 없이 쓰는 문의(preset — 이메일·계정 변경 문의 · 분석 결과 삭제 요청 등)도 같은 창: 주문 표 없이 머리 문구 · 문의 유형 · 제목만 바꿔 문의 양식.
 * 앱 화면과 새 탭(Ctrl/⌘ 클릭)은 원래대로 페이지로 이동(여는 쪽에서 처리 — MypageInquiryLink · 주문 내역 화면).
 */
"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CustomerInquiryPanel from "@/components/contact/CustomerInquiryPanel";
import DeliveryReturnPolicyDetails from "@/components/policy/DeliveryReturnPolicyDetails";
import { BUSINESS_INFO } from "@/lib/legal";
import { RETURN_STEPS } from "@/lib/return-steps";
import type { CustomerSupportCategory } from "@/lib/customer-api";
// 창 꾸밈(.ddb-petform · .ddb-orderhelp) — 마이페이지 밖(자주 묻는 질문 등)에서 열려도 같은 모양(2026-10-25)
import "@/app/mypage-web.css";

export type OrderHelpSummary = {
    orderId: string;
    orderName: string;
    firstLineName?: string;
    image?: string;
    dateLabel: string;
    amountLabel: string;
    statusLabel: string;
};

type Mode = "inquiry" | "return" | "exchange";

/** 주문 없는 문의 창 머리 · 양식 미리 채움 */
export type InquiryPreset = {
    kicker: string;
    title: string;
    sub: string;
    art: string;
    category: CustomerSupportCategory;
    subject?: string;
    hint?: string;
};

const HEAD: Record<Mode, { kicker: string; title: string; sub: string; art: string }> = {
    inquiry: { kicker: "DELIVERY HELP", title: "배송 문의하기", sub: "주문번호는 미리 넣어 두었어요. 궁금한 점만 적어 주세요.", art: "/images/ui/web-cs-orders-160.webp" },
    return: { kicker: "RETURN & EXCHANGE", title: "교환·반품 안내", sub: "어떻게 진행되는지 먼저 확인하고, 아래에서 바로 접수할 수 있어요.", art: "/images/ui/web-cs-return-160.webp" },
    exchange: { kicker: "RETURN REQUEST", title: "교환·반품 접수하기", sub: "사유와 상품 상태를 적어 주시면 협의 방법을 이메일로 안내해 드려요.", art: "/images/ui/web-cs-return-160.webp" },
};

const CS_EMAIL = BUSINESS_INFO.customerServiceEmail || "support@daengdabang.com";
const CS_PHONE = BUSINESS_INFO.customerServicePhone;

export default function OrderHelpModal({ order, preset, initialMode, onClose }: { order?: OrderHelpSummary; preset?: InquiryPreset; initialMode: "inquiry" | "return"; onClose: () => void }) {
    const [mode, setMode] = useState<Mode>(initialMode);
    const titleId = useId();
    const closeRef = useRef<HTMLButtonElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const head = preset && mode === "inquiry" ? preset : HEAD[mode];
    const close = useCallback(() => onClose(), [onClose]);

    // 열려 있는 동안 뒤 화면 스크롤 잠금 · Esc 로 닫기 · 닫기 단추에 초점
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = "hidden";
        closeRef.current?.focus();
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
        window.addEventListener("keydown", onKey);
        return () => {
            root.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [close]);

    // 안내 ↔ 접수 넘어갈 때 창 안 맨 위로
    const go = (next: Mode) => {
        setMode(next);
        requestAnimationFrame(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; });
    };

    return createPortal(
        <div className="ddb-petform ddb-orderhelp" data-mode={preset && mode === "inquiry" ? "preset" : mode} role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="ddb-pf-backdrop" onClick={close} aria-hidden="true" />
            <div className="ddb-pf-card">
                <header className="ddb-pf-head">
                    <span className="ddb-pf-avatar" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                        <img src={head.art} alt="" />
                    </span>
                    <div className="ddb-pf-titles">
                        <p className="ddb-pf-kicker">{head.kicker}</p>
                        <h2 id={titleId}><span className="ddb-pf-name">{head.title}</span></h2>
                        <p className="ddb-pf-sub">{head.sub}</p>
                    </div>
                    <button ref={closeRef} type="button" className="ddb-pf-close" onClick={close} aria-label={`${head.title} 닫기`}>
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </header>

                <div className="ddb-pf-body" ref={bodyRef}>
                    {/* 주문 표(주문에서 연 창만) */}
                    {order && (
                    <section className="ddb-oh-ticket" aria-label="문의할 주문">
                        <span className="ddb-oh-thumb" aria-hidden="true">
                            {order.image
                                ? <Image src={order.image} alt="" width={72} height={72} />
                                : <i className="fa-solid fa-box-open" />}
                        </span>
                        <div className="ddb-oh-info">
                            <p className="ddb-oh-tag">{mode === "return" ? "이 주문 기준으로 안내해요" : "이 주문으로 문의해요"}</p>
                            <strong>{order.orderName}</strong>
                            <span className="ddb-oh-meta">{order.dateLabel} · {order.amountLabel}</span>
                        </div>
                        <div className="ddb-oh-side">
                            <span className="ddb-oh-status">{order.statusLabel}</span>
                            <span className="ddb-oh-no"><em>주문번호</em>{order.orderId}</span>
                        </div>
                    </section>
                    )}

                    {mode === "return" ? (
                        <>
                            {/* 네 단계 */}
                            <section className="ddb-oh-sec" aria-labelledby={`${titleId}-steps`}>
                                <h3 id={`${titleId}-steps`} className="ddb-oh-h"><span>1</span>교환·반품은 이렇게 진행돼요</h3>
                                <ol className="ddb-oh-steps">
                                    {RETURN_STEPS.map((step, index) => (
                                        <li key={step.title} className={step.tint}>
                                            <span className="ddb-oh-badge">
                                                <Image src={step.art} alt="" width={64} height={64} />
                                                <b>{index + 1}</b>
                                            </span>
                                            <strong>{step.title}</strong>
                                            <small>{step.body}</small>
                                        </li>
                                    ))}
                                </ol>
                            </section>

                            {/* 정책 — 묶음마다 쿠션 카드 */}
                            <section className="ddb-oh-sec" aria-labelledby={`${titleId}-policy`}>
                                <h3 id={`${titleId}-policy`} className="ddb-oh-h"><span>2</span>꼭 확인해 주세요</h3>
                                <div className="ddb-oh-policy">
                                    <DeliveryReturnPolicyDetails includeDelivery={false} />
                                </div>
                            </section>

                            {/* 환불 처리 */}
                            <section className="ddb-oh-refund">
                                {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                                <img src="/images/ui/web-cs-refund-160.webp" alt="" aria-hidden="true" />
                                <div>
                                    <h3>환불 처리</h3>
                                    <p>반품 상품 회수와 검수가 완료되면 영업일 기준 3일 이내에 환불을 진행합니다. 결제 수단에 따라 카드 승인 취소 또는 계좌 환불 등의 처리 방식과 소요 시간이 다를 수 있습니다.</p>
                                </div>
                            </section>
                        </>
                    ) : (
                        <div className="ddb-oh-form">
                            <CustomerInquiryPanel
                                key={mode}
                                email={CS_EMAIL}
                                phone={CS_PHONE}
                                embedded={{
                                    category: preset && mode === "inquiry" ? preset.category : mode === "exchange" ? "exchange" : "delivery",
                                    orderNumber: order?.orderId,
                                    productName: order?.firstLineName,
                                    subject: preset && mode === "inquiry" ? preset.subject : undefined,
                                }}
                            />
                        </div>
                    )}
                </div>

                <footer className="ddb-pf-foot">
                    {mode === "exchange" ? (
                        <button type="button" className="ddb-oh-back" onClick={() => go("return")}>
                            <i className="fa-solid fa-chevron-left" aria-hidden="true" />안내 다시 보기
                        </button>
                    ) : (
                        <p className="ddb-pf-hint"><i className="fa-solid fa-paw" aria-hidden="true" />{mode === "return" ? "접수하면 담당자가 이메일로 협의 방법을 안내해 드려요." : preset?.hint ?? `평일 10:00~18:00 · 전화 ${CS_PHONE}`}</p>
                    )}
                    <button type="button" className="ddb-pf-cancel" onClick={close}>닫기</button>
                    {mode === "return" && (
                        <button type="button" className="ddb-pf-save" onClick={() => go("exchange")}>
                            <i className="fa-solid fa-envelope" aria-hidden="true" />교환·반품 접수하기
                        </button>
                    )}
                </footer>
            </div>
        </div>,
        document.body,
    );
}
