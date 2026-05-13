/**
 * PetlensAnalyzing — Step 3: 분석 진행률 애니메이션 (mock)
 * ---------------------------------------------------------------------
 * 4단계 progressive text + bar (총 ~3초). 끝나면 onComplete 호출.
 */
"use client";

import { useEffect, useState } from "react";
import { ANALYSIS_STEPS } from "./petlens-data";

export default function PetlensAnalyzing({ onComplete }: { onComplete: () => void }) {
    const [idx, setIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const [text, setText] = useState(ANALYSIS_STEPS[0].text);

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;

        const tick = (i: number) => {
            if (cancelled) return;
            const step = ANALYSIS_STEPS[i];
            setText(step.text);
            setProgress(step.progress);
            setIdx(i);
            if (i < ANALYSIS_STEPS.length - 1) {
                timer = setTimeout(() => tick(i + 1), 600);
            } else {
                timer = setTimeout(() => {
                    if (!cancelled) onComplete();
                }, 600);
            }
        };
        tick(0);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [onComplete]);

    return (
        <div className="text-center py-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-aurora-blue to-aurora-indigo flex items-center justify-center text-white text-4xl animate-pulse">
                <i className="fa-solid fa-magnifying-glass-chart" />
            </div>
            <h3 className="text-lg font-extrabold mb-1.5">분석 중이에요</h3>
            <p key={idx} className="text-xs text-neutral-600 mb-6 animate-in fade-in duration-300">
                {text}
            </p>
            <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-aurora-blue via-aurora-indigo to-aurora-pink transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
