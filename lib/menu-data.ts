/**
 * lib/menu-data.ts — 헤더·푸터·모바일 패널 공용 메뉴 데이터
 * ---------------------------------------------------------------------
 * 메뉴/카테고리 변경 시 이 파일만 수정.
 * 카테고리·브랜드·기획전·고객센터의 4개 드롭다운 컨텐츠 + 메인 nav 항목 정의.
 */

export interface MenuItem {
    label: string;
    href: string;
}

export interface CategoryGroup {
    title: string;
    href: string;
    items: MenuItem[];
}

export interface BrandCard {
    initial: string;       // "R", "Rx" 같은
    name: string;
    tagline: string;
    href: string;
    accent: "ruff" | "rex";  // 컬러 변형
}

export interface PromoCard {
    icon: string;          // fontawesome 클래스
    title: string;
    desc: string;
    href: string;
    color: "indigo" | "blue" | "purple" | "green" | "pink";
}

export interface CSLink {
    icon: string;
    label: string;
    href: string;
}

// ============ 카테고리 메가메뉴 (5개 그룹) ============
// href 는 catalog.ts 의 CategorySlug / SubcategorySlug 와 매핑됨.
// 카테고리 그룹 헤더 → /category/{slug}
// 서브카테고리 → /category/{slug}?sub={subslug}
export const CATEGORY_GROUPS: CategoryGroup[] = [
    {
        title: "산책/아웃도어", href: "/category/outdoor",
        items: [
            { label: "하네스",          href: "/category/outdoor?sub=harness" },
            { label: "리드줄/목줄",     href: "/category/outdoor?sub=leash" },
            { label: "의류/보호장비",   href: "/category/outdoor?sub=wear" },
            { label: "고글/안전용품",   href: "/category/outdoor?sub=goggles" },
            { label: "이동가방/유모차", href: "/category/outdoor?sub=carrier" },
        ],
    },
    {
        title: "먹거리", href: "/category/food",
        items: [
            { label: "사료",       href: "/category/food?sub=drysoy" },
            { label: "간식",       href: "/category/food?sub=treats" },
            { label: "영양/보조",  href: "/category/food?sub=supplement" },
            { label: "디저트/음료", href: "/category/food?sub=dessert" },
        ],
    },
    {
        title: "생활용품", href: "/category/life",
        items: [
            { label: "쿠션/침구",    href: "/category/life?sub=cushion" },
            { label: "식기/급식용품", href: "/category/life?sub=bowl" },
        ],
    },
    {
        title: "장난감/놀이", href: "/category/toy",
        items: [
            { label: "노즈워크/지능", href: "/category/toy?sub=nosework" },
            { label: "원반/터그",     href: "/category/toy?sub=tug" },
            { label: "라텍스/봉제",   href: "/category/toy?sub=latex" },
        ],
    },
    {
        title: "케어", href: "/category/care",
        items: [
            { label: "스킨/크림",   href: "/category/care?sub=cream" },
            { label: "발바닥 케어", href: "/category/care?sub=paw" },
            { label: "위생/배변",   href: "/category/care?sub=hygiene" },
        ],
    },
];

// ============ 브랜드 드롭다운 ============
export const BRAND_CARDS: BrandCard[] = [
    {
        initial: "R", name: "Ruffwear",
        tagline: "활동견을 위한\n프리미엄 아웃도어 기어",
        href: "/brand/ruffwear", accent: "ruff",
    },
    {
        initial: "Rx", name: "Rex Specs",
        tagline: "강아지 눈 보호 전문\n아이웨어 솔루션",
        href: "/brand/rex-specs", accent: "rex",
    },
];

// ============ 기획전 드롭다운 — 메인 페이지 PromoSection 5개 카드와 일치 ============
// href 는 catalog.ts 의 PromoSlug 와 매핑됨.
export const PROMO_CARDS: PromoCard[] = [
    { icon: "fa-person-running", title: "활동견 셀렉션",     desc: "산책·하이킹·달리기 — 활동 많은 댕댕이 큐레이션", href: "/promo/active",   color: "indigo" },
    { icon: "fa-cloud-rain",     title: "장마·우천 필수템",  desc: "방수 의류·우천 산책 가이드",                       href: "/promo/rainy",    color: "blue" },
    { icon: "fa-glasses",        title: "눈·청력 보호",      desc: "Rex Specs 전문 아이웨어",                          href: "/promo/eye",      color: "purple" },
    { icon: "fa-bone",           title: "프리미엄 푸드",     desc: "엄선된 사료·간식 큐레이션",                        href: "/promo/food",     color: "green" },
    { icon: "fa-ice-cream",      title: "댕스크림 컬렉션",   desc: "한정 시즌 — 아이스크림·음료",                      href: "/promo/seasonal", color: "pink" },
];

// ============ 고객센터 드롭다운 ============
export const CS_LINKS: CSLink[] = [
    { icon: "fa-bullhorn", label: "공지사항", href: "#notice" },
    { icon: "fa-circle-question", label: "자주 묻는 질문", href: "#faq" },
    { icon: "fa-comments", label: "1:1 문의", href: "#inquiry" },
    { icon: "fa-truck", label: "배송 조회", href: "#shipping" },
    { icon: "fa-rotate-left", label: "교환·반품 안내", href: "#return" },
];

// ============ 인기 검색어 (검색 모달용) ============
export const POPULAR_KEYWORDS: string[] = [
    "하네스", "리드줄", "사료", "간식", "고글", "유모차", "쿠션",
];

// ============ 푸터 메타 링크 ============
export const FOOTER_META_LINKS: MenuItem[] = [
    { label: "브랜드 스토리", href: "#about" },
    { label: "입점 문의", href: "#partner" },
    { label: "대량 구매 문의", href: "#bulk" },
    { label: "채용", href: "#career" },
];

export const FOOTER_LEGAL_LINKS: MenuItem[] = [
    { label: "이용약관", href: "#terms" },
    { label: "개인정보처리방침", href: "#privacy" },
    { label: "환불·반품 정책", href: "#refund" },
    { label: "분쟁해결 기준", href: "#dispute" },
];
