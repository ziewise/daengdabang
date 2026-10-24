/**
 * PaymentResultWeb — 웹 결제 결과 화면(회원) · 2026-10-25
 * ---------------------------------------------------------------------
 * /checkout/toss/success · /checkout/toss/fail 의 웹 전용 겉모양. 결제 확인 · 장바구니 정리 · 주문 저장 · 주문 취소는
 * 기존 페이지 그대로 하고, 이 파일은 그 결과(view)만 받아 그림. 앱(ddb-app-mode)은 기존 화면 그대로.
 * 결: 비회원 주문 완료 · 조회(guest-web.css 의 .gw-*)와 같은 파스텔 쿠션 — 회원 · 비회원 완료 화면이 한 가족처럼 보이게.
 *  - PaymentDoneWeb   : 축하 그림 · 주문번호 표(복사) · 테스트 결제 안내 · 진행 단계 · 주문 상품 · 결제/배송 정보 · 이어서 하기
 *  - PaymentStateWeb  : 확인 중(세 단계 진행) · 로그인 필요 · 상태 확인 중(다시 확인) · 확인 실패 · 주소 오류
 *  - PaymentFailWeb   : 결제가 안 됐어요 — 까닭(코드별 쉬운 말) · 오류 코드 · 장바구니 그대로 · 다시 결제 · 문의
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { TossTestPaymentConfirmation } from "@/lib/customer-api";
import { findProduct } from "@/lib/shop";
import { CHECKOUT_DELIVERY_REQUEST_PRESETS } from "@/lib/checkout-shipping";
import type { CheckoutPaymentMethod } from "@/lib/payment-methods";
import "@/app/guest-web.css";
import "@/app/payment-web.css";

const UI = "/images/ui/";
const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

/** 결제수단 이름 · 아이콘(주문서와 같은 이름) */
const METHOD: Record<CheckoutPaymentMethod, { label: string; icon: string }> = {
    card: { label: "신용 · 체크카드", icon: "fa-credit-card" },
    transfer: { label: "계좌이체", icon: "fa-building-columns" },
    virtual_account: { label: "가상계좌", icon: "fa-receipt" },
    toss_pay: { label: "토스페이", icon: "fa-bolt" },
    phone: { label: "휴대폰 결제", icon: "fa-mobile-screen-button" },
    naver_pay: { label: "네이버페이", icon: "fa-n" },
    kakao_pay: { label: "카카오페이", icon: "fa-comment" },
};

/** 진행 단계(비회원 조회와 같은 네 칸) */
const TRACK = [
    { label: "결제 완료", icon: "fa-credit-card" },
    { label: "상품 준비", icon: "fa-box" },
    { label: "배송 중", icon: "fa-truck-fast" },
    { label: "배송 완료", icon: "fa-house-circle-check" },
];

