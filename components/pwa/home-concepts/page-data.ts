/**
 * 시안 화면(매일 댕생활 · 댕자랑 · 연구소 · 마이) 공통 데이터 — 로컬 시안 전용, 배포 X
 * ---------------------------------------------------------------------
 *  - 주소: 스티커북 시안 화면 주소(/app/sticker/…)
 *  - 문구: 협업자 화면에 실제로 쓰이는 문구는 그대로 가져온다(운영 기준 · 확장 계획 · 동네 돌봄 분류 · 비회원 3단계 · 굿즈 목록)
 *  - 예시: 로컬엔 API 주소가 없어 회원 데이터를 못 받으므로, 서버 응답 이름에 맞춘 예시 값(로그인 후 예시 전용)
 */

import { EXPANSION_CARDS } from "@/components/growth/CommerceCommunityExpansion";
import { GUEST_STEPS } from "@/components/growth/GrowthHub";
import { POLICIES } from "@/components/growth/GrowthPolicySummary";
import { CATEGORIES, buildNaverMapUrl } from "@/components/growth/LocalCareFinder";
import { GOODS_CONTEST_CATALOG } from "@/lib/goods-contest";
import type { WeeklyPhotoAnalysisRecord } from "@/lib/weekly-photo-analysis";

export { CATEGORIES, EXPANSION_CARDS, GUEST_STEPS, POLICIES, buildNaverMapUrl };

/* ── 주소 ── */
export type Concept = "sticker";
export type PageKey = "daily" | "show" | "lab" | "my";
export const pageHref = (c: Concept, p: PageKey) => `/app/${c}/${p}/`;
/** 카드 키(daily · show · lab) → 그 시안의 화면 주소 */
export const coverHref = (c: Concept, key: "daily" | "show" | "lab") => pageHref(c, key);

/* ── 매일 댕생활 ── */
// 진행률: 서버 weeklyAttendanceProgress/Target · monthlyAnalysisProgress/Target (목표도 서버 값)
export const PROGRESS = { attend: 5, attendTarget: 7, ai: 2, aiTarget: 5 };
// XP 얻는 방법 (출근 코인 · 할 일 XP 는 서버 값, 화면엔 기본값)
export const XP_WAYS = [
    { icon: "fa-calendar-check", title: "출근도장", body: "하루 한 번 · 2코인" },
    { icon: "fa-person-walking", title: "20분 산책", body: "오늘 할 일 · +5XP" },
    { icon: "fa-eye", title: "눈 상태 확인", body: "오늘 할 일 · +5XP" },
];
// 동네 돌봄 예시(로컬 시안에서 서버를 못 부를 때만 — "예시" 표시)
export const CARE_SAMPLE: Record<string, { name: string; dist: string; addr: string }[]> = {
    veterinary: [
        { name: "행복한 동물병원", dist: "350m", addr: "근처 큰길 1층" },
        { name: "24시 튼튼 동물메디컬센터", dist: "820m", addr: "역 앞 2층" },
        { name: "우리동네 동물병원", dist: "1.2km", addr: "공원 옆" },
    ],
    grooming: [
        { name: "몽글몽글 펫살롱", dist: "420m", addr: "상가 1층" },
        { name: "보송 애견미용", dist: "960m", addr: "시장 입구" },
    ],
    hotel: [
        { name: "포근 펫호텔", dist: "1.1km", addr: "주택가 안쪽" },
        { name: "꿈꾸는 댕댕 호텔", dist: "1.8km", addr: "큰길 3층" },
    ],
    daycare: [
        { name: "놀이터 애견유치원", dist: "700m", addr: "공원 앞" },
        { name: "꼬리콩 데이케어", dist: "1.4km", addr: "학교 옆" },
    ],
};

