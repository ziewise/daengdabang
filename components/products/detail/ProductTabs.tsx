/**
 * ProductTabs — 상세정보 / 리뷰 / Q&A 탭
 * ---------------------------------------------------------------------
 * 상세정보 탭:
 *   - details[] 배열의 이미지를 세로로 쌓아 표시
 *   - 접힘 상태: max-height 800px + 하단 페이드 그라데이션 + "상세정보 펼쳐보기" 버튼
 *   - 펼친 상태: 전부 표시 + 하단 "접기" 버튼
 *   - details 0개: 아무것도 안 보임 (안내 문구 X)
 *
 * 리뷰 / Q&A:
 *   - 빈 상태 + 작성/문의 버튼 (mock)
 */
"use client";

import { useState } from "react";
import Image from "next/image";
import type { CatalogProduct } from "@/lib/catalog";

type TabKey = "detail" | "review" | "qna";

interface Props {
    product: CatalogProduct;
}

export default function ProductTabs({ product: p }: Props) {
    const [tab, setTab] = useState<TabKey>("detail");
    const reviewCount = p.reviewCount;
    const qnaCount = 0; // mock

    return (
        <section className="mt-10 md:mt-14">
            {/* 탭 바 — sticky 가능 */}
            <div className="sticky top-[var(--header-height)] z-10 bg-background/95 backdrop-blur border-b border-neutral-200">
                <div className="flex gap-1">
                    <TabButton
                        active={tab === "detail"}
                        onClick={() => setTab("detail")}
                        label="상세 정보"
                    />
                    <TabButton
                        active={tab === "review"}
                        onClick={() => setTab("review")}
                        label="리뷰"
                        badge={reviewCount > 0 ? reviewCount.toLocaleString() : undefined}
                    />
                    <TabButton
                        active={tab === "qna"}
                        onClick={() => setTab("qna")}
                        label="Q&A"
                        badge={qnaCount > 0 ? String(qnaCount) : undefined}
                    />
                </div>
            </div>

            {/* 탭 콘텐츠 */}
            <div className="pt-8 md:pt-10">
                {tab === "detail" && <DetailContent product={p} />}
                {tab === "review" && <ReviewContent />}
                {tab === "qna" && <QnaContent />}
            </div>
        </section>
    );
}

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
            aria-pressed={active}
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

/* ============ 상세 정보 탭 ============ */
function DetailContent({ product: p }: { product: CatalogProduct }) {
    const [expanded, setExpanded] = useState(false);
    const details = p.details ?? [];

    // 이미지 없으면 빈 영역 (안내 문구 X)
    if (details.length === 0) {
        return <div className="min-h-[200px]" aria-hidden="true" />;
    }

    return (
        <div className="relative max-w-3xl mx-auto">
            {/* 이미지 영역 — 접힘 시 max-height 제한, 펼친 시 무제한 */}
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

            {/* 토글 버튼 */}
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

/* ============ 리뷰 탭 ============ */
function ReviewContent() {
    return (
        <div className="text-center py-16 md:py-24 max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-amber-500 text-2xl">
                <i className="fa-regular fa-star" />
            </div>
            <h3 className="text-base md:text-lg font-extrabold mb-1.5">아직 리뷰가 없습니다</h3>
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

/* ============ Q&A 탭 ============ */
function QnaContent() {
    return (
        <div className="text-center py-16 md:py-24 max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-aurora-indigo text-2xl">
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
