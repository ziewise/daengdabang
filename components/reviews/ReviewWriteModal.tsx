/**
 * ReviewWriteModal — 후기 쓰기 창 시안 2차 · 2026-10-25(웹 · 개발 서버 미리보기 전용)
 * ---------------------------------------------------------------------
 * 기획(docs/09-앱-시안-인계/HANDOFF_20261025_REVIEW_FEATURE_SPEC_DRAFT.md 3-2) 그대로의 흐름을 "한눈에 · 막힘없이" 다듬은 판:
 *  - 머리: 상품 사진 · "후기 쓰기" · 아이 이름 인사 · 구매 옵션 / 배송 완료일 / 작성 기한(D-day)
 *  - 후기 종류 카드 두 장(3D 그림): 일반 후기(글만 · 올리기 단추 없음) | 포토 후기(사진 1장 이상) — 바꿔도 쓰던 내용 그대로
 *  - 번호 단계(다 채우면 번호가 민트 체크로): ① 별점(큰 크레파스 별 · 말) ② 짧은 평가(분류별 질문)
 *    ③ 이야기(쓰기 도움 알약 · 10자까지 차오르는 막대 · 글자 수) ④ [포토] 사진(끌어 놓기 · 5칸 · 대표 · 순서 · 지우기 · 올리는 중 막대)
 *    ⑤ 우리 아이 정보(펫 프로필에서 채움 · 고치기)
 *  - 아래: 남은 할 일 체크 알약 + "등록하고 1,000원 받기"
 *  - 쓰던 중 닫으면 "그만둘까요?" 확인 판, 등록하면 감사 화면 + 올라간 후기 미리보기
 *  - 2단계 영상 자리는 만들어 두고 숨김(hidden)
 * 시안이라 서버로 아무것도 보내지 않음 — 등록하면 이 화면 목록에만 붙고 "미리보기" 표시.
 * 휴대폰은 아래에서 올라오는 판. 꾸밈: app/review-web.css(.rvm-*)
 */
"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import type { CatalogProduct } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { PREVIEW_WRITE_CONTEXT, WRITING_PROMPTS, fitQuestionFor, type OwnReview, type ReviewFit } from "@/lib/reviews-preview";
import CrayonStars from "./CrayonStars";

const UI = "/images/ui/";
const MAX_PHOTOS = 5;
const MIN_TEXT = 10;
const MAX_TEXT = 1000;
const MAX_MB = 20;
const SIZES = ["XS", "S", "M", "L", "XL", "2XL"];
const STAR = "M12 2.6c.4 0 .8.2 1 .6l2.4 4.9 5.4.8c.9.1 1.2 1.2.6 1.8l-3.9 3.8.9 5.4c.2.9-.8 1.6-1.6 1.1L12 18.6l-4.8 2.5c-.8.4-1.8-.2-1.6-1.1l.9-5.4-3.9-3.8c-.6-.6-.3-1.7.6-1.8l5.4-.8 2.4-4.9c.2-.4.6-.6 1-.6z";

type Tab = "text" | "photo";
type Photo = { id: string; url: string; name: string; progress: number };

/** 오늘부터 기한까지 남은 날 */
function daysLeft(deadline: string) {
    const end = new Date(`${deadline}T23:59:59`).getTime();
    return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}
const shortDate = (date: string) => {
    const [, m, d] = date.split("-");
    return `${Number(m)}월 ${Number(d)}일`;
};
/** 받침에 따라 "와/과" */
const withJosa = (name: string) => {
    const code = name.charCodeAt(name.length - 1) - 0xac00;
    return `${name}${code >= 0 && code % 28 ? "과" : "와"}`;
};

type Props = {
    onClose: () => void;
    product: CatalogProduct;
    onSubmitted: (review: OwnReview) => void;
    ratingWords: Record<number, string>;
};

