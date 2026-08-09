import { ddbApiBase } from "@/lib/ddb-api-base";
import {
    GOODS_CONTEST_CATALOG,
    type GoodsContestItemId,
} from "@/lib/goods-contest";

export type GrowthGoodsItemContent = {
    name: string;
    summary: string;
    expectedPriceKrw: number;
    active: boolean;
};

export type GrowthGoodsContent = {
    kicker: string;
    title: string;
    description: string;
    escrowNotice: string;
    items: Record<GoodsContestItemId, GrowthGoodsItemContent>;
};

export type GrowthHubPublishedContent = {
    hero: {
        kicker: string;
        badge: string;
        titlePrefix: string;
        titleHighlight: string;
        titleSuffix: string;
        description: string;
    };
    today: {
        kicker: string;
        title: string;
        description: string;
    };
    commerce: {
        guestTitle: string;
        memberTitle: string;
        profileTitle: string;
        aiRecordTitle: string;
        description: string;
        secondaryCtaLabel: string;
        secondaryCtaHref: string;
    };
    goods: GrowthGoodsContent;
    visibility: {
        localCare: boolean;
        programs: boolean;
        policy: boolean;
    };
};

const DEFAULT_GROWTH_GOODS_ITEMS = Object.fromEntries(
    GOODS_CONTEST_CATALOG.map((item) => [item.id, {
        name: item.defaultName,
        summary: item.defaultSummary,
        expectedPriceKrw: item.defaultExpectedPriceKrw,
        active: true,
    }]),
) as Record<GoodsContestItemId, GrowthGoodsItemContent>;

export const DEFAULT_GROWTH_GOODS_CONTENT: GrowthGoodsContent = {
    kicker: "DAENGDABANG GOODS CONTEST",
    title: "500명의 선택으로 다음 굿즈를 함께 정해요",
    description: "마음에 드는 굿즈를 선택해 주세요. 각 상품이 500명의 선택을 모으면 최종 제작 조건을 다시 안내합니다.",
    escrowNotice: "에스크로는 향후 별도 결제 단계에서 구매자를 보호하기 위한 제도이며, 현재 선택 단계에는 적용되지 않습니다.",
    items: DEFAULT_GROWTH_GOODS_ITEMS,
};

export type PublishedGrowthContentReceipt = {
    version: number;
    content: GrowthHubPublishedContent;
};

export const DEFAULT_GROWTH_HUB_CONTENT: GrowthHubPublishedContent = {
    hero: {
        kicker: "DAENGDABANG TREASURE MINE",
        badge: "오늘 기능 운영 중",
        titlePrefix: "매일 하나씩,",
        titleHighlight: "우리 아이 돌봄 보물",
        titleSuffix: "을 모아요",
        description: "출근도장·작은 돌봄·AI 기록을 오늘의 한 흐름으로 묶었어요. 새 프로그램은 한곳에서 준비 상태만 확인해 페이지가 복잡해지지 않도록 했습니다.",
    },
    today: {
        kicker: "TODAY'S TREASURE",
        title: "오늘 바로 할 수 있는 돌봄부터",
        description: "도장 찍고, 작은 돌봄 하나를 끝내고, 우리 아이 변화를 살펴보세요. 준비 중인 혜택은 아래에 따로 모아뒀어요.",
    },
    commerce: {
        guestTitle: "돌봄을 살펴본 뒤 쇼핑으로 자연스럽게 이어가세요",
        memberTitle: "우리 아이 프로필을 등록하면 맞춤 추천을 시작할 수 있어요",
        profileTitle: "우리 아이 프로필을 상품 선택에 참고해요",
        aiRecordTitle: "우리 아이 프로필과 확인된 AI 기록을 상품 선택에 참고해요",
        description: "프로필 맞춤 추천 또는 판매량 순위가 아닌 댕다방 추천 셀렉트로 이어보세요.",
        secondaryCtaLabel: "추천 셀렉트 보기",
        secondaryCtaHref: "/best/",
    },
    goods: DEFAULT_GROWTH_GOODS_CONTENT,
    visibility: {
        localCare: true,
        programs: true,
        policy: true,
    },
};

function boundedString(value: unknown, min: number, max: number): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized.length >= min && normalized.length <= max ? normalized : null;
}

function safeStorefrontHref(value: unknown): string | null {
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("%") || value.includes("\\") || value.includes("?")) return null;
    if (value.split("/").some((part) => part === "." || part === "..")) return null;
    if (/^\/(?:api|admin|_next)(?:\/|$)/i.test(value)) return null;
    return value;
}

function boundedInteger(value: unknown, min: number, max: number): number | null {
    return Number.isInteger(value) && Number(value) >= min && Number(value) <= max
        ? Number(value)
        : null;
}

