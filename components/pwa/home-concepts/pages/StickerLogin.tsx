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
 *  - 구매 흐름(?redirect=/checkout…)으로 왔을 때는 웹 "주문 로그인"(components/guest/CheckoutLoginWeb)과 같은 갈림길 — 2026-10-26 사용자
 *    담은 상품 미니 폴라로이드 · 회원으로 주문(같은 로그인 · 간편 로그인 · 회원 혜택) · 비회원으로 주문(진행 순서 · 알아 둘 것 ·
 *    setGuestCheckoutMode 후 주문서로) · 회원가입 20C · 비회원 주문 조회(/order-lookup). 일반 로그인 아래에도 비회원 주문 조회 링크
 *  - 화면을 열 때 이미 로그인돼 있으면 바로 돌아갈 곳으로(이 화면에서 로그인한 경우는 위 로그인 뒤 주소가 우선)
 * 모양(스티커북 다이어리 한 쪽): 색인 탭(로그인 · 회원가입) · 링 구멍 난 점 모눈 속지 ·
 *   머리 = 간결(댕다방 글자 로고 + 한 줄, 2026-10-15 확정) · 입력칸 = 왼쪽 색 칸 + 절취선 라벨 스티커 ·
 *   알림 = 테이프 붙인 포스트잇 · 자수 와펜 로그인 · 간편 로그인 = 스티커 받침지 위 동그란 스티커 3장 · 가입 선물 포스트잇
 * 회원가입은 앱 회원가입 화면(/app/sticker/signup)으로.
 */

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { appSignupHref } from "@/components/app-shell/appTabs";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import { useDdbApiReady } from "@/hooks/useDdbApiReady";
import { customerApiErrorMessage, ddbApiReady, loadCurrentCustomer, loadPetProfilesSmart, loginCustomer, setCustomerToken } from "@/lib/customer-api";
import { safeInternalRedirect } from "@/lib/internal-redirect";
import { petLensPostAuthDestination } from "@/lib/petlens-routing";
import { useLiveInventorySnapshot } from "@/lib/catalog/live-inventory";
import { guestOrderEnabled, setGuestCheckoutMode } from "@/lib/guest-order";
import { useI18n } from "@/lib/i18n";
import { cartProducts } from "@/lib/shop";
import { useAuth, useCart, type PetProfile } from "@/lib/store";
import { useShopMedia } from "../shop/useShopMedia";
import { haptic } from "../gestures";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { HC_CSS } from "../shared";
import { DiaryBody, DiaryTabs, PARTS_CSS } from "../sticker-parts";
import { Patch, STICKER_CSS, Tape } from "../sticker-kit";

