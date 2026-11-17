/**
 * PurchaseReviews — 상품 상세 "댕다방 구매 후기"(자사몰 후기) · 2026-11-17 크레파스 디자인 입힘
 * ---------------------------------------------------------------------
 * 동작(협업자 코드 그대로): 화면 가까이 오면 불러오기 · 정렬(최신 · 도움돼요 · 별점 높은/낮은) · 사진 후기만 ·
 *   도움돼요(누르면 서버에 보내고 다시 불러옴) · 신고(사유 입력) · 더 보기(next_offset) · 적립 안내(reward-settings)
 * 바뀐 것은 겉모양뿐(사용자 11-17 "우리 디자인과 전혀 맞지 않잖아"):
 *  ① 후기 보드 — 크림 쿠션 종이 · 꼬리표 · 세 색 밑줄 제목 · 무지개 크레파스 테 점수 메달 · 후기 쓰기 띠
 *  ② 고르기 줄 — 체크박스 대신 미끄러지는 알약(전체 · 사진 후기), 기본 선택 상자 대신 정렬 펼침 메뉴
 *  ③ 후기 카드 — 왼쪽 구매자 · 오른쪽 별점 · 옵션 · 사이즈 · 글(3줄 넘으면 접기) · 사진 · 도움돼요 · 신고 · 댕다방 답글
 * 후기 탭(ProductTabs) 안에서 "댕다방 구매 후기 | 네이버 스토어 후기" 로 나뉘어 보임:
 *  - active: 탭 쪽에서 후기 구역이 가까워졌다고 알려 주면 불러옴(없으면 이 부품이 스스로 지켜봄)
 *  - hidden: 네이버 후기를 보는 동안 숨기되 불러온 내용 · 고른 정렬은 그대로 둠
 *  - onSummary: 후기 수를 탭 숫자 · 고르기 스위치에 알려 줌
 * 꾸밈: 웹 app/review-web.css(.rvw-* · .rvb-* · .rvc-*) + 이 부품 전용 보탬 app/review-purchase.css(웹 · 앱)
 */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { commerceApi, commerceUrl, type Review } from "@/lib/commerce-api";
import { RATING_WORDS } from "@/lib/reviews-preview";
import CrayonStars from "./CrayonStars";
import "@/app/review-web.css";
import "@/app/review-purchase.css";

type Summary = { count: number; average: number; photo_count: number };
type Result = { items: Review[]; next_offset: number | null; summary: Summary };

const UI = "/images/ui/";
// 정렬 — 값은 서버 주소 그대로(sort=...)
const SORTS: Array<{ key: string; label: string }> = [
    { key: "latest", label: "최신순" },
    { key: "helpful", label: "도움돼요순" },
    { key: "rating_high", label: "별점 높은순" },
    { key: "rating_low", label: "별점 낮은순" },
];
// 사이즈 느낌(후기 쓸 때 고른 값) — 상품 종류와 상관없이 짧은 말로
const FIT_LABEL: Record<NonNullable<Review["fit"]>, string> = { small: "작아요", good: "딱 맞아요", big: "커요" };

/** "2026-11-12T10:00:00+09:00" → "2026.11.12" */
const dot = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
};

