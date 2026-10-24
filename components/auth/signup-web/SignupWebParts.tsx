/**
 * SignupWebParts — 웹 새 회원가입 화면의 공용 조각(2026-10-24 사용자 "모든 갈림길 · 모든 단계 · 디테일까지")
 * ---------------------------------------------------------------------
 * 크레파스 결: 무지개 고리 댕다방 강아지 · 영문 손글씨 꼬리표 · 주아 제목 + 세 색 밑줄 · 흰 쿠션 카드 · 3D 그림 · 분홍 알약.
 * (스티커북 요소 — 테이프 · 와펜 · 기울어진 카드 · 점선 — 쓰지 않음)
 *  - SxTop        : 머리(고리 강아지 · JOIN DAENGDABANG · 회원가입 · 한 줄 설명)
 *  - SxSteps      : 단계 줄(끝난 단계 초록 체크 · 지금 단계 분홍) + 세 색 진행 막대
 *  - SxHead       : 카드 머리(3D 그림 · 꼬리표 · 제목 · 설명)
 *  - SxCheck      : 동그라미 체크(진짜 checkbox — 키보드 · 화면 읽기 그대로)
 *  - TermsPanel   : 전체 동의 · 필수(만 14세 · 이용약관 · 개인정보) · 선택(마케팅 이메일/문자) · 항목마다 "보기" 창
 *  - SxDocModal   : 약관 · 동의 내용 창(요약 · 표 · 전문 링크)
 *  - IdentityPanel: 휴대폰 본인인증 — 전 · 진행 중 · 완료 · 이미 가입 · 만 14세 미만 · 재가입 제한 · 취소 · 시간 초과 · 실패
 *  - SignupWebDone: 가입 완료(축하 · 이메일 인증 20C 안내 · 우리 아이 · 마케팅 수신 동의 결과 · 다음에 할 일)
 */
"use client";

import Link from "next/link";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
    SIGNUP_PETLENS_PRIVACY_CONSENT,
    SIGNUP_REQUIRED_PRIVACY_CONSENT,
    SIGNUP_TERMS_AGREEMENT,
} from "@/lib/signup-agreements";
import type { IdentityResult, MarketingChoice } from "@/lib/signup-flow";
import type { PetProfile } from "@/lib/store";

export const UI = "/images/ui/";

/** 가입 방식 이름 */
export const PROVIDER_NAME: Record<string, string> = {
    email: "이메일",
    kakao: "카카오",
    naver: "네이버",
    google: "구글",
};

/* ───────── 머리 ───────── */
export function SxTop({ lead, compact = false }: { lead: string; compact?: boolean }) {
    return (
        <header className={compact ? "sxw-top is-compact" : "sxw-top"}>
            <span className="sxw-ring" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <span><img src={`${UI}logo-poodle-384.webp`} alt="" /></span>
            </span>
            <p className="sxw-kicker">JOIN DAENGDABANG</p>
            <h1 className="sxw-title">회원가입</h1>
            <p className="sxw-lead">{lead}</p>
        </header>
    );
}

/* ───────── 단계 줄 ───────── */
export function SxSteps({ labels, now }: { labels: string[]; now: number }) {
    const percent = Math.round(((now + 1) / labels.length) * 100);
    return (
        <nav className="sxw-steps" aria-label={`가입 단계 ${labels.length}단계 중 ${now + 1}단계`}>
            <ol>
                {labels.map((label, index) => {
                    const state = index < now ? "done" : index === now ? "now" : "next";
                    return (
                        <li key={label} data-state={state} aria-current={state === "now" ? "step" : undefined}>
                            <b aria-hidden="true">{state === "done" ? <i className="fa-solid fa-check" /> : index + 1}</b>
                            <span>{label}</span>
                        </li>
                    );
                })}
            </ol>
            <span className="sxw-bar" aria-hidden="true"><span style={{ width: `${percent}%` }} /></span>
        </nav>
    );
}

