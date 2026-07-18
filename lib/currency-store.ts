"use client";

/**
 * currency-store — 사이트 통화(원/달러) 단일 소스 (React 컨텍스트 밖 모듈 스토어)
 * ----------------------------------------------------------------------------
 * 왜 모듈 스토어인가:
 *   i18n.formatPrice 는 "국가 선택(RegionProvider)"의 자식이 아니어서 컨텍스트로
 *   통화를 받을 수 없다. 그래서 컨텍스트 밖 모듈 스토어 + useSyncExternalStore 로
 *   어디서든 현재 통화를 읽고 구독하게 한다. (값 세팅은 RegionProvider 가 담당)
 *
 * 환율은 고정값(표시용 근사) — 실제 결제 환산은 PG 가 처리한다.
 */
import { useSyncExternalStore } from "react";

export type Currency = "KRW" | "USD";

// 고정 환율 — 1 USD = 1,350 KRW (표시용, 실제 결제는 PG 가 환산)
const KRW_PER_USD = 1350;

// 모듈 레벨 현재 통화 + 구독자 집합
let currency: Currency = "KRW";
const listeners = new Set<() => void>();

/** 현재 통화(스냅샷) */
export function getCurrency(): Currency {
    return currency;
}

/** 통화 변경 — 바뀔 때만 구독자에게 통지 */
export function setCurrency(next: Currency) {
    if (next === currency) return;
    currency = next;
    listeners.forEach((l) => l());
}

// useSyncExternalStore 구독 등록/해제
function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** KRW 금액을 현재(또는 지정) 통화의 실수값으로 변환 */
export function convertFromKRW(krw: number, cur: Currency = currency): number {
    return cur === "USD" ? krw / KRW_PER_USD : krw;
}

/** 리액트에서 현재 통화 구독 (SSR 기본값 KRW) */
export function useCurrency(): Currency {
    return useSyncExternalStore(subscribe, getCurrency, () => "KRW");
}
