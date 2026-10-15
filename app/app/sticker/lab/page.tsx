/**
 * /app/sticker/lab — 스티커북 시안 · 연구소 (로컬 확인용 임시 페이지, 배포 X)
 */
import { Suspense } from "react";
import StickerLab from "@/components/pwa/home-concepts/pages/StickerLab";

export default function StickerLabPage() {
    // 화면 안 탭이 주소(?tab=)를 읽으므로 Suspense 로 감싼다
    return (
        <Suspense fallback={null}>
            <StickerLab />
        </Suspense>
    );
}
