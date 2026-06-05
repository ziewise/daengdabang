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

    // 영상 자동 재생 + 끝나면 자동으로 메인 이동
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const playPromise = v.play();
        if (playPromise !== undefined) playPromise.catch(() => {});
        const onEnded = () => router.push("/main");
        v.addEventListener("ended", onEnded);
        return () => v.removeEventListener("ended", onEnded);
    }, [router]);

    const goToMain = () => {
        videoRef.current?.pause();
        router.push("/main");
    };

    return (
        <>
            {/* 좌상단 시그니처 로고 — 둥근 아이콘 + 크레파스 워드마크 이미지 */}
            <div className={styles.signatureLogo}>
                <div className={styles.logoWrapper}>
                    <Image
                        src="/images/logo.png"
                        alt=""
                        width={60}
                        height={60}
                        priority
                    />
                </div>
                <div className={styles.wordmarkWrapper} aria-label="댕다방">
                    <Image
                        src="/images/wordmark.png"
                        alt=""
                        width={300}
                        height={118}
                        priority
                    />
                </div>
            </div>

            {/* 영상 풀스크린 — 순수 <a> 태그로 감싸 hydration 실패 시에도 네이티브 네비게이션 작동
                onClick: 비디오 일시정지 + 클라이언트 라우팅 (성공 시), 실패해도 href 가 폴백 */}
            <a
                href="/main"
                className={styles.splash}
                onClick={(e) => {
                    e.preventDefault();
                    goToMain();
                }}
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
            </a>
        </>
    );
}