/* ───────── 카드 머리 ───────── */
export function SxHead({ art, kicker, title, sub, aside }: { art: string; kicker: string; title: ReactNode; sub: ReactNode; aside?: ReactNode }) {
    return (
        <div className="sxw-head">
            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
            <img src={art.startsWith("/") ? art : `${UI}${art}`} alt="" aria-hidden="true" />
            <div>
                <p className="sxw-kicker">{kicker}</p>
                <h2>{title}</h2>
                <p>{sub}</p>
            </div>
            {aside}
        </div>
    );
}

/* ───────── 동그라미 체크 ───────── */
export function SxCheck({ checked, onChange, tone = "pink", label, disabled }: { checked: boolean; onChange: (value: boolean) => void; tone?: "pink" | "mint"; label?: string; disabled?: boolean }) {
    return (
        <span className="sxw-chk" data-tone={tone}>
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={label} disabled={disabled} />
            <span aria-hidden="true"><i className="fa-solid fa-check" /></span>
        </span>
    );
}

/* ───────── 약관 · 동의 내용 창 ───────── */
export type SxDocKind = "age14" | "terms" | "privacy" | "marketing" | "petlens";

const DOC_TITLE: Record<SxDocKind, string> = {
    age14: "만 14세 이상 확인",
    terms: SIGNUP_TERMS_AGREEMENT.title.replace(/^\[필수\]\s*/, ""),
    privacy: SIGNUP_REQUIRED_PRIVACY_CONSENT.title.replace(/^\[필수\]\s*/, ""),
    marketing: "마케팅 정보 수신 동의",
    petlens: SIGNUP_PETLENS_PRIVACY_CONSENT.title.replace(/^\[선택\]\s*/, ""),
};

