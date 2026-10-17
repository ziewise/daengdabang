/**
 * 시안 화면(매일 댕생활 · 댕자랑 · 연구소 · 마이) 공통 데이터 — 로컬 시안 전용, 배포 X
 * ---------------------------------------------------------------------
 *  - 주소: 스티커북 시안 화면 주소(/app/sticker/…)
 *  - 문구: 협업자 화면에 실제로 쓰이는 문구는 그대로 가져온다(운영 기준 · 확장 계획 · 동네 돌봄 분류 · 비회원 3단계 · 굿즈 목록)
 *  - 예시: 로그인 전 연구소의 "예시" 도장 카드(WEEKLY_RECORDS · LAB_EXAMPLE)만. 회원 데이터는 모두 실제 서버 값
 *    (쓰지 않던 예시 데이터 — 게시물 · 굿즈 참여 수 · 반려견 · 지갑 · 주문 · 리포트 · 동네 돌봄 예시 — 는 버튼 대조 정리 때 삭제, 2026-10-17)
 */

import { EXPANSION_CARDS } from "@/components/growth/CommerceCommunityExpansion";
import { GUEST_STEPS } from "@/components/growth/GrowthHub";
import { POLICIES } from "@/components/growth/GrowthPolicySummary";
import { CATEGORIES, buildNaverMapUrl } from "@/components/growth/LocalCareFinder";

export { CATEGORIES, EXPANSION_CARDS, GUEST_STEPS, POLICIES, buildNaverMapUrl };

/* ── 주소 ── */
export type Concept = "sticker";
export type PageKey = "daily" | "show" | "lab" | "my";
export const pageHref = (c: Concept, p: PageKey) => `/app/${c}/${p}/`;
/** 카드 키(daily · show · lab) → 그 시안의 화면 주소 */
export const coverHref = (c: Concept, key: "daily" | "show" | "lab") => pageHref(c, key);

/* ── 댕자랑 ── */
// 댕자랑 게시물 — 서버 응답(ShowcasePost)을 폴라로이드 벽 모양으로 바꾼 것(show-feed.ts toPost)
export type Post = {
    id: string; authorId: string; author: string; official?: boolean; followers: number; date: string;
    pet?: string; breed?: string; img: string; text: string; bones: number; followed: boolean; mine?: boolean; topic?: boolean;
    boned?: boolean; canDelete?: boolean; // 실제 피드: 내가 응원했는지 · 내가 지울 수 있는지(서버 값)
};

/* ── 연구소 ── */
// 로그인 전 "예시" 도장 카드 — 실제 주간 기록과 같은 모양(주차 · 한 줄 비교 · 새로 보임 · 이번엔 안 보임)
export const WEEKLY_RECORDS = [
    { week: "10월 1주", date: "10.06", headline: "지난주보다 눈가가 한결 깨끗해 보여요", added: ["털 정리된 눈가"], gone: ["눈물 자국"] },
    { week: "9월 4주", date: "09.29", headline: "전체적인 털 상태가 고르게 유지되고 있어요", added: [], gone: [] },
    { week: "9월 3주", date: "09.22", headline: "첫 주간 기록이에요. 다음 주부터 비교해 드려요", added: [], gone: [] },
];
export const LAB_EXAMPLE = {
    headline: "지난주보다 눈가가 한결 깨끗해 보여요",
    added: ["털 정리된 눈가"],
    gone: ["눈물 자국"],
    observe: "초인종 소리 뒤 짧게 짖고 금방 진정했어요",
};

/* ── 마이 ── */
export const MY_MENUS = [
    { icon: "fa-receipt", title: "주문 내역", href: "/mypage/orders/" },
    { icon: "fa-dog", title: "반려견 관리", href: "/mypage/#pet-profiles" },
    { icon: "fa-truck", title: "배송지 관리", href: "/mypage/address/" },
    { icon: "fa-credit-card", title: "결제수단", href: "/mypage/payments/" },
    { icon: "fa-wand-magic-sparkles", title: "추천 설정", href: "/mypage/recommendations/" },
    { icon: "fa-user-pen", title: "정보 수정", href: "/mypage/profile/" },
];
export const CS_MENUS = [
    { icon: "fa-bullhorn", title: "공지사항", href: "/notice/" },
    { icon: "fa-circle-question", title: "자주 묻는 질문", href: "/faq/" },
    { icon: "fa-comment-dots", title: "1:1 문의", href: "/inquiry/" },
    { icon: "fa-rotate-left", title: "교환 · 반품", href: "/return/" },
    { icon: "fa-file-lines", title: "이용약관", href: "/terms/" },
    { icon: "fa-shield-halved", title: "개인정보처리방침", href: "/privacy/" },
];

/* 주간 사진 변화 리포트 예시(최근 → 이전) — 협업자 주간 사진 분석 기록(lib/weekly-photo-analysis)과 같은 모양.
 * 실제로는 loadWeeklyPhotoAnalyses 로 받아온 기록이 들어감. 날짜 · 한 줄 비교는 위 WEEKLY_RECORDS 와 맞춤 */
