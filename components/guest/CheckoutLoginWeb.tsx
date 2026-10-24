/**
 * CheckoutLoginWeb — 웹 "주문 로그인"(2026-10-25 사용자 "구매할 때의 로그인은 일반 로그인 창과 다르게, 회원 · 비회원 갈림길")
 * ---------------------------------------------------------------------
 * /auth/login?redirect=/checkout… 로 들어왔을 때 웹에서만 이 화면(앱 · 일반 로그인은 기존 화면 그대로).
 * 로그인 값 · 로그인 동작(submit) · 간편로그인은 app/auth/login/page.tsx 것 그대로 넘겨받음.
 *  1) 머리: 손글씨 ORDER · "주문하기 전에, 어떻게 주문할까요?" · 담은 상품 미니 카드(사진 · 개수 · 금액)
 *  2) 회원으로 주문(흰 카드): 이메일 · 비밀번호 · 로그인하고 주문하기 · 비밀번호 찾기 · 간편로그인 · 회원 혜택 칩
 *  3) 비회원으로 주문(크림 카드): 진행 순서 넷 · 알아 둘 것 · 비회원으로 주문하기(이 탭에 "비회원 주문 중" 표시 후 주문서로)
 *     비회원 결제가 아직 연결 전이면 "결제 연동 준비 중" 표시와 함께 주문서까지만 볼 수 있다고 정직하게 안내
 *  4) 아래 띠: 회원가입(20C) · 비회원 주문 조회
 */
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import "@/app/guest-web.css";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import BrandLogo from "@/components/header/BrandLogo";
import { useLiveInventorySnapshot } from "@/lib/catalog/live-inventory";
import { guestOrderEnabled, setGuestCheckoutMode } from "@/lib/guest-order";
import { useI18n } from "@/lib/i18n";
import { cartProducts } from "@/lib/shop";
import { useCart } from "@/lib/store";

const UI = "/images/ui/";

type Props = {
    email: string;
    setEmail: (value: string) => void;
    password: string;
    setPassword: (value: string) => void;
    showPw: boolean;
    setShowPw: (value: boolean) => void;
    error: string;
    loading: boolean;
    apiReady: boolean | null;
    submit: (event: FormEvent) => void;
    /** 주문서로 돌아갈 주소(/checkout…) */
    checkoutRedirect: string;
    signupHref: string;
};

