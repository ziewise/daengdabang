/**
 * /app/sticker/daily — 스티커북 시안 · 매일 댕생활 (로컬 확인용 임시 페이지, 배포 X)
 */
import { Suspense } from "react";
import StickerDaily from "@/components/pwa/home-concepts/pages/StickerDaily";

export default function StickerDailyPage() {
    // 화면 안 탭이 주소(?tab=)를 읽으므로 Suspense 로 감싼다
    return (
        <Suspense fallback={null}>
            <StickerDaily />
        </Suspense>
    );
}
