"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABEL, SUBCATEGORY_LABEL, type CatalogProduct } from "@/lib/catalog";

type SectionKey = "detail" | "review" | "qna";

const SECTIONS: { key: SectionKey; label: string }[] = [
    { key: "detail", label: "상세정보" },
    { key: "review", label: "리뷰" },
    { key: "qna", label: "Q&A" },
];

interface Props {
    product: CatalogProduct;
}

export default function ProductTabs({ product: p }: Props) {
    const [active, setActive] = useState<SectionKey>("detail");
    const reviewBadge = p.externalReviewCount ? p.externalReviewCount.toLocaleString() : undefined;

    return (
        <div className="mt-12 md:mt-16">
            <nav
                className="sticky top-[var(--header-height)] z-20 -mx-4 border-y border-neutral-200 bg-background/95 px-4 backdrop-blur md:-mx-6 md:px-6"
                aria-label="상품 상세 섹션"
            >
                <div className="mx-auto flex max-w-[1280px] gap-1">
                    {SECTIONS.map((section) => (
                        <a
                            key={section.key}
                            href={`#tab-${section.key}`}
                            onClick={() => setActive(section.key)}
                            aria-current={active === section.key}
                            className={`relative px-4 py-4 text-sm font-black transition md:px-6 ${
                                active === section.key ? "text-neutral-950" : "text-neutral-500 hover:text-neutral-800"
                            }`}
                        >
                            {section.label}
                            {section.key === "review" && reviewBadge && (
                                <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                                    {reviewBadge}
                                </span>
                            )}
                            {active === section.key && (
                                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-indigo-600" />
                            )}
                        </a>
                    ))}
                </div>
            </nav>

            <section id="tab-detail" className="scroll-mt-32 pt-10">
                <SectionTitle title="상세정보" />
                <DetailContent product={p} />
            </section>

            <section id="tab-review" className="scroll-mt-32 pt-14">
                <SectionTitle title="리뷰" badge={reviewBadge} />
                <ReviewContent product={p} />
            </section>

            <section id="tab-qna" className="scroll-mt-32 pt-14">
                <SectionTitle title="Q&A" />
                <QnaContent product={p} />
            </section>
        </div>
    );
}

function SectionTitle({ title, badge }: { title: string; badge?: string }) {
    return (
        <header className="mb-5 flex items-baseline gap-2">
            <h2 className="text-xl font-black tracking-tight text-neutral-950 md:text-2xl">{title}</h2>
            {badge && <span className="text-sm font-bold text-neutral-400">{badge}</span>}
        </header>
    );
}

function DetailContent({ product: p }: { product: CatalogProduct }) {
    const [expanded, setExpanded] = useState(false);
    const details = p.details ?? [];

    if (details.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-neutral-200 bg-white p-8 text-center text-sm font-bold text-neutral-500">
                등록된 상세 이미지가 없습니다.
            </div>
        );
    }

    return (
        <div className="relative mx-auto max-w-3xl">
            <div className={`relative overflow-hidden transition-all ${expanded ? "max-h-none" : "max-h-[820px]"}`}>
                <div className="flex flex-col gap-2">
                    {details.map((src, index) => (
                        <Image
                            key={src}
                            src={src}
                            alt={`${p.name} 상세 ${index + 1}`}
                            width={1200}
                            height={1600}
                            sizes="(max-width: 768px) 100vw, 768px"
                            className="h-auto w-full"
                            priority={index === 0}
                        />
                    ))}
                </div>
                {!expanded && (
                    <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
                        style={{ background: "linear-gradient(to top, var(--background) 0%, rgba(255,255,255,0) 100%)" }}
                    />
                )}
            </div>

            <div className="mt-4 flex justify-center">
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="inline-flex h-11 items-center gap-2 rounded-md border border-neutral-200 bg-white px-5 text-sm font-black shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
                >
                    {expanded ? "접기" : "상세정보 더보기"}
                    <i className={`fa-solid ${expanded ? "fa-chevron-up" : "fa-chevron-down"} text-[10px]`} />
                </button>
            </div>
        </div>
    );
}

