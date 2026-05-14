import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /**
     * Next.js 16 은 기본적으로 localhost 외 origin 의 dev 서버 요청을 차단.
     * 모바일 실기기에서 LAN IP (예: http://192.168.x.x:3000) 로 접속하면
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
