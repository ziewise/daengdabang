/**
 * appTabs — 앱 틀(App Shell) 아래 탭바 5칸 정의와 "지금 화면은 어느 탭인가" 판별 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 탭: 홈 · 댕생활 · 댕다방 · 쇼핑 · 마이   (케어톡은 상단바 버튼으로)
 *  - 댕생활: 매일 댕생활(/treasure-mine) — 페이지 안 탭으로 오늘 돌봄 · 성장 기록 · 이벤트 · 동네 돌봄 · 안내
 *  - 댕다방: 커뮤니티 · 콘텐츠 — 댕자랑(/daeng-showcase) · 댕다방 연구소(/pet-lens) 를 상단바 아래 버튼 줄로 오간다
 *  - 쇼핑: 첫 화면은 댕다방 웹 첫 페이지(/) 그대로. 상품·장바구니·결제 화면도 쇼핑 탭으로 본다.
 *  - 케어톡(/chat): 어느 탭에서든 상단바 버튼으로 연다 — 들어오기 전 탭을 그대로 유지하고 탭바는 숨긴다(입력창).
 *
 * 시안 화면(스티커북 /app/home-1 · /app/sticker/…)에서는 설계 v2 탭 구조:
 *   홈(오늘 · 매일 댕생활은 홈의 하위 화면) · 연구소 · 댕다방(댕자랑 · 굿즈 공모전) · 쇼핑 · 마이
 */

export type AppTabKey = "home" | "daily" | "lab" | "dang" | "shop" | "my";

export type AppTab = {
    key: AppTabKey;
    label: string;
    href: string; // 탭을 눌렀을 때 여는 첫 화면
    // 고른 탭 색 — 앱 홈 시안 "자주 찾는 메뉴" 파스텔 판과 같은 계열
    grad: [string, string]; // 아이콘 그라데이션 (위 → 아래)
    bubble: string; // 아이콘 뒤 말랑한 판
    rim: string; // 판 아랫면 두께(젤리 느낌)
    ink: string; // 탭 이름 글자색
};

export const APP_TABS: AppTab[] = [
    {
        key: "home", label: "홈", href: "/app/mockup-c/",
        grad: ["#ff8eab", "#e8507a"], bubble: "linear-gradient(165deg, #fff0f4 0%, #ffd8e3 100%)", rim: "#f6bccd", ink: "#d23f6b",
    },
    {
        key: "daily", label: "댕생활", href: "/treasure-mine/",
        grad: ["#5cb6f2", "#2f86d6"], bubble: "linear-gradient(165deg, #eaf6ff 0%, #d3ebff 100%)", rim: "#b5d8f7", ink: "#1f6fbf",
    },
    {
        key: "dang", label: "댕다방", href: "/daeng-showcase/",
        grad: ["#a68bf2", "#7457d8"], bubble: "linear-gradient(165deg, #f3eeff 0%, #e3d9ff 100%)", rim: "#cfc1fa", ink: "#6346c4",
    },
    {
        key: "shop", label: "쇼핑", href: "/",
        grad: ["#ffae6b", "#ec6a1c"], bubble: "linear-gradient(165deg, #fff3e8 0%, #ffe0c7 100%)", rim: "#fbc9a2", ink: "#cf5f19",
    },
    {
        key: "my", label: "마이", href: "/mypage/",
        grad: ["#f5be4a", "#e0951c"], bubble: "linear-gradient(165deg, #fff8e0 0%, #ffecb8 100%)", rim: "#f4d68c", ink: "#a8720f",
    },
];

/** 댕다방 탭 안의 두 화면 — 상단바 아래 버튼 줄로 오간다 */
export const DANG_SECTIONS = [
    { href: "/daeng-showcase/", label: "댕자랑", ink: "#d23f6b", bubble: "linear-gradient(165deg, #fff0f4 0%, #ffd8e3 100%)", rim: "#f6bccd" },
    { href: "/pet-lens/", label: "댕다방 연구소", ink: "#c4560f", bubble: "linear-gradient(165deg, #fff3e8 0%, #ffe0c7 100%)", rim: "#fbc9a2" },
] as const;