function getPurchaseGuidePoints(p: CatalogProduct): string[] {
    const subLabel = SUBCATEGORY_LABEL[p.subcategory] ?? "상품";
    const categoryLabel = CATEGORY_LABEL[p.category] ?? "상품";
    const points = [`${subLabel} 특성에 맞춰 ${categoryLabel} 용도와 반려견 생활 패턴을 먼저 확인해 주세요.`];

    if (p.category === "outdoor") {
        points.push(
            p.sizeImage
                ? "상세페이지의 사이즈표를 기준으로 목둘레, 가슴둘레, 착용 여유분을 확인해 주세요."
                : "착용 제품은 체형 차이가 커서 둘레와 조절 범위를 함께 보는 것이 좋습니다.",
            "야간 산책이나 비 오는 날에는 반사 소재, 고정 방식, 방수 여부를 같이 확인해 주세요."
        );
    } else if (p.category === "food") {
        points.push(
            "간식과 사료는 알러지, 급여량, 기존 식단과의 충돌 여부를 먼저 확인해 주세요.",
            "질환, 처방식, 체중 관리 중인 반려견은 수의사 상담 후 급여하는 것이 안전합니다."
        );
    } else if (p.category === "care") {
        points.push(
            "케어 제품은 처음 사용할 때 작은 부위에 먼저 테스트해 주세요.",
            "상처, 염증, 지속적인 가려움이 있으면 제품 사용보다 진료가 우선입니다."
        );
    } else if (p.category === "toy") {
        points.push(
            "장난감은 무는 힘과 삼킴 위험을 기준으로 고르고, 첫 사용은 보호자가 보는 자리에서 진행해 주세요.",
            "손상된 부분이 보이면 삼킴 사고를 막기 위해 바로 교체하거나 사용을 중단해 주세요."
        );
    } else {
        points.push(
            "생활용품은 설치 공간, 청소 방식, 미끄럼 방지 여부를 확인하면 실패 확률을 줄일 수 있습니다.",
            "처음 쓰는 제품은 짧은 시간부터 익숙하게 만들어 주는 편이 좋습니다."
        );
    }

    return points.slice(0, 3);
}

function ReviewContent({ product: p }: { product: CatalogProduct }) {
    const [expanded, setExpanded] = useState(false);
    const snippets = p.externalReviewSnippets ?? [];
    const themes = p.externalReviewThemes ?? [];
    const count = p.externalReviewCount ?? snippets.length;
    const average = typeof p.externalReviewAverage === "number" ? p.externalReviewAverage : null;
    const visibleSnippets = expanded ? snippets : snippets.slice(0, 8);

    if (snippets.length > 0) {
        return (
            <div className="mx-auto max-w-3xl space-y-5">
                <div className="rounded-lg border border-neutral-200 bg-white p-5 md:p-7">
                    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-xs font-black text-indigo-600">구매 후기</p>
                            <h3 className="mt-2 text-lg font-black text-neutral-950">자사몰에서 확인하는 후기 모음</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="rounded-md bg-neutral-50 px-4 py-3">
                                <div className="text-[11px] font-black text-neutral-400">평균</div>
                                <div className="mt-1 text-xl font-black">{average !== null ? average.toFixed(1) : "-"}</div>
                            </div>
                            <div className="rounded-md bg-neutral-50 px-4 py-3">
                                <div className="text-[11px] font-black text-neutral-400">후기</div>
                                <div className="mt-1 text-xl font-black">{count.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    {themes.length > 0 && (
                        <div className="mb-5 flex flex-wrap gap-2">
                            {themes.map((theme) => (
                                <span key={theme} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-700">
                                    {theme}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="space-y-3">
                        {visibleSnippets.map((snippet, index) => (
                            <div key={`${snippet.text}-${index}`} className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
                                <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-neutral-500">
                                    <span>{snippet.rating ? `평점 ${snippet.rating}` : "구매 후기"}</span>
                                    {snippet.summary && <span className="truncate">{snippet.summary}</span>}
                                </div>
                                <p className="text-sm font-bold leading-6 text-neutral-800">{snippet.text}</p>
                            </div>
                        ))}
                    </div>

                    {snippets.length > 8 && (
                        <div className="mt-5 flex justify-center border-t border-neutral-200 pt-4">
                            <button
                                type="button"
                                onClick={() => setExpanded((value) => !value)}
                                className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-xs font-black text-neutral-900 transition hover:border-indigo-400 hover:text-indigo-700"
                            >
                                {expanded ? "후기 접기" : `후기 ${snippets.length.toLocaleString()}개 모두 보기`}
                                <i className={`fa-solid ${expanded ? "fa-chevron-up" : "fa-chevron-down"} text-[10px]`} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const guidePoints = getPurchaseGuidePoints(p);
    return (
        <div className="mx-auto grid max-w-3xl gap-3 md:grid-cols-3">
            {guidePoints.map((point, index) => (
                <div key={point} className="rounded-lg border border-neutral-200 bg-white p-4">
                    <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-xs font-black text-indigo-700">
                        {index + 1}
                    </div>
                    <p className="text-sm font-bold leading-6 text-neutral-700">{point}</p>
                </div>
            ))}
        </div>
    );
}

function QnaContent({ product: p }: { product: CatalogProduct }) {
    return (
        <div className="mx-auto max-w-2xl rounded-lg border border-neutral-200 bg-white p-7 text-center md:p-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-xl text-indigo-700">
                <i className="fa-regular fa-comment-dots" />
            </div>
            <h3 className="text-lg font-black text-neutral-950">상품 문의</h3>
            <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                {p.name} 기준으로 사이즈, 용도, 비교 상품을 바로 물어볼 수 있습니다.
            </p>
            <Link
                href={`/chat?q=${encodeURIComponent(p.name)}`}
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-indigo-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
                style={{ color: "#fff" }}
            >
                <i className="fa-solid fa-comment-dots text-xs" />
                상품 문의하기
            </Link>
        </div>
    );
}
