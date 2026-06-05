/**
 * GET /api/health — 헬스 체크 (하이브리드 모드 검증용)
 * ---------------------------------------------------------------------
 * 이 파일이 존재한다 = 백엔드 API 추가 가능 상태.
 * 향후 다른 API 라우트 (예: /api/contact, /api/reviews) 도 같은 패턴으로 추가:
 *
 *   app/api/{name}/route.ts:
 *     export async function GET(req: Request) { ... }
 *     export async function POST(req: Request) { ... }
 *
 * Next.js 16 Route Handlers + Cloudflare Workers 위에서 실행됨.
 * env 바인딩(KV/D1/R2)은 향후 wrangler.jsonc 에 추가 후 `getCloudflareContext()` 로 접근.
 *
 * 정적 페이지(333 상품, 카테고리 등)와 공존 — 그 페이지들은 빌드 시점 사전 렌더링,
 * 이 라우트만 매 요청마다 Workers 에서 실행.
 */

export const dynamic = "force-dynamic";

export async function GET() {
    return Response.json({
        ok: true,
        service: "daengdabang",
        runtime: "cloudflare-workers",
        timestamp: new Date().toISOString(),
    });
}
