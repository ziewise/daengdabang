import type { Metadata } from "next";
import { BUSINESS_INFO, LEGAL_UPDATED_AT } from "@/lib/legal";

export const metadata: Metadata = {
    title: "이용약관 | 댕다방",
    description: "댕다방 회원 및 쇼핑 서비스 이용약관",
};

const sections = [
    {
        title: "제1조 목적",
        body: "이 약관은 댕다방이 운영하는 온라인 쇼핑몰에서 제공하는 상품 판매, 회원, PetLens, 챗봇 및 개인화 추천 서비스의 이용 조건과 절차, 권리와 의무를 정합니다.",
    },
    {
        title: "제2조 회원가입과 계정",
        body: "회원은 가입 양식에 필요한 정보를 입력하고 이용약관 및 개인정보 처리에 관한 필수 고지에 동의한 뒤 가입을 신청합니다. 네이버, 카카오, 구글 등 간편가입을 이용하는 경우 해당 제공자의 인증 결과와 댕다방 계정이 연결될 수 있습니다.",
    },
    {
        title: "제3조 상품 정보와 주문",
        body: "상품 가격, 구성, 배송, 재고, 할인 정보는 화면에 표시된 내용을 기준으로 합니다. 표시 오류나 시스템 장애가 확인되는 경우 회사는 주문을 정정하거나 취소할 수 있으며, 필요한 경우 회원에게 안내합니다.",
    },
    {
        title: "제4조 청약철회와 환불",
        body: "전자상거래 관련 법령에 따른 청약철회, 교환, 환불 기준을 따릅니다. 상품 성격, 포장 훼손, 사용 흔적, 위생상 사유 등으로 청약철회가 제한될 수 있는 경우 상품 상세 또는 주문 과정에서 안내합니다.",
    },
    {
        title: "제5조 PetLens와 AI 추천",
        body: "PetLens와 챗봇 추천은 반려견 프로필과 상품 카탈로그를 바탕으로 쇼핑 결정을 돕기 위한 보조 기능입니다. 수의학적 진단, 치료, 안전 보증 또는 특정 효과를 보장하지 않으며, 건강 이상이 의심되는 경우 전문가 상담이 필요합니다.",
    },
    {
        title: "제6조 이용자의 의무",
        body: "이용자는 타인의 정보 도용, 허위 정보 입력, 서비스 방해, 무단 크롤링, 상품 이미지와 콘텐츠의 무단 복제, 법령 또는 공서양속에 반하는 행위를 해서는 안 됩니다.",
    },
    {
        title: "제7조 지식재산권",
        body: "댕다방의 상표, 화면 구성, 상품 큐레이션, 이미지 편집물, 영상, 문구, 코드 및 기타 콘텐츠의 권리는 회사 또는 정당한 권리자에게 있습니다. 이용자는 회사의 사전 동의 없이 이를 복제, 배포, 전송, 2차 저작물 작성 또는 상업적으로 이용할 수 없습니다.",
    },
    {
        title: "제8조 서비스 변경과 중단",
        body: "회사는 운영, 보안, 시스템 점검, 제휴사 정책 변경, 불가항력 등의 사유로 서비스 일부를 변경하거나 일시 중단할 수 있습니다. 중요한 변경은 가능한 범위에서 사전에 안내합니다.",
    },
    {
        title: "제9조 사업자 정보",
        body: `상호: ${BUSINESS_INFO.companyName}, 대표자: ${BUSINESS_INFO.representative}, 주소: ${BUSINESS_INFO.address}, 고객센터: ${BUSINESS_INFO.customerServicePhone}, 사업자등록번호: ${BUSINESS_INFO.businessNumber}, 통신판매업신고번호: ${BUSINESS_INFO.mailOrderNumber}, 호스팅서비스 제공자: ${BUSINESS_INFO.hostingProvider}`,
    },
];

export default function TermsPage() {
    return (
        <main className="mx-auto max-w-[960px] px-4 py-10 md:px-6">
            <p className="text-sm font-black text-indigo-700">Legal</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">이용약관</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                시행일: {LEGAL_UPDATED_AT}.
            </p>
            <div className="mt-8 grid gap-5">
                {sections.map((section) => (
                    <section key={section.title} className="border-t border-neutral-200 pt-5">
                        <h2 className="text-lg font-black text-neutral-950">{section.title}</h2>
                        <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">{section.body}</p>
                    </section>
                ))}
            </div>
        </main>
    );
}
