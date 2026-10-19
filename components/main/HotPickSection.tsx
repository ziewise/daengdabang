/**
 * HotPickSection — 웹 메인 첫 상품 섹션 "댕다방 핫픽" (2026-10-19 사용자 시안 · 웹만, 앱은 그대로)
 * ---------------------------------------------------------------------
 * 제품군 5개(산책/아웃도어 · 먹거리 · 생활용품 · 장난감/놀이 · 케어)를 카드 한 장씩 한 줄로 두고,
 * 카드마다 그 제품군 1~3위 상품이 "카드 뒤집기"로 번갈아 보인다(사용자가 고른 움직임).
 *  - 다섯 장이 같은 효과로, 왼쪽부터 조금씩 늦게(물결) 뒤집힌다.
 *  - 카드 아래 점 1·2·3 을 누르면 그 순위로 바로 뒤집힌다(기존 상품 상세 링크만 쓰고 새 기능은 없음).
 *  - 마우스를 올린 카드 · 화면 밖 · 다른 탭일 때는 멈추고, 움직임 줄이기 설정이면 자동으로 돌지 않는다.
 *
 * ⚠ 순위 자료: 실제 제품군별 판매 순위(주문 데이터)가 아직 연결되지 않아 지금은 운영자 추천 셀렉트 순서
 *   → 나머지 상품 순서로 채운 "임시 순서"다. 배포 전 판매 순위 자료로 바꿔야 한다(협업자 · 데이터 연결 필요).
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CATALOG, getBestProducts, type CatalogProduct, type CategorySlug } from "@/lib/catalog";
import { catalogPriceBadgeClass, catalogPriceBadgeLabel } from "@/lib/catalog/price-badge";
import { productPurchaseState, purchaseStateLabel } from "@/lib/catalog/inventory";
import ProductColorImage from "@/components/products/ProductColorImage";
import { productHref } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";

// 제품군 5개 — 이름 · 카테고리 주소 · 사용자 핫픽 제품군 그림(2026-10-19, 원본 tools/sticker-assets/originals/hotpick-*.png)
const GROUPS: { slug: CategorySlug; ko: string; en: string; icon: string }[] = [
    { slug: "outdoor", ko: "산책/아웃도어", en: "Walk & Outdoor", icon: "/images/ui/hotpick-outdoor-128.webp" },
    { slug: "food", ko: "먹거리", en: "Food", icon: "/images/ui/hotpick-food-128.webp" },
    { slug: "life", ko: "생활용품", en: "Living", icon: "/images/ui/hotpick-life-128.webp" },
    { slug: "toy", ko: "장난감/놀이", en: "Toys & Play", icon: "/images/ui/hotpick-toy-128.webp" },
    { slug: "care", ko: "케어", en: "Care", icon: "/images/ui/hotpick-care-128.webp" },
];

const RANKS = 3;            // 제품군마다 1~3위
const FLIP_EVERY = 3800;    // 한 바퀴(다섯 장이 한 번씩 뒤집히는) 간격(ms)
const WAVE_DELAY = 220;     // 왼쪽 카드부터 이만큼씩 늦게 뒤집힘(ms)

// 순위 배지 색 — 1위 금 · 2위 은 · 3위 동(크레파스 톤)
const RANK_TONE = ["bg-[#f6b73c] text-[#5a3a00]", "bg-[#b9c6d4] text-[#2f3c4a]", "bg-[#e0a07a] text-[#5a2c10]"];

// 임시 순서: 운영자 추천 셀렉트 → 나머지 상품. 사진 있고 품절 · 단종 · 판매 멈춤이 아닌 상품만
// (추천 가능 표시는 따지지 않음 — 먹거리는 추천 표시가 없어 빠졌었고, 판매 순위는 추천과 별개)
function pickTopThree(slug: CategorySlug): CatalogProduct[] {
    const curated = getBestProducts(CATALOG.length);
    const seen = new Set<string>();
    const ok = (p: CatalogProduct) => p.category === slug && Boolean(p.image)
        && !["sold_out", "discontinued", "paused"].includes(String(p.availability));
    const out: CatalogProduct[] = [];
    for (const p of [...curated, ...CATALOG]) {
        if (out.length >= RANKS) break;
        if (!ok(p) || seen.has(p.id)) continue;
        seen.add(p.id);
        out.push(p);
    }
    return out;
}

// 카드 한 면 — 순위 배지 · 사진 · 브랜드 · 이름 · 가격(공용 상품 카드와 같은 가격 표시)
function Face({ p, rank, back, shown }: { p: CatalogProduct; rank: number; back?: boolean; shown: boolean }) {
    const { locale, productName, formatPrice } = useI18n();
    const name = productName(p);
    const purchase = productPurchaseState(p);
    return (
        <Link
            href={productHref(p)}
            aria-label={`${rank + 1}${locale === "en" ? "" : "위"} ${name}`}
            // 뒤에 숨은 면은 키보드 · 화면읽기에서 빼기
            aria-hidden={!shown}
            tabIndex={shown ? undefined : -1}
            className={`ddb-hotpick-face flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ${back ? "ddb-hotpick-back" : ""}`}
        >
            <span className="relative block aspect-square bg-white">
                {p.image && <ProductColorImage src={p.image} alt={name} sizes="(max-width: 1024px) 46vw, 260px" className="object-contain p-2" />}
            </span>
            <span className="block border-t border-neutral-100 p-3 md:p-4">
                {/* 순위 배지는 사진 밖(사진 왼쪽 위에 브랜드 로고가 찍힌 상품이 많아 가리지 않게) — 브랜드 줄 앞 */}
                <span className="mb-1.5 flex min-w-0 items-center gap-1.5">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ${RANK_TONE[rank]}`}>
                        {locale === "en" ? `No.${rank + 1}` : `${rank + 1}위`}
                    </span>
                    <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-aurora-indigo">{p.brandEn || p.brandKo}</span>
                </span>
                {/* 상품 이름은 본문 글꼴 그대로(또렷하게) · 두 줄까지 */}
                <span className="mb-2 block min-h-[2.6em] text-xs font-bold leading-[1.3] line-clamp-2 md:text-sm">{name}</span>
                {!purchase.purchasable && <span className="block text-xs font-black text-rose-700">{purchaseStateLabel(purchase, locale)}</span>}
                <span className="mt-1 flex min-w-0 flex-wrap items-baseline justify-end gap-x-1.5">
                    <span className={catalogPriceBadgeClass(p.priceBadgeKind, true)}>{catalogPriceBadgeLabel(p.priceBadgeKind, locale)}</span>
                    <span className="ddb-crayon-price whitespace-nowrap text-lg md:text-xl">{formatPrice(p.price)}</span>
                </span>
            </span>
        </Link>
    );
}

// 제품군 카드 하나 — 앞면 · 뒷면 두 장을 겹쳐 두고 뒤집을 때마다 안 보이는 면을 다음 순위로 바꿔 둔다
function GroupCard({ group, items, index, tick }: { group: (typeof GROUPS)[number]; items: CatalogProduct[]; index: number; tick: number }) {
    const { locale } = useI18n();
    // a = 앞면 순위, b = 뒷면 순위, flipped = 뒷면이 보이는 중, deg = 누적 회전(항상 같은 방향으로 돎)
    const [state, setState] = useState({ a: 0, b: 1, flipped: false, deg: 0 });
    const hovered = useRef(false);
    const visible = state.flipped ? state.b : state.a;

    const flipTo = (target: number) => setState((s) => {
        const now = s.flipped ? s.b : s.a;
        if (target === now) return s;
        return s.flipped
            ? { ...s, a: target, flipped: false, deg: s.deg + 180 }
            : { ...s, b: target, flipped: true, deg: s.deg + 180 };
    });

    // 섹션 시계가 한 번 갈 때마다 왼쪽부터 물결처럼 늦게 다음 순위로
    useEffect(() => {
        if (tick === 0 || items.length < 2) return;
        const t = window.setTimeout(() => {
            if (!hovered.current) setState((s) => {
                const next = ((s.flipped ? s.b : s.a) + 1) % items.length;
                return s.flipped ? { ...s, a: next, flipped: false, deg: s.deg + 180 } : { ...s, b: next, flipped: true, deg: s.deg + 180 };
            });
        }, index * WAVE_DELAY);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick]);

    if (items.length === 0) return null;
    const faceA = items[state.a] ?? items[0];
    const faceB = items[state.b] ?? items[0];

    return (
        <div
            className="ddb-hotpick-card min-w-0 snap-start"
            onMouseEnter={() => { hovered.current = true; }}
            onMouseLeave={() => { hovered.current = false; }}
            onFocus={() => { hovered.current = true; }}
            onBlur={() => { hovered.current = false; }}
        >
            {/* 제품군 이름 — 누르면 그 제품군 전체 보기 */}
            <Link href={`/category/${group.slug}`} className="mb-2.5 flex min-w-0 items-center gap-1.5 px-1 md:gap-2">
                <Image src={group.icon} alt="" width={44} height={44} className="h-8 w-8 shrink-0 object-contain md:h-11 md:w-11" />
                {/* 휴대폰 좁은 칸에서도 한 줄(산책/아웃도어) */}
                <span className="ddb-hotpick-group truncate text-[13px] tracking-tight text-neutral-900 md:text-base">{locale === "en" ? group.en : group.ko}</span>
                <i className="fa-solid fa-chevron-right ml-auto text-[10px] text-neutral-400" aria-hidden="true" />
            </Link>

            {/* 뒤집히는 카드 — 두 면을 같은 칸에 겹쳐 높이를 맞춤 */}
            <div className="ddb-hotpick-flip" style={{ perspective: "1200px" }}>
                <div className="ddb-hotpick-inner" style={{ transform: `rotateY(${state.deg}deg)` }}>
                    <Face p={faceA} rank={state.a} shown={!state.flipped} />
                    <Face p={faceB} rank={state.b} back shown={state.flipped} />
                </div>
            </div>

            {/* 순위 점 — 지금 순위 표시 · 누르면 그 순위로 뒤집기 */}
            <div className="mt-2.5 flex justify-center gap-1.5" role="group" aria-label={locale === "en" ? "Rank" : "순위 보기"}>
                {items.map((_, r) => (
                    <button
                        key={r}
                        type="button"
                        onClick={() => flipTo(r)}
                        aria-label={locale === "en" ? `Show No.${r + 1}` : `${r + 1}위 보기`}
                        aria-pressed={visible === r}
                        className={`h-2 rounded-full transition-all ${visible === r ? "w-5 bg-neutral-800" : "w-2 bg-neutral-300 hover:bg-neutral-400"}`}
                    />
                ))}
            </div>
        </div>
    );
}

export default function HotPickSection() {
    const { locale } = useI18n();
    const picks = useMemo(() => GROUPS.map((g) => ({ group: g, items: pickTopThree(g.slug) })), []);
    const sectionRef = useRef<HTMLElement>(null);
    const [tick, setTick] = useState(0);

    // 섹션 시계 — 화면에 보이고 · 탭이 앞에 있을 때만 간다. 움직임 줄이기 설정이면 자동으로 돌지 않음
    useEffect(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
        let inView = false;
        const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0.25 });
        if (sectionRef.current) io.observe(sectionRef.current);
        const id = window.setInterval(() => {
            if (inView && !document.hidden && !reduce.matches) setTick((t) => t + 1);
        }, FLIP_EVERY);
        return () => { io.disconnect(); window.clearInterval(id); };
    }, []);

    return (
        <section ref={sectionRef} id="best" className="py-10 md:py-12" data-hot-pick>
            <div className="mx-auto max-w-[1400px] px-6">
                {/* 제목 — 다른 섹션과 같은 모양 */}
                <div className="mb-6 md:mb-8">
                    <h2 className="mb-1.5 text-2xl font-black tracking-tight md:text-3xl">{locale === "en" ? "DaengDaBang Hot Picks" : "댕다방 핫픽"}</h2>
                    <p className="text-sm text-neutral-500">{locale === "en" ? "Best-loved items right now" : "요즘 가장 사랑받는 인기 상품"}</p>
                </div>

                {/* 다섯 장 — PC 한 줄 5칸, 휴대폰 옆으로 밀어 보기(scroll-px-6: 첫 카드가 왼쪽 여백에 맞게 멈춤) */}
                <div className="-mx-6 grid snap-x snap-mandatory scroll-px-6 auto-cols-[46%] grid-flow-col gap-4 overflow-x-auto px-6 pb-2 sm:auto-cols-[31%] lg:mx-0 lg:grid-flow-row lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0 lg:gap-5">
                    {picks.map(({ group, items }, i) => (
                        <GroupCard key={group.slug} group={group} items={items} index={i} tick={tick} />
                    ))}
                </div>
            </div>
        </section>
    );
}
