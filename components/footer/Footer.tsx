/**
 * Footer — 사이트 공용 푸터
 * ---------------------------------------------------------------------
 * 5개 영역:
 *   1. 브랜드 + 뉴스레터
 *   2. 메타 링크 + SNS
 *   3. 고객센터 (전화·이메일)
 *   4. 사업자 정보 (한국 쇼핑몰 법적 필수)
 *   5. 법적 링크 + 카피라이트
 */
import Link from "next/link";
import BrandLogo from "@/components/header/BrandLogo";
import { FOOTER_META_LINKS, FOOTER_LEGAL_LINKS } from "@/lib/menu-data";
import NewsletterForm from "./NewsletterForm";

export default function Footer() {
    return (
        <footer className="mt-24 bg-white/60 backdrop-blur-xl border-t border-white/60">
            <div className="max-w-[1400px] mx-auto px-6 py-12 space-y-10">

                {/* 1. 브랜드 + 뉴스레터 */}
                <div className="grid md:grid-cols-[1fr_auto] gap-10 items-start">
                    <div>
                        <BrandLogo className="mb-4" />
                        <p className="text-sm text-neutral-600 leading-relaxed max-w-md">
                            우리 댕댕이의 매일을 더 특별하게 — <strong className="font-bold">큐레이션 펫 쇼핑몰</strong>
                        </p>
                        <p className="text-sm text-neutral-500 mt-1 max-w-md">
                            사료부터 산책 용품, 의류·케어까지 진짜 필요한 것만 골라 담았습니다.
                        </p>
                    </div>
                    <NewsletterForm />
                </div>

                <div className="h-px bg-neutral-200/70" />

                {/* 2. 메타 링크 + SNS */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {FOOTER_META_LINKS.map((l) => (
                            <Link
                                key={l.label}
                                href={l.href}
                                className="text-sm font-medium text-neutral-600 hover:text-aurora-indigo"
                            >
                                {l.label}
                            </Link>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <SnsBtn href="https://instagram.com/daengdabang" icon="fa-instagram" brand="fa-brands" color="from-pink-500 to-purple-500" label="Instagram" />
                        <SnsBtn href="#youtube" icon="fa-youtube" brand="fa-brands" color="from-red-500 to-red-600" label="YouTube" />
                        <SnsBtn href="#blog" icon="fa-blog" brand="fa-solid" color="from-green-500 to-emerald-500" label="블로그" />
                        <SnsBtn href="#kakao" icon="fa-comment" brand="fa-solid" color="from-yellow-400 to-amber-500" label="카카오톡" />
                    </div>
                </div>

                <div className="h-px bg-neutral-200/70" />

                {/* 3. 고객센터 강조 영역 */}
                <div className="text-center md:text-left">
                    <span className="block text-[10px] tracking-[0.3em] font-black text-aurora-indigo mb-2">
                        CUSTOMER CENTER
                    </span>
                    <a
                        href="tel:1577-0000"
                        className="inline-block text-3xl md:text-4xl font-black tracking-tight text-foreground hover:text-aurora-indigo transition mb-2"
                    >
                        1577-0000
                    </a>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                        <strong className="font-bold">평일</strong> 10:00 ~ 18:00 (점심 12:30 ~ 13:30) ·{" "}
                        <strong className="font-bold">주말·공휴일 휴무</strong>
                        <br />
                        문의 메일 <strong className="font-bold">help@daengdabang.com</strong>
                    </p>
                </div>

                <div className="h-px bg-neutral-200/70" />

                {/* 4. 사업자 정보 (한국 쇼핑몰 법적 필수) */}
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-[11px] text-neutral-500">
                    {[
                        ["상호", "댕다방"],
                        ["대표자", "홍길동"],
                        ["사업자등록번호", "000-00-00000"],
                        ["통신판매업신고", "제2026-서울XX-0000호"],
                        ["주소", "서울특별시 XX구 XX로 00, 0층"],
                        ["호스팅 제공자", "Vercel"],
                        ["개인정보 관리책임자", "홍길동 (privacy@daengdabang.com)"],
                        ["입점 / 제휴 문의", "partner@daengdabang.com"],
                    ].map(([k, v]) => (
                        <div key={k}>
                            <strong className="font-bold text-neutral-600 mr-1">{k}</strong>
                            <span>{v}</span>
                        </div>
                    ))}
                </div>

                {/* 5. 법적 링크 + 카피라이트 */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4 border-t border-neutral-200/70">
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                        {FOOTER_LEGAL_LINKS.map((l) => (
                            <Link
                                key={l.label}
                                href={l.href}
                                className={`text-xs ${
                                    l.label === "개인정보처리방침"
                                        ? "font-bold text-foreground"
                                        : "text-neutral-500 hover:text-aurora-indigo"
                                }`}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </div>
                    <p className="text-[11px] text-neutral-400">
                        © 2026 Daengdabang. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}

function SnsBtn({
    href, icon, brand, color, label,
}: { href: string; icon: string; brand: string; color: string; label: string }) {
    return (
        <a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            aria-label={label}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white bg-gradient-to-br ${color} hover:scale-105 transition`}
        >
            <i className={`${brand} ${icon} text-base`} />
        </a>
    );
}
