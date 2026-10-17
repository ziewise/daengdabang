import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "/app/",
        name: "댕다방 – 매일 댕생활",
        short_name: "댕다방",
        description: "매일 댕생활, 댕자랑, 댕다방 연구소를 홈 화면에서 바로 만나는 반려견 생활 앱",
        // 2026-10-18: 홈 화면 앱은 앱 홈(/app/home-1/)에서 바로 시작 — /app/ 은 브라우저 설치 안내 페이지라 거쳐 가면 깜빡임.
        // 앱 구분용 id 는 그대로("/app/") 두어 이미 설치한 앱과 같은 앱으로 인식. 예전 설치(/app/ 시작)는 앱 틀이 앱 홈으로 보냄.
        start_url: "/app/home-1/?source=pwa&shell=4",
        scope: "/",
        display: "standalone",
        background_color: "#fffaf0",
        theme_color: "#07849e",
        lang: "ko-KR",
        categories: ["lifestyle", "shopping", "health"],
        prefer_related_applications: false,
        icons: [
            {
                src: "/images/pwa/icon-v2-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/images/pwa/icon-v2-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/images/pwa/icon-maskable-v2-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
        shortcuts: [
            {
                name: "매일 댕생활",
                short_name: "매일 댕생활",
                description: "오늘의 출근도장과 돌봄 루틴",
                url: "/treasure-mine/?source=pwa-shortcut",
                icons: [{ src: "/images/pwa/icon-v2-192x192.png", sizes: "192x192" }],
            },
            {
                name: "댕자랑",
                short_name: "댕자랑",
                description: "우리 아이의 순간을 함께 나누는 공간",
                url: "/daeng-showcase/?source=pwa-shortcut",
                icons: [{ src: "/images/pwa/icon-v2-192x192.png", sizes: "192x192" }],
            },
            {
                name: "댕다방 연구소",
                short_name: "댕다방 연구소",
                description: "사진과 생활 기록으로 살펴보는 반려견 케어",
                url: "/pet-lens/?source=pwa-shortcut",
                icons: [{ src: "/images/pwa/icon-v2-192x192.png", sizes: "192x192" }],
            },
        ],
    };
}
