"use client";

import {
    CHECKOUT_DELIVERY_REQUEST_PRESETS,
    type CheckoutDeliveryDraft,
    type CheckoutDeliveryErrors,
    type CheckoutDeliveryField,
    type CheckoutDeliveryRequestCode,
    type CheckoutLocale,
} from "@/lib/checkout-shipping";

export type ShippingDetailsSectionProps = {
    value: CheckoutDeliveryDraft;
    onChange: (next: CheckoutDeliveryDraft) => void;
    errors?: CheckoutDeliveryErrors;
    onBlur?: (field: CheckoutDeliveryField) => void;
    locale?: CheckoutLocale;
    disabled?: boolean;
    testMode?: boolean;
    idPrefix?: string;
    className?: string;
    onAddressSearch?: () => void;
    addressSearchPending?: boolean;
};

const COPY = {
    ko: {
        addressTitle: "배송지",
        addressDescription: "상품을 받을 분의 정보를 정확하게 입력해 주세요.",
        recipient: "받는 분",
        phone: "휴대전화",
        postalCode: "우편번호",
        addressLine1: "기본 주소",
        addressLine2: "상세 주소",
        optional: "선택",
        recipientPlaceholder: "받는 분 이름",
        phonePlaceholder: "010-1234-5678",
        postalCodePlaceholder: "12345",
        addressLine1Placeholder: "도로명 또는 지번 주소",
        addressLine2Placeholder: "동·호수 등 상세 주소",
        addressSearch: "주소 검색",
        addressSearching: "검색 중…",
        requestTitle: "배송 요청사항",
        requestDescription: "배송 방법을 선택해 주세요.",
        requestLabel: "요청사항",
        requestNote: "직접 입력",
        requestNotePlaceholder: "배송 기사님께 전달할 내용을 입력해 주세요.",
        sensitiveNotice: "공동현관·출입문 비밀번호 등 민감정보는 입력하지 마세요.",
        testNotice: "테스트 주문 확인용 정보이며 실제 배송은 진행되지 않습니다.",
    },
    en: {
        addressTitle: "Delivery address",
        addressDescription: "Enter accurate details for the person receiving the order.",
        recipient: "Recipient",
        phone: "Mobile phone",
        postalCode: "Postal code",
        addressLine1: "Street address",
        addressLine2: "Address details",
        optional: "Optional",
        recipientPlaceholder: "Recipient name",
        phonePlaceholder: "010-1234-5678",
        postalCodePlaceholder: "12345",
        addressLine1Placeholder: "Street address",
        addressLine2Placeholder: "Building, unit, etc.",
        addressSearch: "Find address",
        addressSearching: "Searching…",
        requestTitle: "Delivery request",
        requestDescription: "Choose how you would like the order delivered.",
        requestLabel: "Request",
        requestNote: "Request details",
        requestNotePlaceholder: "Enter a short note for the delivery driver.",
        sensitiveNotice: "Do not enter door, building-access, or other sensitive passcodes.",
        testNotice: "These details are for test-order verification only. Nothing will be shipped.",
    },
} as const;

function FieldError({ id, message }: { id: string; message?: string }) {
    if (!message) return null;
    return (
        <p id={id} className="mt-1.5 text-xs font-bold leading-5 text-red-700" aria-live="polite">
            <i className="fa-solid fa-circle-exclamation mr-1" aria-hidden="true" />
            {message}
        </p>
    );
}

function fieldClass(hasError: boolean): string {
    return `h-12 w-full rounded-xl border bg-white px-3 text-base font-bold text-neutral-900 outline-none transition disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 ${
        hasError
            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
            : "border-neutral-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
    }`;
}

