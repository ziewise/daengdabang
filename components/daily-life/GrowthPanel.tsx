"use client";

/**
 * GrowthPanel — 매일 댕생활 탭 ② "성장" · 프리미엄 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 *  1) 성장 카드 — 짙은 보랏빛 메탈 카드. 손가락 따라 기울며 은은한 광택이 흐르고, 누르면 뒤집혀 XP 모으는 법
 *     (로그인 전 미리보기 — 숫자는 로그인 후 실제 기록) + 이번 주 출석 · 이번 달 AI 체크 목표
 *  2) 기록 나누기 — 기존 GrowthShareCard 와 같은 동작 (공유창 → 복사 → 직접 복사 순 · 같은 분석 이벤트)
 *  3) 맞춤 상품 연결 — 기존 CommerceBridge 와 같은 문구 · 주소 규칙 (content.commerce)
 */

import Link from "next/link";
import { useRef, useState } from "react";
import { copyText } from "@/components/growth/GrowthShareCard";
import type { GrowthHubPublishedContent } from "@/lib/growth-content";
import { growthSharePayload, type GrowthShareKind } from "@/lib/growth-programs";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import { IconDot, LOGIN_HREF, Pill, Reveal, SectionHead, TEXT, TONES } from "./ui";

type Props = {
    member: boolean;
    hasPet: boolean;
    hasAiRecord: boolean;
    commerce: GrowthHubPublishedContent["commerce"];
};

export default function GrowthPanel({ member, hasPet, hasAiRecord, commerce }: Props) {
    return (
        <div className="space-y-6">
            <Reveal>
                <SectionHead kicker="MY GROWTH" title="차곡차곡 쌓이는 우리 아이 성장" tone={TONES.violet}>
                    출근도장과 돌봄을 마칠 때마다 XP가 쌓이고 레벨이 올라요.
                </SectionHead>
            </Reveal>
            {!member && <Reveal order={1}><GrowthCard /></Reveal>}
            <Reveal order={2}><ShareList canShareAiRecord={hasAiRecord} isMember={member} /></Reveal>
            <Reveal order={3}><CommerceCard isMember={member} hasPet={hasPet} hasAiRecord={hasAiRecord} content={commerce} /></Reveal>
        </div>
    );
}

// 뒷면 — XP 모으는 법 (회원 대시보드의 출근도장 · 오늘 할 일 · 사진 분석)
const XP_WAYS = [
    { icon: "fa-calendar-check", label: "출근도장" },
    { icon: "fa-person-walking", label: "산책 20분" },
    { icon: "fa-eye", label: "눈 상태 확인" },
    { icon: "fa-camera", label: "사진 건강 분석" },
];

