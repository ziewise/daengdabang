"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    createShowcasePost,
    ShowcaseApiError,
    SHOWCASE_ACCEPTED_IMAGE_TYPES,
    validateShowcaseImage,
    type ShowcasePost,
} from "@/lib/daeng-showcase";

type PetOption = {
    id: number;
    name: string;
    breed?: string;
};

type ShowcaseComposerProps = {
    accessToken: string;
    defaultDisplayName: string;
    pets: PetOption[];
    onCreated: (post: ShowcasePost) => void;
};

export default function ShowcaseComposer({
    accessToken,
    defaultDisplayName,
    pets,
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
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => () => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    }, []);

    const clearPhoto = () => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = "";
        setPreviewUrl("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const selectPhoto = (nextFile?: File) => {
        setError("");
        setSuccess("");
        if (!nextFile) return;
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
            }, accessToken, setProgress);
            clearPhoto();
            setCaption("");
            setPetProfileId("");
            setPublicConsent(false);
            setOfficialOptIn(false);
            setSuccess("댕자랑을 공개했어요. 피드 맨 앞에서 확인해 보세요.");
            onCreated(post);
        } catch (reason) {
            setError(reason instanceof ShowcaseApiError ? reason.message : "사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
        } finally {
            setSubmitting(false);
            setProgress(0);
        }
    };

    return (
        <form onSubmit={submit} className="ddb-crayon-paper rounded-[30px] border p-5 shadow-card sm:p-7" aria-labelledby="showcase-composer-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="ddb-crayon-kicker text-[11px]">SHARE TODAY</p>
                    <h2 id="showcase-composer-title" className="ddb-crayon-title mt-1 text-3xl text-neutral-950">
                        오늘의 한 장 올리기
                    </h2>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-800">
                    회원 공개 게시
                </span>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(240px,.72fr)_minmax(0,1.28fr)]">
                <div>
                    <label htmlFor="showcase-photo" className="text-xs font-black text-neutral-700">사진 1장</label>
                    <div className="mt-2 overflow-hidden rounded-[24px] border border-dashed border-rose-200 bg-rose-50/45">
                        {previewUrl ? (
                            <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview cannot use the static image loader. */}
                                <img src={previewUrl} alt="올릴 사진 미리보기" className="aspect-square w-full object-contain" />
                                <button
                                    type="button"
                                    onClick={clearPhoto}
                                    className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/80 bg-black/65 text-white shadow-sm"
                                    aria-label="선택한 사진 지우기"
                                    disabled={submitting}
                                >
                                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                                </button>
                            </div>
                        ) : (
                            <label htmlFor="showcase-photo" className="flex aspect-square cursor-pointer flex-col items-center justify-center px-5 text-center">
                                <span className="ddb-crayon-icon grid h-14 w-14 place-items-center rounded-2xl text-xl text-white" data-crayon-tone="coral">
                                    <i className="fa-solid fa-camera" aria-hidden="true" />
                                </span>
                                <strong className="mt-4 text-sm text-neutral-900">사진을 선택해 주세요</strong>
                                <span className="mt-1 text-[11px] font-bold leading-5 text-neutral-500">JPG · PNG · WebP / 최대 8MB</span>
                            </label>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        id="showcase-photo"
                        type="file"
                        accept={SHOWCASE_ACCEPTED_IMAGE_TYPES.join(",")}
                        className="sr-only"
                        onChange={(event) => selectPhoto(event.target.files?.[0])}
                        disabled={submitting}
                    />
                    {previewUrl ? (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-2 min-h-10 w-full rounded-full border border-neutral-300 bg-white px-4 text-xs font-black text-neutral-700 hover:border-rose-300 hover:text-rose-800"
                            disabled={submitting}
                        >
                            다른 사진 선택
                        </button>
                    ) : null}
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex items-end justify-between gap-3">
                            <label htmlFor="showcase-caption" className="text-xs font-black text-neutral-700">오늘의 이야기</label>
                            <span className="text-[10px] font-bold text-neutral-500">{caption.length}/500</span>
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
                            className="input mt-2 min-h-32 resize-y py-3 leading-6"
                            disabled={submitting}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="showcase-display-name" className="text-xs font-black text-neutral-700">피드에 보일 이름</label>
                            <input
                                id="showcase-display-name"
                                value={displayName}
                                onChange={(event) => setDisplayName(event.target.value.slice(0, 30))}
                                minLength={2}
                                maxLength={30}
                                required
                                className="input mt-2"
                                disabled={submitting}
                            />
                        </div>
                        <div>
                            <label htmlFor="showcase-pet" className="text-xs font-black text-neutral-700">함께 나온 반려견 <span className="font-bold text-neutral-400">선택</span></label>
                            <select
                                id="showcase-pet"
                                value={petProfileId}
                                onChange={(event) => setPetProfileId(event.target.value)}
                                className="input mt-2"
                                disabled={submitting}
                            >
                                <option value="">표시하지 않기</option>
                                {pets.map((pet) => (
                                    <option key={pet.id} value={pet.id}>{pet.name}{pet.breed ? ` · ${pet.breed}` : ""}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4">
                        <label className="flex cursor-pointer items-start gap-3 text-xs font-bold leading-5 text-cyan-950">
                            <input
                                type="checkbox"
                                checked={publicConsent}
                                onChange={(event) => setPublicConsent(event.target.checked)}
                                className="mt-1 h-4 w-4 shrink-0 accent-cyan-700"
                                required
                                disabled={submitting}
                            />
                            <span>
                                <strong className="font-black">필수</strong> 선택한 사진과 글, 공개 이름, 선택한 반려견 이름·견종이 누구나 보는 댕자랑 피드에 게시되는 것에 동의합니다.
                                직접 촬영했거나 게시 권한이 있는 사진만 사용하고, 사람 얼굴·연락처 등 개인정보가 보이는 사진은 올리지 않겠습니다. <Link href="/privacy/" className="underline underline-offset-2">개인정보처리방침</Link>
                            </span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3 border-t border-cyan-200 pt-3 text-xs font-bold leading-5 text-neutral-700">
                            <input
                                type="checkbox"
                                checked={officialOptIn}
                                onChange={(event) => setOfficialOptIn(event.target.checked)}
                                className="mt-1 h-4 w-4 shrink-0 accent-rose-600"
                                disabled={submitting}
                            />
                            <span>
                                <strong className="font-black text-rose-800">선택 · 기본 해제</strong> 운영자 검수 후 댕다방 공식 Instagram·Threads·Naver Blog에 이 게시물을 소개하는 데 동의합니다. 선택하지 않아도 피드 게시에는 영향이 없습니다.
                            </span>
                        </label>
                    </div>

                    {submitting ? (
                        <div aria-label={`사진 올리는 중 ${progress}%`}>
                            <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-rose-400 transition-[width]" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="mt-1 text-right text-[10px] font-black text-neutral-500">안전하게 사진을 준비하는 중 · {progress}%</p>
                        </div>
                    ) : null}

                    <p className={`text-xs font-bold leading-5 ${error ? "text-red-700" : "text-emerald-700"}`} role="status" aria-live="polite">
                        {error || success}
                    </p>

                    <button
                        type="submit"
                        className="ddb-crayon-link ddb-attention-cta inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-55"
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
