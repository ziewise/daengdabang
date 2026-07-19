"use client";

/**
 * CartPage — 장바구니 (선택 결제 지원)
 * ---------------------------------------------------------------------
 * - 라인별 체크박스 + 전체선택/선택삭제 바: 체크된 상품만 결제로 넘어간다.
 * - 각 상품에 도착 예정일(무료배송 1~2일 출고 기준) 표시.
 * - 수량 1일 때 마이너스 비활성(0으로 못 내림 — 삭제는 삭제 버튼으로만).
 * - 합계/결제 버튼은 "선택된" 상품 기준. 미선택 상품은 카드가 흐려진다.
 * - 결제하기: 로그인 회원은 바로, 비로그인은 로그인 화면(비회원 주문 선택 가능)으로.
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

/* 커스텀 체크박스 — 인디고 채움 + 체크 아이콘 */
function CheckBtn({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={label}
            onClick={onToggle}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                checked
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-neutral-300 bg-white text-transparent hover:border-indigo-400"
            }`}
        >
            <i className="fa-solid fa-check text-[10px]" />
        </button>
    );
}

export default function CartPage() {
    const router = useRouter();
    const cart = useCart();
    const { user } = useAuth();
    const { pets: profilePets } = usePets();
    const { t, locale, formatPrice, productName } = useI18n();
    const lines = cartProducts(cart.lines);
    const petOptions = cartPetOptions(user?.pets ?? [], profilePets);
    const hasPets = petOptions.length > 0;

    // 선택된 라인만 합계·결제 대상
    const selectedLines = lines.filter((l) => l.selected);
    const selectedTotal = selectedLines.reduce((sum, l) => sum + l.subtotal, 0);
    const expectedDaengLabCoins = daengLabCoinsForLines(selectedLines);
    const allSelected = lines.length > 0 && selectedLines.length === lines.length;
    const arrival = arrivalDateText(locale);
    const countText = (count: number) => locale === "en" ? `${count} ${t("countSuffix")}` : `${count}${t("countSuffix")}`;

    // 결제하기 — 로그인 회원은 바로 결제, 비로그인은 로그인 화면(비회원 주문도 선택 가능)으로
    const goCheckout = (preferredPayment: "card" | QuickPaymentMethod = "card") => {
        if (selectedLines.length === 0) return;
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
            <main className="mx-auto max-w-[760px] px-4 py-14 text-center">
                <i className="fa-solid fa-bag-shopping text-4xl text-neutral-300" />
                <h1 className="mt-4 text-2xl font-black text-neutral-950">{t("emptyCart")}</h1>
                <Link href="/products" className="btn btn-primary mt-6">
                    {t("shopNow")}
                </Link>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <h1 className="text-3xl font-black tracking-tight text-neutral-950">{t("cart")}</h1>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                <section>
                    {/* 전체선택 / 선택삭제 바 */}
                    <div className="mb-3 flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 ring-1 ring-neutral-200 backdrop-blur">
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
                            className="text-xs font-black text-neutral-500 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <i className="fa-solid fa-trash-can mr-1 text-[10px]" />
                            {t("deleteSelected")}
                        </button>
                    </div>

                    <div className="grid gap-3">
                        {lines.map(({ product, qty, subtotal, color, size, image, selected, petAssignment }) => (
                            <article key={`${product.id}-${color ?? ""}-${size ?? ""}`} className="surface relative flex gap-3.5 p-4">
                                {/* 결제 대상 체크 */}
                                <CheckBtn
                                    checked={selected}
                                    onToggle={() => cart.setSelected(product.id, !selected, color, size)}
                                    label={`${productName(product)} ${locale === "en" ? "select" : "선택"}`}
                                />

                                {/* 썸네일 */}
                                <Link
                                    href={productHref(product)}
                                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-neutral-100 bg-[#f7f2e8] md:h-28 md:w-28"
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
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-indigo-600">
                                        {product.brandEn || product.brandKo}
                                    </p>
                                    <Link
                                        href={productHref(product)}
                                        className="mt-0.5 block pr-12 text-sm font-black leading-5 text-neutral-950 md:text-[15px]"
                                    >
                                        {productName(product)}
                                    </Link>
                                    {(color || size) && (
                                        <p className="mt-1 text-xs font-bold text-neutral-500">
                                            {t("option")}: {[color, size].filter(Boolean).join(", ")}
                                        </p>
                                    )}
                                    {/* 도착 예정일 — 무료배송 1~2일 출고 기준 */}
                                    <p className="mt-1.5 text-xs font-black text-emerald-600">
                                        <i className="fa-solid fa-truck-fast mr-1 text-[10px]" />
                                        {arrival}
                                    </p>
                                    <div className="mt-2.5 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2">
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
                                                    className="h-9 w-full rounded-md border border-indigo-100 bg-white px-2.5 text-xs font-bold text-neutral-800 outline-none transition focus:border-indigo-500"
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
                                                    <Link href={user ? "/pet-lens" : "/auth/signup"} className="rounded-md bg-neutral-950 px-2.5 py-1.5 text-[11px] font-black text-white">
                                                        {t("register")}
                                                    </Link>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                    <p className="mt-1.5 text-lg font-black text-neutral-950">
                                        {formatPrice(subtotal)}
                                    </p>
                                    {/* 수량 — 1이면 마이너스 비활성(삭제는 삭제 버튼으로) */}
                                    <div className="mt-2.5 inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white">
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
                                            disabled={qty >= 99}
                                            className="flex h-full w-9 items-center justify-center text-neutral-600 transition disabled:cursor-not-allowed disabled:opacity-30"
                                            aria-label="수량 증가"
                                        >
                                            <i className="fa-solid fa-plus text-xs" />
                                        </button>
                                    </div>
                                </div>

                                {/* 삭제 — 카드 우측 상단(테두리 있는 버튼 형태) */}
                                <button
                                    type="button"
                                    onClick={() => cart.removeFromCart(product.id, color, size)}
                                    className="absolute right-4 top-4 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-black text-neutral-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                                >
                                    {t("delete")}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>

                {/* 주문 합계 — 선택된 상품 기준 */}
                <aside className="surface h-fit p-5">
                    <h2 className="text-lg font-black text-neutral-950">{t("orderSummary")}</h2>
                    <div className="mt-4 flex items-center justify-between text-sm font-bold text-neutral-600">
                        <span>
                            {t("productAmount")} <span className="text-indigo-600">{countText(selectedLines.length)}</span>
                        </span>
                        <b className="text-neutral-950">{formatPrice(selectedTotal)}</b>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm font-bold text-neutral-600">
                        <span>{t("shippingFee")}</span>
                        <b className="text-neutral-950">{formatPrice(0)}</b>
                    </div>
                    {selectedLines.length > 0 && (
                        <div
                            className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/80 px-3.5 py-3"
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
                    <div className="mt-4 border-t border-neutral-200 pt-4 flex items-center justify-between">
                        <span className="font-black">{t("paymentDue")}</span>
                        <b className="text-2xl font-black text-indigo-700">{formatPrice(selectedTotal)}</b>
                    </div>
                    <button
                        type="button"
                        onClick={() => goCheckout("card")}
                        disabled={selectedLines.length === 0}
                        className="btn btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {selectedLines.length === 0
                            ? t("selectProducts")
                            : `${t("checkout")} (${countText(selectedLines.length)})`}
                    </button>
                    {/* 빠른 결제수단 — 선택값을 주문서까지 보존 */}
                    <SimplePayButtons disabled={selectedLines.length === 0} onSelect={goCheckout} />
                </aside>
            </div>
        </main>
    );
}
