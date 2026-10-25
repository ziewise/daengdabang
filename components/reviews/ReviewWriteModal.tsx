/**
 * ReviewWriteModal — 후기 쓰기 창 시안 · 2026-10-25(웹 · 개발 서버 미리보기 전용)
 * ---------------------------------------------------------------------
 * 기획(docs/09-앱-시안-인계/HANDOFF_20261025_REVIEW_FEATURE_SPEC_DRAFT.md 3-2) 그대로의 화면:
 *  - 머리: 상품 사진 · 이름 · 구매 옵션 · 배송 완료일 · 작성 기한(D-day)
 *  - 탭 두 개: 일반 후기(글만 · 올리기 단추 없음) | 포토 후기(사진 1장 이상) — 탭을 바꿔도 쓰던 내용은 그대로
 *  - 별점(크레파스 별 · 말로도 표시) → 짧은 평가(분류별 질문) → 우리 아이 정보(펫 프로필에서 채움 · 고치기)
 *    → 자세한 이야기(10~1,000자 · 글자 수) → [포토] 사진 5칸(대표 · 순서 바꾸기 · 지우기 · 올리는 중 막대) + 개인정보 안내
 *  - 아래: 적립 안내 + 등록 단추(못 누르는 까닭을 단추 위에 한 줄로)
 *  - 쓰던 중 닫으면 "그만 쓸까요?" 확인 판, 등록하면 감사 화면
 *  - 2단계 영상 자리는 만들어 두고 숨김(hidden)
 * 시안이라 서버로 아무것도 보내지 않음 — 등록하면 이 화면의 목록에만 붙고 "미리보기" 표시.
 * 휴대폰은 아래에서 올라오는 판. 꾸밈: app/review-web.css(.rvm-*)
 */
