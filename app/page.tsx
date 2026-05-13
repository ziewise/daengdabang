/**
 * Home (`/`) — 인트로 페이지
 * ---------------------------------------------------------------------
 * 사용자 첫 진입점. 풀스크린 영상 스플래시 → 클릭/종료 시 글래스 인트로 노출.
 * "쇼핑 시작하기" 또는 SKIP 클릭 → /main 으로 이동.
 *
 * 헤더/푸터/펫렌즈 FAB 는 (shop) 그룹 layout 에서 마운트되므로
 * 이 페이지에선 자동으로 미노출 (root layout 만 적용됨).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import styles from "./intro.module.css";

export default function IntroPage() {
    const [splashHidden, setSplashHidden] = useState(false);
    const [introActive, setIntroActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const introRef = useRef<HTMLDivElement>(null);

    /** 영상 스플래시 종료 → 1초 페이드 후 인트로 섹션 활성화 */
    const skipVideo = () => {
        setSplashHidden(true);
        videoRef.current?.pause();
        // splash 페이드아웃(1s) 후 인트로 노출
        setTimeout(() => setIntroActive(true), 1000);
    };

    // 영상 자동 재생 + 끝나면 자동 skip
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const playPromise = v.play();
        // 모바일 등에서 autoplay 차단되어도 무시 (사용자가 클릭으로 skip 가능)
        if (playPromise !== undefined) playPromise.catch(() => {});
        const onEnded = () => skipVideo();
        v.addEventListener("ended", onEnded);
        return () => v.removeEventListener("ended", onEnded);
    }, []);

    // 인트로 활성화 시 GSAP 등장 (텍스트 + 글래스 박스 stagger)
    useEffect(() => {
        if (!introActive || !introRef.current) return;
        const ctx = gsap.context(() => {
            gsap.from("[data-intro-eyebrow]", {
                opacity: 0, y: -10, duration: 0.5, ease: "power2.out",
            });
            gsap.from("[data-intro-title]", {
                opacity: 0, y: 16, duration: 0.7, delay: 0.1, ease: "power2.out",
            });
            gsap.from("[data-intro-desc]", {
                opacity: 0, y: 12, duration: 0.6, delay: 0.3, ease: "power2.out",
            });
            gsap.from("[data-intro-card]", {
                opacity: 0, y: 24, scale: 0.95,
                duration: 0.55, stagger: 0.1, delay: 0.45,
                ease: "power3.out",
            });
            gsap.from("[data-intro-cta]", {
                opacity: 0, y: 12, duration: 0.5, delay: 0.8, ease: "power2.out",
            });
        }, introRef);
        return () => ctx.revert();
    }, [introActive]);

    return (
        <>
            {/* 좌상단 시그니처 로고 */}
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

            {/* 비디오 스플래시 */}
            <div
                className={`${styles.splash} ${splashHidden ? styles.splashHidden : ""}`}
                onClick={skipVideo}
                role="button"
                tabIndex={0}
                aria-label="영상 건너뛰기"
            >
                <video
                    ref={videoRef}
                    src="/videos/intro.mp4"
                    autoPlay
                    muted
                    playsInline
                />
                <div className={`${styles.videoBar} ${styles.left}`} />
                <div className={`${styles.videoBar} ${styles.right}`} />
                <div className={styles.skipText}>
                    화면을 클릭하면 건너뜁니다{" "}
                    <i className="fa-solid fa-angles-right ml-1" />
                </div>
            </div>

            {/* 메인 인트로 섹션 */}
            <section
                ref={introRef}
                className={`${styles.intro} ${introActive ? styles.active : ""}`}
            >
                <div className={styles.auroraBg}>
                    <div className={styles.blob1} />
                    <div className={styles.blob2} />
                </div>

                <div className="max-w-6xl w-full text-center z-10 pt-16">
                    <p
                        data-intro-eyebrow
                        className="text-xs md:text-sm font-bold tracking-[0.3em] text-aurora-indigo mb-5"
                    >
                        WELCOME TO DAENGDABANG
                    </p>
                    <h2
                        data-intro-title
                        className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight"
                    >
                        우리 댕댕이를 위한
                        <br />
                        <span className="text-aurora-indigo">특별한 발견</span>
                    </h2>
                    <p
                        data-intro-desc
                        className="text-base md:text-lg text-neutral-600 mb-12 max-w-2xl mx-auto leading-relaxed"
                    >
                        사료부터 장난감, 의류까지 — 큐레이티드 컬렉션으로
                        <br className="hidden md:inline" />
                        매일이 더 즐거운 댕댕이의 라이프스타일을 완성하세요.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
                        <IntroCard
                            icon="fa-bone"
                            iconBg="bg-white"
                            iconColor="text-neutral-600"
                            title="사료 & 간식"
                            desc="엄선된 프리미엄 푸드"
                        />
                        <IntroCard
                            icon="fa-baseball"
                            iconBg="bg-aurora-indigo"
                            iconColor="text-white"
                            title="장난감 & 용품"
                            desc="매일이 즐거운 놀이 아이템"
                        />
                        <IntroCard
                            icon="fa-shirt"
                            iconBg="bg-white"
                            iconColor="text-aurora-pink"
                            title="의류 & 액세서리"
                            desc="사랑스러운 패션 큐레이션"
                        />
                    </div>

                    <div data-intro-cta className="flex flex-col items-center gap-3">
                        <Link
                            href="/main"
                            className="inline-block px-12 py-4 rounded-full bg-foreground hover:bg-neutral-800 text-white font-bold text-base transition shadow-card hover:shadow-hover"
                        >
                            쇼핑 시작하기
                        </Link>
                        <Link href="/main" className={styles.cyberSkip}>
                            <span>SKIP TO STORE</span>
                            <span className={styles.cyberArrow}>
                                <i className="fa-solid fa-angle-right" />
                            </span>
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}

function IntroCard({
    icon, iconBg, iconColor, title, desc,
}: {
    icon: string;
    iconBg: string;
    iconColor: string;
    title: string;
    desc: string;
}) {
    return (
        <div data-intro-card className={`${styles.glassBox} p-8 md:p-10`}>
            <div
                className={`w-14 h-14 md:w-16 md:h-16 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-4 shadow-card`}
            >
                <i className={`fa-solid ${icon} text-xl md:text-2xl ${iconColor}`} />
            </div>
            <h3 className="font-extrabold text-base md:text-lg mb-1">{title}</h3>
            <p className="text-xs md:text-sm text-neutral-500">{desc}</p>
        </div>
    );
}
