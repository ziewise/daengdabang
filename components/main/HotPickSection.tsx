/**
 * HotPickSection — 웹 메인 첫 상품 섹션 "댕다방 핫픽" (2026-10-19 사용자 시안 · 웹만, 앱은 그대로)
 * ---------------------------------------------------------------------
 * 제품군 5개(산책/아웃도어 · 먹거리 · 생활용품 · 장난감/놀이 · 케어)를 카드 한 장씩 한 줄로 두고,
 * 카드마다 그 제품군 1~3위 상품이 "카드 뒤집기"로 번갈아 보인다(사용자가 고른 움직임).
 *  - 다섯 장이 같은 효과로, 왼쪽부터 조금씩 늦게(물결) 뒤집힌다.
 *  - 카드 아래 순위 점은 두지 않는다(2026-10-20 사용자) — 순위는 카드 속 1위 · 2위 · 3위 배지로 보인다.
 *  - 다섯 장이 늘 같은 순위를 보인다(섹션 시계 한 개로 순위를 정함 — 2026-10-22 순위 뒤죽박죽 고침).
 *  - 마우스가 카드 줄 위에 있거나 · 화면 밖 · 다른 탭일 때는 다섯 장이 같이 멈추고, 움직임 줄이기 설정이면 자동으로 돌지 않는다.
 *
 * ⚠ 순위 자료: 실제 제품군별 판매 순위(주문 데이터)가 아직 연결되지 않아 지금은 운영자 추천 셀렉트 순서
 *   → 나머지 상품 순서로 채운 "임시 순서"다. 배포 전 판매 순위 자료로 바꿔야 한다(협업자 · 데이터 연결 필요).
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog";
import { HOT_PICK_GROUPS, HOT_PICK_RANKS, pickHotPickTopThree } from "@/lib/catalog/hot-picks";
import { catalogPriceBadgeClass, catalogPriceBadgeLabel } from "@/lib/catalog/price-badge";
import { productPurchaseState, purchaseStateLabel } from "@/lib/catalog/inventory";
import ProductColorImage from "@/components/products/ProductColorImage";
import { productHref } from "@/lib/shop";
import { productCardImage } from "@/lib/catalog/card-image";
import { useI18n } from "@/lib/i18n";
// 상품 카드(ProductCard)와 같은 마우스 올리면 영상 재생 — 같은 훅 · 같은 영상 맞춤(2026-10-28)
import { useProductVideo } from "@/components/products/useProductVideo";
import VideoBrandOverlay from "@/components/products/VideoBrandOverlay";
import { hoverVideoFraming, hoverVideoStyle } from "@/lib/catalog/hover-video-framing";

// 제품군 5개 · 1~3위 고르기(임시 순서)는 lib/catalog/hot-picks.ts — /best/ 핫픽 페이지와 같은 자료
const GROUPS = HOT_PICK_GROUPS;
const RANKS = HOT_PICK_RANKS; // 제품군마다 1~3위
const FLIP_EVERY = 3800;    // 한 바퀴(다섯 장이 한 번씩 뒤집히는) 간격(ms)
const WAVE_DELAY = 220;     // 왼쪽 카드부터 이만큼씩 늦게 뒤집힘(ms)

// 순위 배지 색 — 1위 금 · 2위 은 · 3위 동(크레파스 톤)
const RANK_TONE = ["bg-[#f6b73c] text-[#5a3a00]", "bg-[#b9c6d4] text-[#2f3c4a]", "bg-[#e0a07a] text-[#5a2c10]"];

const pickTopThree = pickHotPickTopThree;

// 카드 한 면 — 순위 배지 · 사진 · 브랜드 · 이름 · 가격(공용 상품 카드와 같은 가격 표시)
function Face({ p, rank, back, shown, ghost }: { p: CatalogProduct; rank: number; back?: boolean; shown: boolean; ghost?: boolean }) {
    const { locale, productName, formatPrice } = useI18n();
    const name = productName(p);
    const purchase = productPurchaseState(p);
    // 영상은 지금 보이는 면에만 — 뒤에 숨은 면 · 키 맞춤 면은 영상을 붙이지 않음(뒤집히면 새 면에 다시 붙음)
    const videoSrc = shown && !ghost ? p.video : undefined;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { videoRef, videoActive, activate, deactivate, previewColor, ...videoEvents } = useProductVideo(videoSrc);
    return (
        <Link
            href={productHref(p)}
            aria-label={`${rank + 1}${locale === "en" ? "" : "위"} ${name}`}
            // 뒤에 숨은 면은 키보드 · 화면읽기에서 빼기
            aria-hidden={!shown}
            tabIndex={shown ? undefined : -1}
            className={`ddb-hotpick-face flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ${back ? "ddb-hotpick-back" : ""} ${ghost ? "invisible pointer-events-none" : ""}`}
        >
            {/* 사진 칸 — 마우스를 올리면 상품 영상(있을 때), 내리면 사진으로. 이 동안 섹션은 뒤집기를 멈춰 영상이 끊기지 않음 */}
            <span
                className="relative block aspect-square overflow-hidden bg-white"
                onMouseEnter={videoSrc ? activate : undefined}
                onMouseLeave={videoSrc ? deactivate : undefined}
            >
                {productCardImage(p) && <ProductColorImage src={productCardImage(p)!} alt={name} sizes="(max-width: 1024px) 46vw, 260px" className={`object-contain p-2 transition-opacity duration-300 ${videoActive ? "opacity-0" : "opacity-100"}`} />}
                {videoSrc && (
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        style={hoverVideoStyle(videoSrc)}
                        data-hover-video-fit="cover"
                        muted
                        loop={false}
                        playsInline
                        preload="metadata"
                        {...videoEvents}
                        className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${videoActive ? "opacity-100" : "opacity-0"}`}
                    />
                )}
                {videoSrc && videoActive && <VideoBrandOverlay src={videoSrc} forceOverlay={hoverVideoFraming(videoSrc)?.restoreBrandOverlay} />}
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
// 보일 순위는 섹션 시계(tick)로만 정한다(tick 번째 = tick % 상품 수) — 카드마다 따로 세지 않아 다섯 장 순위가 어긋나지 않음
function GroupCard({ group, items, index, tick }: { group: (typeof GROUPS)[number]; items: CatalogProduct[]; index: number; tick: number }) {
    const { locale } = useI18n();
    // a = 앞면 순위, b = 뒷면 순위, flipped = 뒷면이 보이는 중, deg = 누적 회전(항상 같은 방향으로 돎)
    const [state, setState] = useState({ a: 0, b: 1, flipped: false, deg: 0 });

    // 섹션 시계가 한 번 갈 때마다 왼쪽부터 물결처럼 늦게, 시계가 가리키는 순위로
    useEffect(() => {
        if (tick === 0 || items.length < 2) return;
        const t = window.setTimeout(() => {
            setState((s) => {
                const next = tick % items.length;
                if ((s.flipped ? s.b : s.a) === next) return s; // 이미 그 순위면 그대로
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
        <div className="ddb-hotpick-card min-w-0">
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
                    {/* 키 맞춤용 보이지 않는 세 장 — 카드 높이를 세 상품 중 가장 긴 것에 고정해, 뒤집혀 다른 상품이 나와도 화면이 흔들리지 않게(2026-10-22) */}
                    {items.map((item, rank) => <Face key={`ghost-${item.id}`} p={item} rank={rank} shown={false} ghost />)}
                    <Face p={faceA} rank={state.a} shown={!state.flipped} />
                    <Face p={faceB} rank={state.b} back shown={state.flipped} />
                </div>
            </div>

            {/* 카드 아래 순위 점(●●▬)은 뺌(2026-10-20 사용자) — 순위는 카드 속 1위 · 2위 · 3위 배지로 */}
        </div>
    );
}

// 휴대폰 한 줄(2026-10-22 사용자 B안) — 왼쪽 큰 사진 · 가운데 제품군 · 이름 · 가격, 오른쪽 다른 순위 작은 사진 둘.
// 작은 사진을 누르면 그 순위가 크게 올라오고, 크게 있던 순위는 작은 사진 자리로(보기만 바꿈 — 상품을 누르면 상세로)
function MobileRow({ group, items }: { group: (typeof GROUPS)[number]; items: CatalogProduct[] }) {
    const { locale, productName, formatPrice } = useI18n();
    const [shown, setShown] = useState(0); // 크게 보이는 순위(0 = 1위)
    if (items.length === 0) return null;
    const p = items[shown] ?? items[0];
    const name = productName(p);
    const purchase = productPurchaseState(p);
    const image = productCardImage(p);
    const rankLabel = (rank: number) => (locale === "en" ? `No.${rank + 1}` : `${rank + 1}위`);
    return (
        <li className="flex items-center gap-2.5 rounded-[22px] bg-white p-2.5 shadow-card">
            {/* 큰 사진 — 누르면 상품 상세 */}
            <Link href={productHref(p)} aria-label={`${rankLabel(shown)} ${name}`} className="relative block h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl bg-[#f6efe4]">
                {image ? <span key={p.id} className="ddb-hp-swap absolute inset-0"><ProductColorImage src={image} alt="" sizes="88px" className="object-contain p-1" /></span> : null}
                <span className={`absolute left-1 top-1 z-[1] rounded-full px-1.5 py-px text-[10px] font-black ${RANK_TONE[shown]}`}>{rankLabel(shown)}</span>
            </Link>
            {/* 가운데 — 제품군(누르면 제품군 전체) · 이름 · 가격 */}
            <div className="min-w-0 flex-1">
                <Link href={`/category/${group.slug}`} className="flex min-w-0 items-center gap-1">
                    <Image src={group.icon} alt="" width={22} height={22} className="h-[22px] w-[22px] shrink-0 object-contain" />
                    <span className="ddb-hotpick-group truncate text-[13px] text-neutral-900">{locale === "en" ? group.en : group.ko}</span>
                </Link>
                <Link href={productHref(p)} key={p.id} className="ddb-hp-swap mt-1 block min-w-0">
                    <span className="block text-[11.5px] font-bold leading-[1.35] text-neutral-700 line-clamp-2">{name}</span>
                    {purchase.purchasable
                        ? <span className="ddb-crayon-price mt-0.5 block whitespace-nowrap text-[15px]">{formatPrice(p.price)}</span>
                        : <span className="mt-0.5 block text-[11px] font-black text-rose-700">{purchaseStateLabel(purchase, locale)}</span>}
                </Link>
            </div>
            {/* 다른 순위 작은 사진 둘 — 누르면 크게 */}
            <div className="flex shrink-0 flex-col gap-1.5">
                {items.map((item, rank) => rank === shown ? null : (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setShown(rank)}
                        aria-label={`${rankLabel(rank)} ${productName(item)} 크게 보기`}
                        className="relative h-[42px] w-[42px] overflow-hidden rounded-xl bg-[#f6efe4] ring-1 ring-neutral-200/70 transition active:scale-95"
                    >
                        {productCardImage(item) ? <ProductColorImage src={productCardImage(item)!} alt="" sizes="42px" className="object-contain" /> : null}
                        <span className={`absolute -bottom-px -left-px rounded-full px-1 text-[9px] font-black leading-[14px] ${RANK_TONE[rank]}`}>{rank + 1}</span>
                    </button>
                ))}
            </div>
        </li>
    );
}

export default function HotPickSection() {
    const { locale } = useI18n();
    const picks = useMemo(() => GROUPS.map((g) => ({ group: g, items: pickTopThree(g.slug) })), []);
    const sectionRef = useRef<HTMLElement>(null);
    const [tick, setTick] = useState(0);
    // 카드 줄 위에 마우스가 있거나 키보드 포커스가 들어와 있으면 다섯 장이 같이 멈춤(한 장만 멈춰 순위가 어긋나던 것 고침)
    const paused = useRef(false);

    // 섹션 시계 — 화면에 보이고 · 탭이 앞에 있고 · 멈춤이 아닐 때만 간다. 움직임 줄이기 설정이면 자동으로 돌지 않음
    useEffect(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
        let inView = false;
        const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0.25 });
        if (sectionRef.current) io.observe(sectionRef.current);
        const id = window.setInterval(() => {
            if (inView && !document.hidden && !reduce.matches && !paused.current) setTick((t) => t + 1);
        }, FLIP_EVERY);
        return () => { io.disconnect(); window.clearInterval(id); };
    }, []);

    return (
        <section ref={sectionRef} id="best" className="overflow-x-clip py-10 md:py-12" data-hot-pick>
            <div className="mx-auto max-w-[1400px] px-6">
                {/* 제목 — 다른 섹션과 같은 모양 */}
                <div className="mb-6 md:mb-8">
                    <h2 className="mb-1.5 text-2xl font-black tracking-tight md:text-3xl">{locale === "en" ? "DaengDaBang Hot Picks" : "댕다방 핫픽"}</h2>
                    <p className="text-sm text-neutral-500">{locale === "en" ? "Best-loved items right now" : "요즘 가장 사랑받는 인기 상품"}</p>
                </div>

                {/* 휴대폰 — 제품군마다 한 줄(작은 사진 누르면 그 순위가 크게) */}
                <ol className="grid gap-2.5 sm:hidden">
                    {picks.map(({ group, items }) => <MobileRow key={group.slug} group={group} items={items} />)}
                </ol>

                {/* 태블릿 3칸 · PC 한 줄 5칸 — 뒤집기 카드 */}
                <div
                    className="hidden grid-cols-3 gap-x-4 gap-y-6 sm:grid lg:grid-cols-5 lg:gap-5"
                    onMouseEnter={() => { paused.current = true; }}
                    onMouseLeave={() => { paused.current = false; }}
                    // 키보드로 들어왔을 때만 멈춤(마우스로 누른 뒤 포커스가 남아 계속 멈춰 있던 것 막기)
                    onFocus={(e) => { if (e.target.matches(":focus-visible")) paused.current = true; }}
                    onBlur={() => { paused.current = false; }}
                >
                    {picks.map(({ group, items }, i) => (
                        <GroupCard key={group.slug} group={group} items={items} index={i} tick={tick} />
                    ))}
                </div>
            </div>
        </section>
    );
}