/* ── 댕자랑 ── */
const POSTER = (b: string) => `/images/pet-companion/cute-v4-breeds/${b}-poster.webp`;
// 댕자랑 게시물 — 서버 응답(작성자 · 팔로워 · 날짜 · 반려견 · 주제 · 응원)에 맞춘 예시. 실제 피드는 사진이 실사진
export type Post = {
    id: string; authorId: string; author: string; official?: boolean; followers: number; date: string;
    pet?: string; breed?: string; img: string; text: string; bones: number; followed: boolean; mine?: boolean; topic?: boolean;
    boned?: boolean; canDelete?: boolean; // 실제 피드: 내가 응원했는지 · 내가 지울 수 있는지(서버 값)
};
export const POSTS: Post[] = [
    { id: "p1", authorId: "a_me", author: "지은", followers: 12, date: "10월 15일 오전 9:12", pet: "몽이", breed: "토이 푸들", img: POSTER("toy-poodle"), text: "최애 장난감 오리 인형을 물고 집 안을 세 바퀴나 돌았어요. 꽥꽥 소리가 날 때마다 꼬리가 더 빨라져요.", bones: 24, followed: false, mine: true, topic: true },
    { id: "p2", authorId: "a_haru", author: "하루맘", followers: 38, date: "10월 15일 오전 8:40", pet: "하루", breed: "몰티즈", img: POSTER("maltese-dog"), text: "산책하다 만난 단풍 앞에서 한 컷. 바람이 불 때마다 낙엽을 쫓아가느라 사진 찍기가 제일 어려웠어요.", bones: 41, followed: true },
    { id: "p3", authorId: "a_official", author: "댕다방 운영팀", official: true, followers: 1, date: "10월 14일 오후 10:05", img: POSTER("bichon-frise"), text: "[댕다방 운영팀 공식 게시물]\n늦은 밤, 불을 하나만 남겨두니 이불 위에서 눈이 스르르 감겨요. 오늘도 잘 놀고 잘 쉰 우리 집 작은 솜뭉치. 모두 편안한 밤 보내세요.", bones: 9, followed: false },
    { id: "p4", authorId: "a_coco", author: "코코언니", followers: 21, date: "10월 14일 오후 6:30", pet: "코코", breed: "포메라니안", img: POSTER("pomeranian"), text: "털 정리하고 왔더니 솜사탕이 됐어요. 거울 앞에서 한참 자기 모습을 구경하더라고요.", bones: 37, followed: false },
    { id: "p5", authorId: "a_bori", author: "보리아빠", followers: 17, date: "10월 14일 오후 2:15", pet: "보리", breed: "시바견", img: POSTER("shiba-inu"), text: "간식 앞에서는 늘 이 표정이에요. 기다려를 열까지 세면 눈빛이 더 간절해져요.", bones: 18, followed: true, topic: true },
    { id: "p6", authorId: "a_dubu", author: "두부네", followers: 9, date: "10월 13일 오후 5:48", pet: "두부", breed: "비숑 프리제", img: POSTER("bichon-frise"), text: "오늘 처음 공놀이 성공! 던지면 가져오는 걸 드디어 해냈어요.", bones: 29, followed: false },
    { id: "p7", authorId: "a_choco", author: "초코누나", followers: 44, date: "10월 13일 오전 11:02", pet: "초코", breed: "닥스훈트", img: POSTER("dachshund"), text: "낮잠 자다 깬 얼굴. 귀가 반쯤 뒤집힌 줄도 모르고 저를 빤히 봐요.", bones: 52, followed: false },
    { id: "p8", authorId: "a_haru", author: "하루맘", followers: 38, date: "10월 12일 오후 4:20", pet: "하루", breed: "몰티즈", img: POSTER("maltese-dog"), text: "목욕하고 수건 속에 쏙. 드라이 전 이 순간이 제일 귀여워요.", bones: 33, followed: true },
];
// 굿즈 공모전: 실제 굿즈 목록 + 예시 참여 수(실제는 서버 집계)
export const GOODS = GOODS_CONTEST_CATALOG.map((g, i) => ({ ...g, joined: [412, 388, 351, 297, 264, 233, 190, 152, 141, 128, 117, 104, 96, 88, 73, 65, 52, 47, 39, 28, 17][i] ?? 10 })); // 21개 전부 · 참여 수는 예시

/* ── 연구소 ── */
export const PET = { name: "몽이", breed: "토이 푸들", age: "4살", weight: "3.2kg", photo: POSTER("toy-poodle") };
// 주간 사진 기록(weekKey · comparison.headline · 새로 보임 · 이번엔 안 보임)
export const WEEKLY_RECORDS = [
    { week: "10월 1주", date: "10.06", headline: "지난주보다 눈가가 한결 깨끗해 보여요", added: ["털 정리된 눈가"], gone: ["눈물 자국"] },
    { week: "9월 4주", date: "09.29", headline: "전체적인 털 상태가 고르게 유지되고 있어요", added: [], gone: [] },
    { week: "9월 3주", date: "09.22", headline: "첫 주간 기록이에요. 다음 주부터 비교해 드려요", added: [], gone: [] },
];
// 행동·소리 분석 기록(긴급도 · 날짜 · 요약)
export const OBSERVATIONS = [
    { date: "10.03", urgency: "평소와 비교 관찰", tone: "#1f7a59", bg: "#ddf5ea", summary: "초인종 소리 뒤 짧게 짖고 금방 진정했어요" },
    { date: "09.24", urgency: "판단 어려움", tone: "#7a6a63", bg: "#f1ece9", summary: "여러 소리가 섞여 대상을 구분하기 어려웠어요 · 코인 환급" },
];
export const LAB_EXAMPLE = {
    headline: "지난주보다 눈가가 한결 깨끗해 보여요",
    added: ["털 정리된 눈가"],
    gone: ["눈물 자국"],
    observe: "초인종 소리 뒤 짧게 짖고 금방 진정했어요",
};

