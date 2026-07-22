"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { attributedOutboundVisit, safeOutboundTarget } from "@/lib/outbound";
import { trackOutboundRedirect } from "@/lib/storefront-analytics";

const REDIRECT_DELAY_MS = 900;

function attributionMessage(mode: "naver_nt" | "utm" | "referrer"): string {
    if (mode === "naver_nt") {
        return "네이버 사용자정의 유입값(nt_*)을 적용해 고객 브라우저에서 직접 방문합니다.";
    }
    if (mode === "utm") {
        return "판매처 유입 식별값(UTM)을 적용해 고객 브라우저에서 직접 방문합니다.";
    }
    return "고객 브라우저에서 판매처 원본 페이지를 직접 방문합니다.";
}

export default function OutboundRedirectClient() {
    const params = useSearchParams();
    const rawTarget = useMemo(() => safeOutboundTarget(params.get("to")), [params]);
    const query = params.get("query") || "";
    const sourceName = params.get("source") || "";
    const sellerName = params.get("seller") || "";
    const productTitle = params.get("product") || "";
    const productId = params.get("productId") || "";
    const offerId = params.get("offerId") || "";
    const sourceKind = params.get("kind") || "";
    const surface = params.get("surface") || "outbound";
    const category = params.get("category") || "";
    const subcategory = params.get("subcategory") || "";
    const priceText = params.get("priceText") || "";
    const hasThumbnail = params.get("hasThumbnail") === "1";
    const priceParam = params.get("price");
    const rankParam = params.get("rank");
    const totalPrice = priceParam && Number.isFinite(Number(priceParam)) ? Number(priceParam) : null;
    const rank = rankParam && Number.isFinite(Number(rankParam)) ? Number(rankParam) : null;
    const visit = useMemo(
        () => attributedOutboundVisit(rawTarget, { surface, category }),
        [rawTarget, surface, category],
    );
    const target = visit.targetUrl;
    const host = useMemo(() => {
        if (!target) return "";
        try {
            return new URL(target).hostname.replace(/^www\./, "");
        } catch {
            return "";
        }
    }, [target]);
    const trackedKeyRef = useRef("");
    const navigationStartedRef = useRef(false);

    useEffect(() => {
        if (!target) return;
        const key = [target, query, sourceName, productId, offerId, surface].join("|");
        if (trackedKeyRef.current !== key) {
            trackedKeyRef.current = key;
            trackOutboundRedirect({
                query,
                targetUrl: target,
                outboundUrl: typeof window !== "undefined" ? window.location.href : "",
                sourceName,
                sellerName,
                productTitle,
                productId,
                offerId,
                sourceKind,
                totalPrice,
                priceText,
                hasThumbnail,
                rank,
                surface,
                category,
                subcategory,
                viaPartners: Boolean(visit.partnerId),
                navigationMode: "browser_top_level",
                attributionMode: visit.attributionMode,
            });
        }

        const redirect = window.setTimeout(() => {
            if (navigationStartedRef.current) return;
            navigationStartedRef.current = true;
            window.location.assign(target);
        }, REDIRECT_DELAY_MS);
        return () => window.clearTimeout(redirect);
    }, [target, query, sourceName, sellerName, productTitle, productId, offerId, sourceKind, totalPrice, priceText, hasThumbnail, rank, surface, category, subcategory, visit.partnerId, visit.attributionMode]);

    const visitNow = () => {
        if (!target || navigationStartedRef.current) return;
        navigationStartedRef.current = true;
        window.location.assign(target);
    };

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

                <h1 className="mt-5 text-2xl font-black text-neutral-950">판매처로 이동하고 있어요</h1>
                {target ? (
                    <>
                        <p className="mt-2 text-sm font-bold text-neutral-500">{host}</p>
                        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-left">
                            <div className="flex items-start gap-3">
                                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                                    <i className="fa-solid fa-arrow-up-right-from-square text-xs" aria-hidden="true" />
                                </span>
                                <span>
                                    <span className="block text-sm font-black text-emerald-950">
                                        {visit.partnerName || "실제 판매처 방문"}
                                    </span>
                                    <span className="mt-1 block text-xs font-bold leading-5 text-emerald-800">
                                        {attributionMessage(visit.attributionMode)}
                                    </span>
                                </span>
                            </div>
                        </div>
                        <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-100">
                            <div
                                className="h-full w-full rounded-full bg-neutral-950"
                                style={{ animation: `ddb-outbound-progress ${REDIRECT_DELAY_MS}ms linear forwards` }}
                            />
                        </div>
                        <p className="mt-4 text-xs font-bold leading-5 text-neutral-500">
                            이 클릭은 댕다방에 먼저 기록되며, 숨은 창이나 서버 대리 접속 없이 이 탭이 판매처 페이지로 직접 전환됩니다.
                        </p>
                        <button
                            type="button"
                            onClick={visitNow}
                            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-neutral-950 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
                        >
                            지금 판매처 방문하기
                        </button>
                    </>
                ) : (
                    <>
                        <p className="mt-3 text-sm font-bold text-neutral-600">이동할 주소를 확인할 수 없습니다.</p>
                        <Link href="/products" className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-neutral-950 px-5 text-sm font-black text-white">
                            상품 검색으로 돌아가기
                        </Link>
                    </>
                )}
            </section>
        </main>
    );
}
