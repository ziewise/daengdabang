export type CheckoutLocale = "ko" | "en";

export const CHECKOUT_DELIVERY_ZONES = ["mainland", "jeju", "island"] as const;
export type CheckoutDeliveryZone = typeof CHECKOUT_DELIVERY_ZONES[number];

export function isCheckoutDeliveryZone(value: unknown): value is CheckoutDeliveryZone {
    return typeof value === "string"
        && CHECKOUT_DELIVERY_ZONES.includes(value as CheckoutDeliveryZone);
}

export const CHECKOUT_DELIVERY_REQUEST_CODES = [
    "front_door",
    "security_office",
    "direct_handoff",
    "parcel_box",
    "other",
] as const;

export type CheckoutDeliveryRequestCode = typeof CHECKOUT_DELIVERY_REQUEST_CODES[number];

export type CheckoutDeliveryRequestPreset = {
    code: CheckoutDeliveryRequestCode;
    label: Record<CheckoutLocale, string>;
    requiresNote: boolean;
};

export const CHECKOUT_DELIVERY_REQUEST_PRESETS: readonly CheckoutDeliveryRequestPreset[] = [
    {
        code: "front_door",
        label: { ko: "문 앞에 놓아주세요", en: "Leave it at the door" },
        requiresNote: false,
    },
    {
        code: "security_office",
        label: { ko: "경비실에 맡겨주세요", en: "Leave it with security" },
        requiresNote: false,
    },
    {
        code: "direct_handoff",
        label: { ko: "직접 전달해 주세요", en: "Hand it to the recipient" },
        requiresNote: false,
    },
    {
        code: "parcel_box",
        label: { ko: "택배함에 넣어주세요", en: "Leave it in the parcel locker" },
        requiresNote: false,
    },
    {
        code: "other",
        label: { ko: "직접 입력", en: "Other request" },
        requiresNote: true,
    },
] as const;

export type CheckoutDeliveryDraft = {
    recipientName: string;
    phone: string;
    postalCode: string;
    addressLine1: string;
    addressLine2: string;
    deliveryZone: CheckoutDeliveryZone;
    requestCode: CheckoutDeliveryRequestCode;
    requestNote: string;
};

export type CheckoutDelivery = {
    recipientName: string;
    phone: string;
    postalCode: string;
    addressLine1: string;
    addressLine2?: string;
    deliveryZone: CheckoutDeliveryZone;
    requestCode: CheckoutDeliveryRequestCode;
    requestNote?: string;
};

export type CheckoutDeliveryResponse = Omit<CheckoutDelivery, "addressLine2" | "requestNote"> & {
    addressLine2?: string | null;
    requestNote?: string | null;
};

export type CheckoutDeliveryField = keyof CheckoutDeliveryDraft;
export type CheckoutDeliveryErrors = Partial<Record<CheckoutDeliveryField, string>>;

export const CHECKOUT_DELIVERY_FIELD_ORDER: readonly CheckoutDeliveryField[] = [
    "recipientName",
    "phone",
    "postalCode",
    "addressLine1",
    "addressLine2",
    "deliveryZone",
    "requestCode",
    "requestNote",
] as const;

export const EMPTY_CHECKOUT_DELIVERY_DRAFT: Readonly<CheckoutDeliveryDraft> = Object.freeze({
    recipientName: "",
    phone: "",
    postalCode: "",
    addressLine1: "",
    addressLine2: "",
    deliveryZone: "mainland",
    requestCode: "front_door",
    requestNote: "",
});

export function createCheckoutDeliveryDraft(
    initial: Partial<CheckoutDeliveryDraft> = {},
): CheckoutDeliveryDraft {
    return { ...EMPTY_CHECKOUT_DELIVERY_DRAFT, ...initial };
}

export function isCheckoutDeliveryRequestCode(value: unknown): value is CheckoutDeliveryRequestCode {
    return typeof value === "string"
        && CHECKOUT_DELIVERY_REQUEST_CODES.includes(value as CheckoutDeliveryRequestCode);
}

