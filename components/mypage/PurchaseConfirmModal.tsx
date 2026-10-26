/**
 * PurchaseConfirmModal — 마이페이지 주문 "구매 확정" 창 · 2026-10-26(사용자: "구매 확정도 버튼 · 모달까지 미리 구현해서 협업자에게 전달")
 * ---------------------------------------------------------------------
 * 서버(협업자)에 구매 확정 기능이 아직 없음 → 지금은 개발 서버 미리보기(?ocpreview=1)에서만 버튼이 보이고, 확정도 화면 안에서만 바뀜.
 * 서버가 생기면 여는 쪽(app/mypage/orders/page.tsx)의 onConfirm 만 실제 기능(예: POST /api/v1/payments/toss/orders/{orderId}/confirm-purchase)으로
 * 바꾸고 usePurchaseConfirmPreview 대신 주문 자료의 확정 가능 표시를 쓰면 됨 — 주소 · 응답 모양은 협업자 문서
 * docs/09-앱-시안-인계/HANDOFF_20261025_BACKEND_TODO_4ITEMS_READY.md "5. 주문 취소 · 반품 · 구매 확정".
 *
 * 화면(겉 틀은 주문 도움 창 .ddb-petform · .ddb-orderhelp 와 같은 결 — app/mypage-web.css):
 *  - 머리: 체크 그림 · 꼬리표 · 주아 제목 · 설명 · 닫기
 *  - 주문 표 + 상품 목록(그림 · 이름 · 옵션 · 수량)
 *  - 확인 카드: 확정 뒤에는 교환 · 반품 접수가 어려움 · 적립금(서버가 금액을 주면 표시)
 *  - 아래: 닫기 · 분홍 "구매 확정하기" → 처리 중 → 완료(확정 완료 그림 · 문구 · 확인) / 실패(다시 시도)
 *  - 미리보기면 "미리보기 · 실제로 확정되지 않아요" 표시
 */
"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { OrderHelpSummary } from "@/components/mypage/OrderHelpModal";
import "@/app/mypage-web.css";

export type PurchaseConfirmLine = { name: string; option?: string; image?: string; qty: number };

type Phase = "ready" | "saving" | "done" | "error";

const noopSubscribe = () => () => {};
/** 개발 서버 미리보기 켜짐 — 주소에 ?ocpreview=1(운영 빌드에서는 늘 꺼짐) */
export function usePurchaseConfirmPreview(): boolean {
    return useSyncExternalStore(
        noopSubscribe,
        () => process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).has("ocpreview"),
        () => false,
    );
}

