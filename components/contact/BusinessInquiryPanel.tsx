"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    DdbApiError,
    submitCustomerSupportInquiry,
    type CustomerSupportCategory,
    type CustomerSupportInquiryPayload,
    type CustomerSupportInquiryReceipt,
} from "@/lib/customer-api";
import { useAuth } from "@/lib/store";

export type BusinessInquiryMode = Extract<CustomerSupportCategory, "partnership" | "bulk_order">;

type InquiryValues = {
    organization: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    productName: string;
    companyWebsite: string;
    inquiryType: string;
    quantity: string;
    budget: string;
    desiredDate: string;
    deliveryRegion: string;
    message: string;
    privacyConsent: boolean;
    website: string;
};

const MODE_CONFIG: Record<BusinessInquiryMode, {
    eyebrow: string;
    title: string;
    description: string;
    organizationLabel: string;
    productLabel: string;
    requestedAction: string;
    source: CustomerSupportInquiryPayload["source"];
}> = {
    partnership: {
        eyebrow: "PARTNER NOTE",
        title: "입점·제휴 제안서 보내기",
        description: "브랜드와 상품의 강점, 공식 소개 주소, 협업 제안을 함께 적어 주세요.",
        organizationLabel: "회사·브랜드명",
        productLabel: "제안 브랜드·상품",
        requestedAction: "입점·제휴 검토",
        source: "partner_page",
    },
    bulk_order: {
        eyebrow: "BULK ORDER NOTE",
        title: "대량 구매 상담 신청",
        description: "필요한 상품과 수량, 희망 일정이 구체적일수록 빠르게 검토할 수 있어요.",
        organizationLabel: "회사·기관·단체명",
        productLabel: "희망 상품",
        requestedAction: "대량 구매 견적·상담",
        source: "bulk_order_page",
    },
};

function initialValues(mode: BusinessInquiryMode): InquiryValues {
    return {
        organization: "",
        contactName: null,
        email: null,
        phone: null,
        productName: "",
        companyWebsite: "",
        inquiryType: mode === "partnership" ? "브랜드·상품 입점" : "대량 구매 견적",
        quantity: "",
        budget: "",
        desiredDate: "",
        deliveryRegion: "",
        message: "",
        privacyConsent: false,
        website: "",
    };
}

function structuredMessage(mode: BusinessInquiryMode, values: InquiryValues) {
    const lines = mode === "partnership"
        ? [
            `회사·브랜드명: ${values.organization.trim()}`,
            `제안 구분: ${values.inquiryType.trim()}`,
            `제안 브랜드·상품: ${values.productName.trim()}`,
            `공식 소개 주소: ${values.companyWebsite.trim() || "미입력"}`,
        ]
        : [
            `회사·기관·단체명: ${values.organization.trim()}`,
            `희망 상품: ${values.productName.trim()}`,
            `예상 수량: ${values.quantity.trim()}`,
            `예산 범위: ${values.budget.trim() || "미입력"}`,
            `희망 일정: ${values.desiredDate.trim() || "미입력"}`,
            `배송 지역: ${values.deliveryRegion.trim() || "미입력"}`,
        ];
    return `${lines.join("\n")}\n\n상세 내용\n${values.message.trim()}`;
}

function inquirySubject(mode: BusinessInquiryMode, values: InquiryValues) {
    const subject = `[${mode === "partnership" ? "입점·제휴" : "대량 구매"}] ${values.organization.trim()} · ${values.productName.trim()}`;
    return subject.length > 200 ? `${subject.slice(0, 197)}...` : subject;
}

