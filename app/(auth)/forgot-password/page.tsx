import type { Metadata } from "next";
import ForgotForm from "./ForgotForm";

export const metadata: Metadata = {
    title: "비밀번호 찾기",
    description: "댕다방 비밀번호 재설정 — 가입하신 이메일로 재설정 링크 발송",
};

export default function ForgotPasswordPage() {
    return <ForgotForm />;
}
