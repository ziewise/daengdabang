/**
 * 페이지를 찾을 수 없음(404)
 * ---------------------------------------------------------------------
 * 2026-10-25 웹 겉모양: 웹 전용 조각(3D 그림 · 손글씨 꼬리표 · 안내 · 바로가기 네 칸)을 hidden 으로 두고
 * app/notfound-web.css 가 웹(html:not(.ddb-app-mode))에서만 보이게 · 꾸밈. 앱은 기존 화면(나침반 · 제목 · 두 단추) 그대로.
 */
import Link from "next/link";
import "./notfound-web.css";

/** 웹 바로가기 — 기존 페이지로만 연결 */
const QUICK = [
    { href: "/products", art: "/images/ui/shop-menu-all-128.webp", title: "전체상품", text: "댕다방 상품 둘러보기" },
    { href: "/treasure-mine", art: "/images/ui/menu-daily-treasure-128.webp", title: "매일 댕생활", text: "출근도장 · 돌봄 기록" },
    { href: "/pet-lens", art: "/images/ui/lab-tab-photo-160.webp", title: "댕다방 연구소", text: "사진 건강 분석" },
    { href: "/faq", art: "/images/ui/menu-cs-faq-128.webp", title: "고객센터", text: "자주 묻는 질문 · 문의" },
];

export default function NotFound() {
    return (
        <main className="mx-auto max-w-[720px] px-4 py-16 text-center" data-notfound-web>
            {/* 웹 전용 3D 그림 · 꼬리표 */}
            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
            <img src="/images/ui/stickers/search-empty.webp" alt="" aria-hidden="true" className="hidden nf-art" />
            <p className="hidden nf-kicker">PAGE NOT FOUND</p>
            <i className="fa-regular fa-compass text-5xl text-neutral-300" />
            <h1 className="mt-4 text-3xl font-black text-neutral-950">페이지를 찾을 수 없습니다.</h1>
            <p className="hidden nf-lead">주소가 바뀌었거나 없어진 페이지예요. 아래에서 가고 싶은 곳을 골라 주세요.</p>
            <div className="mt-6 flex justify-center gap-2">
                <Link href="/" className="btn btn-primary">홈</Link>
                <Link href="/products" className="btn btn-secondary">전체상품</Link>
            </div>
            {/* 웹 전용 바로가기 네 칸 */}
            <nav className="hidden nf-quick" aria-label="바로가기">
                {QUICK.map((item) => (
                    <Link key={item.href} href={item.href}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={item.art} alt="" aria-hidden="true" />
                        <b>{item.title}</b>
                        <small>{item.text}</small>
                    </Link>
                ))}
            </nav>
        </main>
    );
}
