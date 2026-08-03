import type { ReactNode } from "react";
import Link from "next/link";
import MypageSidebar from "@/components/mypage/MypageSidebar";

export function MypageLoginGate({ redirect }: { redirect: string }) {
    const loginHref = `/auth/login?redirect=${encodeURIComponent(redirect)}`;
    return (
        <main className="mx-auto max-w-[680px] px-4 py-16 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-50 text-2xl text-amber-600" aria-hidden="true">
                <i className="fa-solid fa-lock" />
            </span>
            <h1 className="mt-4 text-2xl font-black text-neutral-950">로그인이 필요합니다.</h1>
            <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                회원 정보는 본인 확인 후에만 볼 수 있습니다.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Link href={loginHref} className="btn btn-primary">로그인</Link>
                <Link href="/mypage" className="btn btn-secondary">마이페이지로</Link>
            </div>
        </main>
    );
}

export default function MypageSectionLayout({
    eyebrow,
    title,
    description,
    children,
}: {
    eyebrow: string;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <header>
                <p className="text-sm font-black text-indigo-700">{eyebrow}</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-950">{title}</h1>
                <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-neutral-600">{description}</p>
            </header>
            <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                <MypageSidebar />
                <div className="min-w-0">{children}</div>
            </div>
        </main>
    );
}
