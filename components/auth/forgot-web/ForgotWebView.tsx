/**
 * ForgotWebView — 웹 비밀번호 찾기(/forgot-password) 화면 · 2026-10-25
 * ---------------------------------------------------------------------
 * 회원가입과 같은 틀(SxShell: 분홍 머리 판 · 단계 줄 · 흰 쿠션 카드)로 네 단계를 보여 줌.
 *  ① 이메일 확인 : 가입 이메일 · 보안 확인(기존 SignupBotChallenge) · "이런 경우엔 달라요"(간편가입 · 이메일 기억 안 남)
 *  ② 인증번호   : 보낸 주소 · 남은 시간 둥근 막대 · 6칸 숫자 칸(실제 입력은 한 칸 — 키보드 · 붙여넣기 · 자동 채움 그대로) ·
 *                 다시 받기(대기 초 · 보안 확인) · 메일이 안 올 때
 *  ③ 새 비밀번호 : 강도 막대 · 규칙 칩 · 같아요/달라요 · 보기 단추 · 안전 팁
 *  ④ 완료        : 축하 그림 · 다음에 할 것 · 로그인하기
 * 동작 · 값 · 서버 요청은 모두 app/(auth)/forgot-password/ForgotForm.tsx 그대로(이 파일은 그 상태와 함수를 받아 그리기만 함).
 * 웹(html:not(.ddb-app-mode))에서만 그려짐 — 앱은 기존 화면 그대로.
 */
"use client";

import Link from "next/link";
import type { FormEvent, RefObject } from "react";
import { useState } from "react";
import SignupBotChallenge from "@/components/auth/SignupBotChallenge";
import { Hl, SxBlock, SxCard, SxFoot, SxHead, SxNotice, SxShell, UI, useScrollTopOn, type SxStep } from "@/components/auth/signup-web/SignupWebParts";
import { maskEmail } from "@/lib/signup-flow";
import "@/app/signup-web.css";
import "@/app/forgot-web.css";

export type ForgotStep = "email" | "code" | "password" | "done";

export type ForgotWebProps = {
    step: ForgotStep;
    apiReady: boolean | null;
    challengeConfigured: boolean;
    email: string;
    setEmail: (value: string) => void;
    code: string;
    setCode: (value: string) => void;
    codeRef: RefObject<HTMLInputElement | null>;
    newPassword: string;
    setNewPassword: (value: string) => void;
    confirmPassword: string;
    setConfirmPassword: (value: string) => void;
    botToken: string;
    setBotToken: (value: string) => void;
    challengeResetKey: number;
    resendSeconds: number;
    expirySeconds: number;
    /** 인증번호 유효 시간 전체(초) — 남은 시간 막대 비율 */
    expiryTotal: number;
    loading: boolean;
    notice: string;
    error: string;
    sendCode: (event?: FormEvent) => void;
    verifyCode: (event: FormEvent) => void;
    setPassword: (event: FormEvent) => void;
    restart: () => void;
};

/** 단계 줄 — 이메일(하늘) · 인증번호(연보라) · 새 비밀번호(민트) · 완료(분홍) */
const FORGOT_STEPS: SxStep[] = [
    { label: "이메일 확인", desc: "가입한 이메일", icon: "fa-envelope", tone: "sky" },
    { label: "인증번호", desc: "메일로 받은 6자리", icon: "fa-hashtag", tone: "lav" },
    { label: "새 비밀번호", desc: "새로 정하기", icon: "fa-key", tone: "mint" },
    { label: "완료", desc: "다시 로그인", icon: "fa-circle-check", tone: "pink" },
];
const STEP_INDEX: Record<ForgotStep, number> = { email: 0, code: 1, password: 2, done: 3 };

const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** 비밀번호 강도 0~3(회원가입과 같은 기준) */
function passwordScore(value: string) {
    if (value.length < 8) return value ? 1 : 0;
    let score = 1;
    if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) score += 1;
    return score;
}

