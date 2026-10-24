/**
 * GuestOrderLookup — 비회원 주문 조회(/order-lookup · 2026-10-25)
 * ---------------------------------------------------------------------
 *  1) 하늘 머리 판: 손글씨 GUEST ORDER · "비회원 주문 조회" · 3D 주문 그림
 *  2) 조회 카드: 주문번호 · 주문 조회 비밀번호(눈) · 조회하기 — 틀림 · 잠김 · 준비 중 안내
 *     도움 셋: 주문번호를 모를 때(주문 완료 메일) · 비밀번호를 잊었을 때(1:1 문의) · 회원으로 주문했을 때(로그인)
 *  3) 결과: 주문번호 · 상태 칩 · 주문일 → 진행 4단계(결제 완료 · 상품 준비 · 배송 중 · 배송 완료, 세 색 크레파스 줄)
 *     → 송장 줄 → 주문 상품 → 결제 정보(연보라) · 배송 정보(민트) → 할 수 있는 일 넷(배송 조회 · 주문 취소 · 교환 · 반품 · 1:1 문의)
 *     → 다음엔 회원으로(20C)
 * 조회 · 취소는 lib/guest-order.ts(서버가 연결됐을 때만 — 그 전에는 "준비 중"과 1:1 문의로 정직하게 안내).
 * 교환 · 반품 · 문의는 마이페이지와 같은 문의 창(OrderHelpModal)에 주문번호를 붙여 엶.
 */
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import "@/app/guest-web.css";
import "@/app/mypage-web.css";
import OrderHelpModal from "@/components/mypage/OrderHelpModal";
import {
    guestOrderEnabled,
    lookupGuestOrder,
    requestGuestOrderCancel,
    type GuestOrder,
    type GuestOrderStatus,
} from "@/lib/guest-order";

const UI = "/images/ui/";
const noop = () => () => {};

const STATUS: Record<GuestOrderStatus, { label: string; tone: string; step: number }> = {
    paid: { label: "결제 완료", tone: "sky", step: 0 },
    preparing: { label: "상품 준비 중", tone: "yellow", step: 1 },
    shipping: { label: "배송 중", tone: "sky", step: 2 },
    delivered: { label: "배송 완료", tone: "mint", step: 3 },
    cancel_requested: { label: "취소 요청됨", tone: "gray", step: -1 },
    cancelled: { label: "주문 취소", tone: "gray", step: -1 },
    returned: { label: "반품 완료", tone: "gray", step: -1 },
};
const TRACK = [
    { label: "결제 완료", icon: "fa-credit-card" },
    { label: "상품 준비", icon: "fa-box" },
    { label: "배송 중", icon: "fa-truck-fast" },
    { label: "배송 완료", icon: "fa-house-circle-check" },
];

