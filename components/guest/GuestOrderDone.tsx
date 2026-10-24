/**
 * GuestOrderDone — 비회원 결제 완료 화면(2026-10-25)
 * ---------------------------------------------------------------------
 * 결제창에서 돌아와 비회원 결제 확인이 끝나면(app/checkout/toss/success) 웹에서 보여 줌.
 *  축하 그림 · "주문이 완료됐어요, ○○님!" · 주문번호 표(복사) · 기억할 것 셋(메일 · 조회 방법 · 송장) ·
 *  주문 조회하기 · 쇼핑 계속하기 · 다음엔 회원으로(20C)
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import "@/app/guest-web.css";

const UI = "/images/ui/";

export default function GuestOrderDone({ orderId, amount, buyerName, email }: { orderId: string; amount: number; buyerName: string; email: string }) {
    const [copied, setCopied] = useState(false);
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
        <main className="gw-lookup" data-guest-web="done">
            <section className="gw-done" aria-labelledby="gw-done-title">
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img src={`${UI}daily-hero-treasure-384.webp`} alt="" aria-hidden="true" />
                <span className="gw-kicker">THANK YOU</span>
                <h1 id="gw-done-title">주문이 완료됐어요, <span className="gw-hl">{buyerName || "고객"}</span>님!</h1>
                <p>{amount.toLocaleString("ko-KR")}원 결제가 확인됐어요. 아래 주문번호로 언제든 주문을 확인할 수 있어요.</p>

                <div className="gw-ticket">
                    <small>주문번호</small>
                    <b>{orderId}</b>
                    <button type="button" className="gw-pill" onClick={() => void copy()}>
                        <i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" />{copied ? "복사했어요" : "주문번호 복사"}
                    </button>
                </div>

                <ul>
                    <li><i className="fa-solid fa-envelope-open-text" aria-hidden="true" /><span>주문 완료 메일을 {email || "주문할 때 넣은 이메일"}로 보내 드려요.</span></li>
                    <li><i className="fa-solid fa-key" aria-hidden="true" /><span>비회원 주문 조회에서 주문번호와 주문 조회 비밀번호로 배송 · 취소 · 교환 · 반품 · 문의를 할 수 있어요.</span></li>
                    <li><i className="fa-solid fa-truck-fast" aria-hidden="true" /><span>상품이 발송되면 조회 화면에서 택배사와 송장 번호를 볼 수 있어요.</span></li>
                </ul>

                <div className="gw-done-go">
                    <Link href="/order-lookup" className="gw-go"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" />주문 조회하기</Link>
                    <Link href="/products" className="gw-go is-soft">쇼핑 계속하기</Link>
                </div>
            </section>

            <section className="gw-join" aria-label="회원가입 안내">
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img src={`${UI}goods-pay-ready-256.webp`} alt="" aria-hidden="true" />
                <span><b>다음엔 회원으로 주문해 보세요</b><small>주문 내역이 마이페이지에 모이고, 가입 혜택 코인 20C도 받아요.</small></span>
                <Link href="/auth/signup" className="gw-pill is-lav">회원가입<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
            </section>
        </main>
    );
}
