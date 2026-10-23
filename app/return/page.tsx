/**
 * app/return/page.tsx — 교환·반품 안내
 * ---------------------------------------------------------------------
 * 고객센터 > 교환·반품 안내. 전자상거래법 기준 교환/반품 정책 안내.
 * 레이아웃은 약관(app/terms) 페이지와 동일한 sections 패턴.
 * 2026-10-23 웹 크레파스 결: 고객센터 탭 · 민트 쿠션 머리 판(SupportTop, 접수 · FAQ 버튼은 판 안) → 발자국 →
 * 점선으로 이은 네 단계(웹 전용, 아래 정책 문구를 짧게 줄인 것) → 발자국 → 정책 구역마다 색 쿠션 판.
 * 꾸밈은 app/support-web.css(웹 전용), 앱은 기존 앱 꾸밈 그대로. 정책 문구 · 링크 그대로.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import DeliveryReturnPolicyDetails from "@/components/policy/DeliveryReturnPolicyDetails";
import SupportTop, { SupportPaws } from "@/components/support/SupportTop";
import { RETURN_POLICY } from "@/lib/commerce-policy";
import "../daily-web.css";
import "../support-web.css";

export const metadata: Metadata = {
    title: "교환·반품 안내 | 댕다방",
    description: "댕다방 교환·반품 정책 안내",
};

// 교환·반품 네 단계(웹 전용 요약) — 아래 "요청 가능 기간" · "환불 처리" 문구를 짧게 줄인 것.
// 그림 = 사용자 크레파스 배지(웹접수 · 웹협의발송 · 웹회수검수 · 웹환불 → web-cs-step-*-256.webp, 2026-10-23), 번호 색은 배지 테 색에 맞춤
const RETURN_STEPS = [
    { title: "1:1 문의로 접수", body: "단순 변심은 상품 수령 후 7일 이내에 남겨 주세요.", art: "/images/ui/web-cs-step-receive-256.webp", tint: "is-lav" },
    { title: "협의 후 발송", body: `반품사유 · 택배사 · 배송비 · 반품지를 협의한 뒤 ${RETURN_POLICY.designatedCarrier}로 보내 주세요.`, art: "/images/ui/web-cs-step-ship-256.webp", tint: "is-pink" },
    { title: "회수 · 검수", body: "도착한 상품의 상태를 확인해요.", art: "/images/ui/web-cs-step-inspect-256.webp", tint: "is-mint" },
    { title: "환불 진행", body: "검수가 끝나면 영업일 기준 3일 이내에 환불해요.", art: "/images/ui/web-cs-step-refund-done-256.webp", tint: "is-yellow" },
] as const;

export default function ReturnPage() {
    return (
        <main className="mx-auto max-w-[960px] px-4 py-10 md:px-6" data-daily-web data-support-web="return">
            <SupportTop
                current="return"
                kicker="RETURN & EXCHANGE"
                title="교환·반품 안내"
                lead="안심하고 쇼핑하실 수 있도록 교환·반품 기준을 안내드립니다. 아래 버튼에서 바로 신청할 수 있습니다."
            >
                <div className="mt-4 flex flex-wrap gap-2 cs-actions">
                    <Link
                        href="/inquiry?category=exchange#inquiry-form"
                        className="cs-cta inline-flex min-h-10 items-center gap-2 rounded-full border border-aurora-indigo/20 bg-white/85 px-4 py-2 text-sm font-extrabold text-aurora-indigo shadow-sm transition hover:-translate-y-0.5 hover:border-aurora-indigo/40 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-indigo"
                    >
                        <i className="fa-solid fa-envelope" aria-hidden="true" /> 교환·반품 접수하기 <i className="fa-solid fa-chevron-right text-[9px]" aria-hidden="true" />
                    </Link>
                    <Link
                        href="/faq"
                        className="cs-cta-sub inline-flex min-h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-4 py-2 text-sm font-extrabold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-indigo"
                    >
                        <i className="fa-solid fa-circle-question" aria-hidden="true" /> 자주 묻는 질문
                    </Link>
                </div>
            </SupportTop>
            <SupportPaws />

            {/* 웹 전용 — 점선으로 이은 네 단계(기존 dw-dsteps 결) */}
            <section className="hidden cs-steps-wrap" aria-labelledby="cs-steps-title">
                <div className="dw-rhead">
                    <p className="ddb-crayon-kicker dw-kicker">HOW IT WORKS</p>
                    <h2 id="cs-steps-title" className="ddb-crayon-title ddb-crayon-underline dw-rhead-title">교환·반품은 이렇게 진행돼요</h2>
                </div>
                <ol className="dw-dsteps cs-steps">
                    {RETURN_STEPS.map((step, index) => (
                        <li key={step.title} className={step.tint}>
                            <span className="dw-dstep-art">
                                <Image src={step.art} alt="" width={96} height={96} />
                                <b className="dw-dstep-no">{index + 1}</b>
                            </span>
                            <strong className="dw-dstep-title">{step.title}</strong>
                            <span className="dw-dstep-body">{step.body}</span>
                        </li>
                    ))}
                </ol>
            </section>
            <SupportPaws />

            <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:p-7 cs-policy">
                <DeliveryReturnPolicyDetails />
                <section className="mt-7 border-t border-neutral-200 pt-5 cs-refund">
                    <h2 className="text-base font-black text-neutral-950">환불 처리</h2>
                    <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                        반품 상품 회수와 검수가 완료되면 영업일 기준 3일 이내에 환불을 진행합니다.
                        결제 수단에 따라 카드 승인 취소 또는 계좌 환불 등의 처리 방식과 소요 시간이 다를 수 있습니다.
                    </p>
                </section>
            </div>
        </main>
    );
}
