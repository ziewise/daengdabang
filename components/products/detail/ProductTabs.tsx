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
    const externalReviewCount = p.externalReviewCount ?? 0;
    const reviewBadge = externalReviewCount > 0 ? externalReviewCount.toLocaleString() : undefined;
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
                            badge={s.key === "review" ? reviewBadge : undefined}
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
                <SectionTitle title="리뷰" badge={reviewBadge} />
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
    const externalSnippets = p.externalReviewSnippets ?? [];
    const externalThemes = p.externalReviewThemes ?? [];
    const hasExternalReviews = externalSnippets.length > 0 || externalThemes.length > 0;
    const externalCount = p.externalReviewCount ?? externalSnippets.length;
    const externalAverage = typeof p.externalReviewAverage === "number" ? p.externalReviewAverage : null;

    if (hasExternalReviews) {
        return (
            <div className="max-w-3xl mx-auto space-y-5">
                <div className="rounded-2xl bg-white/80 backdrop-blur border border-neutral-100 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                        <div>
                            <p className="text-xs font-black text-aurora-indigo mb-2">
                                네이버 스마트스토어 후기 기반 참고 요약
                            </p>
                            <h3 className="text-lg md:text-xl font-black tracking-tight">
                                공개 후기에서 반복 언급된 의견
                            </h3>
                            <p className="mt-2 text-sm text-neutral-500 leading-6">
                                후기 원문을 복사하지 않고, 상품 선택에 도움이 되는 공통 의견만 요약했습니다.
                            </p>
                        </div>
                        <div className="shrink-0 grid grid-cols-2 gap-2 text-center">
                            <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3">
                                <div className="text-[11px] font-black text-neutral-400">평균</div>
                                <div className="mt-1 text-xl font-black">
                                    {externalAverage !== null ? externalAverage.toFixed(1) : "-"}
                                </div>
                            </div>
                            <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3">
                                <div className="text-[11px] font-black text-neutral-400">후기</div>
                                <div className="mt-1 text-xl font-black">{externalCount.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    {externalThemes.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-sm font-black mb-3">자주 언급된 포인트</h4>
                            <div className="flex flex-wrap gap-2">
                                {externalThemes.map((theme) => (
                                    <span
                                        key={theme}
                                        className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-3 py-1.5 text-xs font-extrabold text-amber-700"
                                    >
                                        {theme}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {externalSnippets.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-black">요약 의견</h4>
                            {externalSnippets.slice(0, 5).map((snippet, index) => (
                                <div
                                    key={`${snippet.text}-${index}`}
                                    className="rounded-xl bg-neutral-50 border border-neutral-100 p-4 text-left"
                                >
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <span className="text-xs font-black text-neutral-400">
                                            {snippet.rating ? `별점 ${snippet.rating}` : "후기 요약"}
                                        </span>
                                        {snippet.summary && (
                                            <span className="text-[11px] font-extrabold text-neutral-400 truncate">
                                                {snippet.summary}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-neutral-700 leading-6">{snippet.text}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-neutral-100 pt-4">
                        <p className="text-xs text-neutral-500 leading-5">
                            {p.externalReviewDisclosure ??
                                "네이버 스마트스토어 공개 후기에서 반복 언급된 의견을 요약했습니다. 자사몰 작성 댓글이 아닙니다."}
                        </p>
                        {p.externalReviewUrl && (
                            <a
                                href={p.externalReviewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black hover:border-aurora-indigo hover:text-aurora-indigo transition"
                            >
                                <i className="fa-solid fa-arrow-up-right-from-square" />
                                출처 보기
                            </a>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl bg-white/70 backdrop-blur border border-neutral-100 p-6 md:p-8 text-center">
                    <h3 className="text-base md:text-lg font-extrabold mb-1.5">자사몰 리뷰 작성</h3>
                    <p className="text-sm text-neutral-500 mb-5">
                        구매 후 실제 사용 후기를 남겨주시면 다른 고객에게 도움이 됩니다.
                    </p>
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold shadow-card hover:shadow-hover transition"
                    >
                        <i className="fa-solid fa-pen-to-square" />
                        리뷰 작성하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-white/70 backdrop-blur border border-neutral-100 p-8 md:p-12 text-center max-w-2xl mx-auto">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-amber-500 text-xl">
                <i className="fa-regular fa-star" />
            </div>
            <h3 className="text-base md:text-lg font-extrabold mb-1.5">아직 자사몰 리뷰가 없습니다</h3>
            <p className="text-sm text-neutral-500 mb-6">
                구매 후 실제 사용 후기를 남겨주시면<br className="hidden md:block" />
                다른 고객에게 도움이 됩니다.
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
