"use client";
/**
 * ShowcaseComposer — 댕자랑 "오늘의 한 장 올리기"(웹 전용 · 앱은 AppShell 이 앱 댕자랑 화면으로 보냄)
 * 2026-10-25 웹 3차(사용자 "모달로 · 막 집어넣은 느낌 말고 세련되게"): 창(onClose 를 주면 body 에 붙는 창, 휴대폰은 아래에서 올라오는 판)
 *   머리(꼬리표 · 주아 제목 · 회원 공개 · 닫기) / 몸통(왼쪽 사진 칸 | 오른쪽 이야기 · 이름 · 반려견 · 주제 스위치) / 바닥(동의 두 줄 · 올리기 알약).
 *   동의 전체 문구는 "자세히" 안에 그대로. 올리기 로직(사진 준비 · 검사 · 동의 · createShowcasePost · 분석)은 바뀐 것 없음.
 * 꾸밈: app/showcase-compose-web.css(.scm-* 창 · .scl-* 페이지 단추 카드)
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
    createShowcasePost,
    ShowcaseApiError,
    SHOWCASE_ACCEPTED_IMAGE_TYPES,
    SHOWCASE_MAX_UPLOAD_BYTES,
    validateShowcaseImage,
    type ShowcasePost,
    type ShowcaseTopicSummary,
} from "@/lib/daeng-showcase";
import { inboundCampaignFields, trackStorefrontEvent } from "@/lib/storefront-analytics";
import { prepareUploadImage } from "@/lib/upload-image";
import "@/app/showcase-compose-web.css";

type PetOption = {
    id: number;
    name: string;
    breed?: string;
};

type ShowcaseComposerProps = {
    accessToken: string;
    defaultDisplayName: string;
    pets: PetOption[];
    topic?: ShowcaseTopicSummary;
    onCreated: (post: ShowcasePost) => void;
    /** 창으로 쓸 때(웹 댕자랑) — 열림 여부 · 닫기. onClose 가 없으면 그 자리에 그대로 그림 */
    open?: boolean;
    onClose?: () => void;
};