function normalizedGoodsContent(raw: unknown): GrowthGoodsContent {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return DEFAULT_GROWTH_GOODS_CONTENT;
    const goods = raw as Record<string, unknown>;
    const rawItems = goods.items && typeof goods.items === "object" && !Array.isArray(goods.items)
        ? goods.items as Record<string, unknown>
        : {};
    const items = Object.fromEntries(GOODS_CONTEST_CATALOG.map((catalogItem) => {
        const fallback = DEFAULT_GROWTH_GOODS_CONTENT.items[catalogItem.id];
        const candidate = rawItems[catalogItem.id];
        const item = candidate && typeof candidate === "object" && !Array.isArray(candidate)
            ? candidate as Record<string, unknown>
            : {};
        return [catalogItem.id, {
            name: boundedString(item.name, 2, 80) || fallback.name,
            summary: boundedString(item.summary, 5, 240) || fallback.summary,
            expectedPriceKrw: boundedInteger(
                item.expected_price_krw ?? item.expectedPriceKrw,
                1_000,
                500_000,
            ) ?? fallback.expectedPriceKrw,
            active: typeof item.active === "boolean" ? item.active : fallback.active,
        }];
    })) as Record<GoodsContestItemId, GrowthGoodsItemContent>;

    return {
        kicker: boundedString(goods.kicker, 2, 80) || DEFAULT_GROWTH_GOODS_CONTENT.kicker,
        title: boundedString(goods.title, 2, 140) || DEFAULT_GROWTH_GOODS_CONTENT.title,
        description: boundedString(goods.description, 10, 420) || DEFAULT_GROWTH_GOODS_CONTENT.description,
        escrowNotice: boundedString(
            goods.escrow_notice ?? goods.escrowNotice,
            10,
            420,
        ) || DEFAULT_GROWTH_GOODS_CONTENT.escrowNotice,
        items,
    };
}

function normalizedContent(raw: unknown): GrowthHubPublishedContent | null {
    if (!raw || typeof raw !== "object") return null;
    const content = raw as Record<string, unknown>;
    const hero = content.hero as Record<string, unknown> | undefined;
    const today = content.today as Record<string, unknown> | undefined;
    const commerce = content.commerce as Record<string, unknown> | undefined;
    const goods = content.goods;
    const visibility = content.visibility as Record<string, unknown> | undefined;
    if (!hero || !today || !commerce || !visibility) return null;

    const result: GrowthHubPublishedContent = {
        hero: {
            kicker: boundedString(hero.kicker, 2, 80) || "",
            badge: boundedString(hero.badge, 2, 40) || "",
            titlePrefix: boundedString(hero.title_prefix, 1, 80) || "",
            titleHighlight: boundedString(hero.title_highlight, 1, 100) || "",
            titleSuffix: boundedString(hero.title_suffix, 0, 80) ?? "",
            description: boundedString(hero.description, 10, 420) || "",
        },
        today: {
            kicker: boundedString(today.kicker, 2, 80) || "",
            title: boundedString(today.title, 2, 120) || "",
            description: boundedString(today.description, 10, 360) || "",
        },
        commerce: {
            guestTitle: boundedString(commerce.guest_title, 2, 140) || "",
            memberTitle: boundedString(commerce.member_title, 2, 140) || "",
            profileTitle: boundedString(commerce.profile_title, 2, 140) || "",
            aiRecordTitle: boundedString(commerce.ai_record_title, 2, 160) || "",
            description: boundedString(commerce.description, 10, 320) || "",
            secondaryCtaLabel: boundedString(commerce.secondary_cta_label, 2, 50) || "",
            secondaryCtaHref: safeStorefrontHref(commerce.secondary_cta_href) || "",
        },
        goods: normalizedGoodsContent(goods),
        visibility: {
            localCare: visibility.local_care === true,
            programs: visibility.programs === true,
            policy: visibility.policy === true,
        },
    };
    if (
        [result.hero.kicker, result.hero.badge, result.hero.titlePrefix, result.hero.titleHighlight, result.hero.description].some((value) => value === "")
        || Object.values(result.today).some((value) => value === "")
        || Object.values(result.commerce).some((value) => value === "")
        || [visibility.local_care, visibility.programs, visibility.policy].some((value) => typeof value !== "boolean")
    ) return null;
    return result;
}

export async function loadPublishedGrowthContent(signal?: AbortSignal): Promise<PublishedGrowthContentReceipt | null> {
    const base = ddbApiBase();
    if (!base) return null;
    try {
        const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/growth/content`, {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal,
        });
        if (!response.ok) return null;
        const payload = await response.json() as Record<string, unknown>;
        const content = normalizedContent(payload.content);
        if (
            !Number.isInteger(payload.version)
            || Number(payload.version) < 0
            || !content
        ) return null;
        return {
            version: Number(payload.version),
            content,
        };
    } catch {
        return null;
    }
}
