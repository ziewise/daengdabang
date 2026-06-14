import type { Metadata } from "next";
import { CATALOG, getBestProducts, getNewProducts } from "@/lib/catalog";
import { productHref, versionProductImage } from "@/lib/shop";

export const metadata: Metadata = {
    title: "댕다방 시작하기 | 펫렌즈와 반려견 상품 추천",
    description: "펫렌즈로 우리 아이 프로필을 만들고 산책, 먹거리, 생활, 놀이, 케어 상품을 바로 비교하세요.",
    alternates: { canonical: "/campaign/sns-launch" },
    openGraph: {
        title: "댕다방 시작하기",
        description: "펫렌즈와 챗봇으로 우리 아이에게 맞는 반려견 상품을 고르세요.",
        url: "/campaign/sns-launch",
        images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "댕다방" }],
    },
    twitter: {
        card: "summary",
        title: "댕다방 시작하기",
        description: "펫렌즈와 챗봇으로 우리 아이에게 맞는 반려견 상품을 고르세요.",
        images: ["/images/logo.png"],
    },
};

const fitProduct = CATALOG.find((product) => ["harness", "wear", "goggles"].includes(product.subcategory) && product.image);
const products = [
    ...(fitProduct ? [fitProduct] : []),
    ...getBestProducts(4),
    ...getNewProducts(4),
]
    .filter((product, index, list) => product.image && list.findIndex((item) => item.id === product.id) === index)
    .slice(0, 6);

export default function SnsLaunchCampaignPage() {
    return (
        <main>
            <section className="border-b border-neutral-200 bg-white">
                <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 md:grid-cols-[1fr_0.9fr] md:px-6">
                    <div className="flex flex-col justify-center">
                        <p className="text-sm font-black text-indigo-700">PetLens Shopping</p>
                        <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-neutral-950 md:text-5xl">
                            우리 아이에게 맞는 상품을 먼저 골라보세요
                        </h1>
                        <p className="mt-4 max-w-xl text-base font-bold leading-7 text-neutral-600">
                            사진과 생활 정보를 넣으면 펫렌즈, 챗봇, 자동 피팅이 같은 프로필을 기준으로 이어집니다.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2">
                            <a href="/auth/signup?utm_source=social&utm_medium=profile&utm_campaign=sns_launch" className="btn btn-primary">
                                <i className="fa-solid fa-user-plus text-xs" />
                                프로필 만들기
                            </a>
                            <a href="/pet-lens?utm_source=social&utm_medium=profile&utm_campaign=sns_launch" className="btn btn-secondary">
                                <i className="fa-solid fa-camera text-xs" />
                                펫렌즈 보기
                            </a>
                            <a href="/products?utm_source=social&utm_medium=profile&utm_campaign=sns_launch" className="btn btn-secondary">
                                전체상품
                            </a>
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {products.slice(0, 4).map((product) => (
                            <a key={product.id} href={`${productHref(product)}?utm_source=social&utm_medium=profile&utm_campaign=sns_launch`} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                                <div className="aspect-square overflow-hidden rounded-md bg-white">
                                    <img src={versionProductImage(product.image)} alt={product.name} className="h-full w-full object-contain p-3" />
                                </div>
                                <p className="mt-3 line-clamp-2 text-sm font-black text-neutral-950">{product.name}</p>
                                <p className="mt-1 text-xs font-bold text-neutral-500">{product.priceText}</p>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto grid max-w-[1280px] gap-4 px-4 py-8 md:grid-cols-3 md:px-6">
                {[
                    ["1", "사진으로 시작", "회원가입에서 반려견 사진과 기본 정보를 저장합니다."],
                    ["2", "추천으로 비교", "펫렌즈와 챗봇이 상품 후보를 좁혀줍니다."],
                    ["3", "상세에서 확인", "착용 상품은 상세페이지에서 자동 피팅 미리보기까지 이어집니다."],
                ].map(([step, title, body]) => (
                    <article key={step} className="rounded-lg border border-neutral-200 bg-white p-5">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-600 text-sm font-black text-white">{step}</span>
                        <h2 className="mt-4 text-lg font-black text-neutral-950">{title}</h2>
                        <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">{body}</p>
                    </article>
                ))}
            </section>
        </main>
    );
}
