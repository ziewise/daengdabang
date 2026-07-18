"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import CloudflareSafeEmail from "@/components/footer/CloudflareSafeEmail";
import {
    DdbApiError,
    submitCustomerSupportInquiry,
    type CustomerSupportCategory,
    type CustomerSupportInquiryReceipt,
} from "@/lib/customer-api";
import { useAuth, useStore } from "@/lib/store";

const CATEGORY_OPTIONS: Array<{ value: CustomerSupportCategory; label: string }> = [
    { value: "exchange", label: "교환" },
    { value: "return", label: "반품" },
    { value: "refund", label: "환불·주문 취소" },
    { value: "defect", label: "제품 이상·파손·오배송" },
    { value: "delivery", label: "배송" },
    { value: "order", label: "주문" },
    { value: "payment", label: "결제" },
    { value: "other", label: "기타 문의" },
];

const CATEGORY_LABEL = Object.fromEntries(
    CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<CustomerSupportCategory, string>;

const MISSING_FIELD_LABELS: Record<string, string> = {
    order_number: "주문번호",
    product_name: "상품명",
    phone: "연락처",
};

type InquiryValues = {
    name: string | null;
    email: string | null;
    phone: string | null;
    orderNumber: string;
    productName: string;
    subject: string;
    message: string;
    privacyConsent: boolean;
    website: string;
};

const INITIAL_VALUES: InquiryValues = {
    name: null,
    email: null,
    phone: null,
    orderNumber: "",
    productName: "",
    subject: "",
    message: "",
    privacyConsent: false,
    website: "",
};

function inquiryCategory(value: string | null): CustomerSupportCategory | null {
    return CATEGORY_OPTIONS.some((option) => option.value === value)
        ? value as CustomerSupportCategory
        : null;
}

function defaultSubject(category: CustomerSupportCategory) {
    return `[${CATEGORY_LABEL[category]}] 문의드립니다`;
}

function subscribeInquiryLocation(onChange: () => void) {
    window.addEventListener("popstate", onChange);
    window.addEventListener("hashchange", onChange);
    return () => {
        window.removeEventListener("popstate", onChange);
        window.removeEventListener("hashchange", onChange);
    };
}

function getInquiryLocationSnapshot() {
    return `${window.location.search}${window.location.hash}`;
}

function getInquiryLocationServerSnapshot() {
    return "";
}

export default function CustomerInquiryPanel({ email, phone }: { email: string; phone: string }) {
    const { user } = useAuth();
    const store = useStore();
    const locationSnapshot = useSyncExternalStore(
        subscribeInquiryLocation,
        getInquiryLocationSnapshot,
        getInquiryLocationServerSnapshot,
    );
    const [visibility, setVisibility] = useState<"default" | "open" | "closed">("default");
    const [selectedCategory, setSelectedCategory] = useState<CustomerSupportCategory | null>(null);
    const [values, setValues] = useState<InquiryValues>(INITIAL_VALUES);
    const [submitting, setSubmitting] = useState(false);
    const [receipt, setReceipt] = useState<CustomerSupportInquiryReceipt | null>(null);
    const [error, setError] = useState("");
    const formSectionRef = useRef<HTMLElement>(null);
    const categoryRef = useRef<HTMLSelectElement>(null);
    const focusOnOpenRef = useRef(false);
    const [queryString, hash = ""] = locationSnapshot.split("#", 2);
    const searchParams = new URLSearchParams(queryString);
    const requestedCategory = inquiryCategory(searchParams.get("category"));
    const openedFromChat = searchParams.get("source") === "chat";
    const requestedOpen = openedFromChat || Boolean(requestedCategory) || hash === "inquiry-form";
    const expanded = visibility === "open" || (visibility === "default" && requestedOpen);
    const category = selectedCategory ?? requestedCategory ?? "other";
    const source = openedFromChat ? "chatbot" : "inquiry_page";
    const name = values.name ?? user?.name ?? "";
    const customerEmail = values.email ?? user?.email ?? "";
    const customerPhone = values.phone ?? user?.phone ?? "";
    const subject = values.subject || (requestedCategory ? defaultSubject(category) : "");

    const focusForm = useCallback(() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        formSectionRef.current?.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
        });
        categoryRef.current?.focus({ preventScroll: true });
    }, []);

    const revealForm = (category?: CustomerSupportCategory) => {
        const nextCategory = category ?? selectedCategory ?? requestedCategory ?? "other";
        setSelectedCategory(nextCategory);
        setValues((current) => ({ ...current, subject: current.subject || defaultSubject(nextCategory) }));
        setError("");
        setReceipt(null);
        focusOnOpenRef.current = true;
        if (expanded) window.requestAnimationFrame(focusForm);
        setVisibility("open");
    };

    useEffect(() => {
        if (!expanded || (!focusOnOpenRef.current && !requestedOpen)) return;
        focusOnOpenRef.current = false;
        const frame = window.requestAnimationFrame(focusForm);
        return () => window.cancelAnimationFrame(frame);
    }, [expanded, focusForm, requestedOpen]);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setError("");
        try {
            const nextReceipt = await submitCustomerSupportInquiry({
                category,
                name: name.trim(),
                email: customerEmail.trim(),
                phone: customerPhone.trim(),
                order_number: values.orderNumber.trim(),
                product_name: values.productName.trim(),
                subject: subject.trim(),
                message: values.message.trim(),
                requested_action: CATEGORY_LABEL[category],
                source,
                privacy_consent: values.privacyConsent,
                website: values.website,
            });
            setReceipt(nextReceipt);
        } catch (caught) {
            setError(
                caught instanceof DdbApiError
                    ? caught.message
                    : "문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    const missingLabels = receipt?.missing_fields
        .map((field) => MISSING_FIELD_LABELS[field] || field)
        .filter(Boolean) ?? [];

    return (
        <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() => revealForm()}
                    aria-expanded={expanded}
                    aria-controls="inquiry-form"
                    className="group rounded-2xl border border-white/60 bg-white/70 p-6 text-left shadow-card backdrop-blur transition hover:-translate-y-0.5 hover:border-aurora-indigo/30 hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-indigo"
                >
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-aurora-blue to-aurora-indigo text-white">
                        <i className="fa-solid fa-envelope" aria-hidden="true" />
                    </span>
                    <span className="block text-base font-black text-foreground">이메일 문의</span>
                    <span className="mt-1 block text-sm font-bold text-neutral-500">
                        이 페이지에서 바로 작성하고 접수할 수 있어요.
                    </span>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-aurora-indigo/20 bg-aurora-indigo/5 px-3 py-1.5 text-sm font-extrabold text-aurora-indigo transition group-hover:border-aurora-indigo/40 group-hover:bg-aurora-indigo/10">
                        문의 작성하기 <i className="fa-solid fa-arrow-down text-[10px]" aria-hidden="true" />
                    </span>
                    <span className="mt-2 block text-xs font-bold text-neutral-500">
                        <CloudflareSafeEmail email={email} />
                    </span>
                </button>

                <a
                    href={`tel:${phone}`}
                    className="group rounded-2xl border border-white/60 bg-white/70 p-6 text-left shadow-card backdrop-blur transition hover:-translate-y-0.5 hover:border-aurora-indigo/30 hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-indigo"
                >
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-aurora-indigo to-aurora-pink text-white">
                        <i className="fa-solid fa-headset" aria-hidden="true" />
                    </span>
                    <span className="block text-base font-black text-foreground">전화 문의</span>
                    <span className="mt-1 block text-sm font-bold text-neutral-500">
                        평일 10:00 ~ 18:00 (주말·공휴일 휴무)
                    </span>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-aurora-indigo/20 bg-white px-3 py-1.5 text-sm font-extrabold text-aurora-indigo transition group-hover:border-aurora-indigo/40 group-hover:bg-aurora-indigo/5">
                        {phone} <i className="fa-solid fa-phone text-[10px]" aria-hidden="true" />
                    </span>
                </a>
            </div>

            {expanded ? (
                <section
                    ref={formSectionRef}
                    id="inquiry-form"
                    className="mt-6 scroll-mt-24 overflow-hidden rounded-2xl border-2 border-dashed border-aurora-indigo/25 bg-white/80 shadow-card backdrop-blur"
                >
                    <div className="border-b border-aurora-indigo/10 bg-gradient-to-r from-orange-50 via-sky-50 to-indigo-50 px-5 py-4 sm:px-6">
                        <p className="text-xs font-black tracking-[0.18em] text-aurora-indigo">CRAYON CONTACT NOTE</p>
                        <div className="mt-1 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-foreground">1:1 문의 바로 접수</h2>
                                <p className="mt-1 text-sm font-bold leading-6 text-neutral-600">
                                    접수 후 정보가 더 필요하면 입력하신 이메일로 다시 안내드려요.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setVisibility("closed")}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-aurora-indigo/20 bg-white text-neutral-600 transition hover:bg-indigo-50 hover:text-aurora-indigo"
                                aria-label="문의 작성 접기"
                            >
                                <i className="fa-solid fa-chevron-up text-xs" aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                    {receipt ? (
                        <div className="p-5 sm:p-6" role="status" aria-live="polite">
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
                                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white">
                                    <i className="fa-solid fa-check" aria-hidden="true" />
                                </span>
                                <h3 className="mt-3 text-lg font-black text-emerald-950">문의가 접수됐습니다.</h3>
                                <p className="mt-2 text-sm font-bold leading-6 text-emerald-900">접수번호: <b>{receipt.id}</b></p>
                                <p className="mt-1 text-sm font-bold leading-6 text-neutral-700">{receipt.message}</p>
                                {missingLabels.length > 0 ? (
                                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold leading-6 text-amber-950">
                                        {missingLabels.join("·")} 확인이 더 필요해요. 담당 자동 안내가 입력하신 이메일로 추가 내용을 요청할 수 있습니다.
                                    </p>
                                ) : null}
                                <p className="mt-3 text-xs font-bold leading-5 text-neutral-600">
                                    {receipt.auto_reply_sent
                                        ? "접수 확인 메일을 발송했습니다."
                                        : "접수 내용은 안전하게 기록됐으며, 회신 준비가 완료되면 이메일로 알려드릴게요."}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReceipt(null);
                                        setValues((current) => ({
                                            ...current,
                                            orderNumber: "",
                                            productName: "",
                                            subject: "",
                                            message: "",
                                            privacyConsent: false,
                                        }));
                                        window.requestAnimationFrame(() => categoryRef.current?.focus());
                                    }}
                                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-extrabold text-emerald-900 transition hover:bg-emerald-100"
                                >
                                    새 문의 작성 <i className="fa-solid fa-pencil text-xs" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="grid gap-5 p-5 sm:p-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                    문의 유형
                                    <select
                                        ref={categoryRef}
                                        value={category}
                                        onChange={(event) => {
                                            const category = event.target.value as CustomerSupportCategory;
                                            setSelectedCategory(category);
                                            setValues((current) => ({
                                                ...current,
                                                subject: current.subject || defaultSubject(category),
                                            }));
                                        }}
                                        className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15"
                                    >
                                        {CATEGORY_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                    주문번호 <span className="font-bold text-neutral-400">(알면 입력)</span>
                                    <input
                                        value={values.orderNumber}
                                        onChange={(event) => setValues((current) => ({ ...current, orderNumber: event.target.value }))}
                                        list="customer-order-numbers"
                                        maxLength={80}
                                        autoComplete="off"
                                        className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15"
                                        placeholder="예: DDB-20260719-001"
                                    />
                                    <datalist id="customer-order-numbers">
                                        {store.state.orders.map((order) => <option key={order.id} value={order.id} />)}
                                    </datalist>
                                </label>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                    이름
                                    <input
                                        required
                                        value={name}
                                        onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                                        maxLength={100}
                                        autoComplete="name"
                                        className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15"
                                    />
                                </label>
                                <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                    답변 받을 이메일
                                    <input
                                        required
                                        type="email"
                                        value={customerEmail}
                                        onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                                        maxLength={180}
                                        autoComplete="email"
                                        className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                    연락처 <span className="font-bold text-neutral-400">(선택)</span>
                                    <input
                                        value={customerPhone}
                                        onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
                                        maxLength={40}
                                        inputMode="tel"
                                        autoComplete="tel"
                                        className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15"
                                    />
                                </label>
                                <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                    상품명 <span className="font-bold text-neutral-400">(선택)</span>
                                    <input
                                        value={values.productName}
                                        onChange={(event) => setValues((current) => ({ ...current, productName: event.target.value }))}
                                        maxLength={180}
                                        className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15"
                                        placeholder="제품 이상 문의라면 적어 주세요"
                                    />
                                </label>
                            </div>

                            <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                제목
                                <input
                                    required
                                    value={subject}
                                    onChange={(event) => setValues((current) => ({ ...current, subject: event.target.value }))}
                                    maxLength={180}
                                    className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15"
                                    placeholder="문의 내용을 짧게 적어 주세요"
                                />
                            </label>

                            <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                문의 내용
                                <textarea
                                    required
                                    minLength={5}
                                    rows={6}
                                    value={values.message}
                                    onChange={(event) => setValues((current) => ({ ...current, message: event.target.value }))}
                                    maxLength={4000}
                                    className="resize-y rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base font-bold leading-7 text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15"
                                    placeholder="교환·반품 사유나 제품 이상 상태를 자세히 적어 주세요. 정보가 부족하면 이메일로 추가 확인을 안내드려요."
                                />
                            </label>

                            <label className="sr-only" aria-hidden="true">
                                웹사이트
                                <input
                                    tabIndex={-1}
                                    autoComplete="off"
                                    value={values.website}
                                    onChange={(event) => setValues((current) => ({ ...current, website: event.target.value }))}
                                />
                            </label>

                            <label className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-sm font-bold leading-6 text-neutral-700">
                                <input
                                    required
                                    type="checkbox"
                                    checked={values.privacyConsent}
                                    onChange={(event) => setValues((current) => ({ ...current, privacyConsent: event.target.checked }))}
                                    className="mt-1 h-4 w-4 shrink-0 accent-aurora-indigo"
                                />
                                <span>
                                    문의 응대에 필요한 개인정보 수집·이용에 동의합니다. 상담 기록은 분쟁 대응을 위해 3년간 보관될 수 있습니다.{" "}
                                    <Link href="/privacy" className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-white px-2 py-0.5 font-extrabold text-aurora-indigo underline underline-offset-2">
                                        개인정보처리방침 <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" aria-hidden="true" />
                                    </Link>
                                </span>
                            </label>

                            {error ? (
                                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-extrabold leading-6 text-red-800">
                                    {error}
                                </p>
                            ) : null}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-aurora-blue to-aurora-indigo px-5 py-3 text-base font-black text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-hover disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {submitting ? (
                                    <><i className="fa-solid fa-spinner animate-spin" aria-hidden="true" /> 접수하고 있어요…</>
                                ) : (
                                    <><i className="fa-solid fa-paper-plane" aria-hidden="true" /> 문의 접수하기</>
                                )}
                            </button>
                        </form>
                    )}
                </section>
            ) : null}
        </>
    );
}
