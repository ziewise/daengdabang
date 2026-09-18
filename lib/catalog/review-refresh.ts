import { reviewSourceUrl, type ReviewSnippet } from './review-groups.ts';

export type ReviewUpdate = {
    collectedAt: string;
    count: number;
    average: number | null;
    snippets: ReviewSnippet[];
};

/** Read-only overlay: the historical catalog, options and original review text remain intact. */
export function applyReviewRefresh<T extends { externalReviewUrl?: string; externalReviewSnippets?: ReviewSnippet[] }>(
    row: T, updates: Record<string, ReviewUpdate>,
): T {
    const url = reviewSourceUrl(row.externalReviewUrl);
    const update = url ? updates[url] : undefined;
    if (!update || !Number.isFinite(Date.parse(update.collectedAt)) || !Number.isInteger(update.count) || update.count < 0 ||
        !Array.isArray(update.snippets) || update.snippets.some(item => !item || typeof item !== 'object' || reviewSourceUrl(item.sourceUrl) !== url || typeof item.text !== 'string' || !item.text.trim() || (item.rating !== undefined && !['', '1', '2', '3', '4', '5'].includes(item.rating))) ||
        (update.average !== null && !(typeof update.average === 'number' && update.average >= 1 && update.average <= 5))) return row;
    const previousTime = Math.max(0, ...(row.externalReviewSnippets ?? []).map(item => Date.parse(item.collectedAt ?? '') || 0));
    if (Date.parse(update.collectedAt) < previousTime) return row;
    return { ...row, externalReviewCount: update.count, externalReviewAverage: update.average,
        externalReviewSnippets: update.snippets };
}
