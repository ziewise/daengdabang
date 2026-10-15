/**
 * /app/sticker/show — 스티커북 시안 · 댕다방(댕자랑 · 굿즈 공모전) (로컬 확인용 임시 페이지, 배포 X)
 */
import { Suspense } from "react";
import StickerShow from "@/components/pwa/home-concepts/pages/StickerShow";

export default function StickerShowPage() {
    // 화면 안 탭이 주소(?tab=)를 읽으므로 Suspense 로 감싼다
    return (
        <Suspense fallback={null}>
            <StickerShow />
        </Suspense>
    );
}
