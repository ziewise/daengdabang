/**
 * LegalWebHero — 웹 약관 · 방침 · 법적고지 문서 머리 판 · 2026-10-25
 * ---------------------------------------------------------------------
 * 이용약관 · 개인정보처리방침 · 법적고지 · 사업자 정보 · 구매안전서비스 다섯 문서가 같이 씀.
 *  - 문서 탭(다섯 문서 사이 이동, 지금 문서 분홍)
 *  - 파스텔 쿠션 머리 판: 영문 손글씨 꼬리표 · 주아 제목 + 세 색 밑줄 · 쉬운 한 줄 · 시행일/업데이트 흰 알약 · 3D 그림
 *  - 한눈에 보기(문서별 네 칸) — 본문 조항으로 바로 가는 바로가기. 문구는 본문 내용을 그대로 줄인 것(새 약속 없음)
 *  - 목차 따라가기(LegalScrollSpy): 읽는 곳의 목차 줄을 분홍으로
 * 법률 문구 · 조항 · 표는 각 페이지 그대로 두고, 웹 겉모양은 app/legal-web.css 가 main[data-legal-web] 안에서만 바꿈.
 * 앱(ddb-app-mode)은 이 머리 판을 숨기고 기존 화면 그대로.
 */
import Link from "next/link";
import LegalScrollSpy from "@/components/legal/LegalScrollSpy";
import "@/app/legal-web.css";

const UI = "/images/ui/";

export type LegalKind = "terms" | "privacy" | "legal" | "business" | "escrow";

/** 문서 탭 — 다섯 문서 */
const DOCS: Array<{ kind: LegalKind; href: string; label: string; icon: string }> = [
    { kind: "terms", href: "/terms", label: "이용약관", icon: "fa-file-contract" },
    { kind: "privacy", href: "/privacy", label: "개인정보처리방침", icon: "fa-user-shield" },
    { kind: "legal", href: "/legal", label: "법적고지", icon: "fa-scale-balanced" },
    { kind: "business", href: "/legal/business", label: "사업자 정보", icon: "fa-building" },
    { kind: "escrow", href: "/legal/escrow", label: "구매안전서비스", icon: "fa-shield-halved" },
];

