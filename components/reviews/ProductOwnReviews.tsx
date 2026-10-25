/**
 * ProductOwnReviews — 상품 상세 "댕다방 구매 후기" 구역 시안 · 2026-10-25(웹 · 개발 서버 미리보기 전용)
 * ---------------------------------------------------------------------
 * 서버(협업자)의 후기 기능이 생기기 전 화면 시안. lib/reviews-preview.ts 의 예시 자료로 그림.
 * 켜는 법: 개발 서버에서 상품 주소에 ?rvpreview=1 (빈 화면은 ?rvpreview=empty). 배포 빌드에서는 ProductTabs 가 이 구역을 아예 그리지 않음.
 *
 * 크레파스 결(웹 컨셉):
 *  - 요약 판: 흰 쿠션 종이 · 큰 주아 평균 + 크레파스 별 · 별점 막대(분홍→노랑→하늘 크레파스 띠) · 짧은 평가 세 칸 막대
 *  - 후기 쓰기 띠: 분홍 파스텔 쿠션 + 3D 공책 그림 + 분홍 알약 단추(적립 · 기한 안내)
 *  - 포토 후기 모아보기: 둥근 사진 줄(누르면 크게 보기)
 *  - 고르기 줄: 알약(전체 · 포토 · 비슷한 아이) + 정렬 알약
 *  - 후기 카드: 흰 쿠션 · 동그라미 머리글자 · 구매 확인 표 · 옵션/아이/평가 알약 · 길면 3줄 접기 · 사진 · 도움돼요 알약 · 신고 · 민트 판매자 답글
 * 시안이라 "도움돼요" · "신고" · "후기 등록"은 화면 안에서만 바뀌고 어디에도 보내지 않음(알림 띠로 "미리보기" 표시).
 * 꾸밈: app/review-web.css(.rvw-*)
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import {
    PREVIEW_REVIEWS,
    PREVIEW_SUMMARY,
    PREVIEW_WRITE_CONTEXT,
    RATING_WORDS,
    fitQuestionFor,
    type OwnReview,
    type ReviewSummary,
} from "@/lib/reviews-preview";
import ReviewWriteModal from "./ReviewWriteModal";
import ReviewLightbox, { type LightboxItem } from "./ReviewLightbox";
import CrayonStars from "./CrayonStars";
import "@/app/review-web.css";

const UI = "/images/ui/";
type Filter = "all" | "photo" | "similar";
type Sort = "recent" | "helpful" | "high" | "low";
const SORTS: Array<{ key: Sort; label: string }> = [
    { key: "recent", label: "최신순" },
    { key: "helpful", label: "도움돼요순" },
    { key: "high", label: "별점 높은순" },
    { key: "low", label: "별점 낮은순" },
];
const PAGE = 3;

/** "2026-10-22" → "2026.10.22" */
const dot = (date: string) => date.replaceAll("-", ".");