function mmss(seconds: number) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function ForgotWebView(props: ForgotWebProps) {
    const { step } = props;
    const now = STEP_INDEX[step];
    useScrollTopOn(step);

    const leads: Record<ForgotStep, string> = {
        email: "가입한 이메일로 인증번호를 보내 드려요. 확인이 끝나면 새 비밀번호를 정할 수 있어요.",
        code: "메일함을 열어 댕다방이 보낸 인증번호 6자리를 확인해 주세요.",
        password: "이제 앞으로 쓸 새 비밀번호를 정해 주세요.",
        done: "비밀번호를 새로 정했어요. 새 비밀번호로 로그인해 주세요.",
    };

    return (
        <main className="sxw" data-forgot-web={step}>
            <SxShell
                steps={FORGOT_STEPS}
                now={now}
                lead={leads[step]}
                kicker="FIND MY PASSWORD"
                title="비밀번호 찾기"
                art="stickers/login-lock.webp"
                stepsLabel="비밀번호 찾기 단계"
                footer={step === "done" ? null : (
                    <p className="sxw-login">비밀번호가 생각났나요?<Link href="/auth/login">로그인</Link></p>
                )}
            >
                {step === "email" && <EmailCard {...props} />}
                {step === "code" && <CodeCard {...props} />}
                {step === "password" && <PasswordCard {...props} />}
                {step === "done" && <DoneCard />}
            </SxShell>
        </main>
    );
}

/** 알림 묶음 — 준비 중(노랑) · 안내(민트) · 오류(장미) */
function Notices({ apiReady, notice, error }: Pick<ForgotWebProps, "apiReady" | "notice" | "error">) {
    return (
        <>
            {apiReady === false && (
                <SxNotice tone="amber" icon="fa-screwdriver-wrench" title="지금은 본인 확인을 준비 중이에요">잠시 후 다시 이용해 주세요.</SxNotice>
            )}
            {notice && <SxNotice tone="mint" icon="fa-circle-check">{notice}</SxNotice>}
            {error && <SxNotice tone="rose" icon="fa-circle-exclamation">{error}</SxNotice>}
        </>
    );
}

/* ───────── ① 이메일 확인 ───────── */
function EmailCard(props: ForgotWebProps) {
    const { email, setEmail, loading, apiReady, challengeConfigured, botToken } = props;
    const emailOk = EMAIL_RE.test(email.trim());
    const canSend = !loading && apiReady === true && challengeConfigured && Boolean(botToken) && Boolean(email.trim());
    // 단추가 꺼진 까닭을 한 줄로(무엇을 하면 켜지는지)
    const waitReason = apiReady !== true
        ? "본인 확인 서비스가 열리면 보낼 수 있어요."
        : !email.trim()
            ? "가입한 이메일을 넣어 주세요."
            : !botToken
                ? "아래 보안 확인을 마치면 보낼 수 있어요."
                : "";

    return (
        <SxCard as="form" labelledBy="fx-email-title" screen="forgot-email" onSubmit={(event) => props.sendCode(event)}>
            <SxHead
                id="fx-email-title"
                art="lab-mail-160.webp"
                kicker="STEP 1 · EMAIL"
                title={<><Hl>가입한 이메일</Hl>을 알려 주세요</>}
                sub="그 주소로 인증번호 6자리를 보내 드려요."
            />
            <Notices apiReady={props.apiReady} notice={props.notice} error={props.error} />

            <SxBlock icon="fa-envelope" title="가입 이메일" tone="sky">
                <div className="sxw-form">
                    <label className="sxw-f is-wide">
                        <span className="sxw-label">이메일 <small>로그인할 때 쓰던 주소</small></span>
                        <span className={`sxw-inwrap${emailOk ? " is-ok" : ""}`}>
                            <input
                                className="sxw-in"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                autoComplete="email"
                                inputMode="email"
                                required
                                placeholder="daeng@example.com"
                            />
                            {emailOk && <em className="is-ok">좋아요</em>}
                        </span>
                    </label>
                    <p className="sxw-f-tip is-wide">
                        <i className="fa-solid fa-shield-heart" aria-hidden="true" />
                        개인정보 보호를 위해 가입 여부는 알려 드리지 않아요. 가입된 이메일이면 인증번호가 도착해요.
                    </p>
                </div>
                {/* 보안 확인(자동 요청 막기) — 회원가입과 같은 칸 */}
                <div className="sxw-bot">
                    <SignupBotChallenge
                        action="password_reset"
                        title="본인 확인 보호"
                        description="자동 요청을 막기 위한 확인이에요. 확인이 끝나면 받기 단추가 켜져요."
                        unavailableMessage="본인 확인 보호 기능을 준비 중입니다. 잠시 후 다시 이용해 주세요."
                        onTokenChange={props.setBotToken}
                        resetKey={props.challengeResetKey}
                    />
                </div>
            </SxBlock>

            {/* 이런 경우엔 달라요 — 간편가입 회원 · 이메일이 기억나지 않을 때 */}
            <div className="fx-cases" aria-label="이런 경우엔 달라요">
                <Link href="/auth/login" className="fx-case" data-tone="yellow">
                    <span className="fx-case-art" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}header-login-128.webp`} alt="" />
                    </span>
                    <span>
                        <b>간편가입으로 가입했어요</b>
                        <small>카카오 · 네이버 · 구글 회원은 비밀번호가 없어요. 그 단추로 로그인해 주세요.</small>
                    </span>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </Link>
                <Link href="/inquiry" className="fx-case" data-tone="mint">
                    <span className="fx-case-art" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}stickers/cs-inquiry.webp`} alt="" />
                    </span>
                    <span>
                        <b>이메일이 기억나지 않아요</b>
                        <small>1:1 문의에 이름과 주문 정보를 남기면 본인 확인 뒤 도와드려요.</small>
                    </span>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </Link>
            </div>

            <SxFoot hint={waitReason || undefined}>
                <button type="submit" className="sxw-next" disabled={!canSend}>
                    {loading ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />보내는 중</> : <>인증번호 받기<i className="fa-solid fa-paper-plane" aria-hidden="true" /></>}
                </button>
            </SxFoot>
        </SxCard>
    );
}

