export type ReviewSnippet = { rating?: string; summary?: string; text: string; sourceUrl?: string; reviewId?: string; collectedAt?: string; date?: string };
export type ReviewSource = { url: string; count: number; average: number | null };
type ReviewRow = {
    folder?: string;
    externalReviewUrl?: string;
    externalReviewCount?: number;
    externalReviewAverage?: number | null;
    externalReviewSnippets?: ReviewSnippet[];
};
export type ProductGroup = { key: string; canonical: string; members: string[] };
export type ReviewedSummary = { headline: string; body: string; tags: string[]; sourceKeys: string[]; generatedAt?: string; collectedAt?: string; sampleCount?: number };

/** Scraped author/date labels are metadata, not review bodies. Retain them in source records only. */
export function hasReviewBody(item: ReviewSnippet): boolean {
    return !!item.text?.trim() && !/^[\w.*-]+\s*\d{2,4}\.\d{2}\.\d{2}\.?$/.test(item.text.trim());
}

/** Withhold an old AI summary whenever the exact reviewed excerpts change. */
export function reviewedSummary(summary: ReviewedSummary | undefined, snippets: readonly ReviewSnippet[]) {
    if (!summary || snippets.filter(hasReviewBody).length < 3) return undefined;
    const keys = snippets.map(s => `${s.sourceUrl ?? ""}\n${s.rating ?? ""}\n${s.text}`).sort();
    return JSON.stringify(keys) === JSON.stringify(summary.sourceKeys) ? summary : undefined;
}

export function reviewSourceUrl(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    try {
        const url = new URL(value);
        if (url.protocol !== "https:" || !["smartstore.naver.com", "brand.naver.com"].includes(url.hostname)) return undefined;
        if (!/^\/[^/]+\/products\/\d+\/?$/.test(url.pathname)) return undefined;
        return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
    } catch { return undefined; }
}

/** Only the exact linked source product supplies this product's reviews.
 * Listing families may include redesigned seasons and are not review identity.
 */
export function exactReviewRows<T extends ReviewRow>(row: T, rows: readonly T[]): T[] {
    const url = reviewSourceUrl(row.externalReviewUrl);
    return url ? rows.filter(source => reviewSourceUrl(source.externalReviewUrl) === url) : [];
}

export function reviewSellerLabel(value: unknown): string {
    const url = reviewSourceUrl(value);
    if (!url) return "외부 판매점";
    const slug = new URL(url).pathname.split('/')[1];
    return slug === 'daengdabang' ? '(주)내츄럴랩스 · 네이버 daengdabang' : `네이버 ${slug}`;
}

/** A read-only projection. Original records and IDs are never rewritten or removed. */
export function aggregateReviews(rows: readonly ReviewRow[]) {
    const sources = new Map<string, ReviewSource>();
    const snippets: ReviewSnippet[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
        const url = reviewSourceUrl(row.externalReviewUrl);
        const count = Number.isInteger(row.externalReviewCount) && Number(row.externalReviewCount) > 0 ? Number(row.externalReviewCount) : 0;
        const average = typeof row.externalReviewAverage === "number" && Number.isFinite(row.externalReviewAverage) && row.externalReviewAverage >= 1 && row.externalReviewAverage <= 5 ? row.externalReviewAverage : null;
        if (url && (!sources.has(url) || count > sources.get(url)!.count)) sources.set(url, { url, count, average });
        for (const item of row.externalReviewSnippets ?? []) {
            if (!item.text?.trim()) continue;
            // No review IDs were supplied: collapse identical excerpts only within one source.
            const sourceUrl = reviewSourceUrl(item.sourceUrl) ?? url;
            const key = item.reviewId ? JSON.stringify([sourceUrl ?? row.folder, item.reviewId]) : JSON.stringify([sourceUrl ?? row.folder, item.rating, item.summary, item.text]);
            if (seen.has(key)) continue;
            seen.add(key);
            snippets.push({ ...item, sourceUrl });
        }
    }
    const sourceList = [...sources.values()];
    const count = sourceList.reduce((sum, source) => sum + source.count, 0);
    const ratedSources = sourceList.filter(source => source.count && source.average !== null);
    const ratedCount = ratedSources.reduce((sum, source) => sum + source.count, 0);
    const average = ratedCount ? ratedSources.reduce((sum, source) => sum + source.count * source.average!, 0) / ratedCount : null;
    const ratings = snippets.map(item => Number(item.rating)).filter(rating => Number.isInteger(rating) && rating >= 1 && rating <= 5);
    return { sources: sourceList, snippets, count, average, sampleCount: snippets.length,
        ratedSampleCount: ratings.length,
        distribution: [5, 4, 3, 2, 1].map(rating => ({ rating, count: ratings.filter(value => value === rating).length })),
        positivePercent: ratings.length ? Math.round(100 * ratings.filter(rating => rating >= 4).length / ratings.length) : null };
}

export function groupForFolder(groups: readonly ProductGroup[], folder?: string) {
    return folder ? groups.find(group => group.members.includes(folder)) : undefined;
}

export function visibleProductGroups<T extends { folder?: string; supplierCatalogHistorical?: boolean }>(products: readonly T[], groups: readonly ProductGroup[]): T[] {
    const current = new Set(products.filter(p => p.supplierCatalogHistorical !== true).map(p => p.folder));
    return products.filter(product => {
        const group = groupForFolder(groups, product.folder);
        return !group || !current.has(group.canonical) || product.folder === group.canonical;
    });
}