/* ── 마이 ── */
export const WALLET = { points: 3200, pointUnit: 1000, coinUnit: 10 };
export const ORDERS = [
    { id: "DDB-1008-0012", date: "10.08", title: "러프웨어 하네스 외 1건", status: "배송 중", price: 89000 },
    { id: "DDB-0921-0007", date: "09.21", title: "요라 올브리드 2.5kg", status: "구매 확정", price: 32900 },
];
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
export const WEEKLY_REPORT: WeeklyPhotoAnalysisRecord[] = [
    {
        id: "wpa_sample_3", petProfileId: 1, analyzedAt: "2026-10-06T19:20:00+09:00", weekKey: "2026-W41",
        viewIds: ["front", "left", "right", "back"], viewCount: 4,
        title: "눈가와 털 결이 정돈된 한 주", statusLabel: "분석 완료", photoQualityLabel: "사진 상태 좋음",
        description: "네 방향 사진에서 눈가 주변이 깨끗하게 보이고, 몸통 털 결이 고르게 확인됩니다.",
        observations: ["눈가 주변이 깨끗함", "몸통 털 결이 고름", "귀 안쪽이 깨끗해 보임"],
        careActions: ["눈가 털은 짧게 정리해 눈물 자국이 생기지 않게 관리해요", "산책 후 발바닥 사이를 가볍게 닦아 주세요", "빗질은 주 3회 정도 이어 가요"],
        summary: [],
        comparison: {
            status: "ready", headline: "지난주보다 눈가가 한결 깨끗해 보여요", previousAnalysisId: "wpa_sample_2", previousAnalyzedAt: "2026-09-29T19:05:00+09:00",
            newObservations: ["털 정리된 눈가"], commonObservations: ["고른 몸통 털 결", "깨끗한 귀 안쪽"], notObservedNow: ["눈물 자국"],
        },
    },
    {
        id: "wpa_sample_2", petProfileId: 1, analyzedAt: "2026-09-29T19:05:00+09:00", weekKey: "2026-W40",
        viewIds: ["front", "left", "right", "back"], viewCount: 4,
        title: "털 상태가 고르게 유지된 한 주", statusLabel: "분석 완료", photoQualityLabel: "사진 상태 좋음",
        description: "전체적인 털 상태가 고르게 보이며, 눈가에 옅은 눈물 자국이 남아 있습니다.",
        observations: ["몸통 털 결이 고름", "눈가에 옅은 눈물 자국"],
        careActions: ["눈가를 하루 한 번 부드럽게 닦아 주세요", "빗질은 주 3회 정도 이어 가요"],
        summary: [],
        comparison: {
            status: "ready", headline: "전체적인 털 상태가 고르게 유지되고 있어요", previousAnalysisId: "wpa_sample_1", previousAnalyzedAt: "2026-09-22T18:40:00+09:00",
            newObservations: [], commonObservations: ["고른 몸통 털 결", "눈가의 옅은 눈물 자국"], notObservedNow: [],
        },
    },
    {
        id: "wpa_sample_1", petProfileId: 1, analyzedAt: "2026-09-22T18:40:00+09:00", weekKey: "2026-W39",
        viewIds: ["front", "left", "right"], viewCount: 3,
        title: "첫 주간 사진 기록", statusLabel: "분석 완료", photoQualityLabel: "일부 사진 흐림",
        description: "첫 주간 기록이에요. 다음 주 같은 방향 사진과 비교하는 기준이 됩니다.",
        observations: ["몸통 털 결이 고름", "눈가에 옅은 눈물 자국"],
        careActions: [],
        summary: [],
        comparison: { status: "insufficient_evidence", headline: "첫 주간 기록이에요. 다음 주부터 비교해 드려요", commonObservations: [], newObservations: [], notObservedNow: [] },
    },
];
