import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "/app/",
        name: "댕다방 – 매일 댕생활",
        short_name: "댕다방",
        description: "매일 댕생활, 댕자랑, 댕다방 연구소를 홈 화면에서 바로 만나는 반려견 생활 앱",
        start_url: "/app/?source=pwa",
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
