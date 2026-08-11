export const SHOWCASE_CANONICAL_ORIGIN = "https://www.daengdabang.com";
export const SHOWCASE_POST_ID_PATTERN = /^dsp_[A-Za-z0-9_-]{20,32}$/;
export const SHOWCASE_TOPIC_ID_PATTERN = /^dst_[A-Za-z0-9_-]{12,40}$/;
export const SHOWCASE_AUTHOR_ID_PATTERN = /^dsa_[A-Za-z0-9_-]{20,32}$/;

const SHOWCASE_PATH = "/daeng-showcase/";
const CAMPAIGN_QUERY_FIELDS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
] as const;

export type ShowcaseCampaign = Partial<Record<typeof CAMPAIGN_QUERY_FIELDS[number], string>>;

export type ShowcaseDeepLinkInput = {
    baseUrl?: string;
    postId?: string;
    topicId?: string;
    authorId?: string;
    campaign?: ShowcaseCampaign;
};

function campaignLabel(value: unknown): string {
    return String(value || "")
        .trim()
        .replace(/[^0-9A-Za-z._-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 100);
}

function showcaseBaseUrl(): URL {
    return new URL(SHOWCASE_PATH, SHOWCASE_CANONICAL_ORIGIN);
}

function sourceParams(value?: string): URLSearchParams {
    if (!value) return new URLSearchParams();
    try {
        return new URL(value, SHOWCASE_CANONICAL_ORIGIN).searchParams;
    } catch {
        return new URLSearchParams();
    }
}

/**
 * Builds the only public showcase link shape shared by cards, topics, and auth
 * round-trips. Unknown query values are dropped; campaign labels never contain
 * free-form captions, names, or other user content.
 */
export function buildShowcaseDeepLink(input: ShowcaseDeepLinkInput = {}): string {
    const url = showcaseBaseUrl();
    const source = sourceParams(input.baseUrl);
    const sourcePostId = source.get("post") || "";
    const sourceTopicId = source.get("topic") || "";
    const sourceAuthorId = source.get("author") || "";
    const postId = input.postId === undefined ? sourcePostId : input.postId;
    const topicId = input.topicId === undefined ? sourceTopicId : input.topicId;
    const authorId = input.authorId === undefined ? sourceAuthorId : input.authorId;

    if (SHOWCASE_POST_ID_PATTERN.test(postId)) url.searchParams.set("post", postId);
    if (SHOWCASE_TOPIC_ID_PATTERN.test(topicId)) url.searchParams.set("topic", topicId);
    if (SHOWCASE_AUTHOR_ID_PATTERN.test(authorId)) url.searchParams.set("author", authorId);

    for (const field of CAMPAIGN_QUERY_FIELDS) {
        const rawValue = input.campaign?.[field] ?? source.get(field);
        const value = campaignLabel(rawValue);
        if (value) url.searchParams.set(field, value);
    }

    return url.toString();
}

export function showcaseReturnPath(
    currentUrl: string,
    overrides: Pick<ShowcaseDeepLinkInput, "postId" | "topicId" | "authorId"> = {},
): string {
    const url = new URL(buildShowcaseDeepLink({ baseUrl: currentUrl, ...overrides }));
    return `${url.pathname}${url.search}`;
}

/** Rebuilds an API-provided topic link around the expected topic identity. */
export function buildShowcaseTopicShareLink(value: string, expectedTopicId: string): string {
    return buildShowcaseDeepLink({
        baseUrl: value,
        topicId: expectedTopicId,
    });
}

export function showcaseAuthHref(
    mode: "login" | "signup",
    currentUrl: string,
): string {
    return `/auth/${mode}?redirect=${encodeURIComponent(showcaseReturnPath(currentUrl))}`;
}

export function showcaseMemberShareCampaign(content: string): ShowcaseCampaign {
    return {
        utm_source: "member_share",
        utm_medium: "referral",
        utm_campaign: "daeng_showcase",
        utm_content: campaignLabel(content),
    };
}