/* ───────── ② 인증번호 ───────── */
function CodeCard(props: ForgotWebProps) {
    const { code, setCode, codeRef, loading, resendSeconds, expirySeconds, expiryTotal, email } = props;
    const [focused, setFocused] = useState(false);
    const ratio = expiryTotal > 0 ? Math.max(0, Math.min(1, expirySeconds / expiryTotal)) : 0;
    const urgent = expirySeconds > 0 && expirySeconds <= 60;
    const cells = Array.from({ length: 6 }, (_, index) => code[index] || "");
    const activeIndex = Math.min(code.length, 5);

    return (
        <SxCard as="form" labelledBy="fx-code-title" screen="forgot-code" onSubmit={(event) => props.verifyCode(event)}>
            <SxHead
                id="fx-code-title"
                art="treasure-safe-default-256.webp"
                kicker="STEP 2 · CODE"
                title={<><Hl>인증번호 6자리</Hl>를 넣어 주세요</>}
                sub={<>메일 제목에 <b>댕다방</b>이 들어 있어요.</>}
            />
            <Notices apiReady={props.apiReady} notice={props.notice} error={props.error} />

            {/* 보낸 주소 + 남은 시간(둥근 막대) */}
            <div className={`fx-sent${urgent ? " is-urgent" : ""}`}>
                <span className="fx-sent-mail">
                    <span className="fx-sent-i" aria-hidden="true"><i className="fa-solid fa-envelope-open-text" /></span>
                    <span>
                        <small>보낸 주소</small>
                        <b>{maskEmail(email)}</b>
                    </span>
                    <button type="button" className="sxw-mini" onClick={props.restart}>바꾸기</button>
                </span>
                <span className="fx-timer" role="timer" aria-label={`남은 시간 ${mmss(expirySeconds)}`} style={{ "--fx-ratio": ratio } as React.CSSProperties}>
                    <span className="fx-timer-ring" aria-hidden="true"><b>{mmss(expirySeconds)}</b></span>
                    <small>{urgent ? "곧 끝나요" : "남은 시간"}</small>
                </span>
            </div>

            <SxBlock icon="fa-hashtag" title="인증번호" tone="lav">
                {/* 6칸 — 실제 입력은 위에 겹친 한 칸(숫자만 · 붙여넣기 · 자동 채움 그대로), 칸은 보여 주기만 */}
                <label className={`fx-code${focused ? " is-focus" : ""}`}>
                    <span className="fx-sr">인증번호 6자리</span>
                    <input
                        ref={codeRef}
                        type="text"
                        value={code}
                        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                    />
                    <span className="fx-cells" aria-hidden="true">
                        {cells.map((digit, index) => (
                            <span key={index} className={`${digit ? "is-on" : ""}${focused && index === activeIndex && code.length < 6 ? " is-now" : ""}`}>{digit}</span>
                        ))}
                    </span>
                </label>
                <span className="fx-code-state" aria-live="polite">
                    {code.length === 6
                        ? <><i className="fa-solid fa-circle-check" aria-hidden="true" />6자리를 다 넣었어요</>
                        : <>{code.length}/6 · 메일의 숫자를 그대로 넣거나 붙여넣어 주세요</>}
                </span>
            </SxBlock>

            {/* 다시 받기 — 대기 시간이 끝나면 보안 확인 뒤 다시 보냄 */}
            <SxBlock icon="fa-rotate-right" title="메일이 안 왔나요?" tone="yellow">
                <ul className="fx-tips">
                    <li><i className="fa-solid fa-filter" aria-hidden="true" />스팸 · 프로모션 메일함도 확인해 주세요.</li>
                    <li><i className="fa-solid fa-spell-check" aria-hidden="true" />주소에 오타가 있으면 메일이 가지 않아요. <button type="button" className="sxw-link" onClick={props.restart}>이메일 다시 넣기</button></li>
                    <li><i className="fa-solid fa-clock" aria-hidden="true" />메일이 오기까지 1~2분 걸릴 수 있어요.</li>
                </ul>
                {resendSeconds === 0 && (
                    <div className="sxw-bot">
                        <SignupBotChallenge
                            action="password_reset"
                            title="재전송 보호"
                            description="인증번호를 다시 받을 때 필요한 확인이에요."
                            unavailableMessage="재전송 보호 기능을 준비 중입니다. 잠시 후 다시 이용해 주세요."
                            onTokenChange={props.setBotToken}
                            resetKey={props.challengeResetKey}
                        />
                    </div>
                )}
                <button type="button" className="fx-resend" onClick={() => props.sendCode()} disabled={loading || resendSeconds > 0 || !props.botToken}>
                    <i className="fa-solid fa-paper-plane" aria-hidden="true" />
                    {resendSeconds > 0 ? <>다시 받기 <em>{resendSeconds}초 뒤</em></> : "인증번호 다시 받기"}
                </button>
            </SxBlock>

            <SxFoot onPrev={props.restart} prevLabel="이메일 바꾸기">
                <button type="submit" className="sxw-next" disabled={loading || code.length !== 6}>
                    {loading ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />확인 중</> : <>확인하기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></>}
                </button>
            </SxFoot>
        </SxCard>
    );
}

