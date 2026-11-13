import Image from "next/image";
import styles from "./BrandGivingPromise.module.css";

export default function BrandGivingPromise({ id }: { id: string }) {
    return (
        <section id={id} className={styles.promise} aria-labelledby={`${id}-title`} data-brand-giving data-pet-companion-avoid="true">
            <div className={styles.copy}>
                <p className={styles.eyebrow}>함께 지켜갈 댕다방의 약속</p>
                <h2 id={`${id}-title`} className={styles.title}>
                    <span className={styles.contextLine}>우리 아이를 위한 구매가,</span>
                    <span>더 많은 아이를</span>
                    <span><em>살리는 힘으로.</em></span>
                </h2>
                <p className={styles.lead}>
                    댕다방에서의 구매가 많아질수록,<br />
                    더 많은 유기견에게 한 끼와 살아갈 기회를 전하겠습니다.
                </p>
                <div className={styles.commitment}>
                    <Image src="/images/ui/brand-std-assure-256.webp" alt="" width={56} height={56} aria-hidden="true" />
                    <p>
                        댕다방은 여러분의 구매로 마련한 <strong>일정 금액을 유기견 보호 재단에 기부</strong>해,
                        어떤 강아지도 굶주림으로 생명을 잃지 않도록
                        먹거리와 돌봄을 지원하는 일에 힘을 보태겠습니다.
                    </p>
                </div>
            </div>
            <div className={styles.illustration} aria-hidden="true">
                <span className={styles.sunshine}>✦</span>
                <Image src="/images/ui/brand-story-close-448.webp" alt="" width={448} height={448} sizes="(max-width: 760px) 176px, 280px" className={styles.dog} />
                <p>함께 모은 마음,<br /><span>더 많은 내일로.</span></p>
                <span className={styles.heart}>♥</span>
            </div>
        </section>
    );
}
