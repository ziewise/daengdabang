import type { Metadata } from "next";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import ChatWidget from "@/components/site/ChatWidget";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
    title: "댕다방",
    description: "반려견 산책, 먹거리, 생활, 놀이, 케어 상품을 고르는 댕다방 자사몰",
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
