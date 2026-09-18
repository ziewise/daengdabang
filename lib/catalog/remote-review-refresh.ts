import { aggregateReviews, reviewedSummary, type ReviewSnippet, type ReviewSource, type ReviewedSummary } from './review-groups.ts';
import { applyReviewRefresh, type ReviewUpdate } from './review-refresh.ts';

/** Reject partial or mismatched server responses as a unit; keep the static fallback. */
export function acceptRemoteReviewRefresh(groupKey: string, sources: ReviewSource[], snippets: ReviewSnippet[], payload: unknown) {
    if (!payload || typeof payload !== 'object') return undefined;
    const data = payload as {schema?: string; groupKey?: string; sources?: Record<string, ReviewUpdate>; summary?: ReviewedSummary};
    if (data.schema !== 'ddb.review-refresh.v1' || data.groupKey !== groupKey || !data.sources || !data.summary ||
        !Array.isArray(data.summary.tags) || data.summary.tags.some(t => typeof t !== 'string') || !Array.isArray(data.summary.sourceKeys) || data.summary.sourceKeys.some(k => typeof k !== 'string') ||
        typeof data.summary.headline !== 'string' || typeof data.summary.body !== 'string') return undefined;
    const allowed = new Set(sources.map(source => source.url));
    if (Object.keys(data.sources).some(url => !allowed.has(url))) return undefined;
    const rows = sources.map(source => ({ externalReviewUrl: source.url, externalReviewCount: source.count,
        externalReviewAverage: source.average, externalReviewSnippets: snippets.filter(s => s.sourceUrl === source.url) }));
    const projected = rows.map(row => applyReviewRefresh(row, data.sources!));
    for (let i = 0; i < rows.length; i++) {
        if (data.sources[rows[i].externalReviewUrl] && projected[i] === rows[i]) return undefined;
    }
    const reviews = aggregateReviews(projected);
    const summary = reviewedSummary(data.summary, reviews.snippets);
    return summary ? {reviews, summary} : undefined;
}
