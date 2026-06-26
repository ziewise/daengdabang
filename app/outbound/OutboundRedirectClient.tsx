"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { safeOutboundTarget } from "@/lib/outbound";

export default function OutboundRedirectClient() {
    const params = useSearchParams();
    const target = useMemo(() => safeOutboundTarget(params.get("to")), [params]);
    const host = useMemo(() => {
        if (!target) return "";
        try {
            return new URL(target).hostname.replace(/^www\./, "");
        } catch {
            return "";
        }
    }, [target]);
    const [remaining, setRemaining] = useState(3);

    useEffect(() => {
        if (!target) return;
        const tick = window.setInterval(() => {
            setRemaining((value) => Math.max(1, value - 1));
        }, 850);
        const redirect = window.setTimeout(() => {
            window.location.assign(target);
        }, 2400);
        return () => {
            window.clearInterval(tick);
            window.clearTimeout(redirect);
        };
    }, [target]);

    return (
        <main className="flex min-h-[calc(100svh-var(--header-height))] items-center justify-center px-4 py-12">
            <section className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 text-center shadow-card">
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
                        <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-100">
                            <div className="h-full animate-[ddb-outbound-progress_2.4s_linear_forwards] rounded-full bg-neutral-950" />
                        </div>
                        <p className="mt-4 text-xs font-bold text-neutral-500">
                            약 {remaining}초 후 새 구매 페이지로 이동합니다.
                        </p>
                        <a
                            href={target}
                            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-neutral-950 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
                        >
                            바로 이동
                        </a>
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
