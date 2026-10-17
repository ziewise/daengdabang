"use client";

/**
 * 스티커북 시안 — 마이(/app/sticker/my) · 로컬 시안 전용, 배포 X
 * ---------------------------------------------------------------------
 * 다이어리 첫 장(내 정보 쪽).
 *  - 회원: 이름 카드(테이프 붙인 메모 · 이름 형광펜 · 회원 도장) · 코인 봉투(코인 · 적립금 · 1,000P → 10코인 바꾸기, 코인이 날아감) ·
 *          우리 아이 폴라로이드(+ 아이 추가) · 최근 주문 영수증 · 내 정보 메뉴(줄 노트) · 고객센터 · 로그아웃
 *  - 로그인 전: 로그인 초대(주문 · 아이 프로필 · 코인 지갑) + 고객센터 · 약관(로그인 없이)
 * 세부 화면(주문 상세 · 배송지 · 결제수단 · 추천 설정 · 정보 수정 · 탈퇴 등)은 기존 마이페이지로 이어진다.
 */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { hasVerifiedPetPhoto, useAuth } from "@/lib/store";
import SignupEmailVerification from "@/components/auth/SignupEmailVerification";
import { convertRewardPointsToDaengLabCoins, getCustomerToken, loadDaengLabWallet, type DaengLabWallet } from "@/lib/customer-api";
import { ddbApiBase } from "@/lib/ddb-api-base";
import { formatOrderAmount, loadTossOrderHistory, orderDateLabel, orderStatusLabel, type TossOrderHistoryItem } from "@/lib/toss-order-history";
import { memberAccountDisplay } from "@/lib/member-account-display";
import { GRADES } from "@/lib/grades";
import { haptic } from "../gestures";
import { CoinChip, KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { CS_MENUS, MY_MENUS } from "../page-data";
import { HC_CSS, flyCoin } from "../shared";
import { DiaryBody, InkStamp, NoteToast, PARTS_CSS, SectionLabel } from "../sticker-parts";
import { LoginInvite, Patch, STICKER_CSS, Tape } from "../sticker-kit";

const REDIRECT = "/app/sticker/my/";
/** 회원 등급 — 실제 산정 전까지 첫 등급(댕린이)으로 통일 */
const FIRST_GRADE = GRADES[0];
/** 적립금 전환 요청 키 — 웹 지갑 카드(DaengLabWalletCard)의 requestKey 와 같은 규칙(같은 전환을 다시 보내도 한 번만 처리) */
function requestKey() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return `wallet-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/** 로그아웃 뒤 가는 앱 홈(탭바 "홈"과 같은 주소) */
const APP_HOME = "/app/home-1/";

/** 메뉴 3D 그림(사용자 그림, 2026-10-16) — 메뉴 이름 → 그림. 없으면 글자 아이콘 */
const MENU_IMG: Record<string, string> = {
    "주문 내역": "my-orders", "반려견 관리": "my-pets", "배송지 관리": "my-address", "결제수단": "my-payments", "추천 설정": "my-recommend", "정보 수정": "my-profile",
    "공지사항": "cs-notice", "자주 묻는 질문": "cs-faq", "1:1 문의": "cs-inquiry", "교환 · 반품": "cs-return", "이용약관": "cs-terms", "개인정보처리방침": "cs-privacy",
};

/** 메뉴 목록 (흰 메모 카드 · 줄 없음) */
function LinedMenu({ items }: { items: readonly { icon: string; title: string; href: string }[] }) {
    return (
        <ul className="st-lined mt-2">
            {items.map((m) => (
                <li key={m.title}>
                    <Link href={m.href} className="flex items-center gap-3 py-2.5 active:opacity-60">
                        {MENU_IMG[m.title] ? (
                            <Image src={`/images/ui/stickers/${MENU_IMG[m.title]}.webp`} alt="" width={64} height={64} className="h-8 w-8 shrink-0 object-contain drop-shadow-[0_2px_2px_rgba(120,70,50,.2)]" />
                        ) : (
                            <i aria-hidden="true" className={`fa-solid ${m.icon} w-5 text-center text-[14px] text-[#f48fac]`} />
                        )}
                        <span className="ah-display flex-1 text-[14.5px]">{m.title}</span>
                        <i aria-hidden="true" className="fa-solid fa-chevron-right text-[10px] text-[#c9b4a8]" />
                    </Link>
                </li>
            ))}
        </ul>
    );
}

