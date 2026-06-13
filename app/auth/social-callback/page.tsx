"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadPetProfilesSmart, setCustomerToken } from "@/lib/customer-api";
import { useAuth, type PetProfile } from "@/lib/store";

function cleanReturnTo(value: string | null) {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return "/mypage";
    return value;
}

export default function SocialCallbackPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [error, setError] = useState("");

    useEffect(() => {
        const run = async () => {
            const hash = window.location.hash.replace(/^#/, "");
            const params = new URLSearchParams(hash);
            const token = params.get("access_token") || "";
            if (!token) {
                setError("간편로그인 정보를 확인하지 못했습니다.");
                return;
            }

            const email = params.get("email") || "";
            const name = params.get("name") || email.split("@")[0] || "댕다방 회원";
            const returnTo = cleanReturnTo(params.get("return_to"));
            setCustomerToken(token);

            let pets: PetProfile[] = [];
            try {
                pets = (await loadPetProfilesSmart(token)) || [];
            } catch {
                pets = [];
            }

            login({
                apiAccessToken: token,
                name,
                email,
                joinedAt: new Date().toISOString(),
                pets,
            });
            router.replace(returnTo);
        };
        run();
    }, [login, router]);

    return (
        <main className="mx-auto max-w-md px-4 py-16 text-center">
            <div className="surface p-6">
                <h1 className="text-2xl font-black text-neutral-950">
                    {error ? "간편로그인 실패" : "간편로그인 처리 중"}
                </h1>
                {error ? (
                    <>
                        <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">{error}</p>
                        <Link href="/auth/login" className="btn btn-primary mt-5">
                            로그인으로 돌아가기
                        </Link>
                    </>
                ) : (
                    <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                        계정 정보를 불러오고 있습니다.
                    </p>
                )}
            </div>
        </main>
    );
}
