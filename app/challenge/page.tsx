import type { Metadata } from "next";
import MemberAiDashboard from "@/components/home/MemberAiDashboard";

export const metadata: Metadata = {
    title: "AI 챌린지 | 댕다방",
    description: "매일 출근도장과 돌봄 챌린지를 완료하고 댕다방 연구소 코인과 경험치를 모아보세요.",
};

export default function ChallengePage() {
    return (
        <main className="w-full">
            <section className="mx-auto max-w-[1400px] px-4 pt-10 sm:px-6 md:pt-14">
                <p className="text-xs font-black tracking-[0.18em] text-indigo-600">DAILY CARE CHALLENGE</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-5xl">매일 돌보고, 도장 찍고, 레벨 업!</h1>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-neutral-600 md:text-base">작은 돌봄을 꾸준히 기록하면 우리 아이의 변화가 더 잘 보여요. 출근도장은 하루 한 번 2코인을 지급합니다.</p>
            </section>
            <MemberAiDashboard variant="full" />
        </main>
    );
}
