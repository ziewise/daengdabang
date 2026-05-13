/**
 * Home (`/`) — 인트로 페이지
 * ---------------------------------------------------------------------
 * 풀스크린 영상 스플래시만 노출.
 * 영상 종료 또는 클릭 → /main 으로 이동.
 *
 * 헤더/푸터/펫렌즈 FAB 는 (shop) 그룹 layout 에서 마운트되므로
 * 이 페이지에선 자동으로 미노출.
 */
"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./intro.module.css";

export default function IntroPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);

    /** 메인 페이지로 이동 (영상 종료 또는 사용자 클릭) */
    const goToMain = () => {
        videoRef.current?.pause();
        router.push("/main");
    };

    // 영상 자동 재생 + 끝나면 자동 이동
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const playPromise = v.play();
        // 모바일 autoplay 차단되어도 무시 (사용자가 클릭으로 진입 가능)
        if (playPromise !== undefined) playPromise.catch(() => {});
        const onEnded = () => goToMain();
        v.addEventListener("ended", onEnded);
        return () => v.removeEventListener("ended", onEnded);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            {/* 좌상단 시그니처 로고 (영상 위에 오버레이) */}
            <div className={styles.signatureLogo}>
                <div className={styles.logoWrapper}>
                    <Image
                        src="/images/logo.png"
                        alt="댕다방"
                        width={60}
                        height={60}
                        priority
                    />
                </div>
                <div className={`${styles.crayonText} font-display`}>
                    <span>댕</span><span>다</span><span>방</span>
                </div>
            </div>

            {/* 영상 풀스크린 — 클릭 또는 종료 시 /main */}
            <div
                className={styles.splash}
                onClick={goToMain}
                role="button"
                tabIndex={0}
                aria-label="메인으로 이동"
            >
                <video
                    ref={videoRef}
                    src="/videos/intro.mp4"
                    autoPlay
                    muted
                    playsInline
                />
                <div className={styles.skipText}>
                    화면을 클릭하면 메인으로 이동합니다{" "}
                    <i className="fa-solid fa-angles-right ml-1" />
                </div>
            </div>
        </>
    );
}
