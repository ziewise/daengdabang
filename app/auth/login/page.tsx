"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    customerApiErrorMessage,
    ddbApiReady,
    loadCurrentCustomer,
    loadPetProfilesSmart,
    loginCustomer,
    setCustomerToken,
} from "@/lib/customer-api";
import { useAuth, type PetProfile } from "@/lib/store";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError("");
        if (!ddbApiReady()) {
            setCustomerToken();
            setError("회원 로그인을 사용하려면 운영 API 주소가 먼저 연결되어야 합니다.");
            return;
        }
        if (!email.trim() || !password.trim()) {
            setError("이메일과 비밀번호를 입력해 주세요.");
            return;
        }

        setLoading(true);
        try {
            const token = await loginCustomer({ email: email.trim(), password: password.trim() });
            const apiAccessToken = token.access_token;
            setCustomerToken(apiAccessToken);

            const [apiUser, savedPets] = await Promise.all([
                loadCurrentCustomer(apiAccessToken).catch(() => null),
                loadPetProfilesSmart(apiAccessToken).catch(() => [] as PetProfile[]),
            ]);
            const pets = savedPets || [];
            const userName = apiUser?.name || name.trim() || email.split("@")[0] || "댕다방 회원";

            login({
                apiUserId: apiUser?.id,
                apiAccessToken,
                name: userName,
                email: apiUser?.email || email.trim(),
                joinedAt: new Date().toISOString(),
                pets,
            });
            router.push("/mypage");
        } catch (err) {
            setCustomerToken();
            setError(customerApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="mx-auto max-w-md px-4 py-10">
            <h1 className="text-3xl font-black tracking-tight text-neutral-950">로그인</h1>
            <SocialAuthButtons mode="login" />
            <form onSubmit={submit} className="surface mt-6 grid gap-4 p-5">
                {!ddbApiReady() && (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-bold leading-6 text-amber-800">
                        운영 API가 연결되면 이메일 로그인과 간편로그인이 활성화됩니다.
                    </p>
                )}
                {error && (
                    <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-bold leading-6 text-rose-700">
                        {error}
                    </p>
                )}
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
                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                    <i className="fa-regular fa-user text-xs" />
                    {loading ? "로그인 중" : "로그인"}
                </button>
            </form>
            {/* 회원가입 — 보조 액션이라 로그인보다 작은 아웃라인 버튼 */}
            <div className="mt-5 flex justify-center">
                <Link
                    href="/auth/signup"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-bold text-neutral-600 transition-colors hover:border-aurora-indigo hover:text-aurora-indigo"
                >
                    <i className="fa-solid fa-user-plus text-xs" />
                    회원가입
                </Link>
            </div>
        </main>
    );
}
