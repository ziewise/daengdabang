export type SignupAgreementRow = {
    item: string;
    purpose: string;
    retention: string;
};

export const SIGNUP_TERMS_VERSION = "ddb-terms-20260723-v1";
export const SIGNUP_PRIVACY_VERSION = "ddb-privacy-20260723-v1";

export const SIGNUP_TERMS_AGREEMENT = {
    version: SIGNUP_TERMS_VERSION,
    title: "[필수] 이용약관 동의",
    href: "/terms",
    summary: [
        "회원가입, 서비스 이용, 구매신청 및 계약 성립 기준을 확인합니다.",
        "배송·청약철회·환불·회원 탈퇴 및 자격 제한에 관한 주요 조건을 확인합니다.",
        "서비스 이용 중 권리·의무, 책임 제한, 분쟁 해결 및 준거법에 동의합니다.",
    ],
} as const;

export const SIGNUP_REQUIRED_PRIVACY_CONSENT = {
    version: SIGNUP_PRIVACY_VERSION,
    title: "[필수] 개인정보 수집·이용 동의",
    href: "/privacy",
    intro: "회사는 상품 주문, 배송, 회원관리 및 고객서비스 제공을 위하여 아래와 같이 개인정보를 수집·이용합니다.",
    refusalNotice:
        "귀하는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다. 다만, 필수 개인정보 수집에 동의하지 않는 경우 회원가입, 상품 주문 및 서비스 이용이 제한될 수 있습니다.",
    rows: [
        {
            item: "이름",
            purpose: "회원 식별, 본인확인",
            retention: "회원 탈퇴 후 30일 또는 관계 법령에 따른 보존기간까지",
        },
        {
            item: "아이디",
            purpose: "회원 관리",
            retention: "동일",
        },
        {
            item: "비밀번호(암호화 저장)",
            purpose: "로그인 인증",
            retention: "동일",
        },
        {
            item: "휴대전화번호(주문·배송·고객문의에서 별도 입력 시)",
            purpose: "주문 안내, 배송 안내, 고객 응대",
            retention: "계약·청약철회 및 재화 공급 기록 5년 또는 고객 상담 기록 3년",
        },
        {
            item: "이메일",
            purpose: "회원 식별·로그인, 가입 혜택 인증, 주문 확인, 영수증 발송, 고객 응대",
            retention: "동일",
        },
        {
            item: "배송지 주소",
            purpose: "상품 배송",
            retention: "동일",
        },
        {
            item: "주문 및 결제 정보",
            purpose: "주문 처리, 환불 및 고객지원",
            retention: "관계 법령에 따른 보존기간까지",
        },
        {
            item: "정규화된 이메일 HMAC 별칭, 요청 IP HMAC, OTP HMAC, 인증 요청·만료·시도·상태 기록",
            purpose: "가입 혜택 이메일 인증번호 발송·검증, 재전송·시도 제한 및 오남용 방지. 이메일주소는 회원 계정 정보로 보관되고 발송 시 이메일 발송 사업자에 전달되며, OTP 원문은 서버 DB에 저장하지 않음",
            retention: "인증번호 만료 후 24시간",
        },
        {
            item: "정규화된 인증 이메일의 HMAC 일방향 식별값",
            purpose: "신규 가입 댕랩코인 20C의 중복 수령 탐지, 반복 가입 등 부정 이용 방지 및 부정 지급 혜택 회수",
            retention: "가입 혜택 프로그램 운영 기간 및 종료 후 30일(분쟁 또는 법령상 보존 사유가 있으면 해당 기간)",
        },
    ] satisfies SignupAgreementRow[],
} as const;

export const SIGNUP_PETLENS_PRIVACY_CONSENT = {
    title: "[선택] PetLens 반려동물 정보 수집·이용 동의",
    intro:
        "반려동물 정보는 맞춤형 상품 추천과 서비스 개선을 위한 선택 항목입니다. 동의하지 않아도 회원가입과 기본 쇼핑몰 이용은 가능합니다.",
    refusalNotice:
        "동의하지 않으면 가입 단계에서 업로드한 반려동물 사진·품종·체중 등 프로필 정보는 저장하지 않습니다. 가입 후 마이페이지에서 다시 등록할 수 있습니다.",
    rows: [
        {
            item: "반려동물 정보(사진, 품종, 생년월일, 체중, 성별 등)",
            purpose: "맞춤형 상품 추천, 서비스 개선",
            retention: "회원 탈퇴 또는 동의 철회 시까지",
        },
    ] satisfies SignupAgreementRow[],
} as const;
