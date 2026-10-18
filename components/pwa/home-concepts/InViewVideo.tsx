"use client";

/**
 * InViewVideo — 화면에 보일 때만 재생하고 화면 밖이면 멈추는 영상 (2026-10-18 앱 속도 · 사용자 결정)
 * ---------------------------------------------------------------------
 * 예전에는 앱 화면 영상(쇼핑 상단 영상 · 견종 배지 · 프로모 칸 · 굿즈 영상)이 화면 밖에서도 계속 돌아,
 * 폰이 영상 여러 개를 동시에 풀어 그리느라 버튼 반응 · 스크롤이 무거웠다.
 *  - 15% 이상 보이면 재생, 아니면 멈춤 · 다른 앱으로 나가 화면이 숨겨지면 멈춤(돌아오면 보이는 것만 다시 재생)
 *  - 미리 받기는 "metadata"(첫 장면 정보만) — 화면에 나오기 전 영상 전체를 받지 않음(preload="auto" 였던 것도)
 *  - 소리 없는(muted) 영상이라 코드로 재생해도 브라우저가 막지 않음. 모양 · 크기 · 반복은 받은 그대로
 */
import { useEffect, useRef, type VideoHTMLAttributes } from "react";

export default function InViewVideo({ preload, autoPlay: _autoPlay, ...props }: VideoHTMLAttributes<HTMLVideoElement>) {
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;
        let inView = false;
        const sync = () => {
            if (inView && document.visibilityState === "visible") {
                // 재생 실패(데이터 절약 모드 등)는 조용히 무시 — 첫 장면(포스터)이 그대로 보임
                void video.play().catch(() => undefined);
            } else {
                video.pause();
            }
        };
        const observer = new IntersectionObserver(([entry]) => {
            inView = Boolean(entry?.isIntersecting);
            sync();
        }, { threshold: 0.15 });
        observer.observe(video);
        document.addEventListener("visibilitychange", sync);
        return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", sync);
            video.pause();
        };
    }, [props.src]);

    return <video ref={ref} preload={preload === "auto" ? "metadata" : preload ?? "metadata"} {...props} />;
}
