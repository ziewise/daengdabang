"use client";

/**
 * 스티커북 댕자랑 부품 — 아래에서 올라오는 속지(Sheet) · 오늘의 한 장 올리기 · 게시물 상세 · 작성자 프로필 · 공유 · 신고 (로컬 시안 전용, 배포 X)
 * ---------------------------------------------------------------------
 * 문구 · 검사 규칙은 협업자 댕자랑(components/daeng-showcase · lib/daeng-showcase)과 같다:
 *  - 사진 1장 JPG · PNG · WebP · 8MB 이하(validateShowcaseImage) · 이야기 2~500자 · 공개 이름 2~30자 · 필수 공개 게시 동의 · 선택 공식 채널 소개 동의
 *  - 신고 이유 5가지 + 상세(선택, 300자) · 공유 = 공유 창 열기 / 링크 복사(협업자 buildShowcaseDeepLink · shareCopy · copyText 와 같은 주소 · 제목 · 복사)
 * 굿즈 공모전 비회원 고르기 속지(회원 로그인 / 이메일 1회 확인)도 여기.
 * 실제 연결(2026-10-16): 올리기는 부모가 협업자 createShowcasePost 로 보내고(진행률 그대로), 프로필은 loadShowcaseAuthorProfile 결과를 받는다.
 * 모양: 다이어리 속지(점 모눈, 줄 없음) · 마스킹테이프 손잡이 · 폴라로이드 · 메모지 · 라벨 스티커 · 체크 스티커 · 자수 와펜 버튼.
 */

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { copyText } from "@/components/growth/GrowthShareCard";
import { SHOWCASE_MAX_UPLOAD_BYTES, validateShowcaseImage } from "@/lib/daeng-showcase";
import { prepareUploadImage } from "@/lib/upload-image";
import { buildShowcaseDeepLink, showcaseMemberShareCampaign } from "@/lib/daeng-showcase-share";
import { haptic } from "./gestures";
import { TEXT, TEXT_SOFT } from "./kit";
import type { Post } from "./page-data";
import type { ProfileView } from "./show-feed";
import { Patch, Tape } from "./sticker-kit";

/* 공개 게시 · 공식 채널 동의 문구(협업자 작성 칸과 같음) */
const CONSENT_PUBLIC = "선택한 사진과 글, 공개 이름, 선택한 반려견 이름·견종이 누구나 보는 댕자랑 피드에 게시되는 것에 동의합니다. 직접 촬영했거나 게시 권한이 있는 사진만 사용하고, 사람 얼굴·연락처 등 개인정보가 보이는 사진은 올리지 않겠습니다.";
const CONSENT_CHANNEL = "운영자 검수 후 댕다방 공식 Instagram·Threads·Naver Blog에 이 게시물을 소개하는 데 동의합니다. 선택하지 않아도 피드 게시에는 영향이 없습니다.";
export const REPORT_REASONS = [
    { value: "spam", label: "광고·도배" },
    { value: "privacy", label: "개인정보 노출" },
    { value: "abuse", label: "괴롭힘·혐오 표현" },
    { value: "copyright", label: "저작권 침해" },
    { value: "other", label: "기타" },
] as const;

/** 공유할 것 — 게시물(주제 id · 이름 포함) 또는 오늘의 댕주제(서버 공유 주소 · 안내 글 포함) */
export type ShareTarget = {
    kind: "post" | "topic"; id: string; img?: string; text: string;
    topicId?: string; topicTitle?: string; // 게시물: 연결된 주제 · 댕주제: 주제 이름
    prompt?: string; shareUrl?: string; // 댕주제만: 안내 글 · 서버가 준 공유 주소(topic.shareUrl)
};
/** 정확한 공유 주소 — 웹 ShowcaseShareModal.shareUrl 과 같은 함수 · 같은 값(buildShowcaseDeepLink + showcaseMemberShareCampaign).
 *  author 는 비움: 웹은 프로필을 닫을 때 주소에서 author 를 지워 공유 링크에 남지 않음 → 같은 결과 */
function shareLinkOf(target: ShareTarget) {
    const currentUrl = typeof window === "undefined" ? "https://www.daengdabang.com/daeng-showcase/" : window.location.href;
    if (target.kind === "topic") {
        return buildShowcaseDeepLink({ baseUrl: target.shareUrl || currentUrl, topicId: target.id, postId: "", authorId: "", campaign: showcaseMemberShareCampaign(`topic_${target.id}`) });
    }
    return buildShowcaseDeepLink({ baseUrl: currentUrl, postId: target.id, topicId: target.topicId || "", authorId: "", campaign: showcaseMemberShareCampaign(`post_${target.id}`) });
}
/** 공유 창 제목 · 글 — 웹 ShowcaseShareModal.shareCopy 와 같음 */
function shareCopyOf(target: ShareTarget) {
    if (target.kind === "topic") return { title: `${target.topicTitle || ""} | 오늘의 댕주제`, text: target.prompt || "" };
    return { title: target.topicTitle ? `${target.topicTitle} | 오늘의 댕자랑` : "오늘의 댕자랑", text: "댕다방에서 이 댕자랑을 함께 봐요." };
}

/** 게시물 사진 — 방금 올린 사진(blob 주소)은 img, 나머지는 next/image */
export function PostPhoto({ src, sizes, className = "" }: { src: string; sizes: string; className?: string }) {
    // eslint-disable-next-line @next/next/no-img-element -- 사용자가 방금 고른 사진 미리보기(blob 주소)
    if (src.startsWith("blob:")) return <img src={src} alt="" className={`absolute inset-0 h-full w-full object-cover ${className}`} draggable={false} />;
    return <Image src={src} alt="" fill sizes={sizes} className={`object-cover ${className}`} draggable={false} />;
}

