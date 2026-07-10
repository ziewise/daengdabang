export type PetGuideId = "chatbot" | "color" | "try-on" | "product-actions" | "signup" | "pet-lens";

export type PetGuidePrompt = {
    id: PetGuideId;
    target: HTMLElement;
    name: string;
    message: string;
    actionLabel?: string;
    href?: string;
    activatesTarget?: boolean;
    placement?: "header" | "content";
};

const SESSION_KEY = "ddb.petGuide.session.v5";
const DAILY_KEY = "ddb.petGuide.daily.v5";

// Guidance should stay useful throughout a shopping session without becoming a
// repetitive pop-up. The v5 state replaces the old three-prompt hard stop with
// a short global gap plus a route-and-target cooldown.
const SESSION_LIMIT = 12;
const DAILY_LIMIT = 24;
const AUTO_GUIDE_GAP_MS = 12_000;
const ROUTE_GUIDE_COOLDOWN_MS = 15 * 60_000;
const HISTORY_RETENTION_MS = 24 * 60 * 60_000;

type GuideHistoryEntry = {
    route: string;
    id: PetGuideId;
    shownAt: number;
};

type SessionState = {
    count: number;
    lastShownAt: number;
    history: GuideHistoryEntry[];
};

type DailyState = {
    date: string;
    count: number;
};

const MEMBER_GUIDE_ORDER: PetGuideId[] = ["color", "try-on", "product-actions", "pet-lens", "chatbot", "signup"];
const GUEST_GUIDE_ORDER: PetGuideId[] = ["color", "try-on", "signup", "pet-lens", "chatbot", "product-actions"];
const ALL_GUIDE_IDS = new Set<PetGuideId>([...MEMBER_GUIDE_ORDER, ...GUEST_GUIDE_ORDER]);
let memorySessionCount = 0;
let memoryLastShownAt = 0;
let memoryHistory: GuideHistoryEntry[] = [];
let memoryDailyState: DailyState = { date: todayKey(), count: 0 };

function todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function normalizeCount(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeTimestamp(value: unknown) {
    return typeof value === "number" && Number.isFinite(value)
        ? Math.min(Date.now(), Math.max(0, value))
        : 0;
}

function currentRoute() {
    if (typeof window === "undefined") return "/";
    const path = window.location.pathname.replace(/\/+$/, "");
    return path || "/";
}

function normalizeHistory(value: unknown): GuideHistoryEntry[] {
    if (!Array.isArray(value)) return [];
    const oldestAllowed = Date.now() - HISTORY_RETENTION_MS;
    return value.flatMap((item): GuideHistoryEntry[] => {
        if (!item || typeof item !== "object") return [];
        const entry = item as Partial<GuideHistoryEntry>;
        if (
            typeof entry.route !== "string"
            || typeof entry.id !== "string"
            || !ALL_GUIDE_IDS.has(entry.id as PetGuideId)
        ) return [];
        const shownAt = normalizeTimestamp(entry.shownAt);
        if (shownAt < oldestAllowed) return [];
        return [{ route: entry.route || "/", id: entry.id as PetGuideId, shownAt }];
    });
}

function mergeHistory(...sources: GuideHistoryEntry[][]) {
    const latest = new Map<string, GuideHistoryEntry>();
    for (const entry of sources.flat()) {
        const key = `${entry.route}\n${entry.id}`;
        const previous = latest.get(key);
        if (!previous || previous.shownAt < entry.shownAt) latest.set(key, entry);
    }
    return Array.from(latest.values());
}

function readSession(): SessionState {
    if (typeof window === "undefined") return { count: 0, lastShownAt: 0, history: [] };
    try {
        const parsed: unknown = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || "null");
        if (!parsed || typeof parsed !== "object") return { count: 0, lastShownAt: 0, history: [] };
        const value = parsed as Partial<SessionState>;
        return {
            count: normalizeCount(value.count),
            lastShownAt: normalizeTimestamp(value.lastShownAt),
            history: normalizeHistory(value.history),
        };
    } catch {
        return { count: 0, lastShownAt: 0, history: [] };
    }
}

function readDaily(): DailyState {
    const date = todayKey();
    if (typeof window === "undefined") return { date, count: 0 };
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(DAILY_KEY) || "null");
        if (!parsed || typeof parsed !== "object") return { date, count: 0 };
        const value = parsed as Partial<DailyState>;
        if (value.date !== date) return { date, count: 0 };
        return { date, count: normalizeCount(value.count) };
    } catch {
        return { date, count: 0 };
    }
}

