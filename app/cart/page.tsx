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
import { formatKRW } from "@/lib/catalog";
import { arrivalDateText, cartProducts, productHref } from "@/lib/shop";
import { useAuth, useCart } from "@/lib/store";
import SimplePayButtons from "@/components/shop/SimplePayButtons";

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
    const lines = cartProducts(cart.lines);

    // 선택된 라인만 합계·결제 대상
    const selectedLines = lines.filter((l) => l.selected);
    const selectedTotal = selectedLines.reduce((sum, l) => sum + l.subtotal, 0);
    const allSelected = lines.length > 0 && selectedLines.length === lines.length;
    const arrival = arrivalDateText();

    // 결제하기 — 로그인 회원은 바로 결제, 비로그인은 로그인 화면(비회원 주문도 선택 가능)으로
    const goCheckout = () => {
        if (selectedLines.length === 0) return;
        router.push(user ? "/checkout" : "/auth/login?redirect=/checkout");
    };

    // 선택삭제 — 체크된 라인 일괄 삭제(실수 방지 confirm)
    const removeSelected = () => {
        if (selectedLines.length === 0) return;
        if (!window.confirm(`선택한 ${selectedLines.length}개 상품을 삭제할까요?`)) return;
        selectedLines.forEach((l) => cart.removeFromCart(l.product.id, l.color, l.size));
    };

    if (lines.length === 0) {
        return (
            <main className="mx-auto max-w-[760px] px-4 py-14 text-center">
                <i className="fa-solid fa-bag-shopping text-4xl text-neutral-300" />
                <h1 className="mt-4 text-2xl font-black text-neutral-950">장바구니가 비어 있습니다.</h1>
                <Link href="/products" className="btn btn-primary mt-6">
                    상품 보러가기
                </Link>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <h1 className="text-3xl font-black tracking-tight text-neutral-950">장바구니</h1>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                <section>
                    {/* 전체선택 / 선택삭제 바 */}
                    <div className="mb-3 flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 ring-1 ring-neutral-200 backdrop-blur">
                        {/* label 은 클릭을 내부 버튼으로 전달하므로 토글은 CheckBtn(onToggle) 한 곳에만.
                            (label 자체에 onClick 을 두면 전달 클릭까지 두 번 발화 → 토글이 즉시 되돌아가는 버그) */}
                        <label className="flex cursor-pointer items-center gap-2.5">
                            <CheckBtn checked={allSelected} onToggle={() => cart.setAllSelected(!allSelected)} label="전체선택" />
                            <span className="text-sm font-black text-neutral-800">
                                전체선택 <span className="text-indigo-600">{selectedLines.length}</span>
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
                            선택삭제
                        </button>
                    </div>

                    <div className="grid gap-3">
                        {lines.map(({ product, qty, subtotal, color, size, image, selected }) => (
                            <article key={`${product.id}-${color ?? ""}-${size ?? ""}`} className="surface relative flex gap-3.5 p-4">
                                {/* 결제 대상 체크 */}
                                <CheckBtn
                                    checked={selected}
                                    onToggle={() => cart.setSelected(product.id, !selected, color, size)}
                                    label={`${product.name} 선택`}
                                />

                                {/* 썸네일 */}
                                <Link
                                    href={productHref(product)}
                                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-neutral-100 bg-[#f7f2e8] md:h-28 md:w-28"
                                >
                                    {image ? (
                                        <Image src={image} alt={product.name} fill sizes="112px" className="object-cover" />
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
                                        {product.name}
                                    </Link>
                                    {(color || size) && (
                                        <p className="mt-1 text-xs font-bold text-neutral-500">
                                            옵션: {[color, size].filter(Boolean).join(", ")}
                                        </p>
                                    )}
                                    {/* 도착 예정일 — 무료배송 1~2일 출고 기준 */}
                                    <p className="mt-1.5 text-xs font-black text-emerald-600">
                                        <i className="fa-solid fa-truck-fast mr-1 text-[10px]" />
                                        {arrival}
                                    </p>
                                    <p className="mt-1.5 text-lg font-black text-neutral-950">
                                        {formatKRW(subtotal)}
                                        <span className="text-sm">원</span>
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
                                    삭제
                                </button>
                            </article>
                        ))}
                    </div>
                </section>

                {/* 주문 합계 — 선택된 상품 기준 */}
                <aside className="surface h-fit p-5">
                    <h2 className="text-lg font-black text-neutral-950">주문 합계</h2>
                    <div className="mt-4 flex items-center justify-between text-sm font-bold text-neutral-600">
                        <span>
                            상품 금액 <span className="text-indigo-600">{selectedLines.length}개</span>
                        </span>
                        <b className="text-neutral-950">{formatKRW(selectedTotal)}원</b>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm font-bold text-neutral-600">
                        <span>배송비</span>
                        <b className="text-neutral-950">0원</b>
                    </div>
                    <div className="mt-4 border-t border-neutral-200 pt-4 flex items-center justify-between">
                        <span className="font-black">결제 예정</span>
                        <b className="text-2xl font-black text-indigo-700">{formatKRW(selectedTotal)}원</b>
                    </div>
                    <button
                        type="button"
                        onClick={goCheckout}
                        disabled={selectedLines.length === 0}
                        className="btn btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {selectedLines.length === 0 ? "상품을 선택하세요" : `결제하기 (${selectedLines.length}개)`}
                    </button>
                    {/* 간편결제 — 네이버페이·카카오페이 */}
                    <SimplePayButtons disabled={selectedLines.length === 0} />
                </aside>
            </div>
        </main>
    );
}