const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;
const dateText = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, "0")}. ${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

export default function GuestOrderLookup() {
    const ready = useSyncExternalStore(noop, guestOrderEnabled, () => process.env.NEXT_PUBLIC_GUEST_ORDER === "1");
    const [orderNumber, setOrderNumber] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<{ tone: "error" | "warn"; text: string } | null>(null);
    const [result, setResult] = useState<{ order: GuestOrder; token: string } | null>(null);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (loading) return;
        if (!orderNumber.trim() || !password) {
            setError({ tone: "error", text: "주문번호와 주문 조회 비밀번호를 모두 넣어 주세요." });
            return;
        }
        setLoading(true);
        setError(null);
        const found = await lookupGuestOrder(orderNumber, password);
        setLoading(false);
        if (found.ok) {
            setPassword("");
            setResult({ order: found.order, token: found.guestToken });
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        setError(found.reason === "not_found"
            ? { tone: "error", text: "주문번호나 주문 조회 비밀번호가 맞지 않아요. 주문 완료 메일의 주문번호를 다시 확인해 주세요." }
            : found.reason === "locked"
                ? { tone: "warn", text: "여러 번 틀려 잠시 조회를 막았어요. 10분 뒤에 다시 시도하거나 1:1 문의를 남겨 주세요." }
                : { tone: "warn", text: "비회원 주문 조회를 지금 열 수 없어요. 잠시 후 다시 시도하거나 1:1 문의를 남겨 주세요." });
    };

    return (
        <main className="gw-lookup" data-guest-web="lookup">
            <section className="gw-hero" aria-labelledby="gw-lookup-title">
                <span>
                    <span className="gw-kicker">GUEST ORDER</span>
                    <h1 id="gw-lookup-title">비회원 <span className="gw-hl">주문 조회</span></h1>
                    <p>가입 없이 주문했다면 주문번호와 주문 조회 비밀번호로 배송 상황을 확인하고, 취소 · 교환 · 반품 · 문의를 할 수 있어요.</p>
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img src={`${UI}web-cs-step-ship-256.webp`} alt="" aria-hidden="true" />
            </section>

            {result ? (
                <OrderResult
                    order={result.order}
                    token={result.token}
                    onBack={() => { setResult(null); setError(null); }}
                    onChange={(order) => setResult({ order, token: result.token })}
                />
            ) : (
                <>
                    <section className="gw-card" data-tone="sky" aria-labelledby="gw-lookup-form-title">
                        <h2 id="gw-lookup-form-title" className="gw-card-h">
                            <span aria-hidden="true"><i className="fa-solid fa-magnifying-glass" /></span>주문 찾기
                            {!ready && <em className="gw-tag"><i className="fa-solid fa-plug" aria-hidden="true" />조회 연동 준비 중</em>}
                        </h2>
                        {!ready && (
                            <p className="gw-msg is-warn"><i className="fa-solid fa-circle-info" aria-hidden="true" />비회원 주문 조회는 곧 열려요. 지금은 1:1 문의에 주문번호를 남겨 주시면 확인해 드려요.</p>
                        )}
                        <form className="gw-form-grid" onSubmit={submit} noValidate>
                            <label className="gw-field">
                                <span>주문번호 <small>주문 완료 메일 · 문자에 있어요</small></span>
                                <span className="gw-inwrap">
                                    <i className="fa-solid fa-receipt" aria-hidden="true" />
                                    <input className="gw-in" value={orderNumber} onChange={(event) => { setOrderNumber(event.target.value.toUpperCase()); setError(null); }} placeholder="예: DDB-20261025-1042" autoComplete="off" disabled={!ready || loading} aria-invalid={error?.tone === "error"} />
                                </span>
                            </label>
                            <label className="gw-field">
                                <span>주문 조회 비밀번호</span>
                                <span className="gw-inwrap">
                                    <i className="fa-solid fa-key" aria-hidden="true" />
                                    <input className="gw-in" type={show ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }} placeholder="주문할 때 정한 비밀번호" autoComplete="off" disabled={!ready || loading} aria-invalid={error?.tone === "error"} />
                                    <button type="button" className="gw-eye" onClick={() => setShow((value) => !value)} aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"} aria-pressed={show}>
                                        <i className={show ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} aria-hidden="true" />
                                    </button>
                                </span>
                            </label>
                            <button type="submit" className="gw-go" disabled={!ready || loading}>
                                {loading ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />찾는 중</> : <>조회하기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></>}
                            </button>
                        </form>
                        {error && <p className={`gw-msg is-${error.tone}`} role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{error.text}</p>}
                    </section>

                    <section className="gw-helps" aria-label="도움말">
                        <div>
                            <i className="fa-solid fa-envelope-open-text" aria-hidden="true" />
                            <span><b>주문번호를 모르겠어요</b><small>주문할 때 넣은 이메일로 보낸 주문 완료 메일에 있어요. 스팸함도 확인해 주세요.</small></span>
                        </div>
                        <InquiryHelp />
                        <Link href="/auth/login?redirect=%2Fmypage%2Forders%2F">
                            <i className="fa-solid fa-user" aria-hidden="true" />
                            <span><b>회원으로 주문했어요</b><small>로그인하면 마이페이지 주문 내역에서 바로 볼 수 있어요.</small></span>
                        </Link>
                    </section>
                </>
            )}
        </main>
    );
}

