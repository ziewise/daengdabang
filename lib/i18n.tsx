"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CatalogProduct, CategorySlug, SubcategorySlug } from "@/lib/catalog";

export type Locale = "ko" | "en";

const STORAGE_KEY = "daengdabang.locale";

type I18nContextValue = {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    toggleLocale: () => void;
    t: (key: I18nKey) => string;
    formatPrice: (value: number) => string;
    productName: (product: CatalogProduct | Pick<CatalogProduct, "name" | "brandEn" | "brandKo">) => string;
    categoryLabel: (slug: CategorySlug, fallback?: string) => string;
    subcategoryLabel: (slug: SubcategorySlug, fallback?: string) => string;
    menuLabel: (label: string) => string;
};

const STRINGS = {
    ko: {
        best: "베스트",
        new: "신상품",
        category: "카테고리",
        brand: "브랜드",
        promotion: "기획전",
        customerCenter: "고객센터",
        productsAll: "전체상품",
        search: "검색",
        searchPlaceholder: "어떤 상품을 찾으시나요?",
        cart: "장바구니",
        login: "로그인",
        mypage: "마이페이지",
        menu: "메뉴",
        close: "닫기",
        language: "언어",
        korean: "한국어",
        english: "English",
        allProducts: "전체상품",
        productCount: "상품",
        categoryFilter: "카테고리",
        typeFilter: "분류",
        subcategoryFilter: "세부",
        sort: "정렬",
        all: "전체",
        searchFieldPlaceholder: "상품명, 브랜드, 용도",
        daengdabangProducts: "댕다방 상품",
        priceCompare: "외부 가격비교",
        searching: "검색 중",
        noProducts: "조건에 맞는 상품이 없습니다.",
        emptyCart: "장바구니가 비어 있습니다.",
        shopNow: "상품 보러가기",
        delete: "삭제",
        countSuffix: "개",
        whoFor: "누구를 위한 상품인가요?",
        petProfileBenefit: "우리 아이에게 맞는 추천을 더 정확하게 받을 수 있어요.",
        register: "등록",
        choosePet: "선택해 주세요",
        selectedAll: "전체선택",
        deleteSelected: "선택삭제",
        option: "옵션",
        orderSummary: "주문 합계",
        productAmount: "상품 금액",
        shippingFee: "배송비",
        paymentDue: "결제 예정",
        checkout: "결제하기",
        selectProducts: "상품을 선택하세요",
        addedToCart: "장바구니에 담았어요",
        addToCart: "장바구니 담기",
        buyNow: "구매하기",
        wishlistAdd: "찜하기",
        wishlistRemove: "찜 해제",
        home: "홈",
        reviews: "리뷰",
        detailInfo: "상세정보",
        qna: "Q&A",
        noDetailImages: "등록된 상세 이미지가 없습니다.",
        moreDetail: "상세정보 더보기",
        fold: "접기",
        productInquiry: "상품 문의",
        askChatbot: "챗봇에 문의",
        rating: "평점",
        reviewCount: "후기",
        originalReview: "실제 구매 후기 요약",
        viewOriginal: "원문 보기",
        noReviews: "등록된 리뷰가 없습니다.",
        point: "적립금",
        shipping: "배송",
        freeShipping: "무료배송",
        shipsIn: "1~2일 내 출고",
        twin: "우리 애 트윈",
        sample: "표본",
        repurchaseRate: "비슷한 프로필 아이들의 재구매율",
        checkoutTitle: "주문/결제",
        receiver: "받는 분",
        address: "주소",
        paymentMethod: "결제수단",
        orderedProducts: "주문 상품",
        totalPayment: "총 결제",
        placeOrder: "주문 접수",
        orderComplete: "주문이 접수되었습니다.",
        orderNumber: "주문번호",
        keepShopping: "계속 쇼핑",
        noCheckoutItems: "결제할 상품이 없습니다.",
        card: "카드",
        transfer: "무통장입금",
        phone: "휴대폰",
        total: "합계",
        add: "추가",
        chooseOption: "옵션을 선택하세요",
        optionRequired: "필수",
        externalCompareLoading: "외부 가격비교 후보를 찾는 중입니다.",
        externalCompareEmpty: "아직 연결된 외부 가격비교 후보가 없습니다.",
        externalCompareFeedNote: "RPA 시장조사 피드가 갱신되면 이 영역에 자동으로 추가됩니다.",
        videoPlay: "영상 재생",
        videoStop: "영상 정지",
    },
    en: {
        best: "Best",
        new: "New",
        category: "Categories",
        brand: "Brands",
        promotion: "Collections",
        customerCenter: "Support",
        productsAll: "All Products",
        search: "Search",
        searchPlaceholder: "Search products, brands, or needs",
        cart: "Cart",
        login: "Log in",
        mypage: "My Page",
        menu: "Menu",
        close: "Close",
        language: "Language",
        korean: "Korean",
        english: "English",
        allProducts: "All Products",
        productCount: "products",
        categoryFilter: "Category",
        typeFilter: "Type",
        subcategoryFilter: "Subcategory",
        sort: "Sort",
        all: "All",
        searchFieldPlaceholder: "Product name, brand, or use",
        daengdabangProducts: "DaengDaBang products",
        priceCompare: "External price comparison",
        searching: "Searching",
        noProducts: "No products match these filters.",
        emptyCart: "Your cart is empty.",
        shopNow: "Shop products",
        delete: "Remove",
        countSuffix: "items",
        whoFor: "Who is this product for?",
        petProfileBenefit: "Add a pet profile for more accurate recommendations.",
        register: "Add profile",
        choosePet: "Select a pet",
        selectedAll: "Select all",
        deleteSelected: "Remove selected",
        option: "Option",
        orderSummary: "Order Summary",
        productAmount: "Products",
        shippingFee: "Shipping",
        paymentDue: "Total",
        checkout: "Checkout",
        selectProducts: "Select products",
        addedToCart: "Added to cart",
        addToCart: "Add to cart",
        buyNow: "Buy now",
        wishlistAdd: "Add to wishlist",
        wishlistRemove: "Remove from wishlist",
        home: "Home",
        reviews: "Reviews",
        detailInfo: "Details",
        qna: "Q&A",
        noDetailImages: "No detail images are available yet.",
        moreDetail: "Show more details",
        fold: "Fold",
        productInquiry: "Product inquiry",
        askChatbot: "Ask chatbot",
        rating: "Rating",
        reviewCount: "Reviews",
        originalReview: "Verified purchase review summary",
        viewOriginal: "View original",
        noReviews: "No reviews are available yet.",
        point: "Points",
        shipping: "Shipping",
        freeShipping: "Free shipping",
        shipsIn: "Ships in 1-2 days",
        twin: "Pet Twin",
        sample: "Sample",
        repurchaseRate: "Repurchase rate from similar pet profiles",
        checkoutTitle: "Order / Checkout",
        receiver: "Recipient",
        address: "Address",
        paymentMethod: "Payment method",
        orderedProducts: "Order Items",
        totalPayment: "Total",
        placeOrder: "Place order",
        orderComplete: "Your order has been received.",
        orderNumber: "Order No.",
        keepShopping: "Keep shopping",
        noCheckoutItems: "There are no items to checkout.",
        card: "Card",
        transfer: "Bank transfer",
        phone: "Mobile payment",
        total: "Total",
        add: "Add",
        chooseOption: "Select an option",
        optionRequired: "Required",
        externalCompareLoading: "Finding external price comparison candidates.",
        externalCompareEmpty: "No external price comparison candidates are connected yet.",
        externalCompareFeedNote: "When the RPA market research feed is refreshed, candidates appear here automatically.",
        videoPlay: "Play video",
        videoStop: "Pause video",
    },
} as const;

