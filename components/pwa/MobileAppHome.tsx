"use client";

/**
 * /app/ — 모바일 브라우저의 "댕다방 앱" 설치 안내 페이지(설치한 앱은 AppShell 이 앱 홈으로 보냄)
 * 2026-10-18 스티커북 모양으로 정리(UI만): 앱 소개 · 앱 화면 미리보기 · 설치 버튼 → 설치 순서 → 앱에서 좋은 점.
 * 2026-10-25 웹 크레파스 결로 다시(사용자 결정 — 브라우저에서 보는 페이지라 스티커북 요소 없이). 구성 · 설치 동작은 그대로.
 * 예전 "앱 홈" 시절의 로그인 안내 · AI 케어 요약 · 서비스 링크는 뺐다(사용자 결정 2026-10-18) —
 * 설치한 앱은 새 앱 홈(/app/home-1)이 그 역할을 하고, 웹 방문자는 메뉴 · 헤더 · 첫 화면에서 같은 곳으로 간다.
 * 설치 버튼은 기존 requestInstall 그대로. 부품은 components/pwa/install-guide.
 */

import { usePwaInstall } from "./PwaInstallProvider";
import { InstallWebPage } from "./install-guide/AppInstallWeb";

export default function MobileAppHome() {
    const { canPrompt, isInAppBrowser, isNativeApp, isReady, isStandalone, platform, requestInstall } = usePwaInstall();

    // 설치 버튼 — 안드로이드 크롬 등은 설치 창, 아이폰 · 그 밖은 설치 안내 창(requestInstall 그대로)
    const installLabel = canPrompt
        ? "바로 설치하기"
        : platform === "ios"
            ? "iPhone 설치 안내 크게 보기"
            : "설치 방법 크게 보기";

    // 설치 단추 · 설치 순서는 준비된 브라우저(앱 묶음 안이 아닐 때)에서만 — 예전 페이지와 같은 조건
    const showInstall = isReady && !isNativeApp;

    // 2026-10-25 사용자 결정: 브라우저 설치 안내는 웹 크레파스 결(components/pwa/install-guide/AppInstallWeb.tsx)
    return (
        <InstallWebPage
            showInstall={showInstall}
            isStandalone={isStandalone}
            isInAppBrowser={isInAppBrowser}
            platform={platform}
            installLabel={installLabel}
            onInstall={() => void requestInstall()}
        />
    );
}
