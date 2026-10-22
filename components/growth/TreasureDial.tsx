"use client";

/**
 * TreasureDial — 오늘의 보물(로그인 후) "하루 원판" (2026-10-22 사용자 선택 · 웹만)
 * ---------------------------------------------------------------------
 * 오늘 할 일(출근 도장 · 서버가 주는 돌봄 할 일 · 사진 분석)을 조각으로 나눈 둥근 판.
 *  - 조각을 누르거나 판을 옆으로 밀면 그 조각이 맨 위 바늘 아래로 돌아온다(가까운 쪽으로).
 *  - 끝낸 조각은 가운데부터 진한 색으로 칠해지고 초록 체크가 붙는다.
 *  - 바깥 테두리는 오늘 루틴 점수만큼 무지개로 차오른다.
 *  - 쿠션 판 결의 입체감: 빛은 늘 위에서(그늘 층은 돌지 않음), 그림 단추 · 가운데는 볼록.
 * 이 판은 보기만 바꾼다 — 실제 동작(도장 · 할 일 완료 · 사진 분석)은 옆 분홍 판 버튼이 기존 함수로 한다.
 * 꾸밈 CSS 는 app/daily-web.css 의 "하루 원판" 묶음(.dw-dial*).
 */

import Image from "next/image";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";

// 조각 하나 — 이름 · 그림 · 끝냄 여부 · 색(연한 바탕 / 끝냈을 때 진한 색 / 고른 테)
export type DialSlice = {
    id: string;
    label: string;
    art: string;
    done: boolean;
    pale: string;
    strong: string;
    ring: string;
};

type Props = {
    slices: DialSlice[];
    selected: number;
    onSelect: (index: number) => void;
    score: number | null; // 오늘 루틴 점수(0~100) — 테두리 차오름
    center: ReactNode; // 가운데 동그라미 내용(아이 그림 · 점수)
    burst?: { key: number; text: string } | null; // 도장 보상 코인이 톡 올라가는 표시
};

export default function TreasureDial({ slices, selected, onSelect, score, center, burst }: Props) {
    const count = Math.max(1, slices.length);
    const span = 360 / count; // 조각 하나의 각도
    // 누적 회전 — 고른 조각이 맨 위로 오도록, 늘 가까운 쪽으로 돈다(고른 조각이 바뀐 그 렌더에서 바로 계산)
    const [turn, setTurn] = useState(() => ({ selected, span, rot: -selected * span }));
    let rot = turn.rot;
    if (turn.selected !== selected || turn.span !== span) {
        const target = -selected * span;
        rot = turn.rot + (((target - turn.rot) % 360 + 540) % 360 - 180);
        setTurn({ selected, span, rot });
    }

    // 옆으로 밀기 — 40px 넘게 밀면 한 칸
    const startX = useRef<number | null>(null);
    const onPointerDown = (event: React.PointerEvent) => { startX.current = event.clientX; };
    const onPointerUp = (event: React.PointerEvent) => {
        if (startX.current === null) return;
        const dx = event.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 40) onSelect((selected + (dx < 0 ? 1 : -1) + count) % count);
    };

    // 조각 사이 흰 홈(돌 때 같이 돎)
    const grooves = `repeating-conic-gradient(from ${span / 2 - 1}deg, rgb(255 255 255 / 95%) 0 2deg, transparent 2deg ${span}deg)`;
    const at = (index: number): CSSProperties => {
        const angle = (index * span * Math.PI) / 180;
        return { left: `${50 + 34.5 * Math.sin(angle)}%`, top: `${50 - 34.5 * Math.cos(angle)}%` };
    };

    return (
        <div className="dw-dial" role="group" aria-label="오늘 할 일 원판 — 조각을 누르면 그 할 일이 옆에 보여요" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
            {/* 바깥 테두리 — 오늘 루틴 점수만큼 무지개 */}
            <span className="dw-dial-ring" style={{ "--dw-score": score ?? 0 } as CSSProperties} aria-hidden="true" />
            <span className="dw-dial-ring-in" aria-hidden="true" />
            {/* 조각 바탕(연한 색) + 끝낸 조각 칠하기(진한 색) — 함께 돎 */}
            <span className="dw-dial-rotor" style={{ transform: `rotate(${rot}deg)` }} aria-hidden="true">
                {slices.map((slice, index) => (
                    <span key={slice.id}>
                        <span className="dw-dial-slice" style={{ background: `conic-gradient(from ${-span / 2 + 1}deg, ${slice.pale} 0 ${span - 2}deg, transparent 0)`, transform: `rotate(${index * span}deg)` }} />
                        <span className={`dw-dial-slice dw-dial-fill ${slice.done ? "is-on" : ""}`} style={{ background: `conic-gradient(from ${-span / 2 + 1}deg, ${slice.strong} 0 ${span - 2}deg, transparent 0)`, transform: `rotate(${index * span}deg)` }} />
                    </span>
                ))}
            </span>
            <span className="dw-dial-grooves" style={{ background: grooves, transform: `rotate(${rot}deg)` }} aria-hidden="true" />
            {/* 빛 · 그늘(돌지 않음 — 빛은 늘 위에서) */}
            <span className="dw-dial-shade" aria-hidden="true" />
            {/* 조각 그림 단추 — 판과 함께 돌고, 그림은 늘 똑바로 */}
            <span className="dw-dial-arts" style={{ transform: `rotate(${rot}deg)` }}>
                {slices.map((slice, index) => (
                    <button
                        key={slice.id}
                        type="button"
                        className={`dw-dial-art ${slice.done ? "is-done" : ""} ${index === selected ? "is-selected" : ""}`}
                        style={{ ...at(index), "--dw-dial-ring": slice.ring, transform: `rotate(${-rot}deg) scale(${index === selected ? 1.12 : 1})` } as CSSProperties}
                        onClick={() => onSelect(index)}
                        aria-label={`${slice.label}${slice.done ? " · 완료" : ""} 보기`}
                        aria-pressed={index === selected}
                    >
                        <Image src={slice.art} alt="" width={96} height={96} />
                        <span className="dw-dial-check" aria-hidden="true"><i className="fa-solid fa-check" /></span>
                    </button>
                ))}
            </span>
            {/* 맨 위 바늘 */}
            <span className="dw-dial-notch" aria-hidden="true" />
            {/* 가운데 — 아이 그림 · 오늘 루틴 */}
            <div className="dw-dial-center">{center}</div>
            {burst ? <span key={burst.key} className="dw-dial-burst" aria-hidden="true">{burst.text}</span> : null}
        </div>
    );
}