export function SxDocModal({ kind, onClose }: { kind: SxDocKind | null; onClose: () => void }) {
    const titleId = useId();
    const closeRef = useRef<HTMLButtonElement>(null);

    // Esc 로 닫기 · 열리면 닫기 단추에 초점 · 뒤 화면 스크롤 잠금
    useEffect(() => {
        if (!kind) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        window.setTimeout(() => closeRef.current?.focus(), 0);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = overflow;
        };
    }, [kind, onClose]);

    if (!kind || typeof document === "undefined") return null;
    const required = kind === "age14" || kind === "terms" || kind === "privacy";

    return createPortal(
        <div className="sxw-doc" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="sxw-doc-card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
                <header className="sxw-doc-head">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}policy-info-192.webp`} alt="" aria-hidden="true" />
                    <div>
                        <p className="sxw-kicker">{required ? "REQUIRED" : "OPTIONAL"}</p>
                        <h2 id={titleId}>
                            <span className={required ? "sxw-req" : "sxw-opt"}>{required ? "필수" : "선택"}</span>
                            {DOC_TITLE[kind]}
                        </h2>
                    </div>
                    <button ref={closeRef} type="button" className="sxw-doc-x" onClick={onClose} aria-label="닫기">
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </header>

                <div className="sxw-doc-body">
                    {kind === "age14" && (
                        <>
                            <p>댕다방은 만 14세 이상만 가입할 수 있어요.</p>
                            <ul className="sxw-doc-list">
                                <li>만 14세 미만은 개인정보 수집에 법정대리인(부모님 등)의 동의가 필요해요.</li>
                                <li>법정대리인 동의 절차를 갖추기 전까지는 만 14세 미만의 가입을 받지 않아요.</li>
                                <li>사실과 다르게 동의한 것이 확인되면 계정 이용이 제한될 수 있어요.</li>
                            </ul>
                        </>
                    )}
                    {kind === "terms" && (
                        <>
                            <p>주요 내용을 먼저 확인하고, 전체 약관은 아래 단추로 볼 수 있어요.</p>
                            <ul className="sxw-doc-list">
                                {SIGNUP_TERMS_AGREEMENT.summary.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                            <Link href={SIGNUP_TERMS_AGREEMENT.href} target="_blank" rel="noopener" className="sxw-doc-full">
                                이용약관 전문 보기 <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                            </Link>
                        </>
                    )}
                    {kind === "privacy" && (
                        <>
                            <p>{SIGNUP_REQUIRED_PRIVACY_CONSENT.intro}</p>
                            <div className="sxw-doc-table" role="table" aria-label="수집 항목 · 이용 목적 · 보유기간">
                                <div role="row" className="is-head">
                                    <span role="columnheader">수집 항목</span>
                                    <span role="columnheader">이용 목적</span>
                                    <span role="columnheader">보유 · 이용기간</span>
                                </div>
                                {SIGNUP_REQUIRED_PRIVACY_CONSENT.rows.map((row) => (
                                    <div role="row" key={row.item}>
                                        <span role="cell">{row.item}</span>
                                        <span role="cell">{row.purpose}</span>
                                        <span role="cell">{row.retention}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="sxw-doc-note">{SIGNUP_REQUIRED_PRIVACY_CONSENT.refusalNotice}</p>
                            <Link href={SIGNUP_REQUIRED_PRIVACY_CONSENT.href} target="_blank" rel="noopener" className="sxw-doc-full">
                                개인정보처리방침 전문 보기 <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                            </Link>
                        </>
                    )}
                    {kind === "marketing" && (
                        <>
                            <p>새 상품 · 할인 · 이벤트 소식을 이메일이나 문자로 받아요. 동의하지 않아도 가입과 쇼핑은 똑같이 할 수 있어요.</p>
                            <div className="sxw-doc-table" role="table" aria-label="마케팅 정보 수신 동의 내용">
                                <div role="row" className="is-head">
                                    <span role="columnheader">항목</span>
                                    <span role="columnheader">이용 목적</span>
                                    <span role="columnheader">보유 · 이용기간</span>
                                </div>
                                <div role="row">
                                    <span role="cell">이메일 주소, 휴대전화번호</span>
                                    <span role="cell">상품 · 할인 · 이벤트 등 광고성 정보 안내</span>
                                    <span role="cell">동의 철회 또는 회원 탈퇴 시까지</span>
                                </div>
                            </div>
                            <p className="sxw-doc-note">동의한 뒤에도 마이페이지 개인정보 수정에서 언제든 바꿀 수 있고, 처리 결과는 동의한 날짜와 함께 알려 드려요.</p>
                        </>
                    )}
                    {kind === "petlens" && (
                        <>
                            <p>{SIGNUP_PETLENS_PRIVACY_CONSENT.intro}</p>
                            <div className="sxw-doc-table" role="table" aria-label="반려동물 정보 수집 · 이용 내용">
                                <div role="row" className="is-head">
                                    <span role="columnheader">수집 항목</span>
                                    <span role="columnheader">이용 목적</span>
                                    <span role="columnheader">보유 · 이용기간</span>
                                </div>
                                {SIGNUP_PETLENS_PRIVACY_CONSENT.rows.map((row) => (
                                    <div role="row" key={row.item}>
                                        <span role="cell">{row.item}</span>
                                        <span role="cell">{row.purpose}</span>
                                        <span role="cell">{row.retention}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="sxw-doc-note">{SIGNUP_PETLENS_PRIVACY_CONSENT.refusalNotice}</p>
                        </>
                    )}
                </div>

                <footer className="sxw-doc-foot">
                    <button type="button" className="sxw-next" onClick={onClose}>확인했어요</button>
                </footer>
            </section>
        </div>,
        document.body
    );
}

/* ───────── 약관 동의 판 ───────── */
export type TermsValue = {
    age14: boolean;
    terms: boolean;
    privacy: boolean;
    marketing: MarketingChoice;
};

export function TermsPanel({
    value,
    onChange,
    marketingEnabled,
    onOpenDoc,
}: {
    value: TermsValue;
    onChange: (next: TermsValue) => void;
    /** 마케팅 수신 동의 저장이 연동됐을 때만 칸이 나옴 */
    marketingEnabled: boolean;
    onOpenDoc: (kind: SxDocKind) => void;
}) {
    const marketingAny = value.marketing.email || value.marketing.sms;
    const all = value.age14 && value.terms && value.privacy && (!marketingEnabled || (value.marketing.email && value.marketing.sms));
    const setAll = (checked: boolean) => onChange({
        age14: checked,
        terms: checked,
        privacy: checked,
        marketing: marketingEnabled ? { email: checked, sms: checked } : value.marketing,
    });
    const rows: Array<{ key: "age14" | "terms" | "privacy"; label: string; doc: SxDocKind }> = [
        { key: "age14", label: "만 14세 이상입니다", doc: "age14" },
        { key: "terms", label: "이용약관 동의", doc: "terms" },
        { key: "privacy", label: "개인정보 수집·이용 동의", doc: "privacy" },
    ];

    return (
        <div className="sxw-terms" data-signup-web-terms>
            <label className={all ? "sxw-all is-on" : "sxw-all"}>
                <SxCheck checked={all} onChange={setAll} label="전체 동의" />
                <span>
                    <b>전체 동의</b>
                    <small>{marketingEnabled ? "필수 · 선택 항목을 모두 포함해요" : "필수 항목을 모두 포함해요"}</small>
                </span>
            </label>
            <ul>
                {rows.map((row) => (
                    <li key={row.key} className={value[row.key] ? "is-on" : ""}>
                        <label>
                            <SxCheck checked={value[row.key]} onChange={(checked) => onChange({ ...value, [row.key]: checked })} />
                            <span className="sxw-req">필수</span>
                            <span className="sxw-terms-t">{row.label}</span>
                        </label>
                        <button type="button" className="sxw-view" onClick={() => onOpenDoc(row.doc)} aria-label={`${row.label} 내용 보기`}>
                            보기 <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                        </button>
                    </li>
                ))}
                {marketingEnabled && (
                    <li className={marketingAny ? "is-on sxw-mkt" : "sxw-mkt"}>
                        <label>
                            <SxCheck
                                checked={marketingAny}
                                onChange={(checked) => onChange({ ...value, marketing: { email: checked, sms: checked } })}
                            />
                            <span className="sxw-opt">선택</span>
                            <span className="sxw-terms-t">마케팅 정보 수신 동의</span>
                        </label>
                        <button type="button" className="sxw-view" onClick={() => onOpenDoc("marketing")} aria-label="마케팅 정보 수신 동의 내용 보기">
                            보기 <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                        </button>
                        <span className="sxw-channels" role="group" aria-label="받을 방법">
                            {([["email", "이메일", "fa-envelope"], ["sms", "문자(SMS)", "fa-comment-sms"]] as const).map(([key, label, icon]) => (
                                <label key={key} className={value.marketing[key] ? "is-on" : ""}>
                                    <input
                                        type="checkbox"
                                        checked={value.marketing[key]}
                                        onChange={(event) => onChange({ ...value, marketing: { ...value.marketing, [key]: event.target.checked } })}
                                    />
                                    <i className={`fa-solid ${value.marketing[key] ? "fa-circle-check" : icon}`} aria-hidden="true" />
                                    {label}
                                </label>
                            ))}
                        </span>
                    </li>
                )}
            </ul>
        </div>
    );
}

/* ───────── 휴대폰 본인인증 판 ───────── */
export type IdentityState =
    | { phase: "idle" }
    | { phase: "busy" }
    | { phase: "result"; result: IdentityResult };

/** 본인인증 결과로 다음 단계로 갈 수 있는가 */
export function identityPasses(state: IdentityState) {
    return state.phase === "result"
        && state.result.status === "verified"
        && state.result.over14
        && !state.result.existingAccount
        && !state.result.rejoinBlockedUntil;
}

const formatDate = (value: string) => value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1. $2. $3");

export function IdentityPanel({ state, onStart, onRestart }: { state: IdentityState; onStart: () => void; onRestart: () => void }) {
    // 완료 · 갈림길
    if (state.phase === "result" && state.result.status === "verified") {
        const result = state.result;
        if (result.existingAccount) {
            const provider = PROVIDER_NAME[result.existingAccount.provider] || result.existingAccount.provider;
            const isEmail = result.existingAccount.provider === "email";
            return (
                <div className="sxw-branch" data-tone="pink" role="alert" data-identity-branch="duplicate">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}stickers/my-profile.webp`} alt="" aria-hidden="true" />
                    <div>
                        <p className="sxw-branch-k">이미 가입한 사람이에요</p>
                        <h3>{result.name}님 이름으로 가입된 계정이 있어요</h3>
                        <p>한 사람은 한 계정만 만들 수 있어요. 쓰던 계정으로 로그인해 주세요.</p>
                        <span className="sxw-acc">
                            <i className="fa-solid fa-user" aria-hidden="true" />
                            {result.existingAccount.maskedAccount}
                            <em data-provider={result.existingAccount.provider}>{provider} {isEmail ? "가입" : "간편가입"}</em>
                        </span>
                        <span className="sxw-branch-go">
                            <Link href="/auth/login" className="sxw-pill is-pink">그 계정으로 로그인</Link>
                            {isEmail && <Link href="/forgot-password" className="sxw-pill">비밀번호 찾기</Link>}
                        </span>
                    </div>
                </div>
            );
        }
        if (!result.over14) {
            return (
                <div className="sxw-branch" data-tone="gray" role="alert" data-identity-branch="under14">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}stickers/login-lock.webp`} alt="" aria-hidden="true" />
                    <div>
                        <p className="sxw-branch-k">만 14세 미만</p>
                        <h3>지금은 가입할 수 없어요</h3>
                        <p>만 14세 미만은 법정대리인(부모님 등)의 동의가 있어야 가입할 수 있어요. 법정대리인 동의 절차를 갖추기 전까지는 가입을 받지 않아요.</p>
                        <span className="sxw-branch-go"><Link href="/" className="sxw-pill">홈으로</Link></span>
                    </div>
                </div>
            );
        }
        if (result.rejoinBlockedUntil) {
            return (
                <div className="sxw-branch" data-tone="gray" role="alert" data-identity-branch="rejoin">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}policy-info-192.webp`} alt="" aria-hidden="true" />
                    <div>
                        <p className="sxw-branch-k">탈퇴 후 다시 가입</p>
                        <h3>{formatDate(result.rejoinBlockedUntil)}부터 다시 가입할 수 있어요</h3>
                        <p>가입 혜택을 여러 번 받는 일을 막기 위해, 탈퇴한 뒤 정해진 기간 동안은 같은 사람이 다시 가입할 수 없어요.</p>
                        <span className="sxw-branch-go"><Link href="/inquiry/?category=other#inquiry-form" className="sxw-pill">1:1 문의하기</Link></span>
                    </div>
                </div>
            );
        }
        return (
            <div className="sxw-ok" role="status" data-identity-branch="verified">
                <span className="sxw-ok-big" aria-hidden="true"><i className="fa-solid fa-check" /></span>
                <p className="sxw-kicker">VERIFIED</p>
                <h3>본인인증이 끝났어요</h3>
                <dl className="sxw-idres">
                    <div><dt>이름</dt><dd>{result.name}</dd></div>
                    <div><dt>생년월일</dt><dd>{formatDate(result.birthDate)}</dd></div>
                    <div><dt>휴대폰</dt><dd>{result.maskedPhone}</dd></div>
                    <div><dt>통신사</dt><dd>{result.carrier}</dd></div>
                </dl>
                <span className="sxw-ok-chips">
                    <span><i className="fa-solid fa-check" aria-hidden="true" />만 14세 이상</span>
                    <span><i className="fa-solid fa-check" aria-hidden="true" />가입 이력 없음</span>
                </span>
                <button type="button" className="sxw-link" onClick={onRestart}>다른 명의로 다시 인증</button>
            </div>
        );
    }

    // 취소 · 시간 초과 · 실패 안내(아래에 다시 하기 단추)
    const notice = state.phase === "result" ? (
        state.result.status === "cancelled" ? { icon: "fa-circle-xmark", title: "본인인증을 취소했어요", text: "가입하려면 본인인증이 필요해요. 준비되면 다시 시작해 주세요." }
            : state.result.status === "expired" ? { icon: "fa-hourglass-end", title: "인증 시간이 지났어요", text: "보안을 위해 인증 창은 10분 동안만 열려 있어요. 다시 시작해 주세요." }
                : state.result.status === "failed" ? { icon: "fa-triangle-exclamation", title: "본인인증을 마치지 못했어요", text: state.result.message || "통신사 확인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }
                    : null
    ) : null;

    return (
        <div className="sxw-idv">
            <div>
                {notice && (
                    <p className="sxw-notice" data-tone="amber" role="alert" data-identity-branch="retry">
                        <i className={`fa-solid ${notice.icon}`} aria-hidden="true" />
                        <span><b>{notice.title}</b>{notice.text}</span>
                    </p>
                )}
                <ul className="sxw-why">
                    <li><i className="fa-solid fa-user-check" aria-hidden="true" /><span><b>중복 가입을 막아요</b> 이미 가입한 사람인지 확인해요.</span></li>
                    <li><i className="fa-solid fa-cake-candles" aria-hidden="true" /><span><b>만 14세 이상인지 확인해요</b> 생년월일로 확인해요.</span></li>
                    <li><i className="fa-solid fa-lock" aria-hidden="true" /><span><b>받는 정보</b> 이름 · 생년월일 · 성별 · 휴대폰 번호 · 중복가입 확인 정보(CI/DI)</span></li>
                </ul>
                <button type="button" className="sxw-idbtn" onClick={onStart} disabled={state.phase === "busy"} aria-busy={state.phase === "busy"}>
                    <i className={state.phase === "busy" ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-mobile-screen-button"} aria-hidden="true" />
                    {state.phase === "busy" ? "인증 창에서 진행 중이에요" : notice ? "본인인증 다시 하기" : "휴대폰 본인인증 하기"}
                    <small>{state.phase === "busy" ? "창을 닫으면 취소돼요" : "새 창이 열려요"}</small>
                </button>
                <span className="sxw-carriers" aria-label="인증할 수 있는 통신사">
                    <span>SKT</span><span>KT</span><span>LG U+</span><span>알뜰폰</span><span>PASS 앱 · 문자</span>
                </span>
            </div>
            <div className="sxw-phone" aria-hidden="true">
                <div className="sxw-screen">
                    <p className="sxw-screen-h"><b>인증</b>본인확인 창</p>
                    <ol>
                        <li><b>1</b>통신사 고르기</li>
                        <li><b>2</b>PASS 앱 또는 문자로 인증</li>
                        <li><b>3</b>이름 · 생년월일 · 번호 확인</li>
                        <li><b>4</b>인증 끝 → 댕다방으로</li>
                    </ol>
                    <p className="sxw-screen-cap">본인확인 기관 창에서 진행돼요</p>
                </div>
            </div>
        </div>
    );
}

/* ───────── 가입 완료 ───────── */
export function SignupWebDone({
    name,
    pet,
    providerLabel,
    emailNeedsSetup,
    marketing,
    finishLabel,
    onFinish,
    onLeave,
}: {
    name: string;
    pet?: PetProfile;
    /** 간편가입이면 공급자 이름(카카오 등) */
    providerLabel?: string;
    /** 간편가입에서 이메일을 받지 못함 → 마이페이지에서 이메일 등록 안내 */
    emailNeedsSetup?: boolean;
    /** 마케팅 수신 동의 처리 결과(저장이 연동됐을 때만) */
    marketing?: { choice: MarketingChoice; processedAt: string } | null;
    finishLabel: string;
    onFinish: () => void;
    /** 다른 화면으로 나갈 때(가입 이어 하기 표시 지우기) */
    onLeave: () => void;
}) {
    const processed = marketing ? new Date(marketing.processedAt) : null;
    const channels = marketing ? [marketing.choice.email && "이메일", marketing.choice.sms && "문자(SMS)"].filter(Boolean).join(" · ") : "";

    return (
        <section className="sxw-card sxw-done" aria-labelledby="sxw-done-title" data-signup-web-done>
            <span className="sxw-confetti" aria-hidden="true" />
            <span className="sxw-ring is-big" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <span><img src={`${UI}logo-poodle-384.webp`} alt="" /></span>
            </span>
            <p className="sxw-kicker">WELCOME TO DAENGDABANG</p>
            <h2 id="sxw-done-title">가입을 환영해요, <span className="sxw-u">{name}</span>님!</h2>
            <p className="sxw-done-sub">
                {providerLabel ? `${providerLabel} 계정으로 가입했어요. 다음부터는 ${providerLabel} 버튼 하나로 로그인해요.` : "이제 이메일과 비밀번호로 로그인할 수 있어요."}
            </p>

            <div className="sxw-gifts">
                <Link href="/mypage/#daenglab-wallet" className="sxw-gift" data-tone="lav" onClick={onLeave}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}goods-pay-ready-256.webp`} alt="" aria-hidden="true" />
                    <span>
                        <b>{emailNeedsSetup ? "이메일 등록하고 +20C" : "이메일 인증하고 +20C"}</b>
                        <small>마이페이지 코인 탭에서 {emailNeedsSetup ? "실제 이메일을 등록 · 인증" : "이메일을 인증"}하면 바로 들어와요 · 행동·소리 분석 2회</small>
                    </span>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </Link>
                {pet ? (
                    <div className="sxw-gift" data-tone="mint">
                        {pet.photoDataUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- 회원 사진
                            <img src={pet.photoDataUrl} alt="" aria-hidden="true" className="is-photo" />
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element -- 3D 그림
                            <img src={`${UI}lab-dog-256.webp`} alt="" aria-hidden="true" />
                        )}
                        <span>
                            <b>{pet.name} 등록 완료</b>
                            <small>{[pet.breed, pet.size === "small" ? "소형" : pet.size === "large" ? "대형" : "중형", pet.age].filter(Boolean).join(" · ")}</small>
                        </span>
                    </div>
                ) : (
                    <Link href="/mypage/#pet-profiles" className="sxw-gift" data-tone="mint" onClick={onLeave}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}lab-dog-256.webp`} alt="" aria-hidden="true" />
                        <span>
                            <b>우리 아이 등록하기</b>
                            <small>마이페이지에서 언제든 등록할 수 있어요</small>
                        </span>
                        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    </Link>
                )}
            </div>

            {marketing && processed && (
                <p className="sxw-mkt-result" role="status">
                    <i className="fa-solid fa-envelope-circle-check" aria-hidden="true" />
                    <span>
                        <b>마케팅 정보 수신 동의 처리 결과</b>
                        댕다방 · {processed.getFullYear()}년 {processed.getMonth() + 1}월 {processed.getDate()}일 · {channels} 수신에 동의했어요. 마이페이지에서 언제든 바꿀 수 있어요.
                    </span>
                </p>
            )}

            <div className="sxw-next3" aria-label="이어서 해 보기">
                <Link href="/recommendations/" onClick={onLeave}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}hotpick-outdoor-128.webp`} alt="" aria-hidden="true" />
                    <span>{pet ? `${pet.name} 맞춤 상품` : "맞춤 상품 보기"}</span>
                </Link>
                <Link href="/mypage/daily/" onClick={onLeave}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}daily-checkin-256.webp`} alt="" aria-hidden="true" />
                    <span>첫 출석 도장</span>
                </Link>
                <Link href="/pet-lens/" onClick={onLeave}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}header-petlens-128.webp`} alt="" aria-hidden="true" />
                    <span>사진 건강 분석</span>
                </Link>
            </div>

            <button type="button" className="sxw-next sxw-done-go" onClick={onFinish}>
                {finishLabel}<i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
        </section>
    );
}

/** 여러 단계에서 쓰는 알림 줄(오류 · 안내) */
export function SxNotice({ tone, icon, title, children }: { tone: "rose" | "amber" | "mint" | "lav"; icon: string; title?: string; children: ReactNode }) {
    return (
        <p className="sxw-notice" data-tone={tone} role={tone === "rose" ? "alert" : "status"}>
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
            <span>{title && <b>{title}</b>}{children}</span>
        </p>
    );
}

/** 공급자 표시(카카오 노랑 · 네이버 초록 · 구글 흰) */
export function ProviderMark({ provider }: { provider: string }) {
    if (provider === "kakao") return <i className="fa-solid fa-comment" aria-hidden="true" />;
    if (provider === "naver") return <span className="sxw-nv" aria-hidden="true">N</span>;
    if (provider === "google") return <span className="sxw-gg" aria-hidden="true">G</span>;
    return <i className="fa-solid fa-envelope" aria-hidden="true" />;
}

/** 지금 화면 맨 위로(단계 바뀔 때) */
export function useScrollTopOn(key: string) {
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [key]);
}