function dateTime(iso?: string | null) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, "0")}. ${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** "2026-10-28" → "10월 28일(화)" */
function dayLabel(value?: string) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getMonth() + 1}월 ${date.getDate()}일(${"일월화수목금토"[date.getDay()]})`;
}

function maskPhone(phone: string) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) return phone;
    return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

/* ═════════ 결제 완료 ═════════ */
export function PaymentDoneWeb({ confirmation, orderId, amount, userName }: {
    confirmation: TossTestPaymentConfirmation;
    orderId: string;
    amount: number;
    userName?: string;
}) {
    const [copied, setCopied] = useState(false);
    const method = METHOD[confirmation.paymentMethod] ?? METHOD.card;
    const delivery = confirmation.delivery;
    const quote = confirmation.quote;
    const shippingFee = quote?.shippingFee ?? 0;
    const itemsTotal = Math.max(0, confirmation.totalAmount - shippingFee);
    const simulation = quote ? quote.isSimulation || quote.fulfillmentMode === "test_no_shipment" : true;
    const request = delivery
        ? delivery.requestCode === "other"
            ? delivery.requestNote
            : CHECKOUT_DELIVERY_REQUEST_PRESETS.find((preset) => preset.code === delivery.requestCode)?.label.ko
        : "";
    // 주문 상품 — 상품 이름 · 사진은 카탈로그에서, 수량 · 옵션은 결제 확인 값 그대로
    const lines = confirmation.lines.map((line, index) => {
        const product = findProduct(line.productId);
        const colorImage = line.color ? product?.colors?.find((color) => color.name === line.color)?.image : undefined;
        return {
            key: `${index}-${line.productId}-${line.color ?? ""}-${line.size ?? ""}`,
            name: product?.name ?? "주문 상품",
            image: colorImage ?? product?.image,
            option: [line.color, line.size].filter(Boolean).join(" · "),
            qty: line.qty,
        };
    });
    const totalQty = lines.reduce((sum, line) => sum + line.qty, 0);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(orderId);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <main className="gw-lookup pw-page" data-guest-web="pay-done" data-payment-status="test_paid">
            {/* 축하 판 — 그림 · 제목 · 주문번호 표 */}
            <section className="gw-done pw-done" aria-labelledby="pw-done-title">
                <span className="pw-confetti" aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img src={`${UI}daily-hero-treasure-384.webp`} alt="" aria-hidden="true" />
                <span className="gw-kicker">THANK YOU</span>
                <h1 id="pw-done-title">주문이 완료됐어요{userName ? <>, <span className="gw-hl">{userName}</span>님</> : ""}!</h1>
                <p>{won(amount)} 결제가 확인됐어요. 주문 내역은 마이페이지에서 언제든 볼 수 있어요.</p>

                <div className="gw-ticket">
                    <small>주문번호</small>
                    <b>{orderId}</b>
                    <span className="pw-ticket-meta">
                        <span><i className={`fa-solid ${method.icon}`} aria-hidden="true" />{method.label}</span>
                        {confirmation.approvedAt && <span><i className="fa-regular fa-clock" aria-hidden="true" />{dateTime(confirmation.approvedAt)}</span>}
                    </span>
                    <button type="button" className="gw-pill" onClick={() => void copy()}>
                        <i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" />{copied ? "복사했어요" : "주문번호 복사"}
                    </button>
                </div>

                {/* 테스트 결제 안내 — 실제 출금 · 배송이 없다는 것을 정직하게 */}
                <p className="pw-test" role="note">
                    <i className="fa-solid fa-flask" aria-hidden="true" />
                    <span><b>토스페이먼츠 테스트 결제</b>실제 출금과 배송은 일어나지 않아요.</span>
                </p>
            </section>

            {/* 주문 내용 — 진행 단계 · 상품 · 결제/배송 */}
            <section className="gw-card" aria-labelledby="pw-order-title">
                <h2 className="gw-card-h" id="pw-order-title" data-tone="sky">
                    <span aria-hidden="true"><i className="fa-solid fa-receipt" /></span>
                    주문 내용
                    <em className="pw-count">{totalQty}개</em>
                </h2>

                <ol className="gw-track" aria-label="진행 상황 · 결제 완료">
                    {TRACK.map((step, index) => (
                        <li key={step.label} className={index === 0 ? "is-now" : "is-next"} aria-current={index === 0 ? "step" : undefined}>
                            <b aria-hidden="true"><i className={`fa-solid ${step.icon}`} /></b>
                            <span>{step.label}</span>
                        </li>
                    ))}
                </ol>

                {quote && (
                    <p className="pw-eta">
                        <i className="fa-solid fa-calendar-check" aria-hidden="true" />
                        <span>
                            <b>예상 도착 {dayLabel(quote.estimatedStartDate)}{quote.estimatedEndDate && quote.estimatedEndDate !== quote.estimatedStartDate ? ` ~ ${dayLabel(quote.estimatedEndDate)}` : ""}</b>
                            {simulation ? "테스트 주문이라 날짜는 예시로만 보여 드려요." : "택배사 사정에 따라 조금 달라질 수 있어요."}
                        </span>
                    </p>
                )}

                <ul className="gw-items" aria-label="주문 상품">
                    {lines.map((line) => (
                        <li key={line.key}>
                            <span className="gw-thumb" aria-hidden="true">
                                {line.image ? <Image src={line.image} alt="" fill sizes="56px" className="object-cover" /> : <i className="fa-solid fa-box" />}
                            </span>
                            <span><b>{line.name}</b><small>{line.option || "기본 옵션"}</small></span>
                            <strong className="pw-qty">×{line.qty}</strong>
                        </li>
                    ))}
                </ul>

                <div className="gw-two">
                    <div className="gw-box" data-tone="lav">
                        <h3><i className="fa-solid fa-credit-card" aria-hidden="true" />결제 정보</h3>
                        <dl>
                            <div><dt>상품 금액</dt><dd>{won(itemsTotal)}</dd></div>
                            <div><dt>배송비</dt><dd>{shippingFee ? won(shippingFee) : "무료"}</dd></div>
                            <div><dt>결제 수단</dt><dd>{method.label}</dd></div>
                            <div className="is-total"><dt>총 결제</dt><dd>{won(confirmation.totalAmount)}</dd></div>
                        </dl>
                    </div>
                    <div className="gw-box" data-tone="mint">
                        <h3><i className="fa-solid fa-location-dot" aria-hidden="true" />배송 정보</h3>
                        {delivery ? (
                            <dl>
                                <div><dt>받는 분</dt><dd>{delivery.recipientName}</dd></div>
                                <div><dt>연락처</dt><dd>{maskPhone(delivery.phone)}</dd></div>
                                <div><dt>주소</dt><dd>{[delivery.addressLine1, delivery.addressLine2].filter(Boolean).join(" ")}</dd></div>
                                {request && <div><dt>요청</dt><dd>{request}</dd></div>}
                            </dl>
                        ) : (
                            <p className="gw-hint">배송 정보는 주문 상세에서 확인할 수 있어요.</p>
                        )}
                    </div>
                </div>

                <div className="pw-go">
                    <Link href={`/mypage/orders/?orderId=${encodeURIComponent(orderId)}`} className="gw-go">
                        <i className="fa-solid fa-receipt" aria-hidden="true" />주문 상세보기
                    </Link>
                    <Link href="/products" className="gw-go is-soft">쇼핑 계속하기</Link>
                </div>
            </section>

            {/* 이어서 해 보세요 — 기존 화면으로만 연결 */}
            <section className="pw-next" aria-label="이어서 해 보세요">
                <Link href="/mypage/orders/" data-tone="sky">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}web-cs-orders-160.webp`} alt="" aria-hidden="true" />
                    <span><b>주문 · 배송 내역</b><small>지난 주문까지 한눈에</small></span>
                </Link>
                <Link href="/recommendations/" data-tone="pink">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}hotpick-outdoor-128.webp`} alt="" aria-hidden="true" />
                    <span><b>우리 아이 맞춤 상품</b><small>함께 쓰기 좋은 것들</small></span>
                </Link>
                <Link href="/mypage/daily/" data-tone="yellow">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}daily-checkin-256.webp`} alt="" aria-hidden="true" />
                    <span><b>오늘의 출석 도장</b><small>코인 쌓기</small></span>
                </Link>
            </section>
        </main>
    );
}

