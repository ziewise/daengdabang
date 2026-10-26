"use client";

/**
 * 스티커북 앱 — 간편 가입(카카오 · 네이버 · 구글)에서 돌아온 뒤 화면 (2026-10-26 사용자: 웹 단계별 가입과 같은 흐름을 앱에도)
 * ---------------------------------------------------------------------
 * app/auth/social-callback/page.tsx 가 로그인까지 마친 뒤 앱 화면(ddb-app-mode)에서 그림. 웹은 SocialSignupWebFinish 그대로.
 * 웹 SocialSignupWebFinish 와 같은 단계 · 같은 함수:
 *   ① 정보 확인 — 공급자에게 받은 이름 · 이메일 · 연결 표시, 앞에서 받은 동의 표시, 이메일을 못 받았으면 등록 안내,
 *                 (스위치가 켜지면) 마케팅 수신 동의 저장(saveMarketingConsent)
 *   ② 우리 아이 — 마이페이지와 같은 등록 창(MemberPetProfileCreateForm — 같은 검사 · 같은 저장) 또는 나중에
 *   ③ 가입 완료 — 이메일 가입과 같은 완료 화면(SignupDone), "이메일 인증하고 20C"는 기존 이메일 인증 창(SignupEmailVerification)
 * AppSocialReturnNotice — 돌아왔지만 새 가입이 아닌 경우(이미 가입된 간편 계정 · 동의 취소 · 이미 이메일로 가입 · 실패 · 간편 로그인 실패/취소)
 *   단추는 모두 기존 앱 주소(앱 로그인 · 앱 회원가입 · 앱 홈 · 비밀번호 찾기)로만 이동.
 * 모양: 다른 앱 가입 화면과 같은 다이어리 속지 · 색인 탭 · 포스트잇 · 자수 와펜.
 */

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { appLoginHref, appSignupHref } from "@/components/app-shell/appTabs";
import SignupEmailVerification, { type SignupEmailVerificationResult } from "@/components/auth/SignupEmailVerification";
import MemberPetProfileCreateForm from "@/components/mypage/MemberPetProfileCreateForm";
import { clearSignupEmailResume } from "@/lib/signup-email-verification";
import { isPlaceholderEmail, maskEmail, readSignupFlowFeatures, saveMarketingConsent, type MarketingChoice, type SocialReturnKind } from "@/lib/signup-flow";
import { useAuth, type User } from "@/lib/store";
import { haptic } from "../gestures";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { HC_CSS } from "../shared";
import { DiaryBody, DiaryTabs, PARTS_CSS } from "../sticker-parts";
import { Patch, STICKER_CSS, Tape } from "../sticker-kit";
import { Note, SIGNUP_CSS, SignupDone } from "./StickerSignup";

const APP_HOME = "/app/home-1/";
/** 공급자 이름 · 동그라미 색(앱 가입 방법 화면과 같음) */
const PROVIDER: Record<string, { label: string; bg: string; ink: string; mark: string }> = {
    kakao: { label: "카카오", bg: "#fee500", ink: "#3c1e1e", mark: "fa-comment" },
    naver: { label: "네이버", bg: "#03c75a", ink: "#fff", mark: "N" },
    google: { label: "구글", bg: "#fff", ink: "#4285f4", mark: "G" },
};
const providerOf = (provider: string) => PROVIDER[provider] ?? { label: "간편", bg: "#ffe1ea", ink: "#c4456f", mark: "fa-user" };

/** 공급자 동그라미 */
function Mark({ provider }: { provider: string }) {
    const p = providerOf(provider);
    return (
        <span aria-hidden="true" className="su-provider grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px]" style={{ background: p.bg, color: p.ink }}>
            {p.mark.startsWith("fa-") ? <i className={`fa-solid ${p.mark}`} /> : <b className="font-black">{p.mark}</b>}
        </span>
    );
}

