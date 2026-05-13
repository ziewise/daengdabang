/**
 * (shop) 라우트 그룹 layout
 * ---------------------------------------------------------------------
 * 쇼핑 관련 페이지 (메인·로그인·회원가입·마이페이지·펫렌즈) 공통.
 *   - Header (fixed 글래스 + 메가메뉴 + 검색·장바구니·로그인)
 *   - PetlensProvider — 우하단 FAB + 모달 글로벌 마운트
 *   - Footer
 *
 * 인트로 페이지 (`app/page.tsx`) 는 이 그룹 밖에 있어 헤더/푸터 미노출.
 */
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import PetlensProvider from "@/components/petlens/PetlensProvider";

export default function ShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <PetlensProvider>
            <Header />
            <main className="flex-1 pt-[var(--header-height)] flex flex-col">
                {children}
            </main>
            <Footer />
        </PetlensProvider>
    );
}
