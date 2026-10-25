"use client";

/**
 * 마이페이지 결제수단 관리
 * 결제수단 저장(빌링) 기능은 아직 없음 — 결제할 때마다 Toss Payments 보안 창에서 고름.
 * 앱: 아래 기존 안내 그대로.
 * 웹(2026-10-24 사용자 "메뉴는 두고 준비 중 안내"): 준비 중 판(3D 공구 그림 · 준비 중 배지) · 지금 결제하는 방법 세 단계 ·
 *   카드 정보 보관 안내 · 장바구니 / 주문 내역 버튼(기존 링크). 기존 블록(data-pay-legacy)은 웹에서만 숨김(app/mypage-web.css).
 */
import Link from "next/link";
import MypageSectionLayout, { MypageLoginGate } from "@/components/mypage/MypageSectionLayout";
import { useAuth } from "@/lib/store";
// 2026-10-26 웹 머리 설명 해요체(앱 설명은 그대로)
import { useWebScreen } from "@/hooks/useWebScreen";

export default function MypagePaymentsPage() {
    const { user } = useAuth();
    const webScreen = useWebScreen();
    if (!user) return <MypageLoginGate redirect="/mypage/payments/" />;

    return (
        <MypageSectionLayout
            eyebrow="MY 정보"
            title="결제수단 관리"
            description={webScreen
                ? "결제수단 저장 기능과 지금 결제하는 방법을 알려 드려요."
                : "결제수단 저장 여부와 결제 단계의 이용 방법을 안내합니다."}
        >
            {/* 웹 전용 — 준비 중 안내(앱은 hidden) */}
            <div className="hidden" data-pay-web>
                <section className="pw-hero" aria-labelledby="pw-hero-title">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src="/images/ui/program-preparing-192.webp" alt="" aria-hidden="true" className="pw-hero-art" />
                    <div className="pw-hero-text">
                        <p className="pw-kicker">COMING SOON</p>
                        <h2 id="pw-hero-title">결제수단 저장 기능을 <span>준비하고 있어요</span></h2>
                        <p>준비가 끝나면 이 화면에서 자주 쓰는 결제수단을 저장하고 관리할 수 있어요. 그전까지는 결제할 때마다 Toss Payments 보안 창에서 결제수단을 고르면 돼요.</p>
                        <span className="pw-badge"><i className="fa-solid fa-screwdriver-wrench" aria-hidden="true" />준비 중</span>
                    </div>
                </section>

                <section className="pw-sec" aria-labelledby="pw-flow-title">
                    <h2 id="pw-flow-title"><span className="pw-no"><i className="fa-solid fa-credit-card" aria-hidden="true" /></span>지금은 이렇게 결제해요</h2>
                    <ol className="pw-steps">
                        {[
                            { icon: "fa-cart-shopping", title: "장바구니", text: "결제할 상품을 고르고 주문하기를 눌러요." },
                            { icon: "fa-list-check", title: "주문서", text: "카드 · 간편결제 등 결제수단을 골라요." },
                            { icon: "fa-shield-halved", title: "Toss 보안 창", text: "결제사 보안 화면에서 결제를 마쳐요." },
                        ].map((step, index) => (
                            <li key={step.title}>
                                <span className="pw-step-icon"><i className={`fa-solid ${step.icon}`} aria-hidden="true" /><b>{index + 1}</b></span>
                                <strong>{step.title}</strong>
                                <small>{step.text}</small>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="pw-safe">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src="/images/ui/policy-info-192.webp" alt="" aria-hidden="true" />
                    <div>
                        <h3>카드 정보는 댕다방에 남지 않아요</h3>
                        <p>카드번호와 CVC는 회원 계정에 저장하지 않고, 결제 정보는 결제사의 보안 화면에서만 입력해요.</p>
                    </div>
                </section>

                <div className="pw-actions">
                    <Link href="/cart" className="pw-go"><i className="fa-solid fa-cart-shopping" aria-hidden="true" />장바구니</Link>
                    <Link href="/mypage/orders" className="pw-sub">주문 내역 확인</Link>
                </div>
            </div>

            <section className="surface p-5 sm:p-7" aria-labelledby="payment-storage-heading" data-mp-card="plain" data-pay-legacy>
                <div className="grid gap-5 sm:grid-cols-[72px_1fr] sm:items-start">
                    <span className="grid h-[72px] w-[72px] place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-700" aria-hidden="true">
                        <i className="fa-solid fa-credit-card" />
                    </span>
                    <div>
                        <h2 id="payment-storage-heading" className="text-xl font-black text-neutral-950">저장된 결제수단이 없습니다.</h2>
                        <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                            댕다방은 카드번호와 CVC를 회원 계정에 저장하지 않습니다. 결제할 때 Toss Payments 창에서 그 주문에 사용할 수단을 선택합니다.
                        </p>
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold leading-5 text-emerald-900">
                            <i className="fa-solid fa-shield-halved mr-2" aria-hidden="true" />
                            카드 등록·삭제 기능이 있는 것처럼 표시하지 않으며, 결제정보 입력은 결제사의 보안 화면에서 진행됩니다.
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <Link href="/cart" className="btn btn-primary">장바구니에서 결제하기</Link>
                            <Link href="/mypage/orders" className="btn btn-secondary">주문 내역 확인</Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className="surface mt-4 p-5 sm:p-6" aria-labelledby="payment-flow-heading" data-mp-card data-pay-legacy>
                <h2 id="payment-flow-heading" className="text-lg font-black text-neutral-950" data-mp-band="sky" data-mp-art="info" data-mp-kicker="HOW TO PAY">결제수단은 언제 선택하나요?</h2>
                <ol className="mt-4 grid gap-3 text-sm font-bold leading-6 text-neutral-600 sm:grid-cols-3">
                    {[
                        ["1", "장바구니에서 결제할 상품을 선택합니다."],
                        ["2", "주문서에서 이용 가능한 결제수단을 고릅니다."],
                        ["3", "Toss Payments 보안창에서 결제를 진행합니다."],
                    ].map(([step, text]) => (
                        <li key={step} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                            <span className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-xs font-black text-white" aria-hidden="true">{step}</span>
                            {text}
                        </li>
                    ))}
                </ol>
            </section>
        </MypageSectionLayout>
    );
}
