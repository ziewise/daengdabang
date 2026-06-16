import rawCatalog from "./raw.json";
import { SUBCAT_ICON, SUBCAT_TO_CAT } from "./labels";
import type { CatalogProduct, CatalogRow, PromoSlug, SubcategorySlug } from "./types";

const CATALOG_DATA_REVISION = "video-cdn-20260616";

function storefrontVideoUrl(video: string | undefined): string | undefined {
    if (!video) return video;
    const publicMarker = "/public/";
    const publicIndex = video.indexOf(publicMarker);
    if (publicIndex >= 0) {
        return `/${video.slice(publicIndex + publicMarker.length)}`;
    }
    return video;
}

const textOf = (row: CatalogRow) =>
    [row.useMain, row.useSub, row.name, row.categorizeNote, row.season, row.target]
        .filter(Boolean)
        .join(" ");

function has(text: string, pattern: RegExp) {
    return pattern.test(text);
}

function mapSubcategory(row: CatalogRow): SubcategorySlug {
    const text = textOf(row);

    if (has(text, /하네스/i)) return "harness";
    if (has(text, /리드|목줄|초크|Leash|Collar/i)) return "leash";
    if (has(text, /고글|안경|아이웨어|보호안경|Rex Specs/i)) return "goggles";
    if (has(text, /이동|가방|백팩|카시트|유모차|캐리어|트레일러|웨건/i)) return "carrier";
    if (has(text, /웨어|의류|자켓|재킷|코트|베스트|쿨러|부츠|신발|양말|보호대|후디|패딩/i)) return "wear";

    if (has(text, /디저트|음료|아이스크림|소주|와인|맥주|요거트|댕크림/i)) return "dessert";
    if (has(text, /간식|트릿|츄|껌|캔디|비스킷|저키/i)) return "treats";
    if (has(text, /영양|보조|관절|유산균|오메가|비타민|보충/i)) return "supplement";
    if (row.isFood || has(text, /사료|푸드|건식|습식|스튜|바프|키블|Yora|요라/i)) return "drysoy";

    if (has(text, /쿠션|침대|방석|매트|카페트|침구|베드|도넛/i)) return "cushion";
    if (has(text, /식기|급식|급수|보울|그릇|물병|정수기|오볼|타우러스/i)) return "bowl";

    if (has(text, /노즈워크|퍼즐|지능|슬로우/i)) return "nosework";
    if (has(text, /터그|로프|당기기/i)) return "tug";
    if (has(text, /라텍스|공|볼|장난감|토이|인형/i)) return "latex";

    if (has(text, /발바닥|발 세정|풋|패드 케어/i)) return "paw";
    if (row.isHygiene || has(text, /위생|배변|패드|기저귀|탈취|칫솔|치약|물티슈/i)) return "hygiene";
    if (has(text, /크림|밤|미스트|샴푸|브러시|스킨|케어|입욕|비누|클렌저/i)) return "cream";

    return "etc";
}

function mapPromos(row: CatalogRow): PromoSlug[] {
    const text = textOf(row);
    const promos = new Set<PromoSlug>();

    if (row.isWalk || has(text, /산책|외출|야간|안전|아웃도어|활동/i)) promos.add("active");
    if (row.seasonalFlag || has(text, /비|장마|방수|쿨|여름|겨울|보온|시즌|크리스마스/i)) promos.add("seasonal");
    if (has(text, /비|장마|방수|우비/i)) promos.add("rainy");
    if (has(text, /고글|눈|아이웨어|Rex Specs/i)) promos.add("eye");
    if (row.isFood || has(text, /사료|간식|영양|푸드|트릿|디저트|음료/i)) promos.add("food");

    return [...promos];
}

function brandSlug(row: CatalogRow): string {
    const source = row.brandEn || row.brandKo || "brand";
    return source
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function seededRand(no: number, salt: number): number {
    const x = Math.sin(no * 9301 + salt * 49297) * 233280;
    return x - Math.floor(x);
}

function buildMeta(row: CatalogRow) {
    const brandBoost = row.brandEn === "Ruffwear" ? 240 : row.brandEn === "Rex Specs" ? 180 : 70;
    const popularity = Math.round(brandBoost + seededRand(row.no, 1) * 760);
    const baseTs = new Date("2026-06-01T00:00:00+09:00").getTime();
    const addedAt = baseTs - Math.max(0, 360 - row.no) * 86400000;
    const salesCount = Math.round(popularity * 0.35 + seededRand(row.no, 2) * 180);
    const reviewCount = Number(row.externalReviewCount || 0);
    const rating = typeof row.externalReviewAverage === "number" ? row.externalReviewAverage : 0;
    const hasDiscount = row.priceNum > 0 && seededRand(row.no, 5) < 0.18;
    const discountRate = hasDiscount ? Math.round(5 + seededRand(row.no, 6) * 20) : 0;
    const originalPrice =
        discountRate > 0 ? Math.round(row.priceNum / (1 - discountRate / 100) / 100) * 100 : null;

    return { popularity, addedAt, salesCount, reviewCount, rating, discountRate, originalPrice };
}

function buildCatalog(revision = CATALOG_DATA_REVISION): CatalogProduct[] {
    return (rawCatalog as CatalogRow[]).map((row) => {
        const subcategory = mapSubcategory(row);
        const category = SUBCAT_TO_CAT[subcategory];

        return {
            id: `p_${row.no}`,
            no: row.no,
            name: row.name,
            brandKo: row.brandKo,
            brandEn: row.brandEn,
            brandSlug: brandSlug(row),
            price: row.priceNum || 0,
            priceText: row.priceText,
            category,
            subcategory,
            promos: mapPromos(row),
            ph: (((row.no - 1) % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6,
            icon: SUBCAT_ICON[subcategory],
            season: row.season || undefined,
            seasonalFlag: row.seasonalFlag,
            folder: row.folder,
            image: row.image,
            gallery: row.gallery,
            details: row.details,
            sizeImage: row.sizeImage,
            video: storefrontVideoUrl(row.video ? `${row.video}${revision ? "" : ""}` : row.video),
            externalReviewSource: row.externalReviewSource,
            externalReviewUrl: row.externalReviewUrl,
            externalReviewCount: row.externalReviewCount,
            externalReviewAverage: row.externalReviewAverage,
            externalReviewThemes: row.externalReviewThemes,
            externalReviewSnippets: row.externalReviewSnippets,
            externalReviewDisclosure: row.externalReviewDisclosure,
            raw: row,
            ...buildMeta(row),
        };
    });
}

export const CATALOG: CatalogProduct[] = buildCatalog();

export function findById(id: string): CatalogProduct | undefined {
    return CATALOG.find((product) => product.id === id || product.folder === id);
}
