"use client";
/**
 * ShowcaseComposer — 댕자랑 "오늘의 한 장 올리기"(웹 전용 · 앱은 AppShell 이 앱 댕자랑 화면으로 보냄)
 * 2026-10-25 웹 고도화(사용자 "더 고도화"): 머리(세 단계 진행) · 왼쪽 폴라로이드 사진 + 피드 미리보기 · 오른쪽 크림 입력 칸 · 주제 · 동의 카드 · 분홍 알약.
 * 올리기 로직(사진 준비 · 검사 · 동의 · createShowcasePost · 분석)은 바뀐 것 없음. 꾸밈: app/showcase-compose-web.css(.scw-*)
 */

import { useEffect, useRef, useState } from "react";
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
};

export default function ShowcaseComposer({
    accessToken,
    defaultDisplayName,
    pets,
    topic,
    onCreated,
}: ShowcaseComposerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
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

    // 화면 표시용(2026-10-25 웹 고도화) — 세 단계 진행 표시 · 왼쪽 미리보기에 쓰는 값만, 올리기 로직은 위 그대로
    const steps = [
        { label: "사진 고르기", done: Boolean(file) },
        { label: "이야기 쓰기", done: caption.trim().length >= 2 },
        { label: "공개 동의", done: publicConsent },
    ];
    const pickedPet = pets.find((pet) => String(pet.id) === petProfileId);

    return (
        <form onSubmit={submit} className="scw" aria-labelledby="showcase-composer-title">
            {/* 머리 — 꼬리표 · 주아 제목 · 한 줄 · 회원 공개 알약 · 세 단계 */}
            <div className="scw-head">
                <div className="scw-head-text">
                    <p className="ddb-crayon-kicker scw-kicker">SHARE TODAY</p>
                    <h2 id="showcase-composer-title" className="scw-title">
                        오늘의 <em>한 장</em> 올리기
                    </h2>
                    <p className="scw-sub">사진 한 장과 짧은 이야기면 충분해요. 올린 글은 댕자랑 피드 맨 앞에 보여요.</p>
                </div>
                <span className="scw-badge"><i className="fa-solid fa-earth-asia" aria-hidden="true" />회원 공개 게시</span>
                <ol className="scw-steps" aria-label="올리기 단계">
                    {steps.map((step, index) => (
                        <li key={step.label} className={step.done ? "is-done" : ""}>
                            <b aria-hidden="true">{step.done ? <i className="fa-solid fa-check" /> : index + 1}</b>
                            {step.label}
                            <span className="sr-only">{step.done ? " 완료" : " 아직"}</span>
                        </li>
                    ))}
                </ol>
            </div>

            <div className="scw-grid">
                {/* 왼쪽 — 사진(폴라로이드) + 피드 미리보기 */}
                <div className="scw-photo-col">
                    <label htmlFor="showcase-photo" className="scw-label"><span className="scw-no">1</span>사진 1장</label>
                    <div className={previewUrl ? "scw-polaroid has-photo" : "scw-polaroid"}>
                        {previewUrl ? (
                            <div className="scw-photo">
                                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview cannot use the static image loader. */}
                                <img src={previewUrl} alt="올릴 사진 미리보기" className="aspect-square w-full object-cover" />
                                <button
                                    type="button"
                                    onClick={clearPhoto}
                                    className="scw-photo-x"
                                    aria-label="선택한 사진 지우기"
                                    disabled={submitting}
                                >
                                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                                </button>
                            </div>
                        ) : (
                            <label htmlFor="showcase-photo" className="scw-drop">
                                <span className="scw-drop-ring" aria-hidden="true">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                    <img src="/images/ui/mypet-shutter-384.webp" alt="" width={84} height={84} />
                                </span>
                                <strong>오늘의 한 장을 골라 주세요</strong>
                                <span className="scw-drop-pill"><i className="fa-solid fa-image" aria-hidden="true" />사진 고르기</span>
                                <span className="scw-tips" aria-hidden="true">
                                    <small><i className="fa-solid fa-sun" />밝은 곳에서</small>
                                    <small><i className="fa-solid fa-dog" />아이 얼굴이 잘 보이게</small>
                                </span>
                                <span className="scw-drop-note">JPG · PNG · WebP / 최대 8MB</span>
                            </label>
                        )}
                        {/* 폴라로이드 아래 — 피드에 보일 모습(이름 · 반려견 · 이야기 첫 줄) */}
                        <div className="scw-preview" aria-hidden="true">
                            <span className="scw-preview-name">
                                <i className="fa-solid fa-paw" />
                                {displayName.trim() || "피드에 보일 이름"}
                                {pickedPet ? <small>{pickedPet.name}{pickedPet.breed ? ` · ${pickedPet.breed}` : ""}</small> : null}
                            </span>
                            <span className={caption.trim() ? "scw-preview-text" : "scw-preview-text is-empty"}>
                                {caption.trim() || "오늘의 이야기가 여기에 보여요"}
                            </span>
                        </div>
                    </div>
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
                    {previewUrl ? (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="scw-repick"
                            disabled={submitting}
                        >
                            <i className="fa-solid fa-rotate" aria-hidden="true" />다른 사진 선택
                        </button>
                    ) : null}
                </div>

                {/* 오른쪽 — 이야기 · 이름 · 반려견 · 주제 · 동의 · 올리기 */}
                <div className="scw-fields">
                    <div className="scw-field">
                        <div className="scw-field-head">
                            <label htmlFor="showcase-caption" className="scw-label"><span className="scw-no">2</span>오늘의 이야기</label>
                            <span className={caption.length >= 450 ? "scw-count is-near" : "scw-count"}>{caption.length}/500</span>
                        </div>
                        <textarea
                            id="showcase-caption"
                            value={caption}
                            onChange={(event) => setCaption(event.target.value.slice(0, 500))}
                            rows={5}
                            minLength={2}
                            maxLength={500}
                            required
                            placeholder="산책에서 만난 작은 순간, 귀여운 표정, 함께 기억하고 싶은 오늘을 적어 주세요."
                            className="scw-input scw-textarea"
                            disabled={submitting}
                        />
                    </div>

                    <div className="scw-two">
                        <div className="scw-field">
                            <label htmlFor="showcase-display-name" className="scw-label is-plain"><i className="fa-solid fa-signature" aria-hidden="true" />피드에 보일 이름</label>
                            <input
                                id="showcase-display-name"
                                value={displayName}
                                onChange={(event) => setDisplayName(event.target.value.slice(0, 30))}
                                minLength={2}
                                maxLength={30}
                                required
                                className="scw-input"
                                disabled={submitting}
                            />
                        </div>
                        <div className="scw-field">
                            <label htmlFor="showcase-pet" className="scw-label is-plain"><i className="fa-solid fa-dog" aria-hidden="true" />함께 나온 반려견 <span className="scw-opt">선택</span></label>
                            <select
                                id="showcase-pet"
                                value={petProfileId}
                                onChange={(event) => setPetProfileId(event.target.value)}
                                className="scw-input scw-select"
                                disabled={submitting}
                            >
                                <option value="">표시하지 않기</option>
                                {pets.map((pet) => (
                                    <option key={pet.id} value={pet.id}>{pet.name}{pet.breed ? ` · ${pet.breed}` : ""}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {topic ? (
                        <label className={joinTopic ? "scw-topic is-on" : "scw-topic"}>
                            <input
                                type="checkbox"
                                checked={joinTopic}
                                onChange={(event) => setTopicChoice({ topicId: topic.topicId, joined: event.target.checked })}
                                className="scw-check"
                                disabled={submitting}
                            />
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src="/images/ui/daily-checkin-256.webp" alt="" aria-hidden="true" className="scw-topic-art" />
                            <span>
                                <strong>오늘의 댕주제 참여 · {topic.title}</strong>
                                <span>선택하면 이 글이 현재 주제와 함께 표시돼요. 체크를 풀어 일반 댕자랑으로 올릴 수도 있습니다.</span>
                            </span>
                        </label>
                    ) : null}

                    <div className="scw-consents">
                        <p className="scw-label"><span className="scw-no">3</span>공개 동의</p>
                        <label className={publicConsent ? "scw-consent is-must is-on" : "scw-consent is-must"}>
                            <input
                                type="checkbox"
                                checked={publicConsent}
                                onChange={(event) => setPublicConsent(event.target.checked)}
                                className="scw-check"
                                required
                                disabled={submitting}
                            />
                            <span>
                                <strong className="scw-tag is-must">필수</strong> 선택한 사진과 글, 공개 이름, 선택한 반려견 이름·견종이 누구나 보는 댕자랑 피드에 게시되는 것에 동의합니다.
                                직접 촬영했거나 게시 권한이 있는 사진만 사용하고, 사람 얼굴·연락처 등 개인정보가 보이는 사진은 올리지 않겠습니다. <Link href="/privacy/" className="scw-link">개인정보처리방침</Link>
                            </span>
                        </label>
                        <label className={officialOptIn ? "scw-consent is-opt is-on" : "scw-consent is-opt"}>
                            <input
                                type="checkbox"
                                checked={officialOptIn}
                                onChange={(event) => setOfficialOptIn(event.target.checked)}
                                className="scw-check"
                                disabled={submitting}
                            />
                            <span>
                                <strong className="scw-tag is-opt">선택 · 기본 해제</strong> 운영자 검수 후 댕다방 공식 Instagram·Threads·Naver Blog에 이 게시물을 소개하는 데 동의합니다. 선택하지 않아도 피드 게시에는 영향이 없습니다.
                            </span>
                        </label>
                    </div>

                    {submitting ? (
                        <div className="scw-progress" aria-label={`사진 올리는 중 ${progress}%`}>
                            <div><span style={{ width: `${progress}%` }} /></div>
                            <p>안전하게 사진을 준비하는 중 · {progress}%</p>
                        </div>
                    ) : null}

                    <p className={error ? "scw-status is-error" : "scw-status"} role="status" aria-live="polite">
                        {error || success}
                    </p>

                    <button
                        type="submit"
                        className="scw-submit"
                        disabled={submitting}
                    >
                        <i className={`fa-solid ${submitting ? "fa-spinner fa-spin" : "fa-paw"}`} aria-hidden="true" />
                        {submitting ? "댕자랑 올리는 중" : "오늘의 댕자랑 공개하기"}
                    </button>
                </div>
            </div>
        </form>
    );
}
