import type { Metadata } from "next";
import { BUSINESS_INFO, LEGAL_UPDATED_AT } from "@/lib/legal";

export const metadata: Metadata = {
    title: "개인정보처리방침 | 댕다방",
    description: "댕다방 개인정보 처리 기준",
};

const toc = [
    ["purpose", "제1조 개인정보의 처리목적 및 수집 항목"],
    ["children", "제2조 만 14세 미만 아동의 개인정보"],
    ["retention", "제3조 보유 및 이용기간, 파기방법"],
    ["outsourcing", "제4조 개인정보 처리위탁"],
    ["third-party", "제5조 개인정보 제3자 제공"],
    ["overseas", "제6조 개인정보 국외이전"],
    ["location", "제7조 개인위치정보 및 지역 기반 기능"],
    ["sensitive", "제8조 반려견 사진·건강정보 등 민감 가능 정보"],
    ["rights", "제9조 정보주체 및 법정대리인의 권리"],
    ["officer", "제10조 개인정보 보호책임자 및 담당부서"],
    ["cookies", "제11조 자동 수집 장치의 운영 및 거부"],
    ["behavior", "제12조 행태정보와 맞춤형 광고"],
    ["automation", "제13조 AI 분석 및 자동화된 결정"],
    ["security", "제14조 안전성 확보조치"],
    ["remedy", "제15조 개인정보침해 상담 및 신고"],
    ["notice", "제16조 변경에 따른 공지"],
] as const;

const noConsentRows = [
    [
        "주문·배송",
        "주문 상품, 수량, 금액, 수령인, 배송지, 연락처, 공동현관 출입방법 등 배송 요청사항",
        "주문 접수, 배송, 교환·반품, 고객 고지",
        "계약·청약철회 및 재화 공급 기록 5년",
    ],
    [
        "결제·환불",
        "결제수단, 승인·취소 기록, 현금영수증 정보, 환불계좌 정보(환불 시)",
        "대금 결제, 취소, 환불, 정산, 부정거래 확인",
        "대금결제 및 재화 공급 기록 5년",
    ],
    [
        "고객 상담",
        "이름, 연락처, 이메일, 주문번호, 상담 내용, 첨부자료",
        "문의 응대, 불만 처리, 분쟁 대응",
        "소비자 불만 또는 분쟁처리 기록 3년",
    ],
    [
        "서비스 이용기록",
        "IP 주소, 쿠키, 접속 일시, 기기·브라우저 정보, 서비스 이용 로그",
        "보안, 장애 대응, 비정상 이용 방지, 서비스 품질 개선",
        "접속 로그 3개월, 보안 사고 대응에 필요한 기록은 관련 법령상 기간",
    ],
];

const consentRows = [
    [
        "회원가입",
        "이메일, 이름 또는 닉네임, 암호화된 비밀번호, 약관 동의 내역",
        "회원 식별, 로그인, 계정 관리, 고지사항 전달",
        "회원 탈퇴 후 30일 또는 관계 법령상 보존기간",
    ],
    [
        "간편로그인",
        "간편로그인 제공자, 제공자 회원 식별값, 이메일, 이름 또는 닉네임",
        "네이버·카카오·구글 등 외부 계정 기반 가입 및 로그인",
        "회원 탈퇴 또는 연결 해제 시까지",
    ],
    [
        "PetLens 프로필",
        "반려견 이름, 견종, 나이, 크기, 체형, 활동량, 관심 케어, 알레르기·건강 메모(입력 시)",
        "반려견 맞춤 상품 추천, 챗봇 개인화, 프로필 저장",
        "이용자가 삭제하거나 회원 탈퇴할 때까지",
    ],
    [
        "PetLens 이미지",
        "업로드한 반려견 사진, 이미지 분석 결과, 착용 미리보기 결과",
        "반려견 분석, 사이즈·스타일 추천, 착용 미리보기 제공",
        "이용자가 삭제하거나 회원 탈퇴할 때까지. 임시 처리 파일은 목적 달성 후 지체 없이 삭제",
    ],
    [
        "마케팅 수신",
        "이메일, 휴대전화번호, 수신동의 내역, 관심상품, 구매·검색·클릭 내역",
        "신상품, 할인, 이벤트, 맞춤 혜택 안내",
        "동의 철회 또는 회원 탈퇴 시까지",
    ],
    [
        "이벤트·리뷰",
        "이름, 연락처, SNS ID, 배송지(경품 발송 시), 리뷰 내용 및 사진",
        "이벤트 운영, 당첨 안내, 경품 발송, 리뷰 게시",
        "이벤트 종료 후 90일 또는 관련 법령상 보존기간",
    ],
];