/* ───────── ③ 새 비밀번호 ───────── */
function PasswordCard(props: ForgotWebProps) {
    const { newPassword, setNewPassword, confirmPassword, setConfirmPassword, loading } = props;
    const [show, setShow] = useState(false);
    const lengthOk = newPassword.length >= 8;
    const bytesOk = utf8Bytes(newPassword) <= 72;
    const mixOk = /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword);
    const score = passwordScore(newPassword);
    const matchOk = Boolean(confirmPassword) && confirmPassword === newPassword;

    return (
        <SxCard as="form" labelledBy="fx-pw-title" screen="forgot-password" onSubmit={(event) => props.setPassword(event)}>
            <SxHead
                id="fx-pw-title"
                art="stickers/cs-privacy.webp"
                kicker="STEP 3 · NEW PASSWORD"
                title={<><Hl>새 비밀번호</Hl>를 정해 주세요</>}
                sub="이메일 확인이 끝났어요. 정해진 시간 안에 저장해 주세요."
            />
            <Notices apiReady={props.apiReady} notice={props.notice} error={props.error} />

            <SxBlock icon="fa-key" title="새 비밀번호" tone="mint">
                <div className="sxw-form">
                    <div className="sxw-f">
                        <label className="sxw-label" htmlFor="fx-pw">새 비밀번호</label>
                        <span className="sxw-inwrap">
                            <input
                                id="fx-pw"
                                className="sxw-in"
                                type={show ? "text" : "password"}
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                minLength={8}
                                maxLength={72}
                                autoComplete="new-password"
                                required
                                placeholder="8자 이상"
                                aria-describedby="fx-pw-rules"
                            />
                            <button type="button" className="sxw-eye" onClick={() => setShow((value) => !value)} aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"} aria-pressed={show}>
                                <i className={show ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} aria-hidden="true" />
                            </button>
                        </span>
                        <span className="sxw-meter" data-score={score} aria-hidden="true">
                            <i /><i /><i />
                            {newPassword && <b>{score >= 3 ? "튼튼해요" : score === 2 ? "괜찮아요" : "약해요"}</b>}
                        </span>
                        <span className="sxw-rules" id="fx-pw-rules">
                            <span className={lengthOk ? "is-ok" : ""}><i className={lengthOk ? "fa-solid fa-check" : "fa-regular fa-circle"} aria-hidden="true" />8자 이상</span>
                            <span className={mixOk ? "is-ok" : ""}><i className={mixOk ? "fa-solid fa-check" : "fa-regular fa-circle"} aria-hidden="true" />영문 · 숫자 섞기</span>
                            <span className={!newPassword ? "" : bytesOk ? "is-ok" : "is-bad"}><i className={bytesOk ? (newPassword ? "fa-solid fa-check" : "fa-regular fa-circle") : "fa-solid fa-xmark"} aria-hidden="true" />72바이트 이하</span>
                        </span>
                        {!bytesOk && <span className="sxw-err">너무 길어요(한글은 한 글자에 3바이트). 조금 줄여 주세요.</span>}
                    </div>
                    <div className="sxw-f">
                        <label className="sxw-label" htmlFor="fx-pw2">새 비밀번호 확인</label>
                        <span className={`sxw-inwrap${matchOk ? " is-ok" : confirmPassword && !matchOk ? " is-bad" : ""}`}>
                            <input
                                id="fx-pw2"
                                className="sxw-in"
                                type={show ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                minLength={8}
                                maxLength={72}
                                autoComplete="new-password"
                                required
                                placeholder="한 번 더 넣어 주세요"
                                aria-invalid={Boolean(confirmPassword) && !matchOk}
                            />
                            {matchOk && <em className="is-ok">같아요</em>}
                            {confirmPassword && !matchOk && <em className="is-bad">달라요</em>}
                        </span>
                    </div>
                </div>
            </SxBlock>

            {/* 안전한 비밀번호 팁 */}
            <ul className="fx-safe" aria-label="안전한 비밀번호 팁">
                <li data-tone="sky"><i className="fa-solid fa-clone" aria-hidden="true" /><b>다른 곳과 다르게</b><small>다른 사이트와 같은 비밀번호는 피해 주세요.</small></li>
                <li data-tone="lav"><i className="fa-solid fa-rotate" aria-hidden="true" /><b>지금과 다르게</b><small>쓰던 비밀번호는 다시 쓸 수 없어요.</small></li>
                <li data-tone="yellow"><i className="fa-solid fa-user-secret" aria-hidden="true" /><b>짐작 어렵게</b><small>생일 · 전화번호 · 아이 이름은 빼 주세요.</small></li>
            </ul>

            <SxFoot>
                <button type="submit" className="sxw-next" disabled={loading}>
                    {loading ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />저장하는 중</> : <>새 비밀번호 저장<i className="fa-solid fa-check" aria-hidden="true" /></>}
                </button>
            </SxFoot>
        </SxCard>
    );
}

