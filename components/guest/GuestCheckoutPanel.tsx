/**
 * GuestCheckoutPanel — 웹 주문서의 비회원 칸(2026-10-25)
 * ---------------------------------------------------------------------
 * 로그인하지 않은 채 주문서(/checkout)에 오면:
 *  - 아직 안 골랐으면 GuestChooser: "회원으로 주문(로그인) / 비회원으로 계속" 두 갈래
 *  - 비회원으로 계속을 골랐으면 GuestBuyerForm: 주문하는 분(이름 · 휴대폰 · 이메일) · 주문 조회 비밀번호(규칙 · 확인) ·
 *    [필수] 비회원 주문 개인정보 수집 · 이용 동의(내용 펼쳐 보기) · "받는 분도 같아요"(배송지에 이름 · 연락처 채우기)
 *  - GuestPayBox: 주문 요약 옆 결제 안내 — 비회원 결제가 연결 전이면 "준비 중"과 로그인 · 회원가입 단추(정직하게)
 * 값 검사 · 저장은 lib/guest-order.ts. 앱에서는 주문서가 이 부품을 hidden 으로 감싸 보이지 않음.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import {
    formatPhone,
    GUEST_PRIVACY_ROWS,
    guestPasswordRules,
    setGuestCheckoutMode,
    type GuestBuyer,
    type GuestBuyerErrors,
} from "@/lib/guest-order";

const UI = "/images/ui/";

/** 회원 / 비회원 고르기 */
export function GuestChooser({ loginHref }: { loginHref: string }) {
    return (
        <div className="gw-choose" role="group" aria-label="주문 방법">
            <p><i className="fa-solid fa-circle-question" aria-hidden="true" />어떻게 주문할까요?</p>
            <Link href={loginHref}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img src={`${UI}stickers/my-profile.webp`} alt="" aria-hidden="true" />
                <span><b>회원으로 주문</b><small>로그인하면 저장된 배송지를 불러와요</small></span>
                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </Link>
            <button type="button" onClick={() => setGuestCheckoutMode(true)} data-guest-checkout-start>
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img src={`${UI}header-cart-128.webp`} alt="" aria-hidden="true" />
                <span><b>비회원으로 계속</b><small>가입 없이 이번 주문만 해요</small></span>
                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
        </div>
    );
}

