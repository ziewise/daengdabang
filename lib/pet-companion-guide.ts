export type PetGuideId = "chatbot" | "color" | "try-on" | "product-actions" | "signup";

export type PetGuidePrompt = {
    id: PetGuideId;
    target: HTMLElement;
    name: string;
    message: string;
    actionLabel?: string;
    href?: string;
    activatesTarget?: boolean;
};

const SESSION_KEY = "ddb.petGuide.session.v4";
const DAILY_KEY = "ddb.petGuide.daily.v4";

type SessionState = {
    count: number;
    seen: PetGuideId[];
};

type DailyState = {
    date: string;
    count: number;
};

const MEMBER_GUIDE_ORDER: PetGuideId[] = ["color", "try-on", "product-actions", "chatbot", "signup"];
const GUEST_GUIDE_ORDER: PetGuideId[] = ["color", "try-on", "chatbot", "signup", "product-actions"];
const ALL_GUIDE_IDS = new Set<PetGuideId>([...MEMBER_GUIDE_ORDER, ...GUEST_GUIDE_ORDER]);
const memorySeen = new Set<PetGuideId>();
let memorySessionCount = 0;
let memoryDailyState: DailyState = { date: todayKey(), count: 0 };

function todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function normalizeCount(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function readSession(): SessionState {
    if (typeof window === "undefined") return { count: 0, seen: [] };
    try {
        const parsed: unknown = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || "null");
        if (!parsed || typeof parsed !== "object") return { count: 0, seen: [] };
        const value = parsed as Partial<SessionState>;
        return {
            count: normalizeCount(value.count),
            seen: Array.isArray(value.seen)
                ? value.seen.filter((item): item is PetGuideId => typeof item === "string" && ALL_GUIDE_IDS.has(item as PetGuideId))
                : [],
        };
    } catch {
        return { count: 0, seen: [] };
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

export function petGuideHasBudget() {
    const session = readSession();
    const daily = readDaily();
    memorySessionCount = Math.max(memorySessionCount, session.count);
    if (memoryDailyState.date !== daily.date) memoryDailyState = { date: daily.date, count: 0 };
    memoryDailyState.count = Math.max(memoryDailyState.count, daily.count);
    return memorySessionCount < 3 && memoryDailyState.count < 4;
}

export function markPetGuideShown(id: PetGuideId) {
    if (typeof window === "undefined") return;
    const session = readSession();
    const daily = readDaily();
    if (memorySeen.has(id) || session.seen.includes(id)) {
        memorySeen.add(id);
        return;
    }

    memorySeen.add(id);
    memorySessionCount = Math.max(memorySessionCount, session.count) + 1;
    if (memoryDailyState.date !== daily.date) memoryDailyState = { date: daily.date, count: 0 };
    memoryDailyState.count = Math.max(memoryDailyState.count, daily.count) + 1;
    const nextSession: SessionState = {
        count: memorySessionCount,
        seen: Array.from(new Set([...session.seen, id])),
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
    const targets = Array.from(document.querySelectorAll<HTMLElement>(`[data-pet-guide-target="${id}"]`));
    return targets.find((target) => {
        if (target.getAttribute("aria-expanded") === "true") return false;
        if (!targetAndAncestorsAreVisible(target) || target.getClientRects().length === 0) return false;
        const rect = target.getBoundingClientRect();
        const minimumBottom = id === "signup" ? 8 : 84;
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
}: {
    isGuest: boolean;
    hasPetPhoto: boolean;
}): PetGuidePrompt | null {
    if (typeof window === "undefined" || !petGuideHasBudget()) return null;
    const seen = new Set([...readSession().seen, ...memorySeen]);

    const guideOrder = isGuest ? GUEST_GUIDE_ORDER : MEMBER_GUIDE_ORDER;
    for (const id of guideOrder) {
        if (seen.has(id)) continue;
        const target = visibleTarget(id);
        if (!target) continue;

        if (id === "color") {
            return {
                id,
                target,
                name: "색상 미리보기",
                message: "마음에 드는 색을 골라봐. 상품 사진이 바로 바뀌어!",
            };
        }
        if (id === "try-on") {
            return {
                id,
                target,
                name: "우리 아이 착용 미리보기",
                message: hasPetPhoto
                    ? "우리 사진으로 직접 입혀보자. 핏과 위치를 여기서 천천히 볼 수 있어."
                    : "강아지 사진 한 장을 올리면 여기서 직접 입혀볼 수 있어.",
                actionLabel: hasPetPhoto ? undefined : "사진 등록 알아보기",
                href: hasPetPhoto ? undefined : (isGuest ? "/auth/signup" : "/pet-lens"),
            };
        }
        if (id === "product-actions") {
            return {
                id,
                target,
                name: "옵션 선택",
                message: "마음에 들면 여기서 색상과 수량부터 천천히 골라봐.",
            };
        }
        if (id === "chatbot") {
            return {
                id,
                target,
                name: "댕다방 챗봇",
                message: "궁금한 건 여기서 뭐든 물어봐. 상품부터 생활 정보까지 같이 찾아볼게!",
                actionLabel: "질문해 보기",
                activatesTarget: true,
            };
        }
        if (id === "signup" && isGuest) {
            return {
                id,
                target,
                name: "나만의 산책 친구",
                message: "가입하면 네 강아지 견종으로 바뀌고 사진에 맞춘 기능도 쓸 수 있어.",
                actionLabel: "가입 내용 보기",
                href: "/auth/signup",
            };
        }
    }
    return null;
}
