import type { Metadata } from "next";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
    title: "회원가입",
    description: "댕다방 회원가입 — 5단계로 간편하게 가입하고 펫렌즈 분석 무료 체험",
};

export default function SignupPage() {
    return <SignupForm />;
}
