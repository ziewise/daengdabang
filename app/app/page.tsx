import type { Metadata } from "next";
import MobileAppHome from "@/components/pwa/MobileAppHome";

export const metadata: Metadata = {
    title: "모바일 앱 홈 | 댕다방",
    description: "매일 댕생활, 댕자랑, 댕다방 연구소를 한곳에서 바로 여세요.",
    alternates: { canonical: "/app/" },
};

export default function AppHomePage() {
    return <MobileAppHome />;
}
