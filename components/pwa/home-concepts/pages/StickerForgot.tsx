"use client";

/**
 * 스티커북 앱 — 비밀번호 찾기(재설정) 화면 (2026-10-26 사용자: 웹 단계별 흐름을 앱에도 · 앱 안에서 열리게)
 * ---------------------------------------------------------------------
 * 동작 · 값 · 서버 요청은 모두 app/(auth)/forgot-password/ForgotForm.tsx 그대로 — 이 파일은 그 상태와 함수를 받아 그리기만 함
 * (웹 ForgotWebView 와 같은 입력값). 앱 주소 /app/sticker/forgot(앱 묶음 안)이 ForgotForm 을 그대로 쓰고,
 * 앱 틀(AppShell)이 웹 주소 /forgot-password 를 이 앱 주소로 바꿔 보냄.
 * 웹 ForgotWebView 와 같은 네 단계:
 *  ① 이메일 확인 : 가입 이메일 · 보안 확인(SignupBotChallenge) · "이런 경우엔 달라요"(간편가입 · 이메일 기억 안 남)
 *  ② 인증번호   : 보낸 주소 · 남은 시간 · 6칸 숫자(실제 입력은 한 칸 — 붙여넣기 · 자동 채움 그대로) · 메일이 안 올 때 · 다시 받기
 *  ③ 새 비밀번호 : 강도 크레용 · 규칙 알약 · 같아요/달라요 · 보기
 *  ④ 완료        : 축하 그림 · 로그인하기
 * 모양: 앱 가입 화면과 같은 다이어리 속지 · 색인 탭 · 라벨 스티커 입력칸 · 포스트잇 · 자수 와펜.
 */

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { appLoginHref } from "@/components/app-shell/appTabs";
import SignupBotChallenge from "@/components/auth/SignupBotChallenge";
import type { ForgotWebProps } from "@/components/auth/forgot-web/ForgotWebView";
import { maskEmail } from "@/lib/signup-flow";
import { haptic } from "../gestures";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { HC_CSS } from "../shared";
import { DiaryBody, DiaryTabs, PARTS_CSS } from "../sticker-parts";
import { Patch, STICKER_CSS, Tape } from "../sticker-kit";
import { Note, SIGNUP_CSS } from "./StickerSignup";

