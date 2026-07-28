"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";

type ProgressiveRevealTextProps = {
    text: string;
    className?: string;
    stepMs?: number;
    maxDelayMs?: number;
};

export default function ProgressiveRevealText({
    text,
    className = "",
    stepMs = 38,
    maxDelayMs = 1_350,
}: ProgressiveRevealTextProps) {
    const parts = useMemo(() => text.split(/(\s+)/), [text]);
    let visibleIndex = 0;

    return (
        <span
            className={`ddb-progressive-reveal ${className}`.trim()}
            role="text"
            aria-label={text}
            style={{
                "--ddb-reveal-step": `${stepMs}ms`,
                "--ddb-reveal-max-delay": `${maxDelayMs}ms`,
            } as CSSProperties}
        >
            <span aria-hidden="true">
                {parts.map((part, index) => {
                    if (!part) return null;
                    if (/^\s+$/.test(part)) return part;
                    const delayMs = Math.min(visibleIndex * stepMs, maxDelayMs);
                    visibleIndex += 1;
                    return (
                        <span
                            key={`${index}-${part}`}
                            className="ddb-progressive-token"
                            style={{ "--ddb-token-delay": `${delayMs}ms` } as CSSProperties}
                        >
                            {part}
                        </span>
                    );
                })}
            </span>
        </span>
    );
}
