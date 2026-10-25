/**
 * promo-season — 웹 기획전 "시즌 기획전 · 산책용 상품" 고르기 · 2026-10-25
 * ---------------------------------------------------------------------
 * 사용자 결정(2026-10-25): 웹 기획전 5칸 = 시즌 기획전 · 산책용 · 눈·청력 보호 · 프리미엄 푸드 · 세트 상품.
 *  - 계절: 봄 3~5월 · 여름 6~8월 · 가을 9~11월 · 겨울 12~2월. 손님 기기의 오늘 날짜로 정함(배포 없이 자동으로 바뀜).
 *  - 상품은 상품 자료에 이미 있는 값(분류 · 계절 값 · 이름)으로 고름 — 서버 · 상품 자료 코드(lib/catalog/data.ts)는 그대로.
 *  - 꼭 넣을 상품 · 뺄 상품은 아래 SEASON_PIN · SEASON_SKIP 에 상품 폴더 이름으로 적으면 됨.
 *  - 그림은 칸마다 한 장(시즌은 PC용 · 휴대폰용). 아직 그림이 없는 계절은 가을 그림을 임시로 씀(SEASONS[].image 바꾸면 됨).
 * 앱(스티커북 쇼핑)은 예전 기획전 목록(lib/menu-data.ts PROMO_CARDS)을 그대로 씀.
 */
import type { CatalogProduct } from "@/lib/catalog/types";
import type { PromoCard } from "@/lib/menu-data";

export type SeasonKey = "spring" | "summer" | "autumn" | "winter";

export type SeasonLook = {
    key: SeasonKey;
    /** 칸 · 페이지 제목 */
    title: string;
    /** 메인 큰 칸 두 줄 제목 */
    titleFull: string;
    desc: string;
    eyebrow: string;
    /** 기획전 페이지 소개 */
    lead: string;
    image: { pc: string; mobile: string };
};

const PROMO = "/images/ui/promo/";
const AUTUMN_IMAGE = { pc: `${PROMO}season-autumn-pc-1600.webp`, mobile: `${PROMO}season-autumn-mobile-960.webp` };

export const SEASONS: Record<SeasonKey, SeasonLook> = {
    spring: {
        key: "spring",
        title: "봄 나들이 · 여행",
        titleFull: "따뜻한 봄,\n함께 떠나는 나들이",
        desc: "백팩 · 캐리어 · 카시트 · 트릿백 — 가볍게 떠나는 봄 여행 준비",
        eyebrow: "SPRING PICK",
        lead: "꽃 피는 계절, 아이와 함께 멀리 나갈 때 챙기면 좋은 가방 · 이동 · 나들이 용품이에요.",
        image: AUTUMN_IMAGE, // TODO: 봄 그림이 오면 교체
    },
    summer: {
        key: "summer",
        title: "장마 · 물놀이",
        titleFull: "비 오는 날도,\n물놀이 가는 날도",
        desc: "우비 · 방수 리드줄 · 구명조끼 · 쿨링 — 여름을 시원하고 안전하게",
        eyebrow: "SUMMER PICK",
        lead: "장마철 산책과 물놀이, 더운 날을 위한 방수 · 쿨링 · 물놀이 용품이에요.",
        image: AUTUMN_IMAGE, // TODO: 여름 그림이 오면 교체
    },
    autumn: {
        key: "autumn",
        title: "가을 하이킹 · 나들이",
        titleFull: "선선한 가을,\n함께 걷는 하이킹",
        desc: "하이킹 슈즈 · 배낭 · 간절기 겉옷 · 야외 놀이 — 걷기 좋은 계절 준비",
        eyebrow: "AUTUMN PICK",
        lead: "걷기 좋은 가을, 산과 공원으로 나설 때 필요한 신발 · 배낭 · 간절기 겉옷 · 야외 놀이 용품이에요.",
        image: AUTUMN_IMAGE,
    },
    winter: {
        key: "winter",
        title: "겨울 산책 준비",
        titleFull: "추운 겨울에도,\n따뜻한 산책",
        desc: "보온 재킷 · 패딩 · 겨울 부츠 · 스누드 · 야간 라이트 — 춥고 어두운 날 산책 준비",
        eyebrow: "WINTER PICK",
        lead: "찬 바람 부는 날에도 산책을 쉬지 않도록, 보온 의류 · 겨울 부츠 · 스누드 · 야간 안전 용품을 모았어요.",
        image: AUTUMN_IMAGE, // TODO: 겨울 그림이 오면 교체(12월 1일 전)
    },
};

/** 월(1~12) → 계절. 봄 3~5 · 여름 6~8 · 가을 9~11 · 겨울 12~2 */
export function seasonOfMonth(month: number): SeasonKey {
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "autumn";
    return "winter";
}

export function seasonOf(date: Date = new Date()): SeasonKey {
    return seasonOfMonth(date.getMonth() + 1);
}

/** 꼭 넣을 상품 · 뺄 상품(상품 폴더 이름) — 규칙으로 안 잡히거나 잘못 잡힌 것만 손으로 */
export const SEASON_PIN: Record<SeasonKey, string[]> = { spring: [], summer: [], autumn: [], winter: [] };
export const SEASON_SKIP: Record<SeasonKey, string[]> = { spring: [], summer: [], autumn: [], winter: [] };

