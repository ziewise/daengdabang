"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { openChatWidget } from "@/lib/chat-widget-events";

// Compatibility entry for saved /chat links. The global widget owns the only transcript.
export default function ChatLaunchClient() {
    const params = useSearchParams();
    const opened = useRef(false);
    useEffect(() => {
        if (opened.current) return;
        opened.current = true;
        openChatWidget({ initialQuestion: params.get("q")?.trim() || undefined });
    }, [params]);
    return <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-2xl font-black">댕다방 AI 상담</h1>
        <p className="mt-4 text-neutral-600">열린 케어톡 창에서 상담을 이어가세요. 다른 메뉴를 둘러보면서도 같은 창에서 대화할 수 있어요.</p>
        <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => openChatWidget()} className="rounded-full bg-indigo-700 px-5 py-3 font-bold text-white">케어톡 열기</button>
            <Link href="/" className="rounded-full border px-5 py-3 font-bold">메인으로</Link>
        </div>
    </main>;
}
