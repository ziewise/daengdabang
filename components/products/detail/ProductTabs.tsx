/**
 * ProductTabs — 상세정보 / 리뷰 / Q&A 섹션 + sticky 점프 탭
 * ---------------------------------------------------------------------
 * 무신사·쿠팡 패턴 — 탭이 콘텐츠를 가르는 게 아니라 점프 버튼.
 * 모든 섹션이 한 페이지에 펼쳐져 있고, 탭 클릭 시 해당 섹션으로 부드러운 스크롤.
 * 스크롤 위치에 따라 활성 탭 자동 변경 (IntersectionObserver).
 *
 * 상세 정보:
 *   - details[] 세로 쌓기
 *   - 접힘 상태 800px + 페이드 + "펼쳐보기" 버튼
 *   - details 0개 시 빈 영역 (안내 문구 X)
 *
 * 리뷰 / Q&A:
 *   - 빈 상태 mock + 작성/문의 CTA
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { CatalogProduct } from "@/lib/catalog";

type SectionKey = "detail" | "review" | "qna";

const SECTIONS: { key: SectionKey; label: string }[] = [
    { key: "detail", label: "상세 정보" },
    { key: "review", label: "리뷰" },
    { key: "qna",    label: "Q&A" },
];

interface Props {
    product: CatalogProduct;
}

export default function ProductTabs({ product: p }: Props) {
    const [active, setActive] = useState<SectionKey>("detail");
    const sectionRefs = useRef<Record<SectionKey, HTMLElement | null>>({
        detail: null, review: null, qna: null,
    });

    /** 활성 탭 자동 감지 — 화면 상단 1/3 지점에 가장 가까운 섹션 */
    useEffect(() => {
        if (typeof window === "undefined") return;
        // IntersectionObserver — 헤더 높이 + 탭바 높이 만큼 위에서 감지
        const headerOffset = 72 + 56;  // 헤더 + 탭바
        const observer = new IntersectionObserver(
            (entries) => {
                // 화면 상단에 가장 가까운(top 이 양수면서 가장 작은) entry 선택
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) {
                    const id = (visible[0].target as HTMLElement).id;
                    if (id === "tab-detail") setActive("detail");
                    else if (id === "tab-review") setActive("review");
                    else if (id === "tab-qna") setActive("qna");
                }
            },
            {
                // 화면 상단(헤더+탭바 아래) 부터 약 50% 지점까지 의미
                rootMargin: `-${headerOffset}px 0px -50% 0px`,
                threshold: 0,
            }
        );
        Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, []);

    /** 탭 클릭 → 부드러운 스크롤 */
    const scrollToSection = (key: SectionKey) => {
        const el = sectionRefs.current[key];
        if (!el) return;
        const headerOffset = 72 + 56 + 12;
        const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
    };

    return (
        <div className="mt-10 md:mt-14">
            {/* sticky 탭 바 — 클릭 시 섹션으로 점프 */}
            <nav
                className="sticky top-[var(--header-height)] z-20 -mx-4 md:-mx-6 px-4 md:px-6 bg-background/95 backdrop-blur border-b border-neutral-200"
                aria-label="페이지 내 섹션"
            >
                <div className="flex gap-1">
                    {SECTIONS.map((s) => (
                        <TabButton
                            key={s.key}
                            active={active === s.key}
                            onClick={() => scrollToSection(s.key)}
                            label={s.label}
                            badge={s.key === "review" && p.reviewCount > 0
                                ? p.reviewCount.toLocaleString()
                                : undefined}
                        />
                    ))}
                </div>
            </nav>

            {/* 섹션들 — 모두 펼쳐진 상태로 세로로 쌓임 */}
            <section
                id="tab-detail"
                ref={(el) => { sectionRefs.current.detail = el; }}
                className="pt-8 md:pt-12 scroll-mt-[calc(var(--header-height)+56px)]"
            >
                <SectionTitle title="상세 정보" />
                <DetailContent product={p} />
            </section>

            <section
                id="tab-review"
                ref={(el) => { sectionRefs.current.review = el; }}
                className="pt-12 md:pt-16 scroll-mt-[calc(var(--header-height)+56px)]"
            >
                <SectionTitle title="리뷰" badge={p.reviewCount > 0 ? p.reviewCount.toLocaleString() : undefined} />
                <ReviewContent product={p} />
            </section>

            <section
                id="tab-qna"
                ref={(el) => { sectionRefs.current.qna = el; }}
                className="pt-12 md:pt-16 scroll-mt-[calc(var(--header-height)+56px)]"
            >
                <SectionTitle title="Q&A" />
                <QnaContent />
            </section>
        </div>
    );
}