/** 문서별 머리 판 · 한눈에 보기(바로가기 대상 id 는 각 페이지 본문 id 그대로) */
const LOOK: Record<LegalKind, {
    kicker: string;
    title: string;
    lead: string;
    tone: string;
    art: string;
    dateLabel: string;
    glance?: Array<{ href: string; icon: string; tone: string; title: string; text: string }>;
}> = {
    terms: {
        kicker: "TERMS OF SERVICE",
        title: "이용약관",
        lead: "댕다방을 이용하는 회원 · 비회원과 댕다방 사이의 약속이에요. 궁금한 조항은 왼쪽 목차나 아래 바로가기로 찾아보세요.",
        tone: "sky",
        art: "stickers/cs-terms.webp",
        dateLabel: "시행일",
        glance: [
            { href: "#terms-6", icon: "fa-user-plus", tone: "pink", title: "회원가입", text: "제6조 · 가입 신청과 등록" },
            { href: "#terms-7", icon: "fa-door-open", tone: "lav", title: "회원 탈퇴", text: "제7조 · 언제든 탈퇴 요청" },
            { href: "#terms-15", icon: "fa-rotate-left", tone: "mint", title: "청약철회", text: "제15조 · 7일 이내 청약철회" },
            { href: "#terms-14", icon: "fa-money-bill-wave", tone: "yellow", title: "환급", text: "제14조 · 품절로 공급이 어려울 때" },
        ],
    },
    privacy: {
        kicker: "PRIVACY POLICY",
        title: "개인정보처리방침",
        lead: "어떤 정보를 왜 모으고, 얼마나 보관하고, 어떻게 지키는지 알려 드려요.",
        tone: "mint",
        art: "stickers/cs-privacy.webp",
        dateLabel: "시행일",
        glance: [
            { href: "#purpose", icon: "fa-clipboard-list", tone: "sky", title: "모으는 정보", text: "서비스에 필요한 범위만, 필수와 동의 항목을 나눠 관리" },
            { href: "#retention", icon: "fa-box-archive", tone: "yellow", title: "보관 · 파기", text: "목적이 끝나면 지체 없이 파기, 법령 기록은 따로 보관" },
            { href: "#third-party", icon: "fa-hand", tone: "pink", title: "제3자 제공", text: "동의나 법률 근거 없이는 제공하지 않아요" },
            { href: "#rights", icon: "fa-user-check", tone: "lav", title: "내 권리", text: "열람 · 정정 · 삭제 · 처리정지를 언제든 요청" },
        ],
    },
    legal: {
        kicker: "LEGAL NOTICE",
        title: "법적고지",
        lead: "판매자 정보, 거래 조건, 증빙 문서를 한곳에서 확인할 수 있어요.",
        tone: "lav",
        art: "stickers/policy-info.webp",
        dateLabel: "업데이트",
        glance: [
            { href: "#business", icon: "fa-building", tone: "sky", title: "사업자 정보", text: "상호 · 대표자 · 등록번호" },
            { href: "#escrow", icon: "fa-shield-halved", tone: "mint", title: "구매안전서비스", text: "결제대금 매매보호" },
            { href: "#refund", icon: "fa-rotate-left", tone: "pink", title: "청약철회 · 환불", text: "받은 날부터 7일 이내" },
            { href: "#delivery", icon: "fa-truck-fast", tone: "yellow", title: "배송 및 비용", text: "3만 원 이상 기본 배송비 무료" },
        ],
    },
    business: {
        kicker: "BUSINESS INFORMATION",
        title: "사업자 정보 확인",
        lead: "댕다방 운영사의 사업자등록 · 통신판매업 신고 정보와 공정위 확인 경로예요.",
        tone: "yellow",
        art: "stickers/benefit-brand.webp",
        dateLabel: "업데이트",
    },
    escrow: {
        kicker: "PURCHASE SAFETY",
        title: "구매안전서비스",
        lead: "현금성 결제 이용자를 보호하는 구매안전서비스 등록 정보를 공개해요.",
        tone: "mint",
        art: "goods-escrow-256.webp",
        dateLabel: "업데이트",
    },
};

export default function LegalWebHero({ kind, updatedAt }: { kind: LegalKind; updatedAt: string }) {
    const look = LOOK[kind];
    return (
        <div className="lw-top" data-legal-hero>
            {/* 문서 탭 */}
            <nav className="lw-docs" aria-label="약관 · 정책 문서">
                {DOCS.map((doc) => (
                    <Link key={doc.kind} href={doc.href} className={doc.kind === kind ? "is-on" : ""} aria-current={doc.kind === kind ? "page" : undefined}>
                        <i className={`fa-solid ${doc.icon}`} aria-hidden="true" />{doc.label}
                    </Link>
                ))}
            </nav>

            {/* 머리 판 */}
            <header className="lw-hero ddb-hero-band" data-tone={look.tone}>
                <span className="lw-hero-text">
                    <span className="lw-kicker">{look.kicker}</span>
                    <span className="lw-title" role="heading" aria-level={1}>{look.title}</span>
                    <span className="lw-lead">{look.lead}</span>
                    <span className="lw-date"><i className="fa-regular fa-calendar" aria-hidden="true" />{look.dateLabel} {updatedAt}</span>
                </span>
                <span className="lw-hero-art" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}${look.art}`} alt="" />
                </span>
            </header>

            {/* 한눈에 보기 — 본문 조항 바로가기 */}
            {look.glance && (
                <section className="lw-glance" aria-label="한눈에 보기">
                    <p className="lw-glance-t"><span aria-hidden="true">✦</span>한눈에 보기</p>
                    <div>
                        {look.glance.map((item) => (
                            <a key={item.href} href={item.href} data-tone={item.tone}>
                                <span className="lw-glance-i" aria-hidden="true"><i className={`fa-solid ${item.icon}`} /></span>
                                <b>{item.title}</b>
                                <small>{item.text}</small>
                                <i className="fa-solid fa-arrow-down lw-glance-go" aria-hidden="true" />
                            </a>
                        ))}
                    </div>
                </section>
            )}
            <LegalScrollSpy />
        </div>
    );
}
