"use client";

/**
 * 스티커북 시안 — 마이(/app/sticker/my) · 로컬 시안 전용, 배포 X
 * ---------------------------------------------------------------------
 * 다이어리 첫 장(내 정보 쪽).
 *  - 회원: "HELLO my name is" 이름표 스티커 · 코인 봉투(코인 · 적립금 · 1,000P → 10코인 바꾸기, 코인이 날아감) ·
 *          우리 아이 폴라로이드(+ 아이 추가) · 최근 주문 영수증 · 내 정보 메뉴(줄 노트) · 고객센터 · 로그아웃
 *  - 로그인 전: 로그인 초대(주문 · 아이 프로필 · 코인 지갑) + 고객센터 · 약관(로그인 없이)
 * 세부 화면(주문 상세 · 배송지 · 결제수단 · 추천 설정 · 정보 수정 · 탈퇴 등)은 기존 마이페이지로 이어진다.
 */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
import { haptic } from "../gestures";
import { CoinChip, KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { CS_MENUS, MY_MENUS, ORDERS, PET, WALLET } from "../page-data";
import { ConceptBar, HC_CSS, SAMPLE, flyCoin, useDemoSession, useTodayDemo } from "../shared";
import { DiaryBody, InkStamp, NoteToast, PARTS_CSS, SectionLabel } from "../sticker-parts";
import { LoginInvite, Patch, STICKER_CSS, Tape } from "../sticker-kit";

const REDIRECT = "/app/sticker/my/";
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
    const [session, setSession] = useDemoSession();
    const member = session === "member";
    const today = useTodayDemo(session);
    const coinRef = useRef<HTMLSpanElement>(null);
    const convertRef = useRef<HTMLButtonElement>(null);
    const [points, setPoints] = useState(WALLET.points);
    const [toast, setToast] = useState<string | null>(null);
    const clearToast = useCallback(() => setToast(null), []);
    const router = useRouter();
    const { logout } = useAuth();

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

    // 적립금 1,000P → 10코인 (되돌릴 수 없음)
    const convert = () => {
        if (points < WALLET.pointUnit) return;
        setPoints((p) => p - WALLET.pointUnit);
        today.addCoins(WALLET.coinUnit);
        haptic("medium");
        flyCoin(convertRef.current, coinRef.current, 3);
        setToast(`적립금 ${WALLET.pointUnit.toLocaleString("ko-KR")}P를 ${WALLET.coinUnit}코인으로 바꿨어요`);
    };

    return (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + MY_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">
                <ConceptBar session={session} onSession={setSession} />
                <DiaryBody pageKey={session} dir={1}>
                    {member ? (
                        <>
                            {/* 이름표 스티커 */}
                            <div className="my-tag relative mx-auto w-[88%] overflow-hidden rounded-[14px] text-center" style={{ rotate: "-2deg" }}>
                                <div className="bg-[#ef5b84] pb-1.5 pt-2 text-white">
                                    <p className="ah-display text-[17px] leading-none tracking-[0.04em]">HELLO</p>
                                    <p className="ah-light text-[10.5px]">my name is</p>
                                </div>
                                <div className="bg-white px-4 pb-3 pt-2">
                                    <p className="ah-display text-[26px] leading-tight">{SAMPLE.guardian}</p>
                                    <p className="ah-light text-[11.5px]" style={{ color: TEXT_SOFT }}>demo@daengdabang.test · 댕다방 회원</p>
                                </div>
                                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1.5 bg-[#ef5b84]" />
                            </div>

                            {/* 코인 봉투 */}
                            <div className="my-pocket relative mt-6 rounded-[16px] px-4 pb-4 pt-5">
                                <span aria-hidden="true" className="my-flap" />
                                <div className="relative flex items-center justify-between">
                                    <span>
                                        <span className="ah-light block text-[11.5px] text-[#8f5e12]">댕다방 연구소 코인</span>
                                        <span className="mt-1 inline-block"><CoinChip ref={coinRef} coins={today.coins} /></span>
                                    </span>
                                    <span className="text-right">
                                        <span className="ah-light block text-[11.5px] text-[#8f5e12]">적립금</span>
                                        <span className="ah-display block text-[18px] tabular-nums">{points.toLocaleString("ko-KR")}P</span>
                                    </span>
                                </div>
                                <button ref={convertRef} type="button" onClick={convert} disabled={points < WALLET.pointUnit}
                                    className="ah-display relative mt-3 w-full rounded-full bg-white/90 py-2.5 text-[13px] text-[#c4560f] shadow-[0_6px_12px_-8px_rgba(150,100,30,.6)] disabled:opacity-50">
                                    적립금 {WALLET.pointUnit.toLocaleString("ko-KR")}P <i aria-hidden="true" className="fa-solid fa-arrow-right mx-0.5 text-[11px]" /> {WALLET.coinUnit}코인 바꾸기
                                </button>
                                <p className="ah-light relative mt-1.5 text-center text-[10.5px] text-[#a07a3e]">바꾼 코인은 되돌릴 수 없어요 · 행동 · 소리 분석 1회 {SAMPLE.analysisCoinCost}코인</p>
                            </div>

                            {/* 우리 아이 */}
                            <SectionLabel className="mt-6" icon="fa-paw">우리 아이</SectionLabel>
                            <div className="mt-3 flex items-start gap-3">
                                <span className="st-polaroid relative block w-[5.6rem] bg-white p-1.5 pb-5" style={{ rotate: "-3deg" }}>
                                    <Tape className="-top-2 left-1/2 h-3 w-9 -translate-x-1/2" color="rgba(255,200,215,.85)" />
                                    <span className="relative block aspect-square overflow-hidden bg-[#fff3e8]"><Image src={PET.photo} alt={`${PET.name} 사진`} fill sizes="90px" className="object-cover" /></span>
                                    <span className="ah-display absolute inset-x-0 bottom-0.5 text-center text-[12px] text-[#e0557f]">{PET.name}</span>
                                </span>
                                <Link href="/mypage/?petProfile=required#pet-profiles" className="grid aspect-[5/6] w-[5.6rem] place-items-center rounded-[6px] border-2 border-dashed border-[#f4c3d3] text-center" style={{ rotate: "2deg" }}>
                                    <span>
                                        <i aria-hidden="true" className="fa-solid fa-plus text-[16px] text-[#f48fac]" />
                                        <span className="ah-display mt-1 block text-[12px] text-[#e0557f]">아이 추가</span>
                                    </span>
                                </Link>
                            </div>

                            {/* 최근 주문 영수증 */}
                            <SectionLabel className="mt-6" icon="fa-receipt">최근 주문</SectionLabel>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                {ORDERS.map((o, i) => (
                                    <Link key={o.id} href={`/mypage/orders/?orderId=${o.id}`} className="st-receipt block px-3 pt-3" style={{ rotate: `${i ? 1.5 : -1.5}deg` }}>
                                        <span className="ah-light block text-[10.5px]" style={{ color: TEXT_SOFT }}>{o.date} · {o.id}</span>
                                        <span className="ah-display mt-1 block text-[13px] leading-snug">{o.title}</span>
                                        <span className="mt-2 flex items-center justify-between border-t border-dashed border-[#e7d9d1] pt-1.5">
                                            <span className="ah-display text-[12.5px]">{o.price.toLocaleString("ko-KR")}원</span>
                                            <InkStamp rot={-8} color={o.status === "배송 중" ? "#5a7fe0" : "#1f9e75"} className="!px-1.5 !py-0.5 text-[10px]">{o.status}</InkStamp>
                                        </span>
                                    </Link>
                                ))}
                            </div>

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
.my-tag { box-shadow: 0 0 0 3px #fff, 0 12px 20px -12px rgba(150,60,90,.55); }
/* 코인 봉투: 버터색 봉투 + 위 덮개 */
.my-pocket { background: linear-gradient(170deg, #fff6d6, #ffe4a6); box-shadow: 0 14px 24px -16px rgba(160,110,20,.6), inset 0 0 0 1.5px rgba(255,255,255,.7); overflow: hidden; }
.my-flap { position: absolute; inset: 0 0 auto 0; height: 46px; background: linear-gradient(180deg, rgba(255,236,170,.9), rgba(255,226,150,.6)); clip-path: polygon(0 0, 100% 0, 50% 100%); }
`;
