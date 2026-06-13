import Link from "next/link";

export default function NotFound() {
    return (
        <main className="mx-auto max-w-[720px] px-4 py-16 text-center">
            <i className="fa-regular fa-compass text-5xl text-neutral-300" />
            <h1 className="mt-4 text-3xl font-black text-neutral-950">페이지를 찾을 수 없습니다.</h1>
            <div className="mt-6 flex justify-center gap-2">
                <Link href="/" className="btn btn-primary">홈</Link>
                <Link href="/products" className="btn btn-secondary">전체상품</Link>
            </div>
        </main>
    );
}