// 경로 → 탭. 앞쪽 규칙이 먼저 맞으면 그 탭 (정확 일치 또는 하위 경로)
const ROUTE_RULES: { tab: AppTabKey; paths: string[] }[] = [
    { tab: "home", paths: ["/app/mockup-c", "/app"] },
    { tab: "daily", paths: ["/treasure-mine", "/growth", "/challenge"] },
    { tab: "dang", paths: ["/daeng-showcase", "/pet-lens", "/petlens"] },
    {
        tab: "my",
        paths: ["/mypage", "/my-pet", "/auth", "/forgot-password", "/faq", "/notice", "/inquiry", "/return", "/legal", "/terms", "/privacy", "/social"],
    },
];

// 상단바 버튼으로 여는 화면 — 들어오기 전 탭을 그대로 유지 (처음부터 열면 홈)
const OVERLAY_PATHS = ["/chat"];

const matches = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/** 케어톡 화면인가 — 상단바 케어톡 버튼 표시 · 탭 유지에 사용 */
export const isCareTalkPath = (pathname: string) => matches(pathname, "/chat");

/** 경로가 어느 탭에 속하는지 — 규칙에 없는 화면은 쇼핑(웹 쇼핑몰 화면)으로 본다 */
export function tabForPath(pathname: string, previous: AppTabKey | null): AppTabKey {
    if (OVERLAY_PATHS.some((p) => matches(pathname, p))) return previous ?? "home";
    for (const rule of ROUTE_RULES) {
        if (rule.paths.some((p) => matches(pathname, p))) return rule.tab;
    }
    return "shop";
}

/** 탭 첫 화면인가 — 첫 화면이면 상단바에 뒤로 가기 대신 탭 이름을 크게. 댕다방 탭은 두 화면 모두 첫 화면 */
export function isTabRoot(pathname: string, tab: AppTabKey): boolean {
    const clean = pathname.endsWith("/") ? pathname : `${pathname}/`;
    if (tab === "dang" && DANG_SECTIONS.some((s) => s.href === clean)) return true;
    // 홈 새 시안 1·2·3 (/app/home-N/) 도 홈 첫 화면으로 본다 — 로컬 시안 비교용
    if (tab === "home" && /^\/app\/home-\d\/$/.test(clean)) return true;
    return APP_TABS.some((t) => t.key === tab && t.href === clean);
}

/* ───────── 시안 화면용 탭 구조 (설계 v2) ───────── */
export type Concept = "sticker";

/** 경로가 어느 시안 화면인지 — 시안 화면이 아니면 null */
export function conceptOf(pathname: string): Concept | null {
    if (matches(pathname, "/app/home-1") || matches(pathname, "/app/sticker")) return "sticker";
    return null;
}

/** 시안 탭 5칸 — 홈 · 연구소 · 쇼핑(가운데 강조) · 댕다방 · 마이 */
export function conceptTabs(c: Concept): AppTab[] {
    const [home, , dang, shop] = APP_TABS;
    return [
        { ...home, href: "/app/home-1/" },
        {
            key: "lab", label: "연구소", href: `/app/${c}/lab/`,
            grad: ["#f5be4a", "#e0951c"], bubble: "linear-gradient(165deg, #fff8e0 0%, #ffecb8 100%)", rim: "#f4d68c", ink: "#a8720f",
        },
        // 쇼핑을 가운데(강조 탭) — 홈 · 연구소 · 쇼핑 · 댕다방 · 마이
        { ...shop, href: `/app/${c}/shop/` }, // 앱 전용 쇼핑 첫 화면(웹 첫 페이지 대신)
        { ...dang, href: `/app/${c}/show/` },
        {
            key: "my", label: "마이", href: `/app/${c}/my/`,
            grad: ["#5cb6f2", "#2f86d6"], bubble: "linear-gradient(165deg, #eaf6ff 0%, #d3ebff 100%)", rim: "#b5d8f7", ink: "#1f6fbf",
        },
    ];
}

