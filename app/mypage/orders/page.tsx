"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import MypageSidebar from "@/components/mypage/MypageSidebar";
import { ddbApiBase } from "@/lib/ddb-api-base";
import { getCustomerToken } from "@/lib/customer-api";
import { findProduct, productHref, versionProductImage } from "@/lib/shop";
import { useAuth } from "@/lib/store";
import {
    estimatedDeliveryLabel,
    formatOrderAmount,
    isTestOrder,
    loadTossOrderHistory,
    loadTossOrderHistoryDetail,
    mergeUniqueTossOrders,
    orderDateLabel,
    orderStatusLabel,
    paymentMethodLabel,
    TossOrderHistoryApiError,
    type TossOrderDelivery,
    type TossOrderHistoryItem,
    type TossOrderHistoryLine,
} from "@/lib/toss-order-history";

type HistoryState =
    | { kind: "loading" }
    | {
        kind: "list";
        orders: TossOrderHistoryItem[];
        hasMore: boolean;
        nextOffset?: number;
        loadingMore: boolean;
        loadMoreError?: string;
    }
    | { kind: "detail"; order: TossOrderHistoryItem }
    | { kind: "error"; error: TossOrderHistoryApiError };

function OrdersShell({ children }: { children: React.ReactNode }) {
    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <div className="grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                <MypageSidebar />
                <div className="min-w-0">{children}</div>
            </div>
        </main>
    );
}

function detailHref(orderId: string): string {
    return `/mypage/orders/?orderId=${encodeURIComponent(orderId)}`;
}

function loginHref(orderId: string): string {
    const returnPath = orderId ? detailHref(orderId) : "/mypage/orders/";
    return `/auth/login?redirect=${encodeURIComponent(returnPath)}`;
}

