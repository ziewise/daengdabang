import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /**
     * 정적 export 모드 — `next build` 가 out/ 폴더에 HTML/CSS/JS 산출.
     * Cloudflare Pages 가 out/ 을 그대로 정적 호스팅.
     *
     * 향후 백엔드(API Routes / Server Actions / SSR)를 도입하려면:
     *   1) 이 줄 제거
     *   2) @opennextjs/cloudflare 어댑터 설치
     *   3) wrangler.toml + open-next.config.ts 추가
     *
     * 현재 상태(정적)에서 작동하지 않는 기능:
     * - Route Handlers (app/api/*) / Server Actions / Middleware
     * - 동적 라우트는 generateStaticParams() 로 빌드 시점 사전 생성만 가능
     * - next/image 자동 최적화 OFF
     */
    output: "export",

    /** next/image 자동 리사이즈/포맷 변환 OFF (정적 export 모드 필수) */
    images: { unoptimized: true },

    /** URL 끝에 슬래시 (예: /products/) — 정적 호스팅 라우팅 안정성 ↑ */
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
