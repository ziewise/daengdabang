export type CustomerSupportCategory =
    | "exchange"
    | "return"
    | "refund"
    | "defect"
    | "delivery"
    | "order"
    | "payment"
    | "partnership"
    | "bulk_order"
    | "other";

export type CustomerSupportRoute = {
    category: CustomerSupportCategory;
    topicLabel: string;
    answer: string;
};

const DEFECT_INTENT_RE = /(?:불량|하자|파손|오배송|누락|제품\s*(?:이상|문제)|상품\s*(?:이상|문제)|망가|깨져|찢어|고장|다른\s*상품)/;
const SIZE_MISMATCH_RE = /(?:사이즈|크기).{0,18}(?:안\s*맞|맞지\s*않|작(?:아|은|게)|크(?:다|게|네)|잘못)/;
const DELIVERY_SUPPORT_RE = /(?:배송|택배).{0,18}(?:조회|문의|지연|늦|안\s*(?:와|옴)|못\s*받|분실|누락|파손|문제|어디|언제)|(?:배송\s*조회|배송\s*문의)/;
const ORDER_SUPPORT_RE = /주문.{0,16}(?:조회|취소|변경|문의|문제|오류|실패|안\s*돼|못\s*했)/;
const PAYMENT_SUPPORT_RE = /결제.{0,16}(?:취소|환불|문의|문제|오류|실패|중복|안\s*돼|못\s*했)/;

export function customerSupportRoute(message: string): CustomerSupportRoute | null {
    const text = message.trim().toLocaleLowerCase("ko-KR");
    if (!text) return null;

    if (DEFECT_INTENT_RE.test(text)) {
        return {
            category: "defect",
            topicLabel: "제품 이상 문의",
            answer: "제품 이상이나 파손 상태를 확인해 접수를 도와드릴게요. 주문번호와 상품명, 확인한 문제를 적어 아래 1:1 문의로 보내 주세요. 정보가 부족하면 입력하신 이메일로 추가 내용을 안내드립니다.",
        };
    }
    if (/교환/.test(text) || SIZE_MISMATCH_RE.test(text)) {
        return {
            category: "exchange",
            topicLabel: "교환 문의",
            answer: "교환 접수를 도와드릴게요. 주문번호와 상품명, 교환 사유를 준비한 뒤 아래 1:1 문의에서 바로 접수해 주세요.",
        };
    }
    if (/반품/.test(text)) {
        return {
            category: "return",
            topicLabel: "반품 문의",
            answer: "반품 접수를 도와드릴게요. 주문번호와 상품명, 반품 사유를 적어 아래 1:1 문의로 보내 주세요. 교환·반품 기준도 함께 확인할 수 있습니다.",
        };
    }
    if (/환불|주문\s*취소/.test(text)) {
        return {
            category: "refund",
            topicLabel: "환불·취소 문의",
            answer: "환불이나 주문 취소 상태를 확인할 수 있도록 1:1 문의로 접수해 주세요. 주문번호를 함께 적으면 더 빠르게 확인할 수 있습니다.",
        };
    }
    if (DELIVERY_SUPPORT_RE.test(text)) {
        return {
            category: "delivery",
            topicLabel: "배송 문의",
            answer: "배송 상태 확인을 도와드릴게요. 먼저 주문 내역에서 배송 상태를 확인하고, 해결되지 않으면 주문번호와 상황을 1:1 문의로 보내 주세요.",
        };
    }
    if (PAYMENT_SUPPORT_RE.test(text)) {
        return {
            category: "payment",
            topicLabel: "결제 문의",
            answer: "결제 상태를 확인할 수 있도록 주문번호와 결제 시각, 확인된 오류 내용을 1:1 문의로 보내 주세요. 민감한 카드번호 전체는 입력하지 마세요.",
        };
    }
    if (ORDER_SUPPORT_RE.test(text)) {
        return {
            category: "order",
            topicLabel: "주문 문의",
            answer: "주문 상태 확인을 도와드릴게요. 주문 내역에서 먼저 확인하고, 해결되지 않으면 주문번호와 요청 내용을 1:1 문의로 접수해 주세요.",
        };
    }
    return null;
}

export function customerSupportInquiryHref(category: CustomerSupportCategory) {
    return `/inquiry?category=${encodeURIComponent(category)}&source=chat#inquiry-form`;
}

export function customerSupportCtaIdentity(url: string) {
    const withoutHash = url.trim().split("#", 1)[0];
    return withoutHash.replace(/^\/inquiry\/(?=\?|$)/, "/inquiry");
}
