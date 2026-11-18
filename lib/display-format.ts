// Reuse ICU formatters across cards and re-renders. Creating a formatter for
// each price/date stalls mobile rendering even when the data is already local.
let wonKorean: Intl.NumberFormat | undefined;
let wonEnglish: Intl.NumberFormat | undefined;
let dollars: Intl.NumberFormat | undefined;

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

let showcaseEnglish: Intl.DateTimeFormat | undefined;

export function formatShowcaseDate(value: string, locale: "ko" | "en" = "ko") {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return locale === "en" ? "Just now" : "방금 전";
    if (locale === "en") {
        showcaseEnglish ??= new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        return showcaseEnglish.format(date);
    }
    // This feed has a fixed Korean label. Starting ICU's date formatter here
    // blocks the first photo cards, even when their images have already arrived.
    // Local Date getters retain the viewer's time zone and daylight-saving rules.
    const hour = date.getHours();
    const period = hour < 12 ? "오전" : "오후";
    const clockHour = String(hour % 12 || 12).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${date.getMonth() + 1}월 ${date.getDate()}일 ${period} ${clockHour}:${minute}`;
}
