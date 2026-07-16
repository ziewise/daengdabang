"use client";

/**
 * LoginPage — 풀스크린 로그인 (헤더/푸터 없음 · ConditionalChrome 가 크롬 숨김).
 * ---------------------------------------------------------------------
 * 중앙 카드: 좌 9:16 브랜드 영상(public/videos/login.mp4) + 우 로그인 폼.
 * 색 톤은 영상(따뜻한 크림 방 + 흰 강아지 + 하늘 반다나)에 맞춰 크림/허니 앰버로 통일.
 * 폼: 이메일/아이디 · 비밀번호(눈 토글) · 로그인 · 간편로그인(원형) · 회원가입.
 * 로그인 로직은 기존 흐름을 유지.
 */

import { FormEvent, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    customerApiErrorMessage,
    ddbApiReady,
    loadCurrentCustomer,
    loadPetProfilesSmart,
    loginCustomer,
    setCustomerToken,
} from "@/lib/customer-api";
import { useAuth, type PetProfile } from "@/lib/store";
import { safeInternalRedirect } from "@/lib/internal-redirect";
import { useDdbApiReady } from "@/hooks/useDdbApiReady";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import BrandLogo from "@/components/header/BrandLogo";

const subscribeToLocation = () => () => {};
const getServerRedirect = () => null;
const getClientRedirect = () => {
    if (typeof window === "undefined") return null;
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    return safeInternalRedirect(redirect, window.location.origin);
};

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const apiReady = useDdbApiReady();
    // 구매 흐름 등에서 ?redirect=/checkout 로 넘어오면 로그인/비회원 주문 후 그 경로로 보낸다(내부 경로만 허용 — 오픈 리다이렉트 방지)
    const redirect = useSyncExternalStore(subscribeToLocation, getClientRedirect, getServerRedirect);

    // 비회원 주문 — 회원가입/로그인 없이 바로 결제로(현재 checkout 은 게스트 주문 허용)
    const guestCheckout = () => router.push(redirect || "/checkout");

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError("");
        if (!ddbApiReady()) {
            setCustomerToken();
            setError("지금은 회원 로그인을 사용할 수 없습니다. 잠시 후 다시 이용해 주세요.");
            return;
        }
        if (!email.trim() || !password.trim()) {
            setError("이메일과 비밀번호를 입력해 주세요.");
            return;
        }

        setLoading(true);
        try {
            const token = await loginCustomer({ email: email.trim(), password: password.trim() });
            const apiAccessToken = token.access_token;
            setCustomerToken(apiAccessToken);

            const [apiUser, savedPets] = await Promise.all([
                loadCurrentCustomer(apiAccessToken).catch(() => null),
                loadPetProfilesSmart(apiAccessToken).catch(() => [] as PetProfile[]),
            ]);
            const pets = savedPets || [];
            const userName = apiUser?.name || email.split("@")[0] || "댕다방 회원";

            login({
                apiUserId: apiUser?.id,
                apiAccessToken,
                name: userName,
                email: apiUser?.email || email.trim(),
                joinedAt: new Date().toISOString(),
                pets,
            });
            router.push(redirect || "/mypage");
        } catch (err) {
            setCustomerToken();
            setError(customerApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#fdf9f1] via-[#fbf3e7] to-[#faecd9] px-4 py-8">
            {/* 영상 톤(크림/허니)에 맞춘 부드러운 블롭 장식 */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-orange-200/35 blur-3xl" />
            <div className="pointer-events-none absolute right-10 top-16 h-40 w-40 rounded-full bg-sky-200/30 blur-3xl" />

            {/* 로그인 카드 — 좌 9:16 영상 / 우 폼 */}
            <div className="relative z-10 flex w-full max-w-[860px] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(180,120,40,0.20)]">
                {/* 카드 우측 상단 — 홈으로 이동(헤더 없는 풀스크린이라 별도 제공) */}
                <Link
                    href="/main"
                    aria-label="홈으로"
                    className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3.5 py-1.5 text-xs font-black text-neutral-600 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:bg-white hover:text-amber-600"
                >
                    <i className="fa-solid fa-house text-xs" />
                    홈으로
                </Link>
                {/* 좌: 9:16 브랜드 영상 (md+ 노출) — 자동재생 무한루프 */}
                <div className="relative hidden w-[42%] shrink-0 overflow-hidden bg-[#f6efe3] md:block">
                    <video
                        src="/videos/login.mp4"
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    {/* 하단 살짝 어둡게 — 브랜드 문구 가독성 */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent p-5 pt-12">
                        <p className="text-sm font-black text-white drop-shadow">우리 댕댕이의 매일이 특별해지는 곳</p>
                        <p className="mt-0.5 text-[11px] font-bold text-white/85 drop-shadow">댕다방 · 큐레이션 펫 쇼핑몰</p>
                    </div>
                </div>

                {/* 우: 로그인 폼 */}
                <div className="flex w-full flex-col justify-center px-7 py-9 sm:px-9 md:w-[58%]">
                    {/* 헤더와 동일한 로고(강아지 + 댕다방 워드마크) — 로그인 버튼이 있어 "로그인" 제목은 생략 */}
                    <div className="mb-7">
                        <BrandLogo />
                        <h1 className="sr-only">로그인</h1>
                    </div>

                    {apiReady === false && (
                        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs font-bold leading-6 text-amber-800">
                            지금은 회원 로그인을 준비 중입니다. 잠시 후 다시 이용해 주세요.
                        </p>
                    )}
                    {error && (
                        <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-xs font-bold leading-6 text-rose-700">{error}</p>
                    )}

                    <form onSubmit={submit} className="grid gap-3">
                        {/* 이메일/아이디 */}
                        <div className="relative">
                            <i className="fa-solid fa-user pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="이메일 또는 아이디"
                                autoComplete="email"
                                required
                                className="h-12 w-full rounded-xl border border-neutral-200 bg-[#faf7f1] pl-10 pr-4 text-sm font-bold text-neutral-900 placeholder:font-medium placeholder:text-neutral-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
                            />
                        </div>
                        {/* 비밀번호 + 눈 토글 */}
                        <div className="relative">
                            <i className="fa-solid fa-lock pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400" />
                            <input
                                type={showPw ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="비밀번호"
                                autoComplete="current-password"
                                className="h-12 w-full rounded-xl border border-neutral-200 bg-[#faf7f1] pl-10 pr-11 text-sm font-bold text-neutral-900 placeholder:font-medium placeholder:text-neutral-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw((v) => !v)}
                                aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 transition hover:text-neutral-700"
                            >
                                <i className={`fa-solid ${showPw ? "fa-eye-slash" : "fa-eye"} text-sm`} />
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-1 h-12 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-sm font-black text-white shadow-[0_8px_20px_rgba(245,158,11,0.35)] transition hover:from-amber-500 hover:to-amber-600 disabled:opacity-60"
                        >
                            {loading ? "로그인 중…" : "로그인"}
                        </button>
                    </form>

                    {/* 비밀번호 찾기 — 추후 연결 */}
                    <div className="mt-3 text-right">
                        <button
                            type="button"
                            onClick={() => setError("비밀번호 찾기는 준비 중입니다.")}
                            className="text-xs font-bold text-neutral-400 transition hover:text-amber-600"
                        >
                            비밀번호를 잊으셨나요?
                        </button>
                    </div>

                    {/* 간편 로그인 — 구분선 + 원형 아이콘 */}
                    <div className="my-5 flex items-center gap-3">
                        <div className="h-px flex-1 bg-neutral-200" />
                        <span className="text-[11px] font-bold text-neutral-400">간편 로그인</span>
                        <div className="h-px flex-1 bg-neutral-200" />
                    </div>
                    <SocialAuthButtons mode="login" variant="compact" />

                    {/* 비회원 주문 — 구매 흐름(?redirect=...)으로 넘어왔을 때만 노출.
                        헤더 로그인 버튼으로 그냥 들어오면 redirect 가 없어 숨긴다. */}
                    {redirect && (
                        <button
                            type="button"
                            onClick={guestCheckout}
                            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-neutral-200 text-sm font-black text-neutral-600 transition hover:border-amber-300 hover:bg-amber-50/60 hover:text-amber-700"
                        >
                            <i className="fa-solid fa-bag-shopping text-xs" />
                            비회원으로 주문하기
                        </button>
                    )}

                    {/* 회원가입 */}
                    <p className="mt-5 text-center text-xs font-bold text-neutral-500">
                        계정이 없으신가요?{" "}
                        <Link href="/auth/signup" className="font-black text-amber-600 hover:underline">
                            회원가입
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
