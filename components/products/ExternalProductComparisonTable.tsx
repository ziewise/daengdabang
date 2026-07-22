"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type ExternalProductResult } from "@/lib/external-products";
import {
    assessSmartComparison,
    comparableTotal,
    comparisonStatus,
    confirmedProductFacts,
    displayProductPrice,
    externalProductHref,
    hasExplicitShippingEvidence,
    hasTrustedWeightEvidence,
    isDaengdabangOffer,
    rankSmartComparisonProducts,
    unitPrice,
    unitSummary,
    type ConfirmedProductFact,
    type SmartComparisonAxisKey,
    type SmartComparisonRankedProduct,
} from "@/lib/external-products/comparison";
import { useI18n } from "@/lib/i18n";
import { trackDirectExternalProductClick } from "@/lib/storefront-analytics";

type Props = {
    products: ExternalProductResult[];
    query?: string;
};

const AXIS_LABELS: Record<SmartComparisonAxisKey, [string, string]> = {
    relevance: ["검색 적합성", "Search fit"],
    price: ["가격 정보", "Price clarity"],
    information: ["상품정보", "Product details"],
    source: ["출처·확인시점", "Source & timestamp"],
};

const FACT_LABELS: Record<ConfirmedProductFact["key"], [string, string]> = {
    manufacturer: ["제조사", "Manufacturer"],
    origin: ["원산지", "Origin"],
    model: ["모델", "Model"],
    amount: ["용량", "Amount"],
    status: ["판매상태", "Sale status"],
};

function identity(value?: string): string {
    return (value || "").toLocaleLowerCase().replace(/[^0-9a-z가-힣]+/g, "");
}

function isRelatedPack(anchor: ExternalProductResult, product: ExternalProductResult): boolean {
    if (anchor.id === product.id) return false;
    if (!anchor.comparisonModel || !product.comparisonModel) return false;
    if (identity(anchor.comparisonModel) !== identity(product.comparisonModel)) return false;
    if ((anchor.sizeLabel || "") !== (product.sizeLabel || "")) return false;
    if (!anchor.totalUnits || !product.totalUnits || anchor.totalUnits === product.totalUnits) return false;
    return anchor.unitLabel === product.unitLabel && unitPrice(product) !== null;
}

function isAvailableAnchor(product: ExternalProductResult): boolean {
    const status = confirmedProductFacts(product).find((fact) => fact.key === "status")?.value || "";
    return !/(?:품절|판매중지|판매종료|out\s*of\s*stock|sold\s*out|inactive)/i.test(status);
}

function selectDiverseProducts(ranked: SmartComparisonRankedProduct[], limit: number): ExternalProductResult[] {
    const selected: ExternalProductResult[] = [];
    const sourceCounts = new Map<string, number>();
    for (const row of ranked) {
        const source = identity(row.product.sourceName || row.product.sellerName) || row.product.id;
        if ((sourceCounts.get(source) || 0) >= 2) continue;
        selected.push(row.product);
        sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
        if (selected.length === limit) return selected;
    }
    for (const row of ranked) {
        if (selected.some((product) => product.id === row.product.id)) continue;
        selected.push(row.product);
        if (selected.length === limit) break;
    }
    return selected;
}

function rowThumbnail(product: ExternalProductResult): string {
    return product.thumbnail;
}

function displayFactValue(fact: ConfirmedProductFact, locale: "ko" | "en"): string {
    if (fact.key === "status" && /^(?:sale|on\s*sale|available|판매중)$/i.test(fact.value.trim())) {
        return locale === "en" ? "Available" : "판매중";
    }
    return fact.value;
}