/** 공통 틀 — 크림 배경 + 속지(앱 가입 화면과 같음) */
function Frame({ children, tabs }: { children: ReactNode; tabs?: ReactNode }) {
    return (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + SIGNUP_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">{tabs}{children}</div>
        </div>
    );
}

type Screen = "check" | "pet" | "done" | "verify";

export default function AppSocialFinish({ member, provider, onFinish }: { member: User; provider: string; onFinish: () => void }) {
    const { user, updateMemberEmail } = useAuth();
    const [features] = useState(readSignupFlowFeatures);
    const [screen, setScreen] = useState<Screen>("check");
    const [dir, setDir] = useState(0);
    const [marketing, setMarketing] = useState<MarketingChoice>({ email: false, sms: false });
    const [marketingProcessedAt, setMarketingProcessedAt] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const p = providerOf(provider);
    const current: User = user && user.apiAccessToken === member.apiAccessToken ? user : member;
    const noEmail = isPlaceholderEmail(member.email);
    const firstPet = current.pets[0];
    const marketingAny = marketing.email || marketing.sms;
    const order: Screen[] = ["check", "pet", "done"];
    const go = (next: Screen) => {
        setDir(order.indexOf(next) >= order.indexOf(screen) ? 1 : -1);
        setScreen(next);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };
    // 색인 탭 — 정보 확인 · 우리 아이 · 가입 완료(지나온 탭만 눌러 돌아감)
    const tabs = (
        <DiaryTabs
            tabs={[{ label: "정보 확인", color: "#fff1b8" }, { label: "우리 아이", color: "#e8ddff" }, { label: "가입 완료", color: "#dcf3e6" }]}
            active={Math.max(0, order.indexOf(screen === "verify" ? "done" : screen))}
            onPick={(i) => { if (i < order.indexOf(screen) && screen !== "done" && screen !== "verify") go(order[i]); }}
        />
    );

    // 정보 확인 → 우리 아이 : 마케팅 수신 동의를 고른 경우에만 저장(연동됐을 때) — 웹과 같음
    const toPet = async () => {
        if (features.marketing && marketingAny && !marketingProcessedAt) {
            setSaving(true);
            const processedAt = await saveMarketingConsent(member.apiAccessToken, marketing);
            setSaving(false);
            if (processedAt) setMarketingProcessedAt(processedAt);
        }
        go("pet");
    };
    // 이메일 인증을 마치면 회원 이메일을 바꾸고 시작(예전 앱 간편 가입 인증 화면과 같은 동작)
    const completeVerification = (result: SignupEmailVerificationResult) => {
        if (result.verifiedEmail) updateMemberEmail(result.verifiedEmail);
        onFinish();
    };

    /* ───────── 이메일 인증(가입 혜택 20C) — 완료 화면에서 엶 ───────── */
    if (screen === "verify") {
        return (
            <Frame tabs={tabs}>
                <DiaryBody pageKey="social-verify" dir={1}>
                    <div className="flex flex-col items-center text-center">
                        <Image src="/images/ui/stickers/signup-gift.webp" alt="" width={72} height={72} className="su-mail-img h-[4.5rem] w-[4.5rem]" />
                        <h1 className="ah-display mt-3 text-[20px]"><span className="st-marker">가입 혜택 이메일 인증</span></h1>
                        <p className="ah-light mt-2 text-[13px] leading-relaxed" style={{ color: TEXT_SOFT }}>이메일 인증을 마치면 신규 가입 혜택 20C를 받을 수 있어요. 간편가입에서 임시 이메일이 만들어졌다면 실제로 쓰는 이메일을 넣어 주세요.</p>
                    </div>
                    <div className="su-verify mt-5">
                        <SignupEmailVerification accessToken={member.apiAccessToken} accountEmail={member.email} onComplete={completeVerification} onContinueWithoutBonus={() => onFinish()} />
                    </div>
                    <div className="mt-4"><Patch tone="cream" small onClick={() => go("done")}><i aria-hidden="true" className="fa-solid fa-chevron-left text-[11px]" />가입 완료 화면으로</Patch></div>
                </DiaryBody>
            </Frame>
        );
    }

    /* ───────── 가입 완료 ───────── */
    if (screen === "done") {
        return (
            <Frame tabs={tabs}>
                <DiaryBody pageKey="social-done" dir={dir}>
                    <SignupDone
                        name={current.name}
                        pet={firstPet}
                        providerLabel={p.label}
                        emailNeedsSetup={noEmail}
                        marketingResult={marketingProcessedAt ? { processedAt: marketingProcessedAt, choice: marketing } : null}
                        onVerify={() => setScreen("verify")}
                        finishLabel="시작하기"
                        onFinish={onFinish}
                        onLeave={clearSignupEmailResume}
                    />
                </DiaryBody>
            </Frame>
        );
    }

    /* ───────── 우리 아이 ───────── */
    if (screen === "pet") {
        return (
            <Frame tabs={tabs}>
                <DiaryBody pageKey="social-pet" dir={dir}>
                    <p className="ah-light text-[10.5px] tracking-[.16em] text-[#c4567a]">STEP 5 · MY DOG</p>
                    <p className="ah-display mt-0.5 text-[19px] leading-snug"><span className="st-marker">우리 아이</span>도 함께 등록할까요?</p>
                    <p className="ah-light mt-1 text-[12.5px]" style={{ color: TEXT_SOFT }}>이름 · 견종만 있어도 등록할 수 있어요. 지금 안 해도 돼요.</p>

                    {/* 등록한 아이 — 민트 포스트잇 */}
                    {current.pets.length > 0 ? (
                        <div className="st-postit relative mt-4 px-3.5 pb-3 pt-3.5" style={{ background: "#dcf3e6", rotate: "-0.6deg" }}>
                            <Tape className="-top-2 left-6 h-3.5 w-11" color="rgba(255,200,215,.9)" style={{ rotate: "-4deg" }} />
                            <p className="ah-display text-[12.5px] text-[#1f7f5a]">등록한 아이</p>
                            <ul className="mt-1.5 flex flex-wrap gap-1.5">
                                {current.pets.map((pet) => (
                                    <li key={pet.apiProfileId || pet.name} className="su-done-chip ah-light"><i aria-hidden="true" className="fa-solid fa-circle-check" />{pet.name}{pet.breed ? ` · ${pet.breed}` : ""}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {/* 등록 창 — 마이페이지와 같은 등록 기능(앱 화면은 카드 안에서 펼침) */}
                    <div className="su-paper mt-4 rounded-[16px] px-3.5 py-4">
                        <div className="flex justify-center gap-1.5" aria-hidden="true">
                            {(["front", "left", "right", "back"] as const).map((view, i) => (
                                <Image key={view} src={`/images/ui/mypet-view-${view}-160.webp`} alt="" width={46} height={46} className="h-[2.9rem] w-[2.9rem] object-contain" style={{ rotate: `${[-4, 3, -2, 4][i]}deg` }} />
                            ))}
                        </div>
                        <p className="ah-light mt-2 text-center text-[11.5px] leading-snug" style={{ color: TEXT_SOFT }}>사진 네 방향 · 이름 · 견종 · 크기 · 체중을 등록 창에서 넣어요. 마이의 우리 아이 등록과 같은 창이에요.</p>
                        <div className="su-petcreate mt-3"><MemberPetProfileCreateForm /></div>
                    </div>

                    <div className="mt-5 grid grid-cols-[auto_1fr] gap-2.5">
                        <Patch tone="cream" small onClick={() => go("check")}><i aria-hidden="true" className="fa-solid fa-chevron-left text-[11px]" />이전</Patch>
                        <Patch small tone={firstPet ? "pink" : "cream"} onClick={() => go("done")}>{firstPet ? "다음 · 가입 완료" : "나중에 할게요"}<i aria-hidden="true" className="fa-solid fa-chevron-right text-[11px]" /></Patch>
                    </div>
                </DiaryBody>
            </Frame>
        );
    }

    /* ───────── 정보 확인 ───────── */
    return (
        <Frame tabs={tabs}>
            <DiaryBody pageKey="social-check" dir={dir}>
                <p className="ah-light text-[10.5px] tracking-[.16em] text-[#c4567a]">STEP 4 · CHECK</p>
                <p className="ah-display mt-0.5 text-[19px] leading-snug">거의 <span className="st-marker">다 됐어요</span>!</p>
                <p className="ah-light mt-1 text-[12.5px]" style={{ color: TEXT_SOFT }}>{p.label} 계정이 연결됐어요. 받은 정보가 맞는지 확인해 주세요.</p>

                {/* 받은 정보 — 받침지 위 이름표 + 연결 도장 */}
                <div className="st-sheet relative mt-5 flex items-center gap-3 rounded-[16px] px-3.5 pb-3.5 pt-4" style={{ rotate: "-0.6deg" }}>
                    <Tape className="-top-2 left-5 h-3.5 w-12" color="rgba(255,214,228,.9)" style={{ rotate: "-4deg" }} />
                    <span aria-hidden="true" className="ah-display grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#ffe1ea] text-[17px] text-[#c4456f]">{(member.name || "댕").slice(0, 1)}</span>
                    <span className="min-w-0 flex-1">
                        <span className="ah-display block truncate text-[15px]">{member.name}</span>
                        <span className="ah-light block truncate text-[11.5px]" style={{ color: TEXT_SOFT }}>{noEmail ? `${p.label}에서 이메일을 받지 못했어요` : maskEmail(member.email)}</span>
                    </span>
                    <span className="su-stamp is-ok ah-display inline-flex shrink-0 items-center gap-1 rounded-full py-1 pl-1 pr-2.5 text-[11px]"><Mark provider={provider} />연결됨</span>
                </div>

                {/* 동의한 항목 — 민트 메모 */}
                <div className="su-final relative mt-6 rounded-[16px] px-3.5 pb-3.5 pt-4" style={{ rotate: "0.4deg" }}>
                    <span className="st-tape ah-display absolute -top-2.5 left-4 px-2.5 py-0.5 text-[11px] text-[#1f7f5a]" style={{ background: "rgba(200,240,215,.95)", rotate: "-3deg" }}>동의한 항목</span>
                    <div className="flex flex-wrap gap-1.5">
                        {["만 14세 이상", "이용약관", "개인정보 수집·이용", "가입 보안 확인"].map((label) => (
                            <span key={label} className="su-done-chip ah-light"><i aria-hidden="true" className="fa-solid fa-check" />{label}</span>
                        ))}
                    </div>
                </div>

                {noEmail ? (
                    <div className="mt-4"><Note tone="info"><b className="ah-display block text-[13px]">이메일은 가입 뒤 등록해 주세요</b>주문 · 배송 안내를 받으려면 실제로 쓰는 이메일이 필요해요. 가입 완료 화면이나 마이에서 이메일을 등록 · 인증하면 20C도 받아요.</Note></div>
                ) : null}

                {/* 선택 동의 — 마케팅 수신(스위치가 켜졌을 때만, 웹과 같음) */}
                {features.marketing ? (
                    <div className="su-paper mt-4 rounded-[16px] px-3.5 py-3.5">
                        <p className="ah-display text-[13px]"><span className="su-badge">선택</span> 마케팅 정보 수신에 동의해요</p>
                        <p className="ah-light mt-1 text-[11px] leading-snug" style={{ color: TEXT_SOFT }}>새 상품 · 할인 · 이벤트 소식을 받아요. 동의하지 않아도 가입과 쇼핑은 똑같아요. 마이에서 언제든 바꿀 수 있어요.</p>
                        <div className="mt-2 flex gap-1.5" role="group" aria-label="받을 방법">
                            {([["email", "이메일"], ["sms", "문자(SMS)"]] as const).map(([key, label]) => (
                                <button key={key} type="button" aria-pressed={marketing[key]} onClick={() => { haptic("light"); setMarketing({ ...marketing, [key]: !marketing[key] }); }}
                                    className={`su-chip ah-display rounded-full px-3 py-1 text-[11.5px] ${marketing[key] ? "is-on" : ""}`}>
                                    {marketing[key] ? <i aria-hidden="true" className="fa-solid fa-check mr-1 text-[9px]" /> : null}{label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="mt-6"><Patch onClick={() => void toPet()} disabled={saving}>{saving ? "저장하는 중이에요" : "맞아요 · 다음"}<i aria-hidden="true" className="fa-solid fa-chevron-right text-[12px]" /></Patch></div>
            </DiaryBody>
        </Frame>
    );
}

/* ───────── 돌아왔지만 새 가입이 아닌 경우 — 갈림길 카드(웹 SocialReturnWebNotice 와 같은 문구 · 갈래) ───────── */
export function AppSocialReturnNotice({ kind, provider, message, onContinue, mode = "signup" }: { kind: SocialReturnKind; provider: string; message?: string; onContinue?: () => void; mode?: "login" | "signup" }) {
    const label = providerOf(provider).label;
    const loginReturn = mode === "login" && (kind === "failed" || kind === "new" || kind === "cancelled");
    const content = loginReturn ? (kind === "cancelled" ? {
        art: "/images/ui/header-login-128.webp", tone: "#fff3a6", ink: "#8f5e12", kicker: "CANCELLED",
        title: `${label} 로그인을 취소했어요`,
        text: `${label} 화면에서 로그인이나 정보 제공 동의를 마치지 않아 로그인되지 않았어요.`,
    } : {
        art: "/images/ui/header-login-128.webp", tone: "#ffd6e2", ink: "#c4456f", kicker: "TRY AGAIN",
        title: `${label} 로그인을 마치지 못했어요`,
        text: message || "로그인 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
    }) : kind === "existing" ? {
        art: "/images/ui/header-login-128.webp", tone: "#dcf3e6", ink: "#1f7f5a", kicker: "WELCOME BACK",
        title: `이미 가입된 ${label} 계정이에요`,
        text: "새로 가입하지 않고 그 계정으로 로그인했어요. 하던 쇼핑을 이어서 할 수 있어요.",
    } : kind === "cancelled" ? {
        art: "/images/ui/header-login-128.webp", tone: "#fff3a6", ink: "#8f5e12", kicker: "CANCELLED",
        title: `${label} 가입을 취소했어요`,
        text: `${label} 화면에서 로그인이나 정보 제공 동의를 마치지 않아 가입되지 않았어요.`,
    } : kind === "email_exists" ? {
        art: "/images/ui/stickers/my-profile.webp", tone: "#ffe1ea", ink: "#c4456f", kicker: "ALREADY JOINED",
        title: "같은 이메일로 가입한 계정이 있어요",
        text: "한 사람이 계정을 두 개 만들지 않도록, 예전에 가입한 계정으로 로그인해 주세요.",
    } : {
        art: "/images/ui/policy-info-192.webp", tone: "#ffd6e2", ink: "#c4456f", kicker: "TRY AGAIN",
        title: "간편 가입을 마치지 못했어요",
        text: message || "간편 로그인 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
    return (
        <Frame>
            <DiaryBody pageKey={`social-return-${kind}-${mode}`} dir={1}>
                <div className="flex flex-col items-center text-center">
                    <span className="grid h-24 w-24 place-items-center rounded-full" style={{ background: content.tone, rotate: "-5deg" }}>
                        <Image src={content.art} alt="" width={72} height={72} className="su-mail-img h-[4.4rem] w-[4.4rem] object-contain" />
                    </span>
                    <p className="ah-light mt-3 text-[10.5px] tracking-[.18em]" style={{ color: content.ink }}>{content.kicker}</p>
                    <h1 className="ah-display mt-1 text-[19px] leading-snug"><span className="st-marker">{content.title}</span></h1>
                    <p className="ah-light mt-2 text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>{content.text}</p>
                </div>
                {/* 단추 — 기존 앱 주소로만(앱 홈 · 앱 로그인 · 앱 회원가입 · 비밀번호 찾기) */}
                <div className="mt-6 grid grid-cols-[auto_1fr] gap-2.5">
                    {kind === "existing" && !loginReturn ? (
                        <div className="col-span-2"><Patch onClick={onContinue}>계속하기<i aria-hidden="true" className="fa-solid fa-arrow-right text-[12px]" /></Patch></div>
                    ) : loginReturn ? (
                        <>
                            <Patch tone="cream" small href={APP_HOME}>홈으로</Patch>
                            <Patch small href={appLoginHref(null)}>로그인 다시 하기<i aria-hidden="true" className="fa-solid fa-arrow-right text-[11px]" /></Patch>
                        </>
                    ) : kind === "cancelled" ? (
                        <>
                            <Patch tone="cream" small href={APP_HOME}>홈으로</Patch>
                            <Patch small href={appSignupHref(null)}>다시 가입하기<i aria-hidden="true" className="fa-solid fa-arrow-right text-[11px]" /></Patch>
                        </>
                    ) : kind === "email_exists" ? (
                        <>
                            <Patch tone="cream" small href="/forgot-password/">비밀번호 찾기</Patch>
                            <Patch small href={appLoginHref(null)}>그 계정으로 로그인<i aria-hidden="true" className="fa-solid fa-arrow-right text-[11px]" /></Patch>
                        </>
                    ) : (
                        <>
                            <Patch tone="cream" small href={appLoginHref(null)}>로그인</Patch>
                            <Patch small href={appSignupHref(null)}>가입 다시 하기<i aria-hidden="true" className="fa-solid fa-arrow-right text-[11px]" /></Patch>
                        </>
                    )}
                </div>
                {loginReturn ? (
                    <p className="ah-light mt-6 text-center text-[12.5px]" style={{ color: TEXT_SOFT }}>
                        아직 회원이 아니신가요? <Link href={appSignupHref(null)} className="ah-display text-[#e0557f] underline underline-offset-4">회원가입</Link>
                    </p>
                ) : null}
            </DiaryBody>
        </Frame>
    );
}

/** 간편 로그인 처리 중 — 로그인 그림이 통통 · 점 세 개(앱 다이어리 결) */
export function AppSocialWait() {
    return (
        <Frame>
            <DiaryBody pageKey="social-wait" dir={1}>
                <div role="status" aria-live="polite" className="flex flex-col items-center py-6 text-center">
                    <Image src="/images/ui/header-login-128.webp" alt="" width={84} height={84} className="su-wait-art h-[5.2rem] w-[5.2rem]" />
                    <p className="ah-light mt-3 text-[10.5px] tracking-[.18em] text-[#c4567a]">SIGNING IN</p>
                    <h1 className="ah-display mt-1 text-[19px]"><span className="st-marker">로그인하고 있어요</span></h1>
                    <p className="ah-light mt-2 text-[12.5px]" style={{ color: TEXT_SOFT }}>계정 정보를 불러오는 중이에요. 잠시만 기다려 주세요.</p>
                    <span className="mt-4 flex gap-1.5" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className="su-wait-dot h-2 w-2 rounded-full bg-[#f6a9bf]" style={{ animationDelay: `${i * 160}ms` }} />)}</span>
                </div>
            </DiaryBody>
        </Frame>
    );
}
