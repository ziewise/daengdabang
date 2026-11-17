import Image from "next/image";
import styles from "./BrandGivingPromise.module.css";

export default function BrandGivingPromise({ id }: { id: string }) {
    return (
        <section id={id} className={styles.promise} aria-labelledby={`${id}-title`} data-brand-giving data-pet-companion-avoid="true">
            <div className={styles.copy}>
                <h2 id={`${id}-title`} className={styles.title}>
                    <span className={styles.contextLine}>여러분의 <span className={styles.choice}>작은 선택</span>이</span>{" "}
                    <span className={styles.recipient}>유기견 아이들에게</span>{" "}
                    <span><em>따뜻한 사랑</em>이 됩니다</span>
                </h2>
                <div className={styles.commitment}>
                    <Image src="/images/ui/brand-std-assure-256.webp" alt="" width={56} height={56} aria-hidden="true" />
                    <p>
                        댕다방은 여러분의 구매로 마련한 <strong>수익의 일부</strong>를{" "}
                        <strong>유기견 보호단체에 기부</strong>하여, 사랑과 관심이 필요한 아이들에게{" "}
                        따뜻한 손길이 닿을 수 있도록 <span className={styles.care}>먹거리와 돌봄</span>을 지원하겠습니다.
                    </p>
                </div>
            </div>
            <div className={styles.illustration} aria-hidden="true">
                <span className={styles.sunshine}>✦</span>
                <Image src="/images/ui/brand-story-close-448.webp" alt="" width={448} height={448} sizes="(max-width: 760px) 156px, 310px" className={styles.dog} />
                <span className={styles.heart}>♥</span>
            </div>
        </section>
    );
}
