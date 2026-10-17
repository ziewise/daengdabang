/**
 * /app/skin.css — 앱 스티커북 겉모양 CSS(components/app-shell/appShopSkin.ts)를 정적 파일 하나로 (2026-10-18)
 * ---------------------------------------------------------------------
 * 앱 전용 화면을 미리 만든 HTML 부터 앱 틀로 그리게 되면서(ConditionalChrome), 앱 틀 안에 넣던 큰 CSS(약 36만 자)가
 * 화면 파일마다 복사돼 APK 묶음이 40MB 한도에 닿았다. 그래서 같은 CSS 를 이 파일 하나로 내보내고 AppShell 은 링크만 건다.
 *  - 내용의 원본은 그대로 appShopSkin.ts(여기서 그대로 내보냄 — 두 벌 관리 X)
 *  - 정적 내보내기(next build)에서 out/app/skin.css 로 만들어짐 — /app 폴더라 네이티브 앱 묶음에도 들어감
 *  - 모든 규칙이 html.ddb-app-mode 아래라 웹 화면에는 적용되지 않음
 */

import { APP_SHOP_SKIN_CSS } from "@/components/app-shell/appShopSkin";

export const dynamic = "force-static";

export function GET() {
    return new Response(APP_SHOP_SKIN_CSS, {
        headers: { "Content-Type": "text/css; charset=utf-8" },
    });
}
