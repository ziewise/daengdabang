import Link from "next/link";

const POLICIES = [
    {
        icon: "fa-circle-play",
        tone: "orange",
        title: "공식 리워드 광고는 아직 연동 전",
        body: "광고 제공사와 완료 이벤트가 연결되기 전에는 시청·보상 버튼을 만들지 않습니다. 도입하더라도 명시적으로 선택한 경우에만 실행하고, 광고를 보지 않아도 기본 기능은 그대로 이용할 수 있게 운영합니다.",
    },
    {
        icon: "fa-coins",
        tone: "coral",
        title: "현재 보상은 기존 돌봄 경로만",
        body: "댕랩 코인은 출근도장 등 현재 검증된 보상 경로에서만 적립됩니다. 돌봄 미션은 XP로 기록되며, 광고 클릭이나 가짜 시청 완료로 코인을 지급하지 않습니다.",
    },
    {
        icon: "fa-user-doctor",
        tone: "teal",
        title: "AI 기록은 의료 진단이 아니에요",
        body: "AI 결과는 평소 변화를 기록하는 참고 정보입니다. 걱정되는 증상이 계속되거나 심해지면 결과와 관계없이 동물병원 또는 수의사에게 확인해 주세요.",
    },
] as const;

export default function GrowthPolicySummary() {
    return (
        <section className="pb-14 pt-4 md:pb-20" aria-labelledby="growth-policy-title">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                <div className="ddb-crayon-paper overflow-hidden rounded-[30px] border">
                    <header className="ddb-crayon-banner px-5 py-5 sm:px-7">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="ddb-crayon-kicker text-[11px]">SAFE BY DEFAULT</p>
                                <h2 id="growth-policy-title" className="ddb-crayon-title mt-1 text-2xl text-neutral-950">보물광산 운영 약속</h2>
                            </div>
                            <Link href="/privacy/" className="text-xs font-black text-indigo-800 underline underline-offset-4">개인정보처리방침</Link>
                        </div>
                    </header>
                    <div className="grid divide-y divide-neutral-200 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                        {POLICIES.map((policy) => (
                            <article key={policy.title} className="p-5 sm:p-6">
                                <span className="ddb-crayon-icon grid h-10 w-10 place-items-center rounded-xl text-sm" data-crayon-tone={policy.tone}>
                                    <i className={`fa-solid ${policy.icon}`} aria-hidden="true" />
                                </span>
                                <h3 className="mt-3 text-sm font-black text-neutral-950">{policy.title}</h3>
                                <p className="mt-2 text-xs font-bold leading-5 text-neutral-600">{policy.body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