export default function ShowcaseComposer({
    accessToken,
    defaultDisplayName,
    pets,
    topic,
    onCreated,
    open = false,
    onClose,
}: ShowcaseComposerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const previewUrlRef = useRef("");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [caption, setCaption] = useState("");
    const [displayName, setDisplayName] = useState(defaultDisplayName.slice(0, 30));
    const [petProfileId, setPetProfileId] = useState("");
    const [publicConsent, setPublicConsent] = useState(false);
    const [officialOptIn, setOfficialOptIn] = useState(false);
    const [topicChoice, setTopicChoice] = useState<{ topicId: string; joined: boolean } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => () => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    }, []);

    const joinTopic = topic
        ? topicChoice && topicChoice.topicId === topic.topicId ? topicChoice.joined : true
        : false;

    const clearPhoto = () => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = "";
        setPreviewUrl("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const selectPhoto = async (pickedFile?: File) => {
        setError("");
        setSuccess("");
        if (!pickedFile) return;
        // 어떤 휴대폰 사진이든(이름표가 비었거나 다른 JPEG · HEIC 등 · 너무 큰 사진) 올릴 수 있게 맞춤 — lib/upload-image(2026-10-20)
        const nextFile = await prepareUploadImage(pickedFile, { maxBytes: SHOWCASE_MAX_UPLOAD_BYTES, cleanJpeg: true });
        const validationError = validateShowcaseImage(nextFile);
        if (validationError) {
            setError(validationError);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const nextPreviewUrl = URL.createObjectURL(nextFile);
        previewUrlRef.current = nextPreviewUrl;
        setPreviewUrl(nextPreviewUrl);
        setFile(nextFile);
    };

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setSuccess("");
        const cleanCaption = caption.trim();
        const cleanDisplayName = displayName.trim();
        if (!file) {
            setError("자랑할 사진 한 장을 선택해 주세요.");
            return;
        }
        if (cleanCaption.length < 2 || cleanCaption.length > 500) {
            setError("글은 2자 이상 500자 이하로 적어 주세요.");
            return;
        }
        if (cleanDisplayName.length < 2 || cleanDisplayName.length > 30) {
            setError("공개 이름은 2자 이상 30자 이하로 적어 주세요.");
            return;
        }
        if (!publicConsent) {
            setError("사진과 글의 공개 게시 동의를 확인해 주세요.");
            return;
        }

        setSubmitting(true);
        setProgress(1);
        try {
            const post = await createShowcasePost({
                file,
                caption: cleanCaption,
                displayName: cleanDisplayName,
                publicDisplayConsent: publicConsent,
                petProfileId: petProfileId ? Number(petProfileId) : undefined,
                officialChannelOptIn: officialOptIn,
                topicId: joinTopic ? topic?.topicId : undefined,
            }, accessToken, setProgress);
            const { conversionReceipt, ...publishedPost } = post;
            clearPhoto();
            setCaption("");
            setPetProfileId("");
            setPublicConsent(false);
            setOfficialOptIn(false);
            setTopicChoice(null);
            setSuccess("댕자랑을 공개했어요. 피드 맨 앞에서 확인해 보세요.");
            if (publishedPost.firstPostByAuthor && conversionReceipt) {
                trackStorefrontEvent("showcase_first_post_completed", {
                    surface: "daeng_showcase",
                    postId: publishedPost.postId,
                    topicId: publishedPost.topic?.topicId || "",
                    conversionReceipt,
                    ...inboundCampaignFields(),
                });
            }
            onCreated(publishedPost);
        } catch (reason) {
            setError(reason instanceof ShowcaseApiError ? reason.message : "사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
        } finally {
            setSubmitting(false);
            setProgress(0);
        }
    };

    // 화면 표시용(2026-10-25 웹 3차 · 창) — 올리기 로직은 위 그대로
    const pickedPet = pets.find((pet) => String(pet.id) === petProfileId);
    const closeDialog = () => {
        if (!submitting) onClose?.();
    };

    // 창이 열려 있는 동안: 뒤 화면 스크롤 막기 · Esc 닫기 · 닫기 단추 초점 → 닫히면 페이지 "사진 올리기" 단추로 초점
    // (올리는 중에는 닫히지 않음 — 올리기가 끝나면 onCreated 쪽에서 닫음)
    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeRef.current?.click();
        };
        window.addEventListener("keydown", onKeyDown);
        window.setTimeout(() => closeRef.current?.focus(), 0);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
            document.getElementById("showcase-compose-open")?.focus();
        };
    }, [open]);

    const form = (
        <form onSubmit={submit} className="scm" aria-labelledby="showcase-composer-title">
            {/* 머리 — 꼬리표 · 주아 제목 · 회원 공개 · 닫기 */}
            <header className="scm-head">
                <div className="scm-head-text">
                    <p className="ddb-crayon-kicker scm-kicker">SHARE TODAY</p>
                    <h2 id="showcase-composer-title" className="scm-title">오늘의 <em>한 장</em> 올리기</h2>
                </div>
                <span className="scm-badge"><i className="fa-solid fa-earth-asia" aria-hidden="true" />회원 공개</span>
                <button ref={closeRef} type="button" className="scm-close" onClick={closeDialog} aria-label="올리기 창 닫기" disabled={submitting}>
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
            </header>

            {/* 몸통 — 사진 | 이야기 · 이름 · 반려견 · 주제 */}
            <div className="scm-body">
                <div className="scm-photo-col">
                    <label htmlFor="showcase-photo" className="sr-only">사진 1장</label>
                    <div className={previewUrl ? "scm-photo has-photo" : "scm-photo"}>
                        {previewUrl ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview cannot use the static image loader. */}
                                <img src={previewUrl} alt="올릴 사진 미리보기" className="scm-photo-img" />
                                <button type="button" onClick={clearPhoto} className="scm-photo-x" aria-label="선택한 사진 지우기" disabled={submitting}>
                                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                                </button>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="scm-repick" disabled={submitting}>
                                    <i className="fa-solid fa-rotate" aria-hidden="true" />다른 사진 선택
                                </button>
                            </>
                        ) : (
                            <label htmlFor="showcase-photo" className="scm-drop">
                                <span className="scm-drop-ring" aria-hidden="true">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                    <img src="/images/ui/mypet-shutter-384.webp" alt="" width={84} height={84} />
                                </span>
                                <span className="scm-drop-pill"><i className="fa-solid fa-image" aria-hidden="true" />사진 고르기</span>
                                <span className="scm-drop-note">JPG · PNG · WebP · 최대 8MB</span>
                            </label>
                        )}
                    </div>
                    {/* 사진 아래 — 피드에 보일 이름 · 반려견(작게) */}
                    <p className="scm-photo-who" aria-hidden="true">
                        <i className="fa-solid fa-paw" />{displayName.trim() || "피드에 보일 이름"}
                        {pickedPet ? <span>· {pickedPet.name}</span> : null}
                    </p>
                    <input
                        ref={fileInputRef}
                        id="showcase-photo"
                        type="file"
                        // HEIC · HEIF 도 고를 수 있게(안드로이드 고효율 사진) — 고른 뒤 prepareUploadImage 가 JPEG 로 바꿈
                        accept={[...SHOWCASE_ACCEPTED_IMAGE_TYPES, "image/heic", "image/heif"].join(",")}
                        className="sr-only"
                        onChange={(event) => void selectPhoto(event.target.files?.[0])}
                        disabled={submitting}
                    />
                </div>

                <div className="scm-fields">
                    <div className="scm-field">
                        <label htmlFor="showcase-caption" className="scm-label">오늘의 이야기</label>
                        <div className="scm-text-wrap">
                            <textarea
                                id="showcase-caption"
                                value={caption}
                                onChange={(event) => setCaption(event.target.value.slice(0, 500))}
                                rows={5}
                                minLength={2}
                                maxLength={500}
                                required
                                placeholder="산책에서 만난 작은 순간, 귀여운 표정, 함께 기억하고 싶은 오늘을 적어 주세요."
                                className="scm-input scm-textarea"
                                disabled={submitting}
                            />
                            <span className={caption.length >= 450 ? "scm-count is-near" : "scm-count"}>{caption.length}/500</span>
                        </div>
                    </div>

                    <div className="scm-two">
                        <div className="scm-field">
                            <label htmlFor="showcase-display-name" className="scm-label">피드에 보일 이름</label>
                            <input
                                id="showcase-display-name"
                                value={displayName}
                                onChange={(event) => setDisplayName(event.target.value.slice(0, 30))}
                                minLength={2}
                                maxLength={30}
                                required
                                className="scm-input"
                                disabled={submitting}
                            />
                        </div>
                        <div className="scm-field">
                            <label htmlFor="showcase-pet" className="scm-label">함께 나온 반려견 <span className="scm-opt">선택</span></label>
                            <select
                                id="showcase-pet"
                                value={petProfileId}
                                onChange={(event) => setPetProfileId(event.target.value)}
                                className="scm-input scm-select"
                                disabled={submitting}
                            >
                                <option value="">표시하지 않기</option>
                                {pets.map((pet) => (
                                    <option key={pet.id} value={pet.id}>{pet.name}{pet.breed ? ` · ${pet.breed}` : ""}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 오늘의 댕주제 — 한 줄 켜고 끄기(끄면 일반 댕자랑) */}
                    {topic ? (
                        <label className={joinTopic ? "scm-topic is-on" : "scm-topic"} title="선택하면 이 글이 현재 주제와 함께 표시돼요. 체크를 풀어 일반 댕자랑으로 올릴 수도 있습니다.">
                            <span className="scm-topic-text"><b>#{topic.title}</b> 주제로 올리기</span>
                            <input
                                type="checkbox"
                                checked={joinTopic}
                                onChange={(event) => setTopicChoice({ topicId: topic.topicId, joined: event.target.checked })}
                                className="scm-switch"
                                aria-label={`오늘의 댕주제 참여 · ${topic.title} — 끄면 일반 댕자랑으로 올라가요`}
                                disabled={submitting}
                            />
                        </label>
                    ) : null}
                </div>
            </div>

            {/* 바닥 — 동의 두 줄 · 진행 · 안내 · 올리기 */}
            <footer className="scm-foot">
                <div className="scm-consents">
                    <div className="scm-consent">
                        <label className="scm-consent-row">
                            <input
                                type="checkbox"
                                checked={publicConsent}
                                onChange={(event) => setPublicConsent(event.target.checked)}
                                className="scm-check"
                                required
                                disabled={submitting}
                            />
                            <span>피드 공개에 동의해요 <strong className="scm-tag is-must">필수</strong></span>
                        </label>
                        <details className="scm-more">
                            <summary>자세히</summary>
                            <p>
                                선택한 사진과 글, 공개 이름, 선택한 반려견 이름·견종이 누구나 보는 댕자랑 피드에 게시되는 것에 동의합니다.
                                직접 촬영했거나 게시 권한이 있는 사진만 사용하고, 사람 얼굴·연락처 등 개인정보가 보이는 사진은 올리지 않겠습니다. <Link href="/privacy/" className="scm-link">개인정보처리방침</Link>
                            </p>
                        </details>
                    </div>
                    <div className="scm-consent">
                        <label className="scm-consent-row">
                            <input
                                type="checkbox"
                                checked={officialOptIn}
                                onChange={(event) => setOfficialOptIn(event.target.checked)}
                                className="scm-check"
                                disabled={submitting}
                            />
                            <span>공식 SNS 소개에도 동의해요 <strong className="scm-tag is-opt">선택 · 기본 해제</strong></span>
                        </label>
                        <details className="scm-more">
                            <summary>자세히</summary>
                            <p>운영자 검수 후 댕다방 공식 Instagram·Threads·Naver Blog에 이 게시물을 소개하는 데 동의합니다. 선택하지 않아도 피드 게시에는 영향이 없습니다.</p>
                        </details>
                    </div>
                </div>

                <div className="scm-send">
                    {submitting ? (
                        <div className="scm-progress" aria-label={`사진 올리는 중 ${progress}%`}>
                            <div><span style={{ width: `${progress}%` }} /></div>
                            <p>안전하게 사진을 준비하는 중 · {progress}%</p>
                        </div>
                    ) : null}
                    <p className={error ? "scm-status is-error" : "scm-status"} role="status" aria-live="polite">
                        {error || success}
                    </p>
                    <button type="submit" className="scm-submit" disabled={submitting}>
                        <i className={`fa-solid ${submitting ? "fa-spinner fa-spin" : "fa-paw"}`} aria-hidden="true" />
                        {submitting ? "댕자랑 올리는 중" : "오늘의 댕자랑 공개하기"}
                    </button>
                </div>
            </footer>
        </form>
    );

    // onClose 를 받으면 창(body 에 붙음 · 닫혀도 숨겨만 둬서 쓰던 내용 유지), 아니면 그 자리에 그대로
    if (!onClose) return form;
    return createPortal(
        <div
            className="scm-overlay"
            hidden={!open}
            onMouseDown={(event) => {
                if (event.currentTarget === event.target) closeDialog();
            }}
        >
            <div className="scm-dialog" role="dialog" aria-modal="true" aria-labelledby="showcase-composer-title">
                {form}
            </div>
        </div>,
        document.body,
    );
}
