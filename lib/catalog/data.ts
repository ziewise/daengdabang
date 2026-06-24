import rawCatalog from "./raw.json";
import { SUBCAT_ICON, SUBCAT_TO_CAT } from "./labels";
import type { CatalogProduct, CatalogRow, PromoSlug, SubcategorySlug } from "./types";

const CATALOG_DATA_REVISION = "video-cdn-20260616";

function storefrontVideoUrl(video: string | undefined): string | undefined {
    return video;
}

const textOf = (row: CatalogRow) =>
    [row.useMain, row.useSub, row.name, row.categorizeNote, row.season, row.target]
        .filter(Boolean)
        .join(" ");

const categoryTextOf = (row: CatalogRow) =>
    [row.useMain, row.useSub, row.name, row.folder]
        .filter(Boolean)
        .join(" ");

const usageTextOf = (row: CatalogRow) => [row.useMain, row.useSub].filter(Boolean).join(" ");
const nameTextOf = (row: CatalogRow) => [row.name, row.folder].filter(Boolean).join(" ");

function has(text: string, pattern: RegExp) {
    return pattern.test(text);
}

function mapSubcategory(row: CatalogRow): SubcategorySlug {
    const text = categoryTextOf(row);
    const usageText = usageTextOf(row);
    const nameText = nameTextOf(row);
    const feedingText = has(text, /식기|급식|급수|보울|그릇|물병|정수기|오볼|타우러스|피더|리킹|Lick|밥그릇|급체|천천히 먹|슬로우독|slowdog|slow dog/i);
    const carrierText = has(text, /이동|가방|백팩|배낭|힙\s*팩|데이팩|카시트|유모차|캐리어|트레일러|웨건/i);
    const dessertText = !carrierText && has(nameText, /아이스크림|댕크림|요거트|소주|와인|맥주|음료/i);
    const treatPouchText = has(nameText, /트릿백|트릿 트레이더|간식주머니|treattrader/i);
    const explicitToyText =
        has(usageText, /장난감/i) ||
        has(nameText, /장난감|토이|toy|트로비즈|trovbiz|피그볼|치킨볼|볼런쳐|볼\s*토이|ball\s*toy|런커|낫 어 스틱|낫어스틱|우드스틱|포시니|모렐|토드스툴|퍼시픽 루프/i) ||
        (has(nameText, /원반|프리스비|플라이어|디스크/i) && !feedingText);

    if (dessertText) return "dessert";
    if (has(text, /발바닥|발 세정|풋|패드 케어|발세정|프리풋/i)) return "paw";
    if (has(nameText, /크림|밤|미스트|향수|샴푸|브러시|스킨|입욕|비누|클렌저|에센스|퍼퓸|모발영양|브러싱/i)) return "cream";
    if (row.isHygiene || has(text, /위생|배변|배변패드|배변봉투|기저귀|탈취|칫솔|치약|물티슈/i)) return "hygiene";

    if (explicitToyText) {
        if (has(nameText, /노즈워크|퍼즐|지능/i)) return "nosework";
        if (has(nameText, /터그|로프|tug|당기기|루프/i)) return "tug";
        return "latex";
    }

    if (feedingText) return "bowl";
    if (treatPouchText) return "carrier";

    if (has(text, /하네스/i)) return "harness";
    if (has(text, /리드줄|목줄|초크|Leash|Collar/i)) return "leash";
    if (has(text, /고글|안경|아이웨어|보호안경|비콘|세이프티\s*라이트|안전\s*라이트|야간산책.*라이트/i)) return "goggles";
    if (carrierText) return "carrier";
    if (has(text, /의류|자켓|재킷|코트|베스트|쿨러|부츠|신발|양말|보호대|후디|패딩|구명 ?조끼|우비|판초|스노우 슈트/i)) return "wear";

    if (has(text, /디저트|음료|아이스크림|소주|와인|맥주|요거트|댕크림/i)) return "dessert";
    if (has(text, /간식|트릿|츄|껌|캔디|비스킷|저키/i)) return "treats";
    if (has(text, /영양|보조|관절|유산균|오메가|비타민|보충/i)) return "supplement";
    if (row.isFood || has(text, /사료|푸드|건식|습식|스튜|바프|키블|Yora|요라/i)) return "drysoy";

    if (has(text, /쿠션|침대|방석|매트|카페트|침구|베드|도넛/i)) return "cushion";

    if (has(text, /노즈워크|퍼즐|지능/i)) return "nosework";
    if (has(text, /터그|로프|당기기/i)) return "tug";
    if (has(nameText, /라텍스|인형/i)) return "latex";

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

/**
 * 제품명 끝에 붙은 "강아지" / "강아지 24" / "강아지 23" 꼬리표 제거.
 * 네이버 스마트스토어 상품명을 크롤링할 때 타겟 키워드("강아지")와 연도(23·24)가
 * 이름 끝에 그대로 딸려 들어온 잔재라, 화면·검색·정렬에 쓰는 이름에서만 떼어낸다.
 * (원본 raw.json 의 row.name 은 출처 대조용으로 그대로 보존)
 *   - 이름 "맨 끝"의 꼬리표만 제거($ 앵커) → 이름 중간에 들어간 "강아지"는 보존
 *   - 뒤따르는 연도 숫자(예: 24·23)도 사용자 요청대로 함께 제거
 */
function cleanProductName(name: string): string {
    // 끝의  "강아지" + (선택: 공백/연도숫자) + 남은 공백  을 통째로 제거 후 트림
    return name.replace(/\s*강아지\s*\d*\s*$/, "").trim();
}

function buildCatalog(revision = CATALOG_DATA_REVISION): CatalogProduct[] {
    return (rawCatalog as CatalogRow[]).map((row) => {
        const subcategory = mapSubcategory(row);
        const category = SUBCAT_TO_CAT[subcategory];

        return {
            id: `p_${row.no}`,
            no: row.no,
            name: cleanProductName(row.name),
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
