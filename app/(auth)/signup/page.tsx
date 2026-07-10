import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "회원가입",
    description: "댕다방 회원가입 — 5단계로 간편하게 가입하고 펫렌즈 분석 무료 체험",
};

export default function SignupPage() {
    // Keep old links on the single, API-backed signup flow so photo/breed
    // confirmation cannot be bypassed through the legacy mock stepper.
    redirect("/auth/signup");
}
