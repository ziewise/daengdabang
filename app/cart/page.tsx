"use client";

/**
 * CartPage — 장바구니 (선택 결제 지원)
 * ---------------------------------------------------------------------
 * - 라인별 체크박스 + 전체선택/선택삭제 바: 체크된 상품만 결제로 넘어간다.
 * - 각 상품에 도착 예정일(1~2영업일 출고 기준) 표시.
 * - 수량 1일 때 마이너스 비활성(0으로 못 내림 — 삭제는 삭제 버튼으로만).
 * - 합계/결제 버튼은 "선택된" 상품 기준. 미선택 상품은 카드가 흐려진다.
 * - 결제하기: 로그인 회원은 바로, 비로그인은 로그인 화면(비회원 주문서 미리보기 가능)으로.
 *
 * 2026-10-24 웹 크레파스 결(app/cart-web.css, 웹 html:not(.ddb-app-mode) 에서만):
 *  - 빈 장바구니: 무지개 고리 3D 장바구니 · 주아 제목 · 설명 · 분홍 알약 · 쇼핑 바로가기 둥근 쿠션 넷(헤더 쇼핑 메뉴와 같은 주소 · 그림)
 *  - 담긴 장바구니: 영문 손글씨 · 주아 제목 + 단계(장바구니 → 주문서 → 결제 완료) · 흰 쿠션 상품 카드 ·
 *    따라 내려오는 주문 요약 쿠션(무료배송까지 남은 금액 막대 = 배송비 기준 FREE_SHIPPING_THRESHOLD_KRW 그대로)
 * 앱은 appShopSkin 이 이 구조(전체 선택 줄 = section 첫 칸, 카드 안 순서)로 꾸미므로 순서는 그대로 두고 이름표 · hidden 웹 요소만 더함.
 * 고르기 · 수량 · 삭제 · 결제 이동 동작 그대로.
 */

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { arrivalDateText, cartProducts, productHref } from "@/lib/shop";
import { useAuth, useCart } from "@/lib/store";
import { usePets } from "@/hooks/usePets";
import { cartPetOptions } from "@/lib/pet-attribution";
import SimplePayButtons from "@/components/shop/SimplePayButtons";
import { useI18n } from "@/lib/i18n";
import { daengLabCoinsForLines } from "@/lib/daenglab-rewards";
import { checkoutHref, type QuickPaymentMethod } from "@/lib/payment-methods";
import DaengLabCoinMark from "@/components/petlens/DaengLabCoinMark";
import { baseShippingFee, FREE_SHIPPING_THRESHOLD_KRW } from "@/lib/shipping-policy";
import { CrayonGrainFilter, PawTrail } from "@/components/daily/CrayonArt";
import "../daily-web.css";
import "../cart-web.css";
import { purchaseStateLabel } from "@/lib/catalog/inventory";
import { useLiveInventorySnapshot } from "@/lib/catalog/live-inventory";

/* 커스텀 체크박스 — 인디고 채움 + 체크 아이콘 */
function CheckBtn({ checked, onToggle, label, disabled = false }: { checked: boolean; onToggle: () => void; label: string; disabled?: boolean }) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={onToggle}
            className={`cart-check flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                checked
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-neutral-300 bg-white text-transparent hover:border-indigo-400"
            }`}
        >
            <i className="fa-solid fa-check text-[10px]" />
        </button>
    );
}

// 빈 장바구니 쇼핑 바로가기(웹) — 헤더 쇼핑 메뉴와 같은 주소 · 그림(shop-menu-*)
const CART_SHORTCUTS = [
    { href: "/best", ko: "댕다방 핫픽", en: "Hot Picks", art: "hotpick", tint: "is-pink" },
    { href: "/new", ko: "신상품", en: "New", art: "new", tint: "is-yellow" },
    { href: "/brands", ko: "브랜드", en: "Brands", art: "brand", tint: "is-mint" },
    { href: "/bundles", ko: "세트상품", en: "Bundles", art: "set", tint: "is-sky" },
] as const;

