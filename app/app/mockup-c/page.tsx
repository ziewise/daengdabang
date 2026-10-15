/**
 * /app/mockup-c — 앱 홈 시안 C "a + 카드 그림" (로컬 확인용 임시 페이지, 배포 X)
 * ---------------------------------------------------------------------
 * a 시안의 깔끔한 틀에, 직접 만든 카드 그림 3장을 넣고 인사·메뉴도 그 그림체에 맞춘 버전.
 * 글씨: 카페24 써라운드(큰 글씨) · 써라운드 에어(작은 글씨) — 폰트 선언은 ClassicHome 의 CSS(.ah-display · .ah-light).
 */
import ClassicHome from "@/components/pwa/mockup/ClassicHome";

export default function MockupC() {
    return (
        // break-keep: 한글을 단어 단위로 줄바꿈 · isolate: 전용 배경(-z-10)이 이 영역 안에만 깔리게
        <div className="ah-display relative isolate flex-1 overflow-x-hidden break-keep px-4 pb-16 pt-4">
            <div className="mx-auto w-full max-w-md">
                <ClassicHome titleFont="ah-display" />
            </div>
        </div>
    );
}
