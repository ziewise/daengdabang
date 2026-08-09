"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { CATALOG, SUBCATEGORY_LABEL, formatKRW, type CatalogProduct } from "@/lib/catalog";
import { cartProducts, findProduct, productHref } from "@/lib/shop";
import { hasVerifiedPetPhoto, useAuth, useStore, type PetProfile } from "@/lib/store";
import { memberAccountDisplay } from "@/lib/member-account-display";
import ProductCard from "@/components/products/ProductCard";
import MemberPetProfileEditor from "@/components/mypage/MemberPetProfileEditor";
import MemberPetProfileCreateForm from "@/components/mypage/MemberPetProfileCreateForm";
import DaengLabWalletCard from "@/components/mypage/DaengLabWalletCard";
import MypageSidebar from "@/components/mypage/MypageSidebar";
import {
    hasPetLensReadyProfile,
    PETLENS_PAGE_HREF,
    petLensProfileNeedsAttention,
} from "@/lib/petlens-routing";

const TRY_ON_SUBCATEGORIES = new Set(["harness", "leash", "wear", "goggles"]);
const TRY_ON_PRODUCTS = CATALOG.filter((product) => TRY_ON_SUBCATEGORIES.has(product.subcategory) && product.image).slice(0, 8);
const subscribeToProfileRoute = () => () => {};
const getServerProfileRoute = () => false;
const getClientProfileRoute = () => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("petProfile") === "required";
};

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

function sexLabel(sex: PetProfile["sex"]) {
    if (sex === "female") return "암컷";
    if (sex === "male") return "수컷";
    return "성별 미입력";
}

function petKey(pet: PetProfile, index: number) {
    return pet.apiProfileId
        ? `pet-profile-id-${pet.apiProfileId}`
        : `pet-profile-local-${index}-${pet.name}`;
}

function firstTryOnProduct(): CatalogProduct | undefined {
    return TRY_ON_PRODUCTS[0];
}

export default function MyPage() {
    const { user } = useAuth();
    const store = useStore();
    const profileRouteRequested = useSyncExternalStore(
        subscribeToProfileRoute,
        getClientProfileRoute,
        getServerProfileRoute
    );
    const wishedProducts = store.state.wishlist.map(findProduct).filter(Boolean);
    const hasTryOnProfile = Boolean(user?.pets.some(hasVerifiedPetPhoto));
    const petLensReady = Boolean(user && hasPetLensReadyProfile(user.pets));
    const profileNeedingAttentionIndex = user?.pets.findIndex(petLensProfileNeedsAttention) ?? -1;
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
            <div className="grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                <MypageSidebar />
                <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-indigo-700">마이페이지</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">{user.name}님</h1>
                    <p className="mt-1 text-sm font-bold text-neutral-600">
                        {memberAccountDisplay(user.email, user.authProvider)}
                    </p>
                </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
                <section className="grid gap-4">
                    <DaengLabWalletCard accessToken={user.apiAccessToken} accountEmail={user.email} />
                    <div id="pet-profiles" className="surface scroll-mt-24 p-5">
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
                                {user.pets.map((pet, index) => (
                                    <article key={petKey(pet, index)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                                        <div className="grid grid-cols-[76px_1fr] gap-3">
                                            <div className="relative h-[76px] overflow-hidden rounded-md bg-white">
                                                {hasVerifiedPetPhoto(pet) ? (
                                                    <img src={pet.photoDataUrl} alt={`${pet.name} 사진`} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="grid h-full place-items-center text-neutral-300">
                                                        <i className="fa-solid fa-camera text-xl" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-neutral-950">{pet.name}</h3>
                                                {pet.breed && <p className="mt-1 text-sm font-black text-indigo-700">{pet.breed}</p>}
                                                <p className="mt-1 text-sm font-bold text-neutral-600">
                                                    {sizeLabel(pet.size)} · {pet.age} · {coatLabel(pet.coat)}
                                                </p>
                                                <p className="mt-1 text-xs font-bold text-neutral-500">
                                                    {pet.weightKg !== undefined ? `${pet.weightKg}kg` : "체중 미입력"} · {sexLabel(pet.sex)}
                                                </p>
                                                <p className="mt-1 text-xs font-bold text-neutral-500">
                                                    {pet.coatColor ? `${pet.coatColor} · ` : ""}{activityLabel(pet.activity)}
                                                </p>
                                                {hasVerifiedPetPhoto(pet) ? (
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
                                        <MemberPetProfileEditor
                                            key={`${petKey(pet, index)}-${profileRouteRequested && index === profileNeedingAttentionIndex ? "required" : "default"}`}
                                            pet={pet}
                                            initiallyOpen={profileRouteRequested && index === profileNeedingAttentionIndex}
                                        />
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm font-bold leading-6 text-neutral-600">
                                먼저 우리 아이 이름과 실제 견종을 등록해 주세요. 저장이 끝나면 펫렌즈 사진 분석과 댕다방 연구소 행동·소리 분석을 바로 시작할 수 있습니다.
                            </div>
                        )}
                        <MemberPetProfileCreateForm
                            key={profileRouteRequested ? "required" : "default"}
                            initiallyOpen={profileRouteRequested}
                        />
                        {petLensReady ? (
                            <Link href={PETLENS_PAGE_HREF} className="btn btn-primary mt-4 w-full">
                                펫렌즈 사진 분석 열기
                            </Link>
                        ) : user.pets.length > 0 ? (
                            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-black leading-5 text-amber-800">
                                위 프로필의 ‘정보 수정’에서 서버 등록과 실제 견종 확인을 마치면 펫렌즈 버튼이 열립니다.
                            </p>
                        ) : null}
                        {heroTryOnProduct && hasTryOnProfile && (
                            <Link href={productHref(heroTryOnProduct)} className="btn btn-secondary mt-2 w-full">
                                자동 피팅 상품 보기
                            </Link>
                        )}
                    </div>
                </section>

                <section className="grid gap-6">
                    <div className="surface p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-black text-neutral-950">최근 결제</h2>
                                <p className="mt-1 text-xs font-bold text-neutral-500">이 브라우저에서 완료한 결제만 빠르게 보여줍니다.</p>
                            </div>
                            <Link href="/mypage/orders/" className="text-sm font-black text-indigo-700 hover:underline">
                                전체 주문 보기 <i className="fa-solid fa-chevron-right ml-1 text-[10px]" aria-hidden="true" />
                            </Link>
                        </div>
                        {store.state.orders.length > 0 ? (
                            <div className="mt-4 grid gap-3">
                                {store.state.orders.map((order) => {
                                    const lines = cartProducts(order.lines);
                                    return (
                                        <article key={order.id} className="rounded-lg border border-neutral-200 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <Link
                                                    href={`/mypage/orders/?orderId=${encodeURIComponent(order.id)}`}
                                                    className="break-all font-black text-neutral-950 hover:text-indigo-700 hover:underline"
                                                >
                                                    {order.id}
                                                </Link>
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-black ${
                                                        order.status === "test_paid"
                                                            ? "bg-sky-50 text-sky-700"
                                                            : "bg-indigo-50 text-indigo-700"
                                                    }`}
                                                    data-order-status={order.status}
                                                >
                                                    {order.status === "test_paid" ? "테스트 결제완료 · 배송 없음" : "접수"}
                                                </span>
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
                            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                                전체 주문과 배송 상태는 서버 기준 <Link href="/mypage/orders/" className="font-black text-indigo-700 hover:underline">주문 내역</Link>에서 확인해 주세요.
                            </p>
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
                </div>
            </div>
        </main>
    );
}
