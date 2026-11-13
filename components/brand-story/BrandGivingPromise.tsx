import Image from "next/image";
import styles from "./BrandGivingPromise.module.css";

export default function BrandGivingPromise({ id }: { id: string }) {
    return (
        <section id={id} className={styles.promise} aria-labelledby={`${id}-title`} data-brand-giving data-pet-companion-avoid="true">
            <div className={styles.copy}>
                <p className={styles.eyebrow}>함께 지켜갈 댕다방의 약속</p>
                <h2 id={`${id}-title`} className={styles.title}>
                    <span>어떤 강아지도</span>
                    <span><em>굶지 않도록,</em></span>
                    <span>내일을 잃지 않도록.</span>
                </h2>
                <p className={styles.lead}>
                    우리 아이를 아끼는 마음이,<br />
                    아직 가족을 기다리는 아이들에게도 닿도록.
                </p>
                <div className={styles.commitment}>
                    <Image src="/images/ui/brand-std-assure-256.webp" alt="" width={56} height={56} aria-hidden="true" />
                    <p>
                        댕다방은 <strong>일정 금액을 유기견 보호 재단에 기부</strong>해,
                        보호가 필요한 강아지들이 굶주림으로 생명을 잃지 않도록
                        먹거리와 돌봄을 지원하는 일에 힘을 보태겠습니다.
                    </p>
                </div>
            </div>
            <div className={styles.illustration} aria-hidden="true">
                <span className={styles.sunshine}>✦</span>
                <Image src="/images/ui/brand-story-close-448.webp" alt="" width={448} height={448} sizes="(max-width: 760px) 176px, 280px" className={styles.dog} />
                <p>든든한 한 끼,<br /><span>함께 살아갈 내일.</span></p>
                <span className={styles.heart}>♥</span>
            </div>
        </section>
    );
}