/** 로그인 전 — 메탈 성장 카드 미리보기 */
function GrowthCard() {
    const ref = useRef<HTMLDivElement>(null);
    const [flipped, setFlipped] = useState(false);

    // 기울기 — 손가락(마우스) 위치로 --rx · --ry(기울기) · --mx · --my(광택 위치)
    const onMove = (event: React.PointerEvent) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = (event.clientX - r.left) / r.width;
        const y = (event.clientY - r.top) / r.height;
        el.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
        el.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
        el.style.setProperty("--mx", `${x * 100}%`);
        el.style.setProperty("--my", `${y * 100}%`);
    };
    const onLeave = () => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
        el.style.setProperty("--mx", "30%");
        el.style.setProperty("--my", "20%");
    };

    return (
        <section aria-label="성장 카드 미리보기 (로그인 전)">
            <div ref={ref} className="pv-metal-wrap" onPointerMove={onMove} onPointerLeave={onLeave}>
                <button
                    type="button"
                    onClick={() => setFlipped((f) => !f)}
                    className={`pv-metal ${flipped ? "is-flipped" : ""}`}
                    aria-label={flipped ? "성장 카드 앞면 보기" : "성장 카드 뒤집어 XP 모으는 법 보기"}
                >
                    {/* 앞면 */}
                    <span className="pv-metal-face pv-metal-front">
                        <span className="pv-metal-sheen" aria-hidden="true" />
                        <span className="relative flex h-full flex-col justify-between p-5 text-left text-white">
                            <span className="flex items-start justify-between">
                                <span className="pv-kicker text-white/55">DAENGDABANG · GROWTH</span>
                                <span className="rounded-full px-2 py-1 text-[10.5px] font-bold text-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,.25)]">미리보기</span>
                            </span>
                            <span>
                                <span className="pv-kicker block text-white/55">LEVEL 1</span>
                                <span className="mt-1 block font-['Cafe24Ssurround',var(--font-wanted-sans)] text-[28px] leading-none tracking-[-0.03em]">건강 새싹</span>
                                <span className="mt-2 block text-[12px] text-white/60">다음 단계 · 우리 아이 지킴이</span>
                            </span>
                            <span className="block">
                                <span className="flex justify-between text-[11px] font-semibold text-white/60"><span>XP</span><span>로그인하면 0부터 시작</span></span>
                                <span className="mt-1.5 block h-[5px] overflow-hidden rounded-full bg-white/15">
                                    <span className="pv-metal-bar block h-full w-[34%] rounded-full" />
                                </span>
                            </span>
                        </span>
                    </span>
                    {/* 뒷면 — XP 모으는 법 */}
                    <span className="pv-metal-face pv-metal-back">
                        <span className="flex h-full flex-col p-5 text-left">
                            <span className="pv-kicker" style={{ color: TONES.violet.accent }}>HOW TO GROW</span>
                            <span className="pv-h3 mt-1">이렇게 하면 XP가 쌓여요</span>
                            <span className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                                {XP_WAYS.map((w) => (
                                    <span key={w.label} className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: TEXT }}>
                                        <i className={`fa-solid ${w.icon} w-4 text-center text-[13px]`} style={{ color: TONES.violet.accent }} aria-hidden="true" />{w.label}
                                    </span>
                                ))}
                            </span>
                            <span className="pv-small mt-auto">카드를 누르면 앞면으로 돌아가요</span>
                        </span>
                    </span>
                </button>
            </div>

            {/* 목표 두 칸 */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
                {[
                    { label: "이번 주 출석", goal: "7", unit: "일", tone: TONES.blue },
                    { label: "이번 달 AI 체크", goal: "5", unit: "회", tone: TONES.green },
                ].map((g) => (
                    <div key={g.label} className="pv-card px-4 py-3.5">
                        <p className="pv-small">{g.label}</p>
                        <p className="mt-1 flex items-baseline gap-1">
                            <span className="pv-num text-[13px] text-[#b4a8a2]">0 /</span>
                            <span className="pv-num text-[24px] leading-none" style={{ color: g.tone.accent }}>{g.goal}</span>
                            <span className="text-[12px] font-bold text-[#8c7f78]">{g.unit}</span>
                        </p>
                    </div>
                ))}
            </div>
            <Link href={LOGIN_HREF} className="pv-btn mt-3 w-full">로그인하고 성장 시작하기</Link>
        </section>
    );
}

type ShareNotice = { kind: GrowthShareKind; tone: "success" | "neutral" | "error"; message: string; fallbackUrl?: string };

