/**
 * app/return/page.tsx — 교환·반품 안내
 * ---------------------------------------------------------------------
 * 고객센터 > 교환·반품 안내. 전자상거래법 기준 교환/반품 정책 안내.
 * 레이아웃은 약관(app/terms) 페이지와 동일한 sections 패턴.
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "교환·반품 안내 | 댕다방",
    description: "댕다방 교환·반품 정책 안내",
};

const sections = [
    {
        title: "교환·반품 신청 기간",
        body: "상품을 받으신 날부터 7일 이내에 신청하실 수 있습니다. 단, 상품의 내용이 표시·광고와 다르거나 계약 내용과 다르게 이행된 경우에는 상품을 받으신 날부터 3개월 이내, 또는 그 사실을 안 날부터 30일 이내에 신청하실 수 있습니다.",
    },
    {
        title: "교환·반품이 가능한 경우",
        body: "단순 변심(색상·사이즈 등)으로 인한 교환·반품은 상품이 사용되지 않고 재판매가 가능한 상태일 때 접수됩니다. 배송 중 파손, 오배송, 상품 불량의 경우 왕복 배송비를 회사가 부담합니다.",
    },
    {
        title: "교환·반품이 제한되는 경우",
        body: "사용·착용 흔적이 있거나 세탁한 상품, 개봉으로 가치가 현저히 감소한 위생 상품(간식·사료·구강/위생 용품 등), 고객의 요청으로 제작된 맞춤 상품, 포장을 개봉하여 재판매가 어려운 상품은 교환·반품이 제한될 수 있습니다.",
    },
    {
        title: "배송비 안내",
        body: "단순 변심에 의한 교환·반품의 왕복 배송비는 고객 부담입니다. 상품 하자·오배송의 경우 회사가 배송비를 부담하며, 동일 상품으로의 교환을 우선 안내드립니다.",
    },
    {
        title: "환불 처리",
        body: "반품 상품 회수와 검수가 완료되면 영업일 기준 3일 이내에 환불을 진행합니다. 결제 수단에 따라 카드 취소·계좌 환불 등 처리 방식과 소요 시간이 다를 수 있습니다.",
    },
];

export default function ReturnPage() {
    return (
        <main className="mx-auto max-w-[960px] px-4 py-10 md:px-6">
            <p className="text-sm font-black text-aurora-indigo">RETURN &amp; EXCHANGE</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">교환·반품 안내</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-500">
                안심하고 쇼핑하실 수 있도록 교환·반품 기준을 안내드립니다. 아래 버튼에서 바로 신청할 수 있습니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
                <Link
                    href="/inquiry?category=exchange#inquiry-form"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-aurora-indigo/20 bg-white/85 px-4 py-2 text-sm font-extrabold text-aurora-indigo shadow-sm transition hover:-translate-y-0.5 hover:border-aurora-indigo/40 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-indigo"
                >
                    <i className="fa-solid fa-envelope" aria-hidden="true" /> 교환·반품 접수하기 <i className="fa-solid fa-chevron-right text-[9px]" aria-hidden="true" />
                </Link>
                <Link
                    href="/faq"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-4 py-2 text-sm font-extrabold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-indigo"
                >
                    <i className="fa-solid fa-circle-question" aria-hidden="true" /> 자주 묻는 질문
                </Link>
            </div>

            <div className="mt-8 grid gap-5">
                {sections.map((s) => (
                    <section key={s.title} className="border-t border-neutral-200 pt-5">
                        <h2 className="text-lg font-black text-foreground">{s.title}</h2>
                        <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">{s.body}</p>
                    </section>
                ))}
            </div>
        </main>
    );
}