"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import type { CatalogProduct } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { PREVIEW_WRITE_CONTEXT, fitQuestionFor, type OwnReview, type ReviewFit } from "@/lib/reviews-preview";

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
    const [step, setStep] = useState<"write" | "confirm" | "done">("write");
    const [left] = useState(() => daysLeft(ctx.deadline));

    const closeRef = useRef<HTMLButtonElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    // 사진 미리보기 주소 · 올리는 중 타이머 정리용(등록한 사진은 목록에서 계속 써야 해 지우지 않음)
    const photosRef = useRef<Photo[]>([]);
    const timersRef = useRef<number[]>([]);
    const keepRef = useRef(false);

    const dirty = rating > 0 || body.trim().length > 0 || photos.length > 0 || fit !== "";
    const textOk = body.trim().length >= MIN_TEXT;
    const photoOk = tab === "text" || photos.length > 0;
    const uploading = photos.some((photo) => photo.progress < 100);
    const reason = !rating
        ? "별점을 골라 주세요"
        : !textOk
            ? `이야기를 ${MIN_TEXT}자 이상 써 주세요 (${body.trim().length}/${MIN_TEXT})`
            : !photoOk
                ? "사진을 1장 이상 올려 주세요"
                : uploading
                    ? "사진을 올리는 중이에요"
                    : "";
    const canSubmit = !reason;

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

    function updatePhotos(next: Photo[] | ((current: Photo[]) => Photo[])) {
        setPhotos((current) => {
            const value = typeof next === "function" ? next(current) : next;
            photosRef.current = value;
            return value;
        });
    }

    // 사진 고르기 — 5장까지, 너무 큰 파일은 빼고 안내. 시안이라 "올리는 중" 막대만 흉내(서버 전송 없음)
    function onFiles(event: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        const room = MAX_PHOTOS - photosRef.current.length;
        const tooBig = files.filter((file) => file.size > MAX_MB * 1024 * 1024);
        const usable = files.filter((file) => file.size <= MAX_MB * 1024 * 1024 && file.type.startsWith("image/")).slice(0, Math.max(0, room));
        const notes: string[] = [];
        if (tooBig.length) notes.push(`${MAX_MB}MB가 넘는 사진 ${tooBig.length}장은 뺐어요`);
        if (files.length - tooBig.length > room) notes.push(`사진은 ${MAX_PHOTOS}장까지 올릴 수 있어요`);
        setPhotoNote(notes.join(" · "));
        if (!usable.length) return;
        const added = usable.map((file, index) => ({ id: `${Date.now()}-${index}`, url: URL.createObjectURL(file), name: file.name, progress: 0 }));
        updatePhotos((current) => [...current, ...added]);
        const ids = new Set(added.map((photo) => photo.id));
        const timer = window.setInterval(() => {
            updatePhotos((current) => current.map((photo) => (ids.has(photo.id) ? { ...photo, progress: Math.min(100, photo.progress + 20) } : photo)));
            if (photosRef.current.every((photo) => !ids.has(photo.id) || photo.progress >= 100)) window.clearInterval(timer);
        }, 140);
        timersRef.current.push(timer);
    }

    function removePhoto(id: string) {
        const target = photosRef.current.find((photo) => photo.id === id);
        if (target) URL.revokeObjectURL(target.url);
        updatePhotos((current) => current.filter((photo) => photo.id !== id));
        setPhotoNote("");
    }

    function movePhoto(index: number, step: number) {
        updatePhotos((current) => {
            const next = [...current];
            const to = index + step;
            if (to < 0 || to >= next.length) return current;
            [next[index], next[to]] = [next[to], next[index]];
            return next;
        });
    }

    function submit() {
        if (!canSubmit) return;
        keepRef.current = true;
        const usePhotos = tab === "photo" ? photos : [];
        // 일반 후기로 등록하면 고른 사진은 쓰지 않으니 바로 정리
        if (tab === "text") photos.forEach((photo) => URL.revokeObjectURL(photo.url));
        onSubmitted({
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
        });
        setStep("done");
    }

    const shownRating = hover || rating;
    const name = productName(product);

    return createPortal(
        <div className="rvm-overlay" onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
            <div className="rvm" role="dialog" aria-modal="true" aria-labelledby={`${baseId}-title`} data-step={step}>
                <span className="rvm-grip" aria-hidden="true" />
                <button ref={closeRef} type="button" className="rvm-close" onClick={requestClose} aria-label="닫기">
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>

                {step === "done" ? (
                    <div className="rvm-done">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`${UI}brand-std-assure-256.webp`} alt="" width={132} height={132} />
                        <p className="rvm-kicker">THANK YOU</p>
                        <h2 id={`${baseId}-title`}>소중한 후기 <em>고마워요!</em></h2>
                        <p>{pet.name}의 이야기가 다른 보호자에게 큰 도움이 될 거예요.</p>
                        <p className="rvm-done-point">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${UI}policy-reward-192.webp`} alt="" width={26} height={26} />
                            <b>{ctx.rewardPoints.toLocaleString()}원</b> 적립 예정 <span>마이페이지 · 적립금에서 확인</span>
                        </p>
                        <p className="rvm-preview-note"><i className="fa-solid fa-flask" aria-hidden="true" /> 미리보기 — 서버 연결 전이라 실제로 저장되지 않아요</p>
                        <div className="rvm-done-actions">
                            <button type="button" className="rvm-ghost" onClick={onClose}>닫기</button>
                            <button
                                type="button"
                                className="rvm-submit"
                                onClick={() => {
                                    onClose();
                                    window.setTimeout(() => document.querySelector("[data-own-reviews] .rvw-list")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
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
                                <p className="rvm-product">{name}</p>
                                <p className="rvm-meta">
                                    <span className="rvm-opt">{ctx.option}</span>
                                    <span>배송 완료 {shortDate(ctx.deliveredAt)}</span>
                                    <span className="rvm-dday" data-soon={left <= 14 ? "" : undefined}>{shortDate(ctx.deadline)}까지 · D-{left}</span>
                                </p>
                            </div>
                        </header>

                        {/* 탭 — 일반 후기 | 포토 후기 */}
                        <div className="rvm-tabs" role="tablist" aria-label="후기 종류" data-active={tab}>
                            <span className="rvm-tab-pill" aria-hidden="true" />
                            {([
                                ["text", "일반 후기", "글로만 써요", "fa-pen-nib"],
                                ["photo", "포토 후기", "사진 1장 이상", "fa-camera"],
                            ] as Array<[Tab, string, string, string]>).map(([key, label, sub, icon]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    id={`${baseId}-tab-${key}`}
                                    aria-selected={tab === key}
                                    aria-controls={`${baseId}-panel`}
                                    className="rvm-tab"
                                    onClick={() => setTab(key)}
                                >
                                    <i className={`fa-solid ${icon}`} aria-hidden="true" />
                                    <span>
                                        <b>{label}</b>
                                        <small>{sub} · {ctx.rewardPoints.toLocaleString()}원</small>
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="rvm-body" id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${tab}`}>
                            {/* 별점 */}
                            <section className="rvm-block rvm-rating">
                                <h3>상품은 어떠셨나요? <span className="rvm-req">필수</span></h3>
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
                                    <span className="rvm-star-word" data-empty={shownRating ? undefined : ""}>
                                        {shownRating ? `${shownRating}점 · ${ratingWords[shownRating]}` : "별을 눌러 골라 주세요"}
                                    </span>
                                </div>
                            </section>

                            {/* 짧은 평가 */}
                            <section className="rvm-block">
                                <h3>{fitQ.question} <span className="rvm-opt-label">선택</span></h3>
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
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* 우리 아이 정보 */}
                            <section className="rvm-block">
                                <h3>우리 아이 정보 <span className="rvm-opt-label">다른 보호자가 참고해요</span></h3>
                                <div className="rvm-pet" data-edit={petEdit ? "" : undefined}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`${UI}pet-photo-128.webp`} alt="" width={48} height={48} />
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
                                            <p><b>{pet.name}</b> · {pet.breed} · {pet.weightKg}kg · {pet.size} 사이즈</p>
                                            <small>펫 프로필에서 가져왔어요</small>
                                        </div>
                                    )}
                                    <button type="button" className="rvm-pet-edit" onClick={() => setPetEdit((value) => !value)}>
                                        {petEdit ? "다 고쳤어요" : "고치기"}
                                    </button>
                                </div>
                            </section>

                            {/* 자세한 이야기 */}
                            <section className="rvm-block">
                                <label className="rvm-label" htmlFor={`${baseId}-body`}>
                                    자세한 이야기 <span className="rvm-req">필수</span>
                                </label>
                                <div className="rvm-text" data-ok={textOk ? "" : undefined}>
                                    <textarea
                                        id={`${baseId}-body`}
                                        value={body}
                                        maxLength={MAX_TEXT}
                                        rows={5}
                                        onChange={(event) => setBody(event.target.value)}
                                        placeholder={"사이즈 · 소재 · 아이의 반응을 적어 주시면\n다른 보호자에게 큰 도움이 돼요."}
                                    />
                                    <span className="rvm-counter" aria-live="polite">
                                        {textOk ? <i className="fa-solid fa-check" aria-hidden="true" /> : null}
                                        {body.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}
                                    </span>
                                </div>
                            </section>

                            {/* 사진 — 포토 탭에서만 */}
                            {tab === "photo" ? (
                                <section className="rvm-block">
                                    <h3>사진 <span className="rvm-req">1장 이상</span> <span className="rvm-photo-count">{photos.length} / {MAX_PHOTOS}</span></h3>
                                    <ul className="rvm-photos">
                                        {photos.map((photo, index) => (
                                            <li key={photo.id} className="rvm-photo" data-loading={photo.progress < 100 ? "" : undefined}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={photo.url} alt={`올린 사진 ${index + 1}`} />
                                                {index === 0 && <span className="rvm-photo-main">대표</span>}
                                                {photo.progress < 100 ? (
                                                    <span className="rvm-photo-bar" aria-label={`올리는 중 ${photo.progress}%`}><i style={{ width: `${photo.progress}%` }} /></span>
                                                ) : (
                                                    <span className="rvm-photo-move">
                                                        <button type="button" onClick={() => movePhoto(index, -1)} disabled={index === 0} aria-label="앞으로">
                                                            <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                                                        </button>
                                                        <button type="button" onClick={() => movePhoto(index, 1)} disabled={index === photos.length - 1} aria-label="뒤로">
                                                            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                                                        </button>
                                                    </span>
                                                )}
                                                <button type="button" className="rvm-photo-del" onClick={() => removePhoto(photo.id)} aria-label={`사진 ${index + 1} 지우기`}>
                                                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                                                </button>
                                            </li>
                                        ))}
                                        {photos.length < MAX_PHOTOS && (
                                            <li>
                                                <button type="button" className="rvm-add" onClick={() => fileRef.current?.click()}>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={`${UI}caretalk-photo-160.webp`} alt="" width={40} height={40} />
                                                    <b>사진 올리기</b>
                                                    <small>{photos.length ? `${MAX_PHOTOS - photos.length}장 더` : `최대 ${MAX_PHOTOS}장`}</small>
                                                </button>
                                            </li>
                                        )}
                                    </ul>
                                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple hidden onChange={onFiles} />
                                    {photoNote && <p className="rvm-photo-note" role="status">{photoNote}</p>}
                                    {/* 2단계: 영상 1개(30초 · 소리 제거) — 자리만 만들어 두고 숨김 */}
                                    <div className="rvm-video" hidden data-phase="2" />
                                    <p className="rvm-privacy">
                                        <i className="fa-solid fa-shield-heart" aria-hidden="true" />
                                        사람 얼굴 · 주소 · 연락처가 보이는 사진은 올리지 말아 주세요. 첫 번째 사진이 대표 사진이 돼요.
                                    </p>
                                </section>
                            ) : (
                                photos.length > 0 && (
                                    <p className="rvm-tab-note">
                                        <i className="fa-regular fa-image" aria-hidden="true" /> 고른 사진 {photos.length}장은 <b>포토 후기</b> 탭에서 함께 올라가요.
                                    </p>
                                )
                            )}
                        </div>

                        {/* 아래 — 적립 · 등록 */}
                        <footer className="rvm-foot">
                            <p className="rvm-reward">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`${UI}policy-reward-192.webp`} alt="" width={22} height={22} />
                                등록하면 <b>{ctx.rewardPoints.toLocaleString()}원</b> 적립 <em>리뷰 2배</em>
                            </p>
                            <div className="rvm-submit-wrap">
                                {reason && <p className="rvm-reason" aria-live="polite">{reason}</p>}
                                <button type="button" className="rvm-submit" disabled={!canSubmit} onClick={submit}>
                                    {tab === "photo" ? "포토 후기 등록" : "후기 등록"}
                                </button>
                            </div>
                        </footer>

                        {/* 쓰던 중 닫기 확인 */}
                        {step === "confirm" && (
                            <div className="rvm-confirm" role="alertdialog" aria-modal="true" aria-labelledby={`${baseId}-confirm`}>
                                <div className="rvm-confirm-card">
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
