/**
 * sitemap.ts — 검색엔진용 sitemap.xml 자동 생성
 * ---------------------------------------------------------------------
 * 빌드 시 /sitemap.xml 라우트로 노출.
 * /mypage/* 는 회원 전용이라 공개 sitemap 에서 제외.
 */
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://daengdabang.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    return [
        { url: `${BASE_URL}/`,                lastModified: now, changeFrequency: "monthly", priority: 1.0 },
        { url: `${BASE_URL}/main`,            lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
        { url: `${BASE_URL}/petlens`,         lastModified: now, changeFrequency: "monthly", priority: 0.8 },
        { url: `${BASE_URL}/login`,           lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
        { url: `${BASE_URL}/signup`,          lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
        { url: `${BASE_URL}/forgot-password`, lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    ];
}
