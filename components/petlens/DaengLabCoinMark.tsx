type Props = {
    en?: boolean;
    compact?: boolean;
    className?: string;
};

/**
 * Shared DaengDaBang Research Lab coin signature.
 * The visible lettering is decorative; assistive technology receives one stable label.
 */
export default function DaengLabCoinMark({ en = false, compact = false, className = "" }: Props) {
    const accessibleLabel = en ? "DaengDaBang Research Lab coin" : "댕다방 연구소 코인";

    return (
        <span
            role="img"
            aria-label={accessibleLabel}
            className={`ddb-daenglab-coin-mark ${compact ? "ddb-daenglab-coin-mark--compact" : ""} ${className}`.trim()}
            data-daenglab-coin-mark
        >
            <span className="ddb-daenglab-coin-brand" aria-hidden="true">
                {en ? (
                    <>
                        <span className="ddb-daenglab-coin-brand--teal">DaengDaBang</span>
                        <span className="ddb-daenglab-coin-brand--coral">Lab</span>
                    </>
                ) : (
                    <>
                        <span className="ddb-daenglab-coin-brand--teal">댕다방</span>
                        <span className="ddb-daenglab-coin-brand--coral">연구소</span>
                    </>
                )}
            </span>
            <span className="ddb-daenglab-coin-disc" aria-hidden="true">C</span>
            <span className="ddb-daenglab-coin-copy" aria-hidden="true">{en ? "COIN" : "코인"}</span>
        </span>
    );
}
