"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import MypageSidebar from "@/components/mypage/MypageSidebar";
// 웹: 배송 문의 · 교환·반품 안내를 마이페이지 안 창으로(2026-10-24)
import OrderHelpModal from "@/components/mypage/OrderHelpModal";
// 구매 확정 창(2026-10-26) — 서버 기능 전까지 개발 서버 미리보기(?ocpreview=1)에서만 보임
import PurchaseConfirmModal, { usePurchaseConfirmPreview } from "@/components/mypage/PurchaseConfirmModal";
import { ddbApiBase } from "@/lib/ddb-api-base";
import { getCustomerToken } from "@/lib/customer-api";
import { findProduct, productHref, versionProductImage } from "@/lib/shop";
import { useAuth } from "@/lib/store";
// 2026-10-26 웹 문구 · 불러오는 중 모양 — 해요체 · 서버 원문 대신 정해 둔 문장 · 크림 쿠션 자리(앱은 원래 그대로)
import { useWebScreen } from "@/hooks/useWebScreen";
import MypageWebLoading from "@/components/mypage/MypageWebLoading";
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

// 상품별 반품 신청(2026-10-26 사용자) — 웹은 교환·반품 창의 "반품 신청하기" 양식으로(OrderHelpModal), 새 탭 · 가운데 클릭은 1:1 문의 페이지
const RETURN_REQUEST_HREF = "/inquiry?category=exchange#inquiry-form";

function OrderLineView({ line, compact = false, onReturnRequest }: { line: TossOrderHistoryLine; compact?: boolean; onReturnRequest?: () => void }) {
    const image = lineImage(line);
    // 반품 신청 버튼 · 배송 완료된 실제 주문에서만 넘어옴(앱도 2026-10-26부터 보임 — 꾸밈은 앱 appShopSkin)
    const returnLink = onReturnRequest ? (
        <Link href={RETURN_REQUEST_HREF} className="mp-line-return" onClick={(event) => { if (opensInModal(event)) { event.preventDefault(); onReturnRequest(); } }}>
            반품 신청
        </Link>
    ) : null;
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
            {/* 상세 화면 상품 줄의 반품 신청(웹 · 앱 — hidden 을 각 화면 꾸밈이 보이게 바꿈) */}
            {!compact && returnLink && <span className="hidden mp-line-return-wrap">{returnLink}</span>}
            {/* 목록 카드 상품 칸 오른쪽: 상품 금액 + 상품 보기 + 반품 신청(웹 · 앱은 반품 신청만 보임 — 각 화면 꾸밈) */}
            {compact && (
                <span className="hidden mp-line-side">
                    <b>{formatOrderAmount(line.lineAmount)}</b>
                    {image && <Link href={image.href}>상품 보기</Link>}
                    {returnLink}
                </span>
            )}
        </div>
    );
}

// 웹 진행 단계(결제 완료 → 상품 준비 → 배송중 → 배송 완료) — 상태 이름표로만 계산, 취소 · 실패 · 테스트 주문은 단계 없음
const ORDER_STEPS = ["결제 완료", "상품 준비", "배송중", "배송 완료"] as const;

function orderStage(order: TossOrderHistoryItem): number | null {
    if (isTestOrder(order)) return null;
    const label = orderStatusLabel(order);
    if (label === "배송완료") return 3;
    if (label === "배송중") return 2;
    if (label === "상품 준비중") return 1;
    if (label === "결제완료" || label === "주문 접수") return 0;
    return null;
}

// 진행 단계 줄(웹 꾸밈 app/mypage-web.css · 앱 꾸밈 appShopSkin — 2026-10-26 앱도 보임)
function OrderSteps({ order }: { order: TossOrderHistoryItem }) {
    const stage = orderStage(order);
    if (stage === null) return null;
    return (
        <ol className="hidden mp-order-steps" aria-label={`진행 단계: ${ORDER_STEPS[stage]}`}>
            {ORDER_STEPS.map((step, index) => (
                <li key={step} data-state={index < stage || stage === 3 ? "done" : index === stage ? "now" : "next"}>
                    <span aria-hidden="true">{index < stage || stage === 3 ? "✓" : index + 1}</span>
                    {step}
                </li>
            ))}
        </ol>
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
            <OrderSteps order={order} />
        </div>
    );
}