type I18nKey = keyof typeof STRINGS.ko;

const CATEGORY_EN: Record<CategorySlug, string> = {
    outdoor: "Walk & Outdoor",
    food: "Food & Treats",
    life: "Living",
    toy: "Toys",
    care: "Care",
};

const CATEGORY_KO: Record<CategorySlug, string> = {
    outdoor: "산책/아웃도어",
    food: "먹거리",
    life: "생활용품",
    toy: "장난감",
    care: "케어",
};

const SUBCATEGORY_EN: Record<SubcategorySlug, string> = {
    harness: "Harnesses",
    leash: "Leashes & Collars",
    wear: "Apparel & Safety Gear",
    goggles: "Goggles & Safety",
    carrier: "Carriers & Strollers",
    drysoy: "Dog Food",
    treats: "Treats",
    supplement: "Supplements",
    dessert: "Desserts & Drinks",
    cushion: "Beds & Cushions",
    bowl: "Bowls & Feeding",
    nosework: "Nosework",
    tug: "Tug & Rope",
    latex: "Balls & Latex",
    cream: "Shampoo & Cream",
    paw: "Paw Care",
    hygiene: "Hygiene & Pads",
    etc: "Other",
};

const SUBCATEGORY_KO: Record<SubcategorySlug, string> = {
    harness: "하네스",
    leash: "리드줄/목줄",
    wear: "의류/보호장비",
    goggles: "고글/안전용품",
    carrier: "이동가방/카시트",
    drysoy: "사료",
    treats: "간식",
    supplement: "영양/보조",
    dessert: "디저트/음료",
    cushion: "쿠션/침구",
    bowl: "식기/급식용품",
    nosework: "노즈워크",
    tug: "터그/로프",
    latex: "공/라텍스",
    cream: "스킨/크림",
    paw: "발바닥 케어",
    hygiene: "위생/배변",
    etc: "기타",
};

