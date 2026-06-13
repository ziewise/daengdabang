"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, type PetProfile } from "@/lib/store";

export default function SignupPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [petName, setPetName] = useState("");
    const [petSize, setPetSize] = useState<PetProfile["size"]>("medium");

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const pets: PetProfile[] = petName.trim()
            ? [{
                name: petName.trim(),
                size: petSize,
                age: "성견",
                coat: "medium",
                activity: "normal",
                concerns: ["일상 케어"],
                lastAnalyzedAt: new Date().toISOString(),
            }]
            : [];

        login({
            name: name.trim() || "댕다방 회원",
            email: email.trim(),
            phone: phone.trim(),
            joinedAt: new Date().toISOString(),
            pets,
        });
        router.push("/mypage");
    };

    return (
        <main className="mx-auto max-w-2xl px-4 py-10">
            <h1 className="text-3xl font-black tracking-tight text-neutral-950">회원가입</h1>
            <form onSubmit={submit} className="surface mt-6 grid gap-4 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">이름</span>
                        <input value={name} onChange={(event) => setName(event.target.value)} className="input" required autoComplete="name" />
                    </label>
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">이메일</span>
                        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" required autoComplete="email" />
                    </label>
                </div>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">휴대폰</span>
                    <input value={phone} onChange={(event) => setPhone(event.target.value)} className="input" autoComplete="tel" />
                </label>
                <div className="grid gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-[1fr_180px]">
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">반려견 이름</span>
                        <input value={petName} onChange={(event) => setPetName(event.target.value)} className="input" />
                    </label>
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">크기</span>
                        <select value={petSize} onChange={(event) => setPetSize(event.target.value as PetProfile["size"])} className="input">
                            <option value="small">소형</option>
                            <option value="medium">중형</option>
                            <option value="large">대형</option>
                        </select>
                    </label>
                </div>
                <button type="submit" className="btn btn-primary w-full">
                    <i className="fa-solid fa-user-plus text-xs" />
                    가입하기
                </button>
            </form>
            <p className="mt-5 text-center text-sm font-bold text-neutral-600">
                이미 계정이 있다면{" "}
                <Link href="/auth/login" className="font-black text-indigo-700">
                    로그인
                </Link>
            </p>
        </main>
    );
}