// 보통 클릭이면 창으로(새 탭 · 가운데 클릭은 원래대로 페이지 이동).
// 2026-10-26 사용자: 앱에서도 같은 창(교환·반품 · 문의 · 주문 취소 · 반품 신청) — 앱은 1:1 문의 · 교환/반품 페이지가 앱 묶음 밖(APK 바깥 브라우저)이라 창이 더 자연스러움.
// 창 모양은 앱 꾸밈(components/app-shell/appShopSkin "주문 도움 창")이 스티커북으로 바꿈
function opensInModal(event: React.MouseEvent) {
    return !(event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
}

/** 교환·반품 · 문의 창 위의 주문 표 */
function orderHelpSummary(order: TossOrderHistoryItem) {
    const firstLine = order.lines[0];
    return {
        orderId: order.orderId,
        orderName: order.orderName,
        firstLineName: firstLine?.name,
        image: firstLine ? lineImage(firstLine)?.src : undefined,
        dateLabel: `${orderDateLabel(order.createdAt ?? order.approvedAt)} 주문`,
        amountLabel: formatOrderAmount(order.amount),
        statusLabel: orderStatusLabel(order),
    };
}

/** 반품 신청을 보일 주문 — 실제 주문 · 배송 완료(테스트 주문 · 배송 전은 없음) */
function canRequestReturn(order: TossOrderHistoryItem): boolean {
    return !isTestOrder(order) && orderStage(order) === 3;
}

/** 상품별 반품 신청 창 — 고른 상품이 있을 때만 */
function LineReturnModal({ order, line, onClose }: { order: TossOrderHistoryItem; line: TossOrderHistoryLine | null; onClose: () => void }) {
    if (!line) return null;
    return (
        <OrderHelpModal
            order={orderHelpSummary(order)}
            line={{ name: line.name, option: [line.color, line.size].filter(Boolean).join(" · ") || undefined, image: lineImage(line)?.src }}
            initialMode="exchange"
            onClose={onClose}
        />
    );
}

function LiveOrderActions({ order, className = "" }: { order: TossOrderHistoryItem; className?: string }) {
    const [help, setHelp] = useState<"inquiry" | "return" | "cancel" | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    // 주문 취소 요청 · 구매 확정 — 웹 · 앱 모두(2026-10-26 사용자, 앱 모양은 appShopSkin)
    const confirmPreview = usePurchaseConfirmPreview();
    if (isTestOrder(order)) return null;
    const summary = orderHelpSummary(order);
    const stage = orderStage(order);
    // 배송 준비 전(결제 완료 · 상품 준비 중)이면 취소 요청, 배송 완료면 구매 확정(서버 기능 전까지 미리보기에서만)
    const cancelable = stage !== null && stage <= 1;
    const confirmable = confirmPreview && stage === 3;
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
                <Link href="/inquiry?category=delivery#inquiry-form" className="btn btn-secondary" onClick={(event) => { if (opensInModal(event)) { event.preventDefault(); setHelp("inquiry"); } }}>배송 문의</Link>
            )}
            <Link href="/return" className="btn btn-secondary" onClick={(event) => { if (opensInModal(event)) { event.preventDefault(); setHelp("return"); } }}>교환·반품 안내</Link>
            {/* 주문 취소 요청 — 1:1 문의(환불·주문 취소)로 접수(결제 취소 서버 기능 전까지) */}
            {cancelable && (
                <Link href="/inquiry?category=refund#inquiry-form" className="btn btn-secondary" data-order-cancel onClick={(event) => { if (opensInModal(event)) { event.preventDefault(); setHelp("cancel"); } }}>주문 취소 요청</Link>
            )}
            {/* 구매 확정 — 서버 기능 전까지 미리보기에서만(확정해도 화면만 바뀜) */}
            {confirmable && (
                <button type="button" className="btn btn-primary" data-order-confirm onClick={() => setConfirmOpen(true)}>구매 확정</button>
            )}
            {help && <OrderHelpModal order={summary} initialMode={help} onClose={() => setHelp(null)} />}
            {confirmOpen && (
                <PurchaseConfirmModal
                    order={summary}
                    lines={order.lines.map((line) => ({ name: line.name, option: [line.color, line.size].filter(Boolean).join(" · ") || undefined, image: lineImage(line)?.src, qty: line.qty }))}
                    preview
                    onClose={() => setConfirmOpen(false)}
                />
            )}
        </div>
    );
}

