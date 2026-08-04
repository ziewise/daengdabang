import styles from "./DaengLabWordmark.module.css";

type Props = {
    label: string;
    compact?: boolean;
};

export default function DaengLabWordmark({ label, compact = false }: Props) {
    return (
        <span
            className={styles.wordmark}
            data-daenglab-wordmark
            data-compact={compact ? "true" : "false"}
            role="img"
            aria-label={label}
        >
            <span className={styles.brandLine} aria-hidden="true">
                <span>댕</span><span>다</span><span>방</span>
            </span>
            <span className={styles.labLine} aria-hidden="true">연구소</span>
        </span>
    );
}
