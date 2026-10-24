/**
 * lib/return-steps.ts — 교환·반품 네 단계(웹 전용 요약)
 * 교환·반품 안내 페이지(app/return)와 마이페이지 주문 내역 "교환·반품 안내" 창(OrderHelpModal)이 같이 씀.
 * 정책 문구("요청 가능 기간" · "환불 처리")를 짧게 줄인 것 — 문구를 바꾸면 두 화면이 함께 바뀜.
 */
import { RETURN_POLICY } from "@/lib/commerce-policy";

// 교환·반품 네 단계(웹 전용 요약) — 아래 "요청 가능 기간" · "환불 처리" 문구를 짧게 줄인 것.
// 그림 = 사용자 크레파스 배지(웹접수 · 웹협의발송 · 웹회수검수 · 웹환불 → web-cs-step-*-256.webp, 2026-10-23), 번호 색은 배지 테 색에 맞춤
export const RETURN_STEPS = [
    { title: "1:1 문의로 접수", body: "단순 변심은 상품 수령 후 7일 이내에 남겨 주세요.", art: "/images/ui/web-cs-step-receive-256.webp", tint: "is-lav" },
    { title: "협의 후 발송", body: `반품사유 · 택배사 · 배송비 · 반품지를 협의한 뒤 ${RETURN_POLICY.designatedCarrier}로 보내 주세요.`, art: "/images/ui/web-cs-step-ship-256.webp", tint: "is-pink" },
    { title: "회수 · 검수", body: "도착한 상품의 상태를 확인해요.", art: "/images/ui/web-cs-step-inspect-256.webp", tint: "is-mint" },
    { title: "환불 진행", body: "검수가 끝나면 영업일 기준 3일 이내에 환불해요.", art: "/images/ui/web-cs-step-refund-done-256.webp", tint: "is-yellow" },
] as const;
