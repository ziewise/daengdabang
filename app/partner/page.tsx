import type { Metadata } from "next";
import Link from "next/link";
import BusinessInquiryPanel from "@/components/contact/BusinessInquiryPanel";

export const metadata: Metadata = {
    title: "입점·제휴 문의 | 댕다방",
    description: "댕다방 브랜드·상품 입점, 공급·유통, 공동 기획 제안 접수",
    alternates: { canonical: "/partner" },
};

const reviewSteps = [
    ["01", "제안 접수", "브랜드와 상품, 공식 소개 주소, 담당자 정보를 안전하게 접수합니다."],
    ["02", "기초 확인", "상품 정보와 공급 주체, 판매에 필요한 표시·인증 자료의 준비 여부를 확인합니다."],
    ["03", "카테고리 검토", "댕다방 고객에게 필요한 쓰임과 기존 카탈로그의 빈칸을 함께 살핍니다."],
    ["04", "개별 회신", "검토 결과와 다음 협의가 필요한 내용을 접수한 이메일로 안내드립니다."],
] as const;

const proposalTypes = [
    ["fa-box-open", "브랜드·상품 입점", "제조사, 브랜드사, 공식 유통사의 신규 상품 제안"],
    ["fa-truck-fast", "공급·유통 제휴", "안정적인 공급과 운영 조건을 갖춘 파트너십 제안"],
    ["fa-wand-magic-sparkles", "공동 기획", "보호자에게 유용한 콘텐츠, 세트, 캠페인 공동 기획"],
] as const;

export default function PartnerInquiryPage() {
    return (
        <div className="mx-auto w-full max-w-[1180px] px-4 py-10 md:px-6 md:py-14">
            <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,247,237,.96),rgba(239,246,255,.94)_48%,rgba(238,242,255,.96))] px-6 py-10 shadow-card sm:px-10 sm:py-14">
                <div aria-hidden="true" className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-orange-200/50 blur-3xl" />
                <div aria-hidden="true" className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-indigo-200/50 blur-3xl" />
                <div className="relative max-w-3xl">
                    <p className="text-xs font-black tracking-[0.24em] text-aurora-indigo">PARTNER WITH DAENGDABANG</p>
                    <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-0.035em] text-foreground sm:text-5xl">
                        좋은 상품이 보호자에게<br className="hidden sm:block" /> 제대로 닿도록.
                    </h1>
                    <p className="mt-5 max-w-2xl text-sm font-bold leading-7 text-neutral-600 sm:text-base sm:leading-8">
                        댕다방은 상품 수를 늘리기 위한 입점보다, 반려견의 실제 생활에 분명한 쓰임이 있는 상품을 찾습니다.
                        브랜드가 지켜온 기준과 상품의 이유를 들려주세요.
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                        <a href="#partner-form" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950">
                            제안서 작성하기 <i className="fa-solid fa-arrow-down text-xs" aria-hidden="true" />
                        </a>
                        <Link href="/brand-story" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-300 bg-white/80 px-5 py-2.5 text-sm font-black text-neutral-800 transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-indigo">
                            댕다방의 선택 기준 보기
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mt-12" aria-labelledby="partner-types-title">
                <p className="text-xs font-black tracking-[0.2em] text-orange-800">WHAT WE REVIEW</p>
                <h2 id="partner-types-title" className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">이런 제안을 기다립니다</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {proposalTypes.map(([icon, title, body]) => (
                        <article key={title} className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-card backdrop-blur">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-aurora-indigo"><i className={`fa-solid ${icon}`} aria-hidden="true" /></span>
                            <h3 className="mt-4 text-lg font-black text-foreground">{title}</h3>
                            <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">{body}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="mt-12 grid gap-8 rounded-[30px] border border-neutral-200/80 bg-white/65 p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr]" aria-labelledby="partner-review-title">
                <div>
                    <p className="text-xs font-black tracking-[0.2em] text-aurora-indigo">REVIEW FLOW</p>
                    <h2 id="partner-review-title" className="mt-2 text-2xl font-black tracking-tight text-foreground">한 번 더 살펴보고 답합니다</h2>
                    <p className="mt-3 text-sm font-bold leading-7 text-neutral-600">
                        접수 순서만으로 입점을 결정하지 않습니다. 상품의 쓰임, 정보의 충실도, 공급 안정성과 고객 경험을 함께 검토합니다.
                    </p>
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/85 p-4 text-sm font-bold leading-6 text-amber-950">
                        가격표만 있는 제안보다 공식 소개 자료, 공급 주체, 상품 표시·인증 자료의 준비 여부를 함께 알려주시면 검토에 도움이 됩니다.
                    </div>
                </div>
                <ol className="grid gap-3 sm:grid-cols-2">
                    {reviewSteps.map(([number, title, body]) => (
                        <li key={number} className="rounded-2xl border border-neutral-200 bg-white p-5">
                            <span className="text-xs font-black tracking-[0.16em] text-orange-800">{number}</span>
                            <h3 className="mt-2 font-black text-foreground">{title}</h3>
                            <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">{body}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <div id="partner-form" className="mt-12 scroll-mt-24">
                <BusinessInquiryPanel mode="partnership" />
            </div>
        </div>
    );
}