export default function StickerMy() {
    // 로그인 상태 — 협업자 useAuth 그대로(시안 "로그인 전/후" 토글 대신 실제 상태, 배포 전 연결 2026-10-16)
    const { user, hydrated, logout, updateMemberEmail } = useAuth();
    const member = hydrated && Boolean(user);
    const accessToken = user?.apiAccessToken || "";
    const coinRef = useRef<HTMLSpanElement>(null);
    const convertRef = useRef<HTMLButtonElement>(null);
    const [toast, setToast] = useState<string | null>(null);
    const clearToast = useCallback(() => setToast(null), []);
    const router = useRouter();

    // 로그아웃 — 웹 마이페이지 메뉴(MypageSidebar)와 같은 기능(확인 → 실제 logout()).
    // 확인은 휴대폰 기본 창 대신 우리 확인 카드(같은 문구 · 취소 = 아무것도 안 함, 로그아웃 = 진행).
    // 끝난 뒤 가는 곳만 앱 홈(웹은 /main) — 사용자 결정 2026-10-16 "같은 기능의 앱 화면"
    const [logoutAsk, setLogoutAsk] = useState(false);
    const handleLogout = () => setLogoutAsk(true);
    const confirmLogout = () => {
        setLogoutAsk(false);
        logout();
        router.push(APP_HOME);
    };

    // 연구소 지갑(코인 · 적립금) — 웹 마이페이지 DaengLabWalletCard 와 같은 loadDaengLabWallet(accessToken)
    const [wallet, setWallet] = useState<DaengLabWallet | null>(null);
    const [walletError, setWalletError] = useState("");
    // 지갑 반영 + 알림 — 웹 지갑 카드의 publishWallet 과 같음(다른 화면의 코인 표시도 함께 갱신)
    const publishWallet = useCallback((next: DaengLabWallet) => {
        setWallet(next);
        window.dispatchEvent(new CustomEvent("ddb:daenglab-wallet", { detail: next }));
    }, []);
    useEffect(() => {
        if (!member) return;
        let active = true;
        const timer = window.setTimeout(() => {
            setWalletError("");
            void loadDaengLabWallet(accessToken)
                .then((next) => {
                    if (active) publishWallet(next);
                })
                .catch((reason) => {
                    if (active) setWalletError(reason instanceof Error ? reason.message : "댕다방 연구소 지갑을 불러오지 못했습니다.");
                });
        }, 0);
        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [member, accessToken, publishWallet]);

    // 적립금 → 코인 바꾸기 — 웹 지갑 카드의 submitConversion 과 같은 조건 · 같은 함수 · 같은 재시도 키 규칙.
    // 웹은 바꿀 적립금을 입력하지만(기본값 = 전환 단위), 앱은 한 번에 전환 단위만큼(되돌릴 수 없음 안내 그대로)
    const [converting, setConverting] = useState(false);
    const retryKeyRef = useRef<{ points: number; key: string } | null>(null);
    const canConvert = Boolean(wallet && wallet.rewardPointsDebt === 0 && wallet.pointConversionUnit <= wallet.rewardPoints);
    const convert = async () => {
        if (!wallet || converting || !canConvert) return;
        const points = wallet.pointConversionUnit;
        const retry = retryKeyRef.current;
        const key = retry?.points === points ? retry.key : requestKey();
        retryKeyRef.current = { points, key };
        setConverting(true);
        try {
            const converted = await convertRewardPointsToDaengLabCoins(points, key, accessToken);
            retryKeyRef.current = null;
            publishWallet(converted.wallet);
            haptic("medium");
            flyCoin(convertRef.current, coinRef.current, 3);
            setToast(`${converted.convertedRewardPoints.toLocaleString("ko-KR")}P를 ${converted.grantedDaengLabCoins}C로 전환했습니다.`);
        } catch (reason) {
            setToast(reason instanceof Error ? reason.message : "적립금 전환을 완료하지 못했습니다.");
        } finally {
            setConverting(false);
        }
    };

    // 최근 주문 2개 — 웹 주문 내역 화면과 같은 loadTossOrderHistory(같은 주소 · 토큰), 상태 · 날짜 · 금액 표시 함수도 같은 것
    const [orders, setOrders] = useState<TossOrderHistoryItem[] | null>(null);
    const [ordersError, setOrdersError] = useState(false);
    useEffect(() => {
        if (!member) return;
        const token = user?.apiAccessToken || getCustomerToken();
        if (!token) return;
        const controller = new AbortController();
        loadTossOrderHistory({ baseUrl: ddbApiBase(), accessToken: token, signal: controller.signal, limit: 2, offset: 0 })
            .then((page) => setOrders(page.orders))
            .catch(() => {
                if (!controller.signal.aborted) setOrdersError(true);
            });
        return () => controller.abort();
    }, [member, user?.apiAccessToken]);

    const pets = user?.pets ?? [];

    return (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + MY_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">
                <DiaryBody pageKey={member ? "member" : "guest"} dir={1}>
                    {member ? (
                        <>
                            {/* 이름 카드 — 메모지에 테이프로 붙인 이름 카드(사용자 2026-10-16: 영문 "HELLO my name is" 행사 명찰은 컨셉과 안 맞음)
                                이름(형광펜) · 이메일 · 회원 등급 잉크 도장 */}
                            <div className="my-tag relative mx-auto w-[92%] rounded-[6px_6px_18px_6px] px-5 pb-4 pt-5" style={{ rotate: "-1deg" }}>
                                <Tape className="-top-2 left-5 h-4 w-14" color="repeating-linear-gradient(90deg, rgba(255,200,215,.92) 0 7px, rgba(255,226,234,.92) 7px 14px)" style={{ rotate: "-4deg" }} />
                                <p className="ah-display mt-1 text-[26px] leading-tight"><span className="st-marker">{user?.name}</span><span className="text-[17px]"> 님</span></p>
                                <p className="ah-light mt-1 text-[11.5px]" style={{ color: TEXT_SOFT }}>{memberAccountDisplay(user?.email, user?.authProvider)}</p>
                                {/* 회원 등급 도장 — 협업자 등급 정의(lib/grades) 첫 단계 이름. 실제 등급 산정(서버 결제액 · 활동 점수)이 아직 연결되지 않아
                                    모두 첫 등급으로 통일(사용자 결정 2026-10-16). 연결되면 그 회원의 등급으로 바꾼다 */}
                                <InkStamp rot={-10} color={FIRST_GRADE.color} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 text-[13px]">{FIRST_GRADE.name}</InkStamp>
                            </div>

                            {/* 이메일 인증하고 20C 받기 — 웹 지갑 카드(DaengLabWalletCard)와 같은 협업자 부품 · 같은 값(accessToken · accountEmail · hideWhenSettled).
                                인증을 건너뛴 회원에게만 보이고, 지급이 끝났거나 대상이 아니면 부품이 스스로 사라짐(그때는 메모 카드도 :has 로 숨김) */}
                            <div className="my-verify st-postit relative mt-6 px-3 pb-3 pt-4" style={{ rotate: "0.6deg" }}>
                                <Tape className="-top-2 left-1/2 h-3.5 w-12 -translate-x-1/2" color="rgba(200,226,255,.85)" style={{ rotate: "-3deg" }} />
                                <SignupEmailVerification
                                    accessToken={accessToken}
                                    accountEmail={user?.email}
                                    hideWhenSettled
                                    onComplete={(result) => {
                                        // 웹 지갑 카드 onComplete 와 같음: 인증된 이메일 반영 → 받은 지갑으로 갱신 → 같은 안내 문구(앱은 쪽지 알림)
                                        if (result.verifiedEmail) updateMemberEmail(result.verifiedEmail);
                                        publishWallet(result.wallet);
                                        setToast(result.awardedDaengLabCoins > 0
                                            ? `가입 축하 코인 ${result.awardedDaengLabCoins}C가 지급되었습니다.`
                                            : "이메일 인증과 가입 혜택 지급 여부를 확인했습니다.");
                                    }}
                                />
                            </div>

                            {/* 코인 봉투 */}
                            <div className="my-pocket relative mt-6 rounded-[16px] px-4 pb-4 pt-5">
                                <span aria-hidden="true" className="my-flap" />
                                <div className="relative flex items-center justify-between">
                                    <span>
                                        <span className="ah-light block text-[11.5px] text-[#8f5e12]">댕다방 연구소 코인</span>
                                        {/* 불러오는 중 · 실패면 0 대신 "—"(적립금과 같게 · 웹은 불러온 뒤에만 숫자 표시) */}
                                        {wallet
                                            ? <span className="mt-1 inline-block"><CoinChip ref={coinRef} coins={wallet.daengLabCoins} /></span>
                                            : <span className="ah-display mt-1 block text-[18px] tabular-nums">—</span>}
                                    </span>
                                    <span className="text-right">
                                        <span className="ah-light block text-[11.5px] text-[#8f5e12]">적립금</span>
                                        <span className="ah-display block text-[18px] tabular-nums">{wallet ? `${wallet.rewardPoints.toLocaleString("ko-KR")}P` : "—"}</span>
                                    </span>
                                </div>
                                <button ref={convertRef} type="button" onClick={() => void convert()} disabled={!canConvert || converting}
                                    className="ah-display relative mt-3 w-full rounded-full bg-white/90 py-2.5 text-[13px] text-[#c4560f] shadow-[0_6px_12px_-8px_rgba(150,100,30,.6)] disabled:opacity-50">
                                    {converting ? "바꾸는 중…" : (<>적립금 {(wallet?.pointConversionUnit ?? 1000).toLocaleString("ko-KR")}P <i aria-hidden="true" className="fa-solid fa-arrow-right mx-0.5 text-[11px]" /> {wallet?.coinConversionUnit ?? 10}코인 바꾸기</>)}
                                </button>
                                <p className="ah-light relative mt-1.5 text-center text-[10.5px] text-[#a07a3e]">바꾼 코인은 되돌릴 수 없어요{wallet ? ` · 행동 · 소리 분석 1회 ${wallet.analysisCoinCost}코인` : ""}</p>
                                {/* 빚 안내 — 웹 지갑 카드와 같은 조건(적립금 · 코인 빚이 있을 때) · 같은 문구. 빚이 있으면 바꾸기 버튼이 잠기는 이유 */}
                                {wallet && (wallet.rewardPointsDebt > 0 || wallet.daengLabCoinsDebt > 0) ? (
                                    <p className="ah-light relative mt-2 rounded-[4px_4px_12px_4px] bg-[#ffe1ea] px-3 py-2 text-[11px] leading-relaxed text-[#b23a5e]" style={{ rotate: "-0.5deg" }}>
                                        취소·환불된 주문의 사용 완료 혜택이 있어 다음 적립분에서 먼저 정산됩니다.
                                        {wallet.rewardPointsDebt > 0 ? ` 적립금 ${wallet.rewardPointsDebt.toLocaleString("ko-KR")}P` : ""}
                                        {wallet.daengLabCoinsDebt > 0 ? ` · 코인 ${wallet.daengLabCoinsDebt}C` : ""}
                                    </p>
                                ) : null}
                                {walletError ? <p className="ah-light relative mt-1 text-center text-[11px] text-[#c2413b]">{walletError}</p> : null}
                            </div>

                            {/* 우리 아이 */}
                            <SectionLabel className="mt-6" icon="fa-paw">우리 아이</SectionLabel>
                            <div className="mt-3 flex flex-wrap items-start gap-3">
                                {/* 실제 반려견 프로필(useAuth) — 서버가 확인한 사진만 보여 줌(웹 마이페이지와 같은 hasVerifiedPetPhoto 기준) */}
                                {pets.map((pet, i) => (
                                    <span key={`${pet.apiProfileId ?? pet.name}-${i}`} className="st-polaroid relative block w-[5.6rem] bg-white p-1.5 pb-5" style={{ rotate: `${i % 2 ? 2 : -3}deg` }}>
                                        <Tape className="-top-2 left-1/2 h-3 w-9 -translate-x-1/2" color="rgba(255,200,215,.85)" />
                                        <span className="relative grid aspect-square place-items-center overflow-hidden bg-[#fff3e8]">
                                            {hasVerifiedPetPhoto(pet)
                                                // eslint-disable-next-line @next/next/no-img-element
                                                ? <img src={pet.photoDataUrl} alt={`${pet.name} 사진`} className="h-full w-full object-cover" />
                                                : <i aria-hidden="true" className="fa-solid fa-paw text-[22px] text-[#f4b9ca]" />}
                                        </span>
                                        <span className="ah-display absolute inset-x-0 bottom-0.5 truncate px-1 text-center text-[12px] text-[#e0557f]">{pet.name}</span>
                                    </span>
                                ))}
                                <Link href="/mypage/?petProfile=required#pet-profiles" className="grid aspect-[5/6] w-[5.6rem] place-items-center rounded-[6px] border-2 border-dashed border-[#f4c3d3] text-center" style={{ rotate: "2deg" }}>
                                    <span>
                                        <i aria-hidden="true" className="fa-solid fa-plus text-[16px] text-[#f48fac]" />
                                        <span className="ah-display mt-1 block text-[12px] text-[#e0557f]">아이 추가</span>
                                    </span>
                                </Link>
                            </div>

                            {/* 최근 주문 영수증 */}
                            <SectionLabel className="mt-6" icon="fa-receipt">최근 주문</SectionLabel>
                            {orders && orders.length > 0 ? (
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    {orders.map((o, i) => (
                                        <Link key={o.orderId} href={`/mypage/orders/?orderId=${encodeURIComponent(o.orderId)}`} className="st-receipt block px-3 pt-3" style={{ rotate: `${i ? 1.5 : -1.5}deg` }}>
                                            <span className="ah-light block truncate text-[10.5px]" style={{ color: TEXT_SOFT }}>{orderDateLabel(o.createdAt || o.approvedAt)}</span>
                                            <span className="ah-display mt-1 block text-[13px] leading-snug line-clamp-2">{o.orderName}</span>
                                            <span className="mt-2 flex items-center justify-between gap-1 border-t border-dashed border-[#e7d9d1] pt-1.5">
                                                <span className="ah-display text-[12.5px]">{formatOrderAmount(o.amount)}</span>
                                                <InkStamp rot={-8} color="#1f9e75" className="!px-1.5 !py-0.5 text-[10px]">{orderStatusLabel(o)}</InkStamp>
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <Link href="/mypage/orders/" className="ah-light mt-3 block rounded-[4px_4px_14px_4px] bg-[#fffbea] px-4 py-3 text-[12.5px] shadow-[0_6px_10px_-8px_rgba(110,80,40,.45)]" style={{ color: TEXT_SOFT }}>
                                    {ordersError ? "주문 내역을 불러오지 못했어요. 주문 내역에서 다시 확인해 주세요." : orders ? "아직 주문이 없어요." : "주문 내역을 확인하고 있어요."}
                                </Link>
                            )}

                            <SectionLabel className="mt-6" icon="fa-user">내 정보</SectionLabel>
                            <LinedMenu items={MY_MENUS} />
                            <SectionLabel className="mt-6" icon="fa-headset">고객센터</SectionLabel>
                            <LinedMenu items={CS_MENUS} />
                            {/* 로그아웃 — 웹 마이페이지 메뉴(앱에서는 숨김)에 있던 것을 여기로. 웹 메뉴와 같은 기능(확인 → logout()) 뒤 앱 홈으로.
                                회원 탈퇴는 눈에 덜 띄게 "정보 수정" 화면 맨 아래로(사용자 결정 2026-10-16) */}
                            <button type="button" onClick={() => { haptic("light"); handleLogout(); }} className="ah-display mt-5 w-full text-center text-[13px] text-[#9c8f88] underline decoration-dashed underline-offset-4">
                                로그아웃
                            </button>
                        </>
                    ) : (
                        <>
                            <LoginInvite redirect={REDIRECT} title={["로그인하고", "나만의 댕다방 다이어리"]} cta="로그인"
                                items={[
                                    { icon: "fa-truck", text: "주문 · 배송을 한눈에" },
                                    { icon: "fa-dog", text: "우리 아이 프로필과 기록" },
                                    { icon: "fa-coins", text: "코인 지갑 · 가입하면 20코인" },
                                ]} />
                            <SectionLabel className="mt-7" icon="fa-headset">고객센터</SectionLabel>
                            <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>로그인 없이도 볼 수 있어요</p>
                            <LinedMenu items={CS_MENUS} />
                        </>
                    )}
                </DiaryBody>
            </div>
            {toast ? <NoteToast text={toast} onDone={clearToast} /> : null}
            {logoutAsk ? <LogoutConfirm onCancel={() => setLogoutAsk(false)} onConfirm={confirmLogout} /> : null}
        </div>
    );
}

/** 로그아웃 확인 카드 — 테이프 붙인 메모 + 와펜 두 개(취소 · 로그아웃). 바깥을 누르거나 Esc 면 취소 */
function LogoutConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
    // Esc = 취소 (휴대폰 기본 확인창과 같게)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onCancel]);
    return (
        <div className="fixed inset-0 z-[2600] grid place-items-center bg-[rgba(61,47,42,.32)] px-6" onClick={onCancel}>
            <div role="alertdialog" aria-modal="true" aria-labelledby="my-logout-title" onClick={(e) => e.stopPropagation()}
                className="st-page relative w-full max-w-[300px] rounded-[18px] px-5 pb-5 pt-7 text-center">
                <Tape className="-top-2.5 left-1/2 h-5 w-20 -translate-x-1/2" color="repeating-linear-gradient(90deg, rgba(255,200,215,.9) 0 8px, rgba(255,226,234,.9) 8px 16px)" style={{ rotate: "-2deg" }} />
                <p id="my-logout-title" className="ah-display text-[17px]" style={{ color: TEXT }}>로그아웃 하시겠어요?</p>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <Patch small tone="cream" onClick={onCancel}>취소</Patch>
                    <Patch small onClick={onConfirm}>로그아웃</Patch>
                </div>
            </div>
        </div>
    );
}

/* 마이 화면 CSS */
const MY_CSS = `
/* 이름표 스티커 */
.my-tag { background: #fffdf6; box-shadow: 0 0 0 1.5px #f3e6d6, 0 12px 20px -14px rgba(110,80,40,.55); }
/* 코인 봉투: 버터색 봉투 + 위 덮개 */
.my-pocket { background: linear-gradient(170deg, #fff6d6, #ffe4a6); box-shadow: 0 14px 24px -16px rgba(160,110,20,.6), inset 0 0 0 1.5px rgba(255,255,255,.7); overflow: hidden; }
/* 이메일 인증 메모(협업자 SignupEmailVerification) — 부품이 사라지면(지급 끝 · 대상 아님) 메모 카드도 숨김 */
.my-verify { background: #fffdf6; box-shadow: 0 0 0 1.5px #f3e6d6, 0 12px 20px -14px rgba(110,80,40,.55); }
.my-verify:not(:has([data-signup-email-verification])) { display: none; }
/* 부품 안 글자 — 글꼴 두 가지 규칙(제목 · 버튼 = 써라운드, 본문 · 입력 = 나눔스퀘어라운드) */
.my-verify :is(p, span, label, input) { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; }
.my-verify :is(h2, button) { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
.my-flap { position: absolute; inset: 0 0 auto 0; height: 46px; background: linear-gradient(180deg, rgba(255,236,170,.9), rgba(255,226,150,.6)); clip-path: polygon(0 0, 100% 0, 50% 100%); }
`;