/** 기록 나누기 — 기존 GrowthShareCard 와 같은 공유 순서 · 문구 · 분석 이벤트 */
function ShareList({ canShareAiRecord, isMember }: { canShareAiRecord: boolean; isMember: boolean }) {
    const [busy, setBusy] = useState<GrowthShareKind | null>(null);
    const [notice, setNotice] = useState<ShareNotice | null>(null);

    const share = async (kind: GrowthShareKind) => {
        if (busy) return;
        setBusy(kind);
        setNotice(null);
        const payload = growthSharePayload(kind, window.location.origin);
        const eventName = kind === "care_result" ? "growth_result_shared" : "growth_invite_shared";
        try {
            // 1) 휴대폰 공유창
            if (navigator.share) {
                try {
                    await navigator.share(payload);
                    setNotice({ kind, tone: "success", message: "공유 창으로 안전한 문구를 보냈어요." });
                    trackStorefrontEvent(eventName, { surface: "treasure_mine", shareKind: kind, method: "web_share", outcome: "completed" });
                    return;
                } catch (error) {
                    if (error instanceof DOMException && error.name === "AbortError") {
                        setNotice({ kind, tone: "neutral", message: "공유를 취소했어요." });
                        trackStorefrontEvent(eventName, { surface: "treasure_mine", shareKind: kind, method: "web_share", outcome: "cancelled" });
                        return;
                    }
                }
            }
            // 2) 복사 → 3) 막히면 직접 복사할 링크 보여 주기
            const copied = await copyText(`${payload.text}\n${payload.url}`);
            if (copied) {
                setNotice({ kind, tone: "success", message: "개인정보 없는 문구와 초대 링크를 복사했어요." });
                trackStorefrontEvent(eventName, { surface: "treasure_mine", shareKind: kind, method: "clipboard", outcome: "completed" });
            } else {
                setNotice({ kind, tone: "error", message: "자동 복사가 막혀 있어요. 아래 링크를 길게 눌러 복사해 주세요.", fallbackUrl: payload.url });
                trackStorefrontEvent(eventName, { surface: "treasure_mine", shareKind: kind, method: "manual_copy", outcome: "fallback_shown" });
            }
        } finally {
            setBusy(null);
        }
    };

    const row = "pv-row pv-press w-full text-left";
    const chevron = <i className="fa-solid fa-chevron-right ml-auto text-[12px] text-[#c9bfb9]" aria-hidden="true" />;

    return (
        <section aria-labelledby="pv-share-title">
            <div className="flex flex-wrap items-center gap-2 px-0.5">
                <p className="pv-kicker" style={{ color: TONES.rose.accent }}>SAFE SHARE</p>
                <Pill tone={TONES.green}><i className="fa-solid fa-shield-heart" aria-hidden="true" />개인정보 없는 공유</Pill>
            </div>
            <h3 id="pv-share-title" className="pv-h3 mt-1.5 px-0.5">건강 상세는 빼고, 돌봄 습관만 나눠요</h3>
            <p className="pv-body mt-1 px-0.5 text-[13px]">공유 문구에는 반려견 이름·사진·증상·AI 건강 결과가 들어가지 않습니다. 링크에는 유입 경로를 확인하는 캠페인 값만 붙어요.</p>

            <div className="pv-card mt-3 overflow-hidden">
                {/* 줄 1 — AI 기록 공유(회원 · 기록 있음) / AI 기록 만들기(회원) / 로그인(비회원) */}
                {canShareAiRecord ? (
                    <button type="button" onClick={() => void share("care_result")} disabled={busy !== null} className={row}>
                        <IconDot icon={busy === "care_result" ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"} tone={TONES.violet} />
                        <span className="pv-h3 text-[14.5px]">AI 기록 안전 공유</span>{chevron}
                    </button>
                ) : isMember ? (
                    <Link href="/pet-lens/" className={row}>
                        <IconDot icon="fa-camera" tone={TONES.violet} />
                        <span className="pv-h3 text-[14.5px]">AI 기록 만들고 공유</span>{chevron}
                    </Link>
                ) : (
                    <Link href={LOGIN_HREF} className={row}>
                        <IconDot icon="fa-lock" tone={TONES.violet} />
                        <span className="pv-h3 text-[14.5px]">로그인 후 AI 기록 공유</span>{chevron}
                    </Link>
                )}
                {/* 줄 2 — 친구 초대 (누구나) */}
                <button type="button" onClick={() => void share("friend_invite")} disabled={busy !== null} className={row}>
                    <IconDot icon={busy === "friend_invite" ? "fa-spinner fa-spin" : "fa-user-group"} tone={TONES.rose} />
                    <span className="pv-h3 text-[14.5px]">친구에게 보물광산 초대</span>{chevron}
                </button>
            </div>

            {notice && (
                <div
                    role={notice.tone === "error" ? "alert" : "status"}
                    aria-live="polite"
                    className="mt-2.5 rounded-2xl px-4 py-3 text-[13px] font-semibold"
                    style={notice.tone === "success" ? { background: TONES.green.tint, color: TONES.green.ink } : notice.tone === "error" ? { background: TONES.rose.tint, color: TONES.rose.ink } : { background: "rgba(31,26,24,.05)", color: "#6f625c" }}
                >
                    {notice.message}
                    {notice.fallbackUrl && (
                        <input readOnly value={notice.fallbackUrl} onFocus={(e) => e.currentTarget.select()} aria-label="직접 복사할 보물광산 링크"
                            className="mt-2 block w-full rounded-xl bg-white px-3 py-2 text-[12px] font-medium text-[#1f1a18] shadow-[inset_0_0_0_1px_rgba(31,26,24,.1)]" />
                    )}
                </div>
            )}
        </section>
    );
}

/** 맞춤 상품 연결 — 기존 CommerceBridge 와 같은 제목 우선순위 · 주소 규칙 */
function CommerceCard({ isMember, hasPet, hasAiRecord, content }: { isMember: boolean; hasPet: boolean; hasAiRecord: boolean; content: GrowthHubPublishedContent["commerce"] }) {
    const primaryHref = hasPet ? "/#recommend" : isMember ? "/my-pet/" : "/products/";
    const primaryLabel = hasPet ? "우리 아이 맞춤 상품 보기" : isMember ? "프로필 등록하고 맞춤 추천" : "전체 상품 둘러보기";
    const title = hasAiRecord ? content.aiRecordTitle : hasPet ? content.profileTitle : isMember ? content.memberTitle : content.guestTitle;
    return (
        <aside className="pv-card p-5" aria-label="돌봄 기록을 상품 선택으로 이어보기">
            <div className="flex items-start gap-3">
                <IconDot icon="fa-bag-shopping" tone={TONES.amber} size={42} />
                <div className="min-w-0">
                    <p className="pv-h3">{title}</p>
                    <p className="pv-small mt-1">{content.description}</p>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href={primaryHref} className="pv-btn min-h-[46px] px-3 text-[13.5px]">{primaryLabel}</Link>
                <Link href={content.secondaryCtaHref} className="pv-btn-ghost px-3 text-[13.5px]">{content.secondaryCtaLabel}</Link>
            </div>
        </aside>
    );
}
