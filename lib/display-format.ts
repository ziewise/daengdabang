// Reuse ICU formatters across cards and re-renders. Creating a formatter for
// each price/date stalls mobile rendering even when the data is already local.
let wonKorean: Intl.NumberFormat | undefined;
let wonEnglish: Intl.NumberFormat | undefined;
let dollars: Intl.NumberFormat | undefined;
let showcaseDate: Intl.DateTimeFormat | undefined;

export function formatPriceAmount(value: number, locale: "ko" | "en", currency: "KRW" | "USD") {
    if (currency === "USD") {
        dollars ??= new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `$${dollars.format(value)}`;
    }
    if (locale === "en") {
        wonEnglish ??= new Intl.NumberFormat("en-US");
        return `₩${wonEnglish.format(value)}`;
    }
    wonKorean ??= new Intl.NumberFormat("ko-KR");
    return `${wonKorean.format(value)}원`;
}

export function formatShowcaseDate(value: string) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "방금 전";
    showcaseDate ??= new Intl.DateTimeFormat("ko-KR", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
    return showcaseDate.format(date);
}