/** 작성자 동그라미(이름 첫 글자) — 모두 같은 크림(웹 댕자랑에는 공식 배지가 없음) */
export function AuthorDot({ name, size = "h-9 w-9 text-[14px]" }: { name: string; size?: string }) {
    return <span className={`ah-display grid shrink-0 place-items-center rounded-full ${size} bg-[#fff1c4] text-[#a8720f]`} style={{ boxShadow: "0 0 0 2px #fff, 0 3px 6px -3px rgba(90,60,50,.4)" }}>{name.slice(0, 1)}</span>;
}

/** 아래에서 올라오는 다이어리 속지 — 바깥 · 닫기 · Esc 로 닫힘, 열린 동안 뒤 화면 스크롤 잠금 */
export function Sheet({ open, onClose, title, children, label }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; label: string }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const id = window.setTimeout(() => setMounted(true), 0);
        return () => window.clearTimeout(id);
    }, []);
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
    }, [open, onClose]);
    if (!mounted || !open) return null;
    return createPortal(
        <div className="fixed inset-0 z-[2400]" role="dialog" aria-modal="true" aria-label={label}>
            <button type="button" tabIndex={-1} aria-label="닫기" className="sp-dim absolute inset-0 bg-[#3a2f2c]/35 backdrop-blur-[4px]" onClick={onClose} />
            <section className="sp-sheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] max-w-xl flex-col rounded-t-[28px]" style={{ color: TEXT }}>
                <div className="flex h-8 shrink-0 items-center justify-center">
                    <span aria-hidden="true" className="st-tape block h-3.5 w-16" style={{ background: "repeating-linear-gradient(90deg, rgba(255,200,215,.9) 0 7px, rgba(255,226,234,.9) 7px 14px)", rotate: "-2deg" }} />
                </div>
                <div className="flex items-center gap-2 px-5 pb-2">
                    <div className="min-w-0 flex-1">{title}</div>
                    <button type="button" onClick={onClose} aria-label="닫기" className="sp-close grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#c4567a]"><i aria-hidden="true" className="fa-solid fa-xmark" /></button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">{children}</div>
            </section>
        </div>,
        document.body,
    );
}

