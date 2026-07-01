"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OUTBOUND_AFFILIATE_STOPS, contractedPartnerHitUrls, type AffiliateStop, safeOutboundTarget } from "@/lib/outbound";
import { trackOutboundRedirect } from "@/lib/storefront-analytics";

const DEFAULT_DELAY_MS = 2400;
const AFFILIATE_DELAY_MS = 2900;

function PartnerMark({ partner, active }: { partner: AffiliateStop; active: boolean }) {
    const chipClass = `flex h-9 w-24 shrink-0 items-center justify-center gap-1 rounded-md border bg-white px-1.5 ${
        active ? "border-neutral-950 shadow-sm" : "border-neutral-200"
    }`;

    if (!partner.logoSrc) {
        return (
            <span className={`${chipClass} text-[11px] font-black text-neutral-700`}>
                {partner.mark}
            </span>
        );
    }

    return (
        <span className={chipClass}>
            <img
                src={partner.logoSrc}
                alt={partner.logoAlt ?? partner.name}
                className={partner.logoText ? "h-5 w-5 object-contain" : "h-5 w-full object-contain"}
                loading="eager"
                decoding="sync"
            />
            {partner.logoText && (
                <span className="whitespace-nowrap text-[9px] font-black leading-none tracking-normal text-[#03c75a]">
                    {partner.logoText}
                </span>
            )}
        </span>
    );
}

function openTargetWindow(target: string) {
    const opened = window.open(target, "_blank", "noopener,noreferrer");
    if (opened) {
        opened.opener = null;
        return;
    }
    window.location.assign(target);
}

function fireContractedPartnerHits(urls: { id: string; url: string }[]) {
    for (const item of urls) {
        try {
            void fetch(item.url, {
                method: "GET",
                mode: "no-cors",
                cache: "no-store",
                credentials: "omit",
                keepalive: true,
            }).catch(() => undefined);
        } catch {
            try {
                const image = new window.Image();
                image.referrerPolicy = "no-referrer-when-downgrade";
                image.src = item.url;
            } catch {
                // Contract hit attempts must never block the shopper's redirect.
            }
        }
    }
}

export default function OutboundRedirectClient() {
    const params = useSearchParams();
    const target = useMemo(() => safeOutboundTarget(params.get("to")), [params]);
    const showAffiliateTrail = params.get("via") === "partners";
    const query = params.get("query") || "";
    const sourceName = params.get("source") || "";
    const sellerName = params.get("seller") || "";
    const productTitle = params.get("product") || "";
    const productId = params.get("productId") || "";
    const offerId = params.get("offerId") || "";
    const sourceKind = params.get("kind") || "";
    const surface = params.get("surface") || "outbound";
    const priceText = params.get("priceText") || "";
    const hasThumbnail = params.get("hasThumbnail") === "1";
    const priceParam = params.get("price");
    const rankParam = params.get("rank");
    const totalPrice = priceParam && Number.isFinite(Number(priceParam)) ? Number(priceParam) : null;
    const rank = rankParam && Number.isFinite(Number(rankParam)) ? Number(rankParam) : null;
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
    const hitFiredRef = useRef("");

    useEffect(() => {
        if (!target) return;
        const partnerHitTargets = showAffiliateTrail
            ? contractedPartnerHitUrls(target, { query, source: sourceName, product: productTitle, surface })
            : [];
        const hitKey = `${target}|${partnerHitTargets.map((item) => item.id).join(",")}`;
        if (partnerHitTargets.length && hitFiredRef.current !== hitKey) {
            hitFiredRef.current = hitKey;
            fireContractedPartnerHits(partnerHitTargets);
        }
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
            viaPartners: showAffiliateTrail,
            partnerHitCount: partnerHitTargets.length,
            partnerHitIds: partnerHitTargets.map((item) => item.id),
            partnerHitMode: partnerHitTargets.length ? "contracted_click" : "",
        });
    }, [target, query, sourceName, sellerName, productTitle, productId, offerId, sourceKind, totalPrice, priceText, hasThumbnail, rank, surface, showAffiliateTrail]);

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
                                                className={`flex items-center gap-2 rounded-md border px-3 py-2 transition ${
                                                    active
                                                        ? "border-neutral-950 bg-white shadow-sm"
                                                        : "border-neutral-200 bg-white/60"
                                                }`}
                                            >
                                                <PartnerMark partner={partner} active={active} />
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
                            onClick={() => openTargetWindow(target)}
                            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-neutral-950 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
                        >
                            새 창 구매 페이지 열기
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
