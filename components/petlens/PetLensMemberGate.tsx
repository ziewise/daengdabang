"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, type MouseEvent } from "react";
import DaengLabServiceTitle from "@/components/petlens/DaengLabServiceTitle";
import {
    PETLENS_PROFILE_SETUP_HREF,
    petLensAuthHref,
} from "@/lib/petlens-routing";

type Props = {
    compact?: boolean;
    reason: "loading" | "login" | "profile" | "breed";
    service?: "petlens" | "daenglab";
    onNavigate?: () => void;
};

export default function PetLensMemberGate({ compact = false, reason, service = "petlens", onNavigate }: Props) {
    const router = useRouter();
    const daenglab = service === "daenglab";

    const navigateBeforeClose = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
        if (
            event.defaultPrevented
            || event.button !== 0
            || event.metaKey
            || event.ctrlKey
            || event.shiftKey
            || event.altKey
        ) {
            return;
        }

        const href = event.currentTarget.getAttribute("href");
        if (!href) return;

        // Closing the modal directly from Next Link's onClick can remove the
        // tapped anchor before mobile browsers finish client-side navigation.
        // Start navigation explicitly first, then let the root modal close.
        event.preventDefault();
        router.push(href);
        onNavigate?.();
    }, [onNavigate, router]);

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
    const message = daenglab
        ? needsLogin
            ? "댕랩 행동·소리 분석은 등록된 반려견 정보를 바탕으로 카메라·마이크 신호를 개별 분석하는 회원 전용 서비스입니다."
            : needsBreed
                ? "정확한 개별 분석을 위해 마이페이지에서 우리 아이의 실제 견종을 먼저 확인해 주세요."
                : "회원 프로필에 반려견을 등록하면 댕랩이 행동과 소리를 아이별로 살펴볼 수 있어요."
        : needsLogin
            ? "펫렌즈는 회원의 반려견 프로필을 기준으로 외형·체형·털 상태와 케어 포인트를 정리하는 회원 전용 기능입니다."
            : needsBreed
                ? "사진으로 견종을 다시 추측하지 않아요. 마이페이지에서 실제 견종을 확인하면 그 정보를 기준으로 분석합니다."
                : "회원 프로필에 등록된 반려견을 선택해야 사진 분석과 맞춤 케어를 시작할 수 있습니다.";

    return (
        <section
            className={`mx-auto grid place-items-center text-center ${compact ? "p-6" : "min-h-[420px] p-8"}`}
            data-petlens-member-gate
            data-daenglab-member-gate={daenglab || undefined}
        >
            <div className={`w-full max-w-md rounded-3xl border p-6 shadow-sm ${daenglab ? "border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-rose-50" : "border-indigo-100 bg-indigo-50/70"}`}>
                <span className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-xl shadow-sm ${daenglab ? "bg-gradient-to-br from-cyan-500 via-pink-500 to-amber-400 text-white" : "bg-white text-indigo-600"}`}>
                    <i className={`fa-solid ${needsLogin ? "fa-lock" : "fa-paw"}`} aria-hidden="true" />
                </span>
                {daenglab && (
                    <DaengLabServiceTitle
                        className="mt-4 justify-center"
                        suffixClassName="text-base font-black leading-tight text-neutral-950"
                    />
                )}
                <h2 className={`${daenglab ? "mt-2" : "mt-4"} text-xl font-black text-neutral-950`}>{title}</h2>
                <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">{message}</p>
                {needsLogin ? (
                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                        <Link
                            href={petLensAuthHref("signup")}
                            onClick={navigateBeforeClose}
                            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
                        >
                            회원가입하고 시작하기
                        </Link>
                        <Link
                            href={petLensAuthHref("login")}
                            onClick={navigateBeforeClose}
                            className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-indigo-200 bg-white px-4 text-sm font-black text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                        >
                            기존 회원 로그인
                        </Link>
                    </div>
                ) : (
                    <Link
                        href={PETLENS_PROFILE_SETUP_HREF}
                        onClick={navigateBeforeClose}
                        className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        마이페이지에서 등록·확인하기
                    </Link>
                )}
            </div>
        </section>
    );
}
