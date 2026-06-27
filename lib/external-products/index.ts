import { ddbApiBase } from "@/lib/customer-api";
import type { CategorySlug, SortKey, SubcategorySlug } from "@/lib/catalog";
import feed from "./feed.json";

export type ExternalProductResult = {
    id: string;
    title: string;
    brand: string;
    category: CategorySlug;
    subcategory: SubcategorySlug;
    sourceName: string;
    priceText: string;
    thumbnail: string;
    purchaseUrl: string;
    outboundUrl?: string;
    keywords: string[];
    rank: number;
    updatedAt?: string;
};

type ExternalFilter = {
    category?: CategorySlug;
    subcategory?: SubcategorySlug;
    sort?: SortKey;
    limit?: number;
};

type ExternalApiResponse = {
    results?: ExternalProductResult[];
};

const FEED = feed as ExternalProductResult[];

function normalize(text: string): string {
    return text
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[()[\]{}.,/_-]/g, "");
}

function queryTokens(query: string): string[] {
    return query
        .trim()
        .split(/\s+/)
        .map(normalize)
        .filter(Boolean);
}

function scoreResult(item: ExternalProductResult, tokens: string[]): number {
    if (tokens.length === 0) return 0;
    const title = normalize(item.title);
    const brand = normalize(item.brand);
    const keywords = item.keywords.map(normalize);
    let score = item.rank;

    for (const token of tokens) {
        if (title.includes(token)) score += 120;
        if (brand.includes(token)) score += 50;
        if (keywords.some((keyword) => keyword.includes(token) || token.includes(keyword))) score += 90;
    }
    return score;
}

function sortResults(list: ExternalProductResult[], sort?: SortKey): ExternalProductResult[] {
    const copy = [...list];
    if (sort === "newest") {
        return copy.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "") || b.rank - a.rank);
    }
    if (sort === "priceAsc" || sort === "priceDesc") {
        return copy.sort((a, b) => b.rank - a.rank);
    }
    return copy.sort((a, b) => b.rank - a.rank);
}

export function searchExternalProducts(query: string, filter: ExternalFilter = {}): ExternalProductResult[] {
    const tokens = queryTokens(query);
    if (tokens.length === 0) return [];

    const matches = FEED
        .map((item) => ({ item, score: scoreResult(item, tokens) }))
        .filter(({ item, score }) => {
            if (filter.category && item.category !== filter.category) return false;
            if (filter.subcategory && item.subcategory !== filter.subcategory) return false;
            return score > item.rank;
        })
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item);

    return sortResults(matches, filter.sort).slice(0, filter.limit ?? 12);
}

export async function loadExternalProducts(query: string, filter: ExternalFilter = {}): Promise<ExternalProductResult[]> {
    const fallback = searchExternalProducts(query, filter);
    const base = ddbApiBase();
    if (!base || !query.trim()) return fallback;

    const params = new URLSearchParams({
        q: query,
        limit: String(filter.limit ?? 12),
    });
    if (filter.category) params.set("category", filter.category);
    if (filter.subcategory) params.set("subcategory", filter.subcategory);
    if (filter.sort) params.set("sort", filter.sort);

    try {
        const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/search/external-products?${params.toString()}`);
        if (!response.ok) return fallback;
        const data = (await response.json()) as ExternalApiResponse;
        return Array.isArray(data.results) && data.results.length > 0 ? data.results : fallback;
    } catch {
        return fallback;
    }
}
