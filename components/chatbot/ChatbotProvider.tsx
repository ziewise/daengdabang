/**
 * ChatbotProvider — 챗봇 모달 열림 상태 전역 컨텍스트
 * ---------------------------------------------------------------------
 * 어디서나 useChatbot() 으로 open()/close() 가능.
 * 펫렌즈와 동일 패턴 — FAB + Modal 글로벌 마운트.
 */
"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import ChatbotFab from "./ChatbotFab";
import ChatbotModal from "./ChatbotModal";

interface ChatbotContextValue {
    isOpen: boolean;
    open: () => void;
    close: () => void;
}

const ChatbotContext = createContext<ChatbotContextValue | null>(null);

export function useChatbot() {
    const ctx = useContext(ChatbotContext);
    if (!ctx) {
        throw new Error("useChatbot must be used inside <ChatbotProvider>");
    }
    return ctx;
}

export default function ChatbotProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

    return (
        <ChatbotContext.Provider value={value}>
            {children}
            <ChatbotFab />
            <ChatbotModal open={isOpen} onClose={close} />
        </ChatbotContext.Provider>
    );
}