function statusTone(order: TossOrderHistoryItem): string {
    if (isTestOrder(order)) return "border-sky-200 bg-sky-50 text-sky-800";
    const status = order.fulfillmentStatus.toLowerCase();
    if (["delivered", "completed"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
    if (["shipping", "shipped", "in_transit"].includes(status)) return "border-indigo-200 bg-indigo-50 text-indigo-800";
    if (["canceled", "cancelled"].includes(status) || ["failed", "refunded"].includes(order.status.toLowerCase())) {
        return "border-red-200 bg-red-50 text-red-800";
    }
    return "border-amber-200 bg-amber-50 text-amber-800";
}

function lineImage(line: TossOrderHistoryLine): { src: string; href: string } | null {
    const product = findProduct(line.productId);
    if (!product) return null;
    const selectedColorImage = line.color
        ? product.colors?.find((color) => color.name === line.color)?.image
        : undefined;
    const src = versionProductImage(selectedColorImage ?? product.image);
    return src ? { src, href: productHref(product) } : null;
}

function OrderLineView({ line, compact = false }: { line: TossOrderHistoryLine; compact?: boolean }) {
    const image = lineImage(line);
    const imageBox = (
        <span className={`relative block shrink-0 overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 ${compact ? "h-16 w-16" : "h-20 w-20"}`}>
            {image ? (
                <Image
                    src={image.src}
                    alt=""
                    fill
                    sizes={compact ? "64px" : "80px"}
                    className="object-contain p-2"
                />
            ) : (
                <span className="grid h-full w-full place-items-center text-neutral-300" aria-hidden="true">
                    <i className="fa-solid fa-box-open text-xl" />
                </span>
            )}
        </span>
    );

    return (
        <div className="flex min-w-0 items-start gap-3">
            {image ? <Link href={image.href} aria-label={`${line.name} 상품 보기`}>{imageBox}</Link> : imageBox}
            <div className="min-w-0 flex-1">
                {image ? (
                    <Link href={image.href} className="line-clamp-2 text-sm font-black leading-5 text-neutral-950 hover:text-indigo-700">
                        {line.name}
                    </Link>
                ) : (
                    <p className="line-clamp-2 text-sm font-black leading-5 text-neutral-950">{line.name}</p>
                )}
                {(line.color || line.size) && (
                    <p className="mt-1 text-xs font-bold text-neutral-500">
                        {[line.color, line.size].filter(Boolean).join(" · ")}
                    </p>
                )}
                <p className="mt-1 text-xs font-bold text-neutral-500">
                    {formatOrderAmount(line.unitAmount)} · {line.qty}개
                </p>
            </div>
            {!compact && <b className="shrink-0 text-sm font-black text-neutral-950">{formatOrderAmount(line.lineAmount)}</b>}
        </div>
    );
}

function DeliverySummary({ order }: { order: TossOrderHistoryItem }) {
    const estimate = estimatedDeliveryLabel(order);
    if (isTestOrder(order)) {
        return (
            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3" data-fulfillment-mode="test_no_delivery">
                <p className="text-sm font-black text-sky-900">
                    <i className="fa-solid fa-flask mr-2" aria-hidden="true" />
                    실제 배송 없음
                </p>
                {estimate && <p className="mt-1 text-xs font-bold text-sky-700">{estimate}</p>}
            </div>
        );
    }
    return (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-3">
            <p className="text-sm font-black text-emerald-800">
                <i className="fa-solid fa-truck-fast mr-2" aria-hidden="true" />
                {orderStatusLabel(order)}
            </p>
            {estimate && <p className="mt-1 text-xs font-bold text-emerald-700">{estimate}</p>}
        </div>
    );
}

function LiveOrderActions({ order, className = "" }: { order: TossOrderHistoryItem; className?: string }) {
    if (isTestOrder(order)) return null;
    return (
        <div className={`flex flex-wrap gap-2 ${className}`} data-live-fulfillment-actions="true">
            {order.delivery?.trackingUrl ? (
                <a
                    href={order.delivery.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                >
                    배송 조회
                </a>
            ) : (
                <Link href="/inquiry?category=delivery#inquiry-form" className="btn btn-secondary">배송 문의</Link>
            )}
            <Link href="/return" className="btn btn-secondary">교환·반품 안내</Link>
        </div>
    );
}

function OrderCard({ order }: { order: TossOrderHistoryItem }) {
    const visibleLines = order.lines.slice(0, 2);
    return (
        <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5" data-order-mode={isTestOrder(order) ? "test" : "live"}>
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-4">
                <div>
                    <p className="text-sm font-black text-neutral-950">{orderDateLabel(order.createdAt ?? order.approvedAt)} 주문</p>
                    <p className="mt-1 break-all text-xs font-bold text-neutral-500">주문번호 {order.orderId}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusTone(order)}`}>
                        {orderStatusLabel(order)}
                    </span>
                    <Link href={detailHref(order.orderId)} className="text-xs font-black text-indigo-700 hover:underline">
                        주문 상세보기 <i className="fa-solid fa-chevron-right ml-1 text-[10px]" aria-hidden="true" />
                    </Link>
                </div>
            </header>

            <DeliverySummary order={order} />

            <div className="mt-4 grid gap-4">
                {visibleLines.map((line, index) => (
                    <OrderLineView key={`${line.productId}-${line.color ?? ""}-${line.size ?? ""}-${index}`} line={line} compact />
                ))}
            </div>
            {order.lines.length > visibleLines.length && (
                <p className="mt-3 text-xs font-black text-neutral-500">외 {order.lines.length - visibleLines.length}개 상품</p>
            )}

            <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                <div>
                    <span className="text-xs font-bold text-neutral-500">총 결제금액</span>
                    <b className="ml-2 text-lg font-black text-neutral-950">{formatOrderAmount(order.amount)}</b>
                </div>
                <LiveOrderActions order={order} />
            </footer>
        </article>
    );
}

function LoadingView() {
    return (
        <main className="mx-auto max-w-[1040px] px-4 py-10 md:px-6" aria-busy="true" aria-live="polite">
            <div className="h-8 w-40 animate-pulse rounded-lg bg-neutral-200" />
            <div className="mt-6 grid gap-4">
                {[1, 2].map((key) => <div key={key} className="h-56 animate-pulse rounded-2xl bg-neutral-100" />)}
            </div>
            <span className="sr-only">주문 내역을 불러오는 중입니다.</span>
        </main>
    );
}

function LoginGate({ orderId, expired = false }: { orderId: string; expired?: boolean }) {
    return (
        <main className="mx-auto max-w-[680px] px-4 py-16 text-center">
            <i className="fa-solid fa-lock text-5xl text-amber-500" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-black text-neutral-950">{expired ? "로그인이 만료되었습니다." : "로그인이 필요합니다."}</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                주문과 배송정보는 본인 확인 후에만 볼 수 있습니다.
            </p>
            <Link href={loginHref(orderId)} className="btn btn-primary mt-6">로그인 후 주문 보기</Link>
        </main>
    );
}

function ErrorView({ error, retry }: { error: TossOrderHistoryApiError; retry: () => void }) {
    return (
        <section className="mx-auto max-w-[680px] py-12 text-center" role="alert">
            <i className="fa-solid fa-circle-exclamation text-5xl text-red-500" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-black text-neutral-950">주문 내역을 불러오지 못했습니다.</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">{error.message}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={retry} className="btn btn-primary">다시 불러오기</button>
                <Link href="/mypage" className="btn btn-secondary">마이페이지</Link>
            </div>
        </section>
    );
}

function OrderListView({
    orders,
    hasMore,
    loadingMore,
    loadMoreError,
    loadMore,
}: {
    orders: TossOrderHistoryItem[];
    hasMore: boolean;
    loadingMore: boolean;
    loadMoreError?: string;
    loadMore: () => void;
}) {
    const [query, setQuery] = useState("");
    const filteredOrders = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase("ko-KR");
        if (!needle) return orders;
        return orders.filter((order) => [
            order.orderId,
            order.orderName,
            orderStatusLabel(order),
            paymentMethodLabel(order.paymentMethod),
            ...order.lines.map((line) => `${line.name} ${line.color ?? ""} ${line.size ?? ""}`),
        ].join(" ").toLocaleLowerCase("ko-KR").includes(needle));
    }, [orders, query]);

    return (
        <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-indigo-700">MY ORDERS</p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-950">주문 내역</h1>
                    <p className="mt-2 text-sm font-bold text-neutral-500">결제 결과와 배송 상태를 주문별로 확인할 수 있습니다.</p>
                </div>
                <Link href="/mypage" className="btn btn-secondary">마이페이지로</Link>
            </div>

            {orders.length > 0 && (
                <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
                    <label className="relative block">
                        <span className="sr-only">주문 상품 또는 주문번호 검색</span>
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="주문 상품 또는 주문번호 검색"
                            className="input h-12 w-full pl-11"
                        />
                    </label>
                    <p className="mt-2 px-1 text-xs font-bold text-neutral-500" aria-live="polite">
                        {query
                            ? `${filteredOrders.length}건 검색됨 · ${orders.length}건 불러옴`
                            : `${orders.length}건 불러옴${hasMore ? " · 이전 주문 더 있음" : ""}`}
                    </p>
                </div>
            )}

            {orders.length === 0 ? (
                <section className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                    <i className="fa-solid fa-bag-shopping text-4xl text-neutral-300" aria-hidden="true" />
                    <h2 className="mt-4 text-lg font-black text-neutral-950">아직 주문 내역이 없습니다.</h2>
                    <p className="mt-2 text-sm font-bold text-neutral-500">결제가 확인된 주문이 이곳에 표시됩니다.</p>
                    <Link href="/products" className="btn btn-primary mt-6">상품 보러 가기</Link>
                </section>
            ) : filteredOrders.length === 0 ? (
                <section className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
                    <h2 className="text-lg font-black text-neutral-950">검색 결과가 없습니다.</h2>
                    <button type="button" onClick={() => setQuery("")} className="btn btn-secondary mt-4">검색어 지우기</button>
                </section>
            ) : (
                <section className="mt-6 grid gap-4" aria-label="주문 목록">
                    {filteredOrders.map((order) => <OrderCard key={order.orderId} order={order} />)}
                </section>
            )}

            {hasMore && (
                <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 text-center shadow-sm">
                    {query && (
                        <p className="mb-3 text-xs font-bold leading-5 text-neutral-500">
                            검색은 지금까지 불러온 주문에 적용됩니다. 이전 주문도 계속 불러와 검색할 수 있습니다.
                        </p>
                    )}
                    {loadMoreError && (
                        <p className="mb-3 text-xs font-bold text-red-700" role="alert">{loadMoreError}</p>
                    )}
                    <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="btn btn-secondary min-w-40"
                        aria-busy={loadingMore}
                    >
                        {loadingMore ? "주문 불러오는 중…" : loadMoreError ? "다시 불러오기" : "주문 더 보기"}
                    </button>
                </div>
            )}
        </div>
    );
}

function deliveryAddress(delivery: TossOrderDelivery): string {
    return [
        delivery.postalCode ? `(${delivery.postalCode})` : "",
        delivery.addressLine1,
        delivery.addressLine2,
    ].filter(Boolean).join(" ");
}

function deliveryRequestText(delivery: TossOrderDelivery): string {
    const labels: Record<string, string> = {
        front_door: "문 앞에 놓아주세요",
        security_office: "경비실에 맡겨주세요",
        direct_handoff: "직접 받을게요",
        parcel_box: "택배함에 넣어주세요",
        other: "직접 입력",
    };
    const requestType = delivery.requestCode
        ? (labels[delivery.requestCode.toLowerCase()] ?? delivery.requestCode)
        : "";
    return [requestType, delivery.request].filter(Boolean).join(" · ");
}

function DeliveryDetail({ order }: { order: TossOrderHistoryItem }) {
    const delivery = order.delivery;
    const address = delivery ? deliveryAddress(delivery) : "";
    const request = delivery ? deliveryRequestText(delivery) : "";
    const testOrder = isTestOrder(order);
    return (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-black text-neutral-950">받는 사람 정보</h2>
                {testOrder && <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700">화면 검증용</span>}
            </div>
            {testOrder && (
                <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                    <p className="text-sm font-black text-sky-900">실제 배송 없음</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-sky-700">
                        아래 배송정보와 일정은 결제 화면 검증을 위한 기록이며 출고에 사용되지 않습니다.
                    </p>
                    {estimatedDeliveryLabel(order) && <p className="mt-1 text-xs font-black text-sky-800">{estimatedDeliveryLabel(order)}</p>}
                </div>
            )}
            {delivery ? (
                <dl className="mt-4 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-[120px_1fr]">
                    {delivery.recipient && <><dt className="font-bold text-neutral-500">받는 분</dt><dd className="font-black text-neutral-900">{delivery.recipient}</dd></>}
                    {delivery.phone && <><dt className="font-bold text-neutral-500">연락처</dt><dd className="font-black text-neutral-900">{delivery.phone}</dd></>}
                    {address && <><dt className="font-bold text-neutral-500">받는 주소</dt><dd className="break-words font-black leading-6 text-neutral-900">{address}</dd></>}
                    {request && <><dt className="font-bold text-neutral-500">배송 요청사항</dt><dd className="break-words font-black leading-6 text-neutral-900">{request}</dd></>}
                    {delivery.entranceMethod && <><dt className="font-bold text-neutral-500">공동현관</dt><dd className="break-words font-black leading-6 text-neutral-900">{delivery.entranceMethod}</dd></>}
                    {!testOrder && delivery.carrier && <><dt className="font-bold text-neutral-500">택배사</dt><dd className="font-black text-neutral-900">{delivery.carrier}</dd></>}
                    {!testOrder && delivery.trackingNumber && <><dt className="font-bold text-neutral-500">송장번호</dt><dd className="font-black text-neutral-900">{delivery.trackingNumber}</dd></>}
                </dl>
            ) : (
                <p className="mt-4 rounded-xl bg-neutral-50 px-4 py-4 text-sm font-bold leading-6 text-neutral-600">
                    배송정보가 없는 기존 주문입니다. 결제 정보와 주문 상품은 정상적으로 확인할 수 있습니다.
                </p>
            )}
        </section>
    );
}

function OrderDetailView({ order }: { order: TossOrderHistoryItem }) {
    const productAmount = order.lines.reduce((sum, line) => sum + line.lineAmount, 0);
    return (
        <div>
            <Link href="/mypage/orders/" className="inline-flex items-center gap-2 text-sm font-black text-indigo-700 hover:underline">
                <i className="fa-solid fa-arrow-left" aria-hidden="true" /> 주문 목록
            </Link>
            <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-indigo-700">ORDER DETAIL</p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-950">주문 상세</h1>
                    <p className="mt-2 break-all text-sm font-bold text-neutral-500">
                        {orderDateLabel(order.createdAt ?? order.approvedAt)} 주문 · {order.orderId}
                    </p>
                </div>
                <span className={`rounded-full border px-3 py-1.5 text-sm font-black ${statusTone(order)}`}>
                    {orderStatusLabel(order)}
                </span>
            </div>

            <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black text-neutral-950">{orderStatusLabel(order)}</h2>
                        {!isTestOrder(order) && estimatedDeliveryLabel(order) && (
                            <p className="mt-1 text-sm font-black text-emerald-700">{estimatedDeliveryLabel(order)}</p>
                        )}
                    </div>
                    <LiveOrderActions order={order} />
                </div>
                {isTestOrder(order) && <DeliverySummary order={order} />}
                <div className="mt-5 grid gap-5 border-t border-neutral-100 pt-5">
                    {order.lines.length > 0 ? order.lines.map((line, index) => (
                        <OrderLineView key={`${line.productId}-${line.color ?? ""}-${line.size ?? ""}-${index}`} line={line} />
                    )) : (
                        <p className="text-sm font-bold text-neutral-500">주문 상품 정보를 확인하지 못했습니다.</p>
                    )}
                </div>
            </section>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <DeliveryDetail order={order} />
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-lg font-black text-neutral-950">결제 정보</h2>
                    <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 text-sm">
                        <dt className="font-bold text-neutral-500">결제수단</dt>
                        <dd className="text-right font-black text-neutral-900">{paymentMethodLabel(order.paymentMethod)}</dd>
                        <dt className="font-bold text-neutral-500">총 상품금액</dt>
                        <dd className="text-right font-black text-neutral-900">{formatOrderAmount(productAmount)}</dd>
                        <dt className="font-bold text-neutral-500">배송비</dt>
                        <dd className="text-right font-black text-neutral-900">{order.shippingFee === 0 ? "무료" : formatOrderAmount(order.shippingFee)}</dd>
                        <dt className="border-t border-neutral-200 pt-4 font-black text-neutral-950">총 결제금액</dt>
                        <dd className="border-t border-neutral-200 pt-4 text-right text-xl font-black text-neutral-950">{formatOrderAmount(order.amount)}</dd>
                    </dl>
                    {isTestOrder(order) && (
                        <p className="mt-5 rounded-xl bg-sky-50 px-4 py-3 text-xs font-bold leading-5 text-sky-800">
                            테스트 키 승인 기록입니다. 실제 출금·배송·적립은 발생하지 않습니다.
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}

function OrderHistoryContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId")?.trim() ?? "";
    const { hydrated, user } = useAuth();
    const [retryKey, setRetryKey] = useState(0);
    const [state, setState] = useState<HistoryState>({ kind: "loading" });
    const loadMoreAbortRef = useRef<AbortController | null>(null);
    const accessToken = hydrated ? (user?.apiAccessToken || getCustomerToken()) : "";
    const baseUrl = ddbApiBase();

    useEffect(() => {
        if (!hydrated || !user || !accessToken) return;
        loadMoreAbortRef.current?.abort();
        const controller = new AbortController();
        const request = orderId
            ? loadTossOrderHistoryDetail(orderId, { baseUrl, accessToken, signal: controller.signal })
                .then((order) => setState({ kind: "detail", order }))
            : loadTossOrderHistory({ baseUrl, accessToken, signal: controller.signal, limit: 20, offset: 0 })
                .then((page) => setState({
                    kind: "list",
                    orders: page.orders,
                    hasMore: page.hasMore,
                    nextOffset: page.nextOffset,
                    loadingMore: false,
                }));

        request.catch((error: unknown) => {
            if (controller.signal.aborted) return;
            setState({
                kind: "error",
                error: error instanceof TossOrderHistoryApiError
                    ? error
                    : new TossOrderHistoryApiError("주문 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."),
            });
        });
        return () => {
            controller.abort();
            loadMoreAbortRef.current?.abort();
        };
    }, [accessToken, baseUrl, hydrated, orderId, retryKey, user]);

    const loadMore = () => {
        if (state.kind !== "list" || state.loadingMore || !state.hasMore || state.nextOffset === undefined) return;
        const requestedOffset = state.nextOffset;
        loadMoreAbortRef.current?.abort();
        const controller = new AbortController();
        loadMoreAbortRef.current = controller;
        setState({ ...state, loadingMore: true, loadMoreError: undefined });
        loadTossOrderHistory({
            baseUrl,
            accessToken,
            signal: controller.signal,
            limit: 20,
            offset: requestedOffset,
        })
            .then((page) => {
                if (controller.signal.aborted) return;
                setState((current) => {
                    if (current.kind !== "list") return current;
                    return {
                        kind: "list",
                        orders: mergeUniqueTossOrders(current.orders, page.orders),
                        hasMore: page.hasMore,
                        nextOffset: page.nextOffset,
                        loadingMore: false,
                    };
                });
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return;
                const historyError = error instanceof TossOrderHistoryApiError
                    ? error
                    : new TossOrderHistoryApiError("이전 주문을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
                if (historyError.status === 401) {
                    setState({ kind: "error", error: historyError });
                    return;
                }
                setState((current) => current.kind === "list"
                    ? {
                        ...current,
                        loadingMore: false,
                        loadMoreError: historyError.message,
                    }
                    : current);
            });
    };

    if (!hydrated) return <LoadingView />;
    if (!user || !accessToken) return <LoginGate orderId={orderId} />;
    if (orderId && state.kind === "list") return <LoadingView />;
    if (orderId && state.kind === "detail" && state.order.orderId !== orderId) return <LoadingView />;
    if (!orderId && state.kind === "detail") return <LoadingView />;
    if (state.kind === "loading") return <LoadingView />;
    if (state.kind === "error") {
        if (state.error.status === 401) return <LoginGate orderId={orderId} expired />;
        return (
            <OrdersShell><ErrorView
                error={state.error}
                retry={() => {
                    setState({ kind: "loading" });
                    setRetryKey((value) => value + 1);
                }}
            /></OrdersShell>
        );
    }
    if (state.kind === "detail") return <OrdersShell><OrderDetailView order={state.order} /></OrdersShell>;
    return (
        <OrdersShell>
            <OrderListView
                orders={state.orders}
                hasMore={state.hasMore}
                loadingMore={state.loadingMore}
                loadMoreError={state.loadMoreError}
                loadMore={loadMore}
            />
        </OrdersShell>
    );
}

export default function OrderHistoryPage() {
    return (
        <Suspense fallback={<LoadingView />}>
            <OrderHistoryContent />
        </Suspense>
    );
}
