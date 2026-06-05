import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /**
     * 하이브리드 모드 — @opennextjs/cloudflare 어댑터로 Cloudflare Workers 에 빌드.
     *
     * 빌드 명령:
     *   npm run build:cf   (= sync-images + next build --webpack + OpenNext 번들)
     *
     * 출력:
     *   .open-next/worker.js  — Workers 엔트리 (라우팅·SSR)
     *   .open-next/assets/    — 정적 자산
     *
     * 현재 동작 가능한 기능 (output:'export' 제거로 해금됨):
     * - Route Handlers (app/api/*) — 서버 함수
     * - Server Actions — 폼 처리
     * - Middleware — 라우트 가드/리다이렉트
     * - SSR / ISR / 부분 사전 렌더링 (PPR)
     * - next/image 동적 최적화 (단, IMAGES 바인딩 활성화 필요)
     *
     * 페이지별 렌더링 선택:
     * - 기본: 빌드 시점 정적 (SSG) — 333 상품, 카테고리, 브랜드, 기획전
     * - export const revalidate = N → ISR (N초마다 백그라운드 갱신)
     * - export const dynamic = 'force-dynamic' → 매 요청 SSR
     *
     * Note: Turbopack 으로 빌드 시 OpenNext 가 청크 로딩 실패하므로 webpack 모드 사용.
     */
    output: "standalone",

    /** next/image 자동 최적화 OFF — Cloudflare Images 바인딩 도입 시 false 로 변경 */
    images: { unoptimized: true },

    /** URL 끝에 슬래시 (예: /products/) — 라우팅 안정성 + SEO 일관성 */
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
