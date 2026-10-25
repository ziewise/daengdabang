/**
 * brand-standards — 댕다방이 상품을 고르는 네 가지 기준 · 2026-10-25
 * ---------------------------------------------------------------------
 * 브랜드 스토리(BrandStoryWeb "네 가지 기준")와 입점 문의 "댕다방의 선택 기준 보기" 창(StandardsDialogButton)이 같이 씀.
 * title · body = 사용자 문안(브랜드 스토리 카드), short = 창에서 쓰는 한 줄 요약, art = 크레파스 그림(public/images/ui), tone = 카드 색.
 */
export type BrandStandard = { title: string; body: string; short: string; art: string; tone: "pink" | "sky" | "yellow" | "mint" };

export const BRAND_STANDARDS: BrandStandard[] = [
    {
        title: "일상에 꼭 필요한가",
        body: "유행이나 인기보다 산책, 식사, 휴식과 놀이 등 반려견의 일상에 실제로 도움이 되는 제품인지 먼저 살핍니다.",
        short: "유행보다 산책 · 식사 · 휴식 · 놀이에 실제로 도움이 되는지",
        art: "brand-std-daily-256.webp",
        tone: "pink",
    },
    {
        title: "반려견이 편안한가",
        body: "크기와 움직임, 소재와 사용 환경까지 고려해 반려견이 부담 없이 편안하게 사용할 수 있는지 살핍니다.",
        short: "크기 · 움직임 · 소재 · 사용 환경까지 부담이 없는지",
        art: "brand-std-comfort-256.webp",
        tone: "sky",
    },
    {
        title: "믿고 선택할 근거가 있는가",
        body: "제품의 특징과 소재, 사용 정보를 꼼꼼히 확인하고, 보호자가 납득할 수 있는 선택의 이유를 전달합니다.",
        short: "특징 · 소재 · 사용 정보로 선택의 이유를 설명할 수 있는지",
        art: "brand-std-evidence-256.webp",
        tone: "yellow",
    },
    {
        title: "구매 후에도 안심할 수 있는가",
        body: "배송부터 교환·반품, 문의 응대까지. 구매 이후의 경험도 책임 있는 서비스의 일부로 생각합니다.",
        short: "배송 · 교환 · 반품 · 문의까지 끊김 없이 살필 수 있는지",
        art: "brand-std-assure-256.webp",
        tone: "mint",
    },
];
