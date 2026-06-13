"use client";

import Link from "next/link";
import { formatKRW } from "@/lib/catalog";
import { cartProducts, findProduct } from "@/lib/shop";
import { useAuth, useStore } from "@/lib/store";
import ProductCard from "@/components/products/ProductCard";

export default function MyPage() {
    const { user, logout } = useAuth();
    const store = useStore();
    const wishedProducts = store.state.wishlist.map(findProduct).filter(Boolean);

    if (!user) {
        return (
            <main className="mx-auto max-w-[720px] px-4 py-14 text-center">
                <i className="fa-regular fa-user text-4xl text-neutral-300" />
                <h1 className="mt-4 text-2xl font-black text-neutral-950">로그인이 필요합니다.</h1>
                <div className="mt-6 flex justify-center gap-2">
                    <Link href="/auth/login" className="btn btn-primary">로그인</Link>
                    <Link href="/auth/signup" className="btn btn-secondary">회원가입</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-indigo-700">마이페이지</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">{user.name}님</h1>
                    <p className="mt-1 text-sm font-bold text-neutral-600">{user.email}</p>
                </div>
                <button type="button" onClick={logout} className="btn btn-secondary">
                    로그아웃
                </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
                <section className="grid gap-4">
                    <div className="surface p-5">
                        <h2 className="text-lg font-black text-neutral-950">반려견 프로필</h2>
                        {user.pets.length > 0 ? (
                            <div className="mt-4 grid gap-3">
                                {user.pets.map((pet) => (
                                    <article key={`${pet.name}-${pet.lastAnalyzedAt}`} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                                        <h3 className="font-black text-neutral-950">{pet.name}</h3>
                                        <p className="mt-1 text-sm font-bold text-neutral-600">
                                            {pet.size === "small" ? "소형" : pet.size === "large" ? "대형" : "중형"} · {pet.age}
                                        </p>
                                        <p className="mt-2 text-xs font-bold text-neutral-500">{pet.concerns.join(", ")}</p>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-3 text-sm font-bold text-neutral-600">등록된 프로필이 없습니다.</p>
                        )}
                        <Link href="/pet-lens" className="btn btn-primary mt-4 w-full">
                            펫렌즈로 추가
                        </Link>
                    </div>
                </section>

                <section className="grid gap-6">
                    <div className="surface p-5">
                        <h2 className="text-lg font-black text-neutral-950">주문 내역</h2>
                        {store.state.orders.length > 0 ? (
                            <div className="mt-4 grid gap-3">
                                {store.state.orders.map((order) => {
                                    const lines = cartProducts(order.lines);
                                    return (
                                        <article key={order.id} className="rounded-lg border border-neutral-200 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <b className="font-black text-neutral-950">{order.id}</b>
                                                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700">접수</span>
                                            </div>
                                            <div className="mt-3 grid gap-1 text-sm font-bold text-neutral-600">
                                                {lines.map(({ product, qty }) => (
                                                    <span key={product.id}>{product.name} x {qty}</span>
                                                ))}
                                            </div>
                                            <p className="mt-3 text-right text-lg font-black text-neutral-950">{formatKRW(order.total)}원</p>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="mt-3 text-sm font-bold text-neutral-600">아직 주문 내역이 없습니다.</p>
                        )}
                    </div>

                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-black text-neutral-950">찜한 상품</h2>
                            <Link href="/products" className="text-sm font-black text-indigo-700">상품 더보기</Link>
                        </div>
                        {wishedProducts.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                                {wishedProducts.map((product) => product && <ProductCard key={product.id} product={product} />)}
                            </div>
                        ) : (
                            <div className="surface p-6 text-sm font-bold text-neutral-600">찜한 상품이 없습니다.</div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