/* ============ 공용 ============ */
function TabButton({
    active, onClick, label, badge,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    badge?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active}
            className={`relative px-5 md:px-6 py-3.5 md:py-4 text-sm md:text-base font-extrabold transition ${
                active ? "text-foreground" : "text-neutral-400 hover:text-neutral-700"
            }`}
        >
            <span className="inline-flex items-center gap-1.5">
                {label}
                {badge && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                        active ? "bg-aurora-indigo text-white" : "bg-neutral-100 text-neutral-500"
                    }`}>
                        {badge}
                    </span>
                )}
            </span>
            {active && (
                <span className="absolute left-3 right-3 -bottom-px h-[3px] bg-gradient-to-r from-aurora-blue to-aurora-indigo rounded-full" />
            )}
        </button>
    );
}

function SectionTitle({ title, badge }: { title: string; badge?: string }) {
    return (
        <header className="mb-5 md:mb-6 flex items-baseline gap-2">
            <h2 className="text-xl md:text-2xl font-black tracking-tight">{title}</h2>
            {badge && (
                <span className="text-xs md:text-sm font-extrabold text-neutral-400">
                    {badge}
                </span>
            )}
        </header>
    );
}

/* ============ 상세 정보 영역 ============ */
function DetailContent({ product: p }: { product: CatalogProduct }) {
    const [expanded, setExpanded] = useState(false);
    const details = p.details ?? [];

    // 이미지 없으면 빈 영역 (안내 문구 X)
    if (details.length === 0) {
        return <div className="min-h-[80px]" aria-hidden="true" />;
    }

    return (
        <div className="relative max-w-3xl mx-auto">
            <div
                className={`relative overflow-hidden transition-all duration-300 ${
                    expanded ? "max-h-none" : "max-h-[800px]"
                }`}
            >
                <div className="flex flex-col gap-2">
                    {details.map((src, i) => (
                        <div key={src} className="relative w-full">
                            <Image
                                src={src}
                                alt={`${p.name} 상세 ${i + 1}`}
                                width={1200}
                                height={1600}
                                sizes="(max-width: 768px) 100vw, 768px"
                                className="w-full h-auto"
                                priority={i === 0}
                            />
                        </div>
                    ))}
                </div>

                {/* 접힌 상태 — 하단 페이드 그라데이션 */}
                {!expanded && (
                    <div
                        className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
                        style={{
                            background: "linear-gradient(to top, var(--background) 0%, var(--background) 30%, rgba(255,255,255,0) 100%)",
                        }}
                    />
                )}
            </div>

            {/* 펼침/접기 버튼 */}
            <div className="flex justify-center mt-4">
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-neutral-200 hover:border-aurora-indigo hover:text-aurora-indigo text-sm font-extrabold shadow-card hover:shadow-hover transition-all"
                >
                    {expanded ? (
                        <>
                            <span>접기</span>
                            <i className="fa-solid fa-chevron-up text-[10px]" />
                        </>
                    ) : (
                        <>
                            <span>상세정보 펼쳐보기</span>
                            <i className="fa-solid fa-chevron-down text-[10px]" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

/* ============ 리뷰 영역 ============ */
function ReviewContent({ product: p }: { product: CatalogProduct }) {
    return (
        <div className="rounded-2xl bg-white/70 backdrop-blur border border-neutral-100 p-8 md:p-12 text-center max-w-2xl mx-auto">
            {p.reviewCount > 0 && (
                <div className="flex items-center justify-center gap-2 mb-5">
                    <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <i
                                key={s}
                                className={`fa-solid fa-star text-base ${s <= Math.round(p.rating) ? "text-amber-400" : "text-neutral-200"}`}
                            />
                        ))}
                    </div>
                    <span className="text-2xl font-black">{p.rating.toFixed(1)}</span>
                    <span className="text-sm text-neutral-400 font-bold">/ 5.0</span>
                </div>
            )}
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-amber-500 text-xl">
                <i className="fa-regular fa-star" />
            </div>
            <h3 className="text-base md:text-lg font-extrabold mb-1.5">
                {p.reviewCount > 0 ? "리뷰 작성 가능" : "아직 리뷰가 없습니다"}
            </h3>
            <p className="text-sm text-neutral-500 mb-6">
                첫 번째 리뷰를 작성해 주세요.<br className="hidden md:block" />
                다른 구매자에게 큰 도움이 됩니다.
            </p>
            <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold shadow-card hover:shadow-hover transition"
            >
                <i className="fa-solid fa-pen-to-square" />
                리뷰 작성하기
            </button>
        </div>
    );
}

/* ============ Q&A 영역 ============ */
function QnaContent() {
    return (
        <div className="rounded-2xl bg-white/70 backdrop-blur border border-neutral-100 p-8 md:p-12 text-center max-w-2xl mx-auto">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-aurora-indigo text-xl">
                <i className="fa-regular fa-comment-dots" />
            </div>
            <h3 className="text-base md:text-lg font-extrabold mb-1.5">아직 문의가 없습니다</h3>
            <p className="text-sm text-neutral-500 mb-6">
                상품에 궁금한 점이 있으신가요?<br className="hidden md:block" />
                답변은 영업일 기준 1~2일 내 드립니다.
            </p>
            <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold shadow-card hover:shadow-hover transition"
            >
                <i className="fa-solid fa-circle-question" />
                문의하기
            </button>
        </div>
    );
}