export default function ReviewWriteModal({ onClose, product, onSubmitted, ratingWords }: Props) {
    const { productName } = useI18n();
    const ctx = PREVIEW_WRITE_CONTEXT;
    const fitQ = fitQuestionFor(product.category);
    const baseId = useId();

    const [tab, setTab] = useState<Tab>("text");
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [fit, setFit] = useState<ReviewFit | "">("");
    const [pet, setPet] = useState({ ...ctx.pet });
    const [petEdit, setPetEdit] = useState(false);
    const [body, setBody] = useState("");
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [photoNote, setPhotoNote] = useState("");
    const [dragging, setDragging] = useState(false);
    const [step, setStep] = useState<"write" | "confirm" | "done">("write");
    const [submitted, setSubmitted] = useState<OwnReview | null>(null);
    const [left] = useState(() => daysLeft(ctx.deadline));

    const closeRef = useRef<HTMLButtonElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const textRef = useRef<HTMLTextAreaElement>(null);
    // 사진 미리보기 주소 · 올리는 중 타이머 정리용(등록한 사진은 목록에서 계속 써야 해 지우지 않음)
    const photosRef = useRef<Photo[]>([]);
    const timersRef = useRef<number[]>([]);
    const keepRef = useRef(false);
    const seqRef = useRef(0); // 사진 이름표 번호

    const textLength = body.trim().length;
    const dirty = rating > 0 || textLength > 0 || photos.length > 0 || fit !== "";
    const uploading = photos.some((photo) => photo.progress < 100);
    const checks = [
        { key: "rating", label: "별점", done: rating > 0 },
        { key: "text", label: `이야기 ${MIN_TEXT}자`, done: textLength >= MIN_TEXT },
        ...(tab === "photo" ? [{ key: "photo", label: "사진 1장", done: photos.length > 0 && !uploading }] : []),
    ];
    const canSubmit = checks.every((check) => check.done);

    function requestClose() {
        if (step === "write" && dirty) setStep("confirm");
        else onClose();
    }
    const requestCloseRef = useRef(requestClose);
    useEffect(() => {
        requestCloseRef.current = requestClose;
    });

    // 열려 있는 동안: 뒤 스크롤 막기 · Esc · 닫기 단추 초점 / 닫힐 때 사진 주소 · 타이머 정리
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") requestCloseRef.current();
        };
        window.addEventListener("keydown", onKey);
        window.setTimeout(() => closeRef.current?.focus(), 0);
        const timers = timersRef.current;
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
            timers.forEach((timer) => window.clearInterval(timer));
            if (!keepRef.current) photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
        };
    }, []);

    function updatePhotos(next: (current: Photo[]) => Photo[]) {
        setPhotos((current) => {
            const value = next(current);
            photosRef.current = value;
            return value;
        });
    }

    // 사진 받기(고르기 · 끌어 놓기 공통) — 5장까지, 너무 큰 파일 · 사진 아닌 파일은 빼고 안내. 시안이라 "올리는 중" 막대만 흉내(서버 전송 없음)
    function addFiles(files: File[]) {
        const room = MAX_PHOTOS - photosRef.current.length;
        const images = files.filter((file) => file.type.startsWith("image/"));
        const tooBig = images.filter((file) => file.size > MAX_MB * 1024 * 1024);
        const usable = images.filter((file) => file.size <= MAX_MB * 1024 * 1024).slice(0, Math.max(0, room));
        const notes: string[] = [];
        if (images.length < files.length) notes.push("사진 파일만 올릴 수 있어요");
        if (tooBig.length) notes.push(`${MAX_MB}MB가 넘는 사진 ${tooBig.length}장은 뺐어요`);
        if (images.length - tooBig.length > room) notes.push(`사진은 ${MAX_PHOTOS}장까지예요`);
        setPhotoNote(notes.join(" · "));
        if (!usable.length) return;
        const added = usable.map((file) => ({ id: `photo-${(seqRef.current += 1)}`, url: URL.createObjectURL(file), name: file.name, progress: 0 }));
        updatePhotos((current) => [...current, ...added]);
        const ids = new Set(added.map((photo) => photo.id));
        const timer = window.setInterval(() => {
            updatePhotos((current) => current.map((photo) => (ids.has(photo.id) ? { ...photo, progress: Math.min(100, photo.progress + 20) } : photo)));
            if (photosRef.current.every((photo) => !ids.has(photo.id) || photo.progress >= 100)) window.clearInterval(timer);
        }, 140);
        timersRef.current.push(timer);
    }

    function onDrop(event: DragEvent<HTMLElement>) {
        event.preventDefault();
        setDragging(false);
        addFiles(Array.from(event.dataTransfer.files ?? []));
    }

    function removePhoto(id: string) {
        const target = photosRef.current.find((photo) => photo.id === id);
        if (target) URL.revokeObjectURL(target.url);
        updatePhotos((current) => current.filter((photo) => photo.id !== id));
        setPhotoNote("");
    }

    function movePhoto(index: number, delta: number) {
        updatePhotos((current) => {
            const to = index + delta;
            if (to < 0 || to >= current.length) return current;
            const next = [...current];
            [next[index], next[to]] = [next[to], next[index]];
            return next;
        });
    }

    // 쓰기 도움 알약 — 이야기 칸 끝에 첫마디를 붙이고 바로 이어 쓰게 초점
    function addPrompt(starter: string) {
        setBody((current) => {
            const glue = current && !current.endsWith("\n") ? "\n" : "";
            return `${current}${glue}${starter}`.slice(0, MAX_TEXT);
        });
        window.setTimeout(() => {
            const node = textRef.current;
            if (!node) return;
            node.focus();
            node.setSelectionRange(node.value.length, node.value.length);
        }, 0);
    }

    function submit() {
        if (!canSubmit) return;
        keepRef.current = true;
        const usePhotos = tab === "photo" ? photos : [];
        // 일반 후기로 등록하면 고른 사진은 쓰지 않으니 바로 정리
        if (tab === "text") photos.forEach((photo) => URL.revokeObjectURL(photo.url));
        const review: OwnReview = {
            id: `mine-${Date.now()}`,
            type: tab,
            rating: rating as OwnReview["rating"],
            body: body.trim(),
            maskedName: "보*자",
            createdAt: new Date().toISOString().slice(0, 10),
            option: ctx.option,
            fit: fit || undefined,
            pet: { name: pet.name, breed: pet.breed, weightKg: Number(pet.weightKg) || 0, size: pet.size },
            media: usePhotos.map((photo) => ({ url: photo.url, width: 600, height: 600 })),
            helpfulCount: 0,
            helpfulByMe: false,
        };
        onSubmitted(review);
        setSubmitted(review);
        setStep("done");
    }

    const shownRating = hover || rating;
    const name = productName(product);
    const blocks = { rating: rating > 0, fit: fit !== "", text: textLength >= MIN_TEXT, photo: photos.length > 0 && !uploading };
    let number = 0;
    const numberBadge = (done: boolean) => {
        number += 1;
        return (
            <span className="rvm-num" data-done={done ? "" : undefined} aria-hidden="true">
                {done ? <i className="fa-solid fa-check" /> : number}
            </span>
        );
    };

    return createPortal(
        <div className="rvm-overlay" onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
            <div className="rvm" role="dialog" aria-modal="true" aria-labelledby={`${baseId}-title`} data-step={step}>
                <span className="rvm-grip" aria-hidden="true" />
                <button ref={closeRef} type="button" className="rvm-close" onClick={requestClose} aria-label="닫기">
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>

                {step === "done" && submitted ? (
                    <div className="rvm-done">
                        <p className="rvm-kicker">THANK YOU</p>
                        <h2 id={`${baseId}-title`}>소중한 후기 <em>고마워요!</em></h2>
                        <p className="rvm-done-sub">{pet.name}의 이야기가 다른 보호자에게 큰 도움이 될 거예요.</p>

                        {/* 올라간 후기 미리보기 */}
                        <div className="rvm-done-card">
                            {submitted.media[0] && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={submitted.media[0].url} alt="" />
                            )}
                            <div>
                                <p className="rvm-done-card-head">
                                    <CrayonStars value={submitted.rating} size={15} />
                                    <b>{ratingWords[submitted.rating]}</b>
                                    {submitted.media.length > 0 && <span>사진 {submitted.media.length}장</span>}
                                </p>
                                <p className="rvm-done-card-body">{submitted.body}</p>
                            </div>
                        </div>

                        <p className="rvm-done-point">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${UI}policy-reward-192.webp`} alt="" width={28} height={28} />
                            <b>+{ctx.rewardPoints.toLocaleString()}원</b> 적립 예정 <span>마이페이지 · 적립금에서 확인</span>
                        </p>
                        <p className="rvm-preview-note"><i className="fa-solid fa-flask" aria-hidden="true" /> 미리보기 — 서버 연결 전이라 실제로 저장되지 않아요</p>
                        <div className="rvm-done-actions">
                            <button type="button" className="rvm-ghost" onClick={onClose}>닫기</button>
                            <button
                                type="button"
                                className="rvm-submit"
                                onClick={() => {
                                    onClose();
                                    window.setTimeout(() => document.querySelector("[data-own-reviews] .rvc")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
                                }}
                            >
                                내 후기 보기 <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 머리 — 상품 · 옵션 · 기한 */}
                        <header className="rvm-head">
                            <span className="rvm-thumb">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                {product.image ? <img src={product.image} alt="" /> : <i className="fa-solid fa-box" aria-hidden="true" />}
                            </span>
                            <div className="rvm-head-text">
                                <p className="rvm-kicker">WRITE A REVIEW</p>
                                <h2 id={`${baseId}-title`}>후기 쓰기</h2>
                                <p className="rvm-product" title={name}>{name}</p>
                                <ul className="rvm-meta">
                                    <li data-kind="option"><i className="fa-solid fa-tag" aria-hidden="true" />{ctx.option}</li>
                                    <li><i className="fa-solid fa-truck" aria-hidden="true" />{shortDate(ctx.deliveredAt)} 배송 완료</li>
                                    <li data-kind="dday" data-soon={left <= 14 ? "" : undefined}><i className="fa-regular fa-calendar" aria-hidden="true" />{shortDate(ctx.deadline)}까지 · D-{left}</li>
                                </ul>
                            </div>
                        </header>

                        <div className="rvm-body" id={`${baseId}-panel`}>
                            <p className="rvm-hello">{withJosa(pet.name)} 함께 써 본 이야기를 들려주세요.</p>

                            {/* 후기 종류 */}
                            <div className="rvm-types" role="tablist" aria-label="후기 종류">
                                {([
                                    ["text", "일반 후기", "글로만 남겨요", "menu-daily-community-128.webp"],
                                    ["photo", "포토 후기", "사진과 함께 남겨요", "find-showcase-256.webp"],
                                ] as Array<[Tab, string, string, string]>).map(([key, label, sub, art]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        role="tab"
                                        aria-selected={tab === key}
                                        aria-controls={`${baseId}-panel`}
                                        className="rvm-type"
                                        data-kind={key}
                                        onClick={() => setTab(key)}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={`${UI}${art}`} alt="" width={52} height={52} />
                                        <span className="rvm-type-text">
                                            <b>{label}</b>
                                            <small>{sub}</small>
                                        </span>
                                        <span className="rvm-type-point">+{ctx.rewardPoints.toLocaleString()}원</span>
                                        <span className="rvm-type-check" aria-hidden="true"><i className="fa-solid fa-check" /></span>
                                    </button>
                                ))}
                            </div>

                            {/* ① 별점 */}
                            <section className="rvm-block rvm-rating" data-done={blocks.rating ? "" : undefined}>
                                <h3>{numberBadge(blocks.rating)} 상품은 어떠셨나요? <span className="rvm-req">필수</span></h3>
                                <div className="rvm-stars" role="radiogroup" aria-label="별점" onMouseLeave={() => setHover(0)}>
                                    {[1, 2, 3, 4, 5].map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            role="radio"
                                            aria-checked={rating === value}
                                            aria-label={`${value}점 · ${ratingWords[value]}`}
                                            className="rvm-star"
                                            data-on={value <= shownRating ? "" : undefined}
                                            onMouseEnter={() => setHover(value)}
                                            onClick={() => setRating(value)}
                                        >
                                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={STAR} /></svg>
                                        </button>
                                    ))}
                                </div>
                                <p className="rvm-star-word" data-empty={shownRating ? undefined : ""} aria-live="polite">
                                    {shownRating ? <>{ratingWords[shownRating]} <span>{shownRating}점</span></> : "별을 눌러 골라 주세요"}
                                </p>
                            </section>

                            {/* ② 짧은 평가 */}
                            <section className="rvm-block" data-done={blocks.fit ? "" : undefined}>
                                <h3>{numberBadge(blocks.fit)} {fitQ.question} <span className="rvm-opt-label">선택</span></h3>
                                <div className="rvm-fit" role="radiogroup" aria-label={fitQ.question}>
                                    {fitQ.options.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={fit === option.value}
                                            className="rvm-fit-btn"
                                            data-fit={option.value}
                                            onClick={() => setFit((current) => (current === option.value ? "" : option.value))}
                                        >
                                            <span className="rvm-fit-dot" aria-hidden="true" />
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* ③ 이야기 */}
                            <section className="rvm-block" data-done={blocks.text ? "" : undefined}>
                                <label className="rvm-label" htmlFor={`${baseId}-body`}>
                                    {numberBadge(blocks.text)} 자세한 이야기 <span className="rvm-req">필수</span>
                                </label>
                                <div className="rvm-prompts" aria-label="쓰기 도움">
                                    <span>이런 이야기면 좋아요</span>
                                    {WRITING_PROMPTS.map((prompt) => (
                                        <button key={prompt.label} type="button" onClick={() => addPrompt(prompt.starter)}>
                                            <i className="fa-solid fa-plus" aria-hidden="true" />{prompt.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="rvm-text" data-ok={blocks.text ? "" : undefined}>
                                    <textarea
                                        ref={textRef}
                                        id={`${baseId}-body`}
                                        value={body}
                                        maxLength={MAX_TEXT}
                                        rows={5}
                                        onChange={(event) => setBody(event.target.value)}
                                        placeholder={"예) 3kg 토이푸들에게 S가 딱 맞았어요.\n가벼워서 산책할 때 답답해하지 않아요."}
                                    />
                                    <div className="rvm-text-foot">
                                        <span className="rvm-text-bar" aria-hidden="true">
                                            <i style={{ width: `${Math.min(100, (100 * textLength) / MIN_TEXT)}%` }} />
                                        </span>
                                        <span className="rvm-counter" aria-live="polite">
                                            {blocks.text ? <><i className="fa-solid fa-check" aria-hidden="true" /> 좋아요!</> : `${MIN_TEXT - textLength}자 더`}
                                            <span>{body.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}</span>
                                        </span>
                                    </div>
                                </div>
                            </section>

                            {/* ④ 사진 — 포토 탭에서만 */}
                            {tab === "photo" && (
                                <section className="rvm-block" data-done={blocks.photo ? "" : undefined}>
                                    <h3>
                                        {numberBadge(blocks.photo)} 사진 <span className="rvm-req">1장 이상</span>
                                        <span className="rvm-photo-count">{photos.length} / {MAX_PHOTOS}</span>
                                    </h3>
                                    {photos.length === 0 ? (
                                        <button
                                            type="button"
                                            className="rvm-drop"
                                            data-drag={dragging ? "" : undefined}
                                            onClick={() => fileRef.current?.click()}
                                            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                                            onDragLeave={() => setDragging(false)}
                                            onDrop={onDrop}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={`${UI}find-showcase-256.webp`} alt="" width={76} height={76} />
                                            <b>{dragging ? "여기에 놓아 주세요" : "사진을 골라 주세요"}</b>
                                            <small>눌러서 고르거나 끌어다 놓기 · 최대 {MAX_PHOTOS}장 · 한 장 {MAX_MB}MB까지</small>
                                        </button>
                                    ) : (
                                        <ul
                                            className="rvm-photos"
                                            data-drag={dragging ? "" : undefined}
                                            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                                            onDragLeave={() => setDragging(false)}
                                            onDrop={onDrop}
                                        >
                                            {photos.map((photo, index) => (
                                                <li key={photo.id} className="rvm-photo" data-loading={photo.progress < 100 ? "" : undefined}>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={photo.url} alt={`올린 사진 ${index + 1}`} />
                                                    {index === 0 && <span className="rvm-photo-main">대표</span>}
                                                    {photo.progress < 100 ? (
                                                        <span className="rvm-photo-bar" aria-label={`올리는 중 ${photo.progress}%`}><i style={{ width: `${photo.progress}%` }} /></span>
                                                    ) : (
                                                        <span className="rvm-photo-move">
                                                            <button type="button" onClick={() => movePhoto(index, -1)} disabled={index === 0} aria-label={`사진 ${index + 1} 앞으로`}>
                                                                <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                                                            </button>
                                                            <button type="button" onClick={() => movePhoto(index, 1)} disabled={index === photos.length - 1} aria-label={`사진 ${index + 1} 뒤로`}>
                                                                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                                                            </button>
                                                        </span>
                                                    )}
                                                    <button type="button" className="rvm-photo-del" onClick={() => removePhoto(photo.id)} aria-label={`사진 ${index + 1} 지우기`}>
                                                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                                                    </button>
                                                </li>
                                            ))}
                                            {Array.from({ length: MAX_PHOTOS - photos.length }, (_, index) => (
                                                <li key={`empty-${index}`}>
                                                    {index === 0 ? (
                                                        <button type="button" className="rvm-add" onClick={() => fileRef.current?.click()}>
                                                            <i className="fa-solid fa-plus" aria-hidden="true" />
                                                            <small>{MAX_PHOTOS - photos.length}장 더</small>
                                                        </button>
                                                    ) : (
                                                        <span className="rvm-slot" aria-hidden="true" />
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple hidden onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
                                    {photoNote && <p className="rvm-photo-note" role="status"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {photoNote}</p>}
                                    {/* 2단계: 영상 1개(30초 · 소리 제거) — 자리만 만들어 두고 숨김 */}
                                    <div className="rvm-video" hidden data-phase="2" />
                                    <p className="rvm-privacy">
                                        <i className="fa-solid fa-shield-heart" aria-hidden="true" />
                                        <span>사람 얼굴 · 주소 · 연락처가 보이는 사진은 올리지 말아 주세요. 첫 번째 사진이 대표 사진이 돼요.</span>
                                    </p>
                                </section>
                            )}
                            {tab === "text" && photos.length > 0 && (
                                <p className="rvm-tab-note">
                                    <i className="fa-regular fa-image" aria-hidden="true" /> 고른 사진 {photos.length}장은 <b>포토 후기</b>를 고르면 함께 올라가요.
                                </p>
                            )}

                            {/* ⑤ 우리 아이 정보 */}
                            <section className="rvm-block" data-done="">
                                <h3>{numberBadge(true)} 우리 아이 정보 <span className="rvm-opt-label">다른 보호자가 사이즈를 고를 때 참고해요</span></h3>
                                <div className="rvm-pet" data-edit={petEdit ? "" : undefined}>
                                    <span className="rvm-pet-avatar" aria-hidden="true">{pet.name.slice(0, 1)}<i className="fa-solid fa-paw" /></span>
                                    {petEdit ? (
                                        <div className="rvm-pet-fields">
                                            <label>
                                                <span>견종</span>
                                                <input value={pet.breed} onChange={(event) => setPet({ ...pet, breed: event.target.value })} maxLength={20} />
                                            </label>
                                            <label>
                                                <span>몸무게(kg)</span>
                                                <input inputMode="decimal" value={String(pet.weightKg)} onChange={(event) => setPet({ ...pet, weightKg: Number(event.target.value.replace(/[^0-9.]/g, "")) || 0 })} />
                                            </label>
                                            <label>
                                                <span>고른 사이즈</span>
                                                <select value={pet.size} onChange={(event) => setPet({ ...pet, size: event.target.value })}>
                                                    {SIZES.map((size) => <option key={size}>{size}</option>)}
                                                </select>
                                            </label>
                                        </div>
                                    ) : (
                                        <div className="rvm-pet-text">
                                            <p><b>{pet.name}</b></p>
                                            <ul>
                                                <li>{pet.breed}</li>
                                                <li>{pet.weightKg}kg</li>
                                                <li>{pet.size} 사이즈</li>
                                            </ul>
                                        </div>
                                    )}
                                    <button type="button" className="rvm-pet-edit" onClick={() => setPetEdit((value) => !value)}>
                                        {petEdit ? <><i className="fa-solid fa-check" aria-hidden="true" /> 다 고쳤어요</> : <><i className="fa-solid fa-pen" aria-hidden="true" /> 고치기</>}
                                    </button>
                                </div>
                                {!petEdit && <p className="rvm-pet-from">펫 프로필에서 가져왔어요. 후기에는 이름 · 견종 · 몸무게만 보여요.</p>}
                            </section>
                        </div>

                        {/* 아래 — 남은 할 일 · 등록 */}
                        <footer className="rvm-foot">
                            <ul className="rvm-checks" aria-label="등록 전 확인">
                                {checks.map((check) => (
                                    <li key={check.key} data-done={check.done ? "" : undefined}>
                                        <i className={`fa-solid ${check.done ? "fa-circle-check" : "fa-circle"}`} aria-hidden="true" />
                                        {check.label}
                                    </li>
                                ))}
                            </ul>
                            <button type="button" className="rvm-submit" disabled={!canSubmit} onClick={submit}>
                                {canSubmit ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={`${UI}policy-reward-192.webp`} alt="" width={22} height={22} />
                                        등록하고 {ctx.rewardPoints.toLocaleString()}원 받기
                                    </>
                                ) : uploading ? "사진을 올리는 중이에요" : `${checks.filter((check) => !check.done).length}가지만 더 채워 주세요`}
                            </button>
                        </footer>

                        {/* 쓰던 중 닫기 확인 */}
                        {step === "confirm" && (
                            <div className="rvm-confirm" role="alertdialog" aria-modal="true" aria-labelledby={`${baseId}-confirm`}>
                                <div className="rvm-confirm-card">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`${UI}daily-web-record-384.webp`} alt="" width={72} height={72} />
                                    <p id={`${baseId}-confirm`} className="rvm-confirm-title">후기 쓰기를 그만둘까요?</p>
                                    <p>지금 닫으면 쓴 내용과 고른 사진이 사라져요.</p>
                                    <div>
                                        <button type="button" className="rvm-ghost" onClick={onClose}>그만 쓰기</button>
                                        <button type="button" className="rvm-submit" autoFocus onClick={() => setStep("write")}>계속 쓰기</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}
