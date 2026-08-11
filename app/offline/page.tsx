import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "연결 확인 | 댕다방",
    robots: { index: false, follow: false },
};

export default function OfflinePage() {
    return (
        <section className="flex min-h-[70vh] items-center justify-center px-5 py-16">
            <div className="ddb-crayon-paper w-full max-w-md rounded-[2rem] border p-7 text-center sm:p-10">
                <span className="ddb-crayon-icon mx-auto grid h-16 w-16 place-items-center rounded-2xl" data-crayon-tone="teal">
                    <i className="fa-solid fa-wifi text-2xl" aria-hidden="true" />
                </span>
                <p className="ddb-crayon-kicker mt-6 text-sm">잠깐만 기다려 주세요</p>
                <h1 className="ddb-crayon-title mt-2 text-3xl">인터넷 연결을 확인해 주세요</h1>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                    연결이 돌아오면 매일 댕생활과 댕다방 연구소를 다시 이용할 수 있어요.
                </p>
                <Link href="/app/" className="ddb-crayon-link mt-7 inline-flex min-h-12 items-center justify-center rounded-2xl px-6">
                    앱 홈 다시 열기
                </Link>
            </div>
        </section>
    );
}
