"use client";

/**
 * DailyLifeSwitch — 매일 댕생활(/treasure-mine) 을 앱에서는 새 앱 화면으로, 웹에서는 기존 화면으로 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 앱 판별은 앱 틀과 같은 useAppMode (네이티브 · 설치 앱 · /app/ 진입 후). 웹 화면(web)은 page.tsx 에서 그대로 넘겨받는다.
 */

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAppMode } from "@/components/app-shell/useAppMode";
import DailyLifeApp from "./DailyLifeApp";

export default function DailyLifeSwitch({ web }: { web: ReactNode }) {
    const pathname = usePathname();
    const appMode = useAppMode(pathname);
    return appMode ? <DailyLifeApp /> : <>{web}</>;
}