const MENU_EN: Record<string, string> = {
    "산책/아웃도어": "Walk & Outdoor",
    "하네스": "Harnesses",
    "리드줄": "Leashes",
    "고글": "Goggles",
    "유모차": "Strollers",
    "쿠션": "Cushions",
    "리드줄/목줄": "Leashes & Collars",
    "의류/보호장비": "Apparel & Safety Gear",
    "고글/안전용품": "Goggles & Safety",
    "이동가방/유모차": "Carriers & Strollers",
    "먹거리": "Food & Treats",
    "사료": "Dog Food",
    "간식": "Treats",
    "영양/보조": "Supplements",
    "디저트/음료": "Desserts & Drinks",
    "생활용품": "Living",
    "쿠션/침구": "Beds & Cushions",
    "식기/급식용품": "Bowls & Feeding",
    "장난감/토이": "Toys",
    "노즈워크/지능": "Nosework",
    "원반/터그": "Disc & Tug",
    "라텍스/봉제": "Latex & Plush",
    "케어": "Care",
    "샴푸/크림": "Shampoo & Cream",
    "발바닥 케어": "Paw Care",
    "위생/배변": "Hygiene & Pads",
    "기타 브랜드 보기": "More brands",
    "활동견 셀렉션": "Active Dog Picks",
    "계절 상품": "Seasonal Gear",
    "눈·청력 보호": "Eye & Hearing Care",
    "프리미엄 푸드": "Premium Food",
    "세트 상품": "Bundles",
    "공지사항": "Notices",
    "자주 묻는 질문": "FAQ",
    "1:1 문의": "1:1 Inquiry",
    "교환·반품 안내": "Returns & Exchanges",
    "브랜드 스토리": "Brand Story",
    "입점 문의": "Partner Inquiry",
    "대량 구매 문의": "Bulk Orders",
    "이용약관": "Terms",
    "개인정보처리방침": "Privacy Policy",
    "사업자 정보 확인": "Business Info",
    "구매안전서비스": "Escrow Service",
    "법적고지": "Legal Notice",
    "이메일 무단 수집 금지": "No Email Harvesting",
    "환불·반품 정책": "Refund & Return Policy",
    "분쟁해결 기준": "Dispute Resolution",
    "추천순": "Recommended",
    "실시간": "Realtime",
    "일간": "Daily",
    "주간": "Weekly",
    "월간": "Monthly",
    "신상품순": "Newest",
    "낮은 가격순": "Lowest price",
    "높은 가격순": "Highest price",
    "할인순": "Biggest discount",
    "판매순": "Best selling",
    "리뷰 많은순": "Most reviewed",
    "평점 높은순": "Top rated",
};

