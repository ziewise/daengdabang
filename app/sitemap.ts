/**
 * sitemap.ts — 검색엔진용 sitemap.xml 자동 생성
 * ---------------------------------------------------------------------
 * 빌드 시 /sitemap.xml 라우트로 노출.
 * /mypage/* 는 회원 전용이라 공개 sitemap 에서 제외.
 *
 * 정적 export 모드: force-static 명시 필요.
 *   동적 함수(쿠키·헤더 등) 사용 안 함을 Next.js 에 알려 빌드 시점에 한 번만 산출.
 */
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.daengdabang.com";

/** 카탈로그/카테고리/기획전/브랜드 페이지도 sitemap 에 포함하려면 lib/catalog 에서 list 해서 추가 가능 */
export default function sitemap(): MetadataRoute.Sitemap {
    // 정적 export 에선 build time stamp 가 매번 동일해야 (resume 등 캐시 일관성)
    // → ISO 고정 문자열을 그대로 lastModified 로 사용
    const buildTime = "2026-05-17T00:00:00.000Z";
    return [
        { url: `${BASE_URL}/`,                lastModified: buildTime, changeFrequency: "monthly", priority: 1.0 },
        { url: `${BASE_URL}/main`,            lastModified: buildTime, changeFrequency: "weekly",  priority: 0.9 },
        { url: `${BASE_URL}/best`,            lastModified: buildTime, changeFrequency: "weekly",  priority: 0.9 },
        { url: `${BASE_URL}/new`,             lastModified: buildTime, changeFrequency: "weekly",  priority: 0.9 },
        { url: `${BASE_URL}/products`,        lastModified: buildTime, changeFrequency: "weekly",  priority: 0.85 },
        { url: `${BASE_URL}/brands`,          lastModified: buildTime, changeFrequency: "monthly", priority: 0.7 },
        { url: `${BASE_URL}/petlens`,         lastModified: buildTime, changeFrequency: "monthly", priority: 0.8 },
        { url: `${BASE_URL}/login`,           lastModified: buildTime, changeFrequency: "yearly",  priority: 0.3 },
        { url: `${BASE_URL}/signup`,          lastModified: buildTime, changeFrequency: "yearly",  priority: 0.3 },
        { url: `${BASE_URL}/forgot-password`, lastModified: buildTime, changeFrequency: "yearly",  priority: 0.2 },
    ];
}
