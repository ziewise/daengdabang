import EmptyPane from "@/components/mypage/EmptyPane";
import { PaneHead } from "../page";

export default function MypageAddressPage() {
    return (
        <>
            <PaneHead title="배송지 관리" sub="기본 배송지 + 자주 사용하는 주소" />
            <EmptyPane
                icon="fa-location-dot"
                title="등록된 배송지가 없어요"
                desc="주문 시 사용할 기본 배송지를 등록해보세요."
                actionLabel="배송지 추가하기"
                actionHref="#add-address"
            />
        </>
    );
}
