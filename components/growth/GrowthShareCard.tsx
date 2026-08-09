"use client";

import { useState } from "react";
import Link from "next/link";
import {
    growthSharePayload,
    type GrowthShareKind,
} from "@/lib/growth-programs";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";

type ShareNotice = {
    kind: GrowthShareKind;
    tone: "success" | "neutral" | "error";
    message: string;
    fallbackUrl?: string;
};

async function copyText(value: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch {
        // Use the selection-based fallback below when clipboard permission is blocked.
    }

    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    let copied = false;
    try {
        copied = document.execCommand("copy");
    } catch {
        copied = false;
    } finally {
        field.remove();
    }
    return copied;
}

export default function GrowthShareCard({
    canShareAiRecord,
    isMember,
}: {
    canShareAiRecord: boolean;
    isMember: boolean;
}) {
    const [busy, setBusy] = useState<GrowthShareKind | null>(null);
    const [notice, setNotice] = useState<ShareNotice | null>(null);

    const share = async (kind: GrowthShareKind) => {
        if (busy) return;
        setBusy(kind);
        setNotice(null);
        const payload = growthSharePayload(kind, window.location.origin);
        const eventName = kind === "care_result" ? "growth_result_shared" : "growth_invite_shared";

        try {
            if (typeof navigator.share === "function") {
                try {
                    await navigator.share(payload);
                    setNotice({
                        kind,
                        tone: "success",
                        message: "공유 창으로 안전한 문구를 보냈어요.",
                    });
                    trackStorefrontEvent(eventName, {
                        surface: "treasure_mine",
                        shareKind: kind,
                        method: "web_share",
                        outcome: "completed",
                    });
                    return;
                } catch (error) {
                    if (error instanceof DOMException && error.name === "AbortError") {
                        setNotice({ kind, tone: "neutral", message: "공유를 취소했어요." });
                        trackStorefrontEvent(eventName, {
                            surface: "treasure_mine",
                            shareKind: kind,
                            method: "web_share",
                            outcome: "cancelled",
                        });
                        return;
                    }
                    // Some browsers expose Web Share but reject it in an embedded view.
                }
            }

            const copied = await copyText(`${payload.text}\n${payload.url}`);
            if (copied) {
                setNotice({
                    kind,
                    tone: "success",
                    message: "개인정보 없는 문구와 초대 링크를 복사했어요.",
                });
                trackStorefrontEvent(eventName, {
                    surface: "treasure_mine",
                    shareKind: kind,
                    method: "clipboard",
                    outcome: "completed",
                });
            } else {
                setNotice({
                    kind,
                    tone: "error",
                    message: "자동 복사가 막혀 있어요. 아래 링크를 길게 눌러 복사해 주세요.",
                    fallbackUrl: payload.url,
                });
                trackStorefrontEvent(eventName, {
                    surface: "treasure_mine",
                    shareKind: kind,
                    method: "manual_copy",
                    outcome: "fallback_shown",
                });
            }
        } finally {
            setBusy(null);
        }
    };

    return (
        <section className="ddb-crayon-paper rounded-[30px] border p-5 sm:p-6" aria-labelledby="growth-share-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                    <span className="ddb-crayon-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg" data-crayon-tone="coral">
                        <i className="fa-solid fa-share-nodes" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="ddb-crayon-kicker text-[11px]">SAFE SHARE</p>
                        <h2 id="growth-share-title" className="ddb-crayon-title mt-1 text-2xl text-neutral-950">건강 상세는 빼고, 돌봄 습관만 나눠요</h2>
                        <p className="mt-2 max-w-2xl text-xs font-bold leading-5 text-neutral-600 sm:text-sm">
                            공유 문구에는 반려견 이름·사진·증상·AI 건강 결과가 들어가지 않습니다. 링크에는 유입 경로를 확인하는 캠페인 값만 붙어요.
                        </p>
                    </div>
                </div>
                <span className="w-fit shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-800">
                    개인정보 없는 공유
                </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {canShareAiRecord ? (
                    <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void share("care_result")}
                        className="ddb-motion-lift flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-left text-sm font-black text-indigo-900 transition hover:border-indigo-400 disabled:cursor-wait disabled:opacity-60"
                    >
                        <span><i className="fa-solid fa-wand-magic-sparkles mr-2 text-indigo-500" aria-hidden="true" />AI 기록 안전 공유</span>
                        <i className={`fa-solid ${busy === "care_result" ? "fa-circle-notch fa-spin" : "fa-arrow-up-from-bracket"} text-xs`} aria-hidden="true" />
                    </button>
                ) : isMember ? (
                    <Link
                        href="/pet-lens/"
                        className="ddb-motion-lift flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-left text-sm font-black text-indigo-900 transition hover:border-indigo-400"
                    >
                        <span><i className="fa-solid fa-camera-retro mr-2 text-indigo-500" aria-hidden="true" />AI 기록 만들고 공유</span>
                        <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true" />
                    </Link>
                ) : (
                    <Link
                        href="/auth/login/?redirect=%2Ftreasure-mine%2F"
                        className="ddb-motion-lift flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-left text-sm font-black text-indigo-900 transition hover:border-indigo-400"
                    >
                        <span><i className="fa-solid fa-lock mr-2 text-indigo-500" aria-hidden="true" />로그인 후 AI 기록 공유</span>
                        <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true" />
                    </Link>
                )}
                <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void share("friend_invite")}
                    className="ddb-motion-lift flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-left text-sm font-black text-orange-900 transition hover:border-orange-400 disabled:cursor-wait disabled:opacity-60"
                >
                    <span><i className="fa-solid fa-user-group mr-2 text-orange-500" aria-hidden="true" />친구에게 보물광산 초대</span>
                    <i className={`fa-solid ${busy === "friend_invite" ? "fa-circle-notch fa-spin" : "fa-paper-plane"} text-xs`} aria-hidden="true" />
                </button>
            </div>

            {notice ? (
                <div
                    role={notice.tone === "error" ? "alert" : "status"}
                    aria-live="polite"
                    className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-bold leading-5 ${
                        notice.tone === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : notice.tone === "error"
                                ? "border-rose-200 bg-rose-50 text-rose-900"
                                : "border-neutral-200 bg-neutral-50 text-neutral-700"
                    }`}
                >
                    {notice.message}
                    {notice.fallbackUrl ? (
                        <input
                            aria-label="직접 복사할 보물광산 링크"
                            readOnly
                            onFocus={(event) => event.currentTarget.select()}
                            value={notice.fallbackUrl}
                            className="mt-2 h-10 w-full rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-neutral-800 outline-none focus:border-rose-500"
                        />
                    ) : null}
                </div>
            ) : null}
        </section>
    );
}
