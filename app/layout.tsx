import type { Metadata } from "next";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import ChatWidget from "@/components/site/ChatWidget";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
    metadataBase: new URL("https://www.daengdabang.com"),
    title: "댕다방",
    description: "반려견 산책, 먹거리, 생활, 놀이, 케어 상품을 고르는 댕다방 자사몰",
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "website",
        locale: "ko_KR",
        siteName: "댕다방",
        title: "댕다방",
        description: "펫렌즈와 챗봇으로 우리 아이에게 맞는 반려견 상품을 고르는 자사몰",
        url: "/",
        images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "댕다방" }],
    },
    twitter: {
        card: "summary",
        title: "댕다방",
        description: "펫렌즈와 챗봇으로 우리 아이에게 맞는 반려견 상품을 고르는 자사몰",
        images: ["/images/logo.png"],
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko">
            <body>
                <StoreProvider>
                    <Header />
                    {children}
                    <Footer />
                    <ChatWidget />
                </StoreProvider>
            </body>
        </html>
    );
}
