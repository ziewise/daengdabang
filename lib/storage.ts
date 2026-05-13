/**
 * lib/storage.ts — localStorage 타입 안전 래퍼
 * ---------------------------------------------------------------------
 * 클라이언트 전용 (SSR 시 window 없음 → 안전한 default 반환).
 * 모든 localStorage 접근은 이 파일을 통해서.
 */
import type { LoginState, PetProfile } from "./types";

const KEYS = {
    AUTH: "daengdabang_logged_in",
    PETS: "daengdabang_pets",
    PET_PENDING: "daengdabang_pet_pending",
    SEARCH_RECENT: "daengdabang_search_recent",
} as const;

/** 클라이언트인지 확인 (SSR 가드) */
const isClient = () => typeof window !== "undefined";

/** localStorage 에서 JSON 안전하게 읽기 */
function readJSON<T>(key: string, fallback: T): T {
    if (!isClient()) return fallback;
    try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

/** localStorage 에 JSON 안전하게 쓰기 */
function writeJSON(key: string, value: unknown): void {
    if (!isClient()) return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* 용량 초과 등은 silent fail */
    }
}

function removeKey(key: string): void {
    if (!isClient()) return;
    window.localStorage.removeItem(key);
}

// ============ 인증 ============
export const authStorage = {
    get: (): LoginState | null => readJSON<LoginState | null>(KEYS.AUTH, null),
    set: (state: LoginState) => writeJSON(KEYS.AUTH, state),
    clear: () => removeKey(KEYS.AUTH),
    isLoggedIn: (): boolean => {
        const s = authStorage.get();
        return !!s && typeof s.ts === "number";
    },
};

// ============ 펫 프로필 / 분석 기록 ============
export const petsStorage = {
    list: (): PetProfile[] => readJSON<PetProfile[]>(KEYS.PETS, []),

    add: (pet: PetProfile) => {
        const list = petsStorage.list();
        // 같은 id 면 덮어쓰기 (이름 갱신용)
        const idx = list.findIndex((p) => p.id === pet.id);
        if (idx >= 0) list[idx] = pet;
        else list.push(pet);
        writeJSON(KEYS.PETS, list);
    },

    update: (id: string, patch: Partial<PetProfile>) => {
        const list = petsStorage.list();
        const idx = list.findIndex((p) => p.id === id);
        if (idx < 0) return;
        list[idx] = { ...list[idx], ...patch };
        writeJSON(KEYS.PETS, list);
    },

    remove: (id: string) => {
        const list = petsStorage.list().filter((p) => p.id !== id);
        writeJSON(KEYS.PETS, list);
    },

    clear: () => removeKey(KEYS.PETS),
};

// ============ 비회원 펫 분석 결과 임시 보관 ============
export const pendingPetStorage = {
    get: (): PetProfile | null =>
        readJSON<PetProfile | null>(KEYS.PET_PENDING, null),
    set: (pet: PetProfile) => writeJSON(KEYS.PET_PENDING, pet),
    clear: () => removeKey(KEYS.PET_PENDING),
};

/** 비회원 → 회원 전환 시 임시 펫을 회원 목록으로 이관 */
export function migratePendingPet() {
    const pending = pendingPetStorage.get();
    if (!pending) return;
    petsStorage.add(pending);
    pendingPetStorage.clear();
}

// ============ 검색 최근 검색어 ============
const RECENT_MAX = 6;

export const searchRecent = {
    list: (): string[] => readJSON<string[]>(KEYS.SEARCH_RECENT, []),

    add: (term: string) => {
        const t = term.trim();
        if (!t) return;
        const list = searchRecent.list().filter((x) => x !== t);
        list.unshift(t);
        if (list.length > RECENT_MAX) list.length = RECENT_MAX;
        writeJSON(KEYS.SEARCH_RECENT, list);
    },

    remove: (term: string) => {
        const list = searchRecent.list().filter((x) => x !== term);
        writeJSON(KEYS.SEARCH_RECENT, list);
    },

    clear: () => removeKey(KEYS.SEARCH_RECENT),
};

// ============ storage 이벤트 구독 (다른 탭/페이지에서 변경 시) ============
type StorageKey = keyof typeof KEYS;

export function onStorageChange(key: StorageKey, handler: () => void): () => void {
    if (!isClient()) return () => {};
    const listener = (e: StorageEvent) => {
        if (e.key === KEYS[key]) handler();
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
}

// ============ useSyncExternalStore 헬퍼 ============
/**
 * React 의 useSyncExternalStore 는 getSnapshot 이 매 호출마다 같은 reference 를
 * 반환해야 한다 (변경 없을 때). JSON.parse 는 매번 새 객체라 캐시 필요.
 *
 * raw string 을 비교해서 같으면 캐시된 파싱 결과를 그대로 반환.
 */
type SnapshotCache<T> = { raw: string | null; parsed: T };
function makeSnapshot<T>(key: string, fallback: T): () => T {
    const cache: SnapshotCache<T> = { raw: null, parsed: fallback };
    return () => {
        if (!isClient()) return fallback;
        const raw = window.localStorage.getItem(key);
        if (raw === cache.raw) return cache.parsed;
        cache.raw = raw;
        try {
            cache.parsed = raw === null ? fallback : JSON.parse(raw);
        } catch {
            cache.parsed = fallback;
        }
        return cache.parsed;
    };
}

export const snapshots = {
    auth:        makeSnapshot<import("./types").LoginState | null>(KEYS.AUTH, null),
    pets:        makeSnapshot<import("./types").PetProfile[]>(KEYS.PETS, []),
    pendingPet:  makeSnapshot<import("./types").PetProfile | null>(KEYS.PET_PENDING, null),
};

/** useSyncExternalStore 의 subscribe 헬퍼 — storage 이벤트 구독 */
export function subscribeStorage(key: StorageKey, callback: () => void): () => void {
    return onStorageChange(key, callback);
}
