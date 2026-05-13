/**
 * robots.ts — 크롤러 정책
 * ---------------------------------------------------------------------
 * 회원 전용 마이페이지는 인덱싱 금지.
 */
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://daengdabang.vercel.app";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/mypage", "/mypage/", "/api/"],
            },
        ],
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