/** 비회원 주문자 정보 */
export function GuestBuyerForm({ buyer, onChange, errors, loginHref, onCopyToDelivery, disabled }: {
    buyer: GuestBuyer;
    onChange: (next: GuestBuyer) => void;
    errors: GuestBuyerErrors;
    loginHref: string;
    /** 받는 분도 같아요 — 배송지 이름 · 연락처 채우기 */
    onCopyToDelivery: () => void;
    disabled?: boolean;
}) {
    const [showTerms, setShowTerms] = useState(false);
    const rules = guestPasswordRules(buyer.lookupPassword);
    const matchOk = Boolean(buyer.lookupPasswordConfirm) && buyer.lookupPasswordConfirm === buyer.lookupPassword;
    const set = <K extends keyof GuestBuyer>(key: K, value: GuestBuyer[K]) => onChange({ ...buyer, [key]: value });

    return (
        <section className="gw-buyer" aria-labelledby="gw-buyer-title" data-guest-buyer>
            <header className="gw-buyer-head">
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img src={`${UI}header-cart-128.webp`} alt="" aria-hidden="true" />
                <span>
                    <h2 id="gw-buyer-title">주문하는 분 <small className="gw-tag is-sky">비회원</small></h2>
                    <small>주문 확인 메일과 배송 안내를 받을 정보예요.</small>
                </span>
                <button type="button" onClick={() => setGuestCheckoutMode(false)} aria-label="주문 방법 다시 고르기">방법 바꾸기</button>
            </header>

            <div className="gw-grid">
                <label className="gw-field">
                    <span>이름</span>
                    <input id="guest-buyer-name" className="gw-in" value={buyer.name} onChange={(event) => set("name", event.target.value)} autoComplete="name" maxLength={40} placeholder="예: 김댕댕" aria-invalid={Boolean(errors.name)} disabled={disabled} />
                    {errors.name && <span className="gw-err">{errors.name}</span>}
                </label>
                <label className="gw-field">
                    <span>휴대폰</span>
                    <input id="guest-buyer-phone" className="gw-in" value={buyer.phone} onChange={(event) => set("phone", formatPhone(event.target.value))} autoComplete="tel" inputMode="tel" placeholder="010-1234-5678" aria-invalid={Boolean(errors.phone)} disabled={disabled} />
                    {errors.phone && <span className="gw-err">{errors.phone}</span>}
                </label>
                <label className="gw-field is-wide">
                    <span>이메일 <small>주문 확인 · 영수증을 보내 드려요</small></span>
                    <input id="guest-buyer-email" className="gw-in" type="email" value={buyer.email} onChange={(event) => set("email", event.target.value)} autoComplete="email" inputMode="email" placeholder="daeng@example.com" aria-invalid={Boolean(errors.email)} disabled={disabled} />
                    {errors.email && <span className="gw-err">{errors.email}</span>}
                </label>
                <span className="is-wide">
                    <button type="button" className="gw-pill" onClick={onCopyToDelivery} disabled={disabled || !buyer.name.trim() || !buyer.phone.trim()}>
                        <i className="fa-solid fa-arrow-down" aria-hidden="true" />받는 분도 같아요 · 배송지에 채우기
                    </button>
                </span>
            </div>

            <div className="gw-pwbox">
                <p><i className="fa-solid fa-key" aria-hidden="true" />주문 조회 비밀번호</p>
                <span className="gw-hint">주문번호와 함께 비회원 주문 조회 · 취소 · 문의에 써요. 꼭 기억해 주세요.</span>
                <div className="gw-grid">
                    <label className="gw-field">
                        <span>비밀번호</span>
                        <input id="guest-buyer-lookupPassword" className="gw-in" type="password" value={buyer.lookupPassword} onChange={(event) => set("lookupPassword", event.target.value)} autoComplete="new-password" maxLength={20} placeholder="영문 · 숫자 6~20자" aria-invalid={Boolean(errors.lookupPassword)} disabled={disabled} />
                    </label>
                    <label className="gw-field">
                        <span>비밀번호 확인</span>
                        <span className="gw-inwrap">
                            <input id="guest-buyer-lookupPasswordConfirm" className="gw-in" type="password" value={buyer.lookupPasswordConfirm} onChange={(event) => set("lookupPasswordConfirm", event.target.value)} autoComplete="new-password" maxLength={20} placeholder="한 번 더" aria-invalid={Boolean(errors.lookupPasswordConfirm)} disabled={disabled} />
                            {matchOk && <em className="is-ok">같아요</em>}
                            {buyer.lookupPasswordConfirm && !matchOk && <em className="is-bad">달라요</em>}
                        </span>
                    </label>
                </div>
                <span className="gw-rules">
                    <span className={rules.length ? "is-ok" : ""}><i className={rules.length ? "fa-solid fa-check" : "fa-regular fa-circle"} aria-hidden="true" />6~20자</span>
                    <span className={rules.mix ? "is-ok" : ""}><i className={rules.mix ? "fa-solid fa-check" : "fa-regular fa-circle"} aria-hidden="true" />영문 · 숫자 섞기</span>
                </span>
                {(errors.lookupPassword || errors.lookupPasswordConfirm) && <span className="gw-err">{errors.lookupPassword || errors.lookupPasswordConfirm}</span>}
            </div>

            <div className={buyer.agreePrivacy ? "gw-agree is-on" : "gw-agree"}>
                <label>
                    <input id="guest-buyer-agreePrivacy" type="checkbox" checked={buyer.agreePrivacy} onChange={(event) => set("agreePrivacy", event.target.checked)} disabled={disabled} />
                    <span><span className="gw-req">필수</span> 비회원 주문을 위한 개인정보 수집 · 이용에 동의해요</span>
                </label>
                <button type="button" onClick={() => setShowTerms((value) => !value)} aria-expanded={showTerms}>{showTerms ? "접기" : "내용"}</button>
            </div>
            {showTerms && (
                <div className="gw-terms" role="table" aria-label="비회원 주문 개인정보 수집 · 이용 내용">
                    <div role="row" className="is-head"><span role="columnheader">수집 항목</span><span role="columnheader">이용 목적</span><span role="columnheader">보유 기간</span></div>
                    {GUEST_PRIVACY_ROWS.map((row) => (
                        <div role="row" key={row.item}><span role="cell" data-k="수집">{row.item}</span><span role="cell" data-k="목적">{row.purpose}</span><span role="cell" data-k="보유">{row.retention}</span></div>
                    ))}
                </div>
            )}
            {errors.agreePrivacy && <span className="gw-err">{errors.agreePrivacy}</span>}

            <p className="gw-hint">이미 회원이라면 <Link href={loginHref} className="gw-link">로그인하고 주문</Link>하면 저장된 배송지를 불러오고 코인도 쌓여요.</p>
        </section>
    );
}

/** 주문 요약 옆 — 비회원 결제 안내 */
export function GuestPayBox({ ready, loginHref, signupHref, guestMode }: { ready: boolean; loginHref: string; signupHref: string; guestMode: boolean }) {
    if (guestMode && ready) {
        return (
            <div className="gw-paybox" data-guest-web="paybox">
                <p><i className="fa-solid fa-key" aria-hidden="true" /><span><b>비회원으로 결제해요</b>결제를 마치면 주문번호가 나와요. 주문 조회 비밀번호와 함께 기억해 주세요.</span></p>
            </div>
        );
    }
    return (
        <div className="gw-paybox" data-guest-web="paybox" role="status">
            <p>
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                <span>
                    <b>{guestMode ? "비회원 결제는 준비 중이에요" : "결제는 로그인 뒤에 열려요"}</b>
                    {guestMode ? "지금은 주문서까지 볼 수 있어요. 회원으로 로그인하면 바로 결제할 수 있어요." : "회원으로 로그인하거나, 위에서 비회원 주문을 골라 주세요."}
                </span>
            </p>
            {/* 로그인 · 가입 버튼 줄 — 두 칸 */}
            <span className="gw-paybox-go">
                <Link href={loginHref} className="gw-pill is-pink"><i className="fa-solid fa-right-to-bracket" aria-hidden="true" />로그인</Link>
                <Link href={signupHref} className="gw-pill"><i className="fa-solid fa-user-plus" aria-hidden="true" />회원가입</Link>
            </span>
        </div>
    );
}
