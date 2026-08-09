"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ShowcasePost, ShowcaseTopic } from "@/lib/daeng-showcase";
import {
    buildShowcaseDeepLink,
    showcaseMemberShareCampaign,
} from "@/lib/daeng-showcase-share";

export type ShowcaseShareTarget =
    | { kind: "topic"; topic: ShowcaseTopic }
    | { kind: "post"; post: ShowcasePost };

type ShareNotice = {
    tone: "success" | "neutral" | "error";
    message: string;
};

async function copyText(value: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch {
        // Fall through to the selection-based copy for restricted webviews.
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

function shareCopy(target: ShowcaseShareTarget) {
    if (target.kind === "topic") {
        return {
            title: `${target.topic.title} | 오늘의 댕주제`,
            text: target.topic.prompt,
        };
    }
    return {
        title: target.post.topic
            ? `${target.post.topic.title} | 오늘의 댕자랑`
            : "오늘의 댕자랑",
        text: "댕다방에서 이 댕자랑을 함께 봐요.",
    };
}

export default function ShowcaseShareModal({
    target,
    onClose,
}: {
    target: ShowcaseShareTarget | null;
    onClose: () => void;
}) {
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const [busy, setBusy] = useState<"native" | "copy" | "">("");
    const [notice, setNotice] = useState<ShareNotice | null>(null);
    const copy = target ? shareCopy(target) : null;
    const shareUrl = useMemo(() => {
        if (!target) return "";
        const currentUrl = typeof window === "undefined"
            ? "https://www.daengdabang.com/daeng-showcase/"
            : window.location.href;
        if (target.kind === "topic") {
            return buildShowcaseDeepLink({
                baseUrl: target.topic.shareUrl || currentUrl,
                topicId: target.topic.topicId,
                postId: "",
                campaign: showcaseMemberShareCampaign(`topic_${target.topic.topicId}`),
            });
        }
        return buildShowcaseDeepLink({
            baseUrl: currentUrl,
            postId: target.post.postId,
            topicId: target.post.topic?.topicId || "",
            campaign: showcaseMemberShareCampaign(`post_${target.post.postId}`),
        });
    }, [target]);

    useEffect(() => {
        if (!target) return;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        closeButtonRef.current?.focus();
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => {
            window.removeEventListener("keydown", closeOnEscape);
            previousFocus?.focus();
        };
    }, [onClose, target]);

    if (!target || !copy) return null;

    const nativeShare = async () => {
        if (busy) return;
        if (typeof navigator.share !== "function") {
            setNotice({ tone: "neutral", message: "이 브라우저에서는 링크 복사를 이용해 주세요." });
            return;
        }
        setBusy("native");
        setNotice(null);
        try {
            await navigator.share({ title: copy.title, text: copy.text, url: shareUrl });
            setNotice({ tone: "success", message: "공유 창에 정확한 댕자랑 링크를 보냈어요." });
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                setNotice({ tone: "neutral", message: "공유를 취소했어요." });
            } else {
                setNotice({ tone: "error", message: "공유 창을 열지 못했어요. 링크 복사를 이용해 주세요." });
            }
        } finally {
            setBusy("");
        }
    };

    const copyLink = async () => {
        if (busy) return;
        setBusy("copy");
        setNotice(null);
        const copied = await copyText(shareUrl);
        setNotice(copied
            ? { tone: "success", message: "정확한 댕자랑 링크를 복사했어요." }
            : { tone: "error", message: "자동 복사가 막혀 있어요. 아래 주소를 길게 눌러 복사해 주세요." });
        setBusy("");
    };

    return (
        <div
            className="fixed inset-0 z-[2150] grid place-items-center bg-neutral-950/55 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="showcase-share-title"
                aria-describedby="showcase-share-description"
                className="w-full max-w-lg rounded-[30px] border border-white/90 bg-[#fffdf8] p-5 shadow-modal sm:p-6"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="ddb-crayon-kicker text-[10px]">SAFE SHARE CARD</p>
                        <h2 id="showcase-share-title" className="ddb-crayon-title mt-1 text-3xl text-neutral-950">댕자랑 공유카드</h2>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        disabled={Boolean(busy)}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        aria-label="공유카드 닫기"
                    >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </div>

                <p id="showcase-share-description" className="mt-3 text-xs font-bold leading-5 text-neutral-600">
                    버튼을 눌렀을 때만 기기의 공유 창을 열거나 링크를 복사합니다. 자동 게시나 외부 메시지 발송은 하지 않아요.
                </p>

                <div className="mt-5 overflow-hidden rounded-[26px] border border-rose-200 bg-gradient-to-br from-rose-50 via-amber-50 to-cyan-50 shadow-sm">
                    {target.kind === "post" ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element -- deletion-aware API media is rendered as the selected public share preview. */}
                            <img
                                src={target.post.imageUrl}
                                alt="공유할 댕자랑 사진 미리보기"
                                width={target.post.imageWidth}
                                height={target.post.imageHeight}
                                className="max-h-72 w-full bg-white/60 object-contain"
                            />
                        </>
                    ) : (
                        <div className="grid h-36 place-items-center" aria-hidden="true">
                            <span className="ddb-crayon-icon grid h-20 w-20 place-items-center rounded-[26px] text-3xl text-white" data-crayon-tone="coral">
                                <i className="fa-solid fa-paw" />
                            </span>
                        </div>
                    )}
                    <div className="p-5">
                        <p className="ddb-crayon-kicker text-[10px]">오늘의 댕주제 · 댕자랑</p>
                        <h3 className="ddb-crayon-title mt-1 break-keep text-2xl text-neutral-950">{copy.title}</h3>
                        <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-xs font-bold leading-5 text-neutral-650">
                            {target.kind === "post" ? target.post.caption : target.topic.prompt}
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => void nativeShare()}
                        disabled={Boolean(busy)}
                        className="ddb-crayon-link inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black disabled:opacity-55"
                    >
                        <i className={`fa-solid ${busy === "native" ? "fa-spinner fa-spin" : "fa-arrow-up-from-bracket"}`} aria-hidden="true" />
                        공유 창 열기
                    </button>
                    <button
                        type="button"
                        onClick={() => void copyLink()}
                        disabled={Boolean(busy)}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-indigo-200 bg-white px-5 text-sm font-black text-indigo-900 hover:bg-indigo-50 disabled:opacity-55"
                    >
                        <i className={`fa-solid ${busy === "copy" ? "fa-spinner fa-spin" : "fa-link"}`} aria-hidden="true" />
                        링크 복사
                    </button>
                </div>

                <input
                    aria-label="공유할 정확한 댕자랑 링크"
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                    value={shareUrl}
                    className="mt-3 h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[10px] font-bold text-neutral-600 outline-none focus:border-indigo-400"
                />

                {notice ? (
                    <p
                        role={notice.tone === "error" ? "alert" : "status"}
                        aria-live="polite"
                        className={`mt-3 rounded-xl border px-3 py-2 text-xs font-bold ${
                            notice.tone === "success"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                : notice.tone === "error"
                                    ? "border-rose-200 bg-rose-50 text-rose-900"
                                    : "border-neutral-200 bg-neutral-50 text-neutral-700"
                        }`}
                    >
                        {notice.message}
                    </p>
                ) : null}
            </section>
        </div>
    );
}
