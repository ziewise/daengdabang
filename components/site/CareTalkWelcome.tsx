"use client";

/**
 * CareTalkWelcome — 웹 케어톡 창 첫 화면(대화가 비었을 때) · 2026-10-23 사용자 선택 "C3 크레파스 그림일기 창 + B 첫 화면"
 * ---------------------------------------------------------------------
 * 무지개 고리 케어톡 그림 + "무엇이 궁금하세요?" + 짧은 설명(예시 질문 카드는 빼기로 — 2026-10-23 사용자 B안).
 * CARE_TALK_STARTERS 는 AI 상담 페이지(app/chat) 카드가 같은 질문으로 창을 열 때 씀.
 * 꾸밈은 ChatWidget.module.css 의 웹 전용 구역(.welcome*). 앱은 AppShell 의 자기 첫 화면(CareEmpty)을 그대로 씀.
 */
import Image from "next/image";
import styles from "./ChatWidget.module.css";

// 첫 화면 질문 — 제목 · 짧은 설명 · 그림 · 실제로 보낼 질문
export const CARE_TALK_STARTERS = [
    { title: "우리 아이 상품 고르기", body: "크기 · 생활에 맞는 산책용품 · 먹거리", art: "/images/ui/shop-menu-all-128.webp", tint: "#fff6e3", question: "우리 아이에게 맞는 산책용품을 골라 주세요." },
    { title: "생활 돌봄 질문", body: "목욕 · 빗질 · 산책 돌봄 차근차근", art: "/images/ui/daily-web-care-384.webp", tint: "#e9f8f1", question: "목욕이랑 빗질은 얼마나 자주 해 주면 좋아요?" },
    { title: "동네 돌봄 찾기", body: "가까운 병원 · 미용 · 호텔 후보", art: "/images/ui/care-vet-256.webp", tint: "#e9f4fb", question: "가까운 동물병원이나 미용실을 찾아 주세요." },
] as const;

// ask 는 ChatWidget 첫 화면 약속(empty 부품)이라 받기만 함
export default function CareTalkWelcome(props: { ask: (question: string) => void }) {
    void props;
    return (
        <div className={styles.welcome}>
            <span className={styles.welcomeRing} aria-hidden="true">
                <span><Image src="/images/ui/mypet-caretalk-256.webp" alt="" width={72} height={72} /></span>
            </span>
            <h3 className={styles.welcomeTitle}>무엇이 궁금하세요?</h3>
            <p className={styles.welcomeLead}>우리 아이에게 필요한 정보를 같이 알아보아요.</p>
        </div>
    );
}
