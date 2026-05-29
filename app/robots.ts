/**
 * robots.ts — 크롤러 정책
 * ---------------------------------------------------------------------
 * 회원 전용 마이페이지는 인덱싱 금지.
 *
 * 정적 export 모드: force-static 명시 필요.
 */
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.daengdabang.com";

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
