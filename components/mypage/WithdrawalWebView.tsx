/**
 * WithdrawalWebView — 웹 마이페이지 회원 탈퇴 화면(2026-10-24 사용자 "비주얼하고 디테일까지")
 * ---------------------------------------------------------------------
 * 상태값(동의 · 비밀번호 · 확인 문구) · 탈퇴(submit)는 app/mypage/withdrawal/page.tsx 가 넘겨줌 — 기능 그대로, 겉모양만 웹 전용.
 * 앱은 같은 페이지의 기존 화면 그대로(이 부품은 hidden → app/mypage-web.css "회원 탈퇴" 에서만 보임).
 *  1) 머리 판: 떠나시기 전에 · 탈퇴할 계정 카드(이름 · 계정 · 가입 방식)
 *  2) 탈퇴하면 이렇게 돼요: 다시 볼 수 없는 것 칩 넷 · 처리 방식 카드 셋(기존 안내 문구)
 *  3) 혹시 이런 이유라면: 개인정보 수정 · 추천 데이터 끄기 · 문의하기(기존 화면 링크)
 *  4) 마지막 확인: ① 안내 동의 ② 현재 비밀번호(이메일 가입만) ③ "회원 탈퇴" 입력 — 단계마다 완료 표시, 다 되면 확정 버튼 켜짐 · 계속 이용하기
 */
"use client";

import Link from "next/link";
import type { FormEvent } from "react";

