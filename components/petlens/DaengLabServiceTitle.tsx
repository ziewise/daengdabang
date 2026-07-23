type Props = {
    en?: boolean;
    compact?: boolean;
    showBadge?: boolean;
    suffix?: string;
    className?: string;
    suffixClassName?: string;
};

export default function DaengLabServiceTitle({
    en = false,
    compact = false,
    showBadge = true,
    suffix,
    className = "",
    suffixClassName = "",
}: Props) {
    const serviceSuffix = suffix ?? (en ? "Behavior, Sound & Wellness Signals" : "행동·소리·건강 신호 분석");
    const newServiceLabel = en ? "new service" : "신규 서비스";
    const accessibleLabel = `${en ? "DaengLab" : "댕랩"} ${serviceSuffix}${showBadge ? `, ${newServiceLabel}` : ""}`;

    return (
        <span
            className={`inline-flex min-w-0 flex-wrap items-start gap-x-1.5 gap-y-1 ${className}`.trim()}
            data-daenglab-service-title
        >
            <span className="sr-only">{accessibleLabel}</span>
            <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1" aria-hidden="true">
                <span className={`ddb-daenglab-wordmark ${compact ? "ddb-daenglab-wordmark--compact" : ""}`.trim()}>
                    {en ? "DaengLab" : "댕랩"}
                </span>
                <span className={suffixClassName}>{serviceSuffix}</span>
            </span>
            {showBadge && (
                <sup
                    className={`ddb-daenglab-new-service ${compact ? "ddb-daenglab-new-service--compact" : ""}`.trim()}
                    aria-hidden="true"
                    data-daenglab-new-service
                >
                    {en ? "NEW SERVICE" : "신규서비스"}
                </sup>
            )}
        </span>
    );
}