export function petGuideHasBudget({
    bypass = false,
    ignoreGap = false,
}: {
    bypass?: boolean;
    ignoreGap?: boolean;
} = {}) {
    if (bypass) return true;
    const session = readSession();
    const daily = readDaily();
    memorySessionCount = Math.max(memorySessionCount, session.count);
    memoryLastShownAt = Math.max(memoryLastShownAt, session.lastShownAt);
    memoryHistory = mergeHistory(memoryHistory, session.history);
    if (memoryDailyState.date !== daily.date) memoryDailyState = { date: daily.date, count: 0 };
    memoryDailyState.count = Math.max(memoryDailyState.count, daily.count);
    if (memorySessionCount >= SESSION_LIMIT || memoryDailyState.count >= DAILY_LIMIT) return false;
    return ignoreGap || Date.now() - memoryLastShownAt >= AUTO_GUIDE_GAP_MS;
}

export function markPetGuideShown(id: PetGuideId) {
    if (typeof window === "undefined") return;
    const session = readSession();
    const daily = readDaily();
    const shownAt = Date.now();
    const history = mergeHistory(memoryHistory, session.history).filter((entry) => (
        entry.route !== currentRoute() || entry.id !== id
    ));
    history.push({ route: currentRoute(), id, shownAt });
    memoryHistory = history;
    memorySessionCount = Math.max(memorySessionCount, session.count) + 1;
    memoryLastShownAt = shownAt;
    if (memoryDailyState.date !== daily.date) memoryDailyState = { date: daily.date, count: 0 };
    memoryDailyState.count = Math.max(memoryDailyState.count, daily.count) + 1;
    const nextSession: SessionState = {
        count: memorySessionCount,
        lastShownAt: shownAt,
        history,
    };
    try {
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    } catch {
        // Storage can be unavailable in strict privacy modes; the in-memory prompt
        // state still prevents overlapping guidance for the current mount.
    }
    try {
        window.localStorage.setItem(DAILY_KEY, JSON.stringify(memoryDailyState));
    } catch {
        // The session and in-memory budgets still apply when localStorage is blocked.
    }
}

function targetAndAncestorsAreVisible(target: HTMLElement) {
    if (target.matches(":disabled, [aria-disabled='true']")) return false;

    let current: HTMLElement | null = target;
    let descendantCanReceivePointerEvents = false;
    while (current) {
        const style = window.getComputedStyle(current);
        const contentVisibility = (style as CSSStyleDeclaration & { contentVisibility?: string }).contentVisibility;
        if (
            current.hidden
            || current.hasAttribute("inert")
            || current.getAttribute("aria-hidden") === "true"
            || style.display === "none"
            || style.visibility === "hidden"
            || style.visibility === "collapse"
            || normalizeCount(Number(style.opacity || "1")) <= 0
            || contentVisibility === "hidden"
        ) return false;

        if (style.pointerEvents === "none") {
            // A child may explicitly opt back in under a pointer-events:none
            // overlay; the elementFromPoint check below verifies that case.
            if (!descendantCanReceivePointerEvents) return false;
        } else {
            descendantCanReceivePointerEvents = true;
        }
        current = current.parentElement;
    }
    return true;
}

function targetIsHitTestVisible(target: HTMLElement, rect: DOMRect) {
    const points = [
        [rect.left + rect.width / 2, rect.top + rect.height / 2],
        [rect.left + 3, rect.top + 3],
        [rect.right - 3, rect.top + 3],
        [rect.left + 3, rect.bottom - 3],
        [rect.right - 3, rect.bottom - 3],
    ];
    return points.some(([x, y]) => {
        if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) return false;
        const hit = document.elementFromPoint(x, y);
        return Boolean(hit && (
            hit === target
            || target.contains(hit)
            // Roaming may briefly place the companion over the target. The dog
            // moves away before the prompt opens, so this is not a real occluder.
            || hit.closest("[data-pet-companion-root]")
        ));
    });
}

function visibleTarget(id: PetGuideId) {
    const targets = Array.from(document.querySelectorAll<HTMLElement>(`[data-pet-guide-target="${id}"]`))
        // Header onboarding is useful only while the visitor is still near the
        // hero. When scrolled down, prefer an in-content target with the same
        // id (for example a signup button beside try-on) instead of forcing
        // the dog back to the fixed header.
        .filter((target) => window.scrollY <= 160 || !target.closest("header"));
    return targets.find((target) => {
        if (target.getAttribute("aria-expanded") === "true") return false;
        if (!targetAndAncestorsAreVisible(target) || target.getClientRects().length === 0) return false;
        const rect = target.getBoundingClientRect();
        const minimumBottom = id === "signup" || id === "pet-lens" ? 8 : 84;
        return rect.width >= 24
            && rect.height >= 24
            && rect.bottom > minimumBottom
            && rect.top < window.innerHeight - 24
            && rect.right > 8
            && rect.left < window.innerWidth - 8
            && targetIsHitTestVisible(target, rect);
    }) || null;
}

