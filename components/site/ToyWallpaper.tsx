"use client";

/**
 * ToyWallpaper — 웹 배경 "강아지 장난감 벽지" (2026-10-18 사용자 결정 · 웹 화면 전용, 앱은 쓰지 않음)
 * ---------------------------------------------------------------------
 * 사용자 그림 장난감 9종을 작은 스티커 18장(장난감마다 방향 2가지, 농도 60% 미리 넣음 · public/images/ui/toys)으로 만들어
 * 페이지 길이만큼 고르게 흩뿌린다. 벽지가 화면에 고정되지 않고 **내용과 함께 스크롤**돼, 내릴수록 다른 장난감 · 배치가 나온다.
 *  - 고르게: 가로 화면 폭 × 세로 1600px 칸마다 최소 간격을 지키며 무작위 배치(앞 칸 가장자리 점까지 고려해 이음매 없음),
 *    가까운 자리에는 같은 장난감이 오지 않게, 크기 0.85~1.35배
 *  - 늘 같은 배치: 칸 번호 · 화면 폭 구간으로 정해지는 난수라 화면을 다시 열어도 같은 자리(움직이거나 깜빡이지 않음)
 *  - 가벼움: 큰 무늬 한 장(3000px, 메모리 약 36MB) 대신 작은 그림 18장(합 140KB · 메모리 2MB 안팎), 화면 밖 스티커는 늦게 불러옴
 *  - 안드로이드 강제 다크에서는 globals.css 가 숨김(기존 어두운 바탕 · 암막 그대로)
 * 클릭 · 읽기 프로그램에는 없는 것(pointer-events: none · aria-hidden). 화면 높이가 바뀌면(상품 더 보기 등) 칸을 이어 붙인다.
 */
import { useEffect, useRef, useState } from "react";

const BAND = 1600;            // 세로 칸 높이(px)
const DENSITY = 8.7e-6;       // 1px² 당 스티커 수(1440×900 한 화면에 약 11개 — 사용자 확정 60% 시안보다 20% 많게, 2026-10-18)
const KINDS = 9;

type Sticker = { x: number; y: number; kind: number; variant: "a" | "b"; size: number };

function rng(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** 한 칸(band)의 스티커 — 앞 칸의 아래쪽 점과도 간격을 지킴 */
function layoutBand(index: number, width: number, previous: Sticker[]): Sticker[] {
    const r = rng(index * 7919 + Math.round(width / 160) * 104729);
    const base = width < 640 ? 62 : 80;   // 휴대폰은 조금 작게
    const count = Math.max(3, Math.round(width * BAND * DENSITY));
    const minDist = Math.sqrt((width * BAND) / count) * 0.82;
    const top = index * BAND;
    const near = previous.filter((p) => p.y > top - minDist);
    const out: Sticker[] = [];
    const want = Array.from({ length: KINDS }, (_, k) => Math.floor(count / KINDS) + (k < count % KINDS ? 1 : 0));
    for (let tries = 0; tries < count * 60 && out.length < count; tries++) {
        const x = 30 + r() * (width - 60);
        const y = top + r() * BAND;
        if ([...near, ...out].some((p) => Math.hypot(p.x - x, p.y - y) < minDist)) continue;
        const close = new Set([...near, ...out].filter((p) => Math.hypot(p.x - x, p.y - y) < minDist * 2.2).map((p) => p.kind));
        const kinds = Array.from({ length: KINDS }, (_, k) => k).filter((k) => !close.has(k));
        const pool = (kinds.length ? kinds : Array.from({ length: KINDS }, (_, k) => k)).sort((a, b) => want[b] - want[a] || r() - 0.5);
        const kind = pool[0];
        want[kind] -= 1;
        out.push({ x, y, kind, variant: r() < 0.5 ? "a" : "b", size: base * (0.85 + r() * 0.5) });
    }
    return out;
}

export default function ToyWallpaper() {
    const [box, setBox] = useState<{ width: number; height: number } | null>(null);
    const frame = useRef(0);

    useEffect(() => {
        const measure = () => {
            cancelAnimationFrame(frame.current);
            frame.current = requestAnimationFrame(() => {
                const width = document.documentElement.clientWidth;
                // 본문(body) 높이 기준 — 벽지 자신이 페이지를 늘리지 않게(문서 전체 scrollHeight 를 쓰면 벽지 높이만큼 계속 늘어남)
                const height = Math.ceil(Math.max(document.body.getBoundingClientRect().height, window.innerHeight));
                setBox((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
            });
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(document.body);
        window.addEventListener("resize", measure);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", measure);
            cancelAnimationFrame(frame.current);
        };
    }, []);

    if (!box) return null;
    const stickers: Sticker[] = [];
    for (let i = 0; i * BAND < box.height; i++) stickers.push(...layoutBand(i, box.width, stickers));

    return (
        // 위치 · 크기 규칙은 부품에 직접 — CSS 가 늦게 적용돼도 벽지가 본문 흐름에 끼어 페이지를 늘리지 않게(높이를 다시 재는 반복 방지)
        <div className="toy-wallpaper" aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, zIndex: -1, width: "100%", height: box.height, overflow: "hidden", pointerEvents: "none" }}>
            {stickers.map((s, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- 작은 꾸밈 그림(정적 내보내기라 next/image 최적화 없음)
                <img
                    key={i}
                    src={`/images/ui/toys/toy-${s.kind + 1}${s.variant}.webp`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    style={{ position: "absolute", objectFit: "contain", left: s.x - s.size / 2, top: s.y - s.size / 2, width: s.size, height: s.size }}
                />
            ))}
        </div>
    );
}
