import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "로그인",
    description: "댕다방 회원 로그인 — 이메일·구글·카카오·네이버 소셜 로그인 지원",
};

export default function LegacyLoginPage() {
    redirect("/auth/login");
}
