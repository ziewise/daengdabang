/**
 * /order-lookup — 비회원 주문 조회(2026-10-25)
 * 화면 · 동작은 components/guest/GuestOrderLookup(조회 · 취소는 lib/guest-order — 서버가 연결됐을 때만).
 */
import type { Metadata } from "next";
import GuestOrderLookup from "@/components/guest/GuestOrderLookup";

export const metadata: Metadata = {
    title: "비회원 주문 조회 | 댕다방",
    description: "주문번호와 주문 조회 비밀번호로 비회원 주문의 배송 상황을 확인하고 취소 · 교환 · 반품 · 문의를 할 수 있어요.",
};

export default function OrderLookupPage() {
    return <GuestOrderLookup />;
}
