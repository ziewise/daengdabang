// Shared copy and links must not import UI modules: the app home uses these
// without initializing the entire web growth dashboard and its dependencies.

export type ExpansionCard = {
    step: string;
    eyebrow: string;
    title: string;
    status: string;
    statusTone: string;
    description: string;
    guardrail: string;
    icon: string;
    tone: "coral" | "teal" | "orange";
    href: string;
    cta: string;
    activeFeature?: string;
};

export const EXPANSION_CARDS: readonly ExpansionCard[] = [
    {
        step: "01",
        eyebrow: "COMMUNITY",
        title: "댕자랑",
        status: "운영 중",
        statusTone: "border-emerald-200 bg-emerald-50 text-emerald-800",
        description: "우리 아이의 사진과 오늘의 이야기를 공개하고, 마음에 드는 친구를 팔로우하며 서로 응원하는 피드예요.",
        guardrail: "공개 피드는 누구나 볼 수 있고 게시·팔로우·뼈다귀 응원은 회원이 이용합니다. 개인정보 노출 등은 신고하면 운영자가 확인해요.",
        icon: "fa-images",
        tone: "coral",
        href: "/daeng-showcase/",
        cta: "오늘의 댕자랑 보기",
        activeFeature: "회원 게시·팔로우 운영 중",
    },
    {
        step: "02",
        eyebrow: "EDITOR NOTE",
        title: "돌봄 비교 매거진",
        status: "준비 중",
        statusTone: "border-indigo-200 bg-indigo-50 text-indigo-800",
        description: "실사용 후기와 상품 정보를 에디터가 검수한 뒤, 선택 기준이 보이는 읽을거리로 연결할 계획이에요.",
        guardrail: "검증할 원자료가 없는 ‘5종 비교’는 게시하지 않아요. 현재는 출처가 확인된 구매 후기 상품만 먼저 보여드립니다.",
        icon: "fa-newspaper",
        tone: "teal",
        href: "/reviews/",
        cta: "현재 공개된 후기 보기",
    },
    {
        step: "03",
        eyebrow: "INDIE BRAND LAB",
        title: "인디 브랜드 선발굴",
        status: "상담 접수 중",
        statusTone: "border-emerald-200 bg-emerald-50 text-emerald-800",
        description: "작지만 기준이 분명한 펫 브랜드의 입점·공동 기획·선발매 가능성을 함께 검토합니다.",
        guardrail: "문의 접수는 계약, 입점 또는 선발매 확정을 뜻하지 않아요. 상품 자료와 공급 조건을 확인한 뒤 개별 회신합니다.",
        icon: "fa-seedling",
        tone: "orange",
        href: "/partner/#partner-form",
        cta: "브랜드 상담 접수",
    },
    {
        step: "04",
        eyebrow: "댕다방 STANDARD",
        title: "생활 기본템과 멤버십",
        status: "기획 검토 중",
        statusTone: "border-amber-200 bg-amber-50 text-amber-900",
        description: "풉백·패드·무향 케어처럼 자주 쓰는 기본템과 멤버십 혜택을 함께 검토하고 있어요.",
        guardrail: "월 4,900원은 제안 단계의 검토안이며 가격·혜택 모두 미확정입니다. 이 화면에서는 신청비나 결제를 받지 않아요.",
        icon: "fa-box-open",
        tone: "coral",
        href: "#growth-programs",
        cta: "멤버십 소식 관심등록",
    },
] as const;

export const GUEST_STEPS = [
    {
        label: "01",
        title: "출근도장",
        body: "한국 시간 기준 하루 한 번, 계정에 안전하게 기록해요.",
        icon: "fa-calendar-check",
        tone: "orange",
    },
    {
        label: "02",
        title: "작은 돌봄",
        body: "산책과 눈 상태 확인처럼 오늘 할 수 있는 한 가지를 완료해요.",
        icon: "fa-paw",
        tone: "teal",
    },
    {
        label: "03",
        title: "변화 기록",
        body: "AI 분석과 지난 기록을 모아 평소와 달라진 점을 살펴봐요.",
        icon: "fa-chart-line",
        tone: "coral",
    },
] as const;

export const POLICIES = [
    {
        icon: "fa-circle-play",
        tone: "orange",
        title: "광고 없이도 오늘의 돌봄은 그대로",
        body: "광고형 리워드는 준비가 끝난 뒤 선택 기능으로만 열어요. 지금의 출근도장·돌봄 기록·AI 기능은 광고를 보지 않아도 이용할 수 있습니다.",
    },
    {
        icon: "fa-coins",
        tone: "coral",
        title: "완료한 활동만 보상에 반영",
        body: "출근도장처럼 실제로 완료한 활동만 서버에서 확인해 반영해요. 준비 중인 기능은 보상처럼 보이게 표시하지 않습니다.",
    },
    {
        icon: "fa-shield-heart",
        tone: "teal",
        title: "AI 기록은 의료 진단이 아닌 참고 정보",
        body: "평소와 달라진 점을 기록하고 돌봄 결정을 돕는 참고 정보이며 의료 진단을 대신하지 않아요. 걱정되는 변화가 계속되거나 심해지면 동물병원에 확인해 주세요.",
    },
] as const;

export type LocalCareCategory = "veterinary" | "grooming" | "hotel" | "daycare";

export type CategoryOption = {
    id: LocalCareCategory;
    label: string;
    shortLabel: string;
    query: string;
    helper: string;
    icon: string;
    tone: "coral" | "teal" | "orange";
};

export const CATEGORIES: readonly CategoryOption[] = [
    {
        id: "veterinary",
        label: "동물병원",
        shortLabel: "병원",
        query: "동물병원",
        helper: "진료·응급 여부 확인",
        icon: "fa-stethoscope",
        tone: "coral",
    },
    {
        id: "grooming",
        label: "반려견 미용",
        shortLabel: "미용",
        query: "애견미용",
        helper: "견종·서비스 범위 확인",
        icon: "fa-scissors",
        tone: "teal",
    },
    {
        id: "hotel",
        label: "반려견 호텔",
        shortLabel: "호텔",
        query: "애견호텔",
        helper: "숙박·야간 돌봄 확인",
        icon: "fa-bed",
        tone: "orange",
    },
    {
        id: "daycare",
        label: "반려견 데이케어",
        shortLabel: "데이케어",
        query: "애견유치원",
        helper: "등원·놀이 프로그램 확인",
        icon: "fa-school",
        tone: "teal",
    },
] as const;

export function buildNaverMapUrl(...parts: Array<string | undefined>) {
    const searchText = parts
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .join(" ")
        .slice(0, 240) || "반려동물 돌봄";
    return `https://map.naver.com/p/search/${encodeURIComponent(searchText)}`;
}
