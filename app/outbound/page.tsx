import { Suspense } from "react";
import type { Metadata } from "next";
import OutboundRedirectClient from "./OutboundRedirectClient";

export const metadata: Metadata = {
    title: "외부 구매 사이트 이동 | 댕다방",
    description: "댕다방 외부 구매 사이트 이동 안내",
    robots: {
        index: false,
        follow: false,
    },
};

export default function OutboundPage() {
    return (
        <Suspense fallback={<div className="px-4 py-10 text-center text-sm font-black">이동 준비 중입니다.</div>}>
            <OutboundRedirectClient />
        </Suspense>
    );
}
