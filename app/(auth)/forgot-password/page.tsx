import type { Metadata } from "next";
import ForgotForm from "./ForgotForm";

export const metadata: Metadata = {
    title: "비밀번호 재설정",
    description: "가입 이메일 확인 후 댕다방 비밀번호를 안전하게 재설정합니다.",
    robots: {
        index: false,
        follow: false,
    },
};

export default function ForgotPasswordPage() {
    return <ForgotForm />;
}
