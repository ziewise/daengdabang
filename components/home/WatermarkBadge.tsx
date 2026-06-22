/**
 * WatermarkBadge — 히어로 영상의 워터마크(✦)를 "항상" 덮는 견종 얼굴 영상 배지
 * ---------------------------------------------------------------------
 * 배경:
 *   히어로 영상은 object-cover 로 컨테이너를 채우므로, 브라우저 크기/비율에
 *   따라 영상이 확대·축소·크롭된다. 그래서 영상 안에 박힌 워터마크(✦)의
 *   "화면상 위치·크기"가 창 크기마다 달라진다.
 *
 * 해결:
 *   워터마크의 "영상 내 좌표"(xRatio, yRatio)는 고정이므로,
 *   현재 컨테이너 크기 + 영상 비율(videoAspect)로 object-cover 변환을 직접
 *   계산해 워터마크의 "지금 화면 위치/크기"를 구하고, 그 자리에 배지를 둔다.
 *   ResizeObserver / resize 로 창 크기가 바뀔 때마다 다시 계산하므로,
 *   영상이 어떻게 잘리고 확대되든 배지가 항상 워터마크에 딱 붙는다.
 *
 * 비고:
 *   - 배지 영상(견종 얼굴)은 16:9 → 원형 마스크로 "가운데"만 보이고,
 *     배지 영상 자체의 양옆 워터마크는 원형 밖으로 잘려 사라진다.
 *   - 좌표/크기는 영상 렌더 폭(renderW) 기준 비율이라 항상 영상과 같은 배율로 커진다.
 */
"use client";

import { useEffect, useRef, useState } from "react";

interface WatermarkBadgeProps {
    /** 배지에 재생할 영상(견종 얼굴) 경로 */
    src: string;
    /** 워터마크의 영상 내 가로 위치 (0~1) */
    xRatio: number;
    /** 워터마크의 영상 내 세로 위치 (0~1) */
    yRatio: number;
    /** 배지 지름 (영상 렌더 폭 대비 비율, 0~1) — 워터마크를 덮을 만큼 약간 크게 */
    sizeRatio: number;
    /** 현재 영상 비율(가로/세로). PC 16:9 → 16/9, 모바일 9:16 → 9/16 */
    videoAspect: number;
}

export default function WatermarkBadge({
    src,
    xRatio,
    yRatio,
    sizeRatio,
    videoAspect,
}: WatermarkBadgeProps) {
    // 영상 컨테이너 전체를 덮는 좌표 기준 래퍼 ref — 이 크기가 곧 영상 컨테이너 크기
    const wrapRef = useRef<HTMLDivElement>(null);
    // 계산된 배지 화면 좌표/크기(px). 중심점 기준(left/top = 워터마크 중심)
    const [box, setBox] = useState<{ left: number; top: number; size: number } | null>(null);

    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;

        // object-cover 변환을 계산해 워터마크의 현재 화면 위치/크기 → 배지 box 도출
        const compute = () => {
            const W = wrap.clientWidth;
            const H = wrap.clientHeight;
            if (!W || !H) return;

            const containerAspect = W / H;
            let renderW: number;
            let renderH: number;
            let offsetX: number;
            let offsetY: number;

            if (containerAspect > videoAspect) {
                // 컨테이너가 영상보다 가로로 넓음 → 가로를 꽉 채우고 위아래가 잘림
                renderW = W;
                renderH = W / videoAspect;
                offsetX = 0;
                offsetY = (H - renderH) / 2;
            } else {
                // 컨테이너가 영상보다 세로로 김 → 세로를 꽉 채우고 좌우가 잘림
                renderH = H;
                renderW = H * videoAspect;
                offsetX = (W - renderW) / 2;
                offsetY = 0;
            }

            setBox({
                left: offsetX + xRatio * renderW, // 워터마크 화면 X (배지 중심)
                top: offsetY + yRatio * renderH, // 워터마크 화면 Y (배지 중심)
                size: sizeRatio * renderW, // 배지 지름(영상 배율에 비례)
            });
        };

        compute();

        // 컨테이너 크기 변화(창 리사이즈/회전 등)마다 재계산
        const ro = new ResizeObserver(compute);
        ro.observe(wrap);
        window.addEventListener("resize", compute);

        return () => {
            ro.disconnect();
            window.removeEventListener("resize", compute);
        };
    }, [xRatio, yRatio, sizeRatio, videoAspect]);

    return (
        // 영상 컨테이너 전체를 덮는 좌표 기준 래퍼(클릭 통과)
        <div ref={wrapRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5]">
            {box && (
                // 원형 배지 — 중심을 워터마크 좌표에 맞춤(translate -50%)
                <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-white/75 shadow-[0_8px_22px_rgba(0,0,0,0.32)]"
                    style={{
                        left: `${box.left}px`,
                        top: `${box.top}px`,
                        width: `${box.size}px`,
                        height: `${box.size}px`,
                    }}
                >
                    {/* 견종 얼굴 영상 — 16:9 가운데만 원형으로(양옆 잘림), 자동재생 루프 */}
                    <video
                        src={src}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="h-full w-full object-cover"
                    />
                </div>
            )}
        </div>
    );
}