export function findPetGuidePrompt({
    isGuest,
    hasPetPhoto,
    bypassBudget = false,
    onlyId,
    bypassRouteCooldownForId,
}: {
    isGuest: boolean;
    hasPetPhoto: boolean;
    bypassBudget?: boolean;
    onlyId?: PetGuideId;
    bypassRouteCooldownForId?: PetGuideId;
}): PetGuidePrompt | null {
    // The layer checks the global budget/gap immediately before calling this
    // selector. Keep target selection side-effect free so a second budget read
    // cannot race hydration or another scheduled guide attempt.
    if (typeof window === "undefined") return null;
    const history = mergeHistory(readSession().history, memoryHistory);
    const route = currentRoute();
    const now = Date.now();

    const guideOrder = onlyId ? [onlyId] : (isGuest ? GUEST_GUIDE_ORDER : MEMBER_GUIDE_ORDER);
    for (const id of guideOrder) {
        if (!bypassBudget && bypassRouteCooldownForId !== id && history.some((entry) => (
            entry.route === route
            && entry.id === id
            && now - entry.shownAt < ROUTE_GUIDE_COOLDOWN_MS
        ))) continue;
        const target = visibleTarget(id);
        if (!target) continue;
        const placement = target.closest("header") ? "header" : "content";
        const isHeroRoute = route === "/" || route === "/main";
        // Header onboarding belongs to the opening hero experience. Once the
        // visitor is deep in the page, contextual product/chat guidance wins.
        if (id === "pet-lens" && (!isHeroRoute || placement !== "header")) continue;

        if (id === "color") {
            return {
                id,
                target,
                placement,
                name: "색상 미리보기",
                message: "마음에 드시는 색을 골라 보세요. 상품 사진이 바로 바뀝니다!",
            };
        }
        if (id === "try-on") {
            return {
                id,
                target,
                placement,
                name: "우리 아이 착용 미리보기",
                message: hasPetPhoto
                    ? "우리 아이 사진으로 직접 입혀 보세요. 핏과 위치를 여기서 천천히 확인하실 수 있어요."
                    : "강아지 사진 한 장을 올리시면 여기서 직접 입혀 보실 수 있어요.",
                actionLabel: hasPetPhoto ? undefined : "사진 등록 안내",
                href: hasPetPhoto ? undefined : (isGuest ? "/auth/signup" : "/pet-lens"),
            };
        }
        if (id === "product-actions") {
            return {
                id,
                target,
                placement,
                name: "옵션 선택",
                message: "마음에 드시면 여기서 색상과 수량부터 천천히 골라 주세요.",
            };
        }
        if (id === "chatbot") {
            return {
                id,
                target,
                placement,
                name: "댕다방 챗봇",
                message: "궁금하신 점은 여기서 무엇이든 물어보세요. 상품부터 생활 정보까지 함께 찾아드릴게요!",
                actionLabel: "질문하기",
                activatesTarget: true,
            };
        }
        if (id === "pet-lens") {
            return {
                id,
                target,
                placement,
                name: "펫렌즈로 우리 아이 등록",
                message: hasPetPhoto
                    ? "위의 분홍 카메라를 누르시면 우리 아이 사진을 다시 분석하고 맞춤 추천을 받으실 수 있어요."
                    : "위의 분홍 카메라를 누르고 강아지 사진을 올리시면 견종과 맞춤 상품을 찾아드릴게요!",
                actionLabel: "펫렌즈 열기",
                activatesTarget: true,
            };
        }
        if (id === "signup" && isGuest) {
            const mobileMenuTarget = placement === "header"
                && window.innerWidth < 1024
                && Boolean(target.querySelector(".fa-bars"));
            if (mobileMenuTarget) {
                return {
                    id,
                    target,
                    placement,
                    name: "회원가입 메뉴",
                    message: "오른쪽 위 메뉴 버튼을 누르시면 로그인과 회원가입 메뉴를 바로 찾으실 수 있어요!",
                    actionLabel: "메뉴 열기",
                    activatesTarget: true,
                };
            }
            return {
                id,
                target,
                placement,
                name: "나만의 산책 친구",
                message: "가입하시면 반려견 견종으로 바뀌고 사진에 맞춘 기능도 이용하실 수 있어요.",
                actionLabel: "가입 안내 보기",
                href: "/auth/signup",
            };
        }
    }
    return null;
}
