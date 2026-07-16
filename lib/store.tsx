"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useState,
} from "react";
// 헤더(hooks/useAuth)가 보는 로그인 플래그(daengdabang_logged_in)와 동기화용.
// 로그인/로그아웃이 이 store 에만 기록되고 플래그가 안 바뀌어 헤더가
// "로그인" 버튼을 유지하던 버그 수정 — login/logout 에서 함께 갱신한다.
import { authStorage } from "@/lib/storage";
import { DdbApiError, loadPetProfilesSmart } from "@/lib/customer-api";
import type { CartPetAssignment } from "@/lib/pet-attribution";
import type { AuthProvider } from "@/lib/types";

// selected — 장바구니에서 결제 대상으로 체크된 라인(기본 true). 결제는 선택된 라인만 진행.
export type CartLine = { productId: string; qty: number; color?: string; size?: string; selected?: boolean; petAssignment?: CartPetAssignment };
export type PetProfilePhotoView = {
    viewId: "front" | "left" | "right" | "back";
    dataUrl: string;
    imageName: string;
};
export type PetProfile = {
    apiProfileId?: number;
    name: string;
    breed?: string;
    size: "small" | "medium" | "large";
    age: string;
    birthMonth?: string;
    weightKg?: number;
    sex?: "male" | "female" | "unknown";
    coatColor?: string;
    coat: "short" | "medium" | "long";
    activity: "low" | "normal" | "high";
    concerns: string[];
    allergies?: string[];
    neutered?: "yes" | "no" | "unknown";
    lifeStage?: "puppy" | "adult" | "senior" | "unknown";
    photoDataUrl?: string;
    photoViews?: PetProfilePhotoView[];
    photoServerVerified?: boolean;
    rawAnalysis?: Record<string, unknown>;
    lastAnalyzedAt?: string;
};

export function hasVerifiedPetPhoto(pet: PetProfile): boolean {
    return Boolean(pet.photoDataUrl && pet.photoServerVerified);
}
export type User = {
    apiUserId?: number;
    apiAccessToken?: string;
    authProvider?: AuthProvider;
    name: string;
    email: string;
    phone?: string;
    joinedAt: string;
    pets: PetProfile[];
};
export type Order = {
    id: string;
    createdAt: string;
    lines: CartLine[];
    total: number;
    receiver: string;
    address: string;
    paymentMethod: string;
    status: "paid" | "preparing" | "shipped";
};

type State = {
    cart: CartLine[];
    wishlist: string[];
    user: User | null;
    orders: Order[];
};

type Action =
    | { type: "HYDRATE"; state: State }
    | { type: "ADD_TO_CART"; productId: string; qty: number; color?: string; size?: string }
    | { type: "SET_QTY"; productId: string; qty: number; color?: string; size?: string }
    | { type: "REMOVE_FROM_CART"; productId: string; color?: string; size?: string }
    | { type: "SET_SELECTED"; productId: string; color?: string; size?: string; selected: boolean }
    | { type: "SET_LINE_PET"; productId: string; color?: string; size?: string; petAssignment?: CartPetAssignment }
    | { type: "SET_ALL_SELECTED"; selected: boolean }
    | { type: "CLEAR_CART" }
    | { type: "TOGGLE_WISHLIST"; productId: string }
    | { type: "LOGIN"; user: User }
    | { type: "LOGOUT" }
    | { type: "UPSERT_PET"; pet: PetProfile }
    | { type: "SET_PETS"; pets: PetProfile[] }
    | { type: "ADD_ORDER"; order: Order };

const STORAGE_KEY = "daengdabang.store.v2";
const API_TOKEN_KEY = "ddb.api.accessToken";
const INITIAL: State = { cart: [], wishlist: [], user: null, orders: [] };

function stateForLocalStorage(snapshot: State): State {
    if (!snapshot.user) return snapshot;
    return {
        ...snapshot,
        user: {
            ...snapshot.user,
            // The bearer token already has one dedicated storage key. Do not
            // duplicate it inside the broader storefront state snapshot.
            apiAccessToken: undefined,
            pets: snapshot.user.pets.map((pet) => {
                const safePet = { ...pet };
                delete safePet.photoDataUrl;
                delete safePet.photoViews;
                delete safePet.photoServerVerified;
                delete safePet.rawAnalysis;
                return safePet;
            }),
        },
    };
}

function withoutMemberData(snapshot: State): State {
    return {
        ...snapshot,
        cart: snapshot.cart.map((line) => {
            const guestLine = { ...line };
            delete guestLine.petAssignment;
            return guestLine;
        }),
        user: null,
        wishlist: [],
        orders: [],
    };
}