function OrderCard({ order }: { order: TossOrderHistoryItem }) {
    const visibleLines = order.lines.slice(0, 2);
    const [returnLine, setReturnLine] = useState<TossOrderHistoryLine | null>(null);
    const returnable = canRequestReturn(order);
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
                    <OrderLineView key={`${line.productId}-${line.color ?? ""}-${line.size ?? ""}-${index}`} line={line} compact onReturnRequest={returnable ? () => setReturnLine(line) : undefined} />
                ))}
            </div>
            <LineReturnModal order={order} line={returnLine} onClose={() => setReturnLine(null)} />
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
    // 웹: 사이드 메뉴 + 머리 판 + 흰 쿠션 카드 자리(앱은 아래 원래 회색 자리)
    const webScreen = useWebScreen();
    if (webScreen) {
        return (
            <OrdersShell>
                <MypageWebLoading
                    head={{ kicker: "MY ORDERS", title: "주문 내역", text: "주문 내역을 불러오고 있어요.", art: "cart" }}
                    label="주문 내역을 불러오는 중이에요."
                />
            </OrdersShell>
        );
    }
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
    // 웹은 해요체(앱 문구 그대로)
    const webScreen = useWebScreen();
    return (
        <main className="mx-auto max-w-[680px] px-4 py-16 text-center" data-mypage-web="gate">
            <i className="fa-solid fa-lock text-5xl text-amber-500" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-black text-neutral-950">
                {webScreen
                    ? (expired ? "로그인이 만료되었어요" : "로그인이 필요해요")
                    : (expired ? "로그인이 만료되었습니다." : "로그인이 필요합니다.")}
            </h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                {webScreen ? "주문과 배송 정보는 본인 확인 후에 볼 수 있어요." : "주문과 배송정보는 본인 확인 후에만 볼 수 있습니다."}
            </p>
            <Link href={loginHref(orderId)} className="btn btn-primary mt-6">로그인 후 주문 보기</Link>
            {/* 웹 전용(2026-10-26) — 하위 화면 로그인 안내와 같게 비회원 주문 조회 줄(앱은 hidden 그대로, 꾸밈은 app/mypage-web.css) */}
            <p className="hidden mp-gate-guest">
                비회원으로 주문하셨나요?
                <Link href="/order-lookup">비회원 주문 조회<i className="fa-solid fa-chevron-right" aria-hidden="true" /></Link>
            </p>
        </main>
    );
}

// 웹 오류 안내 문장 — 서버가 보낸 원문(영어 detail · 형식 오류 같은 개발 문구) 대신 상황별 해요체(앱은 error.message 그대로)
function webOrderErrorText(error: TossOrderHistoryApiError): string {
    if (error.status === 404 || error.code === "invalid_order_id") return "주문을 찾지 못했어요. 주문 목록에서 다시 골라 주세요.";
    if (error.code === "missing_api_base") return "지금은 주문 내역에 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요.";
    if (error.status === 429) return "요청이 많아 잠시 쉬고 있어요. 조금 뒤 다시 불러와 주세요.";
    return "주문 내역을 잠시 불러오지 못했어요. 잠시 뒤 다시 불러와 주세요.";
}

