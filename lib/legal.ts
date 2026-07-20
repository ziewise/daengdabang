export const LEGAL_UPDATED_AT = "2026-06-24";

export const FTC_BUSINESS_INFO_URL =
    "https://www.ftc.go.kr/www/selectBizCommView.do?pageUnit=10&pageIndex=1&searchCnd=BRNO&searchKrwd=8738103438&key=254&opnSn=2026378039430200950";

export const FTC_BUSINESS_SEARCH_URL =
    "https://www.ftc.go.kr/www/selectBizCommList.do?key=254&searchCnd=BRNO&searchKrwd=8738103438";

export const BUSINESS_INFO = {
    mallName: process.env.NEXT_PUBLIC_DDB_MALL_NAME || "댕다방",
    companyName: process.env.NEXT_PUBLIC_DDB_COMPANY_NAME || "주식회사 포엔치",
    representative: process.env.NEXT_PUBLIC_DDB_REPRESENTATIVE || "박주연",
    businessNumber: process.env.NEXT_PUBLIC_DDB_BUSINESS_NUMBER || "873-81-03438",
    mailOrderNumber: process.env.NEXT_PUBLIC_DDB_MAIL_ORDER_NUMBER || "제2026-성남수정-0227호",
    address: process.env.NEXT_PUBLIC_DDB_BUSINESS_ADDRESS || "경기도 성남시 수정구 수정로 118, 3층 113호(수진동, 나눔빌딩)",
    customerServicePhone: process.env.NEXT_PUBLIC_DDB_CS_PHONE || "1800-2162",
    customerServiceEmail: process.env.NEXT_PUBLIC_DDB_CS_EMAIL || "support@daengdabang.com",
    partnerEmail: process.env.NEXT_PUBLIC_DDB_PARTNER_EMAIL || "partners@daengdabang.com",
    privacyOfficer: process.env.NEXT_PUBLIC_DDB_PRIVACY_OFFICER || "박주연",
    hostingProvider: process.env.NEXT_PUBLIC_DDB_HOSTING_PROVIDER || "GitHub Pages",
    domain: process.env.NEXT_PUBLIC_DDB_DOMAIN || "daengdabang.com",
    corporateRegistrationNumber: process.env.NEXT_PUBLIC_DDB_CORPORATE_REGISTRATION_NUMBER || "131111-0748657",
    openedAt: "2024년 10월 11일",
    businessCertificateIssuedAt: "2024년 10월 24일",
    mailOrderReportedAt: "2026년 03월 19일",
    businessType: "도매 및 소매업",
    businessItem: "화장품 도,소매업",
};

export const ESCROW_INFO = {
    provider: "KB국민은행",
    serviceName: "KB에스크로 이체",
    sellerRegisteredAt: "2026.03.12",
    mallName: BUSINESS_INFO.mallName,
    mallUrl: BUSINESS_INFO.domain,
    sellerName: BUSINESS_INFO.companyName,
    certificateIssuedAt: "2026년 06월 22일",
    serviceRegistrationNumber: "41-2007-0018678(특허청)",
    servicePhone: "1588-9999",
    domesticCallCenter: "1599-9999, 1588-9999",
    overseasCallCenter: "82-2-6300-9999",
};

export const LEGAL_DOCUMENTS = [
    {
        label: "사업자등록증",
        href: "/docs/legal/business-registration.pdf",
    },
    {
        label: "통신판매업신고증",
        href: "/docs/legal/mail-order-registration.pdf",
    },
    {
        label: "구매안전서비스 이용확인증",
        href: "/docs/legal/purchase-safety-confirmation.pdf",
    },
    {
        label: "KB에스크로 이체 판매자 확인정보",
        href: "/docs/legal/kb-escrow-seller-info.pdf",
    },
];

export const COPYRIGHT_NOTICE =
    process.env.NEXT_PUBLIC_DDB_COPYRIGHT_NOTICE ||
    "Copyright © 2026 댕다방. All rights reserved.";