export default function BusinessInquiryPanel({ mode }: { mode: BusinessInquiryMode }) {
    const config = MODE_CONFIG[mode];
    const { user } = useAuth();
    const [values, setValues] = useState<InquiryValues>(() => initialValues(mode));
    const [submitting, setSubmitting] = useState(false);
    const [receipt, setReceipt] = useState<CustomerSupportInquiryReceipt | null>(null);
    const [error, setError] = useState("");
    const receiptHeadingRef = useRef<HTMLHeadingElement>(null);
    const contactName = values.contactName ?? user?.name ?? "";
    const email = values.email ?? user?.email ?? "";
    const phone = values.phone ?? user?.phone ?? "";

    useEffect(() => {
        if (receipt) receiptHeadingRef.current?.focus();
    }, [receipt]);

    const update = <Key extends keyof InquiryValues>(key: Key, value: InquiryValues[Key]) => {
        setValues((current) => ({ ...current, [key]: value }));
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setError("");
        try {
            const nextReceipt = await submitCustomerSupportInquiry({
                category: mode,
                name: contactName.trim(),
                email: email.trim(),
                phone: phone.trim(),
                organization_name: values.organization.trim(),
                company_website: mode === "partnership" ? values.companyWebsite.trim() : "",
                inquiry_type: values.inquiryType.trim(),
                quantity: mode === "bulk_order" ? values.quantity.trim() : "",
                budget: mode === "bulk_order" ? values.budget.trim() : "",
                desired_date: mode === "bulk_order" ? values.desiredDate.trim() : "",
                delivery_region: mode === "bulk_order" ? values.deliveryRegion.trim() : "",
                order_number: "",
                product_name: values.productName.trim(),
                subject: inquirySubject(mode, values),
                message: structuredMessage(mode, values),
                requested_action: config.requestedAction,
                source: config.source,
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

    if (receipt) {
        return (
            <section className="rounded-[28px] border border-emerald-200 bg-emerald-50/85 p-6 shadow-card sm:p-8" role="status" aria-live="polite">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <i className="fa-solid fa-check" aria-hidden="true" />
                </span>
                <p className="mt-5 text-xs font-black tracking-[0.2em] text-emerald-700">RECEIVED</p>
                <h2 ref={receiptHeadingRef} tabIndex={-1} className="mt-2 text-2xl font-black text-emerald-950 outline-none">문의가 안전하게 접수됐습니다.</h2>
                <p className="mt-3 text-sm font-bold leading-7 text-emerald-900">접수번호: <b>{receipt.id}</b></p>
                <p className="mt-1 text-sm font-bold leading-7 text-neutral-700">{receipt.message}</p>
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-sm font-bold leading-6 text-neutral-600">
                    담당자가 내용을 확인한 뒤 입력하신 이메일로 답변드립니다. 추가 내용은 접수 안내 메일에 회신해 주세요.
                </p>
                <button
                    type="button"
                    onClick={() => {
                        setReceipt(null);
                        setValues((current) => ({
                            ...initialValues(mode),
                            contactName: current.contactName,
                            email: current.email,
                            phone: current.phone,
                        }));
                    }}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-300 bg-white px-5 py-2 text-sm font-extrabold text-emerald-900 transition hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                    새 문의 작성 <i className="fa-solid fa-pencil text-xs" aria-hidden="true" />
                </button>
            </section>
        );
    }

    return (
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/85 shadow-card backdrop-blur">
            <div className="border-b border-indigo-100 bg-gradient-to-r from-orange-50 via-sky-50 to-indigo-50 px-5 py-5 sm:px-7 sm:py-6">
                <p className="text-xs font-black tracking-[0.2em] text-aurora-indigo">{config.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">{config.title}</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">{config.description}</p>
            </div>

            <form onSubmit={submit} className="grid gap-5 p-5 sm:p-7">
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                        {config.organizationLabel}
                        <input required value={values.organization} onChange={(event) => update("organization", event.target.value)} maxLength={160} autoComplete="organization" className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                        담당자 이름
                        <input required value={contactName} onChange={(event) => update("contactName", event.target.value)} maxLength={100} autoComplete="name" className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15" />
                    </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                        답변 받을 이메일
                        <input required type="email" value={email} onChange={(event) => update("email", event.target.value)} maxLength={180} autoComplete="email" className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                연락처 <span className="font-bold text-neutral-600">(선택)</span>
                        <input type="tel" value={phone} onChange={(event) => update("phone", event.target.value)} maxLength={40} autoComplete="tel" className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15" placeholder="010-0000-0000" />
                    </label>
                </div>

                {mode === "partnership" ? (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                제안 구분
                                <select value={values.inquiryType} onChange={(event) => update("inquiryType", event.target.value)} className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15">
                                    <option>브랜드·상품 입점</option>
                                    <option>공급·유통 제휴</option>
                                    <option>공동 기획·프로모션</option>
                                    <option>기타 사업 제안</option>
                                </select>
                            </label>
                            <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                공식 홈페이지·소개 주소 <span className="font-bold text-neutral-600">(선택)</span>
                                <input type="url" value={values.companyWebsite} onChange={(event) => update("companyWebsite", event.target.value)} maxLength={500} autoComplete="url" className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15" placeholder="https://" />
                            </label>
                        </div>
                        <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                            {config.productLabel}
                            <input required value={values.productName} onChange={(event) => update("productName", event.target.value)} maxLength={240} className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15" placeholder="브랜드명과 대표 상품을 적어 주세요" />
                        </label>
                    </>
                ) : (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                {config.productLabel}
                                <input required value={values.productName} onChange={(event) => update("productName", event.target.value)} maxLength={240} className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15" placeholder="상품명·규격·옵션" />
                            </label>
                            <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                예상 수량
                                <input required value={values.quantity} onChange={(event) => update("quantity", event.target.value)} maxLength={120} className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15" placeholder="예: 100개, 월 50개 정기 구매" />
                            </label>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                예산 범위 <span className="font-bold text-neutral-600">(선택)</span>
                                <input value={values.budget} onChange={(event) => update("budget", event.target.value)} maxLength={120} className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15" placeholder="예: 300만원 내외" />
                            </label>
                            <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                희망 납품일 <span className="font-bold text-neutral-600">(선택)</span>
                                <input type="date" value={values.desiredDate} onChange={(event) => update("desiredDate", event.target.value)} className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15" />
                            </label>
                            <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                                배송 지역 <span className="font-bold text-neutral-600">(선택)</span>
                                <input value={values.deliveryRegion} onChange={(event) => update("deliveryRegion", event.target.value)} maxLength={120} autoComplete="address-level1" className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-base font-bold text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15" placeholder="예: 서울, 전국 3개 지점" />
                            </label>
                        </div>
                    </>
                )}

                <label className="grid gap-1.5 text-sm font-extrabold text-neutral-800">
                    상세 내용
                    <textarea required value={values.message} onChange={(event) => update("message", event.target.value)} minLength={5} maxLength={3500} rows={7} className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base font-bold leading-7 text-neutral-900 outline-none transition focus:border-aurora-indigo focus:ring-2 focus:ring-aurora-indigo/15" placeholder={mode === "partnership" ? "상품의 차별점, 공급 조건, 인증·허가 자료 보유 여부와 제안 내용을 적어 주세요." : "용도, 포장·배송 조건, 세금계산서 필요 여부 등 상담에 필요한 내용을 적어 주세요."} />
                </label>

                <label aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
                    Website
                    <input tabIndex={-1} autoComplete="off" value={values.website} onChange={(event) => update("website", event.target.value)} />
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/80 px-4 py-3 text-sm font-bold leading-6 text-neutral-700">
                    <input required type="checkbox" checked={values.privacyConsent} onChange={(event) => update("privacyConsent", event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-indigo-700" />
                    <span>
                        <b className="text-neutral-900">(필수)</b> 문의 응대에 필요한 이름·연락처·이메일과 제출 내용을 수집·이용하는 데 동의합니다. 자세한 내용은 {" "}
                        <Link href="/privacy" className="font-black text-aurora-indigo underline underline-offset-2">개인정보처리방침</Link>에서 확인할 수 있습니다.
                    </span>
                </label>

                {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold leading-6 text-red-800">{error}</p> : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-bold leading-5 text-neutral-500">
                        {mode === "partnership"
                            ? "제출만으로 입점이나 거래 조건이 확정되지는 않습니다. 담당자 검토 후 이메일로 안내드립니다."
                            : "제출만으로 가격·재고·납품 일정이 확정되지는 않습니다. 담당자 검토 후 이메일로 안내드립니다."}
                    </p>
                    <button disabled={submitting} type="submit" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-aurora-indigo to-violet-600 px-6 py-3 text-sm font-black text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-hover disabled:cursor-not-allowed disabled:opacity-60">
                        {submitting ? <><i className="fa-solid fa-spinner animate-spin" aria-hidden="true" /> 접수 중…</> : <><i className="fa-solid fa-paper-plane" aria-hidden="true" /> 문의 접수하기</>}
                    </button>
                </div>
            </form>
        </section>
    );
}
