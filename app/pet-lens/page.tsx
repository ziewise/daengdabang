import type { Metadata } from "next";
import PetLensClient from "./PetLensClient";

export const metadata: Metadata = {
    title: "펫렌즈 | 댕다방",
    description: "반려견 정보 기반으로 댕다방 상품을 추천합니다.",
};

export default function PetLensPage() {
    return <PetLensClient />;
}
