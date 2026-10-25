/**
 * ProductOwnReviews — 상품 상세 "댕다방 구매 후기" 구역 시안 2차 · 2026-10-25(웹 · 개발 서버 미리보기 전용)
 * ---------------------------------------------------------------------
 * 서버(협업자)의 후기 기능이 생기기 전 화면 시안. lib/reviews-preview.ts 의 예시 자료로 그림.
 * 켜는 법: 개발 서버에서 상품 주소에 ?rvpreview=1 (첫 후기 빈 화면은 ?rvpreview=empty). 배포 빌드에서는 ProductTabs 가 이 구역을 그리지 않음.
 *
 * 2차(사용자 "어중간해 · 전체 분위기 고도화") — 웹 크레파스 결:
 *  ① 후기 보드: 크림 쿠션 종이 한 장 — 머리(꼬리표 · "보호자 N명의 이야기" 세 색 밑줄 · 구매 확인 알약)
 *     / 무지개 크레파스 테 점수 메달 · 별점 크레파스 막대 · 사이즈 눈금(바늘) / 자주 나온 이야기 알약 / 우리 아이 이름으로 부르는 후기 쓰기 띠
 *  ② 포토 모자이크: 큰 사진 1 + 작은 사진 4, 마지막 칸 "+N 전체 보기"(누르면 크게 보기)
 *  ③ 고르기 줄: 흰 쿠션 속 미끄러지는 알약(전체 · 포토 · 우리 아이와 같은 사이즈) + 정렬 펼침 메뉴
 *  ④ 후기 카드: 왼쪽 보호자 · 아이 프로필, 오른쪽 별점 · 구매 옵션 · 사이즈 · 글(3줄 넘으면 접기) · 사진 · 도움돼요 · 신고,
 *     도움 많이 받은 후기 표시, 댕다방 로고 답글 말풍선
 * 시안이라 "도움돼요" · "신고" · "후기 등록"은 화면 안에서만 바뀌고 어디에도 보내지 않음(알림 띠로 "미리보기" 표시).
 * 꾸밈: app/review-web.css(.rvw-* · .rvb-* · .rvp-* · .rvc-*)
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
    { key: "helpful", label: "도움돼요 많은순" },
    { key: "high", label: "별점 높은순" },
    { key: "low", label: "별점 낮은순" },
];
const PAGE = 4;
const EMPTY_SUMMARY: ReviewSummary = {
    average: 0, count: 0, photoCount: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    fit: { small: 0, good: 0, big: 0 },
    keywords: [], similarCount: 0,
};

/** "2026-10-22" → "2026.10.22" */
const dot = (date: string) => date.replaceAll("-", ".");
const shortDate = (date: string) => {
    const [, m, d] = date.split("-");
    return `${Number(m)}월 ${Number(d)}일`;
};

