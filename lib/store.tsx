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
import type { CartPetAssignment } from "@/lib/pet-attribution";

// selected — 장바구니에서 결제 대상으로 체크된 라인(기본 true). 결제는 선택된 라인만 진행.
export type CartLine = { productId: string; qty: number; color?: string; size?: string; selected?: boolean; petAssignment?: CartPetAssignment };
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
    rawAnalysis?: Record<string, unknown>;
    lastAnalyzedAt?: string;
};
export type User = {
    apiUserId?: number;
    apiAccessToken?: string;
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
    | { type: "ADD_ORDER"; order: Order };

const STORAGE_KEY = "daengdabang.store.v2";
const API_TOKEN_KEY = "ddb.api.accessToken";
const INITIAL: State = { cart: [], wishlist: [], user: null, orders: [] };

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
            return { ...state, user: action.user };
        case "LOGOUT":
            return { ...state, user: null };
        case "UPSERT_PET": {
            if (!state.user) return state;
            const pets = state.user.pets.filter((pet) => {
                if (action.pet.apiProfileId && pet.apiProfileId === action.pet.apiProfileId) return false;
                return pet.name !== action.pet.name;
            });
            return { ...state, user: { ...state.user, pets: [action.pet, ...pets] } };
        }
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

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = { ...INITIAL, ...JSON.parse(raw) };
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
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state, hydrated]);

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
                authStorage.set({ provider: "email", ts: Date.now() });
                dispatch({ type: "LOGIN", user });
            },
            logout: () => {
                window.localStorage.removeItem(API_TOKEN_KEY);
                authStorage.clear();
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
