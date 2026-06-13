"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadPetProfilesSmart, loginCustomer, setCustomerToken } from "@/lib/customer-api";
import { useAuth, type PetProfile } from "@/lib/store";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const userName = name.trim() || email.split("@")[0] || "댕다방 회원";
        let apiAccessToken = "";
        let pets: PetProfile[] = [];

        if (email.trim() && password.trim()) {
            try {
                const token = await loginCustomer({ email: email.trim(), password: password.trim() });
                apiAccessToken = token?.access_token || "";
                setCustomerToken(apiAccessToken);
                pets = (await loadPetProfilesSmart(apiAccessToken)) || [];
            } catch {
                setCustomerToken();
            }
        }

        login({
            apiAccessToken,
            name: userName,
            email: email.trim(),
            joinedAt: new Date().toISOString(),
            pets,
        });
        router.push("/mypage");
    };

    return (
        <main className="mx-auto max-w-md px-4 py-10">
            <h1 className="text-3xl font-black tracking-tight text-neutral-950">로그인</h1>
            <form onSubmit={submit} className="surface mt-6 grid gap-4 p-5">
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">이메일</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="input"
                        required
                        autoComplete="email"
                    />
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">이름</span>
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="input"
                        autoComplete="name"
                    />
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">비밀번호</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="input"
                        autoComplete="current-password"
                        placeholder="서버 계정 연동 시 입력"
                    />
                </label>
                <button type="submit" className="btn btn-primary w-full">
                    <i className="fa-regular fa-user text-xs" />
                    로그인
                </button>
            </form>
            <p className="mt-5 text-center text-sm font-bold text-neutral-600">
                처음이라면{" "}
                <Link href="/auth/signup" className="font-black text-indigo-700">
                    회원가입
                </Link>
            </p>
        </main>
    );
}
