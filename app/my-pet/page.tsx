import type { Metadata } from "next";
import MyPetHub from "@/components/my-pet/MyPetHub";

export const metadata: Metadata = {
    title: "우리 아이 | 댕다방",
    description: "반려견 프로필과 AI 분석 기록, 최근 건강 관찰 리포트를 확인합니다.",
};

export default function MyPetPage() {
    return <MyPetHub />;
}