/** 비밀번호를 잊었을 때 — 1:1 문의 창 */
function InquiryHelp() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>
                <i className="fa-solid fa-key" aria-hidden="true" />
                <span><b>비밀번호를 잊었어요</b><small>1:1 문의에 주문번호를 남기면 본인 확인 후 도와드려요.</small></span>
            </button>
            {open && (
                <OrderHelpModal
                    initialMode="inquiry"
                    onClose={() => setOpen(false)}
                    preset={{
                        kicker: "GUEST ORDER",
                        title: "비회원 주문 문의",
                        sub: "주문번호와 주문하신 분 이름 · 연락처를 남겨 주시면 본인 확인 후 도와드려요.",
                        art: "/images/ui/web-cs-orders-160.webp",
                        category: "order",
                        subject: "[주문 문의] 비회원 주문 조회 비밀번호",
                        hint: "주문 조회 비밀번호는 보내지 마세요. 답변은 남긴 이메일로 드려요.",
                    }}
                />
            )}
        </>
    );
}

/** 조회 결과 */
function OrderResult({ order, token, onBack, onChange }: { order: GuestOrder; token: string; onBack: () => void; onChange: (order: GuestOrder) => void }) {
    const status = STATUS[order.status];
    const [modal, setModal] = useState<"inquiry" | "return" | null>(null);
    const [cancelAsk, setCancelAsk] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState("");
    const ticket = {
        orderId: order.orderNumber,
        orderName: order.lines[0] ? `${order.lines[0].name}${order.lines.length > 1 ? ` 외 ${order.lines.length - 1}건` : ""}` : "주문 상품",
        firstLineName: order.lines[0]?.name,
        image: order.lines[0]?.image,
        dateLabel: dateText(order.orderedAt),
        amountLabel: won(order.totalPaid),
        statusLabel: status.label,
    };

    const cancel = async () => {
        setCancelling(true);
        setCancelError("");
        const ok = await requestGuestOrderCancel(order.orderNumber, token);
        setCancelling(false);
        if (ok) {
            setCancelAsk(false);
            onChange({ ...order, status: "cancel_requested", cancellable: false });
        } else {
            setCancelError("취소 요청을 보내지 못했어요. 잠시 후 다시 시도하거나 1:1 문의를 남겨 주세요.");
        }
    };

    return (
        <>
            <section className="gw-card" aria-labelledby="gw-order-title" data-guest-order-result>
                <div className="gw-order-top">
                    <span className="gw-order-no">
                        <small>주문번호 · {dateText(order.orderedAt)}</small>
                        <b id="gw-order-title">{order.orderNumber}</b>
                    </span>
                    <span className="gw-status" data-tone={status.tone}><i className="fa-solid fa-circle" style={{ fontSize: 7 }} aria-hidden="true" />{status.label}</span>
                    <button type="button" className="gw-pill" onClick={onBack}><i className="fa-solid fa-magnifying-glass" aria-hidden="true" />다른 주문 조회</button>
                </div>

                {status.step >= 0 && (
                    <ol className="gw-track" aria-label={`진행 상황 · ${status.label}`}>
                        {TRACK.map((step, index) => {
                            const state = index < status.step ? "is-done" : index === status.step ? "is-now" : "is-next";
                            return (
                                <li key={step.label} className={state} aria-current={state === "is-now" ? "step" : undefined}>
                                    <b aria-hidden="true"><i className={`fa-solid ${state === "is-done" ? "fa-check" : step.icon}`} /></b>
                                    <span>{step.label}</span>
                                </li>
                            );
                        })}
                    </ol>
                )}
                {status.step < 0 && <p className="gw-msg is-info"><i className="fa-solid fa-circle-info" aria-hidden="true" />{order.status === "cancel_requested" ? "취소 요청을 받았어요. 처리되면 주문하신 이메일로 알려 드리고, 결제 수단으로 환불돼요." : `${status.label} 상태예요.`}</p>}

                {order.tracking && (
                    <p className="gw-shipline"><i className="fa-solid fa-truck-fast" aria-hidden="true" /><b>{order.tracking.carrier}</b>송장 {order.tracking.number}</p>
                )}

                <ul className="gw-items" aria-label="주문 상품">
                    {order.lines.map((line) => (
                        <li key={`${line.name}-${line.option ?? ""}`}>
                            <span className="gw-thumb" aria-hidden="true">
                                {line.image ? <Image src={line.image} alt="" fill sizes="56px" className="object-cover" /> : <i className="fa-solid fa-box" />}
                            </span>
                            <span><b>{line.name}</b><small>{[line.option, `${line.qty}개`].filter(Boolean).join(" · ")}</small></span>
                            <strong>{won(line.price * line.qty)}</strong>
                        </li>
                    ))}
                </ul>

                <div className="gw-two">
                    <div className="gw-box" data-tone="lav">
                        <h3><i className="fa-solid fa-credit-card" aria-hidden="true" />결제 정보</h3>
                        <dl>
                            <div><dt>상품 금액</dt><dd>{won(order.itemsTotal)}</dd></div>
                            <div><dt>배송비</dt><dd>{order.shippingFee ? won(order.shippingFee) : "무료"}</dd></div>
                            <div><dt>결제 수단</dt><dd>{order.paymentMethod}</dd></div>
                            <div className="is-total"><dt>총 결제</dt><dd>{won(order.totalPaid)}</dd></div>
                        </dl>
                    </div>
                    <div className="gw-box" data-tone="mint">
                        <h3><i className="fa-solid fa-location-dot" aria-hidden="true" />배송 정보</h3>
                        <dl>
                            <div><dt>받는 분</dt><dd>{order.delivery.recipientName}</dd></div>
                            <div><dt>연락처</dt><dd>{order.delivery.maskedPhone}</dd></div>
                            <div><dt>주소</dt><dd>{order.delivery.address}</dd></div>
                            {order.delivery.requestNote && <div><dt>요청</dt><dd>{order.delivery.requestNote}</dd></div>}
                        </dl>
                    </div>
                </div>

                <div className="gw-acts" aria-label="할 수 있는 일">
                    {order.tracking?.url ? (
                        <a href={order.tracking.url} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}web-cs-step-ship-256.webp`} alt="" aria-hidden="true" />배송 조회<small>택배사 화면</small>
                        </a>
                    ) : (
                        <button type="button" disabled>
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}web-cs-step-ship-256.webp`} alt="" aria-hidden="true" />배송 조회<small>{order.tracking ? "송장 번호로 확인" : "발송 뒤에 열려요"}</small>
                        </button>
                    )}
                    <button type="button" onClick={() => setCancelAsk(true)} disabled={!order.cancellable}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}web-cs-refund-160.webp`} alt="" aria-hidden="true" />주문 취소<small>{order.cancellable ? "상품 준비 전까지" : "준비가 시작돼 문의로"}</small>
                    </button>
                    <button type="button" onClick={() => setModal("return")}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}web-cs-return-160.webp`} alt="" aria-hidden="true" />교환 · 반품<small>받은 뒤 7일 안</small>
                    </button>
                    <button type="button" onClick={() => setModal("inquiry")}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}web-cs-inquiry-160.webp`} alt="" aria-hidden="true" />1:1 문의<small>이 주문으로 문의</small>
                    </button>
                </div>

                {cancelAsk && (
                    <div className="gw-msg is-warn" role="alertdialog" aria-label="주문 취소 확인" style={{ display: "grid", gap: 10 }}>
                        <span><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> <b>이 주문을 취소할까요?</b> 결제한 수단으로 {won(order.totalPaid)}이 환불돼요.</span>
                        <span style={{ display: "flex", gap: 8 }}>
                            <button type="button" className="gw-pill" onClick={() => setCancelAsk(false)}>그대로 둘게요</button>
                            <button type="button" className="gw-pill is-pink" onClick={() => void cancel()} disabled={cancelling}>{cancelling ? "요청하는 중" : "주문 취소 요청"}</button>
                        </span>
                        {cancelError && <span>{cancelError}</span>}
                    </div>
                )}
            </section>

            <section className="gw-join" aria-label="회원가입 안내">
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img src={`${UI}goods-pay-ready-256.webp`} alt="" aria-hidden="true" />
                <span><b>다음엔 회원으로 주문해 보세요</b><small>주문 내역이 마이페이지에 모이고, 가입 혜택 코인 20C도 받아요.</small></span>
                <Link href="/auth/signup" className="gw-pill is-lav">회원가입<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
            </section>

            {modal && (
                <OrderHelpModal
                    initialMode={modal}
                    order={ticket}
                    onClose={() => setModal(null)}
                />
            )}
        </>
    );
}
