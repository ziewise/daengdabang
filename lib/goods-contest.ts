export const GOODS_CONTEST_GOAL = 500 as const;

export const GOODS_CONTEST_ITEM_IDS = [
    "acrylic_keyring",
    "sticker_set",
    "eco_bag",
    "insulated_bag",
    "mug",
    "tumbler",
    "spiral_notebook",
    "desk_calendar",
    "smart_tok",
    "t_shirt",
    "drawstring_pouch",
    "zipper_pouch",
    "mouse_pad",
    "phone_case",
    "acrylic_stand",
    "apron",
    "character_cushion",
    "pin_badge_set",
    "postcard_set",
    "memo_pad",
    "wood_sign",
] as const;

export type GoodsContestItemId = (typeof GOODS_CONTEST_ITEM_IDS)[number];

export type GoodsContestCatalogItem = {
    id: GoodsContestItemId;
    imageSrc: string;
    defaultName: string;
    defaultSummary: string;
    defaultExpectedPriceKrw: number;
};

export const GOODS_CONTEST_CATALOG: readonly GoodsContestCatalogItem[] = [
    { id: "acrylic_keyring", imageSrc: "/images/goods/goods-acrylic-keyring.webp", defaultName: "아크릴 키링", defaultSummary: "산책 가방에 가볍게 달아 함께하는 캐릭터 키링", defaultExpectedPriceKrw: 8_900 },
    { id: "sticker_set", imageSrc: "/images/goods/goods-sticker-set.webp", defaultName: "스티커 세트", defaultSummary: "다이어리와 소지품을 꾸미는 캐릭터 스티커 모음", defaultExpectedPriceKrw: 6_900 },
    { id: "eco_bag", imageSrc: "/images/goods/goods-eco-bag.webp", defaultName: "에코백", defaultSummary: "산책 준비물과 일상 소지품을 넉넉히 담는 에코백", defaultExpectedPriceKrw: 18_900 },
    { id: "insulated_bag", imageSrc: "/images/goods/goods-insulated-bag.webp", defaultName: "보냉백", defaultSummary: "간식과 음료를 시원하게 챙기는 데일리 보냉백", defaultExpectedPriceKrw: 24_900 },
    { id: "mug", imageSrc: "/images/goods/goods-mug.webp", defaultName: "머그컵", defaultSummary: "매일의 티타임에 캐릭터를 더한 세라믹 머그", defaultExpectedPriceKrw: 15_900 },
    { id: "tumbler", imageSrc: "/images/goods/goods-tumbler.webp", defaultName: "텀블러", defaultSummary: "산책과 출근길에 함께 쓰는 보온·보냉 텀블러", defaultExpectedPriceKrw: 27_900 },
    { id: "spiral_notebook", imageSrc: "/images/goods/goods-spiral-notebook.webp", defaultName: "스프링 노트", defaultSummary: "돌봄 일정과 하루 기록을 편하게 적는 스프링 노트", defaultExpectedPriceKrw: 9_900 },
    { id: "desk_calendar", imageSrc: "/images/goods/goods-desk-calendar.webp", defaultName: "데스크 캘린더", defaultSummary: "예방접종과 돌봄 일정을 한눈에 보는 탁상 달력", defaultExpectedPriceKrw: 14_900 },
    { id: "smart_tok", imageSrc: "/images/goods/goods-smart-tok.webp", defaultName: "스마트톡", defaultSummary: "휴대폰에 캐릭터 포인트를 더하는 그립 스마트톡", defaultExpectedPriceKrw: 12_900 },
    { id: "t_shirt", imageSrc: "/images/goods/goods-t-shirt.webp", defaultName: "티셔츠", defaultSummary: "편안한 실루엣에 캐릭터 그래픽을 담은 데일리 티셔츠", defaultExpectedPriceKrw: 29_900 },
    { id: "drawstring_pouch", imageSrc: "/images/goods/goods-drawstring-pouch.webp", defaultName: "스트링 파우치", defaultSummary: "간식과 작은 산책용품을 빠르게 여미는 스트링 파우치", defaultExpectedPriceKrw: 14_900 },
    { id: "zipper_pouch", imageSrc: "/images/goods/goods-zipper-pouch.webp", defaultName: "지퍼 파우치", defaultSummary: "흩어지기 쉬운 소지품을 단정히 담는 지퍼 파우치", defaultExpectedPriceKrw: 16_900 },
    { id: "mouse_pad", imageSrc: "/images/goods/goods-mouse-pad.webp", defaultName: "마우스 패드", defaultSummary: "책상 위에 포근한 캐릭터 장면을 더하는 마우스 패드", defaultExpectedPriceKrw: 12_900 },
    { id: "phone_case", imageSrc: "/images/goods/goods-phone-case.webp", defaultName: "폰 케이스", defaultSummary: "캐릭터와 일상적으로 함께하는 슬림 폰 케이스", defaultExpectedPriceKrw: 19_900 },
    { id: "acrylic_stand", imageSrc: "/images/goods/goods-acrylic-stand.webp", defaultName: "아크릴 스탠드", defaultSummary: "책상과 선반에 세워두는 캐릭터 아크릴 오브제", defaultExpectedPriceKrw: 9_900 },
    { id: "apron", imageSrc: "/images/goods/goods-apron.webp", defaultName: "앞치마", defaultSummary: "간식 만들기와 돌봄 시간에 가볍게 두르는 앞치마", defaultExpectedPriceKrw: 24_900 },
    { id: "character_cushion", imageSrc: "/images/goods/goods-character-cushion.webp", defaultName: "캐릭터 쿠션", defaultSummary: "공간에 포근한 캐릭터 표정을 더하는 소프트 쿠션", defaultExpectedPriceKrw: 34_900 },
    { id: "pin_badge_set", imageSrc: "/images/goods/goods-pin-badge-set.webp", defaultName: "핀 배지 세트", defaultSummary: "가방과 파우치에 조합해 다는 캐릭터 핀 배지 모음", defaultExpectedPriceKrw: 18_900 },
    { id: "postcard_set", imageSrc: "/images/goods/goods-postcard-set.webp", defaultName: "엽서 세트", defaultSummary: "마음을 전하거나 장식하기 좋은 일러스트 엽서 모음", defaultExpectedPriceKrw: 7_900 },
    { id: "memo_pad", imageSrc: "/images/goods/goods-memo-pad.webp", defaultName: "메모 패드", defaultSummary: "돌봄 체크와 짧은 메모를 남기는 캐릭터 메모지", defaultExpectedPriceKrw: 12_900 },
    { id: "wood_sign", imageSrc: "/images/goods/goods-wood-sign.webp", defaultName: "우드 사인", defaultSummary: "현관과 반려 공간을 따뜻하게 표시하는 우드 사인", defaultExpectedPriceKrw: 39_900 },
] as const;

const GOODS_CONTEST_ITEM_ID_SET: ReadonlySet<string> = new Set(GOODS_CONTEST_ITEM_IDS);

export function isGoodsContestItemId(value: unknown): value is GoodsContestItemId {
    return typeof value === "string" && GOODS_CONTEST_ITEM_ID_SET.has(value);
}
