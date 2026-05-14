/**
 * ChatbotFab — 우측 중앙, 펫렌즈 FAB 바로 아래
 * ---------------------------------------------------------------------
 * 클릭 시 ChatbotModal 열림.
 */
"use client";

import { useChatbot } from "./ChatbotProvider";
import styles from "./chatbot.module.css";

export default function ChatbotFab() {
    const { open } = useChatbot();
    return (
        <button
            type="button"
            onClick={open}
            className={styles.fab}
            aria-label="댕댕 챗봇 열기"
        >
            <i className="fa-solid fa-comments" />
            <span>챗봇</span>
        </button>
    );
}
