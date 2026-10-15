"use client";

/**
 * CareTalkDrawer — 케어톡(AI 상담)을 어느 화면에서든 아래에서 올라오는 판으로 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 페이지로 넘어가지 않고 지금 화면 위에 올라온다. 안에는 기존 상담 화면(ChatPageClient)을 드로어 높이에 맞춰 그대로 쓴다.
 *  - 열기: 상단바 케어톡 버튼 · 앱 안의 /chat 링크(홈 "AI 상담" 등) · 상품 화면의 "상담하기"(openChatWidget 이벤트)
 *  - 닫기: 바깥 누르기 · 손잡이(마스킹테이프)를 아래로 끌기(110px 넘게) · 상담 화면의 닫기 · Esc
 *  - 한 번 연 뒤에는 닫아도 화면을 남겨 둬서(숨김) 다시 열면 대화가 이어진다. 열린 동안 뒤 화면 스크롤 잠금.
 * 스티커북 시안 꾸밈(상담 기능 · 문구는 그대로, 모양만):
 *  - 크림 점 모눈 속지 + 줄 없는 대화면 · 머리 왼쪽 케어톡 캐릭터 스티커(댕톡) · 형광펜 제목
 *  - 첫 화면: 푸들이 먼저 건네는 인사 말풍선 두 개(차례로) + 테이프로 붙인 예시 질문 메모지 4장(누르면 바로 질문)
 *  - 말풍선: 케어톡 = 흰 종이 카드 + 캐릭터 동그라미 · 내 말 = 분홍 다이컷 스티커
 *  - 입력줄: 둥근 종이 입력칸 + 자수 와펜 보내기 버튼(누르면 폭신하게 꺼짐)
 */

import Image from "next/image";
import { Suspense, useEffect, useRef, useState } from "react";
import ChatPageClient from "@/app/chat/ChatPageClient";
import { KIT_CSS } from "@/components/pwa/home-concepts/kit";
import { STICKER_CSS } from "@/components/pwa/home-concepts/sticker-kit";

/* 첫 화면 예시 질문 — 메모지 색 · 테이프 색 · 질문(누르면 그대로 보냄) */
const QUICK = [
    { color: "#fff6c9", tape: "rgba(255,200,215,.8)", text: "산책 후에 발을 자꾸 핥아요" },
    { color: "#ffe4ec", tape: "rgba(200,225,255,.85)", text: "사료를 바꿀 때 주의할 점은?" },
    { color: "#efe8ff", tape: "rgba(255,226,150,.85)", text: "눈곱이 평소보다 많아요" },
    { color: "#e1f4ea", tape: "rgba(255,200,215,.8)", text: "가까운 동물병원 찾고 싶어요" },
];

/* 케어톡 캐릭터 — 민트 테두리 동그라미 속 갈색 푸들(사용자 제작 댕톡.png → webp) */
const AVATAR_IMG = "/images/ui/stickers/caretalk-avatar.webp";

/** 머리 왼쪽 — 케어톡 캐릭터 스티커(흰 칼선) */
function Avatar() {
    return <Image src={AVATAR_IMG} alt="" width={96} height={96} priority className="ct-avatar h-11 w-11 shrink-0" />;
}

