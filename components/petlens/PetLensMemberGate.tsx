"use client";

import Link from "next/link";

type Props = {
    compact?: boolean;
    reason: "loading" | "login" | "profile" | "breed";
};

export default function PetLensMemberGate({ compact = false, reason }: Props) {
    if (reason === "loading") {
        return (
            <div className="grid min-h-48 place-items-center p-6 text-sm font-bold text-neutral-500">
                <span><i className="fa-solid fa-circle-notch fa-spin mr-2 text-indigo-600" />회원 정보를 확인하고 있어요</span>
            </div>
        );
    }

    const needsLogin = reason === "login";
    const needsBreed = reason === "breed";
    const title = needsLogin
        ? "로그인 후 이용할 수 있어요"
        : needsBreed
            ? "등록 견종을 먼저 확인해 주세요"
            : "반려견 프로필을 먼저 등록해 주세요";
    const message = needsLogin
        ? "펫렌즈는 회원의 반려견 프로필을 기준으로 외형·체형·털 상태와 케어 포인트를 정리하는 회원 전용 기능입니다."
        : needsBreed
            ? "사진으로 견종을 다시 추측하지 않아요. 마이페이지에서 실제 견종을 확인하면 그 정보를 기준으로 분석합니다."
            : "회원 프로필에 등록된 반려견을 선택해야 사진 분석과 맞춤 케어를 시작할 수 있습니다.";

    return (
        <section className={`mx-auto grid place-items-center text-center ${compact ? "p-6" : "min-h-[420px] p-8"}`} data-petlens-member-gate>
            <div className="w-full max-w-md rounded-3xl border border-indigo-100 bg-indigo-50/70 p-6 shadow-sm">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-xl text-indigo-600 shadow-sm">
                    <i className={`fa-solid ${needsLogin ? "fa-lock" : "fa-paw"}`} aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-xl font-black text-neutral-950">{title}</h2>
                <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">{message}</p>
                <Link
                    href={needsLogin ? "/auth/login" : "/mypage"}
                    className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
                >
                    {needsLogin ? "로그인하기" : "마이페이지에서 확인하기"}
                </Link>
            </div>
        </section>
    );
}
