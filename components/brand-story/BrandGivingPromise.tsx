import LocalizedMenuLabel from "@/components/i18n/LocalizedMenuLabel";
import Image from "next/image";
import styles from "./BrandGivingPromise.module.css";

export default function BrandGivingPromise({ id }: { id: string }) {
    return (
        <section id={id} className={styles.promise} aria-labelledby={`${id}-title`} data-brand-giving data-pet-companion-avoid="true">
            <div className={styles.copy}>
                <h2 id={`${id}-title`} className={styles.title}>
                    <span className={styles.contextLine}><LocalizedMenuLabel label={"여러분의"} /> <span className={styles.choice}><LocalizedMenuLabel label={"작은 선택"} /></span><LocalizedMenuLabel label={"이"} /></span>{" "}
                    <span className={styles.recipient}><LocalizedMenuLabel label={"유기견 아이들에게"} /></span>{" "}
                    <span><em><LocalizedMenuLabel label={"따뜻한 사랑"} /></em><LocalizedMenuLabel label={"이 됩니다"} /></span>
                </h2>
                <div className={styles.commitment}>
                    <Image src="/images/ui/brand-std-assure-256.webp" alt="" width={56} height={56} aria-hidden="true" />
                    <p>
                        <LocalizedMenuLabel label={"댕다방은 여러분의 구매로 마련한"} /> <strong><LocalizedMenuLabel label={"수익의 일부"} /></strong><LocalizedMenuLabel label={"를"} />{" "}
                        <strong><LocalizedMenuLabel label={"유기견 보호단체에 기부"} /></strong><LocalizedMenuLabel label={"하여, 사랑과 관심이 필요한 아이들에게"} />{" "}
                        <LocalizedMenuLabel label={"따뜻한 손길이 닿을 수 있도록"} /> <span className={styles.care}><LocalizedMenuLabel label={"먹거리와 돌봄"} /></span><LocalizedMenuLabel label={"을 지원하겠습니다."} />
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