/** 시안 화면에서 경로 → 탭 */
export function conceptTabForPath(pathname: string, c: Concept, previous: AppTabKey | null): AppTabKey {
    if (OVERLAY_PATHS.some((p) => matches(pathname, p))) return previous ?? "home";
    const rules: { tab: AppTabKey; paths: string[] }[] = [
        { tab: "home", paths: ["/app/home-1", `/app/${c}/daily`, `/app/${c}/care`, "/treasure-mine", "/growth", "/challenge"] },
        { tab: "lab", paths: [`/app/${c}/lab`, `/app/${c}/report`, "/pet-lens", "/petlens", "/my-pet"] },
        { tab: "dang", paths: [`/app/${c}/show`, "/daeng-showcase", "/goods-contest"] },
        { tab: "shop", paths: [`/app/${c}/shop`] },
        // 비밀번호 재설정(/forgot-password, 앱 로그인의 "비밀번호를 잊으셨나요?")도 마이 — 규칙에 없어 쇼핑 탭으로 보이던 것(2026-10-17 점검)
        { tab: "my", paths: [`/app/${c}/my`, "/mypage", "/auth", "/forgot-password", "/faq", "/notice", "/inquiry", "/return", "/legal", "/terms", "/privacy", "/social"] },
    ];
    for (const rule of rules) if (rule.paths.some((p) => matches(pathname, p))) return rule.tab;
    // 그 밖의 앱 화면(/app/…)은 홈 — 시안 화면 규칙을 먼저 본 뒤에
    if (matches(pathname, "/app")) return "home";
    return "shop";
}

/** 시안 화면에서 탭 첫 화면인가 */
export function conceptIsTabRoot(pathname: string, c: Concept, tab: AppTabKey): boolean {
    const clean = pathname.endsWith("/") ? pathname : `${pathname}/`;
    return conceptTabs(c).some((t) => t.key === tab && t.href === clean);
}

/** 시안 하위 화면 제목 — 탭 이름 대신 보여 줄 이름 */
export function conceptSubTitle(pathname: string): string | null {
    if (/^\/app\/sticker\/daily/.test(pathname)) return "매일 댕생활";
    if (/^\/app\/sticker\/care/.test(pathname)) return "동네 돌봄 찾기";
    if (/^\/app\/sticker\/report/.test(pathname)) return "건강 변화 리포트";
    if (/^\/app\/sticker\/buttons/.test(pathname)) return "버튼 시안";
    if (/^\/app\/sticker\/login/.test(pathname)) return "로그인";
    if (/^\/app\/sticker\/signup/.test(pathname)) return "회원가입";
    return null;
}

/** 아래 탭바를 숨길 화면 — 화면 아래에 구매 바 · 입력창이 붙거나 결제 · 로그인에 집중해야 하는 곳 */
const HIDE_TABBAR_PATHS = ["/product", "/checkout", "/auth", "/forgot-password", "/chat", "/app/sticker/login", "/app/sticker/signup"]; // 비밀번호 재설정도 로그인처럼 입력에 집중

export function hidesTabBar(pathname: string): boolean {
    return HIDE_TABBAR_PATHS.some((p) => matches(pathname, p));
}

/* ───────── 앱 로그인 · 회원가입 — 앱 안에서 로그인 · 가입을 요구하는 곳은 모두 이 화면들로 ───────── */
export const APP_LOGIN = "/app/sticker/login/";
/** 앱 로그인 주소 — redirect 는 로그인 뒤 돌아갈 앱 안 주소 */
export const appLoginHref = (redirect?: string | null) => (redirect ? `${APP_LOGIN}?redirect=${encodeURIComponent(redirect)}` : APP_LOGIN);
export const APP_SIGNUP = "/app/sticker/signup/";
/** 앱 회원가입 주소 — redirect 는 가입 뒤 돌아갈 앱 안 주소 */
export const appSignupHref = (redirect?: string | null) => (redirect ? `${APP_SIGNUP}?redirect=${encodeURIComponent(redirect)}` : APP_SIGNUP);
/** 웹 회원가입 화면 주소인가(/auth/signup) — 앱에서는 앱 회원가입으로 바꿔 보낸다 */
export const isWebSignupPath = (pathname: string) => /^\/auth\/signup(\/|$)/.test(pathname);
/** 웹 로그인 화면 주소인가(/auth/login · /login) — 앱에서는 앱 로그인으로 바꿔 보낸다 */
export const isWebLoginPath = (pathname: string) => /^\/(auth\/)?login(\/|$)/.test(pathname);
/** 로그인해야 쓸 수 있는 웹 화면 — 앱에서 로그인 전이면 웹 잠금 안내 대신 앱 로그인으로 */
export const MEMBER_ONLY_PATHS = ["/pet-lens", "/petlens", "/my-pet", "/mypage"];
