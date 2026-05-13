import EmptyPane from "@/components/mypage/EmptyPane";
import { PaneHead } from "../page";

export default function MypageReviewsPage() {
    return (
        <>
            <PaneHead title="내 리뷰" sub="작성한 리뷰 / 작성 가능한 리뷰" />
            <EmptyPane
                icon="fa-star"
                title="아직 작성한 리뷰가 없어요"
                desc="구매한 상품에 리뷰를 남겨 다른 보호자에게 도움을 줄 수 있어요."
                actionLabel="주문 내역 보기"
                actionHref="/mypage/orders"
            />
        </>
    );
}