/* ───────── ④ 완료 ───────── */
function DoneCard() {
    return (
        <section className="sxw-card sxw-done" aria-labelledby="fx-done-title" data-signup-screen="forgot-done">
            <span className="sxw-confetti" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
            <img className="sxw-done-art" src={`${UI}cs-check-160.webp`} alt="" aria-hidden="true" />
            <span className="sxw-kicker">ALL DONE</span>
            <h2 id="fx-done-title"><span className="sxw-u">새 비밀번호</span>로 바꿨어요</h2>
            <p className="sxw-done-sub">이제 새 비밀번호로 로그인할 수 있어요.</p>

            <div className="sxw-gifts">
                <div className="sxw-gift" data-tone="lav">
                    <span className="sxw-gift-art" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}stickers/login-lock.webp`} alt="" />
                    </span>
                    <span>
                        <em>기억해 두세요</em>
                        <b>예전 비밀번호는 더 쓸 수 없어요</b>
                        <small>브라우저에 저장된 비밀번호가 있다면 새 비밀번호로 바꿔 주세요.</small>
                    </span>
                </div>
                <Link href="/mypage/profile" className="sxw-gift" data-tone="mint">
                    <span className="sxw-gift-art" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}stickers/my-profile.webp`} alt="" />
                    </span>
                    <span>
                        <em>다음부터는</em>
                        <b>마이페이지에서도 바꿀 수 있어요</b>
                        <small>로그인한 뒤 개인정보 확인/수정 · 로그인 보안에서 바꿔요.</small>
                    </span>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </Link>
            </div>

            <Link href="/auth/login" className="sxw-next sxw-done-go">
                로그인하기<i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
            <Link href="/main" className="fx-home">홈으로 가기</Link>
        </section>
    );
}
