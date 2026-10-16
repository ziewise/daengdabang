"use client";

/**
 * 스티커북 시안 — 앱 로그인(/app/sticker/login) · 로컬 시안 전용, 배포 X
 * ---------------------------------------------------------------------
 * 앱 안에서 로그인을 요구하는 곳(초대 카드 · 연구소/마이 같은 회원 화면 · 장바구니 → 주문 · 웹 로그인 링크)은 모두 이 화면으로 온다.
 * 로그인 기능은 웹 로그인 화면(app/auth/login)과 똑같은 공용 함수를 그대로 쓴다 — 화면 모양만 스티커북.
 *  - 이메일 · 비밀번호(눈 토글) → loginCustomer → 토큰 저장(setCustomerToken) → 회원 · 반려견 불러와 useAuth().login
 *  - 로그인 뒤: ?redirect= 주소(안전한 내부 주소만, safeInternalRedirect) — 연구소 분석 화면이면 반려견 준비 여부 확인(petLensPostAuthDestination)
 *    redirect 가 없으면 앱 홈(/app/home-1/)
 *  - 간편 로그인(네이버 · 카카오 · 구글)은 웹과 같은 SocialAuthButtons, 돌아올 곳도 같은 규칙
 *  - 구매 흐름(?redirect=/checkout…)으로 왔을 때만 비회원 주문서 미리보기
 *  - 이미 로그인돼 있으면 바로 돌아갈 곳으로
 * 모양(스티커북 다이어리 한 쪽): 색인 탭(로그인 · 회원가입) · 링 구멍 난 점 모눈 속지 ·
 *   머리 = 간결(댕다방 글자 로고 + 한 줄, 2026-10-15 확정) · 입력칸 = 왼쪽 색 칸 + 절취선 라벨 스티커 ·
 *   알림 = 테이프 붙인 포스트잇 · 자수 와펜 로그인 · 간편 로그인 = 스티커 받침지 위 동그란 스티커 3장 · 가입 선물 포스트잇
 * 회원가입은 앱 회원가입 화면(/app/sticker/signup)으로.
 */

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { appSignupHref } from "@/components/app-shell/appTabs";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import { useDdbApiReady } from "@/hooks/useDdbApiReady";
import { customerApiErrorMessage, ddbApiReady, loadCurrentCustomer, loadPetProfilesSmart, loginCustomer, setCustomerToken } from "@/lib/customer-api";
import { safeInternalRedirect } from "@/lib/internal-redirect";
import { petLensPostAuthDestination } from "@/lib/petlens-routing";
import { useAuth, type PetProfile } from "@/lib/store";
import { haptic } from "../gestures";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { HC_CSS, SAMPLE } from "../shared";
import { DiaryBody, DiaryTabs, PARTS_CSS } from "../sticker-parts";
import { Patch, STICKER_CSS, Tape } from "../sticker-kit";

const APP_HOME = "/app/home-1/";
/* 색인 탭 — 로그인(지금 쪽) · 회원가입(가입 화면으로) */
const TABS = [
    { label: "로그인", color: "#ffd6e2" },
    { label: "회원가입", color: "#fff1b8" },
];

/* 돌아갈 주소(?redirect=) — 웹 로그인 화면과 같은 방식(서버에선 없음 · 브라우저에선 안전한 내부 주소만) */
const subscribeToLocation = () => () => {};
const getServerRedirect = () => null;
const getClientRedirect = () => {
    if (typeof window === "undefined") return null;
    return safeInternalRedirect(new URLSearchParams(window.location.search).get("redirect"), window.location.origin);
};

