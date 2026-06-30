"use client";

/**
 * ProductShareActions — 제품 링크 복사 + 공유 (아이콘만)
 * ---------------------------------------------------------------------
 * 제품명 우측 상단에 작은 아이콘 버튼 2개로 노출.
 *  - 링크: campaignUrl(utm 포함) 클립보드 복사 → 잠깐 체크 아이콘으로 피드백.
 *  - 공유: navigator.share(모바일 네이티브 공유 시트)가 있으면 사용, 없으면 링크 복사로 폴백.
 * 캡션 복사 버튼은 불필요해 제거(아이콘만으로 의미 전달 충분).
 */

import { useMemo, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { productHref } from "@/lib/shop";

export default function ProductShareActions({ product }: { product: CatalogProduct }) {
    // 링크 복사 직후 잠깐 체크 아이콘으로 바꿔 "복사됨"을 알린다
    const [copied, setCopied] = useState(false);
    const href = productHref(product);
    // 공유/복사에 쓰는 캠페인 URL(SNS 유입 추적 utm 포함)
    const campaignUrl = useMemo(
        () => `https://www.daengdabang.com${href}?utm_source=social&utm_medium=share&utm_campaign=sns_launch`,
        [href]
    );

    // 링크 클립보드 복사 + 1.5초간 체크 표시
    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(campaignUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    };

    // 네이티브 공유 시트(모바일) — 없으면 링크 복사로 폴백
    const share = async () => {
        if (!navigator.share) {
            await copyLink();
            return;
        }
        try {
            await navigator.share({ title: product.name, text: product.name, url: campaignUrl });
        } catch {
            // 사용자가 공유 시트를 취소한 경우는 무시
        }
    };

    // 공통 아이콘 버튼 스타일(정사각 40px, 보더 + 호버 인디고)
    const btn =
        "flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition hover:border-indigo-300 hover:text-indigo-700";

    return (
        <div className="flex shrink-0 items-center gap-2">
            {/* 링크 복사 — 복사 직후 체크(초록)로 잠깐 전환 */}
            <button
                type="button"
                onClick={copyLink}
                className={btn}
                aria-label="링크 복사"
                title={copied ? "복사됨!" : "링크 복사"}
            >
                <i className={`fa-solid ${copied ? "fa-check text-emerald-600" : "fa-link"}`} />
            </button>
            {/* 공유 — 네이티브 공유 시트 / 폴백 링크 복사 */}
            <button type="button" onClick={share} className={btn} aria-label="공유" title="공유">
                <i className="fa-solid fa-share-nodes" />
            </button>
        </div>
    );
}
