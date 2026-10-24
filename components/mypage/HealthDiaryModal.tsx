/**
 * HealthDiaryModal — 마이페이지 건강 기록 "전체 보기" 창(2026-10-24 사용자: 페이지 이동 대신 건강 기록만 모은 창)
 * ---------------------------------------------------------------------
 * 사진 주소는 서버 기록에 없어 글로만 보여 주되 지루하지 않게:
 *  - 머리: 둥근 아이 사진 · 손글씨 꼬리표 HEALTH DIARY · 주아 "몽이의 건강 일기"(이름 세 색 밑줄)
 *  - 요약 칸 셋: 기록 주 수 · 첫 기록 날짜 · 최근 상태
 *  - 타임라인: 세 색 크레파스 줄을 따라 내려가는 날짜 동그라미(주마다 파스텔 색) + 기록 카드
 *    카드 = 상태 칩 · 그 주에 찍은 방향(정면 · 왼쪽 · 오른쪽 · 뒷면 3D 그림, 안 찍은 방향은 흐리게) · 주아 제목 · 설명
 *    "자세히" 를 누르면 이번 주 관찰 · 지난주와 비교(새로 보인 것 / 계속 보이는 것 / 안 보인 것) · 돌봄 할 일이 펼쳐짐
 *  - 아래 버튼 줄: 닫기 · "이번 주 사진 올리러 가기"(우리 아이 기록 페이지 — 기록하기는 기능 화면에서)
 * 조회는 요약 화면과 같은 loadWeeklyPhotoAnalyses(서버 한도 최근 12주). 겉 틀은 반려견 프로필 창과 같은 .ddb-petform 결,
 * 안쪽 꾸밈은 app/mypage-web.css "건강 일기 창". 웹 마이페이지 요약 화면에서만 열림.
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadWeeklyPhotoAnalyses, type WeeklyPhotoAnalysisRecord } from "@/lib/weekly-photo-analysis";
import { PETLENS_PHOTO_VIEWS } from "@/lib/petlens-multiview";
import type { PetProfile } from "@/lib/store";

const TONES = ["mint", "sky", "lav", "yellow", "pink"] as const;
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

// 한국 시간 기준 날짜 조각
function kstParts(iso: string) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return { md: "—", weekday: "", full: "", short: "—" };
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const m = kst.getUTCMonth() + 1;
    const d = kst.getUTCDate();
    return { md: `${m}.${String(d).padStart(2, "0")}`, weekday: WEEKDAY[kst.getUTCDay()], full: `${kst.getUTCFullYear()}년 ${m}월 ${d}일`, short: `${m}월 ${d}일` };
}

type Props = {
    pet: PetProfile;
    petId: number;
    token: string;
    openRecordId?: string;
    onClose: () => void;
};

export default function HealthDiaryModal({ pet, petId, token, openRecordId, onClose }: Props) {
    const titleId = useId();
    const closeRef = useRef<HTMLButtonElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const [retry, setRetry] = useState(0);
    const key = `${petId}:${retry}`;
    const [loaded, setLoaded] = useState<{ key: string; data?: WeeklyPhotoAnalysisRecord[]; error?: string }>({ key: "" });
    // 펼친 기록(처음엔 고른 기록, 없으면 최근 기록)
    const [opened, setOpened] = useState<Set<string>>(() => new Set(openRecordId ? [openRecordId] : []));

    const close = useCallback(() => onClose(), [onClose]);

    // 열려 있는 동안 뒤 화면 스크롤 잠금 · Esc 로 닫기 · 닫기 단추에 초점
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = "hidden";
        closeRef.current?.focus();
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
        window.addEventListener("keydown", onKey);
        return () => {
            root.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [close]);

    // 최근 12주 기록 불러오기(서버 한도)
    useEffect(() => {
        let active = true;
        loadWeeklyPhotoAnalyses({ petProfileId: petId, accessToken: token, limit: 12 })
            .then((data) => { if (active) setLoaded({ key, data }); })
            .catch((reason: unknown) => { if (active) setLoaded({ key, error: reason instanceof Error ? reason.message : "건강 기록을 불러오지 못했습니다." }); });
        return () => { active = false; };
    }, [key, petId, token]);

    const ready = loaded.key === key;
    const records = ready ? loaded.data ?? [] : [];
    const latest = records[0];
    const first = records[records.length - 1];
    const isOpen = (record: WeeklyPhotoAnalysisRecord, index: number) => opened.size === 0 ? index === 0 : opened.has(record.id);

    // 고른 기록으로 창 안에서 내려가기
    useEffect(() => {
        if (!ready || !openRecordId || !bodyRef.current) return;
        const target = bodyRef.current.querySelector<HTMLElement>(`[data-diary-id="${CSS.escape(openRecordId)}"]`);
        if (target) bodyRef.current.scrollTop = target.offsetTop - 12;
    }, [ready, openRecordId]);

    const toggle = (record: WeeklyPhotoAnalysisRecord, index: number) => {
        setOpened((previous) => {
            const next = new Set(previous.size === 0 && records[0] ? [records[0].id] : previous);
            if (isOpen(record, index)) next.delete(record.id); else next.add(record.id);
            if (next.size === 0) next.add("__none__");
            return next;
        });
    };

    return createPortal(
        <div className="ddb-petform ddb-diary" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="ddb-pf-backdrop" onClick={close} aria-hidden="true" />
            <div className="ddb-pf-card">
                <header className="ddb-pf-head">
                    <span className={`ddb-pf-avatar${pet.photoDataUrl ? " is-photo" : ""}`} aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 회원 사진(data URL) · 3D 그림 그대로 */}
                        <img src={pet.photoDataUrl || "/images/ui/mypet-view-front-160.webp"} alt="" />
                    </span>
                    <div className="ddb-pf-titles">
                        <p className="ddb-pf-kicker">HEALTH DIARY</p>
                        <h2 id={titleId}><span className="ddb-pf-name">{pet.name}</span>의 건강 일기</h2>
                        <p className="ddb-pf-sub">주간 사진 건강 체크를 한 주씩 모았어요. 기록을 누르면 자세히 볼 수 있어요.</p>
                    </div>
                    <button ref={closeRef} type="button" className="ddb-pf-close" onClick={close} aria-label={`${pet.name}의 건강 일기 닫기`}>
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </header>

                <div className="ddb-pf-body" ref={bodyRef}>
                    {!ready ? (
                        <div className="ddb-dy-state" aria-live="polite"><i className="fa-solid fa-paw fa-bounce" aria-hidden="true" />건강 일기를 펼치는 중이에요</div>
                    ) : loaded.error ? (
                        <div className="ddb-dy-state">
                            {loaded.error}
                            <button type="button" className="ddb-pf-cancel" onClick={() => setRetry((n) => n + 1)}>다시 불러오기</button>
                        </div>
                    ) : !latest ? (
                        <div className="ddb-dy-state">아직 주간 사진 기록이 없어요. 이번 주 사진을 올리면 첫 장이 시작돼요.</div>
                    ) : (
                        <>
                            {/* 요약 칸 셋 */}
                            <dl className="ddb-dy-stats">
                                <div data-tone="mint"><dt>쌓인 기록</dt><dd><b>{records.length}</b>주</dd></div>
                                <div data-tone="yellow"><dt>첫 기록</dt><dd>{first ? kstParts(first.analyzedAt).short : "—"}</dd></div>
                                <div data-tone="pink"><dt>최근 상태</dt><dd>{latest.statusLabel || "기록 완료"}</dd></div>
                            </dl>

                            {/* 타임라인 */}
                            <ol className="ddb-dy-line">
                                {records.map((record, index) => {
                                    const date = kstParts(record.analyzedAt);
                                    const open = isOpen(record, index);
                                    const tone = TONES[index % TONES.length];
                                    const cmp = record.comparison;
                                    const lines = record.observations.length > 0 ? record.observations : record.summary;
                                    const groups = [
                                        { tone: "pink", label: "새로 보인 것", items: cmp.newObservations },
                                        { tone: "mint", label: "계속 보이는 것", items: cmp.commonObservations },
                                        { tone: "gray", label: "이번엔 안 보인 것", items: cmp.notObservedNow },
                                    ].filter((group) => group.items.length > 0);
                                    return (
                                        <li key={record.id} data-tone={tone} data-diary-id={record.id} className={open ? "is-open" : ""}>
                                            <span className="ddb-dy-node" aria-hidden="true"><b>{date.md}</b><small>{date.weekday}</small></span>
                                            <article className="ddb-dy-card">
                                                <button type="button" className="ddb-dy-top" onClick={() => toggle(record, index)} aria-expanded={open}>
                                                    <span className="ddb-dy-meta">
                                                        {index === 0 && <em className="ddb-dy-new">최근</em>}
                                                        {record.statusLabel && <span className="ddb-dy-chip">{record.statusLabel}</span>}
                                                        <span className="ddb-dy-date">{date.full}</span>
                                                    </span>
                                                    <span className="ddb-dy-views" aria-label={`찍은 사진 ${record.viewCount}장`}>
                                                        {PETLENS_PHOTO_VIEWS.map((view) => (
                                                            // eslint-disable-next-line @next/next/no-img-element -- 작은 3D 방향 그림
                                                            <img key={view.id} src={`/images/ui/mypet-view-${view.id}-160.webp`} alt="" title={view.label} className={record.viewIds.includes(view.id) ? "is-on" : ""} />
                                                        ))}
                                                    </span>
                                                    <strong className="ddb-dy-title">{record.title || "주간 사진 기록"}</strong>
                                                    {record.description && <span className="ddb-dy-desc">{record.description}</span>}
                                                    <span className="ddb-dy-more">{open ? "접기" : "자세히"} <i className={`fa-solid fa-chevron-${open ? "up" : "down"}`} aria-hidden="true" /></span>
                                                </button>

                                                {open && (
                                                    <div className="ddb-dy-detail">
                                                        {lines.length > 0 && (
                                                            <section>
                                                                <h3><span>✓</span>이번 주 관찰</h3>
                                                                <ul className="ddb-dy-checks">{lines.slice(0, 6).map((line) => <li key={line}>{line}</li>)}</ul>
                                                            </section>
                                                        )}
                                                        <section>
                                                            <h3><span>↔</span>지난주와 비교</h3>
                                                            {cmp.status === "ready" ? (
                                                                <>
                                                                    {cmp.headline && <p className="ddb-dy-quote">{cmp.headline}</p>}
                                                                    <div className="ddb-dy-groups">
                                                                        {groups.map((group) => (
                                                                            <div key={group.label} data-tone={group.tone}>
                                                                                <p>{group.label}</p>
                                                                                {group.items.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <p className="ddb-dy-soft">비교할 지난주 기록이 없거나 근거가 부족해요. 같은 각도로 계속 찍으면 달라진 점을 정리해 드려요.</p>
                                                            )}
                                                        </section>
                                                        {record.careActions.length > 0 && (
                                                            <section>
                                                                <h3><span>♥</span>돌봄 할 일</h3>
                                                                <ol className="ddb-dy-todos">{record.careActions.slice(0, 4).map((action, n) => <li key={action}><b>{n + 1}</b>{action}</li>)}</ol>
                                                            </section>
                                                        )}
                                                    </div>
                                                )}
                                            </article>
                                        </li>
                                    );
                                })}
                            </ol>
                            {records.length >= 12 && <p className="ddb-dy-soft ddb-dy-end">최근 12주 기록까지 보여 드려요.</p>}
                        </>
                    )}
                </div>

                <footer className="ddb-pf-foot">
                    <p className="ddb-pf-hint"><i className="fa-solid fa-paw" aria-hidden="true" />새 기록은 우리 아이 기록에서 사진을 올리면 쌓여요.</p>
                    <button type="button" className="ddb-pf-cancel" onClick={close}>닫기</button>
                    <Link href="/my-pet" className="ddb-pf-save" onClick={close}>
                        <i className="fa-solid fa-camera" aria-hidden="true" />이번 주 사진 올리러 가기
                    </Link>
                </footer>
            </div>
        </div>,
        document.body,
    );
}