export default function ProductOwnReviews({ product, empty = false }: { product: CatalogProduct; empty?: boolean }) {
    const summary: ReviewSummary = empty
        ? { average: 0, count: 0, photoCount: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, fit: { small: 0, good: 0, big: 0 } }
        : PREVIEW_SUMMARY;
    const fitQ = fitQuestionFor(product.category);

    // 화면 안에서만 바뀌는 시안 상태(새로 쓴 후기 · 도움돼요)
    const [mine, setMine] = useState<OwnReview[]>([]);
    const [helpful, setHelpful] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(PREVIEW_REVIEWS.map((review) => [review.id, review.helpfulByMe])),
    );
    const [filter, setFilter] = useState<Filter>("all");
    const [sort, setSort] = useState<Sort>("recent");
    const [shown, setShown] = useState(PAGE);
    const [writeOpen, setWriteOpen] = useState(false);
    const [lightbox, setLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null);
    const [toast, setToast] = useState("");

    const all = useMemo(() => [...mine, ...(empty ? [] : PREVIEW_REVIEWS)], [mine, empty]);
    const petSize = PREVIEW_WRITE_CONTEXT.pet.size;

    const list = useMemo(() => {
        const filtered = all.filter((review) => {
            if (filter === "photo") return review.media.length > 0;
            if (filter === "similar") return review.pet?.size === petSize;
            return true;
        });
        const helpfulOf = (review: OwnReview) => review.helpfulCount + (helpful[review.id] && !review.helpfulByMe ? 1 : 0) - (!helpful[review.id] && review.helpfulByMe ? 1 : 0);
        return [...filtered].sort((a, b) => {
            if (sort === "helpful") return helpfulOf(b) - helpfulOf(a);
            if (sort === "high") return b.rating - a.rating || b.createdAt.localeCompare(a.createdAt);
            if (sort === "low") return a.rating - b.rating || b.createdAt.localeCompare(a.createdAt);
            return b.createdAt.localeCompare(a.createdAt);
        });
    }, [all, filter, sort, helpful, petSize]);

    // 포토 후기 모아보기 — 모든 후기 사진을 한 줄로(누르면 그 사진부터 크게)
    const photoItems: LightboxItem[] = useMemo(
        () => all.flatMap((review) => review.media.map((media) => ({ src: media.url, review }))),
        [all],
    );

    const showToast = useCallback((message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(""), 2400);
    }, []);

    const onSubmitted = useCallback((review: OwnReview) => {
        setMine((current) => [review, ...current]);
        setFilter("all");
        setSort("recent");
    }, []);

    // 새로 쓴 후기(시안)도 요약 숫자에 더함
    const totalCount = summary.count + mine.length;
    const average = totalCount ? (summary.average * summary.count + mine.reduce((sum, review) => sum + review.rating, 0)) / totalCount : 0;
    const distribution = { ...summary.distribution };
    mine.forEach((review) => { distribution[review.rating] += 1; });
    const fit = { ...summary.fit };
    mine.forEach((review) => { if (review.fit) fit[review.fit] += 1; });
    const photoCount = summary.photoCount + mine.filter((review) => review.media.length).length;
    const maxDist = Math.max(1, ...Object.values(distribution));
    const fitTotal = fit.small + fit.good + fit.big;

    return (
        <div className="rvw" data-own-reviews>
            {/* 요약 판 */}
            {totalCount > 0 ? (
                <section className="rvw-sum" aria-label="댕다방 구매 후기 요약">
                    <div className="rvw-score">
                        <p className="rvw-kicker">OUR REVIEWS</p>
                        <p className="rvw-avg">
                            <b>{average.toFixed(1)}</b>
                            <span>/ 5</span>
                        </p>
                        <CrayonStars value={Math.round(average * 10) / 10} size={22} />
                        <p className="rvw-count">
                            후기 <b>{totalCount.toLocaleString()}</b>개 · 포토 <b>{photoCount.toLocaleString()}</b>개
                        </p>
                    </div>
                    <div className="rvw-dist" aria-label="별점 분포">
                        {([5, 4, 3, 2, 1] as const).map((star) => (
                            <div key={star} className="rvw-dist-row">
                                <span className="rvw-dist-label">{star}점</span>
                                <span className="rvw-dist-bar" aria-hidden="true">
                                    <i style={{ width: `${(100 * distribution[star]) / maxDist}%` }} />
                                </span>
                                <span className="rvw-dist-num">{distribution[star]}</span>
                            </div>
                        ))}
                    </div>
                    {fitTotal > 0 && (
                        <div className="rvw-fit" aria-label={fitQ.question}>
                            <p className="rvw-fit-q">{fitQ.question}</p>
                            <p className="rvw-fit-top">
                                <b>{Math.round((100 * fit.good) / fitTotal)}%</b>가 <em>{fitQ.options[1].label}</em>
                            </p>
                            <span className="rvw-fit-bar" aria-hidden="true">
                                {fitQ.options.map((option) => (
                                    <i key={option.value} data-fit={option.value} style={{ flexGrow: fit[option.value] }} />
                                ))}
                            </span>
                            <ul className="rvw-fit-legend">
                                {fitQ.options.map((option) => (
                                    <li key={option.value} data-fit={option.value}>
                                        {option.label} <b>{Math.round((100 * fit[option.value]) / fitTotal)}%</b>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>
            ) : (
                <section className="rvw-empty" aria-label="아직 후기가 없어요">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${UI}find-basics-256.webp`} alt="" width={112} height={112} />
                    <p className="rvw-kicker">FIRST REVIEW</p>
                    <h3>아직 구매 후기가 없어요</h3>
                    <p>이 상품을 받아 보셨다면, <em>첫 번째 이야기</em>를 들려주세요.</p>
                </section>
            )}

            {/* 후기 쓰기 띠 */}
            <div className="rvw-cta">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="rvw-cta-art" src={`${UI}daily-web-record-384.webp`} alt="" width={84} height={84} />
                <div className="rvw-cta-text">
                    <p className="rvw-cta-title">우리 아이의 이야기를 들려주세요</p>
                    <p className="rvw-cta-note">
                        <span><i className="fa-solid fa-truck-fast" aria-hidden="true" /> 배송 완료 후 90일 안에</span>
                        <span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${UI}policy-reward-192.webp`} alt="" width={18} height={18} /> 작성하면 <b>{PREVIEW_WRITE_CONTEXT.rewardPoints.toLocaleString()}원</b> 적립 <em>2배</em>
                        </span>
                    </p>
                </div>
                <button type="button" className="rvw-cta-btn" onClick={() => setWriteOpen(true)}>
                    <i className="fa-solid fa-pen" aria-hidden="true" /> 후기 쓰기
                </button>
            </div>

            {/* 포토 후기 모아보기 */}
            {photoItems.length > 0 && (
                <section className="rvw-photos" aria-label="포토 후기 모아보기">
                    <div className="rvw-row-head">
                        <h3>포토 후기 모아보기</h3>
                        <button type="button" className="rvw-link" onClick={() => setFilter("photo")}>
                            포토 후기만 보기 <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="rvw-photo-strip">
                        {photoItems.slice(0, 8).map((item, index) => (
                            <button
                                key={`${item.review.id}-${item.src}-${index}`}
                                type="button"
                                className="rvw-photo"
                                onClick={() => setLightbox({ items: photoItems, index })}
                                aria-label={`${item.review.maskedName}님의 사진 크게 보기`}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.src} alt="" loading="lazy" />
                                {index === 7 && photoItems.length > 8 && <span className="rvw-photo-more">+{photoItems.length - 7}</span>}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* 고르기 · 정렬 */}
            {all.length > 0 && (
                <div className="rvw-tools">
                    <div className="rvw-chips" role="group" aria-label="후기 고르기">
                        {([
                            ["all", `전체 ${all.length}`],
                            ["photo", "포토 후기"],
                            ["similar", `우리 아이와 비슷한 (${petSize} 사이즈)`],
                        ] as Array<[Filter, string]>).map(([key, label]) => (
                            <button key={key} type="button" className="rvw-chip" aria-pressed={filter === key} onClick={() => { setFilter(key); setShown(PAGE); }}>
                                {key === "photo" && <i className="fa-regular fa-image" aria-hidden="true" />}
                                {key === "similar" && <i className="fa-solid fa-paw" aria-hidden="true" />}
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="rvw-sorts" role="group" aria-label="정렬">
                        {SORTS.map((item) => (
                            <button key={item.key} type="button" className="rvw-sort" aria-pressed={sort === item.key} onClick={() => setSort(item.key)}>
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 후기 목록 */}
            {all.length > 0 && (
                <ul className="rvw-list">
                    {list.slice(0, shown).map((review) => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            fitLabel={review.fit ? fitQ.options.find((option) => option.value === review.fit)?.label : undefined}
                            fitQuestion={fitQ.question}
                            helpfulOn={!!helpful[review.id]}
                            onHelpful={() => setHelpful((current) => ({ ...current, [review.id]: !current[review.id] }))}
                            onReport={() => showToast("미리보기 — 신고는 저장되지 않아요")}
                            onPhoto={(index) => setLightbox({ items: review.media.map((media) => ({ src: media.url, review })), index })}
                        />
                    ))}
                    {list.length === 0 && (
                        <li className="rvw-none">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${UI}web-no-match-192.webp`} alt="" width={72} height={72} />
                            <p>조건에 맞는 후기가 아직 없어요.</p>
                            <button type="button" className="rvw-link" onClick={() => setFilter("all")}>전체 후기 보기</button>
                        </li>
                    )}
                </ul>
            )}

            {list.length > shown && (
                <button type="button" className="rvw-more" onClick={() => setShown((value) => value + PAGE)}>
                    후기 더 보기 <span>{shown} / {list.length}</span> <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                </button>
            )}

            {all.length > 0 && (
                <p className="rvw-foot">
                    <i className="fa-solid fa-circle-check" aria-hidden="true" /> 모든 후기는 댕다방에서 구매하신 분이 작성했어요. 후기를 쓰면 적립금이 지급돼요.
                </p>
            )}

            {writeOpen && (
                <ReviewWriteModal
                    onClose={() => setWriteOpen(false)}
                    product={product}
                    onSubmitted={onSubmitted}
                    ratingWords={RATING_WORDS}
                />
            )}
            {lightbox && <ReviewLightbox items={lightbox.items} start={lightbox.index} onClose={() => setLightbox(null)} />}
            <p className="rvw-toast" role="status" aria-live="polite" data-show={toast ? "" : undefined}>{toast}</p>
        </div>
    );
}

/** 후기 카드 한 장 */
function ReviewCard({
    review,
    fitLabel,
    fitQuestion,
    helpfulOn,
    onHelpful,
    onReport,
    onPhoto,
}: {
    review: OwnReview;
    fitLabel?: string;
    fitQuestion: string;
    helpfulOn: boolean;
    onHelpful: () => void;
    onReport: () => void;
    onPhoto: (index: number) => void;
}) {
    const [open, setOpen] = useState(false);
    // 3줄을 넘는지 실제 그려진 높이로 판단(PC는 길게, 휴대폰은 짧게 넘침) — 넘칠 때만 "더 보기"
    const bodyRef = useRef<HTMLParagraphElement>(null);
    const [overflow, setOverflow] = useState(false);
    useEffect(() => {
        const node = bodyRef.current;
        if (!node || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(() => {
            if (node.hasAttribute("data-clamp")) setOverflow(node.scrollHeight > node.clientHeight + 2);
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);
    const long = overflow || open;
    const helpfulCount = review.helpfulCount + (helpfulOn && !review.helpfulByMe ? 1 : 0) - (!helpfulOn && review.helpfulByMe ? 1 : 0);
    const initial = review.maskedName.slice(0, 1);

    return (
        <li className="rvw-card" data-type={review.type}>
            <header className="rvw-card-head">
                <span className="rvw-avatar" aria-hidden="true">{initial}</span>
                <div className="rvw-who">
                    <p>
                        <b>{review.maskedName}</b>
                        <span className="rvw-verified"><i className="fa-solid fa-bag-shopping" aria-hidden="true" /> 구매 확인</span>
                        {review.id.startsWith("mine-") && <span className="rvw-mine">내 후기</span>}
                    </p>
                    <p className="rvw-date">{dot(review.createdAt)}</p>
                </div>
                <div className="rvw-rate">
                    <CrayonStars value={review.rating} size={17} />
                    <span>{RATING_WORDS[review.rating]}</span>
                </div>
            </header>

            <ul className="rvw-tags">
                {review.option && <li data-tag="option"><i className="fa-solid fa-tag" aria-hidden="true" /> {review.option}</li>}
                {review.pet && (
                    <li data-tag="pet">
                        <i className="fa-solid fa-paw" aria-hidden="true" /> {review.pet.name} · {review.pet.breed} · {review.pet.weightKg}kg
                    </li>
                )}
                {fitLabel && <li data-tag="fit" title={fitQuestion}>{fitLabel}</li>}
            </ul>

            <p ref={bodyRef} className="rvw-body" data-clamp={open ? undefined : ""}>{review.body}</p>
            {long && (
                <button type="button" className="rvw-link rvw-body-more" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
                    {open ? "접기" : "더 보기"} <i className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
            )}

            {review.media.length > 0 && (
                <div className="rvw-media">
                    {review.media.map((media, index) => (
                        <button key={media.url + index} type="button" className="rvw-thumb" onClick={() => onPhoto(index)} aria-label={`사진 ${index + 1} 크게 보기`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={media.url} alt="" loading="lazy" />
                        </button>
                    ))}
                </div>
            )}

            <footer className="rvw-card-foot">
                <button type="button" className="rvw-helpful" aria-pressed={helpfulOn} onClick={onHelpful}>
                    <i className={`${helpfulOn ? "fa-solid" : "fa-regular"} fa-thumbs-up`} aria-hidden="true" /> 도움돼요 <b>{helpfulCount}</b>
                </button>
                <button type="button" className="rvw-report" onClick={onReport}>신고</button>
            </footer>

            {review.sellerReply && (
                <div className="rvw-reply">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${UI}web-cs-inquiry-160.webp`} alt="" width={34} height={34} />
                    <div>
                        <p className="rvw-reply-head"><b>댕다방</b> 답글 <span>{dot(review.sellerReply.createdAt)}</span></p>
                        <p>{review.sellerReply.body}</p>
                    </div>
                </div>
            )}
        </li>
    );
}