export default function ExternalProductComparisonTable({ products, query = "" }: Props) {
    const { locale, formatPrice, subcategoryLabel } = useI18n();
    const anchors = useMemo(
        () => products.filter((product) => (
            (comparisonStatus(product) === "anchor" || isDaengdabangOffer(product))
            && isAvailableAnchor(product)
        )),
        [products],
    );
    const [activeId, setActiveId] = useState("");
    const activeAnchor = anchors.find((product) => product.id === activeId) ?? anchors[0];

    const comparison = useMemo(() => {
        if (!activeAnchor) return null;
        const candidates = products.filter((product) => (
            product.id !== activeAnchor.id
            && !["anchor", "exact_match", "unit_match"].includes(comparisonStatus(product))
        ));
        const externallyRanked = rankSmartComparisonProducts(candidates, query, activeAnchor);
        const selectedExternal = selectDiverseProducts(externallyRanked, 7);
        const ranked = rankSmartComparisonProducts([activeAnchor, ...selectedExternal], query, activeAnchor);
        return {
            ranked,
            anchorRow: ranked.find((row) => row.product.id === activeAnchor.id),
        };
    }, [activeAnchor, products, query]);

    if (!activeAnchor || !comparison) return null;

    const exactRows = [
        activeAnchor,
        ...products.filter((product) => (
            product.id !== activeAnchor.id
            && product.comparisonAnchorId === activeAnchor.id
            && comparisonStatus(product) === "exact_match"
        )),
    ].sort((a, b) => (comparableTotal(a) ?? Number.MAX_SAFE_INTEGER) - (comparableTotal(b) ?? Number.MAX_SAFE_INTEGER));
    const comparableRows = exactRows.filter((product) => comparableTotal(product) !== null);
    const hasExactComparison = comparableRows.length >= 2;
    const minTotal = hasExactComparison ? Math.min(...comparableRows.map((product) => comparableTotal(product) as number)) : null;
    const relatedPackRows = products.filter((product) => (
        (product.comparisonAnchorId === activeAnchor.id && comparisonStatus(product) === "unit_match")
        || (comparisonStatus(product) === "anchor" && isRelatedPack(activeAnchor, product))
    )).filter((product, index, list) => list.findIndex((row) => row.id === product.id) === index);
    const anchorFacts = confirmedProductFacts(activeAnchor);
    const anchorAssessment = comparison.anchorRow?.assessment ?? assessSmartComparison(activeAnchor, query, activeAnchor);
    const topPosition = comparison.anchorRow?.position;
    const anchorIsTied = comparison.anchorRow?.isTied ?? false;
    const subjectCategory = subcategoryLabel(activeAnchor.subcategory);
    const englishSubject = subjectCategory.toLocaleLowerCase();
    const comparisonSubject = locale === "en"
        ? (/^dog\b/i.test(englishSubject) ? englishSubject : `dog ${englishSubject}`)
        : `강아지 ${subjectCategory}`;
    const axisLabel = (key: SmartComparisonAxisKey) => AXIS_LABELS[key][locale === "en" ? 1 : 0];
    const factLabel = (key: ConfirmedProductFact["key"]) => FACT_LABELS[key][locale === "en" ? 1 : 0];

    const trackedHref = (product: ExternalProductResult, surface: string) => externalProductHref(product, query, surface);
    const handleOutbound = (product: ExternalProductResult, surface: string) => {
        const href = trackedHref(product, surface);
        trackDirectExternalProductClick({ product, query, targetUrl: href, surface });
    };

    return (
        <section className="mb-7 min-w-0 max-w-full overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/35">
            <div className="border-b border-emerald-100 bg-white p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-3xl">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Smart Category Comparison</p>
                        <h3 className="mt-1 text-xl font-black text-neutral-950 md:text-2xl">
                            {locale === "en" ? `Evidence-based comparison of similar ${comparisonSubject}` : `비슷한 ${comparisonSubject} 스마트 비교`}
                        </h3>
                        <p className="mt-2 text-xs font-bold leading-5 text-neutral-600">
                            {locale === "en"
                                ? "The score summarizes confirmed search fit, price clarity, product details, source and check timestamp. It is not a quality, health or efficacy rating."
                                : "검색 적합성·가격 정보·상품정보·출처와 확인시점 중 확인된 근거만 점수화했습니다. 품질·건강·효능의 우열을 뜻하지 않습니다."}
                        </p>
                    </div>
                    <span className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-black text-white">
                        {locale === "en" ? `${comparison.ranked.length} evidence profiles` : `${comparison.ranked.length}개 근거 비교`}
                    </span>
                </div>

                {anchors.length > 1 && (
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label={locale === "en" ? "Choose a DaengDaBang reference product" : "댕다방 기준상품 선택"}>
                        {anchors.map((anchor) => (
                            <button
                                key={anchor.id}
                                type="button"
                                onClick={() => setActiveId(anchor.id)}
                                aria-pressed={anchor.id === activeAnchor.id}
                                className={`shrink-0 rounded-md border px-3 py-2 text-xs font-black transition ${
                                    anchor.id === activeAnchor.id
                                        ? "border-neutral-950 bg-neutral-950 text-white"
                                        : "border-neutral-200 bg-white text-neutral-700 hover:border-emerald-400"
                                }`}
                            >
                                {anchor.title}
                            </button>
                        ))}
                    </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label={locale === "en" ? "Score criteria" : "확인 근거 점수 기준"}>
                    {anchorAssessment.axes.map((item) => (
                        <div key={item.key} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2 text-[11px] font-black">
                                <span className="text-neutral-600">{axisLabel(item.key)}</span>
                                <span className="text-neutral-950">{item.score}/{item.maxScore}</span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200" aria-hidden="true">
                                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(item.score / item.maxScore) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-black text-emerald-800">
                                {locale === "en" ? "Confirmed strengths of the DaengDaBang reference" : "댕다방 기준상품의 확인된 강점"}
                            </p>
                            <p className="mt-1 text-sm font-black text-neutral-950">{activeAnchor.title}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-emerald-800 shadow-sm">
                            {locale === "en" ? `Evidence score ${anchorAssessment.score}` : `확인 근거 ${anchorAssessment.score}점`}
                            {topPosition ? ` · ${locale === "en" ? `${anchorIsTied ? "joint " : ""}rank ${topPosition}` : `${anchorIsTied ? "공동 " : ""}${topPosition}위`}` : ""}
                        </span>
                    </div>
                    {anchorFacts.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {anchorFacts.map((fact) => (
                                <span key={`${fact.key}-${fact.value}`} className="rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-neutral-700">
                                    <strong className="text-emerald-800">{factLabel(fact.key)}</strong> {displayFactValue(fact, locale)}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-2 text-xs font-bold text-neutral-600">
                            {locale === "en" ? "The registered product details are being expanded." : "등록 상품정보의 확인 항목을 계속 보강하고 있습니다."}
                        </p>
                    )}
                    <p className="mt-3 text-[11px] font-bold leading-5 text-neutral-600">
                        {locale === "en"
                            ? "A missing field means unconfirmed, not inferior. Seller-provided fields are shown as registered information, not independently certified claims."
                            : "정보가 없는 항목은 ‘미확인’일 뿐 낮은 품질을 의미하지 않습니다. 판매자 등록정보는 확인 가능한 표기이며 별도 인증을 뜻하지 않습니다."}
                    </p>
                </div>
            </div>

            <div className="hidden overflow-x-auto bg-white md:block">
                <table className="w-full min-w-[980px] border-collapse text-left">
                    <caption className="sr-only">
                        {locale === "en" ? `Evidence comparison of the selected DaengDaBang ${comparisonSubject} and similar external products` : `선택한 댕다방 ${comparisonSubject} 및 외부 유사 상품의 확인 근거 비교`}
                    </caption>
                    <thead className="bg-neutral-50 text-[11px] font-black uppercase text-neutral-500">
                        <tr>
                            <th scope="col" className="w-20 px-4 py-3">{locale === "en" ? "Rank" : "근거순위"}</th>
                            <th scope="col" className="min-w-72 px-4 py-3">{locale === "en" ? "Product" : "상품"}</th>
                            <th scope="col" className="w-52 px-4 py-3">{locale === "en" ? "Evidence score" : "확인 근거 점수"}</th>
                            <th scope="col" className="w-40 px-4 py-3 text-right">{locale === "en" ? "Listed price" : "표시 판매가"}</th>
                            <th scope="col" className="w-48 px-4 py-3">{locale === "en" ? "Confirmed / unknown" : "확인 / 미확인"}</th>
                            <th scope="col" className="w-20 px-4 py-3 text-center">{locale === "en" ? "Open" : "보기"}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-sm">
                        {comparison.ranked.map((row) => {
                            const product = row.product;
                            const isAnchor = product.id === activeAnchor.id;
                            const price = displayProductPrice(product);
                            const shippingKnown = hasExplicitShippingEvidence(product);
                            return (
                                <tr key={product.id} className={isAnchor ? "bg-emerald-50/70" : "bg-white"}>
                                    <td className="px-4 py-4 align-top">
                                        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-black ${row.position === 1 ? "bg-emerald-700 text-white" : "bg-neutral-100 text-neutral-700"}`}>
                                            {locale === "en" ? `${row.isTied ? "Joint " : ""}#${row.position}` : `${row.isTied ? "공동 " : ""}${row.position}위`}
                                        </span>
                                        {isAnchor && <div className="mt-1 text-[10px] font-black text-emerald-800">{locale === "en" ? "REFERENCE" : "기준상품"}</div>}
                                    </td>
                                    <th scope="row" className="px-4 py-4 align-top font-normal">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f7f2e8]">
                                                <img src={rowThumbnail(product)} alt="" className="h-full w-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="line-clamp-2 font-black leading-5 text-neutral-950">{product.title}</div>
                                                <div className="mt-1 text-[11px] font-bold text-neutral-500">{product.sellerName || product.sourceName}</div>
                                            </div>
                                        </div>
                                    </th>
                                    <td className="px-4 py-4 align-top">
                                        <div className="text-lg font-black text-neutral-950">{row.assessment.score}<span className="text-xs text-neutral-500">/100</span></div>
                                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                                            {row.assessment.axes.map((item) => (
                                                <div key={item.key} className="text-[10px] font-bold text-neutral-500">
                                                    {axisLabel(item.key)} <strong className="text-neutral-800">{item.score}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right align-top">
                                        <div className="text-base font-black text-neutral-950">{price !== null ? formatPrice(price) : product.priceText}</div>
                                        <div className={`mt-1 text-[10px] font-bold ${shippingKnown ? "text-neutral-500" : "text-amber-700"}`}>
                                            {shippingKnown
                                                ? product.shippingEvidence === "explicit_free"
                                                    ? (locale === "en" ? "Free shipping confirmed" : "무료배송 확인")
                                                    : positiveShippingLabel(product, locale, formatPrice)
                                                : (locale === "en" ? "Shipping unconfirmed" : "배송비 미확인")}
                                        </div>
                                        {hasTrustedWeightEvidence(product) && typeof product.pricePer100g === "number" && product.pricePer100g > 0 && (
                                            <div className="mt-1 text-[10px] font-bold text-sky-700">{locale === "en" ? `About ${formatPrice(Math.round(product.pricePer100g))}/100g · listed price` : `100g당 약 ${formatPrice(Math.round(product.pricePer100g))} · 표시 판매가 기준`}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 align-top">
                                        <div className="text-xs font-black text-emerald-800">
                                            {locale === "en" ? `${row.assessment.confirmed.length} confirmed` : `${row.assessment.confirmed.length}개 확인`}
                                        </div>
                                        <div className="mt-1 text-[11px] font-bold text-neutral-500">
                                            {locale === "en" ? `${row.assessment.unknown.length} fields unconfirmed` : `${row.assessment.unknown.length}개 항목 미확인`}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center align-top">
                                        <Link
                                            href={trackedHref(product, "smart-comparison")}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-neutral-950 text-white transition hover:bg-emerald-700"
                                            aria-label={`${product.title} ${locale === "en" ? "open seller" : "판매처 열기"}`}
                                            onClick={() => handleOutbound(product, "smart-comparison")}
                                        >
                                            <i className="fa-solid fa-arrow-up-right-from-square text-xs" aria-hidden="true" />
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="grid gap-3 bg-white p-3 md:hidden" role="list" aria-label={locale === "en" ? "Mobile evidence comparison cards" : "모바일 확인 근거 비교 카드"}>
                {comparison.ranked.map((row) => {
                    const product = row.product;
                    const isAnchor = product.id === activeAnchor.id;
                    const price = displayProductPrice(product);
                    return (
                        <article key={product.id} role="listitem" className={`rounded-lg border p-3 ${isAnchor ? "border-emerald-300 bg-emerald-50" : "border-neutral-200 bg-white"}`}>
                            <div className="flex items-start gap-3">
                                <img src={rowThumbnail(product)} alt="" className="h-16 w-16 shrink-0 rounded-md bg-[#f7f2e8] object-cover" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="rounded-md bg-emerald-700 px-2 py-1 text-[10px] font-black text-white">
                                            {locale === "en" ? `Evidence score ${row.isTied ? "joint " : ""}#${row.position}` : `근거점수 ${row.isTied ? "공동 " : ""}${row.position}위`}
                                        </span>
                                        <strong className="text-base text-neutral-950">{row.assessment.score}<span className="text-[10px] text-neutral-500">/100</span></strong>
                                    </div>
                                    <h4 className="mt-2 line-clamp-2 text-sm font-black leading-5 text-neutral-950">{product.title}</h4>
                                    <p className="mt-1 text-[11px] font-bold text-neutral-500">{isAnchor ? (locale === "en" ? "DaengDaBang reference" : "댕다방 기준상품") : product.sellerName || product.sourceName}</p>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {row.assessment.axes.map((item) => (
                                    <div key={item.key} className="rounded-md bg-neutral-50 px-2 py-1.5 text-[10px] font-bold text-neutral-600">
                                        {axisLabel(item.key)} <strong className="float-right text-neutral-950">{item.score}/{item.maxScore}</strong>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 flex items-end justify-between gap-3">
                                <div>
                                    <div className="text-base font-black text-neutral-950">{price !== null ? formatPrice(price) : product.priceText}</div>
                                    {!hasExplicitShippingEvidence(product) && <div className="text-[10px] font-bold text-amber-700">{locale === "en" ? "Shipping unconfirmed" : "배송비 미확인"}</div>}
                                </div>
                                <Link
                                    href={trackedHref(product, "smart-comparison-mobile")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-md bg-neutral-950 px-3 py-2 text-xs font-black text-white"
                                    onClick={() => handleOutbound(product, "smart-comparison-mobile")}
                                    aria-label={`${product.title} ${locale === "en" ? "open seller" : "판매처 열기"}`}
                                >
                                    {locale === "en" ? "Open" : "보기"}
                                </Link>
                            </div>
                        </article>
                    );
                })}
            </div>

            <p className="border-t border-neutral-100 bg-white px-4 py-3 text-[11px] font-bold leading-5 text-neutral-500 md:px-5">
                {locale === "en"
                    ? "Per-100g values use the listed price and are reference-only. Price level is not scored because treat forms and pack conditions differ."
                    : "100g당 가격은 표시 판매가 기준 참고값입니다. 간식 형태와 구성 조건이 달라 가격의 높고 낮음은 근거점수 순위에 반영하지 않습니다."}
            </p>

            <div className="border-t border-emerald-100 bg-white p-4 md:p-5">
                <h4 className="text-sm font-black text-neutral-950">{locale === "en" ? "Exact product price check" : "같은 상품 가격 비교"}</h4>
                <p className="mt-1 text-xs font-bold text-neutral-500">
                    {locale === "en" ? "Total price is compared only when brand, model, size and total quantity all match." : "브랜드·모델·크기·총수량이 모두 일치할 때만 총액을 비교합니다."}
                </p>
                {hasExactComparison ? (
                    <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                            <caption className="sr-only">{locale === "en" ? "Exact matching seller price table" : "같은 상품 판매처 가격표"}</caption>
                            <thead className="bg-neutral-50 text-neutral-500">
                                <tr>
                                    <th scope="col" className="px-3 py-2">{locale === "en" ? "Seller" : "판매처"}</th>
                                    <th scope="col" className="px-3 py-2">{locale === "en" ? "Pack" : "구성"}</th>
                                    <th scope="col" className="px-3 py-2 text-right">{locale === "en" ? "Confirmed total" : "확인 총액"}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {comparableRows.map((product) => {
                                    const total = comparableTotal(product);
                                    return (
                                        <tr key={product.id} className={total === minTotal ? "bg-emerald-50" : "bg-white"}>
                                            <th scope="row" className="px-3 py-2 font-black text-neutral-900">{product.sellerName || product.sourceName}</th>
                                            <td className="px-3 py-2 font-bold text-neutral-600">{unitSummary(product, locale) || (locale === "en" ? "Confirmed in detail" : "상품 상세에서 확인")}</td>
                                            <td className="px-3 py-2 text-right font-black text-neutral-950">{total !== null ? formatPrice(total) : "-"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold leading-5 text-amber-900">
                        {locale === "en"
                            ? "No seller with the same name, size and pack has been confirmed yet. Similar products above are compared separately by evidence, not by checkout total."
                            : "상품명·용량·구성이 같은 판매처는 아직 확인되지 않았습니다. 위 유사 상품은 결제총액이 아닌 확인 근거로 별도 비교합니다."}
                    </div>
                )}
            </div>

            {relatedPackRows.length > 0 && (
                <div className="border-t border-emerald-100 bg-white p-4 md:p-5">
                    <h4 className="text-sm font-black text-neutral-950">{locale === "en" ? "Same product, different pack" : "같은 상품의 다른 구성"}</h4>
                    <p className="mt-1 text-xs font-bold text-neutral-500">{locale === "en" ? "Different pack sizes are listed separately with a unit price." : "수량이 다른 구성은 한 개당 가격을 따로 계산해 보여드려요."}</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {relatedPackRows.map((product) => (
                            <div key={product.id} className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3">
                                <div className="min-w-0">
                                    <div className="truncate text-xs font-black text-neutral-900">{product.title}</div>
                                    <div className="mt-1 text-[11px] font-bold text-neutral-500">{unitSummary(product, locale)}</div>
                                </div>
                                <div className="shrink-0 text-right text-sm font-black text-neutral-950">
                                    {unitPrice(product) !== null && product.unitLabel ? `${formatPrice(Math.round(unitPrice(product) as number))}/${product.unitLabel}` : "-"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

function positiveShippingLabel(
    product: ExternalProductResult,
    locale: "ko" | "en",
    formatPrice: (value: number) => string,
): string {
    if (typeof product.shippingFee === "number" && product.shippingFee > 0) {
        return `${locale === "en" ? "Shipping" : "배송"} ${formatPrice(product.shippingFee)}`;
    }
    return locale === "en" ? "Shipping confirmed" : "배송비 확인";
}