export default function PurchaseReviews({
    productId,
    active: activeFromTabs,
    hidden = false,
    onSummary,
}: {
    productId: string;
    active?: boolean;
    hidden?: boolean;
    onSummary?: (summary: Summary) => void;
}) {
    const root = useRef<HTMLDivElement>(null);
    const sortRef = useRef<HTMLDivElement>(null);
    const [selfActive, setSelfActive] = useState(false);
    const [result, setResult] = useState<Result>();
    // 전체 후기 기준 숫자(사진만 볼 때도 머리 · 고르기 줄 숫자가 바뀌지 않게 따로 둠)
    const [overall, setOverall] = useState<Summary>();
    const [sort, setSort] = useState("latest");
    const [sortOpen, setSortOpen] = useState(false);
    const [photo, setPhoto] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [reward, setReward] = useState({ text_amount: 250, photo_bonus: 750 });
    const active = activeFromTabs ?? selfActive;

    // 탭 쪽에서 알려 주지 않을 때만 스스로 화면 가까이 왔는지 지켜봄(협업자 원래 방식)
    useEffect(() => {
        if (activeFromTabs !== undefined) return;
        const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setSelfActive(true); observer.disconnect(); } }, { rootMargin: "200px" });
        if (root.current) observer.observe(root.current);
        return () => observer.disconnect();
    }, [activeFromTabs]);
    useEffect(() => { if (active) void commerceApi<{ text_amount: number; photo_bonus: number }>("/api/v1/reviews/reward-settings").then(setReward).catch(() => {}); }, [active]);
    const load = useCallback(async (offset = 0) => {
        try {
            const data = await commerceApi<Result>(`/api/v1/products/${encodeURIComponent(productId)}/reviews?sort=${sort}${photo ? "&type=photo" : ""}&offset=${offset}`);
            setResult(previous => offset && previous ? { ...data, items: [...previous.items, ...data.items] } : data); setError("");
            if (!photo) setOverall(data.summary);
        } catch (e) { setError((e as Error).message); }
    }, [productId, sort, photo]);
    useEffect(() => { if (active) { void load(); } }, [active, load]);
    // 후기 수를 탭(숫자 · 고르기 스위치)에 알려 줌
    useEffect(() => { if (overall) onSummary?.(overall); }, [overall, onSummary]);
    const helpful = async (review: Review) => { try { await commerceApi(`/api/v1/reviews/${review.id}/helpful`, { method: "POST" }); await load(); } catch (e) { setMessage((e as Error).message); } };
    const report = async (review: Review) => { const reason = window.prompt("신고 사유를 입력해 주세요. (2자 이상)"); if (!reason || reason.trim().length < 2) return; try { await commerceApi(`/api/v1/reviews/${review.id}/report`, { method: "POST", body: JSON.stringify({ reason }) }); setMessage("신고를 접수했어요."); } catch (e) { setMessage((e as Error).message); } };

    // 정렬 메뉴 — 바깥을 누르거나 Esc 면 닫힘
    useEffect(() => {
        if (!sortOpen) return;
        const close = (event: PointerEvent) => { if (!sortRef.current?.contains(event.target as Node)) setSortOpen(false); };
        const esc = (event: KeyboardEvent) => { if (event.key === "Escape") setSortOpen(false); };
        document.addEventListener("pointerdown", close);
        document.addEventListener("keydown", esc);
        return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
    }, [sortOpen]);

    const summary = overall ?? result?.summary;
    const count = summary?.count ?? 0;
    const average = summary?.average ?? 0;
    const photoCount = summary?.photo_count ?? 0;
    // 아직 숫자를 못 받았을 때 — "첫 후기" 빈 화면이 잠깐 비치지 않게 불러오는 중 머리만
    const loading = !summary && !error;
    const filters = [
        { on: false, label: "전체", count },
        { on: true, label: "사진 후기", count: photoCount, icon: "fa-regular fa-image" },
    ];

    return (
        <div ref={root} className="rvw" data-purchase-reviews="" hidden={hidden} aria-label="댕다방 구매 후기">
            {/* ① 후기 보드 */}
            <section className="rvb" data-empty={count ? undefined : ""} aria-busy={loading || undefined}>
                <header className="rvb-head">
                    <div>
                        <p className="rvw-kicker">DAENGDABANG REVIEWS</p>
                        {loading ? (
                            <h3>구매 후기를 불러오고 있어요</h3>
                        ) : count ? (
                            <h3>구매 후기 <em>{count.toLocaleString()}개</em>가 모였어요</h3>
                        ) : (
                            <h3>아직 <em>첫 후기</em>를 기다리고 있어요</h3>
                        )}
                    </div>
                    <p className="rvb-verified">
                        <i className="fa-solid fa-circle-check" aria-hidden="true" /> 댕다방에서 구매한 분의 후기만 모았어요
                    </p>
                </header>

                {count > 0 ? (
                    <div className="rvb-grid" data-pr-grid="">
                        {/* 점수 메달 */}
                        <div className="rvb-medal">
                            <div className="rvb-medal-ring">
                                <div className="rvb-medal-face">
                                    <b>{average.toFixed(1)}</b>
                                    <span>/ 5</span>
                                </div>
                            </div>
                            <CrayonStars value={Math.round(average * 10) / 10} size={21} />
                            <p>{RATING_WORDS[Math.min(5, Math.max(1, Math.round(average)))]}</p>
                        </div>
                        {/* 숫자 두 칸 — 전체 후기 · 사진 후기 */}
                        <ul className="pr-facts">
                            <li>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`${UI}menu-daily-community-128.webp`} alt="" width={44} height={44} />
                                <span>전체 후기</span>
                                <b>{count.toLocaleString()}</b>
                            </li>
                            <li>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`${UI}find-showcase-256.webp`} alt="" width={44} height={44} />
                                <span>사진 후기</span>
                                <b>{photoCount.toLocaleString()}</b>
                            </li>
                        </ul>
                    </div>
                ) : loading ? null : (
                    <div className="rvb-first">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`${UI}find-showcase-256.webp`} alt="" width={120} height={120} />
                        <p>이 상품을 받아 보셨다면 <b>첫 후기</b>를 남겨 주세요.<br />사진 한 장, 한 줄 이야기도 다른 보호자에게 큰 힘이 돼요.</p>
                    </div>
                )}

                {/* 후기 쓰기 띠 — 주문 내역에서 씀(협업자 연결 그대로) */}
                <div className="rvb-write">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="rvb-write-art" src={`${UI}daily-web-record-384.webp`} alt="" width={72} height={72} />
                    <div className="rvb-write-text">
                        <p className="rvb-write-title">구매하셨다면 후기를 남겨 주세요</p>
                        <ul className="rvb-write-meta">
                            <li><i className="fa-regular fa-calendar" aria-hidden="true" /> 배송 완료 후 90일 이내</li>
                            <li data-point="">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`${UI}policy-reward-192.webp`} alt="" width={16} height={16} /> 글 후기 {reward.text_amount.toLocaleString()}P · 사진 더하면 +{reward.photo_bonus.toLocaleString()}P
                            </li>
                            <li><i className="fa-solid fa-user" aria-hidden="true" /> 회원만 적립</li>
                        </ul>
                    </div>
                    <Link href="/mypage/orders/" className="rvb-write-btn">
                        <i className="fa-solid fa-pen" aria-hidden="true" /> 후기 쓰기
                    </Link>
                </div>
            </section>

            {/* ② 고르기 · 정렬 — 후기가 있을 때만 */}
            {count > 0 && (
                <div className="rvw-tools">
                    <div className="rvw-seg" role="tablist" aria-label="후기 고르기" style={{ ["--seg-i" as string]: photo ? 1 : 0, ["--seg-n" as string]: filters.length }}>
                        <span className="rvw-seg-pill" aria-hidden="true" />
                        {filters.map((item) => (
                            <button key={item.label} type="button" role="tab" aria-selected={photo === item.on} onClick={() => setPhoto(item.on)}>
                                {item.icon && <i className={item.icon} aria-hidden="true" />}
                                {item.label}
                                <b>{item.count.toLocaleString()}</b>
                            </button>
                        ))}
                    </div>
                    <div className="rvw-sort" ref={sortRef}>
                        <button type="button" className="rvw-sort-btn" aria-haspopup="listbox" aria-expanded={sortOpen} aria-label={`후기 정렬: ${SORTS.find((item) => item.key === sort)?.label}`} onClick={() => setSortOpen((value) => !value)}>
                            <i className="fa-solid fa-arrow-down-wide-short" aria-hidden="true" />
                            {SORTS.find((item) => item.key === sort)?.label}
                            <i className="fa-solid fa-chevron-down rvw-sort-caret" aria-hidden="true" />
                        </button>
                        {sortOpen && (
                            <ul className="rvw-sort-menu" role="listbox" aria-label="후기 정렬">
                                {SORTS.map((item) => (
                                    <li key={item.key}>
                                        <button type="button" role="option" aria-selected={sort === item.key} onClick={() => { setSort(item.key); setSortOpen(false); }}>
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

            {/* ③ 후기 목록 · 불러오는 중 · 다시 시도 */}
            {error ? (
                <p className="pr-state" role="alert">
                    {error} <button type="button" className="rvw-link" onClick={() => void load()}>다시 시도</button>
                </p>
            ) : !result ? (
                <p className="pr-state">후기를 확인하고 있어요.</p>
            ) : count > 0 && (
                <ul className="rvw-list">
                    {result.items.map((review, index) => (
                        <ReviewCard key={review.id} review={review} tone={index % 3} onHelpful={() => void helpful(review)} onReport={() => void report(review)} />
                    ))}
                    {result.items.length === 0 && (
                        <li className="rvw-none">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${UI}web-no-match-192.webp`} alt="" width={80} height={80} />
                            <p>사진이 담긴 후기가 아직 없어요.</p>
                            <button type="button" className="rvw-link" onClick={() => setPhoto(false)}>전체 후기 보기</button>
                        </li>
                    )}
                </ul>
            )}

            {result?.next_offset != null && (
                <button type="button" className="rvw-more" onClick={() => void load(result.next_offset!)}>
                    후기 더 보기 <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                </button>
            )}

            {count > 0 && (
                <p className="rvw-foot">후기는 댕다방에서 구매하신 분이 작성했어요. 적립금을 받은 후기는 카드에 함께 적어 두었어요.</p>
            )}
            {message && <p role="status" className="pr-state" data-note="">{message}</p>}
        </div>
    );
}

/** 후기 카드 한 장 — PC: 왼쪽 구매자 | 오른쪽 내용, 휴대폰: 위아래 */
function ReviewCard({ review, tone, onHelpful, onReport }: { review: Review; tone: number; onHelpful: () => void; onReport: () => void }) {
    const [open, setOpen] = useState(false);
    // 3줄을 넘는지 실제 그려진 높이로 판단 — 넘칠 때만 "더 보기"
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
    const rating = Math.min(5, Math.max(1, Math.round(review.rating)));

    return (
        <li className="rvc" data-tone={tone}>
            {/* 왼쪽 — 구매자 */}
            <div className="rvc-who">
                <span className="rvc-avatar" aria-hidden="true">
                    {review.masked_name.slice(0, 1)}
                    <i className="fa-solid fa-paw" />
                </span>
                <div className="rvc-who-text">
                    <p className="rvc-name"><b>{review.masked_name}</b></p>
                    <p className="rvc-verified"><i className="fa-solid fa-bag-shopping" aria-hidden="true" /> 구매 확인</p>
                </div>
            </div>

            {/* 오른쪽 — 후기 */}
            <div className="rvc-main">
                <header className="rvc-head">
                    <CrayonStars value={rating} size={18} />
                    <span className="rvc-word">{RATING_WORDS[rating]}</span>
                    <time className="rvc-date" dateTime={review.created_at}>{dot(review.created_at)}</time>
                </header>

                <ul className="rvc-tags">
                    <li data-tag="option"><span>구매 옵션</span>{review.option || "기본"}</li>
                    {review.fit && <li data-tag="fit" data-fit={review.fit}><span>사이즈</span>{FIT_LABEL[review.fit]}</li>}
                </ul>

                <p ref={bodyRef} className="rvc-body" data-clamp={open ? undefined : ""}>{review.body}</p>
                {(overflow || open) && (
                    <button type="button" className="rvw-link rvc-body-more" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
                        {open ? "접기" : "더 보기"} <i className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                    </button>
                )}

                {review.media.length > 0 && (
                    <div className="rvc-media">
                        {review.media.map((media) => (
                            <a key={media.id} className="rvc-thumb" href={commerceUrl(media.url)} target="_blank" rel="noreferrer" aria-label="후기 사진 크게 보기">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img loading="lazy" src={commerceUrl(media.url)} alt="구매자가 올린 상품 사용 사진" width={120} height={120} />
                            </a>
                        ))}
                    </div>
                )}

                {review.reward_disclosure && <p className="pr-disclosure"><i className="fa-solid fa-coins" aria-hidden="true" /> {review.reward_disclosure}</p>}

                <footer className="rvc-foot">
                    <button type="button" className="rvc-helpful" aria-pressed={review.helpful_by_me} onClick={onHelpful}>
                        <i className={`${review.helpful_by_me ? "fa-solid" : "fa-regular"} fa-thumbs-up`} aria-hidden="true" />
                        도움돼요 <b>{review.helpful_count}</b>
                    </button>
                    {review.helpful_count > 0 && <span className="rvc-helpful-note">{review.helpful_count}명에게 도움이 됐어요</span>}
                    <button type="button" className="rvc-report" onClick={onReport}>신고</button>
                </footer>

                {review.seller_reply && (
                    <div className="rvc-reply">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`${UI}logo-poodle-384.webp`} alt="" width={40} height={40} />
                        <div>
                            <p className="rvc-reply-head"><b>댕다방</b> 답글</p>
                            <p>{review.seller_reply.body}</p>
                        </div>
                    </div>
                )}
            </div>
        </li>
    );
}
