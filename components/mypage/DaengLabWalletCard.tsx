"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
    convertRewardPointsToDaengLabCoins,
    loadDaengLabWallet,
    type DaengLabWallet,
} from "@/lib/customer-api";

type Props = {
    accessToken?: string;
};

function requestKey() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `wallet-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function transactionLabel(eventType: string) {
    if (eventType === "purchase_reward") return "구매확정 적립";
    if (eventType === "purchase_reversal") return "주문 취소·환불 회수";
    if (eventType === "points_conversion") return "적립금 전환";
    if (eventType === "analysis_reservation") return "행동·소리 분석";
    if (eventType === "analysis_refund") return "분석 실패 자동 환급";
    return "지갑 변동";
}

export default function DaengLabWalletCard({ accessToken }: Props) {
    const [wallet, setWallet] = useState<DaengLabWallet | null>(null);
    const [loading, setLoading] = useState(true);
    const [converting, setConverting] = useState(false);
    const [conversionPoints, setConversionPoints] = useState(1_000);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const retryKeyRef = useRef<{ points: number; key: string } | null>(null);

    const publishWallet = useCallback((next: DaengLabWallet) => {
        setWallet(next);
        window.dispatchEvent(new CustomEvent("ddb:daenglab-wallet", { detail: next }));
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        setWallet(null);
        setError("");
        try {
            const next = await loadDaengLabWallet(accessToken);
            publishWallet(next);
            setConversionPoints(next.pointConversionUnit);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "댕랩 지갑을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [accessToken, publishWallet]);

    useEffect(() => {
        let active = true;
        setWallet(null);
        setLoading(true);
        setError("");
        void loadDaengLabWallet(accessToken)
            .then((next) => {
                if (active) {
                    publishWallet(next);
                    setConversionPoints(next.pointConversionUnit);
                }
            })
            .catch((reason) => {
                if (active) setError(reason instanceof Error ? reason.message : "댕랩 지갑을 불러오지 못했습니다.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [accessToken, publishWallet]);

    const submitConversion = async (event: FormEvent) => {
        event.preventDefault();
        if (!wallet || converting) return;
        const points = Math.floor(conversionPoints / wallet.pointConversionUnit) * wallet.pointConversionUnit;
        if (points < wallet.pointConversionUnit || points > wallet.rewardPoints || wallet.rewardPointsDebt > 0) return;
        const retry = retryKeyRef.current;
        const key = retry?.points === points ? retry.key : requestKey();
        retryKeyRef.current = { points, key };
        setConverting(true);
        setError("");
        setNotice("");
        try {
            const converted = await convertRewardPointsToDaengLabCoins(points, key, accessToken);
            retryKeyRef.current = null;
            publishWallet(converted.wallet);
            setNotice(`${converted.convertedRewardPoints.toLocaleString("ko-KR")}P를 ${converted.grantedDaengLabCoins}C로 전환했습니다.`);
            setConversionPoints(converted.wallet.pointConversionUnit);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "적립금 전환을 완료하지 못했습니다.");
        } finally {
            setConverting(false);
        }
    };

    const canConvert = Boolean(
        wallet
        && wallet.rewardPointsDebt === 0
        && conversionPoints >= wallet.pointConversionUnit
        && conversionPoints % wallet.pointConversionUnit === 0
        && conversionPoints <= wallet.rewardPoints
    );

    return (
        <div
            id="daenglab-wallet"
            className="surface scroll-mt-24 overflow-hidden border-indigo-100"
            data-daenglab-wallet
        >
            <div className="bg-gradient-to-r from-cyan-50 via-rose-50 to-amber-50 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-black tracking-[0.16em] text-indigo-600">DAENGLAB WALLET</p>
                        <h2 className="mt-1 text-lg font-black text-neutral-950">댕랩코인 · 적립금</h2>
                        <p className="mt-1 text-xs font-bold leading-5 text-neutral-600">
                            행동·소리 분석 1회 {wallet?.analysisCoinCost ?? 10}C · 적립금 {(wallet?.pointConversionUnit ?? 1_000).toLocaleString("ko-KR")}P를 {wallet?.coinConversionUnit ?? 10}C로 전환
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void refresh()}
                        disabled={loading}
                        className="rounded-full border border-white/80 bg-white px-3 py-1.5 text-xs font-black text-indigo-700 shadow-sm disabled:opacity-50"
                    >
                        <i className={`fa-solid fa-rotate-right mr-1.5 text-[10px] ${loading ? "fa-spin" : ""}`} />
                        새로고침
                    </button>
                </div>
            </div>

            <div className="p-5">
                {loading && !wallet ? (
                    <div className="grid min-h-28 place-items-center text-sm font-bold text-neutral-500">
                        <span><i className="fa-solid fa-circle-notch fa-spin mr-2" />지갑을 불러오는 중입니다.</span>
                    </div>
                ) : wallet ? (
                    <>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <div className="min-w-0 rounded-xl bg-amber-50 p-3 text-center">
                                <span className="text-[10px] font-black text-amber-700">적립금</span>
                                <strong className="mt-1 block break-words text-base font-black text-neutral-950 sm:text-lg">{wallet.rewardPoints.toLocaleString("ko-KR")}P</strong>
                            </div>
                            <div className="min-w-0 rounded-xl bg-indigo-50 p-3 text-center">
                                <span className="text-[10px] font-black text-indigo-700">댕랩코인</span>
                                <strong className="mt-1 block break-words text-base font-black text-indigo-800 sm:text-lg">{wallet.daengLabCoins.toLocaleString("ko-KR")}C</strong>
                            </div>
                            <div className="col-span-2 min-w-0 rounded-xl bg-emerald-50 p-3 text-center sm:col-span-1">
                                <span className="text-[10px] font-black text-emerald-700">분석 가능</span>
                                <strong className="mt-1 block text-lg font-black text-emerald-800">{wallet.analysesAvailable}회</strong>
                            </div>
                        </div>

                        {(wallet.rewardPointsDebt > 0 || wallet.daengLabCoinsDebt > 0) && (
                            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-800">
                                취소·환불된 주문의 사용 완료 혜택이 있어 다음 적립분에서 먼저 정산됩니다.
                                {wallet.rewardPointsDebt > 0 && ` 적립금 ${wallet.rewardPointsDebt.toLocaleString("ko-KR")}P`}
                                {wallet.daengLabCoinsDebt > 0 && ` · 코인 ${wallet.daengLabCoinsDebt}C`}
                            </p>
                        )}

                        <form onSubmit={submitConversion} className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                            <label className="text-xs font-black text-neutral-700" htmlFor="daenglab-conversion-points">
                                적립금을 댕랩코인으로 전환
                            </label>
                            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                                <div className="relative">
                                    <input
                                        id="daenglab-conversion-points"
                                        type="number"
                                        min={wallet.pointConversionUnit}
                                        max={Math.max(wallet.pointConversionUnit, wallet.rewardPoints)}
                                        step={wallet.pointConversionUnit}
                                        value={conversionPoints}
                                        onChange={(event) => setConversionPoints(Number(event.target.value))}
                                        className="input h-11 w-full pr-8"
                                        disabled={converting || wallet.rewardPointsDebt > 0}
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-neutral-500">P</span>
                                </div>
                                <button type="submit" disabled={!canConvert || converting} className="btn btn-primary min-h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50">
                                    {converting
                                        ? "전환 중"
                                        : `${Math.max(0, Math.floor(conversionPoints / wallet.pointConversionUnit) * wallet.coinConversionUnit)}C로 전환`}
                                </button>
                            </div>
                            <p className="mt-2 text-[10px] font-bold leading-4 text-neutral-500">
                                {wallet.pointConversionUnit.toLocaleString("ko-KR")}P 단위로 전환할 수 있으며, 전환한 댕랩코인은 적립금으로 되돌릴 수 없습니다.
                            </p>
                        </form>

                        <details className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2.5 text-xs text-neutral-600">
                            <summary className="cursor-pointer font-black text-indigo-700">상품별 댕랩코인 지급 기준</summary>
                            <p className="mt-2 font-bold leading-5">
                                최종 판매 단가 기준 · 3만원 미만 1C · 3만~6만원 미만 3C · 6만~10만원 미만 6C ·
                                10만~15만원 미만 10C · 15만~25만원 미만 15C · 25만원 이상 20C
                            </p>
                            <p className="mt-1 text-[10px] font-bold leading-4 text-neutral-500">
                                수량과 옵션 추가금은 실제 결제 품목에 반영되며, 결제 확인과 구매확정 뒤 지급됩니다.
                            </p>
                        </details>

                        {wallet.transactions.length > 0 && (
                            <div className="mt-4 border-t border-neutral-100 pt-3">
                                <p className="text-xs font-black text-neutral-700">최근 지갑 내역</p>
                                <ul className="mt-2 grid gap-2">
                                    {wallet.transactions.slice(0, 5).map((entry) => (
                                        <li key={entry.id} className="flex items-center justify-between gap-3 text-xs font-bold text-neutral-600">
                                            <span>{transactionLabel(entry.eventType)}</span>
                                            <span className="shrink-0 text-neutral-900">
                                                {entry.rewardPointsDelta !== 0 && `${entry.rewardPointsDelta > 0 ? "+" : ""}${entry.rewardPointsDelta.toLocaleString("ko-KR")}P`}
                                                {entry.rewardPointsDelta !== 0 && entry.daengLabCoinsDelta !== 0 && " · "}
                                                {entry.daengLabCoinsDelta !== 0 && `${entry.daengLabCoinsDelta > 0 ? "+" : ""}${entry.daengLabCoinsDelta}C`}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                ) : null}

                {notice && <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">{notice}</p>}
                {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-800">{error}</p>}
                <p className="mt-3 text-[10px] font-bold leading-4 text-neutral-400">
                    상품 코인과 적립금은 최종 결제금액 확인 및 구매확정 뒤 지급됩니다. 취소·환불 시 지급 혜택은 회수될 수 있습니다.
                </p>
            </div>
        </div>
    );
}
