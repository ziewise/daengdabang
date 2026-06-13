"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATALOG, getBestProducts, getNewProducts, type CatalogProduct } from "@/lib/catalog";
import { productHref } from "@/lib/shop";

type SocialPost = {
    id: string;
    platform: "Instagram" | "Naver Blog" | "YouTube Shorts";
    title: string;
    angle: string;
    product?: CatalogProduct;
    caption: string;
    ctaHref: string;
    icon: string;
};

const channels = [
    { name: "Instagram", status: "아이디 확정 전", icon: "fa-brands fa-instagram", tone: "짧은 영상, 착용컷, 후기 카드" },
    { name: "Naver Blog", status: "아이디 확정 전", icon: "fa-solid fa-blog", tone: "상세 비교, 사이즈, 관리 팁" },
    { name: "YouTube", status: "아이디 확정 전", icon: "fa-brands fa-youtube", tone: "쇼츠, 사용 장면, 펫렌즈 시리즈" },
];

function absoluteUrl(path: string) {
    return `https://www.daengdabang.com${path}`;
}

function hashtags(product?: CatalogProduct) {
    const tags = ["#댕다방", "#반려견용품", "#강아지용품"];
    if (product?.subcategory === "harness" || product?.subcategory === "leash") tags.push("#강아지산책", "#하네스");
    if (product?.subcategory === "wear") tags.push("#강아지옷", "#펫패션");
    if (product?.subcategory === "goggles") tags.push("#강아지고글", "#눈보호");
    if (product?.category === "food") tags.push("#강아지간식", "#강아지사료");
    return [...new Set(tags)].join(" ");
}

function postCaption(product: CatalogProduct, angle: string) {
    const href = absoluteUrl(productHref(product));
    return [
        `${angle}`,
        "",
        product.name,
        `${product.brandKo || product.brandEn} · ${product.priceText}`,
        "",
        `자세히 보기: ${href}`,
        hashtags(product),
    ].join("\n");
}

function buildPosts(): SocialPost[] {
    const best = getBestProducts(4).filter((product) => product.image);
    const newest = getNewProducts(4).filter((product) => product.image);
    const fit = CATALOG.find((product) => ["harness", "wear", "goggles"].includes(product.subcategory) && product.image);
    const food = CATALOG.find((product) => product.category === "food" && product.image);
    const posts: SocialPost[] = [];

    if (fit) {
        posts.push({
            id: "petlens-fit",
            platform: "Instagram",
            title: "펫렌즈 자동 피팅",
            angle: "사진 한 장으로 착용 상품을 먼저 맞춰보는 흐름",
            product: fit,
            caption: postCaption(fit, "우리 아이 사진으로 먼저 입혀보고 고르는 산책템"),
            ctaHref: productHref(fit),
            icon: "fa-solid fa-camera",
        });
    }

    best.slice(0, 2).forEach((product, index) => {
        posts.push({
            id: `best-${product.id}`,
            platform: index === 0 ? "YouTube Shorts" : "Instagram",
            title: "베스트 상품 쇼츠",
            angle: "짧게 보여주고 상품 상세로 유입",
            product,
            caption: postCaption(product, "댕다방 베스트에서 많이 보는 상품"),
            ctaHref: productHref(product),
            icon: "fa-solid fa-ranking-star",
        });
    });

    newest.slice(0, 2).forEach((product) => {
        posts.push({
            id: `new-${product.id}`,
            platform: "Instagram",
            title: "신상품 피드",
            angle: "신상품 이미지와 핵심 용도를 한 장으로 소개",
            product,
            caption: postCaption(product, "새로 들어온 댕다방 상품"),
            ctaHref: productHref(product),
            icon: "fa-solid fa-sparkles",
        });
    });

    if (food) {
        posts.push({
            id: "blog-food",
            platform: "Naver Blog",
            title: "먹거리 비교 글",
            angle: "성분, 용도, 급여 전 확인 포인트 중심",
            product: food,
            caption: postCaption(food, "먹거리 상품은 급여 전 확인 포인트를 먼저 정리해 주세요"),
            ctaHref: productHref(food),
            icon: "fa-solid fa-pen-nib",
        });
    }

    return posts.slice(0, 6);
}

export default function SocialPageClient() {
    const posts = useMemo(() => buildPosts(), []);
    const [copied, setCopied] = useState("");

    const copy = async (id: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(id);
            window.setTimeout(() => setCopied(""), 1500);
        } catch {
            setCopied("");
        }
    };

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <header className="grid gap-5 border-b border-neutral-200 pb-8 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                    <p className="text-sm font-black text-indigo-700">DaengDaBang Social</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">콘텐츠룸</h1>
                    <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-neutral-600">
                        공식 채널 오픈 전에도 상품, 펫렌즈, 후기 콘텐츠를 바로 게시 가능한 소재로 정리합니다.
                    </p>
                </div>
                <Link href="/products" className="btn btn-primary">
                    <i className="fa-solid fa-table-cells-large text-xs" />
                    상품 고르기
                </Link>
            </header>

            <section className="mt-8 grid gap-3 md:grid-cols-3">
                {channels.map((channel) => (
                    <article key={channel.name} className="rounded-lg border border-neutral-200 bg-white p-4">
                        <div className="flex items-center gap-3">
                            <i className={`${channel.icon} text-xl text-indigo-600`} />
                            <div>
                                <h2 className="font-black text-neutral-950">{channel.name}</h2>
                                <p className="text-xs font-black text-amber-700">{channel.status}</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">{channel.tone}</p>
                    </article>
                ))}
            </section>

            <section className="mt-10">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-black text-indigo-700">Launch Posts</p>
                        <h2 className="text-2xl font-black text-neutral-950">바로 쓸 게시물</h2>
                    </div>
                    <Link href="/pet-lens" className="text-sm font-black text-indigo-700">펫렌즈 보기</Link>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    {posts.map((post) => (
                        <article key={post.id} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-[168px_1fr]">
                            <Link href={post.ctaHref} className="aspect-square overflow-hidden rounded-md bg-neutral-50">
                                {post.product?.image ? (
                                    <img src={post.product.image} alt={post.product.name} className="h-full w-full object-contain p-3" />
                                ) : (
                                    <div className="grid h-full place-items-center text-neutral-300">
                                        <i className={`${post.icon} text-3xl`} />
                                    </div>
                                )}
                            </Link>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700">{post.platform}</span>
                                    <span className="text-xs font-black text-neutral-400">{post.title}</span>
                                </div>
                                <h3 className="mt-3 text-lg font-black text-neutral-950">{post.angle}</h3>
                                {post.product && <p className="mt-1 line-clamp-2 text-sm font-bold text-neutral-600">{post.product.name}</p>}
                                <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-neutral-50 p-3 text-xs font-bold leading-5 text-neutral-600">{post.caption}</pre>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button type="button" onClick={() => copy(post.id, post.caption)} className="btn btn-secondary h-10">
                                        <i className="fa-regular fa-copy text-xs" />
                                        {copied === post.id ? "복사됨" : "캡션 복사"}
                                    </button>
                                    <Link href={post.ctaHref} className="btn btn-primary h-10">
                                        상세 보기
                                    </Link>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