export function checkoutDeliveryRequestLabel(
    code: CheckoutDeliveryRequestCode,
    locale: CheckoutLocale = "ko",
): string {
    return CHECKOUT_DELIVERY_REQUEST_PRESETS.find((preset) => preset.code === code)?.label[locale]
        ?? (locale === "en" ? "Delivery request" : "배송 요청사항");
}

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;

function normalizeSingleLine(value: string): string {
    return value
        .normalize("NFC")
        .replace(CONTROL_CHARACTERS, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function characterCount(value: string): number {
    return Array.from(value).length;
}

/**
 * Normalizes the Korean mobile format accepted by the checkout API.
 * Unsupported characters are intentionally preserved so validation can show
 * an error instead of silently changing what the customer entered.
 */
export function normalizeCheckoutPhone(value: string): string {
    const normalized = normalizeSingleLine(value);
    if (!/^[0-9 -]*$/.test(normalized)) return normalized;
    return normalized.replace(/[ -]/g, "");
}

export function formatCheckoutPhone(value: string): string {
    const digits = normalizeCheckoutPhone(value);
    if (!/^\d+$/.test(digits)) return value.trim();
    if (digits.length === 11) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10 && digits.startsWith("02")) {
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 10) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return digits;
}

export function normalizeCheckoutDelivery(draft: CheckoutDeliveryDraft): CheckoutDelivery {
    const addressLine2 = normalizeSingleLine(draft.addressLine2);
    const requestNote = normalizeSingleLine(draft.requestNote);
    return {
        recipientName: normalizeSingleLine(draft.recipientName),
        phone: normalizeCheckoutPhone(draft.phone),
        postalCode: draft.postalCode.trim(),
        addressLine1: normalizeSingleLine(draft.addressLine1),
        ...(addressLine2 ? { addressLine2 } : {}),
        deliveryZone: draft.deliveryZone,
        requestCode: draft.requestCode,
        ...(draft.requestCode === "other" && requestNote ? { requestNote } : {}),
    };
}

type CheckoutDeliveryValidation =
    | { ok: true; value: CheckoutDelivery; errors: CheckoutDeliveryErrors; firstInvalidField: null }
    | { ok: false; value: null; errors: CheckoutDeliveryErrors; firstInvalidField: CheckoutDeliveryField };

const VALIDATION_COPY: Record<CheckoutLocale, Record<string, string>> = {
    ko: {
        recipientRequired: "받는 분을 입력해 주세요.",
        recipientLength: "받는 분은 2~40자로 입력해 주세요.",
        phone: "국내 휴대전화번호를 숫자 10~11자리로 입력해 주세요.",
        postalCode: "우편번호 5자리를 입력해 주세요.",
        address1Required: "기본 주소를 입력해 주세요.",
        address1Length: "기본 주소는 5~200자로 입력해 주세요.",
        address2Length: "상세 주소는 100자 이하로 입력해 주세요.",
        deliveryZone: "배송 지역을 다시 선택해 주세요.",
        requestCode: "배송 요청사항을 다시 선택해 주세요.",
        requestNoteRequired: "배송 요청사항을 입력해 주세요.",
        requestNoteLength: "배송 요청사항은 100자 이하로 입력해 주세요.",
    },
    en: {
        recipientRequired: "Enter the recipient's name.",
        recipientLength: "Use 2–40 characters for the recipient's name.",
        phone: "Enter a 10–11 digit Korean mobile number.",
        postalCode: "Enter a 5-digit postal code.",
        address1Required: "Enter the street address.",
        address1Length: "Use 5–200 characters for the street address.",
        address2Length: "Keep the address details within 100 characters.",
        deliveryZone: "Select the delivery region again.",
        requestCode: "Select the delivery request again.",
        requestNoteRequired: "Enter your delivery request.",
        requestNoteLength: "Keep the delivery request within 100 characters.",
    },
};

export function validateCheckoutDelivery(
    draft: CheckoutDeliveryDraft,
    locale: CheckoutLocale = "ko",
): CheckoutDeliveryValidation {
    const value = normalizeCheckoutDelivery(draft);
    const errors: CheckoutDeliveryErrors = {};
    const copy = VALIDATION_COPY[locale];
    const recipientLength = characterCount(value.recipientName);

    if (!value.recipientName) errors.recipientName = copy.recipientRequired;
    else if (recipientLength < 2 || recipientLength > 40) errors.recipientName = copy.recipientLength;

    if (!/^01[016789]\d{7,8}$/.test(value.phone)) errors.phone = copy.phone;
    if (!/^\d{5}$/.test(value.postalCode)) errors.postalCode = copy.postalCode;

    if (!value.addressLine1) errors.addressLine1 = copy.address1Required;
    else if (characterCount(value.addressLine1) < 5 || characterCount(value.addressLine1) > 200) {
        errors.addressLine1 = copy.address1Length;
    }

    if (value.addressLine2 && characterCount(value.addressLine2) > 100) {
        errors.addressLine2 = copy.address2Length;
    }

    if (!isCheckoutDeliveryZone(value.deliveryZone)) {
        errors.deliveryZone = copy.deliveryZone;
    }

    if (!isCheckoutDeliveryRequestCode(value.requestCode)) {
        errors.requestCode = copy.requestCode;
    }

    if (value.requestCode === "other") {
        if (!value.requestNote) errors.requestNote = copy.requestNoteRequired;
        else if (characterCount(value.requestNote) > 100) errors.requestNote = copy.requestNoteLength;
    }

    const firstInvalidField = CHECKOUT_DELIVERY_FIELD_ORDER.find((field) => Boolean(errors[field]));
    if (firstInvalidField) {
        return { ok: false, value: null, errors, firstInvalidField };
    }
    return { ok: true, value, errors, firstInvalidField: null };
}

function objectRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

/** Normalizes and validates the delivery snapshot returned by the server. */
export function normalizeCheckoutDeliveryResponse(value: unknown): CheckoutDelivery | null {
    const delivery = objectRecord(value);
    if (!delivery) return null;
    if (
        typeof delivery.recipientName !== "string"
        || typeof delivery.phone !== "string"
        || typeof delivery.postalCode !== "string"
        || typeof delivery.addressLine1 !== "string"
        || !isCheckoutDeliveryZone(delivery.deliveryZone)
        || !isCheckoutDeliveryRequestCode(delivery.requestCode)
        || !(delivery.addressLine2 == null || typeof delivery.addressLine2 === "string")
        || !(delivery.requestNote == null || typeof delivery.requestNote === "string")
    ) {
        return null;
    }

    const result = validateCheckoutDelivery({
        recipientName: delivery.recipientName,
        phone: delivery.phone,
        postalCode: delivery.postalCode,
        addressLine1: delivery.addressLine1,
        addressLine2: typeof delivery.addressLine2 === "string" ? delivery.addressLine2 : "",
        deliveryZone: delivery.deliveryZone,
        requestCode: delivery.requestCode,
        requestNote: typeof delivery.requestNote === "string" ? delivery.requestNote : "",
    });
    return result.ok ? result.value : null;
}

export function isCheckoutDeliveryResponse(value: unknown): value is CheckoutDeliveryResponse {
    return normalizeCheckoutDeliveryResponse(value) !== null;
}

export type CheckoutFulfillmentMode = "test_no_shipment" | "live_pending";

export type CheckoutDeliveryQuote = {
    shippingFee: number;
    currency: "KRW";
    estimatedStartDate: string;
    estimatedEndDate: string;
    policyVersion: string;
    fulfillmentMode: CheckoutFulfillmentMode;
    isSimulation: boolean;
};

function isDateOnly(value: unknown): value is string {
    if (typeof value !== "string") return false;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}

export function isCheckoutDeliveryQuote(value: unknown): value is CheckoutDeliveryQuote {
    const quote = objectRecord(value);
    if (!quote) return false;
    const fulfillmentMode = quote.fulfillmentMode;
    const datesAreValid = isDateOnly(quote.estimatedStartDate)
        && isDateOnly(quote.estimatedEndDate)
        && quote.estimatedStartDate <= quote.estimatedEndDate;
    const modeIsValid = fulfillmentMode === "test_no_shipment" || fulfillmentMode === "live_pending";
    const simulationIsConsistent = fulfillmentMode === "test_no_shipment"
        ? quote.isSimulation === true
        : quote.isSimulation === false;

    return Number.isSafeInteger(quote.shippingFee)
        && Number(quote.shippingFee) >= 0
        && Number(quote.shippingFee) <= 1_000_000_000
        && quote.currency === "KRW"
        && datesAreValid
        && typeof quote.policyVersion === "string"
        && quote.policyVersion.length > 0
        && quote.policyVersion.length <= 100
        && modeIsValid
        && simulationIsConsistent;
}

export type CheckoutDeliveryServerContract = {
    delivery: CheckoutDeliveryResponse;
    quote: CheckoutDeliveryQuote;
};

export function isCheckoutDeliveryServerContract(value: unknown): value is CheckoutDeliveryServerContract {
    const response = objectRecord(value);
    return Boolean(
        response
        && isCheckoutDeliveryResponse(response.delivery)
        && isCheckoutDeliveryQuote(response.quote),
    );
}

type DateOnlyParts = { year: number; month: number; day: number; weekday: number };

function dateOnlyParts(value: string): DateOnlyParts {
    const [year, month, day] = value.split("-").map(Number);
    return {
        year,
        month,
        day,
        weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    };
}

function formatDateOnly(value: string, locale: CheckoutLocale, includeYear: boolean): string {
    const { year, month, day, weekday } = dateOnlyParts(value);
    if (locale === "en") {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return `${months[month - 1]} ${day}${includeYear ? `, ${year}` : ""} (${weekdays[weekday]})`;
    }
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    return `${includeYear ? `${year}. ` : ""}${month}/${day}(${weekdays[weekday]})`;
}

export function formatCheckoutDeliveryEstimate(
    quote: CheckoutDeliveryQuote,
    locale: CheckoutLocale = "ko",
): string {
    const includeYear = quote.estimatedStartDate.slice(0, 4) !== quote.estimatedEndDate.slice(0, 4);
    const start = formatDateOnly(quote.estimatedStartDate, locale, includeYear);
    if (quote.estimatedStartDate === quote.estimatedEndDate) {
        return locale === "en" ? `Expected ${start}` : `${start} 도착 예정`;
    }
    const end = formatDateOnly(quote.estimatedEndDate, locale, includeYear);
    return locale === "en" ? `Expected ${start} – ${end}` : `${start} ~ ${end} 도착 예정`;
}

export function maskCheckoutRecipient(value: string): string {
    const characters = Array.from(normalizeSingleLine(value));
    if (characters.length <= 1) return "*";
    if (characters.length === 2) return `${characters[0]}*`;
    return `${characters[0]}${"*".repeat(Math.min(3, characters.length - 2))}${characters.at(-1)}`;
}

export function maskCheckoutPhone(value: string): string {
    const digits = normalizeCheckoutPhone(value);
    if (!/^\d{10,11}$/.test(digits)) return "***-****-****";
    const prefixLength = digits.length === 10 && digits.startsWith("02") ? 2 : 3;
    return `${digits.slice(0, prefixLength)}-****-${digits.slice(-4)}`;
}

export function maskCheckoutAddress(addressLine1: string): string {
    const normalized = normalizeSingleLine(addressLine1);
    const parts = normalized.split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts.slice(0, 2).join(" ")} ***`;
    const characters = Array.from(normalized);
    return characters.length > 0 ? `${characters.slice(0, 2).join("")}***` : "***";
}

export type MaskedCheckoutDelivery = {
    recipientName: string;
    phone: string;
    postalCode: string;
    address: string;
    requestLabel: string;
};

/**
 * Creates a display-only summary. The detailed address and free-text request
 * are deliberately excluded so callers do not accidentally persist them in
 * browser storage or analytics.
 */
export function maskCheckoutDelivery(
    delivery: CheckoutDelivery,
    locale: CheckoutLocale = "ko",
): MaskedCheckoutDelivery {
    return {
        recipientName: maskCheckoutRecipient(delivery.recipientName),
        phone: maskCheckoutPhone(delivery.phone),
        postalCode: `${delivery.postalCode.slice(0, 3)}**`,
        address: maskCheckoutAddress(delivery.addressLine1),
        requestLabel: delivery.requestCode === "other"
            ? (locale === "en" ? "Delivery request saved" : "배송 요청사항 등록됨")
            : checkoutDeliveryRequestLabel(delivery.requestCode, locale),
    };
}
