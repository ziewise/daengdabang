/**
 * MypageGuestGate — 비회원 진입 차단 카드
 */
import Link from "next/link";

export default function MypageGuestGate() {
    return (
        <div className="max-w-md mx-auto my-16 md:my-24 p-8 md:p-12 text-center glass-card rounded-3xl">
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-aurora-indigo to-aurora-pink text-white flex items-center justify-center text-2xl md:text-3xl">
                <i className="fa-solid fa-lock" />
            </div>
            <h2 className="text-xl md:text-2xl font-black mb-2">로그인이 필요해요</h2>
            <p className="text-sm text-neutral-500 leading-relaxed mb-7">
                마이페이지는 회원만 이용할 수 있어요.<br />
                로그인하시면 펫 프로필·주문 내역·찜 목록을<br className="hidden md:inline" />
                한곳에서 관리할 수 있어요.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                    href="/login"
                    className="px-7 py-3 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold hover:opacity-90 transition"
                >
                    로그인
                </Link>
                <Link
                    href="/signup"
                    className="px-7 py-3 rounded-full bg-white border border-neutral-200 hover:border-aurora-indigo text-foreground text-sm font-extrabold transition"
                >
                    회원가입
                </Link>
            </div>
        </div>
    );
}
