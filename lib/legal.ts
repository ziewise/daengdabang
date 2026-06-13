export const LEGAL_UPDATED_AT = "2026-06-14";

export const BUSINESS_INFO = {
    mallName: process.env.NEXT_PUBLIC_DDB_MALL_NAME || "댕다방",
    companyName: process.env.NEXT_PUBLIC_DDB_COMPANY_NAME || "댕다방",
    representative: process.env.NEXT_PUBLIC_DDB_REPRESENTATIVE || "운영 정보 입력 필요",
    businessNumber: process.env.NEXT_PUBLIC_DDB_BUSINESS_NUMBER || "운영 정보 입력 필요",
    mailOrderNumber: process.env.NEXT_PUBLIC_DDB_MAIL_ORDER_NUMBER || "운영 정보 입력 필요",
    address: process.env.NEXT_PUBLIC_DDB_BUSINESS_ADDRESS || "운영 정보 입력 필요",
    customerServicePhone: process.env.NEXT_PUBLIC_DDB_CS_PHONE || "운영 정보 입력 필요",
    customerServiceEmail: process.env.NEXT_PUBLIC_DDB_CS_EMAIL || "운영 정보 입력 필요",
    hostingProvider: process.env.NEXT_PUBLIC_DDB_HOSTING_PROVIDER || "GitHub Pages",
};

export const COPYRIGHT_NOTICE =
    process.env.NEXT_PUBLIC_DDB_COPYRIGHT_NOTICE ||
    `Copyright © 2026 ${BUSINESS_INFO.companyName}. All rights reserved.`;