const APP_HOME = "/app/home-1/";
/** 가입 선물 코인 — 웹 가입 화면 문구("신규 가입 혜택 · 20C", app/auth/signup/page.tsx ~:853 · lib/signup-agreements.ts)와 같은 값 */
const SIGNUP_BONUS_COINS = 20;
/** 이메일 형식 — 웹 로그인 입력칸(type="email" required)의 브라우저 검사와 같은 규칙(HTML 표준 이메일 형식, 앞뒤 공백 제외) */
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
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

    // 화면을 열 때(로그인 정보 불러오기 끝난 첫 순간) 이미 로그인돼 있었으면 바로 돌아갈 곳으로.
    // 이 화면에서 로그인을 누른 뒤에는 건너뜀 — 로그인 뒤 주소(petLensPostAuthDestination)를 덮어쓰지 않게
    const openedAsMemberRef = useRef<boolean | null>(null);
    const submittedRef = useRef(false);
    useEffect(() => {
        if (!hydrated) return;
        if (openedAsMemberRef.current === null) openedAsMemberRef.current = Boolean(user);
        if (openedAsMemberRef.current && user && !submittedRef.current) router.replace(back);
    }, [hydrated, user, back, router]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        // 웹 로그인 이메일 칸(type="email" required) 검사 — 웹은 브라우저가 로그인 처리 전에 막으므로 같은 순서로 맨 먼저.
        // (비밀번호는 웹도 required 가 없어 아래 "이메일과 비밀번호를 입력해 주세요." 검사로 막음)
        const trimmedEmail = email.trim();
        if (!trimmedEmail) { setError("이메일을 입력해 주세요."); haptic("light"); return; }
        if (!EMAIL_PATTERN.test(trimmedEmail)) { setError("이메일 주소 형식을 확인해 주세요. (예: hello@example.com)"); haptic("light"); return; }
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
        submittedRef.current = true;
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
                    {!checkoutRedirect ? (
                        <div className="flex flex-col items-center pb-1 pt-3 text-center">
                            <Image src="/images/wordmark.png" alt="댕다방" width={400} height={157} priority className="h-11 w-auto" />
                            <p className="ah-light mt-3 text-[13px]" style={{ color: TEXT_SOFT }}>우리 댕댕이의 매일이 특별해지는 곳</p>
                        </div>
                    ) : null}

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

                    {checkoutRedirect ? (
                        <CheckoutWays checkoutRedirect={checkoutRedirect} signupHref={signupHref} form={(
                            <>
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
                            <Patch type="submit" disabled={loading}>{loading ? "로그인 중…" : checkoutRedirect ? "로그인하고 주문하기" : "로그인"}<i aria-hidden="true" className={`fa-solid ${checkoutRedirect ? "fa-arrow-right" : "fa-paw"} text-[14px]`} /></Patch>
                        </div>
                    </form>
                    <p className="mt-3 text-right">
                        <Link href="/forgot-password" className="ah-light text-[12px] text-[#a8968d] underline decoration-dashed underline-offset-4">비밀번호를 잊으셨나요?</Link>
                    </p>

                            </>
                        )} />
                    ) : (
                        <>
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
                            <Patch type="submit" disabled={loading}>{loading ? "로그인 중…" : checkoutRedirect ? "로그인하고 주문하기" : "로그인"}<i aria-hidden="true" className={`fa-solid ${checkoutRedirect ? "fa-arrow-right" : "fa-paw"} text-[14px]`} /></Patch>
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
                        </>
                    )}

                    {/* 처음이라면 · 비회원 주문 조회 — 주문 갈래는 아래 띠에 같은 내용이 있어 일반 로그인에서만 */}
                    {!checkoutRedirect ? (
                        <>
                    {/* 처음이라면 — 가입 선물 포스트잇(가입 화면으로) */}
                    <Link href={signupHref} className="lg-gift st-postit relative mt-6 flex items-center gap-3 px-3.5 pb-3 pt-3.5" style={{ background: "#fff3a6", rotate: "0.8deg" }}>
                        <Tape className="-top-2 left-1/2 h-3.5 w-12 -translate-x-1/2" color="rgba(200,226,255,.85)" style={{ rotate: "3deg" }} />
                        <Image src="/images/ui/stickers/signup-gift.webp" alt="" width={44} height={44} className="h-11 w-11 shrink-0" />
                        <span className="min-w-0 flex-1">
                            <span className="ah-display block text-[14px]">처음이에요</span>
                            <span className="ah-light block text-[12px] text-[#8f5e12]">회원가입하면 {SIGNUP_BONUS_COINS}코인 선물</span>
                        </span>
                        <i aria-hidden="true" className="fa-solid fa-chevron-right text-[10px] text-[#c9a64a]" />
                    </Link>
                    {/* 비회원 주문 조회 — 웹 로그인과 같은 주소(주문번호 · 조회 비밀번호) */}
                    <p className="mt-5 text-center">
                        <Link href="/order-lookup" className="ah-display inline-flex items-center gap-1.5 text-[12.5px] text-[#a8968d]"><i aria-hidden="true" className="fa-solid fa-magnifying-glass text-[11px]" />비회원 주문 조회</Link>
                    </p>
                        </>
                    ) : null}
                </DiaryBody>
            </div>
        </div>
    );
}

