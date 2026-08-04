"use client";

import { useEffect, useState } from "react";
import DaengLabCoinMark from "@/components/petlens/DaengLabCoinMark";
import styles from "./AttendanceStamp.module.css";

export type AttendanceRecentDay = {
    date: string;
    claimed: boolean;
};

type Props = {
    claimedToday: boolean;
    currentStreak: number;
    dailyReward: number;
    recentDays: AttendanceRecentDay[];
    coinBalance?: number;
    disabled?: boolean;
    onClaim: () => Promise<boolean>;
};

function weekday(value: string) {
    const date = new Date(`${value}T12:00:00+09:00`);
    if (Number.isNaN(date.getTime())) return "·";
    return new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "Asia/Seoul" }).format(date);
}

export default function AttendanceStampCard({
    claimedToday,
    currentStreak,
    dailyReward,
    recentDays,
    coinBalance,
    disabled = false,
    onClaim,
}: Props) {
    const [claiming, setClaiming] = useState(false);
    const [celebrating, setCelebrating] = useState(false);
    const [notice, setNotice] = useState("");

    useEffect(() => {
        if (!celebrating) return;
        const timer = window.setTimeout(() => setCelebrating(false), 1_300);
        return () => window.clearTimeout(timer);
    }, [celebrating]);

    const claim = async () => {
        if (claimedToday || claiming || disabled) return;
        setClaiming(true);
        setNotice("");
        try {
            const credited = await onClaim();
            if (credited) {
                setCelebrating(true);
                setNotice(`출근 완료! 댕다방 연구소 코인 ${dailyReward}개가 지급됐어요.`);
            } else {
                setNotice("오늘 출근도장은 이미 찍혀 있어요. 내일 다시 만나요!");
            }
        } finally {
            setClaiming(false);
        }
    };

    return (
        <article className={`${styles.stage} rounded-[28px] border border-rose-100 bg-gradient-to-br from-rose-50 via-amber-50 to-white p-5 shadow-[0_18px_45px_rgba(190,24,93,0.12)]`} data-attendance-stamp-card>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative mx-auto shrink-0 sm:mx-0">
                    <button
                        type="button"
                        className={styles.stampButton}
                        data-claimed={claimedToday ? "true" : "false"}
                        data-celebrating={celebrating ? "true" : "false"}
                        disabled={claimedToday || claiming || disabled}
                        onClick={() => void claim()}
                        aria-label={claimedToday ? "오늘 출근도장 완료" : `출근도장 찍고 코인 ${dailyReward}개 받기`}
                    >
                        <span className={styles.stampRing} aria-hidden="true" />
                        <span className="grid place-items-center" aria-hidden="true">
                            <i className={`fa-solid ${claimedToday ? "fa-check" : "fa-paw"} ${styles.stampPaw}`} />
                            <span className={styles.stampCopy}>{claiming ? "꾹…" : claimedToday ? "출근 완료" : "도장 꾹!"}</span>
                        </span>
                    </button>
                    {celebrating && (
                        <span className={styles.burst} aria-hidden="true">
                            <span className={styles.coin}>+1</span>
                            <span className={styles.coin}>+1</span>
                            {Array.from({ length: 8 }, (_, index) => <span key={index} className={styles.confetti} />)}
                        </span>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-black text-white">매일 출근</span>
                        <span className="text-xs font-black text-rose-700">{currentStreak}일 연속</span>
                    </div>
                    <h3 className="mt-2 text-xl font-black tracking-tight text-neutral-950">오늘도 우리 아이 돌봄 출근!</h3>
                    <p className="mt-1 text-xs font-bold leading-5 text-neutral-600">
                        하루 한 번 도장을 찍으면 <strong className="text-amber-700">코인 {dailyReward}개</strong>가 서버 지갑에 바로 지급돼요.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black text-neutral-700">
                        <DaengLabCoinMark compact />
                        <span>{coinBalance === undefined ? "지갑 확인 중" : `${coinBalance.toLocaleString("ko-KR")}C 보유`}</span>
                    </div>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-1.5" aria-label="최근 7일 출근도장">
                {recentDays.map((day) => (
                    <div key={day.date} className="text-center">
                        <span className="block text-[9px] font-black text-neutral-400">{weekday(day.date)}</span>
                        <span className={`mx-auto mt-1 grid h-8 w-8 place-items-center rounded-full border text-xs ${day.claimed ? "border-emerald-300 bg-emerald-100 text-emerald-700" : "border-dashed border-neutral-200 bg-white/70 text-neutral-300"}`}>
                            <i className={`fa-solid ${day.claimed ? "fa-paw" : "fa-minus"}`} aria-hidden="true" />
                        </span>
                    </div>
                ))}
            </div>

            <p className="sr-only" aria-live="polite">{notice}</p>
            {notice && <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-center text-xs font-black text-emerald-700" role="status">{notice}</p>}
        </article>
    );
}