function ErrorView({ error, retry }: { error: TossOrderHistoryApiError; retry: () => void }) {
    const webScreen = useWebScreen();
    return (
        <section className="mx-auto max-w-[680px] py-12 text-center" role="alert">
            <i className="fa-solid fa-circle-exclamation text-5xl text-red-500" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-black text-neutral-950">{webScreen ? "주문 내역을 불러오지 못했어요" : "주문 내역을 불러오지 못했습니다."}</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">{webScreen ? webOrderErrorText(error) : error.message}</p>
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
    // 웹은 안내 · 빈 화면 문구를 해요체로(앱 문구 그대로)
    const webScreen = useWebScreen();
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
            {/* 웹 K5 결 — 주문 내역 머리 분홍 띠 판 + 장바구니 그림(data-mp-hello, 꾸밈은 app/mypage-web.css · 앱 그대로) */}
            <div className="flex flex-wrap items-end justify-between gap-3" data-mp-hello data-mp-art="cart">
                <div>
                    <p className="text-sm font-black text-indigo-700">MY ORDERS</p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-950">주문 내역</h1>
                    <p className="mt-2 text-sm font-bold text-neutral-500">{webScreen ? "결제 결과와 배송 상태를 주문별로 확인할 수 있어요." : "결제 결과와 배송 상태를 주문별로 확인할 수 있습니다."}</p>
                </div>
                <Link href="/mypage" className="btn btn-secondary">마이페이지로</Link>
            </div>

            {/* 웹 전용 — 주문 요약 4칸(불러온 주문 기준, 누르는 기능 없음). 앱에서는 숨김 */}
            {orders.length > 0 && (
                <dl className="hidden mp-order-stats">
                    <div data-stat="all"><dt>전체 주문</dt><dd>{orders.length}<small>건</small></dd></div>
                    <div data-stat="moving"><dt>준비 · 배송중</dt><dd>{orders.filter((order) => { const stage = orderStage(order); return stage === 1 || stage === 2; }).length}<small>건</small></dd></div>
                    <div data-stat="done"><dt>배송 완료</dt><dd>{orders.filter((order) => orderStage(order) === 3).length}<small>건</small></dd></div>
                    <div data-stat="sum"><dt>누적 결제</dt><dd>{formatOrderAmount(orders.filter((order) => !isTestOrder(order)).reduce((total, order) => total + order.amount, 0))}</dd></div>
                </dl>
            )}

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
                    <h2 className="mt-4 text-lg font-black text-neutral-950">{webScreen ? "아직 주문 내역이 없어요" : "아직 주문 내역이 없습니다."}</h2>
                    <p className="mt-2 text-sm font-bold text-neutral-500">{webScreen ? "결제가 확인된 주문이 이곳에 보여요." : "결제가 확인된 주문이 이곳에 표시됩니다."}</p>
                    <Link href="/products" className="btn btn-primary mt-6">상품 보러 가기</Link>
                </section>
            ) : filteredOrders.length === 0 ? (
                <section className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
                    <h2 className="text-lg font-black text-neutral-950">{webScreen ? "검색 결과가 없어요" : "검색 결과가 없습니다."}</h2>
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
                        <p className="mb-3 text-xs font-bold text-red-700" role="alert">{webScreen ? "이전 주문을 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요." : loadMoreError}</p>
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
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6" data-mp-card>
            <div className="flex flex-wrap items-center justify-between gap-2" data-mp-band="mint" data-mp-art="home">
                <h2 className="text-lg font-black text-neutral-950" data-mp-kicker="DELIVERY">받는 사람 정보</h2>
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
    const [returnLine, setReturnLine] = useState<TossOrderHistoryLine | null>(null);
    const returnable = canRequestReturn(order);
    return (
        <div>
            <Link href="/mypage/orders/" className="inline-flex items-center gap-2 text-sm font-black text-indigo-700 hover:underline">
                <i className="fa-solid fa-arrow-left" aria-hidden="true" /> 주문 목록
            </Link>
            {/* 웹 K5 결 — 주문 상세 머리 분홍 띠 판 + 메모 그림(data-mp-hello, 꾸밈은 app/mypage-web.css · 앱 그대로) */}
            <div className="mt-5 flex flex-wrap items-start justify-between gap-3" data-mp-hello data-mp-art="memo">
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

            <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6" data-mp-card>
                <div className="flex flex-wrap items-center justify-between gap-3" data-mp-band="sky" data-mp-art="cart">
                    <div>
                        <h2 className="text-lg font-black text-neutral-950" data-mp-kicker="ORDER STATUS">{orderStatusLabel(order)}</h2>
                        {!isTestOrder(order) && estimatedDeliveryLabel(order) && (
                            <p className="mt-1 text-sm font-black text-emerald-700">{estimatedDeliveryLabel(order)}</p>
                        )}
                    </div>
                    <LiveOrderActions order={order} />
                </div>
                {isTestOrder(order) && <DeliverySummary order={order} />}
                <OrderSteps order={order} />
                <div className="mt-5 grid gap-5 border-t border-neutral-100 pt-5">
                    {order.lines.length > 0 ? order.lines.map((line, index) => (
                        <OrderLineView key={`${line.productId}-${line.color ?? ""}-${line.size ?? ""}-${index}`} line={line} onReturnRequest={returnable ? () => setReturnLine(line) : undefined} />
                    )) : (
                        <p className="text-sm font-bold text-neutral-500">주문 상품 정보를 확인하지 못했습니다.</p>
                    )}
                </div>
                <LineReturnModal order={order} line={returnLine} onClose={() => setReturnLine(null)} />
            </section>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <DeliveryDetail order={order} />
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6" data-mp-card>
                    <h2 className="text-lg font-black text-neutral-950" data-mp-band="yellow" data-mp-art="coin" data-mp-kicker="PAYMENT">결제 정보</h2>
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