const outsourcingRows = [
    ["결제대행·간편결제", "PG사 및 간편결제 사업자", "결제 승인, 취소, 환불, 현금영수증 처리"],
    ["배송", "계약 택배사 및 배송 대행사", "상품 배송, 반품 회수, 배송 안내"],
    ["호스팅·보안·CDN", BUSINESS_INFO.hostingProvider, "웹사이트 제공, 트래픽 처리, 보안, 장애 대응"],
    ["고객 알림", "이메일·문자·카카오 알림 발송 사업자(연동 시 고지)", "주문, 배송, 상담, 마케팅 수신동의 알림 발송"],
    ["AI 이미지 분석", "AI 분석 제공자(운영 연동 시 별도 고지)", "PetLens 이미지 분석 및 맞춤 추천"],
];

const complaintRows = [
    ["개인정보침해 신고센터", "국번없이 118", "https://privacy.kisa.or.kr"],
    ["개인정보분쟁조정위원회", "1833-6972", "https://www.kopico.go.kr"],
    ["대검찰청", "국번없이 1301", "https://www.spo.go.kr"],
    ["경찰청 사이버범죄 신고시스템", "국번없이 182", "https://ecrm.police.go.kr"],
];

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
        <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                    <tr className="border-b border-neutral-200 text-xs font-black text-neutral-500">
                        {headers.map((header) => (
                            <th key={header} className="py-3 pr-4">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.join("-")} className="border-b border-neutral-100 align-top">
                            {row.map((cell, index) => (
                                <td
                                    key={`${row[0]}-${index}`}
                                    className={`py-4 pr-4 leading-6 ${
                                        index === 0 ? "font-black text-neutral-950" : "font-bold text-neutral-600"
                                    }`}
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function PrivacyPage() {
    return (
        <main className="mx-auto max-w-[1040px] px-4 py-10 md:px-6">
            <p className="text-sm font-black text-indigo-700">Privacy</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">개인정보처리방침</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                {BUSINESS_INFO.companyName}은 개인정보 보호법 및 관계 법령을 준수하며, 이용자의 개인정보가 어떤
                기준으로 처리되는지 쉽게 확인할 수 있도록 본 방침을 공개합니다. 시행일: {LEGAL_UPDATED_AT}.
            </p>

            <nav
                aria-label="개인정보처리방침 목차"
                className="mt-8 grid gap-2 rounded-lg border border-neutral-200 bg-white p-4 text-sm font-bold text-neutral-600 md:grid-cols-2"
            >
                {toc.map(([id, label]) => (
                    <a key={id} href={`#${id}`} className="hover:text-indigo-700">
                        {label}
                    </a>
                ))}
            </nav>

            <section id="purpose" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제1조 개인정보의 처리목적 및 수집 항목</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    댕다방은 쇼핑몰 서비스 제공, 회원관리, 주문·배송, 고객상담, 반려견 맞춤 추천, 이벤트 및 마케팅
                    안내를 위해 필요한 범위에서 개인정보를 처리합니다. 계약 이행에 필요한 항목과 별도 동의가 필요한
                    항목을 구분하여 관리합니다.
                </p>
                <h3 className="mt-6 text-base font-black text-neutral-950">1. 정보주체의 동의 없이 처리하는 항목</h3>
                <DataTable headers={["구분", "처리 항목", "처리 목적", "보유 및 이용기간"]} rows={noConsentRows} />
                <h3 className="mt-6 text-base font-black text-neutral-950">2. 정보주체의 동의를 받아 처리하는 항목</h3>
                <DataTable headers={["구분", "처리 항목", "처리 목적", "보유 및 이용기간"]} rows={consentRows} />
            </section>

            <section id="children" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제2조 만 14세 미만 아동의 개인정보</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    댕다방은 원칙적으로 만 14세 미만 아동을 대상으로 회원가입을 제공하지 않습니다. 향후 만 14세 미만
                    아동의 개인정보 처리가 필요한 기능을 제공하는 경우 법정대리인의 동의를 확인하고, 법정대리인의
                    열람·정정·삭제·처리정지 요구 절차를 별도로 안내합니다.
                </p>
            </section>

            <section id="retention" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제3조 보유 및 이용기간, 파기방법</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    개인정보는 처리 목적 달성, 동의 철회, 회원 탈퇴, 보유기간 경과 시 지체 없이 파기합니다. 전자적
                    파일은 복구하기 어렵도록 삭제하고, 종이 문서는 분쇄 또는 이에 준하는 방법으로 파기합니다. 관계
                    법령에 따라 보존해야 하는 정보는 다른 개인정보와 분리하여 보관합니다.
                </p>
                <ul className="mt-3 grid gap-2 text-sm font-bold leading-7 text-neutral-600">
                    <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
                    <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
                    <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년</li>
                    <li>웹사이트 접속 로그 등 통신사실확인자료: 3개월</li>
                </ul>
            </section>

            <section id="outsourcing" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제4조 개인정보 처리위탁</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    서비스 제공에 필요한 일부 업무는 외부 전문업체에 위탁할 수 있습니다. 위탁계약 체결 시 개인정보의
                    목적 외 처리 금지, 안전성 확보조치, 재위탁 제한, 관리·감독, 손해배상 책임을 계약서에 반영합니다.
                    실제 운영 연동이 확정된 수탁자는 본 표에 즉시 반영합니다.
                </p>
                <DataTable headers={["위탁 업무", "수탁자", "위탁 내용"]} rows={outsourcingRows} />
            </section>

            <section id="third-party" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제5조 개인정보 제3자 제공</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    댕다방은 이용자의 사전 동의가 있거나 법령에 근거가 있는 경우를 제외하고 개인정보를 제3자에게
                    제공하지 않습니다. 제3자 제공이 필요한 제휴, 이벤트, 보험·A/S 등 기능을 운영하는 경우 제공받는 자,
                    제공 목적, 제공 항목, 보유 및 이용기간, 동의 거부권을 별도 화면과 본 방침에 고지합니다.
                </p>
            </section>

            <section id="overseas" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제6조 개인정보 국외이전</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    현재 댕다방은 이용자 개인정보를 상시적으로 국외 이전하지 않습니다. 다만 글로벌 클라우드, 보안,
                    AI 이미지 분석 등 국외 이전이 필요한 기능을 운영 환경에 연결하는 경우 이전받는 자, 이전 국가,
                    이전 항목, 이전 일시·방법, 이용 목적, 보유기간, 이전 거부 방법을 별도 고지하고 필요한 동의를
                    받습니다.
                </p>
            </section>

            <section id="location" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제7조 개인위치정보 및 지역 기반 기능</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    지역별 날씨에 맞는 히어로 영상, 추천 콘텐츠 등 지역 기반 기능은 사용자가 선택한 지역 또는 브라우저
                    권한을 통해 동의한 위치정보를 기준으로 제공할 수 있습니다. 기본적으로 정확한 위치를 저장하지 않으며,
                    IP 기반의 시·도 수준 추정 정보 또는 사용자가 직접 선택한 지역을 우선 사용합니다. 정확한 위치정보를
                    활용하는 기능을 도입하는 경우 동의, 철회, 보유기간, 제3자 제공 여부를 별도 안내합니다.
                </p>
            </section>

            <section id="sensitive" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제8조 반려견 사진·건강정보 등 민감 가능 정보</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    댕다방은 사람의 민감정보를 의도적으로 수집하지 않습니다. 다만 반려견 사진에는 보호자 얼굴, 거주지,
                    위치 단서가 포함될 수 있고, 반려견 건강 메모에는 질병·복약 등 민감하게 느껴질 수 있는 내용이 포함될
                    수 있습니다. 이용자는 업로드 전 불필요한 배경이나 사람 얼굴을 제외할 수 있으며, 업로드한 사진과
                    프로필 정보는 마이페이지 또는 고객센터를 통해 삭제를 요청할 수 있습니다.
                </p>
            </section>

            <section id="rights" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제9조 정보주체 및 법정대리인의 권리</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리정지, 동의 철회를 요구할 수 있습니다. 회원정보와
                    반려견 프로필은 서비스 화면에서 직접 수정하거나 삭제할 수 있고, 직접 처리하기 어려운 경우 고객센터로
                    요청할 수 있습니다. 댕다방은 본인 확인 후 지체 없이 조치하며, 법령상 보존이 필요한 정보는 처리정지
                    또는 분리보관 방식으로 관리합니다.
                </p>
            </section>

            <section id="officer" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제10조 개인정보 보호책임자 및 담당부서</h2>
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                        <tbody>
                            {[
                                ["개인정보 보호책임자", BUSINESS_INFO.privacyOfficer],
                                ["소속 및 담당", `${BUSINESS_INFO.companyName} 고객보호 및 개인정보 처리 담당`],
                                ["연락처", `${BUSINESS_INFO.customerServicePhone} / ${BUSINESS_INFO.customerServiceEmail}`],
                                ["주소", BUSINESS_INFO.address],
                            ].map(([label, value]) => (
                                <tr key={label} className="border-b border-neutral-100 align-top">
                                    <th className="w-56 py-4 pr-4 font-black text-neutral-950">{label}</th>
                                    <td className="py-4 font-bold leading-6 text-neutral-600">{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section id="cookies" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제11조 자동 수집 장치의 운영 및 거부</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    댕다방은 로그인 상태 유지, 장바구니, 보안, 서비스 이용 통계 등을 위해 쿠키와 유사 기술을 사용할 수
                    있습니다. 이용자는 브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있습니다. 다만 쿠키를 차단하면
                    로그인, 장바구니, 맞춤 추천 등 일부 기능이 정상적으로 작동하지 않을 수 있습니다.
                </p>
            </section>

            <section id="behavior" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제12조 행태정보와 맞춤형 광고</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    이용자의 관심 상품, 검색·클릭·구매 내역, 광고 반응 정보는 동의 범위 내에서 맞춤형 상품 추천 및
                    광고 성과 분석에 활용될 수 있습니다. 제3자가 쿠키 등을 통해 행태정보를 수집하도록 허용하는 경우
                    수집 주체, 항목, 목적, 보유기간, 거부 방법을 본 방침에 추가합니다. 이용자는 브라우저 쿠키 차단,
                    광고 식별자 재설정, 마케팅 수신동의 철회를 통해 맞춤형 광고 활용을 거부할 수 있습니다.
                </p>
            </section>

            <section id="automation" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제13조 AI 분석 및 자동화된 결정</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    PetLens의 반려견 사진 분석, 견종·체형 추정, 상품 추천은 자동화된 분석 결과를 포함할 수 있습니다.
                    이 결과는 쇼핑 편의를 위한 참고 정보이며, 이용자에게 법적 효과나 중대한 영향을 미치는 결정을
                    자동으로 확정하지 않습니다. 이용자는 추천 결과에 대해 설명을 요청하거나 프로필 정보를 수정·삭제하여
                    재분석을 요청할 수 있습니다.
                </p>
            </section>

            <section id="security" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제14조 안전성 확보조치</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    댕다방은 개인정보 보호를 위해 접근권한 최소화, 관리자 인증 관리, 전송구간 암호화, 비밀번호 단방향
                    암호화, 접속기록 보관, 보안 업데이트, 위탁업체 관리·감독, 사고 대응 절차를 운영합니다. 개인정보를
                    처리하는 임직원과 협력업체에는 필요한 범위의 접근권한만 부여합니다.
                </p>
            </section>

            <section id="remedy" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제15조 개인정보침해 상담 및 신고</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    개인정보 침해에 대한 신고나 상담이 필요한 경우 아래 기관에 문의할 수 있습니다. 댕다방 관련 문의는
                    제10조의 개인정보 보호책임자 및 고객센터로도 접수할 수 있습니다.
                </p>
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                        <tbody>
                            {complaintRows.map(([name, phone, href]) => (
                                <tr key={name} className="border-b border-neutral-100 align-top">
                                    <th className="w-64 py-4 pr-4 font-black text-neutral-950">{name}</th>
                                    <td className="py-4 pr-4 font-bold leading-6 text-neutral-600">{phone}</td>
                                    <td className="py-4 font-bold leading-6">
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-indigo-700 hover:text-indigo-900"
                                        >
                                            {href}
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section id="notice" className="mt-8 scroll-mt-24 border-t border-neutral-200 pt-5">
                <h2 className="text-lg font-black text-neutral-950">제16조 변경에 따른 공지</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
                    본 방침은 법령, 정책, 서비스, 보안기술 변경에 따라 개정될 수 있습니다. 중요한 변경이 있는 경우
                    시행일, 변경 사유, 변경 내용을 시행 7일 전부터 공지하며, 이용자에게 불리하거나 중대한 변경은
                    최소 30일 전부터 공지합니다.
                </p>
                <p className="mt-3 text-sm font-bold leading-7 text-neutral-600">
                    개인정보처리방침 버전: v1.1 / 시행일: {LEGAL_UPDATED_AT}
                </p>
            </section>
        </main>
    );
}
