import Link from "next/link";
import { CATEGORY_LABEL } from "@/lib/catalog";
import { BUSINESS_INFO, COPYRIGHT_NOTICE } from "@/lib/legal";
import { CATEGORY_ORDER } from "@/lib/shop";

export default function Footer() {
    return (
        <footer className="mt-16 border-t border-neutral-200 bg-white">
            <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 md:grid-cols-[1fr_2fr] md:px-6">
                <div>
                    <h2 className="text-lg font-black text-neutral-950">댕다방</h2>
                    <p className="mt-2 max-w-md text-sm font-bold leading-6 text-neutral-600">
                        반려견의 산책, 먹거리, 생활, 놀이, 케어를 한 곳에서 고르는 자사몰입니다.
                    </p>
                    <div className="mt-4 grid gap-1 text-xs font-bold leading-5 text-neutral-500">
                        <p>상호: {BUSINESS_INFO.companyName} · 대표자: {BUSINESS_INFO.representative}</p>
                        <p>주소: {BUSINESS_INFO.address}</p>
                        <p>고객센터: {BUSINESS_INFO.customerServicePhone} · {BUSINESS_INFO.customerServiceEmail}</p>
                        <p>사업자등록번호: {BUSINESS_INFO.businessNumber}</p>
                        <p>통신판매업신고번호: {BUSINESS_INFO.mailOrderNumber}</p>
                        <p>호스팅서비스 제공자: {BUSINESS_INFO.hostingProvider}</p>
                        <p>{COPYRIGHT_NOTICE}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-6 text-sm md:grid-cols-3">
                    <div>
                        <h3 className="font-black text-neutral-950">쇼핑</h3>
                        <div className="mt-3 grid gap-2 font-bold text-neutral-600">
                            <Link href="/products">전체상품</Link>
                            <Link href="/best">베스트</Link>
                            <Link href="/new">신상품</Link>
                            <Link href="/brands">브랜드</Link>
                            {CATEGORY_ORDER.slice(0, 4).map((slug) => (
                                <Link key={slug} href={`/category/${slug}`}>{CATEGORY_LABEL[slug]}</Link>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-black text-neutral-950">AI</h3>
                        <div className="mt-3 grid gap-2 font-bold text-neutral-600">
                            <Link href="/pet-lens">펫렌즈</Link>
                            <Link href="/chat">챗봇</Link>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-black text-neutral-950">회원</h3>
                        <div className="mt-3 grid gap-2 font-bold text-neutral-600">
                            <Link href="/auth/login">로그인</Link>
                            <Link href="/auth/signup">회원가입</Link>
                            <Link href="/mypage">마이페이지</Link>
                            <Link href="/cart">장바구니</Link>
                            <Link href="/terms">이용약관</Link>
                            <Link href="/privacy">개인정보처리방침</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