/** 첫 화면 — 푸들이 먼저 건네는 인사 말풍선 두 개(차례로) + 예시 질문 메모지(누르면 바로 질문) */
function Empty({ ask }: { ask: (question: string) => void }) {
    return (
        <div className="ct-empty space-y-2 pt-1">
            {/* 케어톡 말풍선과 같은 모양(data-chat-role) — 캐릭터 동그라미는 첫 줄에만 */}
            <div className="text-left" data-chat-role="assistant">
                <div data-chat-bubble className="ct-say inline-block max-w-[92%] px-4 py-2.5 text-[14px] font-bold leading-relaxed" style={{ ["--d" as string]: "120ms" }}>
                    안녕하세요! <span className="ct-mark">우리 아이 이야기</span>를 편하게 들려주세요
                </div>
            </div>
            <div className="ct-follow pl-11 text-left">
                <div data-chat-bubble className="ct-say ct-plain inline-block max-w-[92%] px-4 py-2.5 text-[13px] font-medium leading-relaxed" style={{ ["--d" as string]: "520ms" }}>
                    건강·생활 고민부터 사료와 용품 비교까지, 필요한 내용만 차근차근 정리해 드릴게요.
                </div>
            </div>
            {/* 예시 질문 — 테이프로 살짝 붙여 둔 파스텔 메모지 2×2(크기는 같게, 기울기는 아주 살짝만). 누르면 바로 질문 */}
            <div className="pl-11 pt-4">
                <p className="ah-display mb-3 flex items-center gap-1.5 text-[12px] text-[#c4567a]">
                    <i aria-hidden="true" className="fa-solid fa-paw text-[10px]" />이렇게 물어봐도 돼요
                </p>
                <div className="grid grid-cols-2 gap-x-2.5 gap-y-3.5">
                    {QUICK.map((q, i) => (
                        <button key={q.text} type="button" onClick={() => ask(q.text)}
                            className="ct-quick ah-display relative flex min-h-[3.6rem] items-center break-keep px-3.5 pb-2.5 pt-3 text-left text-[13px] leading-snug text-[#5a4038]"
                            style={{ background: q.color, ["--d" as string]: `${900 + i * 90}ms`, ["--qr" as string]: `${[-1, 0.8, 0.7, -0.9][i]}deg` }}>
                            <span aria-hidden="true" className="st-tape absolute -top-1.5 left-1/2 h-3 w-9 -translate-x-1/2" style={{ background: q.tape, rotate: `${[-4, 3, 5, -3][i]}deg` }} />
                            {q.text}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* 상담 화면에 넘길 꾸밈 — 한 번만 만들어 둠 */
const SKIN = { avatar: <Avatar />, title: "케어톡", Empty };

export default function CareTalkDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    // 처음 열 때 상담 화면을 만든다 (그 전엔 불러오지 않음)
    const [mounted, setMounted] = useState(false);
    const [drag, setDrag] = useState(0); // 손잡이를 아래로 끈 거리(px)
    const dragStartRef = useRef<number | null>(null);

    useEffect(() => {
        if (!open) return;
        const t = window.setTimeout(() => setMounted(true), 0);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => {
            window.clearTimeout(t);
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    // 손잡이 끌기 — 아래로만, 110px 넘으면 닫기
    const onPointerDown = (event: React.PointerEvent) => {
        dragStartRef.current = event.clientY;
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: React.PointerEvent) => {
        if (dragStartRef.current === null) return;
        setDrag(Math.max(0, event.clientY - dragStartRef.current));
    };
    const onPointerUp = () => {
        if (dragStartRef.current === null) return;
        dragStartRef.current = null;
        if (drag > 110) onClose();
        setDrag(0);
    };

    if (!mounted && !open) return null;

    return (
        <div className={`ct-root fixed inset-0 z-[2400] ${open ? "is-open" : ""}`} aria-hidden={!open}>
            {/* 뒤 화면 어둡게 — 누르면 닫힘 */}
            <button type="button" tabIndex={-1} className="ct-dim absolute inset-0 bg-[#2b2422]/45" onClick={onClose} aria-label="케어톡 닫기" />
            <section
                role="dialog"
                aria-modal="true"
                aria-label="케어톡 AI 상담"
                className="ct-sheet absolute inset-x-0 bottom-0 mx-auto flex h-[92dvh] max-w-xl flex-col rounded-t-[28px]"
                style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
            >
                {/* 손잡이 — 마스킹테이프 한 조각, 아래로 끌어 닫기 */}
                <div
                    className="flex h-8 shrink-0 cursor-grab touch-none items-center justify-center"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    aria-hidden="true"
                >
                    <span className="st-tape block h-3.5 w-16" style={{ background: "repeating-linear-gradient(90deg, rgba(255,200,215,.9) 0 7px, rgba(255,226,234,.9) 7px 14px)", rotate: "-2deg" }} />
                </div>
                <div className="min-h-0 flex-1 pb-[env(safe-area-inset-bottom,0px)]">
                    {mounted && (
                        <Suspense fallback={<div className="ah-display grid h-full place-items-center text-sm text-[#9a8b84]">케어톡을 불러오는 중이에요</div>}>
                            <ChatPageClient embedded onClose={onClose} skin={SKIN} />
                        </Suspense>
                    )}
                </div>
            </section>
            <style dangerouslySetInnerHTML={{ __html: KIT_CSS + STICKER_CSS + CSS }} />
        </div>
    );
}

const CSS = `
/* 닫힘 — 아래로 내려가 숨음(화면은 남겨 둬서 대화 유지) · 열림 — 통통 올라옴 */
.ct-root { visibility: hidden; pointer-events: none; transition: visibility 0s linear .4s; }
.ct-root.is-open { visibility: visible; pointer-events: auto; transition: none; }
.ct-dim { opacity: 0; transition: opacity .3s ease; }
.ct-root.is-open .ct-dim { opacity: 1; }
.ct-sheet { transform: translateY(104%); transition: transform .42s cubic-bezier(.2, .9, .25, 1.04);
  background-color: #fffdf8; background-image: radial-gradient(circle, rgba(196,160,140,.26) 1px, transparent 1.3px); background-size: 15px 15px; background-position: 7px 7px;
  box-shadow: 0 -16px 40px -12px rgba(60,30,20,.45), inset 0 1.5px 0 #fff; }
.ct-root.is-open .ct-sheet { transform: none; }
@media (prefers-reduced-motion: reduce) { .ct-sheet, .ct-dim { transition: none; } }

/* ── 스티커북 꾸밈: 원래 상담 화면의 테두리 · 줄 · 남색을 걷고 종이 위에 ── */
[data-chat-skin] [data-chat-frame] { border: 0; background: transparent; padding: 0; box-shadow: none; border-radius: 0; }
[data-chat-skin] [data-chat-shell] { border: 0; background: transparent; border-radius: 0; color: #5a4038; }
/* 머리: 아래로 갈수록 종이에 스며드는 띠(대화가 밑으로 지나가도 읽기 편하게) */
[data-chat-skin] [data-chat-header] { border: 0; padding: 2px 16px 14px; background: linear-gradient(#fffdf8 72%, rgba(255,253,248,0)); }
[data-chat-skin] [data-chat-eyebrow] { display: none; }
[data-chat-skin] [data-chat-header] h1 { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; font-size: 21px; letter-spacing: -.02em; color: #5a4038;
  background: linear-gradient(transparent 58%, rgba(255,214,228,.9) 58%, rgba(255,214,228,.9) 92%, transparent 92%); padding: 0 .15em; }
[data-chat-skin] [data-chat-header] h1 + span { color: #b09a90; }
/* 머리 버튼: 흰 종이 동그라미 · 누르면 꾹 */
[data-chat-skin] [data-chat-header] button { border: 0; background: #fff; color: #c4567a; box-shadow: 0 0 0 1.5px #f3e3da, 0 5px 9px -6px rgba(150,90,70,.55);
  transition: transform .35s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
[data-chat-skin] [data-chat-header] button:active { transform: scale(.9); transition-duration: .1s; }
[data-chat-skin] [data-chat-header] label { border: 0; background: #fff0f4; color: #c4567a; }
.ct-avatar { rotate: -6deg; filter: drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 5px 6px rgba(120,70,60,.3)); }

/* 대화면: 줄 없는 종이 */
[data-chat-skin] [data-chat-scroll-region] { background: transparent !important; background-image: none !important; padding: 6px 16px 18px; }
/* 케어톡 말: 흰 종이 카드 + 왼쪽 위 캐릭터 동그라미 */
[data-chat-skin] [data-chat-role="assistant"] { position: relative; padding-left: 44px; }
[data-chat-skin] [data-chat-role="assistant"]::before { content: ""; position: absolute; left: 0; top: 0; width: 34px; height: 34px; border-radius: 999px;
  background: url(/images/ui/stickers/caretalk-avatar.webp) center / cover no-repeat;
  box-shadow: 0 0 0 2px #fff, 0 4px 8px -4px rgba(150,90,70,.5); }
[data-chat-skin] [data-chat-role="assistant"] [data-chat-bubble] { border: 0; background: #fff; color: #5a4038; border-radius: 6px 20px 20px 20px;
  box-shadow: inset 0 0 0 1.5px #f3e3da, 0 10px 18px -12px rgba(150,90,70,.55); }
/* 내 말: 분홍 다이컷 스티커(흰 칼선) */
[data-chat-skin] [data-chat-role="user"] [data-chat-bubble] { background: #f47aa0; color: #fff; border-radius: 20px 6px 20px 20px;
  box-shadow: 0 0 0 3px #fff, 0 0 0 4px rgba(200,140,140,.2), 0 8px 14px -8px rgba(200,80,120,.6); animation: ct-stick .45s cubic-bezier(.25,1.4,.45,1) both; }
@keyframes ct-stick { from { opacity: 0; transform: translateY(8px) scale(.92) rotate(2deg); } }
[data-chat-skin] [data-chat-product-suggestions] { border: 0; background: #fff; box-shadow: inset 0 0 0 1.5px #f3e3da, 0 10px 18px -12px rgba(150,90,70,.5); }

/* 첫 화면: 인사 말풍선이 차례로 톡 · 두 번째 말풍선은 연한 종이(꼬리 없이 이어 말하기) · 형광펜 강조 */
.ct-say { animation: ct-say .5s cubic-bezier(.25,1.4,.45,1) both; animation-delay: var(--d, 0ms); }
@keyframes ct-say { from { opacity: 0; transform: translateY(8px) scale(.94); } }
[data-chat-skin] .ct-follow [data-chat-bubble] { border: 0; background: #fff; color: #7a6a63; border-radius: 20px;
  box-shadow: inset 0 0 0 1.5px #f3e3da, 0 10px 18px -12px rgba(150,90,70,.55); }
.ct-mark { background: linear-gradient(transparent 58%, rgba(255,214,228,.95) 58%, rgba(255,214,228,.95) 92%, transparent 92%); padding: 0 .1em; }
/* 예시 질문 메모지: 둥근 모서리(오른쪽 아래만 살짝 말림) + 종이 그림자 + 아주 살짝 기울어 차례로 붙음
   누르면 종이에서 들렸다가 탄성으로 다시 붙음 */
.ct-quick { border-radius: 10px 10px 16px 10px; rotate: var(--qr); box-shadow: 0 7px 11px -8px rgba(110,70,55,.42), inset 0 0 0 1px rgba(255,255,255,.6);
  animation: ct-say .5s cubic-bezier(.25,1.4,.45,1) both; animation-delay: var(--d, 0ms);
  transition: transform .45s cubic-bezier(.3,1.6,.5,1), box-shadow .25s; -webkit-tap-highlight-color: transparent; }
.ct-quick:active { transform: translateY(-4px) scale(1.04); box-shadow: 0 14px 16px -10px rgba(110,70,55,.45), inset 0 0 0 1px rgba(255,255,255,.6); transition-duration: .12s; }
@media (prefers-reduced-motion: reduce) { .ct-say, .ct-quick { animation: none; } }

/* 입력줄: 종이에 스며드는 띠 + 둥근 종이 입력칸 + 자수 와펜 버튼 */
[data-chat-skin] [data-chat-composer] { border: 0; padding: 10px 14px 10px; background: linear-gradient(rgba(255,253,248,0), #fffdf8 26%); }
[data-chat-skin] [data-generation-reference-privacy-notice] { font-size: 11px; line-height: 1.5; text-align: center; color: #a8968d; font-weight: 500; }
[data-chat-skin] [data-chat-composer] input { height: 48px; border: 0; border-radius: 999px; padding: 0 18px; background: #fff; color: #5a4038;
  box-shadow: inset 0 0 0 1.5px #f3e3da, 0 6px 12px -8px rgba(150,90,70,.45); outline: none; }
[data-chat-skin] [data-chat-composer] input:focus { box-shadow: inset 0 0 0 2px #f6a9bf, 0 6px 12px -8px rgba(150,90,70,.45); }
/* 보내기 · 멈추기 · 사진: 자수 와펜 동그라미(테두리 = 새틴 실 사선 결, 안쪽 = 천 결 + 바느질 땀) */
[data-chat-skin] [data-chat-composer] button { width: 48px; height: 48px; min-height: 0; padding: 0; flex-shrink: 0; border-radius: 999px; border: 4px solid transparent;
  background: repeating-linear-gradient(0deg, rgba(255,255,255,.08) 0 1px, transparent 1px 3px) padding-box, linear-gradient(var(--pf, #f2789d), var(--pf, #f2789d)) padding-box,
              repeating-linear-gradient(72deg, var(--pe, #d9547d) 0 2px, var(--pe2, #ea6d93) 2px 3.4px) border-box;
  color: var(--pi, #fff); outline: 1.5px dashed var(--ps, rgba(255,255,255,.75)); outline-offset: -7px; text-shadow: 0 1px 0 rgba(0,0,0,.13);
  box-shadow: 0 7px 9px -6px rgba(110,60,60,.45); transition: transform .4s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
[data-chat-skin] [data-chat-composer] button:active { transform: scale(.92); transition-duration: .1s; }
[data-chat-skin] [data-chat-composer] button:disabled { opacity: .5; }
[data-chat-skin] [data-chat-composer] button span { display: none; }
[data-chat-skin] [data-chat-composer] button i { font-size: 15px; }
/* 사진 첨부 · 멈추기는 크림 와펜, 첨부 사진 칸의 작은 버튼은 원래대로 */
[data-chat-skin] [data-chat-composer] button[type="button"] { --pf: #fff6ee; --pe: #f4a9bf; --pe2: #f8c3d2; --pi: #c4456f; --ps: rgba(226,107,145,.5); text-shadow: none; }
[data-chat-skin] [data-generation-reference-tray] button { width: auto; height: auto; border: 0; background: none; outline: 0; box-shadow: none; color: inherit; }
`;
