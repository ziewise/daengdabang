import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /**
     * 정적 export 모드 — `next build` 가 out/ 폴더에 HTML/CSS/JS 산출.
     * GitHub Pages, Cloudflare Pages 등 정적 호스팅에 그대로 업로드 가능.
     *
     * 변경 시 영향:
     * - Server Components: 빌드 시점에 한 번 렌더링 (SSG 처럼 동작)
     * - Route Handlers / Server Actions / Middleware: 사용 불가
     * - 동적 라우트([slug] 등): generateStaticParams() 필수
     * - next/image: 자동 최적화 OFF (images.unoptimized 또는 custom loader)
     */
    output: "export",

    /** next/image 자동 리사이즈/포맷 변환 OFF (정적 export 모드 필수) */
    images: { unoptimized: true },

    /** URL 끝에 슬래시 (예: /products/) — GitHub Pages 호환성 ↑ */
    trailingSlash: true,

    /**
     * Next.js 16 은 기본적으로 localhost 외 origin 의 dev 서버 요청을 차단.
     * 모바일 실기기에서 LAN IP (예: http://192.168.x.x:4000) 로 접속하면
     * JS 청크/HMR 가 차단되어 hydration 실패 → 클릭이 전혀 안 먹힘.
     *
     * Next.js 의 패턴 매칭은 DNS 라벨 단위(. 구분). 각 옥텟에 `*` 한 개씩 매칭.
     * dev 환경 한정이므로 사설망 대역(RFC 1918)을 폭넓게 허용.
     */
    allowedDevOrigins: [
        "192.168.*.*",
        "10.*.*.*",
        "172.*.*.*",
        "*.local",
    ],
};

export default nextConfig;