export default function ProductOwnReviews({ product, empty = false }: { product: CatalogProduct; empty?: boolean }) {
    const summary = empty ? EMPTY_SUMMARY : PREVIEW_SUMMARY;
    const fitQ = fitQuestionFor(product.category);
    const ctx = PREVIEW_WRITE_CONTEXT;

    // 화면 안에서만 바뀌는 시안 상태(새로 쓴 후기 · 도움돼요 · 고르기 · 정렬)
    const [mine, setMine] = useState<OwnReview[]>([]);
    const [helpful, setHelpful] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(PREVIEW_REVIEWS.map((review) => [review.id, review.helpfulByMe])),
    );
    const [filter, setFilter] = useState<Filter>("all");
    const [sort, setSort] = useState<Sort>("recent");
    const [sortOpen, setSortOpen] = useState(false);
    const [shown, setShown] = useState(PAGE);
    const [writeOpen, setWriteOpen] = useState(false);
    const [lightbox, setLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null);
    const [toast, setToast] = useState("");
    const sortRef = useRef<HTMLDivElement>(null);

    const all = useMemo(() => [...mine, ...(empty ? [] : PREVIEW_REVIEWS)], [mine, empty]);
    const petSize = ctx.pet.size;
    const helpfulOf = useCallback(
        (review: OwnReview) => review.helpfulCount + (helpful[review.id] && !review.helpfulByMe ? 1 : 0) - (!helpful[review.id] && review.helpfulByMe ? 1 : 0),
        [helpful],
    );

    const list = useMemo(() => {
        const filtered = all.filter((review) => {
            if (filter === "photo") return review.media.length > 0;
            if (filter === "similar") return review.pet?.size === petSize;
            return true;
        });
        return [...filtered].sort((a, b) => {
            if (sort === "helpful") return helpfulOf(b) - helpfulOf(a);
            if (sort === "high") return b.rating - a.rating || b.createdAt.localeCompare(a.createdAt);
            if (sort === "low") return a.rating - b.rating || b.createdAt.localeCompare(a.createdAt);
            return b.createdAt.localeCompare(a.createdAt);
        });
    }, [all, filter, sort, helpfulOf, petSize]);

    // 도움 많이 받은 후기 한 개(10 이상일 때만 표시)
    const bestId = useMemo(() => {
        const top = [...all].sort((a, b) => helpfulOf(b) - helpfulOf(a))[0];
        return top && helpfulOf(top) >= 10 ? top.id : "";
    }, [all, helpfulOf]);

    // 포토 모자이크 — 모든 후기 사진(누르면 그 사진부터 크게)
    const photoItems: LightboxItem[] = useMemo(
        () => all.flatMap((review) => review.media.map((media) => ({ src: media.url, review }))),
        [all],
    );

    // 정렬 메뉴 — 바깥 누르기 · Esc 로 닫기
    useEffect(() => {
        if (!sortOpen) return;
        const onDown = (event: PointerEvent) => {
            if (!sortRef.current?.contains(event.target as Node)) setSortOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setSortOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [sortOpen]);

    const showToast = useCallback((message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(""), 2400);
    }, []);

    const onSubmitted = useCallback((review: OwnReview) => {
        setMine((current) => [review, ...current]);
        setFilter("all");
        setSort("recent");
    }, []);

    // 새로 쓴 후기(시안)도 보드 숫자에 더함
    const totalCount = summary.count + mine.length;
    const average = totalCount ? (summary.average * summary.count + mine.reduce((sum, review) => sum + review.rating, 0)) / totalCount : 0;
    const distribution = { ...summary.distribution };
    mine.forEach((review) => { distribution[review.rating] += 1; });
    const fit = { ...summary.fit };
    mine.forEach((review) => { if (review.fit) fit[review.fit] += 1; });
    const photoCount = summary.photoCount + mine.filter((review) => review.media.length).length;
    const similarCount = summary.similarCount + mine.filter((review) => review.pet?.size === petSize).length;
    const distTotal = Math.max(1, Object.values(distribution).reduce((sum, value) => sum + value, 0));
    const fitTotal = fit.small + fit.good + fit.big;
    // 눈금 바늘 위치(작아요 0 · 딱 맞아요 50 · 커요 100 의 가중 평균)
    const needle = fitTotal ? (fit.good * 50 + fit.big * 100) / fitTotal : 50;
    const fitTop = fitQ.options.reduce((best, option) => (fit[option.value] > fit[best.value] ? option : best), fitQ.options[1]);
    const alreadyWrote = mine.length > 0;

    const filters: Array<{ key: Filter; label: string; count: number; icon?: string }> = [
        { key: "all", label: "전체", count: totalCount },
        { key: "photo", label: "포토", count: photoCount, icon: "fa-regular fa-image" },
        { key: "similar", label: `${petSize} 사이즈`, count: similarCount, icon: "fa-solid fa-paw" },
    ];
    const filterIndex = Math.max(0, filters.findIndex((item) => item.key === filter));

    return (
        <div className="rvw" data-own-reviews>
            {/* ① 후기 보드 */}
            <section className="rvb" aria-label="댕다방 구매 후기 요약" data-empty={totalCount ? undefined : ""}>
                <header className="rvb-head">
                    <div>
                        <p className="rvw-kicker">OUR REVIEWS</p>
                        {totalCount ? (
                            <h3>보호자 <em>{totalCount.toLocaleString()}명</em>의 이야기</h3>
                        ) : (
                            <h3>아직 <em>첫 이야기</em>를 기다리고 있어요</h3>
                        )}
                    </div>
                    <p className="rvb-verified">
                        <i className="fa-solid fa-circle-check" aria-hidden="true" /> 댕다방에서 구매한 분의 후기만 모았어요
                    </p>
                </header>

                {totalCount > 0 ? (
                    <>
                        <div className="rvb-grid">
                            {/* 점수 메달 */}
                            <div className="rvb-medal">
                                <div className="rvb-medal-ring">
                                    <div className="rvb-medal-face">
                                        <b>{average.toFixed(1)}</b>
                                        <span>/ 5</span>
                                    </div>
                                </div>
                                <CrayonStars value={Math.round(average * 10) / 10} size={21} />
                                <p>{RATING_WORDS[Math.max(1, Math.round(average))]}</p>
                            </div>

                            {/* 별점 크레파스 막대 */}
                            <div className="rvb-dist" aria-label="별점 분포">
                                {([5, 4, 3, 2, 1] as const).map((star) => {
                                    const percent = Math.round((100 * distribution[star]) / distTotal);
                                    return (
                                        <div key={star} className="rvb-dist-row" data-top={star === 5 ? "" : undefined}>
                                            <span className="rvb-dist-label"><i className="fa-solid fa-star" aria-hidden="true" />{star}</span>
                                            <span className="rvb-dist-bar" aria-hidden="true"><i style={{ width: `${percent}%` }} /></span>
                                            <span className="rvb-dist-num">{percent}%</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 사이즈 눈금 */}
                            {fitTotal > 0 && (
                                <div className="rvb-fit">
                                    <p className="rvb-fit-q">{fitQ.question}</p>
                                    <p className="rvb-fit-top">
                                        <b>{Math.round((100 * fit[fitTop.value]) / fitTotal)}%</b>가 &ldquo;{fitTop.label}&rdquo;
                                    </p>
                                    <div className="rvb-gauge" aria-hidden="true">
                                        <span className="rvb-gauge-track">
                                            {fitQ.options.map((option) => <i key={option.value} data-fit={option.value} />)}
                                        </span>
                                        <span className="rvb-gauge-needle" style={{ left: `${needle}%` }}><i className="fa-solid fa-paw" /></span>
                                    </div>
                                    <ul className="rvb-gauge-labels">
                                        {fitQ.options.map((option) => (
                                            <li key={option.value} data-on={option.value === fitTop.value ? "" : undefined}>
                                                {option.label}<b>{Math.round((100 * fit[option.value]) / fitTotal)}%</b>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {summary.keywords.length > 0 && (
                            <div className="rvb-keywords">
                                <p>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`${UI}menu-daily-community-128.webp`} alt="" width={28} height={28} /> 자주 나온 이야기
                                </p>
                                <ul>
                                    {summary.keywords.map((keyword, index) => (
                                        <li key={keyword.label} data-rank={index < 3 ? index + 1 : undefined}>
                                            {keyword.label}<b>{keyword.count}</b>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="rvb-first">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`${UI}find-showcase-256.webp`} alt="" width={120} height={120} />
                        <p>이 상품을 받아 보셨다면 <b>첫 후기</b>를 남겨 주세요.<br />사진 한 장, 한 줄 이야기도 다른 보호자에게 큰 힘이 돼요.</p>
                    </div>
                )}

                {/* 우리 아이 이름으로 부르는 후기 쓰기 띠 */}
                <div className="rvb-write" data-done={alreadyWrote ? "" : undefined}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="rvb-write-art" src={`${UI}daily-web-record-384.webp`} alt="" width={72} height={72} />
                    <div className="rvb-write-text">
                        <p className="rvb-write-title">
                            {alreadyWrote ? `${ctx.pet.name} 보호자님, 후기 고마워요!` : `${ctx.pet.name} 보호자님, 이 상품 후기를 남길 수 있어요`}
                        </p>
                        <ul className="rvb-write-meta">
                            <li><i className="fa-solid fa-tag" aria-hidden="true" /> {ctx.option}</li>
                            <li><i className="fa-regular fa-calendar" aria-hidden="true" /> {shortDate(ctx.deadline)}까지</li>
                            <li data-point="">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`${UI}policy-reward-192.webp`} alt="" width={16} height={16} /> {alreadyWrote ? "적립 예정" : "적립"} +{ctx.rewardPoints.toLocaleString()}원 <em>2배</em>
                            </li>
                        </ul>
                    </div>
                    {alreadyWrote ? (
                        <button type="button" className="rvb-write-btn" data-ghost="" onClick={() => document.querySelector("[data-own-reviews] .rvc")?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                            내 후기 보기 <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                        </button>
                    ) : (
                        <button type="button" className="rvb-write-btn" onClick={() => setWriteOpen(true)}>
                            <i className="fa-solid fa-pen" aria-hidden="true" /> 후기 쓰기
                        </button>
                    )}
                </div>
            </section>

            {/* ② 포토 모자이크 */}
            {photoItems.length > 0 && (
                <section className="rvp" aria-label="포토 후기 모아보기">
                    <div className="rvw-row-head">
                        <h3>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${UI}find-showcase-256.webp`} alt="" width={36} height={36} />
                            포토 후기 <b>{photoCount.toLocaleString()}</b>
                        </h3>
                        <button type="button" className="rvw-link" onClick={() => { setFilter("photo"); setShown(PAGE); }}>
                            포토 후기만 보기 <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="rvp-mosaic" data-count={Math.min(photoItems.length, 5)}>
                        {photoItems.slice(0, 5).map((item, index) => {
                            const more = index === 4 ? Math.max(0, photoCount - 5) : 0;
                            return (
                                <button
                                    key={`${item.review.id}-${item.src}-${index}`}
                                    type="button"
                                    className="rvp-tile"
                                    onClick={() => setLightbox({ items: photoItems, index })}
                                    aria-label={more ? `포토 후기 ${photoCount}개 크게 보기` : `${item.review.maskedName}님의 사진 크게 보기`}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.src} alt="" loading="lazy" />
                                    {index === 0 && (
                                        <span className="rvp-cap">
                                            <CrayonStars value={item.review.rating} size={13} />
                                            <span>{item.review.pet ? `${item.review.pet.name} · ${item.review.pet.breed}` : item.review.maskedName}</span>
                                        </span>
                                    )}
                                    {more > 0 && <span className="rvp-more"><b>+{more}</b>전체 보기</span>}
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ③ 고르기 · 정렬 */}
            {all.length > 0 && (
                <div className="rvw-tools">
                    <div className="rvw-seg" role="tablist" aria-label="후기 고르기" style={{ ["--seg-i" as string]: filterIndex, ["--seg-n" as string]: filters.length }}>
                        <span className="rvw-seg-pill" aria-hidden="true" />
                        {filters.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                role="tab"
                                aria-selected={filter === item.key}
                                onClick={() => { setFilter(item.key); setShown(PAGE); }}
                            >
                                {item.icon && <i className={item.icon} aria-hidden="true" />}
                                {item.label}
                                <b>{item.count.toLocaleString()}</b>
                            </button>
                        ))}
                    </div>
                    <div className="rvw-sort" ref={sortRef}>
                        <button type="button" className="rvw-sort-btn" aria-haspopup="listbox" aria-expanded={sortOpen} onClick={() => setSortOpen((value) => !value)}>
                            <i className="fa-solid fa-arrow-down-wide-short" aria-hidden="true" />
                            {SORTS.find((item) => item.key === sort)?.label}
                            <i className="fa-solid fa-chevron-down rvw-sort-caret" aria-hidden="true" />
                        </button>
                        {sortOpen && (
                            <ul className="rvw-sort-menu" role="listbox" aria-label="정렬">
                                {SORTS.map((item) => (
                                    <li key={item.key}>
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={sort === item.key}
                                            onClick={() => { setSort(item.key); setSortOpen(false); }}
                                        >
                                            {item.label}
                                            {sort === item.key && <i className="fa-solid fa-check" aria-hidden="true" />}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* ④ 후기 목록 */}
            {all.length > 0 && (
                <ul className="rvw-list">
                    {list.slice(0, shown).map((review, index) => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            tone={index % 3}
                            best={review.id === bestId}
                            fitLabel={review.fit ? fitQ.options.find((option) => option.value === review.fit)?.label : undefined}
                            fitQuestion={fitQ.question}
                            helpfulOn={!!helpful[review.id]}
                            helpfulCount={helpfulOf(review)}
                            onHelpful={() => setHelpful((current) => ({ ...current, [review.id]: !current[review.id] }))}
                            onReport={() => showToast("미리보기 — 신고는 저장되지 않아요")}
                            onPhoto={(photoIndex) => setLightbox({ items: review.media.map((media) => ({ src: media.url, review })), index: photoIndex })}
                        />
                    ))}
                    {list.length === 0 && (
                        <li className="rvw-none">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${UI}web-no-match-192.webp`} alt="" width={80} height={80} />
                            <p>조건에 맞는 후기가 아직 없어요.</p>
                            <button type="button" className="rvw-link" onClick={() => setFilter("all")}>전체 후기 보기</button>
                        </li>
                    )}
                </ul>
            )}

            {list.length > shown && (
                <button type="button" className="rvw-more" onClick={() => setShown((value) => value + PAGE)}>
                    후기 더 보기
                    <span className="rvw-more-bar" aria-hidden="true"><i style={{ width: `${(100 * shown) / list.length}%` }} /></span>
                    <span className="rvw-more-num">{shown} / {list.length}</span>
                </button>
            )}

            {all.length > 0 && (
                <p className="rvw-foot">
                    후기는 댕다방에서 구매하신 분이 작성했고, 작성하신 분께는 적립금이 지급돼요. 운영 기준에 어긋나는 후기만 신고 확인 후 가려져요.
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

/** 후기 카드 한 장 — PC: 왼쪽 프로필 | 오른쪽 내용, 휴대폰: 위아래 */
function ReviewCard({
    review,
    tone,
    best,
    fitLabel,
    fitQuestion,
    helpfulOn,
    helpfulCount,
    onHelpful,
    onReport,
    onPhoto,
}: {
    review: OwnReview;
    tone: number;
    best: boolean;
    fitLabel?: string;
    fitQuestion: string;
    helpfulOn: boolean;
    helpfulCount: number;
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
    const mine = review.id.startsWith("mine-");

    return (
        <li className="rvc" data-tone={tone} data-mine={mine ? "" : undefined}>
            {/* 왼쪽 — 보호자 · 아이 */}
            <div className="rvc-who">
                <span className="rvc-avatar" aria-hidden="true">
                    {(review.pet?.name ?? review.maskedName).slice(0, 1)}
                    <i className="fa-solid fa-paw" />
                </span>
                <div className="rvc-who-text">
                    <p className="rvc-name">
                        <b>{review.maskedName}</b>
                        {mine && <span className="rvc-mine">내 후기</span>}
                    </p>
                    <p className="rvc-verified"><i className="fa-solid fa-bag-shopping" aria-hidden="true" /> 구매 확인</p>
                </div>
                {review.pet && (
                    <dl className="rvc-pet">
                        <div><dt>아이</dt><dd>{review.pet.name}</dd></div>
                        <div><dt>견종</dt><dd>{review.pet.breed}</dd></div>
                        <div><dt>몸무게</dt><dd>{review.pet.weightKg}kg</dd></div>
                    </dl>
                )}
            </div>

            {/* 오른쪽 — 후기 */}
            <div className="rvc-main">
                <header className="rvc-head">
                    <CrayonStars value={review.rating} size={18} />
                    <span className="rvc-word">{RATING_WORDS[review.rating]}</span>
                    {best && <span className="rvc-best"><i className="fa-solid fa-crown" aria-hidden="true" /> 도움 많이 받은 후기</span>}
                    <span className="rvc-date">{dot(review.createdAt)}</span>
                </header>

                <ul className="rvc-tags">
                    {review.option && <li data-tag="option"><span>구매</span>{review.option}</li>}
                    {fitLabel && <li data-tag="fit" data-fit={review.fit} title={fitQuestion}><span>사이즈</span>{fitLabel}</li>}
                </ul>

                <p ref={bodyRef} className="rvc-body" data-clamp={open ? undefined : ""}>{review.body}</p>
                {(overflow || open) && (
                    <button type="button" className="rvw-link rvc-body-more" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
                        {open ? "접기" : "더 보기"} <i className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                    </button>
                )}

                {review.media.length > 0 && (
                    <div className="rvc-media">
                        {review.media.map((media, index) => (
                            <button key={media.url + index} type="button" className="rvc-thumb" onClick={() => onPhoto(index)} aria-label={`사진 ${index + 1} 크게 보기`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={media.url} alt="" loading="lazy" />
                            </button>
                        ))}
                    </div>
                )}

                <footer className="rvc-foot">
                    <button type="button" className="rvc-helpful" aria-pressed={helpfulOn} onClick={onHelpful}>
                        <i className={`${helpfulOn ? "fa-solid" : "fa-regular"} fa-thumbs-up`} aria-hidden="true" />
                        도움돼요 <b>{helpfulCount}</b>
                    </button>
                    {helpfulCount > 0 && <span className="rvc-helpful-note">{helpfulCount}명에게 도움이 됐어요</span>}
                    <button type="button" className="rvc-report" onClick={onReport}>신고</button>
                </footer>

                {review.sellerReply && (
                    <div className="rvc-reply">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`${UI}logo-poodle-384.webp`} alt="" width={40} height={40} />
                        <div>
                            <p className="rvc-reply-head"><b>댕다방</b> 답글 <span>{dot(review.sellerReply.createdAt)}</span></p>
                            <p>{review.sellerReply.body}</p>
                        </div>
                    </div>
                )}
            </div>
        </li>
    );
}
