/**
 * app/notice/page.tsx — 공지사항
 * ---------------------------------------------------------------------
 * 고객센터 > 공지사항. 운영 공지 목록 (현재 mock — 추후 백엔드/CMS 연동).
 * 레이아웃은 약관/개인정보 페이지(app/terms)와 동일 톤으로 통일.
 * 2026-10-23 웹 크레파스 결: 고객센터 탭 · 노랑 쿠션 머리 판(SupportTop) → 발자국 → 날짜 줄 소식(왼쪽 날짜 · 가운데 점 줄 · 오른쪽 흰 쿠션).
 * 날짜 · 점 줄은 웹 전용(hidden → app/support-web.css), 앱은 기존 앱 꾸밈 그대로. 문구 · 순서 그대로.
 */
import type { Metadata } from "next";
import SupportTop, { SupportPaws } from "@/components/support/SupportTop";
import "../daily-web.css";
import "../support-web.css";

export const metadata: Metadata = {
    title: "공지사항 | 댕다방",
    description: "댕다방 서비스 공지사항",
};

// 공지 목록 (최신순) — 추후 실제 데이터로 교체
const NOTICES = [
    {
        tag: "안내",
        title: "댕다방 새 단장 — 메인 페이지 개편 안내",
        date: "2026-06-16",
        body: "더 보기 편한 메인 페이지와 맞춤 메뉴(펫렌즈·챗봇)를 새롭게 선보입니다. 우리 댕댕이에게 맞는 상품을 더 빠르게 찾아보세요.",
    },
    {
        tag: "배송",
        title: "여름철 배송 일정 안내",
        date: "2026-06-10",
        body: "폭염·장마 기간에는 신선/간식 상품의 배송이 1일 정도 지연될 수 있습니다. 주문 시 참고 부탁드립니다.",
    },
    {
        tag: "이벤트",
        title: "신규 가입 회원 혜택 안내",
        date: "2026-06-01",
        body: "신규 가입 시 펫렌즈 사진 분석을 무료로 이용하실 수 있습니다. 우리 아이 정보를 등록하고 맞춤 추천을 받아보세요.",
    },
];

// 왼쪽 날짜("6월 16일" + 연도) — 날짜 글자(YYYY-MM-DD)를 그대로 나눔
function noticeWhen(date: string) {
    const [year, month, day] = date.split("-");
    return { year, monthDay: `${Number(month)}월 ${Number(day)}일` };
}

export default function NoticePage() {
    return (
        <main className="mx-auto max-w-[960px] px-4 py-10 md:px-6" data-daily-web data-support-web="notice">
            <SupportTop current="notice" kicker="NOTICE" title="공지사항" lead="댕다방의 새로운 소식과 안내를 확인하세요." />
            <SupportPaws />

            <div className="mt-8 grid gap-4 cs-notices">
                {NOTICES.map((n) => (
                    <article
                        key={n.title}
                        data-notice-tag={n.tag}
                        className="rounded-2xl bg-white/70 backdrop-blur border border-white/60 shadow-card p-5 md:p-6 hover:shadow-hover transition cs-notice"
                    >
                        {/* 웹 전용 — 왼쪽 날짜 · 가운데 점 줄 */}
                        <p className="hidden cs-when"><b>{noticeWhen(n.date).monthDay}</b><span>{noticeWhen(n.date).year}</span></p>
                        <span className="hidden cs-rail" aria-hidden="true"><i /></span>
                        <div className="cs-notice-card">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full bg-aurora-indigo/10 text-aurora-indigo text-[11px] font-extrabold">
                                {n.tag}
                            </span>
                            <span className="text-[11px] font-bold text-neutral-400">{n.date}</span>
                        </div>
                        <h2 className="text-lg font-black text-foreground">{n.title}</h2>
                        <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">{n.body}</p>
                        </div>
                    </article>
                ))}
            </div>
        </main>
    );
}
