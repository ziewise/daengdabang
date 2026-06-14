"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useState,
} from "react";

export type CartLine = { productId: string; qty: number };
export type PetProfile = {
    name: string;
    size: "small" | "medium" | "large";
    age: string;
    coat: "short" | "medium" | "long";
    activity: "low" | "normal" | "high";
    concerns: string[];
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
    | { type: "ADD_TO_CART"; productId: string; qty: number }
    | { type: "SET_QTY"; productId: string; qty: number }
    | { type: "REMOVE_FROM_CART"; productId: string }
    | { type: "CLEAR_CART" }
    | { type: "TOGGLE_WISHLIST"; productId: string }
    | { type: "LOGIN"; user: User }
    | { type: "LOGOUT" }
    | { type: "UPSERT_PET"; pet: PetProfile }
    | { type: "ADD_ORDER"; order: Order };

const STORAGE_KEY = "daengdabang.store.v2";
const API_TOKEN_KEY = "ddb.api.accessToken";
const INITIAL: State = { cart: [], wishlist: [], user: null, orders: [] };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "HYDRATE":
            return action.state;
        case "ADD_TO_CART": {
            const existing = state.cart.find((line) => line.productId === action.productId);
            if (existing) {
                return {
                    ...state,
                    cart: state.cart.map((line) =>
                        line.productId === action.productId
                            ? { ...line, qty: Math.min(99, line.qty + action.qty) }
                            : line
                    ),
                };
            }
            return { ...state, cart: [...state.cart, { productId: action.productId, qty: action.qty }] };
        }
        case "SET_QTY":
            return {
                ...state,
                cart: state.cart
                    .map((line) => (line.productId === action.productId ? { ...line, qty: action.qty } : line))
                    .filter((line) => line.qty > 0),
            };
        case "REMOVE_FROM_CART":
            return { ...state, cart: state.cart.filter((line) => line.productId !== action.productId) };
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
            const pets = state.user.pets.filter((pet) => pet.name !== action.pet.name);
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
    addToCart: (productId: string, qty?: number) => void;
    setQty: (productId: string, qty: number) => void;
    removeFromCart: (productId: string) => void;
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
            if (raw) dispatch({ type: "HYDRATE", state: { ...INITIAL, ...JSON.parse(raw) } });
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
            addToCart: (productId, qty = 1) => dispatch({ type: "ADD_TO_CART", productId, qty }),
            setQty: (productId, qty) => dispatch({ type: "SET_QTY", productId, qty }),
            removeFromCart: (productId) => dispatch({ type: "REMOVE_FROM_CART", productId }),
            clearCart: () => dispatch({ type: "CLEAR_CART" }),
            toggleWishlist: (productId) => dispatch({ type: "TOGGLE_WISHLIST", productId }),
            isWished: (productId) => state.wishlist.includes(productId),
            login: (user) => dispatch({ type: "LOGIN", user }),
            logout: () => {
                window.localStorage.removeItem(API_TOKEN_KEY);
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
