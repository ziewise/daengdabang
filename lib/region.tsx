"use client";

/**
 * region — 국가/지역 선택 + 통화 자동 적용 + 언어 자동/수동
 * ---------------------------------------------------------------------
 * - 국가(KR/US) 선택 → 통화(KRW/USD)·언어(ko/en) 자동 적용
 * - 언어는 이후 드롭다운/모달에서 수동 변경 가능(국가·통화는 그대로 유지)
 * - 통화는 currency-store 에 세팅 → i18n.formatPrice 가 전 사이트 가격을 환산
 * - 국가는 localStorage 에 유지. 새로고침 시 통화만 복원하고
 *   언어는 건드리지 않는다(수동 변경한 언어를 국가 기준으로 덮어쓰지 않기 위함).
 */
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useI18n, type Locale } from "@/lib/i18n";
import { setCurrency, type Currency } from "@/lib/currency-store";

export type Country = "KR" | "US";

// 지원 국가 메타 — 국가↔통화↔언어 매핑 + 표기(모달에서 사용). 향후 하나씩 추가.
// label 은 현재 언어와 무관한 "고정 표기"(자국명) — 예: 영어 상태에서도 대한민국은 "대한민국".
export const COUNTRIES: Array<{
    code: Country;
    label: string;
    currency: Currency;
    locale: Locale;
    currencyKo: string;
    currencyEn: string;
}> = [
    { code: "KR", label: "대한민국", currency: "KRW", locale: "ko", currencyKo: "원 (KRW)", currencyEn: "KRW (₩)" },
    { code: "US", label: "United States", currency: "USD", locale: "en", currencyKo: "달러 (USD)", currencyEn: "USD ($)" },
];

const STORAGE_KEY = "daengdabang.country";

type RegionCtx = {
    country: Country;
    setCountry: (c: Country) => void;
    currency: Currency;
};

const Ctx = createContext<RegionCtx | null>(null);

export function RegionProvider({ children }: { children: React.ReactNode }) {
    const { setLocale } = useI18n();
    const [country, setCountryState] = useState<Country>("KR");

    // 마운트: 저장된 국가 복원 → 통화만 반영(언어는 i18n 이 자체 복원하도록 둔다)
    useEffect(() => {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === "KR" || saved === "US") {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate saved country once after mount.
            setCountryState(saved);
            const meta = COUNTRIES.find((c) => c.code === saved)!;
            setCurrency(meta.currency);
        }
    }, []);

    // 사용자가 국가를 바꾸면: 통화·언어 자동 적용(언어는 이후 수동 변경 가능)
    const setCountry = useCallback(
        (next: Country) => {
            const meta = COUNTRIES.find((c) => c.code === next)!;
            setCountryState(next);
            window.localStorage.setItem(STORAGE_KEY, next);
            setCurrency(meta.currency);
            setLocale(meta.locale);
        },
        [setLocale],
    );

    const currency = COUNTRIES.find((c) => c.code === country)!.currency;
    const value = useMemo<RegionCtx>(
        () => ({ country, setCountry, currency }),
        [country, setCountry, currency],
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRegion() {
    const v = useContext(Ctx);
    if (!v) throw new Error("useRegion must be used inside RegionProvider");
    return v;
}
