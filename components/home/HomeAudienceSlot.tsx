"use client";

import { useAuth } from "@/lib/store";

type Props = {
    audience: "guest" | "member";
    children: React.ReactNode;
};

/**
 * 홈의 같은 기능을 로그인 상태에 따라 서로 다른 위치에 배치한다.
 * 서버와 첫 클라이언트 렌더에서는 비회원 슬롯만 보여 중복 id를 피하고,
 * 저장된 회원 상태를 확인한 뒤 회원 슬롯으로 자연스럽게 전환한다.
 */
export default function HomeAudienceSlot({ audience, children }: Props) {
    const { hydrated, user } = useAuth();
    const isMember = hydrated && Boolean(user);

    if (audience === "member") return isMember ? children : null;
    return isMember ? null : children;
}
