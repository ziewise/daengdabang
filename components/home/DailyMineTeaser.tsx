"use client";

import Link from "next/link";
import { useAuth } from "@/lib/store";

const DAILY_STEPS = [
    {
        label: "출석 도장",
        detail: "하루 한 번 2코인",
        icon: "fa-calendar-check",
        tone: "teal",
    },
    {
        label: "돌봄 실천 체크",
        detail: "산책·눈 상태 기록",
        icon: "fa-paw",
        tone: "coral",
    },
    {
        label: "AI 변화 기록",
        detail: "사진·주간 비교 이어보기",
        icon: "fa-camera-retro",
        tone: "orange",
    },
] as const;

export default function DailyMineTeaser() {
    const { hydrated, user } = useAuth();
    const isMember = hydrated && Boolean(user);

    return (
        <section className="py-8 md:py-10" aria-labelledby="daily-mine-title" data-daily-mine-teaser data-growth-motion-scope>
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                <div className="ddb-crayon-paper overflow-hidden rounded-[30px] border shadow-card">
                    <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)_auto] md:items-center md:p-7">
                        <div>
                            <p className="ddb-crayon-kicker text-xs">오늘의 보물광산 · 약 3분</p>
                            <h2 id="daily-mine-title" className="ddb-crayon-title ddb-crayon-underline mt-2 text-2xl text-neutral-950 md:text-3xl">
                                오늘 한 가지만 기록해 볼까요?
                            </h2>
                            <p className="mt-2 text-xs font-bold leading-5 text-neutral-600">
                                매일의 작은 돌봄이 우리 아이의 주간 변화 기록으로 이어집니다.
                            </p>
                        </div>

                        <ol className="grid grid-cols-3 gap-2" aria-label="오늘의 세 가지 루틴">
                            {DAILY_STEPS.map((step) => (
                                <li key={step.label} className="rounded-2xl border border-neutral-200 bg-white/80 p-3 text-center">
                                    <span className="ddb-crayon-icon mx-auto grid h-9 w-9 place-items-center rounded-xl text-xs text-white" data-crayon-tone={step.tone}>
                                        <i className={`fa-solid ${step.icon}`} aria-hidden="true" />
                                    </span>
                                    <strong className="mt-2 block text-[11px] font-black text-neutral-900 sm:text-xs">{step.label}</strong>
                                    <span className="mt-1 hidden text-[10px] font-bold leading-4 text-neutral-500 sm:block">{step.detail}</span>
                                </li>
                            ))}
                        </ol>

                        <div className="flex flex-col items-stretch gap-2 md:min-w-40">
                            <Link href="/treasure-mine/" className="ddb-crayon-link ddb-attention-cta inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-black">
                                {isMember ? "오늘 기록하기" : "오늘 둘러보기"}
                                <i className="fa-solid fa-arrow-right ml-2 text-[10px]" aria-hidden="true" />
                            </Link>
                            <span className="text-center text-[10px] font-bold leading-4 text-neutral-500">
                                실천 체크는 사용자가 직접 남기는 기록이며 의료 점수가 아닙니다.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
