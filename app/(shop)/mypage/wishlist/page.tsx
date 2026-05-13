import EmptyPane from "@/components/mypage/EmptyPane";
import { PaneHead } from "../page";

export default function MypageWishlistPage() {
    return (
        <>
            <PaneHead title="찜한 상품" sub="나중에 사고 싶은 아이템" />
            <EmptyPane
                icon="fa-heart"
                title="아직 찜한 상품이 없어요"
                desc="상품 카드의 ♡ 버튼을 눌러 찜해보세요."
                actionLabel="상품 둘러보기"
                actionHref="/main"
            />
        </>
    );
}
