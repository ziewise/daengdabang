/**
 * ChatbotModal — 댕댕이 챗봇 (귀여운 톤)
 * ---------------------------------------------------------------------
 * 우측 슬라이드인 모달 — 인사 메시지 + 추천 질문 칩 + 메시지 영역 + 입력바.
 * 현재는 mock 응답 (키워드 매칭 + 디폴트). 추후 실제 LLM 백엔드 연결 가능.
 * 배경 = 파스텔 그라데이션 + 떠다니는 발자국/하트 데코.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./chatbot.module.css";

interface Props {
    open: boolean;
    onClose: () => void;
}

interface ChatMessage {
    id: number;
    role: "bot" | "user";
    text: string;
    suggestions?: string[];   // 추천 질문 (봇 메시지에 함께 노출)
}

/** mock 응답 생성기 — 간단한 키워드 매칭 + 기본 응답 */
function botReply(text: string): { text: string; suggestions?: string[] } {
    const t = text.toLowerCase();
    if (/사료|먹이|푸드|식사/.test(t)) {
        return {
            text: "🦴 사료 추천해 드릴게요! 우리 댕댕이의 견종·체중·연령을 알려주시면 더 정확해요. 베스트 푸드는 '프리미엄 그레인프리' 라인이 인기예요.",
            suggestions: ["대형견 사료", "퍼피 사료", "다이어트 사료"],
        };
    }
    if (/하네스|리드줄|산책/.test(t)) {
        return {
            text: "🐾 산책용품은 Ruffwear 가 정말 좋아요. 활동량 많은 댕댕이는 '플레그라인' 또는 '하이앤라이트' 하네스를 추천드려요!",
            suggestions: ["야간산책 용품", "방수 의류", "고글"],
        };
    }
    if (/펫렌즈|분석|견종/.test(t)) {
        return {
            text: "🪄 펫렌즈로 우리 댕댕이를 분석해보세요! 오른쪽 위 펫렌즈 버튼을 눌러 사진 3장만 올리시면 견종 + 체형 분석을 받아볼 수 있어요.",
            suggestions: ["펫렌즈 시작", "분석 기록 보기"],
        };
    }
    if (/안녕|hi|hello/.test(t)) {
        return {
            text: "안녕하세요! 댕다방 댕댕 챗봇이에요 🐶 무엇을 도와드릴까요?",
            suggestions: ["사료 추천", "산책용품", "펫렌즈 사용법"],
        };
    }
    if (/배송|주문|환불/.test(t)) {
        return {
            text: "📦 주문·배송 관련 문의군요! 마이페이지 → 주문 내역에서 실시간 배송 조회가 가능해요. 교환·반품은 받으신 날로부터 7일 이내 가능합니다.",
            suggestions: ["배송 조회", "교환·반품"],
        };
    }
    if (/등급|혜택|포인트/.test(t)) {
        return {
            text: "🏆 등급은 연간 구매액 + 활동 점수로 산정돼요. SILVER → GOLD → PLATINUM → DIAMOND 순이고, 각 단계마다 적립금·무료배송 혜택이 더 좋아져요!",
            suggestions: ["내 등급 보기", "포인트 적립 방법"],
        };
    }
    return {
        text: "🤔 좀 더 구체적으로 알려주시면 더 정확히 도와드릴 수 있어요! 아래 키워드 중에 하나 골라보세요.",
        suggestions: ["사료 추천", "산책용품", "펫렌즈 사용법", "배송 문의"],
    };
}

const INITIAL_MESSAGES: ChatMessage[] = [
    {
        id: 1,
        role: "bot",
        text: "안녕하세요! 댕다방 챗봇이에요 🐶✨\n우리 댕댕이를 위한 어떤 도움이 필요한지 알려주세요.",
        suggestions: ["사료 추천", "산책용품", "펫렌즈 사용법", "배송 문의"],
    },
];

export default function ChatbotModal({ open, onClose }: Props) {
    const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
    const [input, setInput] = useState("");
    const [typing, setTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const idRef = useRef(2);   // 다음 메시지 ID

    /** body 스크롤 잠금 + Escape 닫기 */
    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    /** 새 메시지마다 맨 아래로 스크롤 */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typing]);

    const send = useCallback((text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        // 1) 사용자 메시지 추가
        setMessages((m) => [
            ...m,
            { id: idRef.current++, role: "user", text: trimmed },
        ]);
        setInput("");

        // 2) 봇 타이핑 표시 → 0.7~1.2초 후 응답
        setTyping(true);
        const delay = 700 + Math.random() * 500;
        setTimeout(() => {
            const reply = botReply(trimmed);
            setMessages((m) => [
                ...m,
                {
                    id: idRef.current++,
                    role: "bot",
                    text: reply.text,
                    suggestions: reply.suggestions,
                },
            ]);
            setTyping(false);
        }, delay);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        send(input);
    };

    if (!open) return null;

    return (
        <>
            <div
                className={styles.overlay}
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="댕댕 챗봇"
                className={styles.modal}
            >
                {/* 배경 떠다니는 데코 */}
                <i className={`${styles.deco} fa-solid fa-paw`} aria-hidden="true" />
                <i className={`${styles.deco} fa-solid fa-heart`} aria-hidden="true" />
                <i className={`${styles.deco} fa-solid fa-paw`} aria-hidden="true" />
                <i className={`${styles.deco} fa-solid fa-bone`} aria-hidden="true" />
                <i className={`${styles.deco} fa-solid fa-heart`} aria-hidden="true" />

                {/* 헤더 */}
                <div className={styles.header}>
                    <div className={styles.avatar}>
                        <i className="fa-solid fa-dog" />
                    </div>
                    <div className={styles.online} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-extrabold text-foreground">댕댕 챗봇</h2>
                        <p className="text-[10px] text-neutral-500">언제든 물어보세요 · 24시간 응대</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/70 transition"
                        aria-label="닫기"
                    >
                        <i className="fa-solid fa-xmark text-neutral-600" />
                    </button>
                </div>

                {/* 메시지 영역 */}
                <div className={styles.messages}>
                    {messages.map((m) => (
                        <div key={m.id} className={`${styles.bubble} ${m.role === "bot" ? styles.bubbleBot : styles.bubbleUser}`}>
                            <p className="whitespace-pre-line">{m.text}</p>
                            {/* 봇 메시지에 추천 질문 칩 */}
                            {m.role === "bot" && m.suggestions && m.suggestions.length > 0 && (
                                <div className={styles.suggestRow}>
                                    {m.suggestions.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => send(s)}
                                            className={styles.suggest}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {typing && (
                        <div className={`${styles.bubble} ${styles.bubbleBot}`}>
                            <div className={styles.typing} aria-label="입력 중">
                                <span /><span /><span />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* 입력 영역 */}
                <form className={styles.inputArea} onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="메시지를 입력하세요..."
                        className={styles.input}
                        maxLength={200}
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || typing}
                        className={styles.sendBtn}
                        aria-label="전송"
                    >
                        <i className="fa-solid fa-paper-plane" />
                    </button>
                </form>
            </div>
        </>
    );
}
