import type { Metadata } from "next";
import GrowthHub from "@/components/growth/GrowthHub";

export const metadata: Metadata = {
    title: "매일댕생활 | 댕다방",
    description: "매일 돌봄 기록과 500명 굿즈 공모전을 한곳에서 확인하세요.",
    alternates: { canonical: "/treasure-mine/" },
    robots: { index: false, follow: true },
};

/** `/growth/` 이전·공유 링크에서도 정적 배포 환경의 매일댕생활 허브를 연다. */
export default function GrowthPage() {
    return <GrowthHub />;
}
