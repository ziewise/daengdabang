"use client";

import Link from "next/link";
import { CATALOG, SUBCATEGORY_LABEL, formatKRW, type CatalogProduct } from "@/lib/catalog";
import { cartProducts, findProduct, productHref } from "@/lib/shop";
import { useAuth, useStore, type PetProfile } from "@/lib/store";
import ProductCard from "@/components/products/ProductCard";

const TRY_ON_SUBCATEGORIES = new Set(["harness", "leash", "wear", "goggles"]);
const TRY_ON_PRODUCTS = CATALOG.filter((product) => TRY_ON_SUBCATEGORIES.has(product.subcategory) && product.image).slice(0, 8);

function sizeLabel(size: PetProfile["size"]) {
    if (size === "small") return "소형";
    if (size === "large") return "대형";
    return "중형";
}

function coatLabel(coat: PetProfile["coat"]) {
    if (coat === "short") return "단모";
    if (coat === "long") return "장모";
    return "중모";
}

function activityLabel(activity: PetProfile["activity"]) {
    if (activity === "low") return "차분한 편";
    if (activity === "high") return "활동량 많음";
    return "보통 활동량";
}

function petKey(pet: PetProfile) {
    return `${pet.name}-${pet.lastAnalyzedAt ?? pet.photoDataUrl?.length ?? "profile"}`;
}

function firstTryOnProduct(): CatalogProduct | undefined {
    return TRY_ON_PRODUCTS[0];
}

export default function MyPage() {
    const { user, logout } = useAuth();
    const store = useStore();
    const wishedProducts = store.state.wishlist.map(findProduct).filter(Boolean);
    const hasTryOnProfile = Boolean(user?.pets.some((pet) => pet.photoDataUrl));
    const heroTryOnProduct = firstTryOnProduct();

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
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-lg font-black text-neutral-950">반려견 프로필</h2>
                            {hasTryOnProfile && (
                                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700">
                                    자동 피팅 준비
                                </span>
                            )}
                        </div>
                        {user.pets.length > 0 ? (
                            <div className="mt-4 grid gap-3">
                                {user.pets.map((pet) => (
                                    <article key={petKey(pet)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                                        <div className="grid grid-cols-[76px_1fr] gap-3">
                                            <div className="relative h-[76px] overflow-hidden rounded-md bg-white">
                                                {pet.photoDataUrl ? (
                                                    <img src={pet.photoDataUrl} alt={`${pet.name} 사진`} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="grid h-full place-items-center text-neutral-300">
                                                        <i className="fa-solid fa-camera text-xl" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-neutral-950">{pet.name}</h3>
                                                <p className="mt-1 text-sm font-bold text-neutral-600">
                                                    {sizeLabel(pet.size)} · {pet.age} · {coatLabel(pet.coat)}
                                                </p>
                                                <p className="mt-1 text-xs font-bold text-neutral-500">{activityLabel(pet.activity)}</p>
                                                {pet.photoDataUrl ? (
                                                    <p className="mt-2 text-xs font-black text-indigo-700">착용 상품 자동 피팅 가능</p>
                                                ) : (
                                                    <p className="mt-2 text-xs font-black text-neutral-500">사진을 올리면 자동 피팅이 켜집니다</p>
                                                )}
                                            </div>
                                        </div>
                                        {pet.concerns.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {pet.concerns.slice(0, 4).map((concern) => (
                                                    <span key={concern} className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-neutral-600">
                                                        {concern}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm font-bold leading-6 text-neutral-600">
                                펫렌즈에서 사진과 생활 정보를 등록하면 챗봇 추천, 자동 피팅, 상품 비교가 같은 프로필을 기준으로 이어집니다.
                            </div>
                        )}
                        <Link href="/pet-lens" className="btn btn-primary mt-4 w-full">
                            {user.pets.length > 0 ? "펫렌즈 업데이트" : "펫렌즈로 추가"}
                        </Link>
                        {heroTryOnProduct && hasTryOnProfile && (
                            <Link href={productHref(heroTryOnProduct)} className="btn btn-secondary mt-2 w-full">
                                자동 피팅 상품 보기
                            </Link>
                        )}
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
                                                {lines.map(({ product, qty, color, size }) => (
                                                    <span key={`${product.id}-${color ?? ""}-${size ?? ""}`}>
                                                        {product.name}
                                                        {color && <span className="text-neutral-400"> · {color}</span>}
                                                        {size && <span className="text-neutral-400"> · {size}</span>} x {qty}
                                                    </span>
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

                    {hasTryOnProfile && (
                        <div>
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black text-indigo-700">PetLens Fit</p>
                                    <h2 className="text-lg font-black text-neutral-950">바로 입혀볼 상품</h2>
                                </div>
                                <Link href="/category/outdoor" className="text-sm font-black text-indigo-700">산책용품 보기</Link>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                {TRY_ON_PRODUCTS.slice(0, 4).map((product) => (
                                    <Link
                                        key={product.id}
                                        href={productHref(product)}
                                        className="group rounded-lg border border-neutral-200 bg-white p-3 hover:border-indigo-300"
                                    >
                                        <div className="aspect-square overflow-hidden rounded-md bg-neutral-50">
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} className="h-full w-full object-contain p-3 transition group-hover:scale-105" />
                                            ) : (
                                                <div className="grid h-full place-items-center text-neutral-300">
                                                    <i className="fa-solid fa-shirt text-2xl" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="mt-3 line-clamp-2 text-sm font-black text-neutral-950">{product.name}</p>
                                        <p className="mt-1 text-xs font-bold text-neutral-500">{SUBCATEGORY_LABEL[product.subcategory]}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

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
