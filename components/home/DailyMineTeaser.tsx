"use client";

/**
 * DailyMineTeaser — 메인 "매일 댕생활" 안내 띠(협업자 기능)
 * ---------------------------------------------------------------------
 * 2026-10-22 사용자: 매일 댕생활 페이지(보물광산 · 우리 아이 기록)와 같은 "기록 결"로 — 민트 쿠션 판 안에
 * 흰 동그라미 세 개(출석 도장 · 돌봄 실천 체크 · AI 변화 기록, 사용자 색연필 그림)를 점선 길로 잇고 번호 배지,
 * 오른쪽 분홍 쿠션 카드(무지개 크레파스 테 보물상자 · 안내 · 분홍 알약 버튼 하나).
 * 세 단계는 설명(누르는 칸 아님) · 누르는 곳은 버튼 하나. 이동 주소(/treasure-mine/) · 회원/비회원 버튼 문구 · 의료 점수 아님 안내 · 움직임 범위 표시는 그대로.
 * 메인은 매일 댕생활 꾸밈 CSS(daily-web.css)를 쓰지 않아 모양은 이 부품 안(Tailwind)에 둔다. 크레파스 결은 CrayonGrainFilter.
 */
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/store";
import { CrayonGrainFilter } from "@/components/daily/CrayonArt";

// 아이콘 크기(w · h)는 그림 파일 크기 그대로 — 눈에 보이는 면적이 같게 만든 그림이라 가로로 긴 AI 아이콘도 작아 보이지 않음
const DAILY_STEPS = [
    { label: "출석 도장", detail: "하루 한 번 2코인", icon: "/images/ui/daily-checkin-256.webp", w: 240, h: 203, badge: "bg-[#f0a020]" },
    { label: "돌봄 실천 체크", detail: "산책·눈 상태 기록", icon: "/images/ui/daily-care-256.webp", w: 242, h: 218, badge: "bg-[#12a17a]" },
    { label: "AI 변화 기록", detail: "사진·주간 비교 이어보기", icon: "/images/ui/daily-change-256.webp", w: 268, h: 176, badge: "bg-[#e9789a]" },
] as const;

// 쿠션 그림자 · 제목 글꼴(지마켓 산스, 매일 댕생활 페이지와 같은 값)
const CUSHION = "shadow-[inset_0_3px_0_rgba(255,255,255,0.9),inset_0_-10px_18px_rgba(0,0,0,0.035),0_22px_36px_-24px_rgba(15,23,42,0.32)]";
const TITLE_FONT = { fontFamily: '"GmarketSans", var(--font-wanted-sans), sans-serif', fontWeight: 400 } as const;

export default function DailyMineTeaser() {
    const { hydrated, user } = useAuth();
    const isMember = hydrated && Boolean(user);

    return (
        <section className="py-8 md:py-12" aria-labelledby="daily-mine-title" data-daily-mine-teaser data-growth-motion-scope>
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                {/* 제목 — 기획전 · 신상품과 같은 모양 */}
                <div className="mb-4">
                    <h2 id="daily-mine-title" className="mb-1.5 text-2xl font-black tracking-tight md:text-3xl">매일 댕생활</h2>
                    <p className="text-sm text-neutral-500">오늘 한 가지만 기록해 볼까요? 약 3분이면 충분해요</p>
                </div>

                <CrayonGrainFilter />
                {/* 민트 쿠션 판 — 왼쪽 점선 길 세 단계, 오른쪽 분홍 쿠션 카드 */}
                <div className={`grid items-center gap-6 rounded-[36px] bg-[#e9f8f1] px-4 py-7 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 lg:rounded-[46px] lg:px-10 lg:py-9 ${CUSHION}`}>
                    {/* 세 단계 — 설명(누르는 칸 아님), 흰 동그라미를 점선 길로 이음 */}
                    <ol className="relative mx-auto grid w-full grid-cols-3 gap-2 text-center lg:max-w-[620px] lg:gap-3" aria-label="오늘의 세 가지 루틴">
                        <span aria-hidden="true" className="absolute left-[18%] right-[18%] top-[36px] border-t-[3px] border-dotted border-[#9ccfe2] lg:top-[54px]" />
                        {DAILY_STEPS.map((step, index) => (
                            <li key={step.label} className="relative">
                                <span className="relative z-[1] mx-auto mb-2.5 grid h-[72px] w-[72px] place-items-center rounded-full bg-white shadow-[0_10px_18px_-12px_rgba(15,23,42,0.4)] lg:h-[108px] lg:w-[108px]">
                                    <Image src={step.icon} alt="" width={step.w} height={step.h} className="h-auto w-[72%] object-contain" />
                                    <span className={`absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full text-[11px] font-black text-white shadow-[0_4px_8px_-4px_rgba(0,0,0,0.35)] lg:h-7 lg:w-7 lg:text-[13px] ${step.badge}`}>{index + 1}</span>
                                </span>
                                <strong className="block text-[14px] tracking-tight text-neutral-900 lg:text-[18px]" style={TITLE_FONT}>{step.label}</strong>
                                <span className="mt-1 block break-keep text-[11px] font-semibold leading-4 text-neutral-500 lg:text-[12.5px]">{step.detail}</span>
                            </li>
                        ))}
                    </ol>

                    {/* 분홍 쿠션 카드 — 누르는 곳은 버튼 하나 */}
                    <div className={`flex flex-col items-center rounded-[30px] bg-[#ffeef3] px-5 py-5 text-center lg:px-8 lg:py-6 ${CUSHION}`}>
                        <span className="relative isolate hidden h-[84px] w-[84px] place-items-center rounded-full p-[7px] lg:grid" aria-hidden="true">
                            <span className="absolute inset-0 -z-10 rounded-full" style={{ background: "conic-gradient(from 20deg, #f7a8bf, #ffd08a, #a8e0c6, #a9d4ea, #cfc3f5, #f7a8bf)", filter: "url(#dw-crayon-grain)" }} />
                            <span className="grid h-full w-full place-items-center rounded-full bg-white">
                                <Image src="/images/ui/daily-hero-treasure-384.webp" alt="" width={56} height={56} className="h-14 w-14 object-contain" />
                            </span>
                        </span>
                        <p className="mb-3 text-[15px] text-neutral-900 lg:mt-3 lg:text-[16px]" style={TITLE_FONT}>작은 돌봄이 주간 변화 기록이 돼요</p>
                        <Link href="/treasure-mine/" className="ddb-crayon-link ddb-attention-cta inline-flex min-h-[46px] w-full items-center justify-center rounded-full px-6 text-[14.5px] font-black">
                            {isMember ? "오늘 기록하기" : "오늘 둘러보기"}
                            <i className="fa-solid fa-arrow-right ml-2 text-[11px]" aria-hidden="true" />
                        </Link>
                        <span className="mt-2 block text-[10.5px] font-semibold leading-4 text-neutral-500">
                            실천 체크는 사용자가 직접 남기는 기록이며 의료 점수가 아닙니다.
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}