/* ═════════ 확인 중 · 로그인 필요 · 상태 확인 중 · 실패 · 주소 오류 ═════════ */
export type PaymentStateView =
    | { kind: "checking" }
    | { kind: "login_required"; loginHref: string }
    | { kind: "pending"; retryHref: string }
    | { kind: "invalid"; message: string }
    | { kind: "failed"; message: string; retryHref?: string };

export function PaymentStateWeb({ view }: { view: PaymentStateView }) {
    if (view.kind === "checking") {
        return (
            <main className="gw-lookup pw-page" data-guest-web="pay-state" aria-live="polite">
                <section className="gw-done pw-state" data-tone="sky" aria-labelledby="pw-state-title">
                    <span className="pw-spin" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}goods-escrow-256.webp`} alt="" />
                    </span>
                    <span className="gw-kicker">CHECKING</span>
                    <h1 id="pw-state-title">결제를 <span className="gw-hl">확인</span>하고 있어요</h1>
                    <p>주문번호와 금액을 서버에서 한 번 더 확인하는 중이에요. 이 화면을 닫지 말아 주세요.</p>
                    <ol className="pw-steps" aria-label="확인 순서">
                        <li className="is-done"><b aria-hidden="true"><i className="fa-solid fa-check" /></b><span>결제창 완료</span></li>
                        <li className="is-now"><b aria-hidden="true"><i className="fa-solid fa-circle-notch fa-spin" /></b><span>금액 · 주문 확인</span></li>
                        <li><b aria-hidden="true"><i className="fa-solid fa-box" /></b><span>주문 저장</span></li>
                    </ol>
                </section>
            </main>
        );
    }

    if (view.kind === "login_required") {
        return (
            <main className="gw-lookup pw-page" data-guest-web="pay-state" data-pay-login>
                <section className="gw-done pw-state" data-tone="pink" aria-labelledby="pw-state-title">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}stickers/login-lock.webp`} alt="" aria-hidden="true" />
                    <span className="gw-kicker">SIGN IN</span>
                    <h1 id="pw-state-title"><span className="gw-hl">로그인</span>하면 결제를 확인할 수 있어요</h1>
                    <p>결제한 계정으로 로그인하면 이 화면으로 돌아와 결제를 마저 확인해요. 결제는 그대로 안전하게 남아 있어요.</p>
                    <div className="gw-done-go">
                        <Link href={view.loginHref} className="gw-go"><i className="fa-solid fa-right-to-bracket" aria-hidden="true" />로그인하고 결제 확인</Link>
                    </div>
                </section>
            </main>
        );
    }

    if (view.kind === "pending") {
        return (
            <main className="gw-lookup pw-page" data-guest-web="pay-state" data-payment-status="pending" aria-live="polite">
                <section className="gw-done pw-state" data-tone="yellow" aria-labelledby="pw-state-title">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}web-cs-step-inspect-256.webp`} alt="" aria-hidden="true" />
                    <span className="gw-kicker">PLEASE WAIT</span>
                    <h1 id="pw-state-title">결제 상태를 <span className="gw-hl">확인하는 중</span>이에요</h1>
                    <p>카드사 · 결제사의 응답이 아직 오지 않았어요. 잠시 뒤 다시 확인해 주세요.</p>
                    <ul>
                        <li><i className="fa-solid fa-cart-shopping" aria-hidden="true" /><span>장바구니와 주문 정보는 바꾸지 않았어요.</span></li>
                        <li><i className="fa-solid fa-rotate" aria-hidden="true" /><span>같은 결제를 한 번 더 확인하는 거라 새로 결제되지 않아요.</span></li>
                    </ul>
                    <div className="gw-done-go">
                        <a href={view.retryHref} className="gw-go"><i className="fa-solid fa-rotate-right" aria-hidden="true" />같은 결제 다시 확인</a>
                        <Link href="/inquiry" className="gw-go is-soft">1:1 문의</Link>
                    </div>
                </section>
            </main>
        );
    }

    const failed = view.kind === "failed";
    return (
        <main className="gw-lookup pw-page" data-guest-web="pay-state" data-payment-status={view.kind}>
            <section className="gw-done pw-state" data-tone="rose" aria-labelledby="pw-state-title">
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img src={`${UI}goods-pay-none-256.webp`} alt="" aria-hidden="true" />
                <span className="gw-kicker">SOMETHING WENT WRONG</span>
                <h1 id="pw-state-title">{failed ? <>결제 확인에 <span className="gw-hl">실패</span>했어요</> : <>결제 결과를 <span className="gw-hl">확인할 수 없어요</span></>}</h1>
                <p className="pw-reason">{view.message}</p>
                <ul>
                    <li><i className="fa-solid fa-cart-shopping" aria-hidden="true" /><span>{failed && view.retryHref ? "같은 결제를 한 번 더 확인할 수 있어요. 새로 결제되지 않아요." : "장바구니는 그대로예요. 주문서에서 다시 결제할 수 있어요."}</span></li>
                    <li><i className="fa-solid fa-headset" aria-hidden="true" /><span>돈이 빠져나갔는데 이 화면이 보이면 1:1 문의에 주문번호를 남겨 주세요.</span></li>
                </ul>
                <div className="gw-done-go">
                    {failed && view.retryHref
                        ? <a href={view.retryHref} className="gw-go"><i className="fa-solid fa-rotate-right" aria-hidden="true" />같은 결제 다시 확인</a>
                        : <Link href="/checkout" className="gw-go"><i className="fa-solid fa-credit-card" aria-hidden="true" />결제 다시 시도</Link>}
                    <Link href="/cart" className="gw-go is-soft">장바구니 확인</Link>
                </div>
                <Link href="/inquiry" className="gw-link pw-help">1:1 문의하기</Link>
            </section>
        </main>
    );
}

/* ═════════ 결제가 안 됐어요(/checkout/toss/fail) ═════════ */
/** 토스 오류 코드 → 쉬운 말(모르는 코드는 받은 메시지 그대로) */
const FAIL_REASON: Record<string, { title: string; tip: string; icon: string }> = {
    PAY_PROCESS_CANCELED: { title: "결제를 중간에 멈췄어요", tip: "결제창을 닫았거나 취소를 눌렀어요. 언제든 다시 결제할 수 있어요.", icon: "fa-hand" },
    PAY_PROCESS_ABORTED: { title: "결제가 중간에 멈췄어요", tip: "결제 진행 중 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.", icon: "fa-circle-pause" },
    REJECT_CARD_COMPANY: { title: "카드사에서 승인하지 않았어요", tip: "한도 · 잔액 · 카드 정보를 확인하거나 다른 결제수단을 골라 주세요.", icon: "fa-credit-card" },
    INVALID_CARD_EXPIRATION: { title: "카드 유효기간을 확인해 주세요", tip: "유효기간이 지났거나 잘못 입력됐어요.", icon: "fa-calendar-xmark" },
    EXCEED_MAX_DAILY_PAYMENT_COUNT: { title: "오늘 결제 횟수를 넘었어요", tip: "카드사 하루 결제 횟수 한도에 걸렸어요. 다른 결제수단을 골라 주세요.", icon: "fa-gauge-high" },
    EXCEED_MAX_PAYMENT_AMOUNT: { title: "결제 한도를 넘었어요", tip: "한도를 확인하거나 다른 결제수단을 골라 주세요.", icon: "fa-gauge-high" },
};

export function PaymentFailWeb({ code, message, orderId }: { code: string; message: string; orderId: string }) {
    const reason = FAIL_REASON[code];
    return (
        <main className="gw-lookup pw-page" data-guest-web="pay-fail" data-payment-status="test_failed">
            <section className="gw-done pw-state" data-tone="rose" aria-labelledby="pw-fail-title">
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img src={`${UI}goods-pay-none-256.webp`} alt="" aria-hidden="true" />
                <span className="gw-kicker">PAYMENT NOT COMPLETED</span>
                <h1 id="pw-fail-title">결제가 <span className="gw-hl">완료되지 않았어요</span></h1>
                <p>걱정 마세요. 돈은 빠져나가지 않았고, 장바구니 상품도 그대로예요.</p>

                {/* 까닭 — 아는 코드는 쉬운 말, 모르는 코드는 받은 메시지 */}
                <div className="pw-why">
                    <span className="pw-why-i" aria-hidden="true"><i className={`fa-solid ${reason?.icon ?? "fa-circle-exclamation"}`} /></span>
                    <span>
                        <b>{reason?.title ?? "결제가 끝나지 않았어요"}</b>
                        <small>{reason?.tip ?? message}</small>
                        {reason && message && <small className="pw-why-raw">결제사 메시지 · {message}</small>}
                    </span>
                </div>
                <dl className="pw-codes">
                    <div><dt>오류 코드</dt><dd>{code}</dd></div>
                    {orderId && <div><dt>주문번호</dt><dd>{orderId}</dd></div>}
                </dl>

                <ul>
                    <li><i className="fa-solid fa-flask" aria-hidden="true" /><span>테스트 결제라 실제 출금 · 배송은 일어나지 않아요.</span></li>
                    <li><i className="fa-solid fa-arrows-rotate" aria-hidden="true" /><span>장바구니에서 고른 상품 그대로 바로 다시 결제할 수 있어요.</span></li>
                </ul>
                <div className="gw-done-go">
                    <Link href="/checkout" className="gw-go"><i className="fa-solid fa-credit-card" aria-hidden="true" />다시 결제하기</Link>
                    <Link href="/cart" className="gw-go is-soft">장바구니 확인</Link>
                </div>
                <Link href="/inquiry" className="gw-link pw-help">결제가 계속 안 되면 1:1 문의</Link>
            </section>
        </main>
    );
}