const PRODUCT_REPLACEMENTS: Array<[RegExp, string]> = [
    [/댕다방/g, "DaengDaBang"],
    [/러프웨어/g, "Ruffwear"],
    [/렉스스펙스/g, "Rex Specs"],
    [/헤이렉스/g, "HEYREX"],
    [/하이 앤 라이트/g, "Hi & Light"],
    [/체인져플리스 클라이메이트/g, "Climate Changer Fleece"],
    [/체인져플리스/g, "Changer Fleece"],
    [/클라이메이트/g, "Climate"],
    [/반려동물/g, "Pet"],
    [/반려견/g, "Dog"],
    [/강아지/g, "Dog"],
    [/소형견/g, "Small Dog"],
    [/중형견/g, "Medium Dog"],
    [/대형견/g, "Large Dog"],
    [/하네스/g, "Harness"],
    [/리드줄/g, "Leash"],
    [/목줄/g, "Collar"],
    [/고글/g, "Goggles"],
    [/안전/g, "Safety"],
    [/경량/g, "Lightweight"],
    [/의류/g, "Apparel"],
    [/쿨링/g, "Cooling"],
    [/베스트/g, "Vest"],
    [/코트/g, "Coat"],
    [/우비/g, "Raincoat"],
    [/장난감/g, "Toy"],
    [/원반/g, "Disc"],
    [/노즈워크/g, "Nosework"],
    [/정수기/g, "Water Fountain"],
    [/필터/g, "Filter"],
    [/급수기/g, "Water Dispenser"],
    [/식기/g, "Bowl"],
    [/쿠션/g, "Cushion"],
    [/휴대용/g, "Portable"],
    [/사료/g, "Food"],
    [/간식/g, "Treat"],
    [/덴탈/g, "Dental"],
    [/치킨/g, "Chicken"],
    [/연어/g, "Salmon"],
    [/오리/g, "Duck"],
    [/저알러지/g, "Hypoallergenic"],
    [/시니어/g, "Senior"],
    [/퍼피/g, "Puppy"],
    [/패드/g, "Pad"],
    [/샴푸/g, "Shampoo"],
    [/크림/g, "Cream"],
    [/치약/g, "Toothpaste"],
    [/유모차/g, "Stroller"],
    [/카시트/g, "Car Seat"],
];

const LocaleContext = createContext<I18nContextValue | null>(null);

function browserFallbackLocale(): Locale {
    if (typeof navigator === "undefined") return "ko";
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
    const primary = languages.find(Boolean)?.toLowerCase() || "";
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (primary.startsWith("ko") || timeZone === "Asia/Seoul") return "ko";
    return "en";
}

async function detectLocaleByEdge(): Promise<Locale | null> {
    try {
        const response = await fetch("/cdn-cgi/trace", { cache: "no-store" });
        if (!response.ok) return null;
        const text = await response.text();
        const loc = text.match(/^loc=(.+)$/m)?.[1]?.trim().toUpperCase();
        if (!loc) return null;
        return loc === "KR" ? "ko" : "en";
    } catch {
        return null;
    }
}

function translateProductName(product: CatalogProduct | Pick<CatalogProduct, "name" | "brandEn" | "brandKo">, locale: Locale) {
    if (locale === "ko") return product.name;
    let name = product.name;
    for (const [pattern, replacement] of PRODUCT_REPLACEMENTS) {
        name = name.replace(pattern, replacement);
    }
    return name.replace(/\s+/g, " ").trim();
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>("ko");

    useEffect(() => {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === "ko" || saved === "en") {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the explicit visitor preference once after mount.
            setLocaleState(saved);
            document.documentElement.lang = saved;
            return;
        }
        const fallback = browserFallbackLocale();
        setLocaleState(fallback);
        document.documentElement.lang = fallback;
        detectLocaleByEdge().then((edgeLocale) => {
            if (!edgeLocale) return;
            setLocaleState(edgeLocale);
            document.documentElement.lang = edgeLocale;
        });
    }, []);

    const setLocale = useCallback((next: Locale) => {
        setLocaleState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.lang = next;
    }, []);

    const value = useMemo<I18nContextValue>(() => ({
        locale,
        setLocale,
        toggleLocale: () => setLocale(locale === "ko" ? "en" : "ko"),
        t: (key) => STRINGS[locale][key] || STRINGS.ko[key],
        formatPrice: (value) => locale === "en" ? `₩${value.toLocaleString("en-US")}` : `${value.toLocaleString("ko-KR")}원`,
        productName: (product) => translateProductName(product, locale),
        categoryLabel: (slug, fallback) => locale === "en" ? CATEGORY_EN[slug] : fallback || CATEGORY_KO[slug],
        subcategoryLabel: (slug, fallback) => locale === "en" ? SUBCATEGORY_EN[slug] : fallback || SUBCATEGORY_KO[slug],
        menuLabel: (label) => locale === "en" ? MENU_EN[label] || translateProductName({ name: label, brandEn: "", brandKo: "" }, "en") : label,
    }), [locale, setLocale]);

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
    const value = useContext(LocaleContext);
    if (!value) throw new Error("useI18n must be used inside LanguageProvider");
    return value;
}