/* ───────── 주문 로그인 갈림길 — 웹 CheckoutLoginWeb 과 같은 내용 · 같은 동작을 스티커북으로 ─────────
   ① 머리: ORDER · "주문하기 전에, 어떻게 주문할까요?" · 담은 상품 미니 폴라로이드(사진 · 개수 · 금액)
   ② 회원으로 주문(흰 종이): 위 로그인 칸(form) · 간편 로그인(돌아올 곳 = 주문서) · 회원 혜택 스티커
   ③ 비회원으로 주문(노란 포스트잇): 진행 순서 넷 · 알아 둘 것 · 비회원으로 주문하기(setGuestCheckoutMode → 주문서)
   ④ 아래 띠: 회원가입(20C) · 비회원 주문 조회(/order-lookup) */
function CheckoutWays({ checkoutRedirect, signupHref, form }: { checkoutRedirect: string; signupHref: string; form: ReactNode }) {
    const router = useRouter();
    const cart = useCart();
    const liveInventory = useLiveInventorySnapshot();
    const { formatPrice } = useI18n();
    const media = useShopMedia(); // 담은 상품 사진 주소(네이티브 앱은 운영 사이트 파일)
    const lines = cartProducts(cart.lines, liveInventory).filter((line) => line.selected);
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const count = lines.reduce((sum, line) => sum + line.qty, 0);
    const guestReady = guestOrderEnabled();
    // 비회원으로 주문 — 이 탭에 "비회원 주문 중" 표시 후 주문서로(웹과 같은 함수)
    const goGuest = () => {
        haptic("medium");
        setGuestCheckoutMode(true);
        router.push(checkoutRedirect);
    };
    const perks: Array<[string, string]> = [["fa-location-dot", "저장된 배송지 불러오기"], ["fa-receipt", "주문 · 배송 한눈에"], ["fa-coins", "코인 · 맞춤 추천"]];
    const flow: Array<[string, string]> = [["주문자 정보", "이름 · 휴대폰 · 이메일"], ["주문 조회 비밀번호", "주문을 다시 볼 때 써요"], ["배송지 · 결제", "토스 보안 결제창"], ["주문번호로 조회", "배송 확인 · 취소 · 문의"]];
    return (
        <>
            {/* ① 머리 + 담은 상품 */}
            <div className="pt-2">
                <p className="ah-light text-[10.5px] tracking-[.18em] text-[#c4567a]">ORDER</p>
                <p className="ah-display mt-0.5 text-[19px] leading-snug">주문하기 전에,<br /><span className="st-marker">어떻게</span> 주문할까요?</p>
                <p className="ah-light mt-1 text-[12px] leading-relaxed" style={{ color: TEXT_SOFT }}>회원으로 주문하면 저장된 배송지를 불러오고, 주문 · 배송을 마이에서 바로 볼 수 있어요.</p>
                {count > 0 ? (
                    <div className="st-postit relative mt-4 flex items-center gap-3 px-3 pb-2.5 pt-3" style={{ background: "#fff6ee", rotate: "-0.6deg" }} aria-label={`담은 상품 ${count}개 · ${formatPrice(total)}`}>
                        <Tape className="-top-2 left-5 h-3.5 w-11" color="rgba(190,224,255,.88)" style={{ rotate: "-4deg" }} />
                        <span className="flex shrink-0 -space-x-2" aria-hidden="true">
                            {lines.slice(0, 3).map((line, k) => (
                                <span key={`${line.product.id}-${line.color ?? ""}-${line.size ?? ""}`} className="lg-cartpol relative block h-11 w-11 bg-white p-[3px]" style={{ rotate: `${[-6, 4, -2][k]}deg`, zIndex: 3 - k }}>
                                    <span className="relative block h-full w-full overflow-hidden bg-[#f6efe4]">
                                        {line.image && media ? <Image src={media(line.image) ?? line.image} alt="" fill sizes="44px" className="object-cover" /> : <i className={`fa-solid ${line.product.icon} absolute inset-0 grid place-items-center text-[14px] text-[#e8b9a6]`} />}
                                    </span>
                                </span>
                            ))}
                        </span>
                        <span className="min-w-0 flex-1 text-right">
                            <span className="ah-light block text-[11px]" style={{ color: TEXT_SOFT }}>담은 상품 {count}개</span>
                            <span className="ah-display block text-[17px] text-[#c4456f]">{formatPrice(total)}</span>
                        </span>
                    </div>
                ) : null}
            </div>

            {/* ② 회원으로 주문 */}
            <section aria-labelledby="lg-member-title" className="st-sheet relative mt-6 rounded-[16px] px-3.5 pb-4 pt-5" style={{ rotate: "-0.4deg" }}>
                <span className="st-tape ah-display absolute -top-2.5 left-4 px-2.5 py-0.5 text-[11px] text-[#c4567a]" style={{ background: "rgba(255,214,228,.9)", rotate: "-3deg" }}>회원으로 주문</span>
                <div className="flex items-center gap-2.5">
                    <Image src="/images/ui/stickers/my-profile.webp" alt="" width={40} height={40} className="st-diecut-img h-10 w-10 shrink-0 object-contain" />
                    <span>
                        <span id="lg-member-title" className="ah-display block text-[15px]">로그인하고 바로 주문서로</span>
                        <span className="ah-light block text-[11px]" style={{ color: TEXT_SOFT }}>회원이면 이메일 · 비밀번호로 로그인해요</span>
                    </span>
                </div>
                {form}
                <p className="ah-display mb-2 mt-4 flex items-center justify-center gap-2 text-[11.5px] text-[#c4567a]"><i aria-hidden="true" className="fa-solid fa-paw text-[9px] opacity-60" />간편 로그인<i aria-hidden="true" className="fa-solid fa-paw text-[9px] opacity-60" /></p>
                <div className="lg-social"><SocialAuthButtons mode="login" variant="compact" returnTo={checkoutRedirect} /></div>
                <ul className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label="회원 혜택">
                    {perks.map(([icon, label], k) => (
                        <li key={label} className="lg-perk ah-light inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]" style={{ rotate: `${[-1.5, 1, -0.8][k]}deg` }}><i aria-hidden="true" className={`fa-solid ${icon} text-[9.5px]`} />{label}</li>
                    ))}
                </ul>
            </section>

            {/* ③ 비회원으로 주문 */}
            <section aria-labelledby="lg-guest-title" className="st-postit relative mt-7 px-3.5 pb-4 pt-4" style={{ background: "#fff3a6", rotate: "0.5deg" }}>
                <Tape className="-top-2 left-1/2 h-3.5 w-12 -translate-x-1/2" color="rgba(200,240,215,.92)" style={{ rotate: "3deg" }} />
                <div className="flex items-center gap-2.5">
                    <Image src="/images/ui/header-cart-128.webp" alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
                    <span className="min-w-0 flex-1">
                        <span id="lg-guest-title" className="ah-display block text-[15px]">비회원으로 주문</span>
                        <span className="ah-light block text-[11px] text-[#8f5e12]">가입 없이 이번 주문만 해요</span>
                    </span>
                    {!guestReady ? <span className="ah-display shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] text-[#b07a2a]"><i aria-hidden="true" className="fa-solid fa-plug mr-1 text-[9px]" />결제 연동 준비 중</span> : null}
                </div>
                <ol className="mt-3 grid grid-cols-2 gap-2">
                    {flow.map(([title, sub], k) => (
                        <li key={title} className="flex items-start gap-1.5 rounded-[10px] bg-white/70 px-2 py-1.5">
                            <span className="ah-display grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#f5b445] text-[11px] text-white">{k + 1}</span>
                            <span className="min-w-0"><span className="ah-display block text-[11.5px] leading-tight text-[#5a4038]">{title}</span><span className="ah-light block text-[10px] leading-tight text-[#8f5e12]">{sub}</span></span>
                        </li>
                    ))}
                </ol>
                <ul className="ah-light mt-2.5 space-y-1 text-[11px] leading-snug text-[#8f5e12]">
                    <li><i aria-hidden="true" className="fa-solid fa-key mr-1 text-[9.5px]" />주문번호와 주문 조회 비밀번호를 꼭 기억해 주세요.</li>
                    <li><i aria-hidden="true" className="fa-solid fa-gift mr-1 text-[9.5px]" />코인 적립 · 맞춤 추천 · 저장 배송지는 회원만 쓸 수 있어요.</li>
                </ul>
                <div className="mt-3.5"><Patch tone="butter" small onClick={goGuest}><i aria-hidden="true" className="fa-solid fa-bag-shopping text-[12px]" />비회원으로 주문하기</Patch></div>
                {!guestReady ? <p className="ah-light mt-2 text-center text-[10.5px] text-[#8f5e12]">지금은 주문서까지 볼 수 있고, 결제는 회원 로그인 뒤에 열려요. 비회원 결제는 곧 열려요.</p> : null}
            </section>

            {/* ④ 아래 띠 — 회원가입 20C · 비회원 주문 조회 */}
            <div className="mt-7 grid grid-cols-2 gap-2.5">
                <Link href={signupHref} onClick={() => haptic("light")} className="lg-strip flex flex-col items-center rounded-[14px] bg-white px-2 pb-2.5 pt-3 text-center" style={{ rotate: "-1deg" }}>
                    <Image src="/images/ui/goods-pay-ready-256.webp" alt="" width={40} height={40} className="h-10 w-10 object-contain" />
                    <span className="ah-display mt-1 text-[12.5px]">회원가입하고 {SIGNUP_BONUS_COINS}C</span>
                    <span className="ah-light text-[10px]" style={{ color: TEXT_SOFT }}>이메일 인증하면 바로 들어와요</span>
                </Link>
                <Link href="/order-lookup" onClick={() => haptic("light")} className="lg-strip flex flex-col items-center rounded-[14px] bg-white px-2 pb-2.5 pt-3 text-center" style={{ rotate: "1deg" }}>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e8ddff] text-[15px] text-[#7457d8]"><i aria-hidden="true" className="fa-solid fa-magnifying-glass" /></span>
                    <span className="ah-display mt-1 text-[12.5px]">비회원 주문 조회</span>
                    <span className="ah-light text-[10px]" style={{ color: TEXT_SOFT }}>주문번호 · 조회 비밀번호로</span>
                </Link>
            </div>
        </>
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
/* 네이버 "N" 글자(협업자 SocialAuthButtons) — 앱 글꼴(카페24 써라운드)로 */
.lg-social span { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
.lg-social a:nth-child(odd), .lg-social button:nth-child(odd) { rotate: -4deg; }
.lg-social a:nth-child(even), .lg-social button:nth-child(even) { rotate: 4deg; }
/* 가입 선물 포스트잇: 누르면 들렸다 붙음 */
.lg-gift { transition: transform .45s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.lg-gift:active { transform: translateY(-3px) scale(1.02); transition-duration: .12s; }
/* 주문 로그인 갈림길 — 담은 상품 폴라로이드 · 회원 혜택 스티커 · 아래 띠 카드(누르면 꾹) */
.lg-cartpol { box-shadow: 0 5px 9px -5px rgba(90,60,50,.5); }
.lg-perk { background: #fff6ee; color: #8f7a70; box-shadow: inset 0 0 0 1.5px #f3e3da; }
.lg-strip { box-shadow: inset 0 0 0 1.5px #f3e6dc, 0 10px 16px -12px rgba(120,80,60,.45); -webkit-tap-highlight-color: transparent; transition: transform .35s cubic-bezier(.3,1.6,.5,1); }
.lg-strip:active { transform: scale(.95); }
@media (prefers-reduced-motion: reduce) { .lg-note { animation: none; } }
`;
