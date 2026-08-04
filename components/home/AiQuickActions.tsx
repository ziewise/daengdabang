import Link from "next/link";

const ACTIONS = [
    {
        href: "/pet-lens/",
        label: "사진 건강 분석",
        helper: "사진으로 현재 케어 포인트 확인",
        icon: "fa-camera-retro",
        tone: "from-cyan-500 to-blue-600",
    },
    {
        href: "/pet-lens/?mode=observation",
        label: "울음소리 분석",
        helper: "소리와 주변 상황을 함께 관찰",
        icon: "fa-wave-square",
        tone: "from-violet-500 to-indigo-600",
    },
    {
        href: "/pet-lens/?mode=observation",
        label: "행동 분석",
        helper: "영상 속 행동 신호 살펴보기",
        icon: "fa-video",
        tone: "from-rose-500 to-pink-600",
    },
    {
        href: "/my-pet/#health-report",
        label: "건강 리포트",
        helper: "저장된 분석 기록 한눈에 보기",
        icon: "fa-chart-line",
        tone: "from-emerald-500 to-teal-600",
    },
    {
        href: "/chat/",
        label: "AI 상담",
        helper: "궁금한 증상과 생활 질문 상담",
        icon: "fa-comment-dots",
        tone: "from-amber-500 to-orange-600",
    },
    {
        href: "/challenge/",
        label: "AI 챌린지",
        helper: "매일 돌보고 레벨 올리기",
        icon: "fa-trophy",
        tone: "from-fuchsia-500 to-purple-600",
    },
] as const;

export default function AiQuickActions() {
    return (
        <section className="py-10 md:py-14" aria-labelledby="ai-quick-actions-title" data-ai-quick-actions>
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-black tracking-[0.18em] text-indigo-600">DAENGDABANG AI</p>
                        <h2 id="ai-quick-actions-title" className="mt-2 text-2xl font-black tracking-tight text-neutral-950 md:text-3xl">
                            우리 아이를 위한 AI 바로가기
                        </h2>
                        <p className="mt-2 text-sm font-bold text-neutral-600">
                            사진·소리·행동 기록을 한곳에 모아 다음 돌봄으로 이어가세요.
                        </p>
                    </div>
                    <Link href="/pet-lens/" className="text-sm font-black text-indigo-700 hover:underline">
                        지금 무료로 시작하기 <i className="fa-solid fa-arrow-right ml-1 text-xs" aria-hidden="true" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    {ACTIONS.map((action) => (
                        <Link
                            key={action.label}
                            href={action.href}
                            className="group relative min-h-40 overflow-hidden rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-[0_14px_35px_rgba(15,23,42,0.08)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(79,70,229,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            <span className={`inline-grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${action.tone} text-lg text-white shadow-lg transition duration-300 group-hover:rotate-3 group-hover:scale-110`}>
                                <i className={`fa-solid ${action.icon}`} aria-hidden="true" />
                            </span>
                            <strong className="mt-4 block text-sm font-black text-neutral-950 md:text-base">{action.label}</strong>
                            <span className="mt-1.5 block text-xs font-bold leading-5 text-neutral-500">{action.helper}</span>
                            <i className="fa-solid fa-arrow-up-right-from-square absolute bottom-4 right-4 text-[10px] text-neutral-300 transition group-hover:text-indigo-600" aria-hidden="true" />
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
