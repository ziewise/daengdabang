"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { affiliateStopsFromPublicConfig, type AffiliateStop, safeOutboundTarget } from "@/lib/outbound";
import { trackOutboundRedirect } from "@/lib/storefront-analytics";

const DEFAULT_DELAY_MS = 2400;
const AFFILIATE_DELAY_MS = 1800;
const PARTNER_REQUEST_DEADLINE_MS = 12_000;

type PartnerHitState = "idle" | "confirming" | "confirmed" | "failed" | "blocked";

type PartnerDelivery = {
    id: string;
    name: string;
    status: string;
    attempts: number;
    httpStatus?: number | null;
};

type PartnerHitResponse = {
    ok: boolean;
    clickId: string;
    status: string;
    requiredCount: number;
    confirmedCount: number;
    failedCount: number;
    retryable: boolean;
    partners: PartnerDelivery[];
};

function PartnerMark({ status }: { status: string }) {
    const confirmed = status === "confirmed";
    const failed = status === "failed" || status === "config_error";
    const tone = confirmed
        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
        : failed
            ? "border-rose-400 bg-rose-50 text-rose-700"
            : "border-neutral-300 bg-white text-neutral-600";
    return (
        <span className={`flex h-9 w-24 shrink-0 items-center justify-center gap-1 rounded-md border px-1.5 text-[11px] font-black ${tone}`}>
            <i className={`fa-solid ${confirmed ? "fa-check" : failed ? "fa-rotate" : "fa-spinner fa-spin"}`} aria-hidden="true" />
            {confirmed ? "수신 확인" : failed ? "재시도" : "요청 확인"}
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

function newClickId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `ddb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function contractedPartnerApiBase(): string {
    if (typeof window === "undefined") return "";
    const pageHost = window.location.hostname.toLowerCase();
    if (pageHost !== "localhost" && pageHost !== "127.0.0.1") {
        return "https://api.daengdabang.com";
    }

    const configured = process.env.NEXT_PUBLIC_DDB_API_BASE || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    try {
        const parsed = new URL(configured);
        const allowedLocalHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
        const allowedOfficialHost = parsed.hostname === "api.daengdabang.com";
        return ["http:", "https:"].includes(parsed.protocol) && (allowedLocalHost || allowedOfficialHost)
            ? parsed.origin
            : "";
    } catch {
        return "";
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
    const category = params.get("category") || "";
    const subcategory = params.get("subcategory") || "";
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

    const [remaining, setRemaining] = useState(Math.ceil(redirectDelay / 1000));
    const [affiliateStops, setAffiliateStops] = useState<AffiliateStop[]>([]);
    const [deliveries, setDeliveries] = useState<PartnerDelivery[]>([]);
    const [hitState, setHitState] = useState<PartnerHitState>(showAffiliateTrail ? "idle" : "confirmed");
    const [hitError, setHitError] = useState("");
    const [retryCycle, setRetryCycle] = useState(0);
    const [confirmedDispatchKey, setConfirmedDispatchKey] = useState("");
    const [manualOpenedKey, setManualOpenedKey] = useState("");
    const clickIdentityRef = useRef({ target: "", clickId: "" });
    const directAnalyticsRef = useRef("");
    const manualNavigationKeyRef = useRef("");
    const dispatchKey = showAffiliateTrail && target ? target : "";
    const navigationKey = target ? `${showAffiliateTrail ? "partners" : "direct"}:${target}` : "";
    const manualOpened = Boolean(navigationKey) && manualOpenedKey === navigationKey;

    useEffect(() => {
        if (!target || showAffiliateTrail) return;
        const key = [target, query, sourceName, productId, offerId, surface].join("|");
        if (directAnalyticsRef.current === key) return;
        directAnalyticsRef.current = key;
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
            viaPartners: false,
        });
    }, [target, query, sourceName, sellerName, productTitle, productId, offerId, sourceKind, totalPrice, priceText, hasThumbnail, rank, surface, category, subcategory, showAffiliateTrail]);

    useEffect(() => {
        if (!showAffiliateTrail || !target) return;
        if (clickIdentityRef.current.target !== target) {
            clickIdentityRef.current = { target, clickId: newClickId() };
        }
        const clickId = clickIdentityRef.current.clickId;

        let cancelled = false;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), PARTNER_REQUEST_DEADLINE_MS);

        const run = async () => {
            setHitState("confirming");
            setHitError("");
            setConfirmedDispatchKey("");
            setRemaining(Math.ceil(redirectDelay / 1000));
            try {
                const base = contractedPartnerApiBase().replace(/\/$/, "");
                if (!base) {
                    setHitState("blocked");
                    setHitError("제휴 요청 확인 서버에 연결할 수 없어 이동을 보류했습니다.");
                    return;
                }
                const configResponse = await fetch(
                    `${base}/api/v1/partners/outbound-hit-config?target=${encodeURIComponent(target)}&click_id=${encodeURIComponent(clickId)}`,
                    {
                        method: "GET",
                        cache: "no-store",
                        credentials: "omit",
                        signal: controller.signal,
                    },
                );
                if (!configResponse.ok) throw new Error("partner_config_failed");
                const config = await configResponse.json() as {
                    partners?: unknown;
                    dispatchToken?: string;
                };
                if (cancelled) return;
                const configuredStops = affiliateStopsFromPublicConfig(config.partners);
                setAffiliateStops(configuredStops);
                setDeliveries(configuredStops.map((partner) => ({
                    id: partner.id,
                    name: partner.name,
                    status: "pending",
                    attempts: 0,
                })));
                if (!configuredStops.length || !config.dispatchToken) {
                    setHitState("blocked");
                    setHitError("확인 가능한 계약 제휴사가 없어 이동을 보류했습니다.");
                    return;
                }

                const response = await fetch(`${base}/api/v1/partners/outbound-hits`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "omit",
                    cache: "no-store",
                    signal: controller.signal,
                    body: JSON.stringify({
                        clickId,
                        dispatchToken: config.dispatchToken,
                        targetUrl: target,
                        outboundUrl: window.location.href,
                        query,
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
                    }),
                });
                if (!response.ok) throw new Error("partner_dispatch_failed");
                const result = await response.json() as PartnerHitResponse;
                if (cancelled) return;
                if (result.clickId !== clickId) throw new Error("partner_dispatch_identity_mismatch");
                setDeliveries(result.partners || []);
                if (result.ok && result.requiredCount > 0 && result.confirmedCount === result.requiredCount) {
                    setHitState("confirmed");
                    setConfirmedDispatchKey(dispatchKey);
                    setHitError("");
                } else {
                    setHitState(result.status === "blocked" ? "blocked" : "failed");
                    setHitError(`계약 제휴 ${result.requiredCount}곳 중 ${result.confirmedCount}곳만 확인되어 이동을 보류했습니다.`);
                }
            } catch (error) {
                if (cancelled) return;
                setHitState("failed");
                setHitError(error instanceof DOMException && error.name === "AbortError"
                    ? "제휴 요청 수신 확인 시간이 초과되어 이동을 보류했습니다."
                    : "제휴 요청 수신 확인에 실패해 이동을 보류했습니다.");
            } finally {
                window.clearTimeout(timeout);
            }
        };
        void run();
        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [target, query, sourceName, sellerName, productTitle, productId, offerId, sourceKind, totalPrice, priceText, hasThumbnail, rank, surface, category, subcategory, showAffiliateTrail, retryCycle, dispatchKey, redirectDelay]);

    const hitConfirmedForCurrentTarget = !showAffiliateTrail
        || (hitState === "confirmed" && confirmedDispatchKey === dispatchKey);
    const displayHitState = hitConfirmedForCurrentTarget
        ? "confirmed"
        : hitState === "confirmed" ? "confirming" : hitState;
    const canRedirect = Boolean(target) && hitConfirmedForCurrentTarget;

    useEffect(() => {
        if (!canRedirect || !target || manualOpened) return;
        const startedAt = Date.now();
        const tick = window.setInterval(() => {
            const elapsed = Date.now() - startedAt;
            setRemaining(Math.max(1, Math.ceil((redirectDelay - elapsed) / 1000)));
        }, 250);
        const redirect = window.setTimeout(() => {
            if (manualNavigationKeyRef.current !== navigationKey) window.location.assign(target);
        }, redirectDelay);
        return () => {
            window.clearInterval(tick);
            window.clearTimeout(redirect);
        };
    }, [canRedirect, manualOpened, navigationKey, redirectDelay, target]);

    const openConfirmedTarget = () => {
        if (!target || !canRedirect) return;
        manualNavigationKeyRef.current = navigationKey;
        setManualOpenedKey(navigationKey);
        openTargetWindow(target);
    };

    const retryPartnerDispatch = () => {
        if (hitState === "blocked") {
            clickIdentityRef.current = { target: "", clickId: "" };
        }
        setRetryCycle((value) => value + 1);
    };

    const confirmedCount = deliveries.filter((item) => item.status === "confirmed").length;
    const expectedCount = Math.max(affiliateStops.length, deliveries.length);
    const hitProgress = expectedCount > 0 ? Math.round((confirmedCount / expectedCount) * 100) : 0;

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
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-xs font-black text-neutral-600">계약 제휴 서버 요청 확인</p>
                                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                                        displayHitState === "confirmed"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : displayHitState === "failed" || displayHitState === "blocked"
                                                ? "bg-rose-100 text-rose-700"
                                                : "bg-amber-100 text-amber-800"
                                    }`}>
                                        {displayHitState === "confirmed" ? `${confirmedCount}/${expectedCount} 완료` : `${confirmedCount}/${expectedCount || "-"} 확인 중`}
                                    </span>
                                </div>
                                <div className="grid gap-2">
                                    {(deliveries.length ? deliveries : affiliateStops.map((partner) => ({
                                        id: partner.id,
                                        name: partner.name,
                                        status: "pending",
                                        attempts: 0,
                                        httpStatus: null,
                                    }))).map((partner, index) => (
                                        <div key={partner.id} className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2">
                                            <PartnerMark status={partner.status} />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-black text-neutral-950">
                                                    계약 제휴 {index + 1} · {partner.name}
                                                </span>
                                                <span className="block truncate text-[11px] font-bold text-neutral-500">
                                                    {partner.status === "confirmed"
                                                        ? `서버 수신과 원장 기록 확인${partner.httpStatus ? ` · HTTP ${partner.httpStatus}` : ""}`
                                                        : partner.status === "failed"
                                                            ? "응답을 받지 못해 이동을 보류했습니다"
                                                            : partner.status === "config_error"
                                                                ? "계약 추적 주소 설정을 확인해야 합니다"
                                                            : "서버에서 계약 요청 수신을 확인하는 중"}
                                                </span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {hitError && <p className="mt-2 text-xs font-bold leading-5 text-rose-700">{hitError}</p>}
                            </div>
                        )}
                        <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-100">
                            <div
                                className={`h-full rounded-full transition-[width] duration-300 ${displayHitState === "failed" || displayHitState === "blocked" ? "bg-rose-500" : "bg-neutral-950"}`}
                                style={showAffiliateTrail && displayHitState !== "confirmed"
                                    ? { width: `${hitProgress}%` }
                                    : { width: "100%", animation: `ddb-outbound-progress ${redirectDelay}ms linear forwards` }}
                            />
                        </div>
                        <p className="mt-4 text-xs font-bold text-neutral-500">
                            {canRedirect
                                ? `계약 제휴 서버 수신 확인 완료 · 약 ${remaining}초 뒤 새 구매 페이지로 이동합니다.`
                                : "계약 제휴 요청이 모두 서버에 수신될 때까지 구매 페이지로 이동하지 않습니다."}
                        </p>
                        {showAffiliateTrail && !hitConfirmedForCurrentTarget ? (
                            <button
                                type="button"
                                disabled={displayHitState === "confirming" || displayHitState === "idle"}
                                onClick={retryPartnerDispatch}
                                className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-neutral-950 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:bg-neutral-400"
                            >
                                {displayHitState === "confirming" || displayHitState === "idle" ? "계약 제휴 요청 확인 중" : "제휴 요청 다시 확인"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={manualOpened}
                                onClick={openConfirmedTarget}
                                className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-neutral-950 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-default disabled:bg-neutral-400"
                            >
                                {manualOpened ? "새 창을 열었습니다" : "새 창 구매 페이지 열기"}
                            </button>
                        )}
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