/** 체크 스티커 줄(동의) — disabled: 올리는 중엔 잠금(웹 작성 칸 disabled={submitting} 과 같음) */
function CheckSticker({ checked, onChange, children, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; disabled?: boolean }) {
    return (
        <label className={`flex items-start gap-2.5 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
            <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => { onChange(e.target.checked); haptic("light"); }} className="sr-only" />
            <span aria-hidden="true" className={`sp-check mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[7px] ${checked ? "is-on" : ""}`}>
                {checked ? <svg viewBox="0 0 28 28" className="h-5 w-5"><path d="M7 14 L12 19 L23 6" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className="st-check" /></svg> : null}
            </span>
            <span className="ah-light min-w-0 flex-1 text-[12.5px] leading-relaxed">{children}</span>
        </label>
    );
}

/* ───────── 오늘의 한 장 올리기 ───────── */
/** 올리기 값 — 협업자 CreateShowcasePostInput 과 같은 칸(사진 파일 · 글 · 공개 이름 · 반려견 · 동의 · 주제 참여) */
export type ComposerResult = { file: File; text: string; name: string; petProfileId?: number; consent: boolean; channel: boolean; topic: boolean };
export function ShowComposer({ open, onClose, onPublish, topicTitle, defaultTopic, defaultName, pets }: {
    open: boolean; onClose: () => void;
    /** 부모가 서버로 보냄 — 진행률(1~100)을 알려 주고, 실패하면 오류 문구를 담아 throw */
    onPublish: (r: ComposerResult, onProgress: (percent: number) => void) => Promise<void>;
    topicTitle: string | null; defaultTopic: boolean; defaultName: string; pets: { id: number; name: string; breed?: string }[];
}) {
    const [photo, setPhoto] = useState<string>(""); // 미리보기(blob 주소)
    const [file, setFile] = useState<File | null>(null);
    const [text, setText] = useState("");
    const [name, setName] = useState(""); // 비어 있으면 아래 shownName 이 기본 이름(로그인 정보가 늦게 와도 맞게)
    const [pet, setPet] = useState<number>(-1); // -1 = 표시하지 않기
    // 주제 참여 — 웹 ShowcaseComposer.topicChoice 와 같음: 직접 고르기 전(null)은 기본값(주제가 있으면 참여), 고른 값은 그 주제에만
    const [topicChoice, setTopicChoice] = useState<{ topic: string; joined: boolean } | null>(null);
    const joinTopic = topicTitle ? (topicChoice && topicChoice.topic === topicTitle ? topicChoice.joined : defaultTopic) : false;
    const setJoinTopic = (joined: boolean) => { if (topicTitle) setTopicChoice({ topic: topicTitle, joined }); };
    const [agree, setAgree] = useState(false);
    const [channel, setChannel] = useState(false);
    const [error, setError] = useState("");
    const [progress, setProgress] = useState<number | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    // 기본 이름 — 로그인 정보가 늦게 오면 그때 채움(사용자가 이미 고쳤으면 그대로)
    const [nameTouched, setNameTouched] = useState(false);
    const shownName = nameTouched ? name : name || defaultName;

    const pickPhoto = async (picked?: File) => {
        setError("");
        if (!picked) return;
        // 어떤 휴대폰 사진이든(이름표가 비었거나 다른 JPEG · HEIC 등 · 너무 큰 사진) 올릴 수 있게 맞춤 — lib/upload-image(2026-10-20)
        const file = await prepareUploadImage(picked, { maxBytes: SHOWCASE_MAX_UPLOAD_BYTES });
        const bad = validateShowcaseImage(file);
        if (bad) { setError(bad); haptic("light"); return; }
        if (photo) URL.revokeObjectURL(photo);
        setPhoto(URL.createObjectURL(file));
        setFile(file);
        haptic("medium");
    };
    const clearPhoto = () => { if (photo) URL.revokeObjectURL(photo); setPhoto(""); setFile(null); };
    // 올린 뒤 비우기 — 웹 submit 성공 뒤와 같음(주제 참여도 기본값으로: setTopicChoice(null))
    const reset = () => { clearPhoto(); setText(""); setPet(-1); setAgree(false); setChannel(false); setTopicChoice(null); setError(""); setProgress(null); };
    const locked = progress !== null; // 올리는 중 — 웹 disabled={submitting} 처럼 모든 칸 잠금
    // 공개하기 — 협업자 작성 칸과 같은 검사 · 같은 문구, 통과하면 부모가 createShowcasePost 로 보냄
    const submit = async () => {
        setError("");
        const caption = text.trim();
        const display = shownName.trim();
        if (!file) return setError("자랑할 사진 한 장을 선택해 주세요.");
        if (caption.length < 2 || caption.length > 500) return setError("글은 2자 이상 500자 이하로 적어 주세요.");
        if (display.length < 2 || display.length > 30) return setError("공개 이름은 2자 이상 30자 이하로 적어 주세요.");
        if (!agree) return setError("사진과 글의 공개 게시 동의를 확인해 주세요.");
        setProgress(1);
        try {
            await onPublish({ file, text: caption, name: display, petProfileId: pet >= 0 ? pets[pet]?.id : undefined, consent: agree, channel, topic: Boolean(topicTitle && joinTopic) }, setProgress);
            reset();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
            setProgress(null);
        }
    };

    return (
        <Sheet open={open} onClose={progress === null ? onClose : () => {}} label="오늘의 한 장 올리기"
            title={<><p className="ah-display text-[19px]"><span className="st-marker">오늘의 한 장 올리기</span></p><p className="ah-light mt-0.5 text-[11.5px]" style={{ color: TEXT_SOFT }}>회원 공개 게시 · 사진 1장</p></>}>
            {/* 사진 — 빈 폴라로이드 칸, 고르면 테이프로 붙음 */}
            <div className="flex justify-center pt-2">
                <label className={`sp-pol relative block w-[68%] cursor-pointer bg-white p-2 pb-7 ${photo ? "is-on" : ""}`} style={{ rotate: "-1.5deg" }}>
                    {photo ? <Tape className="-top-2 left-1/2 z-10 h-4 w-14 -translate-x-1/2" color="rgba(200,226,255,.9)" style={{ rotate: "-5deg" }} /> : null}
                    <span className={`relative grid aspect-square place-items-center overflow-hidden rounded-[4px] ${photo ? "" : "sp-hole"}`}>
                        {photo ? <PostPhoto src={photo} sizes="60vw" /> : (
                            <span className="flex flex-col items-center gap-1.5 text-center">
                                <Image src="/images/ui/stickers/caretalk-photo.webp" alt="" width={48} height={48} className="h-12 w-12" />
                                <span className="ah-display text-[13px] text-[#c4567a]">사진을 선택해 주세요</span>
                                <span className="ah-light text-[11px]" style={{ color: TEXT_SOFT }}>JPG · PNG · WebP / 최대 8MB</span>
                            </span>
                        )}
                    </span>
                    <span className="ah-display absolute inset-x-0 bottom-1.5 text-center text-[12px] text-[#e0557f]">{photo ? "다른 사진 고르기" : "눌러서 고르기"}</span>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" disabled={progress !== null} onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                </label>
            </div>
            {photo ? <p className="mt-2 text-center"><button type="button" onClick={clearPhoto} disabled={progress !== null} className="ah-light text-[11.5px] text-[#a8968d] underline decoration-dashed underline-offset-2">선택한 사진 지우기</button></p> : null}

            {/* 오늘의 이야기 — 메모지 */}
            <label className="sp-memo relative mt-5 block rounded-[12px] px-3.5 pb-2 pt-3" style={{ rotate: "0.4deg" }}>
                <span className="ah-display flex items-center justify-between text-[13px] text-[#8f5e12]">오늘의 이야기<span className="ah-light text-[11px]">{text.length}/500</span></span>
                <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} rows={4} maxLength={500} disabled={locked}
                    placeholder="산책에서 만난 작은 순간, 귀여운 표정, 함께 기억하고 싶은 오늘을 적어 주세요."
                    className="ah-light mt-1.5 w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-[#c9b48a]" />
            </label>

            {/* 피드에 보일 이름 — 라벨 스티커 */}
            <label className="sp-label mt-3 flex h-[48px] items-stretch">
                <span className="sp-stub grid w-24 shrink-0 place-items-center text-[11.5px]"><span className="ah-display">피드 이름</span></span>
                <input value={shownName} onChange={(e) => { setNameTouched(true); setName(e.target.value.slice(0, 30)); }} maxLength={30} disabled={locked} placeholder="피드에 보일 이름" className="ah-light min-w-0 flex-1 bg-transparent px-3.5 text-[14px] outline-none" />
            </label>

            {/* 함께 나온 반려견 — 스티커 고르기 */}
            <p className="ah-display mt-4 text-[13px] text-[#b07a8a]">함께 나온 반려견 <span className="ah-light text-[11px]" style={{ color: TEXT_SOFT }}>선택</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => setPet(-1)} disabled={locked} className={`sp-pet ah-display rounded-full px-3 py-1.5 text-[12.5px] ${pet === -1 ? "is-on" : ""}`}>표시하지 않기</button>
                {pets.map((p, i) => (
                    <button key={p.id} type="button" onClick={() => { setPet(i); haptic("light"); }} disabled={locked} className={`sp-pet ah-display rounded-full px-3 py-1.5 text-[12.5px] ${pet === i ? "is-on" : ""}`}>
                        <i aria-hidden="true" className="fa-solid fa-paw mr-1 text-[10px]" />{p.name}{p.breed ? ` · ${p.breed}` : ""}
                    </button>
                ))}
            </div>

            {/* 동의 — 댕주제 참여(주제 있을 때) · 필수 공개 게시 · 선택 공식 채널 */}
            <div className="sp-paper mt-4 space-y-3 rounded-[14px] px-3.5 py-3.5">
                {topicTitle ? <CheckSticker checked={joinTopic} onChange={setJoinTopic} disabled={locked}><b className="ah-display">오늘의 댕주제 참여</b> · &lsquo;{topicTitle}&rsquo;</CheckSticker> : null}
                <CheckSticker checked={agree} onChange={setAgree} disabled={locked}><b className="ah-display text-[#e0557f]">필수</b> {CONSENT_PUBLIC} <a href="/privacy/" className="ah-display text-[#e0557f] underline underline-offset-2">개인정보처리방침</a></CheckSticker>
                <CheckSticker checked={channel} onChange={setChannel} disabled={locked}><b className="ah-display">선택 · 기본 해제</b> {CONSENT_CHANNEL}</CheckSticker>
            </div>

            {error ? <p role="alert" className="sp-err st-postit ah-light mt-4 px-3.5 py-2.5 text-[12.5px]" style={{ background: "#ffd6e2", color: "#c4456f" }}>{error}</p> : null}
            {progress !== null ? (
                <div className="mt-4" role="status" aria-live="polite">
                    <p className="ah-display text-[12.5px] text-[#c4567a]">댕자랑 올리는 중 · {progress}%</p>
                    <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-[#fbe4ea]"><span className="block h-full rounded-full bg-[linear-gradient(90deg,#ff9cb8,#e0557f)] transition-[width] duration-100" style={{ width: `${progress}%` }} /></span>
                </div>
            ) : null}
            <div className="mt-4">
                <Patch onClick={() => void submit()} disabled={progress !== null}>{progress !== null ? "댕자랑 올리는 중" : "오늘의 댕자랑 공개하기"}<i aria-hidden="true" className="fa-solid fa-paw text-[14px]" /></Patch>
            </div>
        </Sheet>
    );
}

/* ───────── 게시물 상세(Peek 안) ───────── */
export function PostDetail({ post, boned, member, confirmDelete, onBone, onFollow, onAuthor, onShare, onReport, onDelete, onConfirmDelete }: {
    post: Post; boned: boolean; member: boolean; confirmDelete: boolean;
    onBone: () => void; onFollow: () => void; onAuthor: () => void; onShare: () => void; onReport: () => void; onDelete: () => void; onConfirmDelete: (v: boolean) => void;
}) {
    return (
        <div className="pk-body px-4 pb-2 pt-4" style={{ color: TEXT }}>
            {/* 작성자 줄 */}
            <div className="flex items-center gap-2.5">
                <button type="button" onClick={onAuthor} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-label={`${post.author} 프로필 보기`}>
                    <AuthorDot name={post.author} />
                    <span className="min-w-0">
                        <span className="ah-display flex items-center gap-1.5 text-[14.5px]">{post.author}{post.mine ? <span className="rounded-full bg-[#ffe1ea] px-1.5 py-px text-[10px] text-[#e0557f]">나</span> : null}</span>
                        <span className="ah-light block text-[11px]" style={{ color: TEXT_SOFT }}>팔로워 {post.followers.toLocaleString("ko-KR")}명 · {post.date}</span>
                    </span>
                </button>
                {!post.mine ? (
                    <button type="button" onClick={onFollow} className={`sp-follow ah-display shrink-0 rounded-full px-3 py-1.5 text-[12px] ${post.followed ? "is-on" : ""}`}>{post.followed ? "팔로잉" : "팔로우"}</button>
                ) : null}
            </div>
            {/* 사진 — 테이프로 붙인 폴라로이드 */}
            <div className="st-polaroid relative mt-3.5 bg-white p-2 pb-2" style={{ rotate: "-0.6deg" }}>
                <Tape className="-top-2 left-1/2 z-10 h-4 w-14 -translate-x-1/2" color="rgba(255,226,150,.9)" style={{ rotate: "4deg" }} />
                <span className="relative block aspect-square overflow-hidden rounded-[4px] bg-[#fff3e8]"><PostPhoto src={post.img} sizes="90vw" /></span>
            </div>
            {/* 반려견 · 주제 이름표 */}
            {post.pet || post.topic ? (
                <p className="mt-3 flex flex-wrap gap-1.5">
                    {post.pet ? <span className="ah-display rounded-full bg-[#fff1c4] px-2.5 py-0.5 text-[11px] text-[#8f5e12]"><i aria-hidden="true" className="fa-solid fa-paw mr-1 text-[9px]" />{post.pet}{post.breed ? ` · ${post.breed}` : ""}</span> : null}
                    {post.topic ? <span className="ah-display rounded-full bg-[#ffe1ea] px-2.5 py-0.5 text-[11px] text-[#e0557f]">오늘의 댕주제</span> : null}
                </p>
            ) : null}
            {/* 글 전체 */}
            <p className="ah-light mt-2.5 whitespace-pre-line text-[14px] leading-relaxed">{post.text}</p>
            {/* 응원 · 공유 · 신고/삭제 */}
            <div className="mt-4 flex items-center gap-2">
                <button type="button" aria-pressed={boned} onClick={onBone} className={`sp-bone ah-display flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] ${boned ? "is-on" : ""}`}>
                    <i aria-hidden="true" className={`fa-solid fa-bone ${boned ? "hc-pop" : ""}`} />응원 {post.bones}
                </button>
                <button type="button" onClick={onShare} className="sp-ghost ah-display flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px]"><i aria-hidden="true" className="fa-solid fa-share-nodes text-[12px]" />공유</button>
                <span className="flex-1" />
                {post.canDelete ?? post.mine ? (
                    <button type="button" onClick={() => onConfirmDelete(true)} className="ah-light text-[12px] text-[#a8968d] underline decoration-dashed underline-offset-2">삭제</button>
                ) : (
                    <button type="button" onClick={onReport} className="ah-light text-[12px] text-[#a8968d] underline decoration-dashed underline-offset-2">신고</button>
                )}
            </div>
            {(post.canDelete ?? post.mine) && confirmDelete ? (
                <div className="st-postit mt-3 px-3.5 pb-3 pt-3" style={{ background: "#ffe1ea", rotate: "-0.5deg" }}>
                    <p className="ah-light text-[12.5px] text-[#c4456f]">이 댕자랑을 삭제할까요? 삭제하면 되돌릴 수 없습니다.</p>
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <Patch tone="cream" small onClick={() => onConfirmDelete(false)}>취소</Patch>
                        <Patch small onClick={onDelete}>삭제</Patch>
                    </div>
                </div>
            ) : null}
            {!member ? <p className="ah-light mt-3 text-[11.5px]" style={{ color: TEXT_SOFT }}>응원 · 팔로우 · 신고는 로그인 후 할 수 있어요</p> : null}
        </div>
    );
}

/* ───────── 작성자 프로필 ─────────
   협업자 loadShowcaseAuthorProfile 결과(게시물 수 · 팔로워 · 받은 응원 · 최근 12장) — 불러오는 동안은 이름만 */
export function ProfileSheet({ open, onClose, head, profile, error, onFollow, onOpenPost, onRetry }: {
    open: boolean; onClose: () => void;
    head: { name: string } | null; profile: ProfileView | null; error: string;
    onFollow: () => void; onOpenPost: (p: Post, el: HTMLElement) => void;
    /** 불러오기 실패 뒤 다시 — 웹 ShowcaseAuthorProfileModal "다시 불러오기"(retryKey) 와 같음 */
    onRetry: () => void;
}) {
    if (!head) return null;
    const stats: [string, number | null][] = [["게시물", profile?.postCount ?? null], ["팔로워", profile?.followers ?? null], ["받은 응원", profile?.received ?? null]];
    return (
        <Sheet open={open} onClose={onClose} label="작성자 프로필"
            title={<div className="flex items-center gap-2.5"><AuthorDot name={head.name} size="h-11 w-11 text-[17px]" /><p className="ah-display text-[18px]">{head.name}</p></div>}>
            <div className="mt-1 grid grid-cols-3 gap-2 text-center">
                {stats.map(([k, v]) => (
                    <span key={k} className="sp-stat rounded-[12px] px-2 py-2.5"><span className="ah-display block text-[17px]">{v === null ? "·" : v.toLocaleString("ko-KR")}</span><span className="ah-light text-[11px]" style={{ color: TEXT_SOFT }}>{k}</span></span>
                ))}
            </div>
            {error ? (
                <>
                    <p role="alert" className="ah-light mt-3 text-center text-[12px] text-[#c4456f]">{error}</p>
                    {/* 웹 프로필 창과 같은 "다시 불러오기" */}
                    <div className="mx-auto mt-2 w-fit"><Patch tone="cream" small onClick={onRetry}>다시 불러오기<i aria-hidden="true" className="fa-solid fa-rotate-right text-[11px]" /></Patch></div>
                </>
            ) : null}
            {profile ? (
                <div className="mt-3">
                    {profile.isMe ? <p className="ah-display text-center text-[13px] text-[#e0557f]">내 프로필</p> : (
                        <Patch tone={profile.followed ? "cream" : "pink"} small onClick={onFollow}>{profile.followed ? "팔로잉" : "팔로우"}</Patch>
                    )}
                </div>
            ) : null}
            <p className="ah-display mt-5 text-[13px] text-[#b07a8a]">최근 댕자랑</p>
            {profile && profile.posts.length === 0 ? <p className="ah-light mt-2 text-[12.5px]" style={{ color: TEXT_SOFT }}>아직 공개한 댕자랑이 없어요.</p> : null}
            {!profile && !error ? <p className="ah-light mt-2 text-[12.5px]" style={{ color: TEXT_SOFT }}>프로필을 불러오고 있어요.</p> : null}
            <ul className="mt-2 grid grid-cols-3 gap-2">
                {(profile?.posts ?? []).slice(0, 12).map((p, i) => (
                    <li key={p.id}>
                        <button type="button" onClick={(e) => onOpenPost(p, e.currentTarget)} className="st-polaroid block w-full bg-white p-1 pb-1.5 text-left" style={{ rotate: `${[-1, 0.8, -0.6][i % 3]}deg` }}>
                            <span className="relative block aspect-square overflow-hidden rounded-[3px] bg-[#fff3e8]"><PostPhoto src={p.img} sizes="30vw" /></span>
                            <span className="ah-display mt-1 flex items-center gap-1 px-0.5 text-[10.5px] text-[#9c8f88]"><i aria-hidden="true" className="fa-solid fa-bone" />{p.bones}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </Sheet>
    );
}

/* ───────── 공유 ───────── */
export function ShareSheet({ open, onClose, target }: { open: boolean; onClose: () => void; target: ShareTarget | null }) {
    const [notice, setNotice] = useState<{ tone: "ok" | "info" | "err"; text: string } | null>(null);
    const [busy, setBusy] = useState<"native" | "copy" | "">(""); // 웹 ShowcaseShareModal busy 와 같음 — 공유 · 복사 겹쳐 누르지 않게
    if (!target) return null;
    const url = shareLinkOf(target);
    const copyOf = shareCopyOf(target);
    // 공유 창 열기 — 웹 nativeShare 와 같은 순서 · 문구
    const native = async () => {
        if (busy) return;
        if (typeof navigator.share !== "function") return setNotice({ tone: "info", text: "이 브라우저에서는 링크 복사를 이용해 주세요." });
        setBusy("native");
        setNotice(null);
        try {
            await navigator.share({ title: copyOf.title, text: copyOf.text, url });
            setNotice({ tone: "ok", text: "공유 창에 정확한 댕자랑 링크를 보냈어요." });
        } catch (e) {
            setNotice(e instanceof DOMException && e.name === "AbortError" ? { tone: "info", text: "공유를 취소했어요." } : { tone: "err", text: "공유 창을 열지 못했어요. 링크 복사를 이용해 주세요." });
        } finally {
            setBusy("");
        }
    };
    // 링크 복사 — 웹 copyLink 와 같음(협업자 copyText: 클립보드 → 막히면 선택 복사)
    const copy = async () => {
        if (busy) return;
        setBusy("copy");
        setNotice(null);
        const copied = await copyText(url);
        setNotice(copied ? { tone: "ok", text: "정확한 댕자랑 링크를 복사했어요." } : { tone: "err", text: "자동 복사가 막혀 있어요. 아래 주소를 길게 눌러 복사해 주세요." });
        if (copied) haptic("light");
        setBusy("");
    };
    return (
        <Sheet open={open} onClose={() => { if (busy) return; setNotice(null); onClose(); }} label="댕자랑 공유카드"
            title={<p className="ah-display text-[18px]"><span className="st-marker">댕자랑 공유카드</span></p>}>
            {/* 미리보기 카드 */}
            <div className="sp-paper mt-1 flex items-center gap-3 rounded-[14px] p-3" style={{ rotate: "-0.5deg" }}>
                {target.img ? <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-[#fff3e8]"><PostPhoto src={target.img} sizes="64px" /></span>
                    : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[8px] bg-[#ffe1ea] text-[22px] text-[#e0557f]"><i aria-hidden="true" className="fa-solid fa-paw" /></span>}
                <p className="ah-light line-clamp-3 text-[12.5px] leading-snug">{target.text}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
                <Patch small onClick={() => void native()} disabled={Boolean(busy)}>공유 창 열기<i aria-hidden="true" className={`fa-solid ${busy === "native" ? "fa-circle-notch fa-spin" : "fa-share-nodes"} text-[12px]`} /></Patch>
                <Patch tone="cream" small onClick={() => void copy()} disabled={Boolean(busy)}>링크 복사<i aria-hidden="true" className={`fa-solid ${busy === "copy" ? "fa-circle-notch fa-spin" : "fa-link"} text-[12px]`} /></Patch>
            </div>
            {notice ? <p role="status" className={`ah-light mt-3 text-center text-[12px] ${notice.tone === "err" ? "text-[#c4456f]" : notice.tone === "ok" ? "text-[#1f7a59]" : "text-[#7a6a63]"}`}>{notice.text}</p> : null}
            <input readOnly value={url} aria-label="공유할 정확한 댕자랑 링크" className="sp-url ah-light mt-3 w-full rounded-[10px] px-3 py-2 text-[11px]" onFocus={(e) => e.currentTarget.select()} />
        </Sheet>
    );
}

/* ───────── 신고 ───────── */
export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
export function ReportSheet({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (reason: ReportReason, detail: string) => Promise<void> }) {
    const [reason, setReason] = useState<ReportReason>("spam");
    const [detail, setDetail] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    // 신고 접수 — 부모가 협업자 reportShowcasePost 로 보냄. 실패하면 속지 안에 오류 문구(협업자와 같음)
    const send = () => {
        if (busy) return;
        setBusy(true);
        setError("");
        onSubmit(reason, detail)
            .then(() => setDetail(""))
            .catch((failure) => setError(failure instanceof Error ? failure.message : "신고를 접수하지 못했어요."))
            .finally(() => setBusy(false));
    };
    return (
        <Sheet open={open} onClose={onClose} label="게시물 신고" title={<p className="ah-display text-[18px]"><span className="st-marker">게시물 신고</span></p>}>
            <p className="ah-display mt-1 text-[13px] text-[#b07a8a]">신고 이유</p>
            <div className="mt-2 flex flex-wrap gap-2">
                {REPORT_REASONS.map((r) => (
                    <button key={r.value} type="button" aria-pressed={reason === r.value} onClick={() => { setReason(r.value); haptic("light"); }} className={`sp-pet ah-display rounded-full px-3 py-1.5 text-[12.5px] ${reason === r.value ? "is-on" : ""}`}>{r.label}</button>
                ))}
            </div>
            <label className="sp-memo mt-4 block rounded-[12px] px-3.5 pb-2 pt-3">
                <span className="ah-display flex items-center justify-between text-[13px] text-[#8f5e12]">상세 내용 <span className="ah-light text-[11px]">선택 · {detail.length}/300</span></span>
                <textarea value={detail} onChange={(e) => setDetail(e.target.value.slice(0, 300))} rows={4} maxLength={300} className="ah-light mt-1.5 w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none" />
            </label>
            <p className="ah-light mt-2 text-[11.5px]" style={{ color: TEXT_SOFT }}>신고는 운영자 확인용이며 작성자에게 신고자 정보가 공개되지 않습니다.</p>
            {error ? <p role="alert" className="ah-light mt-2 text-[12px] text-[#c4456f]">{error}</p> : null}
            <div className="mt-4"><Patch onClick={send} disabled={busy}>{busy ? "접수 중" : "신고 접수"}<i aria-hidden="true" className="fa-solid fa-flag text-[12px]" /></Patch></div>
        </Sheet>
    );
}

/* ───────── 굿즈 공모전 · 비회원 고르기(회원 로그인 또는 이메일 1회 확인) ─────────
   협업자 굿즈 공모전의 "비회원 이메일 확인" 창과 같은 흐름 · 문구. 실제 연결(2026-10-16): 부모가
   requestGoodsContestGuestVerification(인증번호 메일) → confirmGoodsContestGuestVerification(확인 + 고르려던 굿즈 선택)으로 보냄 */
export function GuestPickSheet({ open, onClose, goodsName, withGoods, loginHref, onSendCode, onConfirm }: {
    open: boolean; onClose: () => void; goodsName: string; loginHref: string;
    /** 고를 굿즈가 있는가 — 없으면("내 선택 다시 확인하기") 확인 버튼은 "확인하기" */
    withGoods: boolean;
    onSendCode: (email: string) => Promise<{ verificationId: string; maskedEmail: string }>;
    onConfirm: (verificationId: string, email: string, code: string) => Promise<void>;
}) {
    const [stage, setStage] = useState<"email" | "code">("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState<{ verificationId: string; maskedEmail: string } | null>(null);
    // 닫을 때 처음 상태로(이메일도) — 웹 openGuestVerification 이 열 때마다 INITIAL_GUEST_VERIFICATION 으로 비우는 것과 같은 결과
    const close = () => { if (busy) return; setStage("email"); setEmail(""); setCode(""); setError(""); setSent(null); onClose(); };
    // 인증번호 받기 — 협업자 requestGuestCode 와 같은 검사 · 문구
    const send = () => {
        if (busy) return;
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("이메일 주소를 정확히 입력해 주세요."); haptic("light"); return; }
        setBusy(true);
        setError("");
        onSendCode(email.trim())
            .then((r) => { setSent(r); setStage("code"); })
            .catch((failure) => setError(failure instanceof Error ? failure.message : "인증번호를 보내지 못했어요."))
            .finally(() => setBusy(false));
    };
    // 확인하고 고르기 — 협업자 confirmGuestCode 와 같은 검사 · 문구
    const confirm = () => {
        if (busy || !sent) return;
        if (!/^\d{6}$/.test(code.trim())) { setError("인증번호 6자리를 입력해 주세요."); haptic("light"); return; }
        setBusy(true);
        setError("");
        onConfirm(sent.verificationId, email.trim(), code.trim())
            .then(() => { setBusy(false); setStage("email"); setEmail(""); setCode(""); setSent(null); onClose(); })
            .catch((failure) => { setBusy(false); setError(failure instanceof Error ? failure.message : "인증을 확인하지 못했어요."); });
    };
    return (
        <Sheet open={open} onClose={close} label="비회원 이메일 확인"
            title={<><p className="ah-display text-[18px]"><span className="st-marker">이 굿즈 고르기</span></p><p className="ah-light mt-0.5 text-[12px]" style={{ color: TEXT_SOFT }}>{goodsName}</p></>}>
            {/* 회원 — 로그인하고 바로 고르기 */}
            <div className="mt-1"><Patch href={loginHref}>회원이라면 로그인하고 바로 고르기<i aria-hidden="true" className="fa-solid fa-paw text-[13px]" /></Patch></div>
            <p className="ah-display my-4 flex items-center justify-center gap-2 text-[12px] text-[#c4567a]">
                <i aria-hidden="true" className="fa-solid fa-paw text-[9px] opacity-60" />비회원은 이메일 확인 후 고르기<i aria-hidden="true" className="fa-solid fa-paw text-[9px] opacity-60" />
            </p>
            {/* 비회원 — 이메일 1회 확인 */}
            <div className="sp-paper rounded-[14px] px-3.5 py-3.5">
                <p className="ah-light text-[12px] leading-relaxed" style={{ color: TEXT_SOFT }}>중복 선택을 막고 내 선택을 다시 확인하기 위한 1회 인증이에요. 주문이나 결제는 발생하지 않습니다.</p>
                {stage === "email" ? (
                    <>
                        <label className="sp-label mt-3 flex h-[48px] items-stretch">
                            <span className="sp-stub grid w-14 shrink-0 place-items-center text-[11.5px]"><span className="ah-display">이메일</span></span>
                            <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="name@example.com" className="ah-light min-w-0 flex-1 bg-transparent px-3.5 text-[14px] outline-none" />
                        </label>
                        <div className="mt-3"><Patch tone="cream" small onClick={send} disabled={busy}>{busy ? "발송 중…" : "인증번호 받기"}<i aria-hidden="true" className="fa-solid fa-envelope text-[11px]" /></Patch></div>
                    </>
                ) : (
                    <>
                        <p className="ah-display mt-3 text-[12.5px]">{sent?.maskedEmail || email.trim()}<span className="ah-light">로 보낸 6자리 번호를 입력해 주세요.</span></p>
                        <label className="sp-label mt-2.5 flex h-[48px] items-stretch">
                            <span className="sp-stub grid w-16 shrink-0 place-items-center text-[11.5px]"><span className="ah-display">인증번호</span></span>
                            <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} placeholder="000000" className="ah-display min-w-0 flex-1 bg-transparent px-3.5 text-[16px] tracking-[0.3em] outline-none" />
                        </label>
                        <div className="mt-3"><Patch small onClick={confirm} disabled={busy}>{busy ? "확인 중…" : withGoods ? "확인하고 이 굿즈 선택" : "확인하기"}<i aria-hidden="true" className="fa-solid fa-check text-[11px]" /></Patch></div>
                        <p className="mt-2 text-center"><button type="button" disabled={busy} onClick={() => { setStage("email"); setCode(""); setError(""); setSent(null); }} className="ah-light text-[11.5px] text-[#a8968d] underline decoration-dashed underline-offset-2">이메일 다시 입력</button></p>
                    </>
                )}
                {error ? <p role="alert" className="ah-light mt-2.5 text-[12px] text-[#c4456f]">{error}</p> : null}
            </div>
        </Sheet>
    );
}

/* 댕자랑 부품 CSS */
export const SHOW_PARTS_CSS = `
/* 속지: 점 모눈 크림 종이 · 통통 올라옴 */
.sp-sheet { background-color: #fffdf8; background-image: radial-gradient(circle, rgba(196,160,140,.26) 1px, transparent 1.3px); background-size: 15px 15px; background-position: 7px 7px;
  box-shadow: 0 -16px 40px -12px rgba(60,30,20,.45), inset 0 1.5px 0 #fff; animation: sp-up .42s cubic-bezier(.2,.9,.25,1.04) both; }
@keyframes sp-up { from { transform: translateY(104%); } }
.sp-dim { animation: sp-fade .3s ease both; }
@keyframes sp-fade { from { opacity: 0; } }
.sp-close { box-shadow: 0 0 0 1.5px #f3e3da, 0 5px 9px -6px rgba(150,90,70,.55); -webkit-tap-highlight-color: transparent; }
/* 폴라로이드 칸 */
.sp-pol { box-shadow: 0 12px 20px -12px rgba(90,60,50,.55), inset 0 0 0 1px #f5ebe4; -webkit-tap-highlight-color: transparent; transition: transform .4s cubic-bezier(.3,1.6,.5,1); }
.sp-pol:active { transform: scale(.98); }
.sp-pol.is-on { animation: hc-pop .45s cubic-bezier(.3,1.6,.5,1); }
.sp-hole { background: #fff6f8; outline: 2px dashed #f4b6c8; outline-offset: -8px; }
/* 메모지 · 종이 판 · 라벨 스티커 */
.sp-memo { background: #fff6c9; box-shadow: 0 8px 12px -9px rgba(120,80,60,.45); }
.sp-paper { background: #fff; box-shadow: inset 0 0 0 1.5px #f3e6dc, 0 10px 16px -12px rgba(120,80,60,.45); }
.sp-label { border-radius: 12px; background: #fff; overflow: hidden; box-shadow: inset 0 0 0 1.5px #f3e3da, 0 7px 12px -9px rgba(150,90,70,.45); }
.sp-label:focus-within { box-shadow: inset 0 0 0 2px #d2457a, 0 7px 12px -9px rgba(150,90,70,.45); }
.sp-stub { background: #ffe1ea; color: #d2457a; border-right: 2px dashed rgba(255,255,255,.95); }
/* 체크 스티커 */
.sp-check { background: #fff; box-shadow: inset 0 0 0 2px #f2b8c9; transition: transform .35s cubic-bezier(.3,1.6,.5,1), background .2s; }
.sp-check.is-on { background: #f47aa0; box-shadow: 0 0 0 2px #fff, 0 3px 6px -3px rgba(200,80,120,.6); transform: rotate(-6deg) scale(1.06); }
/* 고르기 칩(반려견 · 신고 이유) */
.sp-pet { background: #fff; color: #7a6a63; box-shadow: inset 0 0 0 1.5px #f3e3da; transition: transform .3s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.sp-pet.is-on { background: #ffe1ea; color: #c4456f; box-shadow: inset 0 0 0 1.5px #f6a9bf; }
.sp-pet:active { transform: scale(.94); }
/* 팔로우 · 응원 · 공유 */
.sp-follow { background: #f47aa0; color: #fff; box-shadow: 0 0 0 2px #fff, 0 4px 8px -5px rgba(200,80,120,.6); -webkit-tap-highlight-color: transparent; }
.sp-follow.is-on { background: #f3ece8; color: #7a6a63; box-shadow: inset 0 0 0 1.5px #e8dcd5; }
.sp-bone { background: #fff; color: #9c8f88; box-shadow: inset 0 0 0 1.5px #f3e3da; -webkit-tap-highlight-color: transparent; transition: transform .3s cubic-bezier(.3,1.6,.5,1); }
.sp-bone.is-on { background: #ffe1ea; color: #e0557f; box-shadow: inset 0 0 0 1.5px #f6a9bf; }
.sp-bone:active, .sp-ghost:active, .sp-follow:active { transform: scale(.93); }
.sp-ghost { background: #fff; color: #7a6a63; box-shadow: inset 0 0 0 1.5px #f3e3da; -webkit-tap-highlight-color: transparent; transition: transform .3s cubic-bezier(.3,1.6,.5,1); }
.sp-stat { background: #fff; box-shadow: inset 0 0 0 1.5px #f3e6dc; }
.sp-url { background: #fff; color: #9c8f88; box-shadow: inset 0 0 0 1.5px #f3e3da; outline: none; }
.sp-err { animation: hc-pop .35s cubic-bezier(.3,1.6,.5,1) both; }
@media (prefers-reduced-motion: reduce) { .sp-sheet, .sp-dim, .sp-pol.is-on, .sp-err { animation: none; } }
`;
