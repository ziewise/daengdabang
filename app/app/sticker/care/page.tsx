/**
 * /app/sticker/care — 스티커북 시안 · 동네 돌봄 찾기 전용 화면 (로컬 확인용 임시 페이지, 배포 X)
 */
import { Suspense } from "react";
import StickerCare from "@/components/pwa/home-concepts/pages/StickerCare";

export default function StickerCarePage() {
    // 분류를 주소(?cat=)로 읽으므로 Suspense 로 감싼다
    return (
        <Suspense fallback={null}>
            <StickerCare />
        </Suspense>
    );
}