type Props = {
    name: string;
    account: string;
    providerLabel: string;
    isPasswordAccount: boolean;
    acknowledged: boolean;
    onAcknowledged: (value: boolean) => void;
    currentPassword: string;
    onCurrentPassword: (value: string) => void;
    confirmation: string;
    onConfirmation: (value: string) => void;
    ready: boolean;
    submitting: boolean;
    error: string;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const LOST = [
    { icon: "fa-dog", label: "반려견 프로필" },
    { icon: "fa-chart-line", label: "분석 기록" },
    { icon: "fa-comments", label: "커뮤니티 활동" },
    { icon: "fa-right-from-bracket", label: "모든 로그인 세션" },
];

const HANDLING = [
    { art: "/images/ui/stickers/login-lock.webp", tone: "pink", title: "계정은 즉시 잠겨요", text: "로그인 계정과 간편로그인 연결 정보는 즉시 비활성화 · 가명화됩니다." },
    { art: "/images/ui/web-cs-mail-256.webp", tone: "lav", title: "알림 메일은 멈춰요", text: "마케팅 이메일 수신 동의는 철회되고 재발송 방지 기록만 남습니다." },
    { art: "/images/ui/policy-info-192.webp", tone: "sky", title: "법정 기록만 따로 보관해요", text: "결제 · 계약 · 분쟁 기록은 관계 법령상 기간 동안 다른 정보와 분리 보관 후 파기합니다." },
];

export default function WithdrawalWebView(props: Props) {
    const { isPasswordAccount, acknowledged, currentPassword, confirmation, ready, submitting, error } = props;
    const typedOk = confirmation === "회원 탈퇴";
    const steps = [
        { done: acknowledged },
        ...(isPasswordAccount ? [{ done: Boolean(currentPassword) }] : []),
        { done: typedOk },
    ];
    const doneCount = steps.filter((step) => step.done).length;

    return (
        <div className="hidden" data-wd-web>
            {/* 1) 머리 판 */}
            <section className="wd-hero" aria-labelledby="wd-hero-title">
                <div className="wd-hero-text">
                    <p className="wd-kicker">BEFORE YOU GO</p>
                    <h2 id="wd-hero-title">떠나시기 전에 <span>꼭 확인해 주세요</span></h2>
                    <p>탈퇴하면 되돌릴 수 없어요. 아래 내용을 확인하고, 마지막 단계에서 탈퇴를 확정할 수 있어요.</p>
                </div>
                <div className="wd-account" aria-label="탈퇴 대상 계정">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src="/images/ui/stickers/my-profile.webp" alt="" aria-hidden="true" />
                    <span className="wd-account-text">
                        <small>탈퇴 대상 계정</small>
                        <b>{props.name}</b>
                        <em>{props.account}</em>
                    </span>
                    <span className="wd-provider">{props.providerLabel}</span>
                </div>
            </section>

            {/* 2) 탈퇴하면 이렇게 돼요 */}
            <section className="wd-sec" aria-labelledby="wd-what-title">
                <h2 id="wd-what-title" className="wd-h"><span><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /></span>탈퇴하면 이렇게 돼요</h2>
                <div className="wd-lost">
                    <p>다시 볼 수 없어요</p>
                    <ul>
                        {LOST.map((item) => <li key={item.label}><i className={`fa-solid ${item.icon}`} aria-hidden="true" />{item.label}</li>)}
                    </ul>
                </div>
                <ul className="wd-handling">
                    {HANDLING.map((item) => (
                        <li key={item.title} data-tone={item.tone}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={item.art} alt="" aria-hidden="true" />
                            <b>{item.title}</b>
                            <small>{item.text}</small>
                        </li>
                    ))}
                </ul>
            </section>

            {/* 3) 혹시 이런 이유라면 */}
            <section className="wd-sec wd-alt" aria-labelledby="wd-alt-title">
                <h2 id="wd-alt-title" className="wd-h"><span><i className="fa-solid fa-lightbulb" aria-hidden="true" /></span>혹시 이런 이유라면, 탈퇴 대신</h2>
                <div className="wd-alt-links">
                    <Link href="/mypage/profile/" data-tone="mint">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src="/images/ui/stickers/my-profile.webp" alt="" aria-hidden="true" />
                        <span><b>정보를 바꾸고 싶어요</b><small>개인정보 확인/수정</small></span>
                    </Link>
                    <Link href="/mypage/recommendations/" data-tone="lav">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src="/images/ui/stickers/my-recommend.webp" alt="" aria-hidden="true" />
                        <span><b>맞춤 추천이 부담돼요</b><small>추천 데이터 끄기</small></span>
                    </Link>
                    <Link href="/inquiry/?category=other#inquiry-form" data-tone="sky">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src="/images/ui/web-cs-inquiry-160.webp" alt="" aria-hidden="true" />
                        <span><b>불편한 점이 있었어요</b><small>1:1 문의 남기기</small></span>
                    </Link>
                </div>
            </section>

            {/* 4) 마지막 확인 */}
            <form className="wd-sec wd-final" onSubmit={props.onSubmit} aria-labelledby="wd-final-title">
                <div className="wd-final-head">
                    <h2 id="wd-final-title" className="wd-h"><span><i className="fa-solid fa-lock" aria-hidden="true" /></span>마지막 확인</h2>
                    <span className="wd-progress" aria-live="polite">{doneCount}/{steps.length} 완료</span>
                </div>

                <ol className="wd-steps">
                    <li className={acknowledged ? "is-done" : ""}>
                        <span className="wd-no" aria-hidden="true">{acknowledged ? <i className="fa-solid fa-check" /> : 1}</span>
                        <label className="wd-check">
                            <input type="checkbox" checked={acknowledged} onChange={(event) => props.onAcknowledged(event.target.checked)} />
                            <span>위 내용을 확인했으며 법정 보존 대상 정보가 정해진 기간 동안 분리 보관되는 데 동의합니다.</span>
                        </label>
                    </li>
                    {isPasswordAccount && (
                        <li className={currentPassword ? "is-done" : ""}>
                            <span className="wd-no" aria-hidden="true">{currentPassword ? <i className="fa-solid fa-check" /> : 2}</span>
                            <label className="wd-field">
                                <span>현재 비밀번호</span>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(event) => props.onCurrentPassword(event.target.value)}
                                    autoComplete="current-password"
                                    className="input"
                                    placeholder="본인 확인을 위해 입력"
                                />
                            </label>
                        </li>
                    )}
                    <li className={typedOk ? "is-done" : ""}>
                        <span className="wd-no" aria-hidden="true">{typedOk ? <i className="fa-solid fa-check" /> : isPasswordAccount ? 3 : 2}</span>
                        <label className="wd-field">
                            <span>확인 문구 — <b>회원 탈퇴</b> 를 그대로 입력해 주세요</span>
                            <span className="wd-type">
                                <input
                                    value={confirmation}
                                    onChange={(event) => props.onConfirmation(event.target.value)}
                                    className="input"
                                    placeholder="회원 탈퇴"
                                    autoComplete="off"
                                    aria-invalid={Boolean(confirmation) && !typedOk}
                                />
                                {confirmation && <em className={typedOk ? "is-ok" : ""}>{typedOk ? "일치해요" : "문구가 달라요"}</em>}
                            </span>
                        </label>
                    </li>
                </ol>

                {error && <p className="wd-error" role="alert">{error}</p>}

                <div className="wd-actions">
                    <Link href="/mypage/" className="wd-stay"><i className="fa-solid fa-heart" aria-hidden="true" />계속 이용하기</Link>
                    <button type="submit" className="wd-leave" disabled={!ready || submitting}>
                        {submitting ? "탈퇴 처리 중…" : "회원 탈퇴 확정"}
                    </button>
                </div>
                <p className="wd-foot">탈퇴 처리 기준은 <Link href="/privacy">개인정보처리방침</Link>에서 확인할 수 있어요.</p>
            </form>
        </div>
    );
}
