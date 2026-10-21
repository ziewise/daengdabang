/**
 * /app/sticker/item/?p={상품 주소} — 앱 안 상품 상세 틀(2026-10-21 사용자 결정)
 * ---------------------------------------------------------------------
 * 안드로이드 · 아이폰 앱(APK)은 /app 화면만 앱 안 파일이라, 상품 상세(/product/…, 475개 · 101MB)를 누르면
 * 협업자 NativeAppBridge 가 크롬 브라우저 창으로 운영 사이트를 열었다 → 느리고, 브라우저 창은 저장 공간이 달라
 * 로그인 · 장바구니 · 찜이 앱과 따로 놀았다. 이 화면 한 장이 앱 안에 들어가(/app 은 이미 앱 묶음) 누른 상품을
 * 협업자 상품 상세 부품(ProductDetailClient) 그대로 그린다 — 옵션 · 장바구니 · 찜 · 후기 · 영상 · 입혀보기 동작 그대로.
 * 상품 사진 · 영상 · 상세 이미지는 운영 사이트 주소에서 받는다(앱 묶음에 없는 파일 — AppShell 의 앱 사진 주소 처리).
 */
import { Suspense } from "react";
import AppProductDetail from "@/components/app-shell/AppProductDetail";

export default function AppItemPage() {
    // ?p= 를 읽는 부분은 브라우저에서만 — 미리 만든 HTML 에는 빈 틀(useSearchParams 는 Suspense 안에서)
    return (
        <Suspense fallback={null}>
            <AppProductDetail />
        </Suspense>
    );
}