function persistLoggedOutState(currentState?: State): void {
    let snapshot = currentState ?? INITIAL;
    if (!currentState) {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) snapshot = { ...INITIAL, ...JSON.parse(raw) };
        } catch {
            snapshot = INITIAL;
        }
    }
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutMemberData(snapshot)));
    } catch {
        // A failed rewrite must not leave a stale member snapshot recoverable.
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch {
            // The in-memory logout below still has to complete.
        }
    }
}

function clearPersistedMemberSession(currentState?: State): void {
    persistLoggedOutState(currentState);
    try {
        window.localStorage.removeItem(API_TOKEN_KEY);
    } catch {
        // Continue clearing the remaining session surfaces.
    }
    try {
        authStorage.clear();
    } catch {
        // Continue to the in-memory logout even if storage is unavailable.
    }
}

// 장바구니 라인 식별 — 같은 제품도 색상/사이즈(옵션)가 다르면 다른 라인으로 본다.
function sameLine(line: CartLine, productId: string, color?: string, size?: string): boolean {
    return (
        line.productId === productId &&
        (line.color ?? "") === (color ?? "") &&
        (line.size ?? "") === (size ?? "")
    );
}

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "HYDRATE":
            return action.state;
        case "ADD_TO_CART": {
            const existing = state.cart.find((line) => sameLine(line, action.productId, action.color, action.size));
            if (existing) {
                return {
                    ...state,
                    cart: state.cart.map((line) =>
                        sameLine(line, action.productId, action.color, action.size)
                            ? { ...line, qty: Math.min(99, line.qty + action.qty) }
                            : line
                    ),
                };
            }
            return {
                ...state,
                cart: [...state.cart, { productId: action.productId, qty: action.qty, color: action.color, size: action.size, selected: true }],
            };
        }
        case "SET_QTY":
            return {
                ...state,
                cart: state.cart
                    .map((line) => (sameLine(line, action.productId, action.color, action.size) ? { ...line, qty: action.qty } : line))
                    .filter((line) => line.qty > 0),
            };
        case "REMOVE_FROM_CART":
            return { ...state, cart: state.cart.filter((line) => !sameLine(line, action.productId, action.color, action.size)) };
        // 결제 대상 선택 토글(라인 단위 / 전체)
        case "SET_SELECTED":
            return {
                ...state,
                cart: state.cart.map((line) =>
                    sameLine(line, action.productId, action.color, action.size) ? { ...line, selected: action.selected } : line
                ),
            };
        case "SET_LINE_PET":
            return {
                ...state,
                cart: state.cart.map((line) =>
                    sameLine(line, action.productId, action.color, action.size)
                        ? { ...line, petAssignment: action.petAssignment }
                        : line
                ),
            };
        case "SET_ALL_SELECTED":
            return { ...state, cart: state.cart.map((line) => ({ ...line, selected: action.selected })) };
        case "CLEAR_CART":
            return { ...state, cart: [] };
        case "TOGGLE_WISHLIST": {
            const exists = state.wishlist.includes(action.productId);
            return {
                ...state,
                wishlist: exists
                    ? state.wishlist.filter((id) => id !== action.productId)
                    : [...state.wishlist, action.productId],
            };
        }
        case "LOGIN":
            return { ...withoutMemberData(state), user: action.user };
        case "LOGOUT":
            return withoutMemberData(state);
        case "UPSERT_PET": {
            if (!state.user) return state;
            const pets = state.user.pets.filter((pet) => {
                if (action.pet.apiProfileId && pet.apiProfileId === action.pet.apiProfileId) return false;
                return pet.name !== action.pet.name;
            });
            return { ...state, user: { ...state.user, pets: [action.pet, ...pets] } };
        }
        case "SET_PETS":
            return state.user ? { ...state, user: { ...state.user, pets: action.pets } } : state;
        case "ADD_ORDER":
            return { ...state, orders: [action.order, ...state.orders] };
        default:
            return state;
    }
}

