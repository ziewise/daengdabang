"use client";

/**
 * DailyMineTeaser — 메인 "매일 댕생활" 안내 띠(협업자 기능 · 2026-10-19 겉모양: 사용자 색연필 아이콘 + 크림·연분홍 종이 + 분홍 버튼, 사용자 결정)
 * ---------------------------------------------------------------------
 * 안내 섹션이다 — 세 단계(출석 도장 · 돌봄 실천 체크 · AI 변화 기록)는 누르는 칸이 아니라 설명이고, 누르는 곳은 버튼 하나.
 * 예전에는 흰 상자 세 칸이 버튼처럼 보이고 정작 버튼은 옅은 점선이라 헷갈렸다 → 웹 메인 다른 섹션(기획전 · 신상품)과 같은
 * 제목 + 회색 부제, 색연필 아이콘 3장(사용자 그림 tools/sticker-assets/originals/daily-main-*.png — 장난감 벽지와 같은 결)을
 * 분홍 점선으로 이은 흐름, 아이콘 색을 잇는 따뜻한 크림·연분홍 종이 바탕, 분홍 알약 버튼 하나. 이동 주소(/treasure-mine/) · 회원/비회원 버튼 문구 · 의료 점수 아님 안내 · 움직임 범위 표시는 그대로.
 */
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/store";

// 아이콘 크기(w · h)는 그림 파일 크기 그대로 — 눈에 보이는 면적이 같게 만든 그림이라 가로로 긴 AI 아이콘도 작아 보이지 않음
const DAILY_STEPS = [
    { label: "출석 도장", detail: "하루 한 번 2코인", icon: "/images/ui/daily-checkin-256.webp", w: 240, h: 203 },
    { label: "돌봄 실천 체크", detail: "산책·눈 상태 기록", icon: "/images/ui/daily-care-256.webp", w: 242, h: 218 },
    { label: "AI 변화 기록", detail: "사진·주간 비교 이어보기", icon: "/images/ui/daily-change-256.webp", w: 268, h: 176 },
] as const;

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

                {/* 따뜻한 종이 배너 — 아이콘의 크림 바탕 · 분홍 테두리를 잇는 크림·연분홍 */}
                <div className="grid items-center gap-5 rounded-3xl bg-[linear-gradient(110deg,#fff7ef_0%,#fff1ec_55%,#fdeef4_100%)] px-3.5 py-6 shadow-[inset_0_0_0_1.5px_rgba(240,190,200,0.45)] lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-7 lg:px-8 lg:py-8">
                    {/* 세 단계 — 설명(누르는 칸 아님), 점선으로 이어진 흐름 */}
                    <ol className="relative grid grid-cols-3 gap-2 text-center lg:gap-3" aria-label="오늘의 세 가지 루틴">
                        <span aria-hidden="true" className="absolute left-[16%] right-[16%] top-[38px] border-t-2 border-dashed border-[rgba(232,140,165,0.45)] lg:top-[56px]" />
                        {DAILY_STEPS.map((step, index) => (
                            <li key={step.label} className="relative">
                                {/* 아이콘 칸 높이를 같게 두고 아래에 맞춤(글자 줄이 나란히) — 크기는 휴대폰 0.34배 · PC 0.5배 */}
                                <span className="mx-auto mb-2.5 flex h-[76px] items-end justify-center lg:h-[112px]">
                                    <Image src={step.icon} alt="" width={step.w} height={step.h}
                                        className="h-auto w-[calc(var(--w)*0.34px)] lg:w-[calc(var(--w)*0.5px)]"
                                        style={{ ["--w" as string]: step.w }} />
                                </span>
                                <strong className="block text-[13px] font-black tracking-tight text-neutral-900 lg:text-[15px]">
                                    <span className="mr-1.5 hidden h-5 w-5 place-items-center rounded-full bg-white/80 align-[1px] text-[11px] font-black text-neutral-500 lg:inline-grid">{index + 1}</span>
                                    {step.label}
                                </strong>
                                <span className="mt-1 block break-keep text-[11px] font-semibold leading-4 text-neutral-500 lg:text-[12.5px]">{step.detail}</span>
                            </li>
                        ))}
                    </ol>

                    {/* 버튼 하나 — 누르는 곳은 여기뿐 */}
                    <div className="text-center">
                        <p className="mb-3 text-sm font-bold text-neutral-600">작은 돌봄이 주간 변화 기록이 돼요</p>
                        <Link href="/treasure-mine/" className="ddb-crayon-link ddb-attention-cta inline-flex min-h-[46px] w-full items-center justify-center rounded-full px-6 text-[14.5px] font-black lg:w-auto">
                            {isMember ? "오늘 기록하기" : "오늘 둘러보기"}
                            <i className="fa-solid fa-arrow-right ml-2 text-[11px]" aria-hidden="true" />
                        </Link>
                        <span className="mt-2 block text-[10.5px] font-semibold leading-4 text-neutral-400">
                            실천 체크는 사용자가 직접 남기는 기록이며 의료 점수가 아닙니다.
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}
