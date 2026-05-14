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

/** localStorage 에 JSON 안전하게 쓰기 + 같은 탭 구독자 즉시 통지
 *  quota 초과 시 PETS 의 경우 자동 복구 (오래된 analyzed 펫 삭제 후 재시도)
 */
function writeJSON(key: string, value: unknown): boolean {
    if (!isClient()) return false;
    try {
        const serialized = JSON.stringify(value);
        window.localStorage.setItem(key, serialized);
        notifyChange(key);
        return true;
    } catch (err) {
        // quota 초과 추정 — PETS 키면 자동 복구 시도
        const isQuota = err instanceof Error && /quota|storage/i.test(err.name + err.message);
        if (isQuota && key === KEYS.PETS && Array.isArray(value)) {
            console.warn("[storage.writeJSON] quota exceeded — attempting auto-cleanup");
            const reclaimed = reclaimPetsSpace();
            if (reclaimed) {
                // 재시도 (현재 value 는 이미 가지고 있으니 그대로 setItem)
                try {
                    window.localStorage.setItem(key, JSON.stringify(value));
                    notifyChange(key);
                    return true;
                } catch (err2) {
                    console.error("[storage.writeJSON] retry FAILED after cleanup", err2);
                }
            }
        }
        console.error("[storage.writeJSON] FAILED", { key, err });
        return false;
    }
}

/**
 * PETS 용 공간 회수 — quota 초과 시 호출.
 * 순서: 1) analyzed 펫의 photos 잘라내기 → 2) 가장 오래된 analyzed 펫 삭제.
 * 한 번이라도 정리되면 true 반환.
 */
function reclaimPetsSpace(): boolean {
    try {
        const raw = window.localStorage.getItem(KEYS.PETS);
        if (!raw) return false;
        const list = JSON.parse(raw) as PetProfile[];
        if (!Array.isArray(list) || list.length === 0) return false;

        // 1차: analyzed 펫의 photos 배열 비우기 (avatar 는 유지 — UI 썸네일용)
        let changed = false;
        for (const p of list) {
            const isAnalyzed = p.source !== "registered";
            if (isAnalyzed && Array.isArray(p.photos) && p.photos.length > 0) {
                p.photos = [];
                changed = true;
            }
        }
        if (changed) {
            try {
                window.localStorage.setItem(KEYS.PETS, JSON.stringify(list));
                return true;
            } catch {
                /* 1차로 부족 → 2차 진행 */
            }
        }

        // 2차: 가장 오래된 analyzed 펫부터 삭제 (절반 정도)
        const analyzed = list
            .map((p, i) => ({ p, i }))
            .filter((x) => x.p.source !== "registered")
            .sort((a, b) => (a.p.analyzedAt ?? 0) - (b.p.analyzedAt ?? 0));
        if (analyzed.length === 0) return changed;
        const removeCount = Math.max(1, Math.ceil(analyzed.length / 2));
        const removeIds = new Set(analyzed.slice(0, removeCount).map((x) => x.p.id));
        const filtered = list.filter((p) => !removeIds.has(p.id));
        window.localStorage.setItem(KEYS.PETS, JSON.stringify(filtered));
        return true;
    } catch (err) {
        console.error("[reclaimPetsSpace] failed", err);
        return false;
    }
}

function removeKey(key: string): void {
    if (!isClient()) return;
    window.localStorage.removeItem(key);
    notifyChange(key);
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

// ============ storage 변경 구독 — 같은 탭 + 다른 탭 모두 ============
type StorageKey = keyof typeof KEYS;
type StorageListener = () => void;

/** 같은 탭 내 구독자 — Set 으로 직접 통지 (DOM dispatchEvent 비신뢰성 회피) */
const listenersByKey = new Map<string, Set<StorageListener>>();

/** 같은 탭에서 writeJSON/removeKey 호출 시 즉시 호출됨 (writeJSON 내부에서 사용) */
function notifyChange(rawKey: string) {
    const set = listenersByKey.get(rawKey);
    if (!set) return;
    // 반복 중 unsubscribe 호출되어도 안전하도록 배열 복사 후 순회
    for (const cb of [...set]) cb();
}

// 다른 탭에서의 storage 변경 — 브라우저가 자동 발화하는 storage 이벤트
if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
        if (e.key) notifyChange(e.key);
    });
}

export function onStorageChange(key: StorageKey, handler: StorageListener): () => void {
    if (!isClient()) return () => {};
    const rawKey = KEYS[key];
    let set = listenersByKey.get(rawKey);
    if (!set) {
        set = new Set();
        listenersByKey.set(rawKey, set);
    }
    set.add(handler);
    return () => {
        set!.delete(handler);
    };
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