const has = (text: string, pattern: RegExp) => pattern.test(text);
const textOf = (p: CatalogProduct) => [p.name, p.raw?.useMain, p.raw?.useSub].filter(Boolean).join(" ");
const WINTER_GEAR = /겨울|보온|패딩|방한|스노우|폴라|파우더 하운드|퀸지|버트|인슐레이티드|스텀프타운|스누드|snood/i;

/** 계절별 고르는 규칙 — 분류(subcategory) · 계절 값(season) · 이름 */
const SEASON_RULES: Record<SeasonKey, (p: CatalogProduct, text: string) => boolean> = {
    // 봄 나들이 · 여행: 가방 · 캐리어 · 카시트 · 유모차 · 트릿백 · 휴대 식기
    spring: (p, text) =>
        p.subcategory === "carrier" ||
        (p.subcategory === "bowl" && has(text, /휴대|접이|퀜처|퀸쳐|비비|트레일 러너|그레이트 베이슨|키블 캐디/)),
    // 장마 · 물놀이: 계절 값(우천/장마 · 여름) + 방수 · 우비 · 쿨링 · 구명조끼 · 물놀이 원반
    summer: (p, text) =>
        ["우천/장마", "여름", "여름/물놀이"].includes(p.season ?? "") ||
        (p.subcategory === "wear" && has(text, /우비|판초|레인|방수|쿨링|쿨러|구명|스윔|swim|물놀이/i)) ||
        has(text, /구명 ?조끼|하이드로 플레인|쿨링|쿨러/),
    // 가을 하이킹 · 나들이: 하이킹 신발 · 배낭 · 간절기 겉옷 · 야외 놀이 · 트레킹 리드줄 · 휴대 식기 (겨울 장비 제외)
    autumn: (p, text) => {
        if (WINTER_GEAR.test(text) || p.season === "겨울") return false;
        if (has(text, /일회용/)) return false;
        if (p.subcategory === "wear" && has(text, /부츠|슈즈|신발|양말|트렉스|트랙스/)) return true;
        if (p.subcategory === "carrier" && has(text, /배낭|팩|트릿|힙|백팩/) && !has(text, /카시트|유모차|트레일러|웨건/)) return true;
        if (p.subcategory === "wear" && has(text, /플리스|스웨터|니트|러닝 베스트|하이 ?-?비스|루멘글로우|언더코트/)) return true;
        if ((p.subcategory === "latex" || p.subcategory === "tug") && has(text, /원반|플라이어|볼|터그|런커|스틱|루프|링|구르도|포시니|모렐|토드스툴/)) return true;
        if (p.subcategory === "leash" && has(text, /롱|트레일|핸즈프리|벨트|크래그 이엑스|플랫 아웃|릿지라인 리드/)) return true;
        if (p.subcategory === "bowl" && has(text, /휴대|접이|퀸쳐|퀜처|비비|트레일 러너|그레이트 베이슨|키블 캐디/)) return true;
        return false;
    },
    // 겨울 산책 준비: 계절 값(겨울 · 야간/안전) + 보온 의류 · 겨울 부츠 · 스누드 · 야간 라이트
    winter: (p, text) =>
        p.season === "겨울" ||
        p.season === "야간/안전" ||
        (p.subcategory === "wear" && WINTER_GEAR.test(text)) ||
        has(text, /스누드|snood|루멘글로우|하이 ?-?비스|비콘|세이프티 ?라이트/i),
};

/** 그 계절 기획전 상품 */
export function seasonProducts(products: readonly CatalogProduct[], season: SeasonKey): CatalogProduct[] {
    const pin = new Set(SEASON_PIN[season]);
    const skip = new Set(SEASON_SKIP[season]);
    return products.filter((p) => {
        const folder = p.folder ?? "";
        if (skip.has(folder)) return false;
        if (pin.has(folder)) return true;
        return SEASON_RULES[season](p, textOf(p));
    });
}

/** 산책용 상품 — 하네스 · 리드줄 · 목줄(분류 그대로) + 산책 가방(트릿백 · 힙색) · 배변봉투 주머니 */
export function walkProducts(products: readonly CatalogProduct[]): CatalogProduct[] {
    return products.filter((p) => {
        if (p.subcategory === "harness" || p.subcategory === "leash") return true;
        const text = textOf(p);
        if (p.subcategory === "carrier" && has(text, /트릿|힙 ?팩|간식주머니/)) return true;
        return has(text, /배변봉투|스테이쉬/);
    });
}

/** 기획전 카드(시즌 칸이면) → 지금 계절의 제목 · 설명 · 그림으로 — 웹 메인(PromoSection) · 앱 쇼핑(StickerShop) 같이 씀(2026-10-26) */
export function promoCardForSeason(card: PromoCard, season: SeasonKey): PromoCard {
    if (!card.season) return card;
    const look = SEASONS[season];
    return { ...card, title: look.title, titleFull: look.titleFull, desc: look.desc, eyebrow: look.eyebrow, image: look.image.pc, imageMobile: look.image.mobile };
}
