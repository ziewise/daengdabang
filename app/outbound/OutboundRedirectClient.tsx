"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OUTBOUND_AFFILIATE_STOPS, safeOutboundTarget } from "@/lib/outbound";

const DEFAULT_DELAY_MS = 2400;
const AFFILIATE_DELAY_MS = 2900;

export default function OutboundRedirectClient() {
    const params = useSearchParams();
    const target = useMemo(() => safeOutboundTarget(params.get("to")), [params]);
    const showAffiliateTrail = params.get("via") === "partners";
    const redirectDelay = showAffiliateTrail ? AFFILIATE_DELAY_MS : DEFAULT_DELAY_MS;
    const host = useMemo(() => {
        if (!target) return "";
        try {
            return new URL(target).hostname.replace(/^www\./, "");
        } catch {
            return "";
        }
    }, [target]);
    const [remaining, setRemaining] = useState(3);
    const [activePartner, setActivePartner] = useState(0);

    useEffect(() => {
        if (!target) return;
        const startedAt = Date.now();
        const tick = window.setInterval(() => {
            const elapsed = Date.now() - startedAt;
            setRemaining(Math.max(1, Math.ceil((redirectDelay - elapsed) / 1000)));
            if (showAffiliateTrail) {
                setActivePartner(Math.min(
                    OUTBOUND_AFFILIATE_STOPS.length - 1,
                    Math.floor(elapsed / 700)
                ));
            }
        }, 250);
        const redirect = window.setTimeout(() => {
            window.location.assign(target);
        }, redirectDelay);
        return () => {
            window.clearInterval(tick);
            window.clearTimeout(redirect);
        };
    }, [redirectDelay, showAffiliateTrail, target]);

    return (
        <main className="flex min-h-[calc(100svh-var(--header-height))] items-center justify-center px-4 py-12">
            <section className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 text-center shadow-card">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#f7f2e8]">
                    <Image
                        src="/images/logo.png?v=20260614-tight"
                        alt="댕다방"
                        width={76}
                        height={76}
                        className="h-20 w-20 object-contain"
                        priority
                    />
                </div>

                <h1 className="mt-5 text-2xl font-black text-neutral-950">외부 구매 사이트로 이동중입니다</h1>
                {target ? (
                    <>
                        <p className="mt-2 text-sm font-bold text-neutral-500">{host}</p>
                        {showAffiliateTrail && (
                            <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-left">
                                <p className="mb-2 text-xs font-black text-neutral-500">제휴사 안내</p>
                                <div className="grid gap-2">
                                    {OUTBOUND_AFFILIATE_STOPS.map((partner, index) => {
                                        const active = index === activePartner;
                                        return (
                                            <div
                                                key={partner.id}
                                                className={`flex items-center gap-3 rounded-md border px-3 py-2 transition ${
                                                    active
                                                        ? "border-neutral-950 bg-white shadow-sm"
                                                        : "border-neutral-200 bg-white/60"
                                                }`}
                                            >
                                                <span className={`flex h-9 w-20 shrink-0 items-center justify-center rounded-md text-[11px] font-black ${
                                                    active ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700"
                                                }`}>
                                                    {partner.mark}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-black text-neutral-950">{partner.name}</span>
                                                    <span className="block truncate text-[11px] font-bold text-neutral-500">
                                                        {partner.url.replace(/^https?:\/\//, "")}
                                                    </span>
                                                </span>
                                                <i className={`fa-solid fa-circle text-[7px] ${active ? "text-emerald-500" : "text-neutral-300"}`} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-100">
                            <div
                                className="h-full rounded-full bg-neutral-950"
                                style={{ animation: `ddb-outbound-progress ${redirectDelay}ms linear forwards` }}
                            />
                        </div>
                        <p className="mt-4 text-xs font-bold text-neutral-500">
                            {showAffiliateTrail ? "제휴사 안내 후 " : ""}약 {remaining}초 뒤 새 구매 페이지로 이동합니다.
                        </p>
                        <button
                            type="button"
                            onClick={() => window.location.assign(target)}
                            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-neutral-950 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
                        >
                            제휴 안내 확인 후 이동
                        </button>
                    </>
                ) : (
                    <>
                        <p className="mt-3 text-sm font-bold text-neutral-600">이동할 주소를 확인할 수 없습니다.</p>
                        <Link
                            href="/products"
                            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-neutral-950 px-5 text-sm font-black text-white"
                        >
                            상품 검색으로 돌아가기
                        </Link>
                    </>
                )}
            </section>
        </main>
    );
}