export default function CartPage() {
    const router = useRouter();
    const cart = useCart();
    const { user } = useAuth();
    const { pets: profilePets } = usePets();
    const { t, locale, formatPrice, productName } = useI18n();
    const liveInventory = useLiveInventorySnapshot();
    const lines = cartProducts(cart.lines, liveInventory);
    const petOptions = cartPetOptions(user?.pets ?? [], profilePets);
    const hasPets = petOptions.length > 0;

    // 선택된 라인만 합계·결제 대상
    const selectedLines = lines.filter((l) => l.selected);
    const inventoryBlocked = lines.some(line => line.selectionBlocked);
    const selectedTotal = selectedLines.reduce((sum, l) => sum + l.subtotal, 0);
    const estimatedBaseShippingFee = baseShippingFee(selectedTotal);
    const expectedDaengLabCoins = daengLabCoinsForLines(selectedLines);
    const allSelected = lines.length > 0 && selectedLines.length === lines.length;
    const arrival = arrivalDateText(locale);
    const countText = (count: number) => locale === "en" ? `${count} ${t("countSuffix")}` : `${count}${t("countSuffix")}`;

    // 결제하기 — 로그인 회원은 바로 결제, 비로그인은 로그인 화면(비회원은 주문서 미리보기 가능)으로
    const goCheckout = (preferredPayment: "card" | QuickPaymentMethod = "card") => {
        if (selectedLines.length === 0) return;
        if (inventoryBlocked) return;
        const nextCheckoutHref = checkoutHref(preferredPayment);
        router.push(user ? nextCheckoutHref : `/auth/login?redirect=${encodeURIComponent(nextCheckoutHref)}`);
    };

    // 선택삭제 — 체크된 라인 일괄 삭제(실수 방지 confirm)
    const removeSelected = () => {
        if (selectedLines.length === 0) return;
        const message = locale === "en"
            ? `Remove ${selectedLines.length} selected item(s)?`
            : `선택한 ${selectedLines.length}개 상품을 삭제할까요?`;
        if (!window.confirm(message)) return;
        selectedLines.forEach((l) => cart.removeFromCart(l.product.id, l.color, l.size));
    };

    if (lines.length === 0) {
        return (
            <main className="mx-auto max-w-[760px] px-4 py-14 text-center" data-daily-web data-cart-web="empty">
                <CrayonGrainFilter />
                {/* 웹 전용 — 무지개 고리 3D 장바구니(앱은 아래 아이콘 자리에 자수 장바구니) */}
                <span className="hidden dw-rring cart-empty-ring" aria-hidden="true">
                    <span><Image src="/images/ui/header-cart-128.webp" alt="" width={128} height={128} priority /></span>
                </span>
                <i className="fa-solid fa-bag-shopping text-4xl text-neutral-300" />
                <h1 className="cart-empty-title mt-4 text-2xl font-black text-neutral-950">{t("emptyCart")}</h1>
                <p className="hidden cart-empty-lead">
                    {locale === "en" ? "Fill it with things your dog will love." : "우리 아이에게 꼭 맞는 용품을 담아 보세요."}
                </p>
                <Link href="/products" className="cart-empty-go btn btn-primary mt-6">
                    {t("shopNow")}
                </Link>
                {/* 웹 전용 — 쇼핑 바로가기 둥근 쿠션 넷 */}
                <div className="hidden cart-shortcuts-wrap">
                    <PawTrail />
                    <nav className="cart-shortcuts" aria-label={locale === "en" ? "Shop shortcuts" : "쇼핑 바로가기"}>
                        {CART_SHORTCUTS.map((item) => (
                            <Link key={item.href} href={item.href} className={`cart-shortcut ${item.tint}`}>
                                <span className="cart-shortcut-art" aria-hidden="true">
                                    <Image src={`/images/ui/shop-menu-${item.art}-128.webp`} alt="" width={64} height={64} />
                                </span>
                                <span className="cart-shortcut-label">{locale === "en" ? item.en : item.ko}</span>
                            </Link>
                        ))}
                    </nav>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6" data-daily-web data-cart-web="filled">
            {/* 웹 전용 — 영문 손글씨 꼬리표 */}
            <p className="hidden cart-kicker">MY CART</p>
            <h1 className="cart-title text-3xl font-black tracking-tight text-neutral-950">{t("cart")}</h1>
            {/* 웹 전용 — 주문 단계(지금 = 장바구니) */}
            <ol className="hidden cart-steps" aria-label={locale === "en" ? "Order steps" : "주문 단계"}>
                <li className="is-on" aria-current="step"><b>1</b>{t("cart")}</li>
                <li><b>2</b>{locale === "en" ? "Checkout" : "주문서"}</li>
                <li><b>3</b>{locale === "en" ? "Done" : "결제 완료"}</li>
            </ol>
            {inventoryBlocked && <p role="alert" className="cart-alert mt-3 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-900">{locale === "en" ? "Some options cannot be purchased. Remove these lines or choose another option before checkout." : "구매할 수 없는 옵션이 있습니다. 해당 상품을 삭제하거나 다른 옵션으로 다시 담은 뒤 결제해 주세요."}</p>}
            <div className="cart-layout mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                <section>
                    {/* 전체선택 / 선택삭제 바 */}
                    <div className="cart-selectbar mb-3 flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 ring-1 ring-neutral-200 backdrop-blur">
                        {/* label 은 클릭을 내부 버튼으로 전달하므로 토글은 CheckBtn(onToggle) 한 곳에만.
                            (label 자체에 onClick 을 두면 전달 클릭까지 두 번 발화 → 토글이 즉시 되돌아가는 버그) */}
                        <label className="flex cursor-pointer items-center gap-2.5">
                            <CheckBtn checked={allSelected} onToggle={() => cart.setAllSelected(!allSelected)} label={t("selectedAll")} />
                            <span className="text-sm font-black text-neutral-800">
                                {t("selectedAll")} <span className="text-indigo-600">{selectedLines.length}</span>
                                <span className="text-neutral-400">/{lines.length}</span>
                            </span>
                        </label>
                        <button
                            type="button"
                            onClick={removeSelected}
                            disabled={selectedLines.length === 0}
                            className="cart-delsel text-xs font-black text-neutral-500 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <i className="fa-solid fa-trash-can mr-1 text-[10px]" />
                            {t("deleteSelected")}
                        </button>
                    </div>

                    <div className="cart-lines grid gap-3">
                        {lines.map(({ product, qty, subtotal, color, size, image, selected, petAssignment, purchaseState, selectionBlocked }) => (
                            <article key={`${product.id}-${color ?? ""}-${size ?? ""}`} data-selected={selected ? "" : undefined} className="cart-line surface relative flex gap-3.5 p-4">
                                {/* 결제 대상 체크 */}
                                <CheckBtn
                                    checked={selected}
                                    disabled={!purchaseState.purchasable}
                                    onToggle={() => cart.setSelected(product.id, !selected, color, size)}
                                    label={`${productName(product)} ${locale === "en" ? "select" : "선택"}`}
                                />

                                {/* 썸네일 */}
                                <Link
                                    href={productHref(product)}
                                    className="cart-thumb relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-neutral-100 bg-[#f7f2e8] md:h-28 md:w-28"
                                >
                                    {image ? (
                                        <Image src={image} alt={productName(product)} fill sizes="112px" className="object-cover" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-3xl text-white">
                                            <i className={`fa-solid ${product.icon}`} />
                                        </div>
                                    )}
                                </Link>

                                {/* 정보 — 이름·옵션·도착일·금액·수량 (선택 여부와 무관하게 항상 선명) */}
                                <div className="cart-info min-w-0 flex-1">
                                    {/* 머리 — 브랜드 · 이름 · 옵션(휴대폰 웹에서는 사진 옆) */}
                                    <div className="cart-head">
                                    <p className="cart-brand text-[11px] font-black uppercase tracking-wide text-indigo-600">
                                        {product.brandEn || product.brandKo}
                                    </p>
                                    <Link
                                        href={productHref(product)}
                                        className="cart-name mt-0.5 block pr-12 text-sm font-black leading-5 text-neutral-950 md:text-[15px]"
                                    >
                                        {productName(product)}
                                    </Link>
                                    {(color || size) && (
                                        <p className="cart-option mt-1 text-xs font-bold text-neutral-500">
                                            {t("option")}: {[color, size].filter(Boolean).join(", ")}
                                        </p>
                                    )}
                                    </div>
                                    {/* 배송 안내 묶음(휴대폰 웹에서는 카드 전체 폭) */}
                                    <div className="cart-meta">
                                    {/* 도착 예정일 — 1~2영업일 출고 기준 */}
                                    <p className="cart-arrival mt-1.5 text-xs font-black text-emerald-600">
                                        <i className="fa-solid fa-truck-fast mr-1 text-[10px]" />
                                        {purchaseState.purchasable && !purchaseState.supplierRequest ? arrival : purchaseStateLabel(purchaseState, locale)}
                                    </p>
                                    {purchaseState.supplierRequest && <p className="mt-1 text-xs font-bold text-amber-800">{locale === "en" ? "Dispatch timing will be confirmed after the supplier request." : "본사 요청 후 발송 일정을 확인해 안내합니다."}</p>}
                                    {purchaseState.sourceDate && <p className="mt-1 text-[11px] text-neutral-500">{locale === "en" ? "Inventory sheet dated" : "재고표 기준일"}: {purchaseState.sourceDate}</p>}
                                    {selectionBlocked && <button type="button" onClick={() => cart.setSelected(product.id, false, color, size)} className="cart-blocked mt-2 text-xs font-black text-indigo-700 underline">{locale === "en" ? "Keep this item but exclude it from checkout" : "장바구니에 보관하고 결제에서 제외"}</button>}
                                    </div>
                                    <div className="cart-pet mt-2.5 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2">
                                        <label className="block">
                                            <span className="mb-1 block text-[11px] font-black text-indigo-700">
                                                {t("whoFor")}
                                            </span>
                                            {hasPets ? (
                                                <select
                                                    value={petAssignment?.petKey || ""}
                                                    onChange={(event) => {
                                                        const option = petOptions.find((item) => item.value === event.target.value);
                                                        cart.setLinePet(product.id, option?.assignment, color, size);
                                                    }}
                                                    className="cart-pet-select h-9 w-full rounded-md border border-indigo-100 bg-white px-2.5 text-xs font-bold text-neutral-800 outline-none transition focus:border-indigo-500"
                                                    aria-label={`${productName(product)} ${t("choosePet")}`}
                                                >
                                                    <option value="">{t("choosePet")}</option>
                                                    {petOptions.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="text-xs font-bold leading-5 text-indigo-900">
                                                        {t("petProfileBenefit")}
                                                    </p>
                                                    <Link href={user ? "/pet-lens" : "/auth/signup"} className="cart-pet-go rounded-md bg-neutral-950 px-2.5 py-1.5 text-[11px] font-black text-white">
                                                        {t("register")}
                                                    </Link>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                    {/* 가격 · 수량 한 줄(웹) */}
                                    <div className="cart-foot">
                                    <p className="cart-price mt-1.5 text-lg font-black text-neutral-950">
                                        {formatPrice(subtotal)}
                                    </p>
                                    {/* 수량 — 1이면 마이너스 비활성(삭제는 삭제 버튼으로) */}
                                    <div className="cart-qty mt-2.5 inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white">
                                        <button
                                            type="button"
                                            onClick={() => cart.setQty(product.id, qty - 1, color, size)}
                                            disabled={qty <= 1}
                                            className="flex h-full w-9 items-center justify-center text-neutral-600 transition disabled:cursor-not-allowed disabled:opacity-30"
                                            aria-label="수량 감소"
                                        >
                                            <i className="fa-solid fa-minus text-xs" />
                                        </button>
                                        <span className="w-9 text-center text-sm font-black">{qty}</span>
                                        <button
                                            type="button"
                                            onClick={() => cart.setQty(product.id, Math.min(99, qty + 1), color, size)}
                                            disabled={qty >= 99 || !purchaseState.purchasable}
                                            className="flex h-full w-9 items-center justify-center text-neutral-600 transition disabled:cursor-not-allowed disabled:opacity-30"
                                            aria-label="수량 증가"
                                        >
                                            <i className="fa-solid fa-plus text-xs" />
                                        </button>
                                    </div>
                                    </div>
                                </div>

                                {/* 삭제 — 카드 우측 상단(테두리 있는 버튼 형태) */}
                                <button
                                    type="button"
                                    onClick={() => cart.removeFromCart(product.id, color, size)}
                                    className="cart-del absolute right-4 top-4 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-black text-neutral-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                                >
                                    {t("delete")}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>

                {/* 주문 합계 — 선택된 상품 기준 */}
                <aside className="cart-summary surface h-fit p-5">
                    <h2 className="cart-sum-title text-lg font-black text-neutral-950">{t("orderSummary")}</h2>
                    <div className="mt-4 flex items-center justify-between text-sm font-bold text-neutral-600">
                        <span>
                            {t("productAmount")} <span className="text-indigo-600">{countText(selectedLines.length)}</span>
                        </span>
                        <b className="text-neutral-950">{formatPrice(selectedTotal)}</b>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm font-bold text-neutral-600">
                        <span>{locale === "en" ? "Base shipping" : "기본 배송비"}</span>
                        <b className="text-neutral-950">
                            {estimatedBaseShippingFee ? formatPrice(estimatedBaseShippingFee) : (locale === "en" ? "Free" : "무료")}
                        </b>
                    </div>
                    <p className="mt-1 text-right text-[10px] font-bold leading-4 text-neutral-500">
                        {locale === "en"
                            ? "KRW 3,000 under KRW 30,000 · Jeju +3,000 · other islands +5,000"
                            : "3만원 미만 3,000원 · 제주 +3,000원 · 기타 도서 +5,000원"}
                    </p>
                    {/* 웹 전용 — 무료배송까지 남은 금액 막대(배송비 기준 그대로) */}
                    {selectedLines.length > 0 && (
                        <div className={`hidden cart-free ${estimatedBaseShippingFee ? "" : "is-done"}`}>
                            <p>
                                {estimatedBaseShippingFee
                                    ? (locale === "en"
                                        ? `${formatPrice(FREE_SHIPPING_THRESHOLD_KRW - selectedTotal)} more for free shipping`
                                        : `${formatPrice(FREE_SHIPPING_THRESHOLD_KRW - selectedTotal)} 더 담으면 무료배송`)
                                    : (locale === "en" ? "Free shipping applied" : "무료배송이에요")}
                            </p>
                            <span className="cart-free-bar" aria-hidden="true">
                                <i style={{ width: `${Math.min(100, Math.round((selectedTotal / FREE_SHIPPING_THRESHOLD_KRW) * 100))}%` }} />
                            </span>
                        </div>
                    )}
                    {selectedLines.length > 0 && (
                        <div
                            className="cart-coin mt-4 rounded-xl border border-indigo-100 bg-indigo-50/80 px-3.5 py-3"
                            data-daenglab-coin-estimate={expectedDaengLabCoins}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className="inline-flex flex-wrap items-center gap-1.5 text-xs font-black text-indigo-700">
                                    <span>{locale === "en" ? "Member" : "회원"}</span>
                                    <DaengLabCoinMark en={locale === "en"} compact />
                                    <span>{locale === "en" ? "estimate" : "적립 예상"}</span>
                                </span>
                                <b className="text-base font-black text-indigo-800">{expectedDaengLabCoins}C</b>
                            </div>
                            <p className="mt-1.5 text-[11px] font-bold leading-4 text-indigo-500">
                                {locale === "en"
                                    ? "Payment verification + purchase confirmation required · 10C per analysis"
                                    : "결제 확인 + 구매확정 후 적립 · 행동·소리 분석 1회당 10C"}
                            </p>
                        </div>
                    )}
                    <div className="cart-total mt-4 border-t border-neutral-200 pt-4 flex items-center justify-between">
                        <span className="font-black">{t("paymentDue")}</span>
                        <b className="text-2xl font-black text-indigo-700">{formatPrice(selectedTotal + estimatedBaseShippingFee)}</b>
                    </div>
                    <p data-checkout-contract="test-only" className="cart-test mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-xs font-bold leading-5 text-sky-900">
                        {locale === "en"
                            ? "The current checkout supports test payments only. No real charge, shipment, or rewards will be issued."
                            : "현재 주문서는 테스트 결제 전용입니다. 실제 출금·상품 배송·적립금 지급은 진행되지 않습니다."}
                    </p>
                    <button
                        type="button"
                        onClick={() => goCheckout("card")}
                        disabled={selectedLines.length === 0 || inventoryBlocked}
                        className="cart-go btn btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {selectedLines.length === 0
                            ? t("selectProducts")
                            : `${locale === "en" ? "Test checkout" : "테스트 주문서"} (${countText(selectedLines.length)})`}
                    </button>
                    {/* 빠른 결제수단 — 선택값을 주문서까지 보존 */}
                    <SimplePayButtons disabled={selectedLines.length === 0 || inventoryBlocked} onSelect={goCheckout} />
                </aside>
            </div>
        </main>
    );
}
