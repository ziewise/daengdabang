import type { Metadata } from "next";
import Link from "next/link";
import BusinessInquiryPanel from "@/components/contact/BusinessInquiryPanel";

export const metadata: Metadata = {
    title: "대량 구매 문의 | 댕다방",
    description: "기업·기관·단체를 위한 댕다방 상품 대량 구매와 견적 상담",
    alternates: { canonical: "/bulk-order" },
};

const useCases = [
    ["fa-building", "기업·기관 구매", "사내 행사, 복지, 고객 선물처럼 목적과 수량이 정해진 주문"],
    ["fa-gift", "행사·프로모션", "구성, 포장, 납품 일정까지 함께 확인해야 하는 기획 주문"],
    ["fa-calendar-check", "정기·분할 납품", "여러 지점이나 일정에 맞춰 공급 가능 여부를 확인하는 상담"],
] as const;

const checkItems = [
    "희망 상품명·옵션과 예상 수량",
    "예산 범위와 희망 납품일",
    "배송 지역·지점 수와 분할 배송 여부",
    "포장, 문구, 세금계산서 등 필요한 조건",
] as const;

export default function BulkOrderPage() {
    return (
        <div className="mx-auto w-full max-w-[1180px] px-4 py-10 md:px-6 md:py-14">
            <section className="overflow-hidden rounded-[32px] border border-white/70 bg-neutral-950 px-6 py-10 text-white shadow-card sm:px-10 sm:py-14">
                <div className="grid items-end gap-8 lg:grid-cols-[1.35fr_0.65fr]">
                    <div>
                        <p className="text-xs font-black tracking-[0.24em] text-orange-300">BULK ORDER</p>
                        <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
                            여러 아이를 위한 주문도<br className="hidden sm:block" /> 한 건처럼 세심하게.
                        </h1>
                        <p className="mt-5 max-w-2xl text-sm font-bold leading-7 text-neutral-300 sm:text-base sm:leading-8">
                            기업·기관·단체의 대량 구매는 상품과 수량만으로 끝나지 않습니다. 사용 목적, 예산, 일정과 배송 조건을 함께 살펴 가능한 범위를 안내드립니다.
                        </p>
                        <a href="#bulk-order-form" style={{ color: "#171717" }} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                            상담 내용 작성하기 <i className="fa-solid fa-arrow-down text-xs" aria-hidden="true" />
                        </a>
                    </div>
                    <aside className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                        <p className="text-xs font-black tracking-[0.18em] text-sky-300">QUICK CHECK</p>
                        <ul className="mt-4 grid gap-3 text-sm font-bold leading-6 text-neutral-200">
                            {checkItems.map((item) => <li key={item} className="flex gap-2"><i className="fa-solid fa-check mt-1 text-xs text-orange-300" aria-hidden="true" /><span>{item}</span></li>)}
                        </ul>
                    </aside>
                </div>
            </section>

            <section className="mt-12" aria-labelledby="bulk-use-title">
                <p className="text-xs font-black tracking-[0.2em] text-aurora-indigo">FOR TEAMS &amp; GROUPS</p>
                <h2 id="bulk-use-title" className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">목적에 맞춰 함께 확인합니다</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {useCases.map(([icon, title, body]) => (
                        <article key={title} className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-card backdrop-blur">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><i className={`fa-solid ${icon}`} aria-hidden="true" /></span>
                            <h3 className="mt-4 text-lg font-black text-foreground">{title}</h3>
                            <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">{body}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="mt-12 grid gap-5 rounded-[30px] border border-indigo-100 bg-indigo-50/55 p-6 sm:grid-cols-3 sm:p-8" aria-label="대량 구매 진행 안내">
                {[
                    ["1", "요청 확인", "상품·수량·일정과 필요한 거래 조건을 확인합니다."],
                    ["2", "가능 범위 검토", "현재 판매·공급 가능한 구성과 배송 조건을 검토합니다."],
                    ["3", "개별 안내", "확인된 조건과 다음 협의 내용을 이메일로 답변드립니다."],
                ].map(([number, title, body]) => (
                    <div key={number} className="rounded-2xl bg-white/85 p-5 shadow-sm">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-aurora-indigo text-xs font-black text-white">{number}</span>
                        <h3 className="mt-4 font-black text-foreground">{title}</h3>
                        <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">{body}</p>
                    </div>
                ))}
            </section>

            <div id="bulk-order-form" className="mt-12 scroll-mt-24">
                <BusinessInquiryPanel mode="bulk_order" />
            </div>

            <p className="mt-6 text-center text-sm font-bold text-neutral-500">
                일반 주문·배송 문의는 <Link href="/inquiry" className="font-black text-aurora-indigo underline underline-offset-2">1:1 문의</Link>를 이용해 주세요.
            </p>
        </div>
    );
}
