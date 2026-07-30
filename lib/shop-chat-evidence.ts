export type ShopChatSource = {
    id?: string;
    name: string;
    url: string;
    publishedAt?: string;
    retrievedAt?: string;
};

export type ShopChatResearch = {
    mode?: string;
    sourceCount?: number;
    domains?: string[];
    freshnessStatus?: string;
    freshAsOf?: string;
    searchedAt?: string;
};

const MAX_SOURCE_COUNT = 6;
const MAX_SOURCE_NAME_LENGTH = 160;
const MAX_SOURCE_URL_LENGTH = 2048;
const MAX_IDENTIFIER_LENGTH = 64;
const MAX_TOKEN_LENGTH = 64;
const MAX_TIMESTAMP_LENGTH = 80;
const MAX_DOMAIN_LENGTH = 253;

function boundedText(value: unknown, maxLength: number) {
    if (typeof value !== "string") return undefined;
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized) return undefined;
    return normalized.slice(0, maxLength);
}

function normalizedIdentifier(value: unknown) {
    const candidate = typeof value === "number" && Number.isSafeInteger(value)
        ? String(value)
        : boundedText(value, MAX_IDENTIFIER_LENGTH);
    if (!candidate || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(candidate)) return undefined;
    return candidate;
}

function normalizedToken(value: unknown) {
    const candidate = boundedText(value, MAX_TOKEN_LENGTH);
    if (!candidate || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(candidate)) return undefined;
    return candidate;
}

function normalizedHttpsUrl(value: unknown) {
    if (typeof value !== "string") return undefined;
    const candidate = value.trim();
    if (!candidate || candidate.length > MAX_SOURCE_URL_LENGTH) return undefined;
    try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) return undefined;
        const normalized = parsed.toString();
        return normalized.length <= MAX_SOURCE_URL_LENGTH ? normalized : undefined;
    } catch {
        return undefined;
    }
}

function normalizedTimestamp(value: unknown) {
    const candidate = boundedText(value, MAX_TIMESTAMP_LENGTH);
    if (!candidate) return undefined;
    const timestamp = Date.parse(candidate);
    if (!Number.isFinite(timestamp)) return undefined;
    const normalized = new Date(timestamp);
    const year = normalized.getUTCFullYear();
    if (year < 2000 || year > 2100) return undefined;
    return normalized.toISOString();
}

function firstValue(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        if (record[key] !== undefined && record[key] !== null) return record[key];
    }
    return undefined;
}

function normalizedDomain(value: unknown) {
    const candidate = boundedText(value, MAX_DOMAIN_LENGTH)?.toLowerCase().replace(/^www\./, "");
    if (!candidate || candidate.includes("..") || !/^[a-z0-9.-]+$/.test(candidate)) return undefined;
    if (candidate.startsWith(".") || candidate.endsWith(".")) return undefined;
    return candidate;
}

export function normalizeShopChatSources(value: unknown): ShopChatSource[] {
    if (!Array.isArray(value)) return [];
    const sources: ShopChatSource[] = [];
    const seenUrls = new Set<string>();
    for (const item of value.slice(0, 24)) {
        if (!item || typeof item !== "object" || Array.isArray(item)) continue;
        const record = item as Record<string, unknown>;
        const name = boundedText(record.name, MAX_SOURCE_NAME_LENGTH);
        const url = normalizedHttpsUrl(record.url);
        if (!name || !url || seenUrls.has(url)) continue;
        seenUrls.add(url);
        const id = normalizedIdentifier(firstValue(record, ["id", "citationId", "citation_id"]));
        const publishedAt = normalizedTimestamp(firstValue(record, ["publishedAt", "published_at"]));
        const retrievedAt = normalizedTimestamp(
            firstValue(record, ["retrievedAt", "retrieved_at", "capturedAt", "captured_at"]),
        );
        sources.push({
            ...(id ? { id } : {}),
            name,
            url,
            ...(publishedAt ? { publishedAt } : {}),
            ...(retrievedAt ? { retrievedAt } : {}),
        });
        if (sources.length >= MAX_SOURCE_COUNT) break;
    }
    return sources;
}

export function normalizeShopChatResearch(value: unknown): ShopChatResearch | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    const record = value as Record<string, unknown>;
    const mode = normalizedToken(record.mode);
    const rawCount = record.sourceCount ?? record.source_count;
    const sourceCount = typeof rawCount === "number" && Number.isFinite(rawCount)
        ? Math.max(0, Math.min(1000, Math.trunc(rawCount)))
        : undefined;
    const rawDomains = Array.isArray(record.domains) ? record.domains : [];
    const domains = Array.from(new Set(rawDomains.map(normalizedDomain).filter((item): item is string => Boolean(item)))).slice(0, 6);
    const freshnessStatus = normalizedToken(record.freshnessStatus ?? record.freshness_status);
    const freshAsOf = normalizedTimestamp(record.freshAsOf ?? record.fresh_as_of);
    const searchedAt = normalizedTimestamp(
        record.searchedAt ?? record.searched_at ?? record.searchCompletedAt ?? record.search_completed_at,
    );
    if (!mode && sourceCount === undefined && !domains.length && !freshnessStatus && !freshAsOf && !searchedAt) {
        return undefined;
    }
    return {
        ...(mode ? { mode } : {}),
        ...(sourceCount !== undefined ? { sourceCount } : {}),
        ...(domains.length ? { domains } : {}),
        ...(freshnessStatus ? { freshnessStatus } : {}),
        ...(freshAsOf ? { freshAsOf } : {}),
        ...(searchedAt ? { searchedAt } : {}),
    };
}

const STOREFRONT_PRODUCT_TERMS_RE = /(?:댕다방|애견\s*(?:용품|샵)|반려견\s*용품|반려동물\s*용품|하네스|목줄|리드줄|사료|간식|트릿|장난감|노즈워크|샴푸|배변패드|고글|레인코트|강아지\s*옷|펫\s*(?:용품|샵|가방|카시트|유모차))/i;
const CANINE_CONTEXT_RE = /(?:강아지|반려견|댕댕|멍멍|퍼피|노견|노령견|시니어견|우리\s*개|dog|puppy|canine)/i;
const SHOPPING_INTENT_RE = /(?:추천|상품|제품|용품|구매|가격|최저가|비교|골라|사도|살만|브랜드|사이즈|배송|주문|할인)/i;

export function shouldUseGeneralVerificationFallback(message: string, protectedRouteAvailable = false) {
    const normalized = String(message || "").trim();
    if (!normalized || protectedRouteAvailable) return false;
    const storefrontShoppingRequest = STOREFRONT_PRODUCT_TERMS_RE.test(normalized)
        || (CANINE_CONTEXT_RE.test(normalized) && SHOPPING_INTENT_RE.test(normalized));
    return !storefrontShoppingRequest;
}

export function isCurrentInformationRequest(message: string) {
    return /(?:오늘|지금|현재|최신|실시간|방금|이번\s*(?:주|달|분기|해)|뉴스|날씨|기온|환율|주가|시세|순위|랭킹|검색|찾아\s*(?:줘|주세요)?|알아봐|출처|근거|인터넷|웹에서)/i.test(message);
}
