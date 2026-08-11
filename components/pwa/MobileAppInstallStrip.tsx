"use client";

import { usePwaInstall } from "./PwaInstallProvider";

export default function MobileAppInstallStrip() {
    const { canPrompt, isReady, isStandalone, platform, requestInstall } = usePwaInstall();
    if (!isReady || isStandalone) return null;

    const action = canPrompt
        ? "앱으로 설치"
        : platform === "ios"
            ? "홈 화면에 추가"
            : "설치 방법 보기";

    return (
        <section className="px-4 pt-4 md:hidden" aria-label="댕다방 앱 설치">
            <div className="ddb-crayon-paper mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border p-3">
                <span className="ddb-crayon-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl" data-crayon-tone="teal">
                    <i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <strong className="block text-sm text-slate-900">댕다방을 앱처럼 바로 열기</strong>
                    <span className="block truncate text-xs text-slate-500">매일 댕생활 · 댕자랑 · 연구소</span>
                </div>
                <button
                    type="button"
                    onClick={() => void requestInstall()}
                    className="ddb-crayon-link min-h-10 shrink-0 rounded-xl px-3 text-sm"
                >
                    {action}
                </button>
            </div>
        </section>
    );
}
