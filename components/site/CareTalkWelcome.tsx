"use client";

/**
 * CareTalkWelcome — 웹 케어톡 창 첫 화면(대화가 비었을 때) · 2026-10-23 사용자 선택 "M1 창 + M2 첫 화면(M1 색)"
 * ---------------------------------------------------------------------
 * 무지개 고리 케어톡 그림 + "무엇이 궁금하세요?" + 질문 카드 셋.
 * 카드를 누르면 ChatWidget 이 넘겨준 ask(질문) — 손님이 직접 그 질문을 보낸 것과 같은 기존 동작.
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

export default function CareTalkWelcome({ ask }: { ask: (question: string) => void }) {
    return (
        <div className={styles.welcome}>
            <span className={styles.welcomeRing} aria-hidden="true">
                <span><Image src="/images/ui/mypet-caretalk-256.webp" alt="" width={72} height={72} /></span>
            </span>
            <h3 className={styles.welcomeTitle}>무엇이 궁금하세요?</h3>
            <p className={styles.welcomeLead}>우리 아이의 생활 · 상품 · 동네 돌봄을 함께 찾아볼게요.</p>
            <ul className={styles.welcomeList}>
                {CARE_TALK_STARTERS.map((starter) => (
                    <li key={starter.title}>
                        <button type="button" className={styles.welcomeCard} onClick={() => ask(starter.question)}>
                            <span className={styles.welcomeArt} style={{ background: starter.tint }} aria-hidden="true">
                                <Image src={starter.art} alt="" width={40} height={40} />
                            </span>
                            <span className={styles.welcomeText}>
                                <b>{starter.title}</b>
                                <small>{starter.body}</small>
                            </span>
                            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
