import type { Metadata } from "next";
import MemberAiDashboard from "@/components/home/MemberAiDashboard";

export const metadata: Metadata = {
    title: "AI 챌린지 | 댕다방",
    description: "매일 출근도장과 돌봄 챌린지를 완료하고 댕다방 연구소 코인과 경험치를 모아보세요.",
};

export default function ChallengePage() {
    return (
        <main className="w-full">
            <section className="ddb-crayon-paper mx-auto mt-10 max-w-[1352px] rounded-[32px] border px-5 py-7 sm:px-7 md:mt-14 md:px-10 md:py-9">
                <p className="ddb-crayon-kicker text-xs">DAILY CARE CHALLENGE</p>
                <h1 className="ddb-crayon-title ddb-crayon-underline mt-2 max-w-4xl text-3xl text-neutral-950 md:text-5xl">매일 돌보고, 도장 찍고, 레벨 업!</h1>
                <p className="mt-3 max-w-none text-sm font-bold leading-7 text-neutral-600 md:whitespace-nowrap md:text-base">
                    작은 돌봄을 꾸준히 기록하면 우리 아이의 변화가 더 잘 보여요. 출근도장은 하루 한 번 <span className="whitespace-nowrap">2코인을 지급합니다.</span>
                </p>
            </section>
            <MemberAiDashboard variant="full" />
        </main>
    );
}