export default function PurchaseConfirmModal({
    order,
    lines,
    preview = false,
    rewardPoints,
    onConfirm,
    onClose,
}: {
    order: OrderHelpSummary;
    lines: PurchaseConfirmLine[];
    /** 미리보기 — 서버에 보내지 않고 화면만 바뀜 */
    preview?: boolean;
    /** 확정하면 받을 적립금(서버가 알려 주면) */
    rewardPoints?: number;
    /** 실제 확정(서버 기능이 생기면 연결). 없으면 미리보기처럼 화면만 바뀜 */
    onConfirm?: () => Promise<void>;
    onClose: () => void;
}) {
    const [phase, setPhase] = useState<Phase>("ready");
    const titleId = useId();
    const closeRef = useRef<HTMLButtonElement>(null);
    const close = useCallback(() => { if (phase !== "saving") onClose(); }, [onClose, phase]);

    // 열려 있는 동안 뒤 화면 스크롤 잠금 · Esc 로 닫기 · 닫기 단추에 초점(주문 도움 창과 같은 동작)
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

    // 확정하기 — 실제 기능이 있으면 그것, 없으면(미리보기) 잠깐 뒤 완료 화면
    const confirm = async () => {
        setPhase("saving");
        try {
            if (onConfirm) await onConfirm();
            else await new Promise((resolve) => setTimeout(resolve, 600));
            setPhase("done");
        } catch {
            setPhase("error");
        }
    };

    const done = phase === "done";

    return createPortal(
        <div className="ddb-petform ddb-orderhelp" data-mode="confirm" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="ddb-pf-backdrop" onClick={close} aria-hidden="true" />
            <div className="ddb-pf-card">
                <header className="ddb-pf-head">
                    <span className="ddb-pf-avatar" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                        <img src="/images/ui/cs-check-160.webp" alt="" />
                    </span>
                    <div className="ddb-pf-titles">
                        <p className="ddb-pf-kicker">PURCHASE CONFIRM</p>
                        <h2 id={titleId}><span className="ddb-pf-name">{done ? "구매가 확정되었어요" : "구매 확정"}</span></h2>
                        <p className="ddb-pf-sub">{done ? "이용해 주셔서 고마워요. 우리 아이와 즐거운 시간 보내세요!" : "상품을 잘 받으셨나요? 확인하셨다면 구매를 확정해 주세요."}</p>
                    </div>
                    <button ref={closeRef} type="button" className="ddb-pf-close" onClick={close} aria-label="구매 확정 닫기">
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </header>

                <div className="ddb-pf-body">
                    {preview && <p className="ddb-oc-preview"><i className="fa-solid fa-eye" aria-hidden="true" />미리보기 · 실제로 확정되지 않아요</p>}

                    {/* 주문 표 */}
                    <section className="ddb-oh-ticket" aria-label="확정할 주문">
                        <span className="ddb-oh-thumb" aria-hidden="true">
                            {order.image ? <Image src={order.image} alt="" width={72} height={72} /> : <i className="fa-solid fa-box-open" />}
                        </span>
                        <div className="ddb-oh-info">
                            <p className="ddb-oh-tag">{done ? "확정된 주문" : "이 주문을 확정해요"}</p>
                            <strong>{order.orderName}</strong>
                            <span className="ddb-oh-meta">{order.dateLabel} · {order.amountLabel}</span>
                        </div>
                        <div className="ddb-oh-side">
                            <span className="ddb-oh-status">{done ? "구매 확정" : order.statusLabel}</span>
                            <span className="ddb-oh-no"><em>주문번호</em>{order.orderId}</span>
                        </div>
                    </section>

                    {/* 상품 목록 */}
                    <ul className="ddb-oc-lines" aria-label="주문 상품">
                        {lines.map((line, index) => (
                            <li key={`${line.name}-${line.option ?? ""}-${index}`}>
                                <span className="ddb-oc-thumb" aria-hidden="true">
                                    {line.image ? <Image src={line.image} alt="" width={52} height={52} /> : <i className="fa-solid fa-box-open" />}
                                </span>
                                <span className="ddb-oc-name"><b>{line.name}</b>{line.option ? <small>{line.option}</small> : null}</span>
                                <em>{line.qty}개</em>
                            </li>
                        ))}
                    </ul>

                    {done ? (
                        // 완료 — 확정 그림 · 적립금(있으면)
                        <section className="ddb-oh-refund" data-oc-done>
                            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                            <img src="/images/ui/web-cs-step-refund-done-256.webp" alt="" aria-hidden="true" />
                            <div>
                                <h3>구매 확정 완료</h3>
                                <p>{rewardPoints ? `적립금 ${rewardPoints.toLocaleString("ko-KR")}P가 지급되었어요. ` : ""}확정한 주문은 주문 내역에서 언제든 다시 볼 수 있어요.</p>
                            </div>
                        </section>
                    ) : (
                        // 확정 전 확인
                        <section className="ddb-oh-refund" data-oc-check>
                            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                            <img src="/images/ui/policy-reward-192.webp" alt="" aria-hidden="true" />
                            <div>
                                <h3>확정 전에 확인해 주세요</h3>
                                <p>
                                    구매를 확정하면 교환 · 반품 접수가 어려워요. 상품 상태와 구성품을 한 번 더 확인해 주세요.
                                    {rewardPoints ? ` 확정하면 적립금 ${rewardPoints.toLocaleString("ko-KR")}P를 드려요.` : ""}
                                </p>
                            </div>
                        </section>
                    )}
                    {phase === "error" && <p className="ddb-oc-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />구매 확정을 마치지 못했어요. 잠시 뒤 다시 시도해 주세요.</p>}
                </div>

                <footer className="ddb-pf-foot">
                    <p className="ddb-pf-hint"><i className="fa-solid fa-paw" aria-hidden="true" />{done ? "후기를 남겨 주시면 다른 보호자에게 큰 도움이 돼요." : "확정 후에는 되돌릴 수 없어요."}</p>
                    {done ? (
                        <button type="button" className="ddb-pf-save" onClick={onClose}>확인</button>
                    ) : (
                        <>
                            <button type="button" className="ddb-pf-cancel" onClick={close} disabled={phase === "saving"}>닫기</button>
                            <button type="button" className="ddb-pf-save" onClick={confirm} disabled={phase === "saving"}>
                                <i className="fa-solid fa-circle-check" aria-hidden="true" />{phase === "saving" ? "확정하는 중…" : phase === "error" ? "다시 시도하기" : "구매 확정하기"}
                            </button>
                        </>
                    )}
                </footer>
            </div>
        </div>,
        document.body,
    );
}