export default function ShippingDetailsSection({
    value,
    onChange,
    errors = {},
    onBlur,
    locale = "ko",
    disabled = false,
    testMode = false,
    idPrefix = "checkout-delivery",
    className = "",
    onAddressSearch,
    addressSearchPending = false,
}: ShippingDetailsSectionProps) {
    const copy = COPY[locale];
    const fieldId = (field: CheckoutDeliveryField) => `${idPrefix}-${field}`;
    const errorId = (field: CheckoutDeliveryField) => `${fieldId(field)}-error`;
    const describedBy = (field: CheckoutDeliveryField, extraId?: string) => {
        const ids = [errors[field] ? errorId(field) : "", extraId || ""].filter(Boolean);
        return ids.length > 0 ? ids.join(" ") : undefined;
    };
    const update = <Field extends CheckoutDeliveryField,>(
        field: Field,
        next: CheckoutDeliveryDraft[Field],
    ) => onChange({ ...value, [field]: next });
    const requestNoticeId = `${idPrefix}-request-sensitive-notice`;

    return (
        <div className={`grid gap-4 ${className}`.trim()} data-checkout-delivery-section>
            <section className="surface overflow-hidden" aria-labelledby={`${idPrefix}-address-title`}>
                <div className="border-b border-neutral-200 bg-neutral-50/80 px-4 py-4 sm:px-5">
                    <div className="flex items-start gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-indigo-700" aria-hidden="true">
                            <i className="fa-solid fa-location-dot text-sm" />
                        </span>
                        <div>
                            <h2 id={`${idPrefix}-address-title`} className="text-lg font-black text-neutral-950">
                                {copy.addressTitle}
                            </h2>
                            <p className="mt-0.5 text-xs font-bold leading-5 text-neutral-500">
                                {copy.addressDescription}
                            </p>
                        </div>
                    </div>
                    {testMode && (
                        <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold leading-5 text-sky-800">
                            <i className="fa-solid fa-flask mr-1.5" aria-hidden="true" />
                            {copy.testNotice}
                        </p>
                    )}
                </div>

                <fieldset disabled={disabled} className="grid gap-4 p-4 sm:p-5">
                    <legend className="sr-only">{copy.addressTitle}</legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor={fieldId("recipientName")} className="mb-1.5 block text-xs font-black text-neutral-600">
                                {copy.recipient}
                            </label>
                            <input
                                id={fieldId("recipientName")}
                                name="shipping-recipient"
                                required
                                minLength={2}
                                maxLength={40}
                                autoComplete="shipping name"
                                value={value.recipientName}
                                onChange={(event) => update("recipientName", event.currentTarget.value)}
                                onBlur={() => onBlur?.("recipientName")}
                                aria-invalid={Boolean(errors.recipientName)}
                                aria-describedby={describedBy("recipientName")}
                                className={fieldClass(Boolean(errors.recipientName))}
                                placeholder={copy.recipientPlaceholder}
                            />
                            <FieldError id={errorId("recipientName")} message={errors.recipientName} />
                        </div>

                        <div>
                            <label htmlFor={fieldId("phone")} className="mb-1.5 block text-xs font-black text-neutral-600">
                                {copy.phone}
                            </label>
                            <input
                                id={fieldId("phone")}
                                name="shipping-phone"
                                type="tel"
                                required
                                maxLength={20}
                                inputMode="tel"
                                autoComplete="shipping tel"
                                value={value.phone}
                                onChange={(event) => update("phone", event.currentTarget.value)}
                                onBlur={() => onBlur?.("phone")}
                                aria-invalid={Boolean(errors.phone)}
                                aria-describedby={describedBy("phone")}
                                className={fieldClass(Boolean(errors.phone))}
                                placeholder={copy.phonePlaceholder}
                            />
                            <FieldError id={errorId("phone")} message={errors.phone} />
                        </div>
                    </div>

                    <div>
                        <label htmlFor={fieldId("postalCode")} className="mb-1.5 block text-xs font-black text-neutral-600">
                            {copy.postalCode}
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="w-full sm:max-w-[180px]">
                                <input
                                    id={fieldId("postalCode")}
                                    name="shipping-postal-code"
                                    required
                                    maxLength={5}
                                    inputMode="numeric"
                                    pattern="[0-9]{5}"
                                    autoComplete="shipping postal-code"
                                    value={value.postalCode}
                                    onChange={(event) => update(
                                        "postalCode",
                                        event.currentTarget.value.replace(/\D/g, "").slice(0, 5),
                                    )}
                                    onBlur={() => onBlur?.("postalCode")}
                                    aria-invalid={Boolean(errors.postalCode)}
                                    aria-describedby={describedBy("postalCode")}
                                    className={fieldClass(Boolean(errors.postalCode))}
                                    placeholder={copy.postalCodePlaceholder}
                                />
                                <FieldError id={errorId("postalCode")} message={errors.postalCode} />
                            </div>
                            {onAddressSearch && (
                                <button
                                    type="button"
                                    onClick={onAddressSearch}
                                    disabled={disabled || addressSearchPending}
                                    className="h-12 shrink-0 rounded-xl border-2 border-indigo-200 bg-white px-4 text-sm font-black text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {addressSearchPending ? copy.addressSearching : copy.addressSearch}
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <label htmlFor={fieldId("addressLine1")} className="mb-1.5 block text-xs font-black text-neutral-600">
                            {copy.addressLine1}
                        </label>
                        <input
                            id={fieldId("addressLine1")}
                            name="shipping-address-line1"
                            required
                            maxLength={200}
                            autoComplete="shipping address-line1"
                            value={value.addressLine1}
                            onChange={(event) => update("addressLine1", event.currentTarget.value)}
                            onBlur={() => onBlur?.("addressLine1")}
                            aria-invalid={Boolean(errors.addressLine1)}
                            aria-describedby={describedBy("addressLine1")}
                            className={fieldClass(Boolean(errors.addressLine1))}
                            placeholder={copy.addressLine1Placeholder}
                        />
                        <FieldError id={errorId("addressLine1")} message={errors.addressLine1} />
                    </div>

                    <div>
                        <label htmlFor={fieldId("addressLine2")} className="mb-1.5 block text-xs font-black text-neutral-600">
                            {copy.addressLine2} <span className="font-bold text-neutral-400">({copy.optional})</span>
                        </label>
                        <input
                            id={fieldId("addressLine2")}
                            name="shipping-address-line2"
                            maxLength={100}
                            autoComplete="shipping address-line2"
                            value={value.addressLine2}
                            onChange={(event) => update("addressLine2", event.currentTarget.value)}
                            onBlur={() => onBlur?.("addressLine2")}
                            aria-invalid={Boolean(errors.addressLine2)}
                            aria-describedby={describedBy("addressLine2")}
                            className={fieldClass(Boolean(errors.addressLine2))}
                            placeholder={copy.addressLine2Placeholder}
                        />
                        <FieldError id={errorId("addressLine2")} message={errors.addressLine2} />
                    </div>
                </fieldset>
            </section>

            <section className="surface overflow-hidden" aria-labelledby={`${idPrefix}-request-title`}>
                <div className="border-b border-neutral-200 bg-neutral-50/80 px-4 py-4 sm:px-5">
                    <div className="flex items-start gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">
                            <i className="fa-solid fa-truck-fast text-sm" />
                        </span>
                        <div>
                            <h2 id={`${idPrefix}-request-title`} className="text-lg font-black text-neutral-950">
                                {copy.requestTitle}
                            </h2>
                            <p className="mt-0.5 text-xs font-bold leading-5 text-neutral-500">
                                {copy.requestDescription}
                            </p>
                        </div>
                    </div>
                </div>

                <fieldset disabled={disabled} className="grid gap-4 p-4 sm:p-5">
                    <legend className="sr-only">{copy.requestTitle}</legend>
                    <div>
                        <label htmlFor={fieldId("requestCode")} className="mb-1.5 block text-xs font-black text-neutral-600">
                            {copy.requestLabel}
                        </label>
                        <select
                            id={fieldId("requestCode")}
                            name="shipping-request-code"
                            required
                            value={value.requestCode}
                            onChange={(event) => {
                                const requestCode = event.currentTarget.value as CheckoutDeliveryRequestCode;
                                onChange({
                                    ...value,
                                    requestCode,
                                    ...(requestCode === "other" ? {} : { requestNote: "" }),
                                });
                            }}
                            onBlur={() => onBlur?.("requestCode")}
                            aria-invalid={Boolean(errors.requestCode)}
                            aria-describedby={describedBy("requestCode", requestNoticeId)}
                            className={fieldClass(Boolean(errors.requestCode))}
                        >
                            {CHECKOUT_DELIVERY_REQUEST_PRESETS.map((preset) => (
                                <option key={preset.code} value={preset.code}>{preset.label[locale]}</option>
                            ))}
                        </select>
                        <FieldError id={errorId("requestCode")} message={errors.requestCode} />
                    </div>

                    {value.requestCode === "other" && (
                        <div>
                            <label htmlFor={fieldId("requestNote")} className="mb-1.5 block text-xs font-black text-neutral-600">
                                {copy.requestNote}
                            </label>
                            <textarea
                                id={fieldId("requestNote")}
                                name="shipping-request-note"
                                required
                                maxLength={100}
                                rows={3}
                                value={value.requestNote}
                                onChange={(event) => update("requestNote", event.currentTarget.value)}
                                onBlur={() => onBlur?.("requestNote")}
                                aria-invalid={Boolean(errors.requestNote)}
                                aria-describedby={describedBy("requestNote", requestNoticeId)}
                                className={`${fieldClass(Boolean(errors.requestNote))} h-auto min-h-24 resize-y py-3 leading-6`}
                                placeholder={copy.requestNotePlaceholder}
                            />
                            <div className="mt-1 flex items-start justify-between gap-3">
                                <FieldError id={errorId("requestNote")} message={errors.requestNote} />
                                <span className="ml-auto shrink-0 text-[11px] font-bold text-neutral-400" aria-hidden="true">
                                    {Array.from(value.requestNote).length}/100
                                </span>
                            </div>
                        </div>
                    )}

                    <p id={requestNoticeId} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold leading-5 text-amber-900">
                        <i className="fa-solid fa-shield-halved mr-1.5" aria-hidden="true" />
                        {copy.sensitiveNotice}
                    </p>
                </fieldset>
            </section>
        </div>
    );
}