export default function CheckoutLoginWeb(props: Props) {
    const router = useRouter();
    const cart = useCart();
    const liveInventory = useLiveInventorySnapshot();
    const { formatPrice } = useI18n();
    const lines = cartProducts(cart.lines, liveInventory).filter((line) => line.selected);
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const count = lines.reduce((sum, line) => sum + line.qty, 0);
    const guestReady = guestOrderEnabled();

    const goGuest = () => {
        setGuestCheckoutMode(true);
        router.push(props.checkoutRedirect);
    };

    return (
        <div className="gw-page" data-guest-web="order-login">
            <header className="gw-topbar">
                <BrandLogo />
                <Link href="/cart" className="gw-back"><i className="fa-solid fa-chevron-left" aria-hidden="true" />장바구니로</Link>
            </header>

            <main className="gw-wrap">
                {/* 1) 머리 */}
                <section className="gw-hero" aria-labelledby="gw-ol-title">
                    <span className="gw-hero-text">
                        <span className="gw-kicker">ORDER</span>
                        <h1 id="gw-ol-title">주문하기 전에, <span className="gw-hl">어떻게</span> 주문할까요?</h1>
                        <p>회원으로 주문하면 저장된 배송지를 불러오고, 주문 · 배송을 마이페이지에서 바로 볼 수 있어요.</p>
                    </span>
                    {count > 0 && (
                        <span className="gw-cartmini" aria-label={`담은 상품 ${count}개 · ${formatPrice(total)}`}>
                            <span className="gw-cartmini-thumbs" aria-hidden="true">
                                {lines.slice(0, 3).map((line) => (
                                    <span key={`${line.product.id}-${line.color ?? ""}-${line.size ?? ""}`}>
                                        {line.image ? <Image src={line.image} alt="" fill sizes="44px" className="object-cover" /> : <i className={`fa-solid ${line.product.icon}`} />}
                                    </span>
                                ))}
                            </span>
                            <span className="gw-cartmini-text">
                                <small>담은 상품 {count}개</small>
                                <b>{formatPrice(total)}</b>
                            </span>
                        </span>
                    )}
                </section>

                <div className="gw-ways">
                    {/* 2) 회원으로 주문 */}
                    <section className="gw-way is-member" aria-labelledby="gw-member-title">
                        <header className="gw-way-head">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}stickers/my-profile.webp`} alt="" aria-hidden="true" />
                            <span>
                                <h2 id="gw-member-title">회원으로 주문</h2>
                                <small>로그인하고 바로 주문서로 가요</small>
                            </span>
                        </header>
                        {props.apiReady === false && <p className="gw-msg is-warn"><i className="fa-solid fa-screwdriver-wrench" aria-hidden="true" />지금은 회원 로그인을 준비 중이에요. 잠시 후 다시 이용해 주세요.</p>}
                        {props.error && <p className="gw-msg is-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{props.error}</p>}
                        <form className="gw-form" onSubmit={props.submit}>
                            <label className="gw-field">
                                <span>이메일</span>
                                <span className="gw-inwrap">
                                    <i className="fa-solid fa-user" aria-hidden="true" />
                                    <input className="gw-in" type="email" value={props.email} onChange={(event) => props.setEmail(event.target.value)} placeholder="이메일 또는 아이디" autoComplete="email" required />
                                </span>
                            </label>
                            <label className="gw-field">
                                <span>비밀번호</span>
                                <span className="gw-inwrap">
                                    <i className="fa-solid fa-lock" aria-hidden="true" />
                                    <input className="gw-in" type={props.showPw ? "text" : "password"} value={props.password} onChange={(event) => props.setPassword(event.target.value)} placeholder="비밀번호" autoComplete="current-password" />
                                    <button type="button" className="gw-eye" onClick={() => props.setShowPw(!props.showPw)} aria-label={props.showPw ? "비밀번호 숨기기" : "비밀번호 보기"} aria-pressed={props.showPw}>
                                        <i className={props.showPw ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} aria-hidden="true" />
                                    </button>
                                </span>
                            </label>
                            <button type="submit" className="gw-go" disabled={props.loading}>
                                {props.loading ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />로그인하는 중</> : <>로그인하고 주문하기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></>}
                            </button>
                            <Link href="/forgot-password" className="gw-link">비밀번호를 잊으셨나요?</Link>
                        </form>
                        <p className="gw-or"><span>간편 로그인</span></p>
                        <SocialAuthButtons mode="login" variant="compact" returnTo={props.checkoutRedirect} />
                        <ul className="gw-perks" aria-label="회원 혜택">
                            <li><i className="fa-solid fa-location-dot" aria-hidden="true" />저장된 배송지 불러오기</li>
                            <li><i className="fa-solid fa-receipt" aria-hidden="true" />주문 · 배송 한눈에</li>
                            <li><i className="fa-solid fa-coins" aria-hidden="true" />코인 · 맞춤 추천</li>
                        </ul>
                    </section>

                    {/* 3) 비회원으로 주문 */}
                    <section className="gw-way is-guest" aria-labelledby="gw-guest-title">
                        <header className="gw-way-head">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}header-cart-128.webp`} alt="" aria-hidden="true" />
                            <span>
                                <h2 id="gw-guest-title">비회원으로 주문</h2>
                                <small>가입 없이 이번 주문만 해요</small>
                            </span>
                            {!guestReady && <em className="gw-tag"><i className="fa-solid fa-plug" aria-hidden="true" />결제 연동 준비 중</em>}
                        </header>
                        <ol className="gw-flow">
                            <li><b>1</b><span><strong>주문자 정보</strong><small>이름 · 휴대폰 · 이메일</small></span></li>
                            <li><b>2</b><span><strong>주문 조회 비밀번호</strong><small>주문을 다시 볼 때 써요</small></span></li>
                            <li><b>3</b><span><strong>배송지 · 결제</strong><small>토스 보안 결제창</small></span></li>
                            <li><b>4</b><span><strong>주문번호로 조회</strong><small>배송 확인 · 취소 · 문의</small></span></li>
                        </ol>
                        <ul className="gw-notes">
                            <li><i className="fa-solid fa-key" aria-hidden="true" />주문번호와 주문 조회 비밀번호를 꼭 기억해 주세요.</li>
                            <li><i className="fa-solid fa-gift" aria-hidden="true" />코인 적립 · 맞춤 추천 · 저장 배송지는 회원만 쓸 수 있어요.</li>
                        </ul>
                        <button type="button" className="gw-go is-soft" onClick={goGuest} data-guest-checkout-start>
                            <i className="fa-solid fa-bag-shopping" aria-hidden="true" />비회원으로 주문하기
                        </button>
                        {!guestReady && <p className="gw-hint">지금은 주문서까지 볼 수 있고, 결제는 회원 로그인 뒤에 열려요. 비회원 결제는 곧 열려요.</p>}
                    </section>
                </div>

                {/* 4) 아래 띠 */}
                <section className="gw-strip" aria-label="회원가입 · 비회원 주문 조회">
                    <span className="gw-strip-join">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}goods-pay-ready-256.webp`} alt="" aria-hidden="true" />
                        <span><b>1분 회원가입하고 20C 받기</b><small>가입 후 이메일을 인증하면 코인 20C가 들어와요</small></span>
                        <Link href={props.signupHref} className="gw-pill is-lav">회원가입<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                    </span>
                    <Link href="/order-lookup" className="gw-strip-lookup">
                        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                        <span><b>비회원 주문 조회</b><small>주문번호 · 조회 비밀번호로 확인</small></span>
                        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    </Link>
                </section>
            </main>
        </div>
    );
}