const STEP_INDEX = { email: 0, code: 1, password: 2, done: 3 } as const;
const TABS = [
    { label: "이메일", color: "#e3f2fb" },
    { label: "인증번호", color: "#e8ddff" },
    { label: "새 비밀번호", color: "#dcf3e6" },
];
const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;
/** 비밀번호 강도 0~3 — 웹과 같은 규칙 */
function passwordScore(value: string) {
    if (value.length < 8) return value ? 1 : 0;
    let score = 1;
    if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) score += 1;
    return score;
}
const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function AppForgotView(props: ForgotWebProps) {
    // 입력값 · 함수를 미리 꺼내 씀(입력칸 참조 codeRef 가 섞인 props 를 그리는 중에 직접 읽지 않게 — React 규칙)
    const {
        step, apiReady, challengeConfigured, email, setEmail, code, setCode, codeRef, newPassword, setNewPassword, confirmPassword, setConfirmPassword,
        botToken, setBotToken, challengeResetKey, loading, notice, error, resendSeconds, expirySeconds, expiryTotal, sendCode, verifyCode, setPassword, restart,
    } = props;
    const [showPw, setShowPw] = useState(false);
    const now = STEP_INDEX[step];
    const canSend = Boolean(email.trim()) && apiReady === true && challengeConfigured && Boolean(botToken) && !loading;
    const urgent = expirySeconds > 0 && expirySeconds <= 60;
    const lengthOk = newPassword.length >= 8;
    const bytesOk = utf8Bytes(newPassword) <= 72;
    const mixOk = /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword);
    const score = passwordScore(newPassword);
    const matchOk = Boolean(confirmPassword) && confirmPassword === newPassword;

    // 알림 — 서버 준비 중(노랑) · 안내(연보라) · 오류(분홍)
    const notes = (
        <>
            {apiReady === false ? <div className="mb-3"><Note tone="warn">지금은 본인 확인 서비스를 준비 중입니다. 잠시 후 다시 이용해 주세요.</Note></div> : null}
            {notice ? <div className="mb-3"><Note tone="info">{notice}</Note></div> : null}
            {error ? <div className="mb-3"><Note tone="error">{error}</Note></div> : null}
        </>
    );

    return (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + SIGNUP_CSS + FORGOT_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">
                {step !== "done" ? <DiaryTabs tabs={TABS} active={now} onPick={(i) => { if (i === 0 && now > 0) restart(); }} /> : null}
                <DiaryBody pageKey={`forgot-${step}`} dir={1}>
                    <h1 className="sr-only">비밀번호 재설정</h1>

                    {step === "email" ? (
                        <form onSubmit={(e) => sendCode(e)}>
                            <p className="ah-light text-[10.5px] tracking-[.16em] text-[#3d8fb8]">STEP 1 · EMAIL</p>
                            <p className="ah-display mt-0.5 text-[19px] leading-snug"><span className="st-marker">가입한 이메일</span>을 알려 주세요</p>
                            <p className="ah-light mt-1 text-[12.5px]" style={{ color: TEXT_SOFT }}>그 주소로 인증번호 6자리를 보내 드려요.</p>
                            <div className="mt-4">{notes}</div>
                            <label className="su-label flex h-[50px] items-stretch" style={{ ["--stub" as string]: "#e3f2fb", ["--ink" as string]: "#3d8fb8" }}>
                                <span className="su-stub grid w-11 shrink-0 place-items-center text-[13px]"><i aria-hidden="true" className="fa-solid fa-envelope" /></span>
                                <span className="sr-only">가입 이메일</span>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required placeholder="가입 이메일 · email@example.com"
                                    className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-[#c2b2aa]" />
                            </label>
                            <div className="su-bot mt-4">
                                <SignupBotChallenge action="password_reset" title="본인 확인 보호" description="자동 요청을 막기 위한 확인을 완료해 주세요."
                                    unavailableMessage="본인 확인 보호 기능을 준비 중입니다. 잠시 후 다시 이용해 주세요." onTokenChange={setBotToken} resetKey={challengeResetKey} />
                            </div>
                            <div className="mt-4"><Patch type="submit" disabled={!canSend}>{loading ? "확인 중…" : "인증번호 받기"}<i aria-hidden="true" className="fa-solid fa-paper-plane text-[12px]" /></Patch></div>

                            {/* 이런 경우엔 달라요 — 간편가입 회원 · 이메일 기억 안 남(웹과 같은 갈래) */}
                            <p className="ah-display mt-7 text-center text-[12.5px] text-[#b07a8a]">이런 경우엔 달라요</p>
                            <div className="mt-3 space-y-3">
                                <Link href={appLoginHref(null)} onClick={() => haptic("light")} className="fx-case st-postit relative flex items-center gap-3 px-3.5 pb-3 pt-3.5" style={{ background: "#fff3a6", rotate: "-0.6deg" }}>
                                    <Tape className="-top-2 left-6 h-3.5 w-11" color="rgba(200,226,255,.88)" style={{ rotate: "-4deg" }} />
                                    <Image src="/images/ui/header-login-128.webp" alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
                                    <span className="min-w-0 flex-1">
                                        <span className="ah-display block text-[13.5px]">간편가입으로 가입했어요</span>
                                        <span className="ah-light block text-[11px] leading-snug text-[#8f5e12]">카카오 · 네이버 · 구글 회원은 비밀번호가 없어요. 그 버튼으로 로그인해 주세요.</span>
                                    </span>
                                    <i aria-hidden="true" className="fa-solid fa-chevron-right text-[10px] text-[#c9a64a]" />
                                </Link>
                                <Link href="/inquiry" onClick={() => haptic("light")} className="fx-case st-postit relative flex items-center gap-3 px-3.5 pb-3 pt-3.5" style={{ background: "#dcf3e6", rotate: "0.6deg" }}>
                                    <Tape className="-top-2 right-7 h-3.5 w-11" color="rgba(255,200,215,.9)" style={{ rotate: "5deg" }} />
                                    <Image src="/images/ui/stickers/inquiry-email.webp" alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
                                    <span className="min-w-0 flex-1">
                                        <span className="ah-display block text-[13.5px]">이메일이 기억나지 않아요</span>
                                        <span className="ah-light block text-[11px] leading-snug text-[#1f7f5a]">1:1 문의에 이름과 주문 정보를 남기면 본인 확인 뒤 도와드려요.</span>
                                    </span>
                                    <i aria-hidden="true" className="fa-solid fa-chevron-right text-[10px] text-[#4fae84]" />
                                </Link>
                            </div>
                        </form>
                    ) : step === "code" ? (
                        <form onSubmit={(e) => verifyCode(e)}>
                            <p className="ah-light text-[10.5px] tracking-[.16em] text-[#7457d8]">STEP 2 · CODE</p>
                            <p className="ah-display mt-0.5 text-[19px] leading-snug"><span className="st-marker">인증번호 6자리</span>를 넣어 주세요</p>
                            <p className="ah-light mt-1 text-[12.5px]" style={{ color: TEXT_SOFT }}>메일 제목에 댕다방이 들어 있어요.</p>
                            <div className="mt-4">{notes}</div>

                            {/* 보낸 주소 · 남은 시간 */}
                            <div className="su-paper flex items-center gap-3 rounded-[16px] px-3.5 py-3">
                                <span className="min-w-0 flex-1">
                                    <span className="ah-light block text-[11px]" style={{ color: TEXT_SOFT }}>보낸 주소</span>
                                    <span className="ah-display block truncate text-[14px]">{maskEmail(email)}</span>
                                </span>
                                <button type="button" onClick={() => { haptic("light"); restart(); }} className="ah-display shrink-0 text-[12px] text-[#e0557f] underline underline-offset-2">바꾸기</button>
                                <span className={`fx-timer grid h-14 w-14 shrink-0 place-items-center rounded-full ${urgent ? "is-urgent" : ""}`}
                                    style={{ ["--p" as string]: `${expiryTotal ? Math.round((expirySeconds / expiryTotal) * 360) : 360}deg` }}>
                                    <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-center">
                                        <span className="ah-display block text-[12.5px] leading-none">{mmss(expirySeconds)}</span>
                                        <span className="ah-light block text-[8.5px] leading-none" style={{ color: TEXT_SOFT }}>{urgent ? "곧 끝나요" : "남은 시간"}</span>
                                    </span>
                                </span>
                            </div>

                            {/* 6칸 숫자 — 실제 입력은 한 칸(붙여넣기 · 자동 채움 그대로) */}
                            <label className="fx-code relative mt-4 block cursor-text">
                                <span className="sr-only">인증번호 6자리</span>
                                <span className="flex justify-between gap-1.5" aria-hidden="true">
                                    {Array.from({ length: 6 }, (_, k) => (
                                        <span key={k} className={`fx-cell ah-display grid h-12 flex-1 place-items-center rounded-[12px] text-[20px] ${code[k] ? "is-on" : ""} ${k === code.length ? "is-now" : ""}`} style={{ rotate: `${[-1.5, 1, -0.6, 1.2, -1, 0.8][k]}deg` }}>{code[k] ?? ""}</span>
                                    ))}
                                </span>
                                <input ref={codeRef} type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="absolute inset-0 h-full w-full opacity-0" />
                            </label>
                            <div className="mt-4"><Patch type="submit" disabled={loading || code.length !== 6}>{loading ? "확인 중…" : "이메일 확인"}<i aria-hidden="true" className="fa-solid fa-check text-[12px]" /></Patch></div>

                            {/* 메일이 안 왔나요? — 노란 포스트잇 · 다시 받기 */}
                            <div className="st-postit relative mt-6 px-3.5 pb-3.5 pt-4" style={{ background: "#fff3a6", rotate: "-0.5deg" }}>
                                <Tape className="-top-2 left-1/2 h-3.5 w-12 -translate-x-1/2" color="rgba(220,205,255,.9)" style={{ rotate: "3deg" }} />
                                <p className="ah-display text-[13.5px]">메일이 안 왔나요?</p>
                                <ul className="ah-light mt-1.5 space-y-1 text-[11.5px] leading-snug text-[#8f5e12]">
                                    <li><i aria-hidden="true" className="fa-solid fa-filter mr-1 text-[9.5px]" />스팸 · 프로모션 메일함도 확인해 주세요.</li>
                                    <li><i aria-hidden="true" className="fa-solid fa-spell-check mr-1 text-[9.5px]" />주소에 오타가 있으면 메일이 가지 않아요. <button type="button" onClick={restart} className="ah-display text-[#c4456f] underline underline-offset-2">이메일 다시 넣기</button></li>
                                    <li><i aria-hidden="true" className="fa-solid fa-clock mr-1 text-[9.5px]" />메일이 오기까지 1~2분 걸릴 수 있어요.</li>
                                </ul>
                                {resendSeconds === 0 ? (
                                    <div className="su-bot mt-3">
                                        <SignupBotChallenge action="password_reset" title="재전송 보호" description="인증번호를 다시 받을 때 필요한 확인입니다."
                                            unavailableMessage="재전송 보호 기능을 준비 중입니다. 잠시 후 다시 이용해 주세요." onTokenChange={setBotToken} resetKey={challengeResetKey} />
                                    </div>
                                ) : null}
                                <div className="mt-3"><Patch tone="cream" small onClick={() => sendCode()} disabled={loading || resendSeconds > 0 || !botToken}>
                                    <i aria-hidden="true" className="fa-solid fa-rotate-right text-[11px]" />{resendSeconds > 0 ? `${resendSeconds}초 후 다시 받기` : "인증번호 다시 받기"}
                                </Patch></div>
                            </div>
                        </form>
                    ) : step === "password" ? (
                        <form onSubmit={(e) => setPassword(e)}>
                            <p className="ah-light text-[10.5px] tracking-[.16em] text-[#1f9e75]">STEP 3 · NEW PASSWORD</p>
                            <p className="ah-display mt-0.5 text-[19px] leading-snug"><span className="st-marker">새 비밀번호</span>를 정해 주세요</p>
                            <p className="ah-light mt-1 text-[12.5px]" style={{ color: TEXT_SOFT }}>앞으로 이 비밀번호로 로그인해요.</p>
                            <div className="mt-4">{notes}</div>
                            <div className="space-y-3">
                                <label className="su-label flex h-[50px] items-stretch" style={{ ["--stub" as string]: "#fff1c4", ["--ink" as string]: "#c98a12" }}>
                                    <span className="su-stub grid w-11 shrink-0 place-items-center text-[13px]"><i aria-hidden="true" className="fa-solid fa-lock" /></span>
                                    <span className="sr-only">새 비밀번호</span>
                                    <input type={showPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} maxLength={72} autoComplete="new-password" required placeholder="새 비밀번호 · 8자 이상"
                                        className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-[#c2b2aa]" />
                                    <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"} aria-pressed={showPw} className="su-eye grid w-11 shrink-0 place-items-center text-[13px] text-[#b8a59c]">
                                        <i aria-hidden="true" className={`fa-solid ${showPw ? "fa-eye-slash" : "fa-eye"}`} />
                                    </button>
                                </label>
                                <div className="flex items-center gap-1.5 pl-1" aria-hidden="true">
                                    {[1, 2, 3].map((n) => <span key={n} className="su-meter h-[7px] flex-1 rounded-full" data-on={score >= n ? String(score) : undefined} />)}
                                    {newPassword ? <span className="ah-display ml-1 w-14 text-right text-[11px]" style={{ color: score >= 3 ? "#1f9e75" : score === 2 ? "#c98a12" : "#d2457a" }}>{score >= 3 ? "튼튼해요" : score === 2 ? "괜찮아요" : "약해요"}</span> : null}
                                </div>
                                <div className="flex flex-wrap gap-1.5 pl-1">
                                    {[
                                        { ok: lengthOk, bad: false, label: "8자 이상" },
                                        { ok: mixOk, bad: false, label: "영문 · 숫자 섞기" },
                                        { ok: Boolean(newPassword) && bytesOk, bad: !bytesOk, label: "72바이트 이하" },
                                    ].map((rule) => (
                                        <span key={rule.label} className={`su-rule ah-light inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] ${rule.ok ? "is-ok" : rule.bad ? "is-bad" : ""}`}>
                                            <i aria-hidden="true" className={rule.ok ? "fa-solid fa-check" : rule.bad ? "fa-solid fa-xmark" : "fa-regular fa-circle"} />{rule.label}
                                        </span>
                                    ))}
                                </div>
                                <label className="su-label flex h-[50px] items-stretch" style={{ ["--stub" as string]: "#e8ddff", ["--ink" as string]: "#7457d8" }}>
                                    <span className="su-stub grid w-11 shrink-0 place-items-center text-[13px]"><i aria-hidden="true" className="fa-solid fa-key" /></span>
                                    <span className="sr-only">새 비밀번호 확인</span>
                                    <input type={showPw ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} maxLength={72} autoComplete="new-password" required placeholder="새 비밀번호 확인 · 한 번 더"
                                        className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-[#c2b2aa]" />
                                    {matchOk ? <span className="ah-display grid shrink-0 place-items-center pr-3 text-[11px] text-[#1f9e75]">같아요</span> : confirmPassword ? <span className="ah-display grid shrink-0 place-items-center pr-3 text-[11px] text-[#d2457a]">달라요</span> : null}
                                </label>
                            </div>
                            <p className="ah-light mt-3 text-[11px] leading-snug" style={{ color: TEXT_SOFT }}><i aria-hidden="true" className="fa-solid fa-paw mr-1 text-[9px] text-[#f08eae]" />다른 사이트와 같은 비밀번호는 피하고, 이름 · 생일처럼 짐작하기 쉬운 말은 빼 주세요.</p>
                            <div className="mt-4"><Patch type="submit" disabled={loading}>{loading ? "변경 중…" : "새 비밀번호 저장"}<i aria-hidden="true" className="fa-solid fa-floppy-disk text-[12px]" /></Patch></div>
                        </form>
                    ) : (
                        /* ④ 완료 — 축하 그림 · 로그인하기 */
                        <div className="flex flex-col items-center text-center">
                            <Image src="/images/ui/stickers/login-lock.webp" alt="" width={96} height={96} className="su-done-art st-diecut-img h-24 w-24 object-contain" />
                            <p className="ah-light mt-2 text-[10.5px] tracking-[.18em] text-[#1f9e75]">ALL DONE</p>
                            <h2 className="ah-display mt-1 text-[20px]"><span className="st-marker">비밀번호를 바꿨어요</span></h2>
                            <p className="ah-light mt-2 text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>새 비밀번호로 다시 로그인해 주세요. 다른 기기에서 로그인돼 있었다면 다시 로그인해야 할 수 있어요.</p>
                            <div className="mt-6 w-full"><Patch href={appLoginHref(null)}>로그인하기<i aria-hidden="true" className="fa-solid fa-arrow-right text-[12px]" /></Patch></div>
                        </div>
                    )}

                    {step !== "done" ? (
                        <p className="ah-light mt-6 text-center text-[12.5px]" style={{ color: TEXT_SOFT }}>
                            <Link href={appLoginHref(null)} className="ah-display text-[#e0557f] underline underline-offset-4">로그인으로 돌아가기</Link>
                        </p>
                    ) : null}
                </DiaryBody>
            </div>
        </div>
    );
}

const FORGOT_CSS = `
/* 남은 시간 — 크레용 고리(남은 만큼 연보라, 1분 아래면 분홍) */
.fx-timer { background: conic-gradient(#b8a4f2 var(--p), #f1ece6 0); box-shadow: 0 6px 10px -6px rgba(90,60,50,.4); }
.fx-timer.is-urgent { background: conic-gradient(#f47aa0 var(--p), #f1ece6 0); }
/* 6칸 숫자 — 흰 종이 칸, 채우면 연보라, 지금 칸은 분홍 테 */
.fx-cell { background: #fff; color: #5a4038; box-shadow: inset 0 0 0 1.5px #f3e3da, 0 6px 10px -8px rgba(120,80,60,.45); transition: background .2s, box-shadow .2s; }
.fx-cell.is-on { background: #f3efff; color: #563fa8; box-shadow: inset 0 0 0 1.5px #d9cdf6; }
.fx-code:focus-within .fx-cell.is-now { box-shadow: inset 0 0 0 2px #f47aa0, 0 6px 10px -8px rgba(200,80,120,.45); }
/* 이런 경우엔 달라요 — 누르면 꾹 */
.fx-case { -webkit-tap-highlight-color: transparent; transition: transform .35s cubic-bezier(.3,1.6,.5,1); }
.fx-case:active { transform: scale(.96); }
`;
