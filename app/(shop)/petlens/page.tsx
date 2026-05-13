import type { Metadata } from "next";
import PetlensClient from "./PetlensClient";

export const metadata: Metadata = {
    title: "펫렌즈 — AI 분석",
    description: "사진 3장으로 견종·체형·취약 질환을 AI 분석하고 맞춤 상품·외부 쇼핑몰 안내까지",
};

export default function PetlensPage() {
    return <PetlensClient />;
}