export default function StickerLogin() {
    const router = useRouter();
    const { login, user, hydrated } = useAuth();
    const apiReady = useDdbApiReady();
    const redirect = useSyncExternalStore(subscribeToLocation, getClientRedirect, getServerRedirect);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // 구매 흐름에서 왔을 때만 비회원 주문서 미리보기
    const checkoutRedirect = redirect && (redirect === "/checkout" || redirect.startsWith("/checkout?") || redirect.startsWith("/checkout#")) ? redirect : null;
    const back = redirect || APP_HOME;
    const signupHref = appSignupHref(back);

    // 이미 로그인돼 있으면 바로 돌아갈 곳으로
    useEffect(() => {
        if (hydrated && user && !loading) router.replace(back);
    }, [hydrated, user, loading, back, router]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError("");
        if (!ddbApiReady()) {
            setCustomerToken();
            setError("지금은 회원 로그인을 사용할 수 없습니다. 잠시 후 다시 이용해 주세요.");
            return;
        }
        if (!email.trim() || !password) {
            setError("이메일과 비밀번호를 입력해 주세요.");
            haptic("light");
            return;
        }
        setLoading(true);
        try {
            const token = await loginCustomer({ email: email.trim(), password });
            const apiAccessToken = token.access_token;
            setCustomerToken(apiAccessToken);
            const [apiUser, savedPets] = await Promise.all([
                loadCurrentCustomer(apiAccessToken).catch(() => null),
                loadPetProfilesSmart(apiAccessToken).catch(() => [] as PetProfile[]),
            ]);
            const pets = savedPets || [];
            login({
                apiUserId: apiUser?.id,
                apiAccessToken,
                name: apiUser?.name || email.split("@")[0] || "댕다방 회원",
                email: apiUser?.email || email.trim(),
                joinedAt: new Date().toISOString(),
                pets,
            });
            haptic("medium");
            router.push(petLensPostAuthDestination(back, pets));
        } catch (err) {
            setCustomerToken();
            setError(customerApiErrorMessage(err));
            haptic("light");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + LOGIN_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">
                {/* 색인 탭 — 회원가입 탭은 가입 화면으로 */}
                <DiaryTabs tabs={TABS} active={0} onPick={(i) => { if (i === 1) router.push(signupHref); }} />
                <DiaryBody pageKey="login" dir={1}>
                    <h1 className="sr-only">로그인</h1>
                    {/* 머리 — 간결: 댕다방 글자 로고 + 한 줄(협업자 문구). 꾸밈 없이 입력칸에 눈이 가게 */}
                    <div className="flex flex-col items-center pb-1 pt-3 text-center">
                        <Image src="/images/wordmark.png" alt="댕다방" width={400} height={157} priority className="h-11 w-auto" />
                        <p className="ah-light mt-3 text-[13px]" style={{ color: TEXT_SOFT }}>우리 댕댕이의 매일이 특별해지는 곳</p>
                    </div>

                    {/* 알림 — 테이프 붙인 포스트잇(서버 준비 중 = 노랑 · 오류 = 분홍) */}
                    {apiReady === false ? (
                        <p className="lg-note st-postit ah-light relative mt-4 px-3.5 pb-2.5 pt-3 text-[12px]" style={{ background: "#fff3a6", rotate: "-0.8deg" }}>
                            <Tape className="-top-1.5 left-4 h-3 w-9" color="rgba(255,200,215,.85)" style={{ rotate: "-5deg" }} />
                            지금은 회원 로그인을 준비 중입니다. 잠시 후 다시 이용해 주세요.
                        </p>
                    ) : null}
                    {error ? (
                        <p role="alert" className="lg-note st-postit ah-light relative mt-4 px-3.5 pb-2.5 pt-3 text-[12px]" style={{ background: "#ffd6e2", rotate: "0.8deg" }}>
                            <Tape className="-top-1.5 left-4 h-3 w-9" color="rgba(255,232,170,.9)" style={{ rotate: "4deg" }} />
                            {error}
                        </p>
                    ) : null}

                    {/* 입력칸 — 왼쪽 색 칸(아이콘) + 절취선 라벨 스티커 */}
                    <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
                        <label className="lg-label flex h-[52px] items-stretch" style={{ ["--stub" as string]: "#ffe1ea", ["--ink" as string]: "#d2457a" }}>
                            <span className="lg-stub grid w-12 shrink-0 place-items-center text-[14px]"><i aria-hidden="true" className="fa-solid fa-envelope" /></span>
                            <span className="sr-only">이메일 또는 아이디</span>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일 또는 아이디" autoComplete="email" inputMode="email"
                                className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-[#c2b2aa]" />
                        </label>
                        <label className="lg-label flex h-[52px] items-stretch" style={{ ["--stub" as string]: "#fff1c4", ["--ink" as string]: "#c98a12" }}>
                            <span className="lg-stub grid w-12 shrink-0 place-items-center text-[14px]"><i aria-hidden="true" className="fa-solid fa-lock" /></span>
                            <span className="sr-only">비밀번호</span>
                            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" autoComplete="current-password"
                                className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-[#c2b2aa]" />
                            <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
                                className="lg-eye grid w-11 shrink-0 place-items-center text-[13px] text-[#b8a59c]">
                                <i aria-hidden="true" className={`fa-solid ${showPw ? "fa-eye-slash" : "fa-eye"}`} />
                            </button>
                        </label>
                        <div className="pt-1">
                            <Patch type="submit" disabled={loading}>{loading ? "로그인 중…" : "로그인"}<i aria-hidden="true" className="fa-solid fa-paw text-[14px]" /></Patch>
                        </div>
                    </form>
                    <p className="mt-3 text-right">
                        <Link href="/forgot-password" className="ah-light text-[12px] text-[#a8968d] underline decoration-dashed underline-offset-4">비밀번호를 잊으셨나요?</Link>
                    </p>

                    {/* 간편 로그인 — 스티커 받침지(이형지) 위 동그란 스티커 3장 */}
                    <div className="st-sheet relative mt-6 rounded-[16px] px-4 pb-4 pt-5" style={{ rotate: "-0.6deg" }}>
                        <span className="st-tape ah-display absolute -top-2.5 left-4 px-2.5 py-0.5 text-[11px] text-[#c4567a]" style={{ background: "rgba(255,214,228,.9)", rotate: "-3deg" }}>간편 로그인</span>
                        <div className="lg-social">
                            <SocialAuthButtons mode="login" variant="compact" returnTo={back} />
                        </div>
                    </div>

                    {/* 구매 흐름에서 왔을 때만 — 비회원 주문서 미리보기 */}
                    {checkoutRedirect ? (
                        <div className="mt-5">
                            <Patch tone="cream" small onClick={() => router.push(checkoutRedirect)}>비회원 주문서 미리보기<i aria-hidden="true" className="fa-solid fa-bag-shopping text-[12px]" /></Patch>
                            <p className="ah-light mt-2 text-center text-[11px]" style={{ color: TEXT_SOFT }}>테스트 결제창은 심사용 테스트 계정으로 로그인해야 열 수 있습니다.</p>
                        </div>
                    ) : null}

                    {/* 처음이라면 — 가입 선물 포스트잇(가입 화면으로) */}
                    <Link href={signupHref} className="lg-gift st-postit relative mt-6 flex items-center gap-3 px-3.5 pb-3 pt-3.5" style={{ background: "#fff3a6", rotate: "0.8deg" }}>
                        <Tape className="-top-2 left-1/2 h-3.5 w-12 -translate-x-1/2" color="rgba(200,226,255,.85)" style={{ rotate: "3deg" }} />
                        <Image src="/images/ui/stickers/signup-gift.webp" alt="" width={44} height={44} className="h-11 w-11 shrink-0" />
                        <span className="min-w-0 flex-1">
                            <span className="ah-display block text-[14px]">처음이에요</span>
                            <span className="ah-light block text-[12px] text-[#8f5e12]">회원가입하면 {SAMPLE.signupBonus}코인 선물</span>
                        </span>
                        <i aria-hidden="true" className="fa-solid fa-chevron-right text-[10px] text-[#c9a64a]" />
                    </Link>
                </DiaryBody>
            </div>
        </div>
    );
}

/* 앱 로그인 CSS */
const LOGIN_CSS = `
/* 입력칸 = 라벨 스티커: 흰 종이 + 왼쪽 색 칸(절취선) + 종이 그림자 · 초점이면 색 테두리 */
.lg-label { border-radius: 12px; background: #fff; overflow: hidden; box-shadow: inset 0 0 0 1.5px #f3e3da, 0 7px 12px -9px rgba(150,90,70,.45); transition: box-shadow .2s; }
.lg-label:focus-within { box-shadow: inset 0 0 0 2px var(--ink), 0 7px 12px -9px rgba(150,90,70,.45); }
.lg-stub { background: var(--stub); color: var(--ink); border-right: 2px dashed rgba(255,255,255,.95); }
.lg-label input { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; color: #5a4038; }
.lg-eye { -webkit-tap-highlight-color: transparent; transition: transform .3s cubic-bezier(.3,1.6,.5,1); }
.lg-eye:active { transform: scale(.85); }
.lg-note { animation: hc-pop .35s cubic-bezier(.3,1.6,.5,1) both; }
/* 간편 로그인(웹 공용 부품): 받침지 위 동그란 스티커처럼 흰 칼선 + 살짝 기울기 */
.lg-social a, .lg-social button { box-shadow: 0 0 0 3px #fff, 0 6px 10px -6px rgba(90,60,50,.4); }
.lg-social a:nth-child(odd), .lg-social button:nth-child(odd) { rotate: -4deg; }
.lg-social a:nth-child(even), .lg-social button:nth-child(even) { rotate: 4deg; }
/* 가입 선물 포스트잇: 누르면 들렸다 붙음 */
.lg-gift { transition: transform .45s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.lg-gift:active { transform: translateY(-3px) scale(1.02); transition-duration: .12s; }
@media (prefers-reduced-motion: reduce) { .lg-note { animation: none; } }
`;