type StoreValue = {
    state: State;
    hydrated: boolean;
    addToCart: (productId: string, qty?: number, color?: string, size?: string) => void;
    setQty: (productId: string, qty: number, color?: string, size?: string) => void;
    removeFromCart: (productId: string, color?: string, size?: string) => void;
    setSelected: (productId: string, selected: boolean, color?: string, size?: string) => void;
    setLinePet: (productId: string, petAssignment?: CartPetAssignment, color?: string, size?: string) => void;
    setAllSelected: (selected: boolean) => void;
    clearCart: () => void;
    toggleWishlist: (productId: string) => void;
    isWished: (productId: string) => boolean;
    login: (user: User) => void;
    logout: () => void;
    upsertPet: (pet: PetProfile) => void;
    addOrder: (order: Order) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reducer, INITIAL);
    const [hydrated, setHydrated] = useState(false);
    const memberRefreshIdentity = state.user?.email || "";
    const memberRefreshToken = state.user?.apiAccessToken;

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = { ...INITIAL, ...JSON.parse(raw) };
                if (parsed.user) {
                    parsed.user.apiAccessToken = window.localStorage.getItem(API_TOKEN_KEY) || parsed.user.apiAccessToken;
                }
                // 선택 플래그 도입 전 저장분 보정 — 미지정(undefined)은 선택된 것으로
                parsed.cart = (parsed.cart ?? []).map((line: CartLine) => ({ ...line, selected: line.selected !== false }));
                dispatch({ type: "HYDRATE", state: parsed });
                // 과거(플래그 동기화 전)에 로그인한 사용자 보정 — user 는 있는데
                // 헤더용 로그인 플래그가 없으면 지금 세팅해 헤더를 마이페이지로 전환
                if (parsed.user && !authStorage.get()) {
                    authStorage.set({ provider: "email", ts: Date.now() });
                }
            }
        } catch {
            // Ignore corrupt local storage.
        } finally {
            setHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateForLocalStorage(state)));
        } catch {
            // The server remains the source of truth. A quota failure must not
            // break the live member session or discard in-memory photos.
        }
    }, [state, hydrated]);

    useEffect(() => {
        if (!memberRefreshIdentity) return;
        const onStorage = (event: StorageEvent) => {
            if (event.key !== STORAGE_KEY) return;
            if (event.newValue === null) {
                dispatch({ type: "LOGOUT" });
                return;
            }
            try {
                const next = JSON.parse(event.newValue) as Partial<State>;
                if (!next.user) dispatch({ type: "LOGOUT" });
            } catch {
                // Ignore malformed writes from another tab.
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [memberRefreshIdentity]);

    useEffect(() => {
        if (!hydrated || !memberRefreshIdentity) return;
        let cancelled = false;
        loadPetProfilesSmart(memberRefreshToken)
            .then((pets) => {
                if (!cancelled && pets) dispatch({ type: "SET_PETS", pets });
            })
            .catch((error) => {
                if (!cancelled && error instanceof DdbApiError && error.status === 401) {
                    clearPersistedMemberSession();
                    dispatch({ type: "LOGOUT" });
                }
                // Keep the last local snapshot only for transient/offline failures.
                // An expired API session must not keep impersonating a signed-in member.
            });
        return () => {
            cancelled = true;
        };
    }, [hydrated, memberRefreshIdentity, memberRefreshToken]);

    const value = useMemo<StoreValue>(
        () => ({
            state,
            hydrated,
            addToCart: (productId, qty = 1, color, size) => dispatch({ type: "ADD_TO_CART", productId, qty, color, size }),
            setQty: (productId, qty, color, size) => dispatch({ type: "SET_QTY", productId, qty, color, size }),
            removeFromCart: (productId, color, size) => dispatch({ type: "REMOVE_FROM_CART", productId, color, size }),
            setSelected: (productId, selected, color, size) => dispatch({ type: "SET_SELECTED", productId, color, size, selected }),
            setLinePet: (productId, petAssignment, color, size) => dispatch({ type: "SET_LINE_PET", productId, color, size, petAssignment }),
            setAllSelected: (selected) => dispatch({ type: "SET_ALL_SELECTED", selected }),
            clearCart: () => dispatch({ type: "CLEAR_CART" }),
            toggleWishlist: (productId) => dispatch({ type: "TOGGLE_WISHLIST", productId }),
            isWished: (productId) => state.wishlist.includes(productId),
            login: (user) => {
                // 헤더/추천 섹션이 보는 로그인 플래그도 함께 세팅(마이페이지 버튼 전환)
                authStorage.set({ provider: user.authProvider ?? "email", ts: Date.now() });
                dispatch({ type: "LOGIN", user });
            },
            logout: () => {
                clearPersistedMemberSession(state);
                dispatch({ type: "LOGOUT" });
            },
            upsertPet: (pet) => dispatch({ type: "UPSERT_PET", pet }),
            addOrder: (order) => dispatch({ type: "ADD_ORDER", order }),
        }),
        [state, hydrated]
    );

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
    const value = useContext(StoreContext);
    if (!value) throw new Error("useStore must be used inside StoreProvider");
    return value;
}

export function useCart() {
    const store = useStore();
    const count = store.state.cart.reduce((sum, line) => sum + line.qty, 0);
    return { ...store, lines: store.state.cart, count };
}

export function useAuth() {
    const store = useStore();
    return {
        user: store.state.user,
        login: store.login,
        logout: store.logout,
        upsertPet: store.upsertPet,
    };
}
