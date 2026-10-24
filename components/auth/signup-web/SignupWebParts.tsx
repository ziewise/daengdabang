/**
 * SignupWebParts — 웹 회원가입 공용 틀 · 조각
 * ---------------------------------------------------------------------
 * 2026-10-24 4차(사용자 "색상 · 카드 느낌 · 디테일이 지금까지 웹과 달라"): 기존 웹(마이페이지 · 회원 탈퇴 · 결제수단)의 "파스텔 쿠션" 결로.
 *  - SxShell  : 분홍 머리 판(손글씨 꼬리표 · 회원가입 + 세 색 밑줄 · 한 줄 · 가입 방식 · 오른쪽 큰 댕다방 강아지)
 *               → 흰 판 위 단계 줄(단계마다 다른 파스텔 동그라미 + 아이콘 + 번호 배지, 세 색 크레파스 줄로 이음)
 *               → 단계 카드 → 로그인 안내. 모바일은 동그라미 줄 + 지금 단계 한 줄.
 *  - SxCard   : 흰 쿠션 카드 = 머리(SxHead: 테두리 없는 큰 3D 그림 · 꼬리표 · 강조 단어(색 + 세 색 밑줄) 제목 · 한 줄)
 *               → 묶음(SxBlock: 파스텔로 채운 판, 묶음마다 다른 색 · 아이콘 동그라미) → 아래 단추 줄(SxFoot)
 *  - Hl       : 제목 안 강조 단어(분홍 글자 + 세 색 밑줄 — 기존 웹 "꼭 확인해 주세요"와 같은 결)
 *  - 고르기 조각: SxCheck(동그라미 체크) · SxPills(알약 하나 고르기)
 *  - TermsPanel · SxDocModal(약관 내용 창) · IdentityPanel(본인인증) · SxBranch(갈림길 카드) · SignupWebDone(완료)
 *
 * 색: 분홍 · 하늘 · 연보라 · 민트 · 노랑 다섯 파스텔을 칸마다 돌려 씀(채움, 베이지 테두리 없음).
 *   고르면 분홍 · 끝나면 민트 · 혜택은 연보라 · 주의는 노랑 · 오류는 장미. 공급자 색은 공급자 단추 · 표시에만.
 * 크레파스 결(종이 · 세 색 밑줄 · 영문 손글씨 · 3D 그림). 스티커북 요소(테이프 · 와펜 · 기울어진 카드 · 점선) 없음.
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

/** 파스텔 다섯 색(기존 웹과 같은 이름) */
export type SxTone = "pink" | "sky" | "lav" | "mint" | "yellow";

/* ═════════ 단계 목록 — 단계마다 아이콘 · 파스텔 색 ═════════ */
export type SxStep = { label: string; desc: string; icon: string; tone: SxTone };

/** 이메일 가입 단계(본인인증은 연동됐을 때만) */
export function emailSteps(identity: boolean): SxStep[] {
    return [
        { label: "가입 방법", desc: "이메일 또는 간편 가입", icon: "fa-door-open", tone: "sky" },
        { label: "약관 동의", desc: "필수 3가지", icon: "fa-file-signature", tone: "lav" },
        ...(identity ? [{ label: "본인인증", desc: "휴대폰 명의 확인", icon: "fa-mobile-screen-button", tone: "yellow" as const }] : []),
        { label: "계정 정보", desc: "이메일 · 비밀번호", icon: "fa-key", tone: "pink" },
        { label: "우리 아이", desc: "선택 · 나중에 해도 돼요", icon: "fa-paw", tone: "mint" },
        { label: "가입 완료", desc: "혜택 안내", icon: "fa-gift", tone: "pink" },
    ];
}

/** 간편 가입 단계 */
export function socialSteps(providerLabel: string): SxStep[] {
    return [
        { label: "가입 방법", desc: "이메일 또는 간편 가입", icon: "fa-door-open", tone: "sky" },
        { label: "약관 동의", desc: "필수 3가지 · 보안 확인", icon: "fa-file-signature", tone: "lav" },
        { label: `${providerLabel} 로그인`, desc: `${providerLabel} 화면에서 진행`, icon: "fa-right-to-bracket", tone: "yellow" },
        { label: "정보 확인", desc: "받은 정보 확인", icon: "fa-list-check", tone: "pink" },
        { label: "우리 아이", desc: "선택 · 나중에 해도 돼요", icon: "fa-paw", tone: "mint" },
        { label: "가입 완료", desc: "혜택 안내", icon: "fa-gift", tone: "pink" },
    ];
}

/** 제목 안 강조 단어 — 분홍 글자 + 세 색 밑줄 */
export function Hl({ children }: { children: ReactNode }) {
    return <span className="sxw-hl">{children}</span>;
}

/* ═════════ 틀 — 분홍 머리 판 · 단계 줄 · 단계 카드 ═════════ */
export function SxShell({
    steps,
    now,
    route,
    lead,
    children,
}: {
    steps: SxStep[];
    /** 지금 단계 번호(0부터). 모두 끝났으면 steps.length - 1 */
    now: number;
    /** 가입 방식(email · kakao · naver · google). 아직 안 골랐으면 없음 */
    route?: string;
    /** 제목 아래 한 줄 */
    lead: string;
    children: ReactNode;
}) {
    const current = steps[Math.min(now, steps.length - 1)];
    const routeLabel = route ? PROVIDER_NAME[route] : "";
    // 마지막 단계(가입 완료)면 로그인 안내를 숨기고 "가입했어요"로
    const finished = now >= steps.length - 1;

    return (
        <div className="sxw-shell">
            {/* 분홍 머리 판 — 기존 웹 마이페이지 머리 판과 같은 결 */}
            <header className="sxw-hero">
                <span className="sxw-hero-text">
                    <span className="sxw-kicker">JOIN DAENGDABANG</span>
                    <h1 className="sxw-title">회원가입</h1>
                    <p className="sxw-lead">{lead}</p>
                    {routeLabel && (
                        <span className="sxw-route" data-route={route}>
                            <ProviderMark provider={route || "email"} />
                            {routeLabel}로 {finished ? "가입했어요" : "가입하고 있어요"}
                        </span>
                    )}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img className="sxw-hero-art" src={`${UI}logo-poodle-384.webp`} alt="" aria-hidden="true" />
            </header>

            {/* 단계 줄 — 파스텔 동그라미 · 아이콘 · 번호 배지 · 세 색 크레파스 줄 */}
            <nav className="sxw-hsteps" aria-label={`가입 단계 ${steps.length}단계 중 ${now + 1}단계 · ${current?.label || ""}`}>
                <ol style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
                    {steps.map((step, index) => {
                        const state = index < now ? "done" : index === now ? "now" : "next";
                        return (
                            <li key={step.label} data-state={state} data-tone={step.tone} aria-current={state === "now" ? "step" : undefined}>
                                <span className="sxw-hstep-i" aria-hidden="true">
                                    <i className={`fa-solid ${step.icon}`} />
                                    <b>{state === "done" ? <i className="fa-solid fa-check" /> : index + 1}</b>
                                </span>
                                <strong>{step.label}</strong>
                                <small>{step.desc}</small>
                            </li>
                        );
                    })}
                </ol>
                {/* 모바일 — 지금 단계 이름 한 줄 */}
                <p className="sxw-hsteps-now" aria-hidden="true">
                    <span className="sxw-hsteps-n"><b>{Math.min(now + 1, steps.length)}</b>/{steps.length}</span>
                    <strong>{current?.label}</strong>
                    <small>{current?.desc}</small>
                </p>
            </nav>

            <div className="sxw-main">{children}</div>

            {!finished && <p className="sxw-login">이미 회원이신가요?<Link href="/auth/login">로그인</Link></p>}
        </div>
    );
}

/* ═════════ 카드 · 머리 · 묶음 · 아래 단추 줄 ═════════ */
export function SxCard({ children, labelledBy, className = "", as = "section", onSubmit, screen }: {
    children: ReactNode;
    labelledBy: string;
    className?: string;
    as?: "section" | "form";
    onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
    screen?: string;
}) {
    if (as === "form") {
        return (
            <form className={`sxw-card ${className}`} aria-labelledby={labelledBy} onSubmit={onSubmit} noValidate data-signup-screen={screen}>
                {children}
            </form>
        );
    }
    return <section className={`sxw-card ${className}`} aria-labelledby={labelledBy} data-signup-screen={screen}>{children}</section>;
}

/** 카드 머리 — 테두리 없는 큰 3D 그림 · 손글씨 꼬리표 · 제목(강조 단어는 Hl) · 한 줄 */
export function SxHead({ id, art, kicker, title, sub, aside }: { id: string; art: string; kicker: string; title: ReactNode; sub: ReactNode; aside?: ReactNode }) {
    return (
        <header className="sxw-head">
            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
            <img className="sxw-head-art" src={art.startsWith("/") ? art : `${UI}${art}`} alt="" aria-hidden="true" />
            <span className="sxw-head-text">
                <span className="sxw-kicker">{kicker}</span>
                <h2 id={id}>{title}</h2>
                <p>{sub}</p>
            </span>
            {aside}
        </header>
    );
}

/** 카드 안 묶음 — 파스텔로 채운 판(tone) + 작은 제목(색 동그라미 아이콘 · 주아). tone 이 없으면 흰 바탕 그대로 */
export function SxBlock({ icon, title, extra, children, className = "", tone }: { icon: string; title: string; extra?: ReactNode; children: ReactNode; className?: string; tone?: SxTone }) {
    return (
        <section className={`sxw-block ${className}`} data-tone={tone}>
            <h3 className="sxw-block-h">
                <span aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
                {title}
                {extra}
            </h3>
            {children}
        </section>
    );
}

/** 아래 단추 줄 — 이전(흰 알약) · 다음(분홍 알약) · 아래 도움말 */
export function SxFoot({ onPrev, prevLabel = "이전", children, hint }: { onPrev?: () => void; prevLabel?: string; children: ReactNode; hint?: ReactNode }) {
    return (
        <div className="sxw-foot-wrap">
            <div className="sxw-foot">
                {onPrev && (
                    <button type="button" className="sxw-prev" onClick={onPrev}>
                        <i className="fa-solid fa-chevron-left" aria-hidden="true" />{prevLabel}
                    </button>
                )}
                {children}
            </div>
            {hint && <p className="sxw-foot-hint">{hint}</p>}
        </div>
    );
}

/* ═════════ 고르기 조각 ═════════ */
/** 동그라미 체크 — 진짜 checkbox(키보드 · 화면 읽기 그대로), 고르면 분홍 */
export function SxCheck({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label?: string; disabled?: boolean }) {
    return (
        <span className="sxw-chk">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={label} disabled={disabled} />
            <span aria-hidden="true"><i className="fa-solid fa-check" /></span>
        </span>
    );
}

/** 알약 하나 고르기(라디오) — 크기 · 털 길이 · 성별 · 활동량 */
export function SxPills<T extends string>({ label, name, value, options, onChange, hint }: { label: string; name: string; value: T; options: Array<[T, string]>; onChange: (value: T) => void; hint?: string }) {
    return (
        <div className="sxw-f">
            <span className="sxw-label" id={`${name}-label`}>{label}</span>
            <div className="sxw-pills" role="radiogroup" aria-labelledby={`${name}-label`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
                {options.map(([optionValue, optionLabel]) => (
                    <label key={optionValue} className={value === optionValue ? "is-on" : ""}>
                        <input type="radio" name={name} checked={value === optionValue} onChange={() => onChange(optionValue)} />
                        {optionLabel}
                    </label>
                ))}
            </div>
            {hint && <span className="sxw-hint">{hint}</span>}
        </div>
    );
}

/** 알림 줄 — rose 오류 · amber 주의 · lav 안내 · mint 완료 */
export function SxNotice({ tone, icon, title, children }: { tone: "rose" | "amber" | "mint" | "lav"; icon: string; title?: string; children: ReactNode }) {
    return (
        <p className="sxw-notice" data-tone={tone} role={tone === "rose" ? "alert" : "status"}>
            <span className="sxw-notice-i" aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
            <span>{title && <b>{title}</b>}{children}</span>
        </p>
    );
}

/** 갈림길 카드 — 3D 그림 · 꼬리 이름 · 제목 · 설명 · (계정 표시) · 단추들. pink = 계정이 이미 있음 / gray = 가입할 수 없음 */
export function SxBranch({ tone, art, tag, title, children, account, actions, branch }: {
    tone: "pink" | "gray";
    art: string;
    tag: string;
    title: string;
    children: ReactNode;
    account?: { text: string; provider: string };
    actions?: ReactNode;
    branch: string;
}) {
    return (
        <div className="sxw-branch" data-tone={tone} role="alert" data-branch={branch}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
            <img src={`${UI}${art}`} alt="" aria-hidden="true" />
            <div>
                <p className="sxw-branch-k">{tag}</p>
                <h3>{title}</h3>
                <p>{children}</p>
                {account && (
                    <span className="sxw-acc">
                        <i className="fa-solid fa-user" aria-hidden="true" />
                        {account.text}
                        <em data-provider={account.provider}>
                            {PROVIDER_NAME[account.provider] || account.provider} {account.provider === "email" ? "가입" : "간편가입"}
                        </em>
                    </span>
                )}
                {actions && <span className="sxw-branch-go">{actions}</span>}
            </div>
        </div>
    );
}

/** 공급자 표시(카카오 말풍선 · 네이버 N · 구글 G · 이메일 봉투) */
export function ProviderMark({ provider }: { provider: string }) {
    if (provider === "kakao") return <i className="fa-solid fa-comment" aria-hidden="true" />;
    if (provider === "naver") return <span className="sxw-nv" aria-hidden="true">N</span>;
    if (provider === "google") return <span className="sxw-gg" aria-hidden="true">G</span>;
    return <i className="fa-solid fa-envelope" aria-hidden="true" />;
}

/* ═════════ 약관 · 동의 내용 창 ═════════ */
export type SxDocKind = "age14" | "terms" | "privacy" | "marketing" | "petlens";

const DOC_TITLE: Record<SxDocKind, string> = {
    age14: "만 14세 이상 확인",
    terms: "이용약관 동의",
    privacy: "개인정보 수집·이용 동의",
    marketing: "마케팅 정보 수신 동의",
    petlens: "반려동물 정보 수집·이용 동의",
};

function DocTable({ rows, label }: { rows: ReadonlyArray<{ item: string; purpose: string; retention: string }>; label: string }) {
    return (
        <div className="sxw-doc-table" role="table" aria-label={label}>
            <div role="row" className="is-head">
                <span role="columnheader">수집 항목</span>
                <span role="columnheader">이용 목적</span>
                <span role="columnheader">보유 · 이용 기간</span>
            </div>
            {rows.map((row) => (
                <div role="row" key={row.item}>
                    <span role="cell">{row.item}</span>
                    <span role="cell">{row.purpose}</span>
                    <span role="cell">{row.retention}</span>
                </div>
            ))}
        </div>
    );
}

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
                    <span className="sxw-head-art is-small" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}policy-info-192.webp`} alt="" />
                    </span>
                    <span className="sxw-head-text">
                        <span className="sxw-kicker">{required ? "REQUIRED" : "OPTIONAL"}</span>
                        <h2 id={titleId}>
                            <span className={required ? "sxw-req" : "sxw-opt"}>{required ? "필수" : "선택"}</span>
                            {DOC_TITLE[kind]}
                        </h2>
                    </span>
                    <button ref={closeRef} type="button" className="sxw-doc-x" onClick={onClose} aria-label="닫기">
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </header>

                <div className="sxw-doc-body">
                    {kind === "age14" && (
                        <>
                            <p>댕다방은 만 14세 이상만 가입할 수 있어요.</p>
                            <ul className="sxw-doc-list">
                                <li>만 14세 미만은 개인정보를 받을 때 법정대리인(부모님 등)의 동의가 필요해요.</li>
                                <li>법정대리인 동의 절차를 갖추기 전까지는 만 14세 미만의 가입을 받지 않아요.</li>
                                <li>사실과 다르게 동의한 것이 확인되면 계정 이용이 제한될 수 있어요.</li>
                            </ul>
                        </>
                    )}
                    {kind === "terms" && (
                        <>
                            <p>주요 내용을 먼저 보여 드려요. 전체 약관은 아래 단추로 볼 수 있어요.</p>
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
                            <DocTable rows={SIGNUP_REQUIRED_PRIVACY_CONSENT.rows} label="개인정보 수집 항목 · 이용 목적 · 보유 기간" />
                            <p className="sxw-doc-note">{SIGNUP_REQUIRED_PRIVACY_CONSENT.refusalNotice}</p>
                            <Link href={SIGNUP_REQUIRED_PRIVACY_CONSENT.href} target="_blank" rel="noopener" className="sxw-doc-full">
                                개인정보처리방침 전문 보기 <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                            </Link>
                        </>
                    )}
                    {kind === "marketing" && (
                        <>
                            <p>새 상품 · 할인 · 이벤트 소식을 이메일이나 문자로 받아요. 동의하지 않아도 가입과 쇼핑은 똑같이 할 수 있어요.</p>
                            <DocTable rows={[{ item: "이메일 주소, 휴대전화번호", purpose: "상품 · 할인 · 이벤트 등 광고성 정보 안내", retention: "동의 철회 또는 회원 탈퇴 시까지" }]} label="마케팅 정보 수신 동의 내용" />
                            <p className="sxw-doc-note">동의한 뒤에도 마이페이지에서 언제든 바꿀 수 있고, 처리 결과는 날짜와 함께 알려 드려요.</p>
                        </>
                    )}
                    {kind === "petlens" && (
                        <>
                            <p>{SIGNUP_PETLENS_PRIVACY_CONSENT.intro}</p>
                            <DocTable rows={SIGNUP_PETLENS_PRIVACY_CONSENT.rows} label="반려동물 정보 수집 · 이용 내용" />
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

/* ═════════ 약관 동의 판 ═════════ */
export type TermsValue = {
    age14: boolean;
    terms: boolean;
    privacy: boolean;
    marketing: MarketingChoice;
};

const REQUIRED_ROWS: Array<{ key: "age14" | "terms" | "privacy"; label: string }> = [
    { key: "age14", label: "만 14세 이상이에요" },
    { key: "terms", label: "이용약관에 동의해요" },
    { key: "privacy", label: "개인정보 수집·이용에 동의해요" },
];

/** 마케팅 수신 동의 한 줄(이메일 · 문자 따로 고르기) — 약관 판 · 간편가입 정보 확인에서 같이 씀 */
export function MarketingRow({ value, onChange, onOpenDoc }: { value: MarketingChoice; onChange: (next: MarketingChoice) => void; onOpenDoc: () => void }) {
    const any = value.email || value.sms;
    return (
        <li className={any ? "is-on" : ""}>
            <label>
                <SxCheck checked={any} onChange={(checked) => onChange({ email: checked, sms: checked })} />
                <span className="sxw-opt">선택</span>
                <span className="sxw-terms-t">마케팅 정보 수신에 동의해요</span>
            </label>
            <button type="button" className="sxw-view" onClick={onOpenDoc} aria-label="마케팅 정보 수신 동의 내용 보기">
                내용 <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
            <span className="sxw-channels" role="group" aria-label="받을 방법">
                {([["email", "이메일"], ["sms", "문자(SMS)"]] as const).map(([key, label]) => (
                    <label key={key} className={value[key] ? "is-on" : ""}>
                        <input type="checkbox" checked={value[key]} onChange={(event) => onChange({ ...value, [key]: event.target.checked })} />
                        <i className={value[key] ? "fa-solid fa-circle-check" : "fa-regular fa-circle"} aria-hidden="true" />
                        {label}
                    </label>
                ))}
            </span>
        </li>
    );
}

export function TermsPanel({ value, onChange, marketingEnabled, onOpenDoc }: {
    value: TermsValue;
    onChange: (next: TermsValue) => void;
    /** 마케팅 수신 동의 저장이 연동됐을 때만 칸이 나옴 */
    marketingEnabled: boolean;
    onOpenDoc: (kind: SxDocKind) => void;
}) {
    const requiredCount = REQUIRED_ROWS.filter((row) => value[row.key]).length;
    const all = requiredCount === 3 && (!marketingEnabled || (value.marketing.email && value.marketing.sms));
    const setAll = (checked: boolean) => onChange({
        age14: checked,
        terms: checked,
        privacy: checked,
        marketing: marketingEnabled ? { email: checked, sms: checked } : value.marketing,
    });

    return (
        <div className="sxw-terms" data-signup-web-terms>
            <label className={all ? "sxw-all is-on" : "sxw-all"}>
                <SxCheck checked={all} onChange={setAll} label="전체 동의" />
                <span>
                    <b>전체 동의할게요</b>
                    <small>{marketingEnabled ? "필수 3가지와 선택 1가지를 한 번에 동의해요" : "필수 3가지를 한 번에 동의해요"}</small>
                </span>
                <em className={requiredCount === 3 ? "is-ok" : ""}>필수 {requiredCount}/3</em>
            </label>
            <ul>
                {REQUIRED_ROWS.map((row) => (
                    <li key={row.key} className={value[row.key] ? "is-on" : ""}>
                        <label>
                            <SxCheck checked={value[row.key]} onChange={(checked) => onChange({ ...value, [row.key]: checked })} />
                            <span className="sxw-req">필수</span>
                            <span className="sxw-terms-t">{row.label}</span>
                        </label>
                        <button type="button" className="sxw-view" onClick={() => onOpenDoc(row.key)} aria-label={`${row.label} 내용 보기`}>
                            내용 <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                        </button>
                    </li>
                ))}
                {marketingEnabled && (
                    <MarketingRow value={value.marketing} onChange={(marketing) => onChange({ ...value, marketing })} onOpenDoc={() => onOpenDoc("marketing")} />
                )}
            </ul>
        </div>
    );
}

/* ═════════ 휴대폰 본인인증 ═════════ */
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
    // 결과 — 완료 · 갈림길
    if (state.phase === "result" && state.result.status === "verified") {
        const result = state.result;
        if (result.existingAccount) {
            const isEmail = result.existingAccount.provider === "email";
            return (
                <SxBranch
                    tone="pink"
                    branch="identity-duplicate"
                    art="stickers/my-profile.webp"
                    tag="이미 가입한 사람"
                    title={`${result.name}님 명의로 가입된 계정이 있어요`}
                    account={{ text: result.existingAccount.maskedAccount, provider: result.existingAccount.provider }}
                    actions={(
                        <>
                            <Link href="/auth/login" className="sxw-pill is-pink">그 계정으로 로그인</Link>
                            {isEmail && <Link href="/forgot-password" className="sxw-pill">비밀번호 찾기</Link>}
                            <button type="button" className="sxw-pill" onClick={onRestart}>다른 명의로 인증</button>
                        </>
                    )}
                >
                    한 사람은 한 계정만 만들 수 있어요. 쓰던 계정으로 로그인해 주세요.
                </SxBranch>
            );
        }
        if (!result.over14) {
            return (
                <SxBranch tone="gray" branch="identity-under14" art="stickers/login-lock.webp" tag="만 14세 미만" title="지금은 가입할 수 없어요" actions={<Link href="/" className="sxw-pill">홈으로</Link>}>
                    만 14세 미만은 법정대리인(부모님 등)의 동의가 있어야 가입할 수 있어요. 법정대리인 동의 절차를 갖추기 전까지는 가입을 받지 않아요.
                </SxBranch>
            );
        }
        if (result.rejoinBlockedUntil) {
            return (
                <SxBranch tone="gray" branch="identity-rejoin" art="policy-info-192.webp" tag="탈퇴 후 다시 가입" title={`${formatDate(result.rejoinBlockedUntil)}부터 다시 가입할 수 있어요`} actions={<Link href="/inquiry/?category=other#inquiry-form" className="sxw-pill">1:1 문의하기</Link>}>
                    가입 혜택을 여러 번 받는 일을 막기 위해, 탈퇴한 뒤 정해진 기간에는 같은 사람이 다시 가입할 수 없어요.
                </SxBranch>
            );
        }
        return (
            <div className="sxw-ok" role="status" data-branch="identity-verified">
                <span className="sxw-ok-big" aria-hidden="true"><i className="fa-solid fa-check" /></span>
                <span className="sxw-kicker">VERIFIED</span>
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

    // 취소 · 시간 초과 · 실패
    const notice = state.phase === "result" ? (
        state.result.status === "cancelled" ? { icon: "fa-circle-xmark", title: "본인인증을 취소했어요", text: "가입하려면 본인인증이 필요해요. 준비되면 다시 시작해 주세요." }
            : state.result.status === "expired" ? { icon: "fa-hourglass-end", title: "인증 시간이 지났어요", text: "보안을 위해 인증 창은 10분 동안만 열려 있어요. 다시 시작해 주세요." }
                : state.result.status === "failed" ? { icon: "fa-triangle-exclamation", title: "본인인증을 마치지 못했어요", text: state.result.message || "통신사 확인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }
                    : null
    ) : null;
    const busy = state.phase === "busy";

    return (
        <div className="sxw-idv">
            {notice && <SxNotice tone="amber" icon={notice.icon} title={notice.title}>{notice.text}</SxNotice>}

            <SxBlock icon="fa-route" title="이렇게 진행돼요" tone="sky">
                <ol className="sxw-timeline">
                    <li data-owner="us">
                        <b aria-hidden="true">1</b>
                        <span><em>댕다방</em><strong>아래 단추를 눌러요</strong><small>인증기관 창이 새로 열려요.</small></span>
                    </li>
                    <li data-owner="agency">
                        <b aria-hidden="true">2</b>
                        <span><em>인증기관 창</em><strong>통신사를 고르고 정보를 넣어요</strong><small>이름 · 생년월일 · 휴대폰 번호를 넣고 문자 또는 PASS 앱으로 인증해요.</small></span>
                    </li>
                    <li data-owner="us">
                        <b aria-hidden="true">3</b>
                        <span><em>댕다방</em><strong>결과를 확인하고 다음으로</strong><small>이름과 휴대폰 번호는 다음 단계에 자동으로 채워져요.</small></span>
                    </li>
                </ol>
            </SxBlock>

            <SxBlock icon="fa-shield-halved" title="확인하는 것 · 받는 정보" tone="yellow">
                <ul className="sxw-facts">
                    <li><i className="fa-solid fa-user-check" aria-hidden="true" /><span><b>중복 가입</b>이미 가입한 사람인지 확인해요.</span></li>
                    <li><i className="fa-solid fa-cake-candles" aria-hidden="true" /><span><b>나이</b>만 14세 이상인지 확인해요.</span></li>
                    <li><i className="fa-solid fa-lock" aria-hidden="true" /><span><b>받는 정보</b>이름 · 생년월일 · 성별 · 휴대폰 번호 · 중복가입 확인값(CI/DI). 주민등록번호는 받지 않아요.</span></li>
                </ul>
            </SxBlock>

            <button type="button" className="sxw-cta" onClick={onStart} disabled={busy} aria-busy={busy} data-identity-start>
                <span className="sxw-cta-i" aria-hidden="true"><i className={busy ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-mobile-screen-button"} /></span>
                <span>
                    <b>{busy ? "인증 창에서 진행하고 있어요" : notice ? "본인인증 다시 하기" : "휴대폰 본인인증 시작"}</b>
                    <small>{busy ? "창을 닫으면 취소돼요" : "SKT · KT · LG U+ · 알뜰폰 · PASS 앱"}</small>
                </span>
                {!busy && <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />}
            </button>
        </div>
    );
}

/* ═════════ 가입 완료 ═════════ */
export function SignupWebDone({ name, pet, providerLabel, emailNeedsSetup, marketing, finishLabel, onFinish, onLeave }: {
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
    const sizeLabel = pet ? (pet.size === "small" ? "소형" : pet.size === "large" ? "대형" : "중형") : "";

    return (
        <section className="sxw-card sxw-done" aria-labelledby="sxw-done-title" data-signup-web-done data-signup-screen="done">
            <span className="sxw-confetti" aria-hidden="true" />
            {/* 축하 그림 — 머리 판의 댕다방 강아지와 겹치지 않게 보물 상자(가입 혜택) 3D 그림 */}
            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
            <img className="sxw-done-art" src={`${UI}daily-hero-treasure-384.webp`} alt="" aria-hidden="true" />
            <span className="sxw-kicker">WELCOME TO DAENGDABANG</span>
            <h2 id="sxw-done-title">가입을 환영해요, <span className="sxw-u">{name}</span>님!</h2>
            <p className="sxw-done-sub">
                {providerLabel ? `다음부터는 ${providerLabel} 단추 하나로 로그인해요.` : "다음부터는 이메일과 비밀번호로 로그인해요."}
            </p>

            <div className="sxw-gifts">
                <Link href="/mypage/#daenglab-wallet" className="sxw-gift" data-tone="lav" onClick={onLeave}>
                    <span className="sxw-gift-art" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}goods-pay-ready-256.webp`} alt="" />
                    </span>
                    <span>
                        <em>가입 혜택</em>
                        <b>{emailNeedsSetup ? "이메일 등록하고 20C 받기" : "이메일 인증하고 20C 받기"}</b>
                        <small>마이페이지 코인 탭에서 {emailNeedsSetup ? "이메일을 등록 · 인증" : "인증"}하면 바로 들어와요</small>
                    </span>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </Link>
                {pet ? (
                    <div className="sxw-gift" data-tone="mint">
                        <span className="sxw-gift-art" aria-hidden="true">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 회원 사진 · 3D 그림 */}
                            <img src={pet.photoDataUrl || `${UI}lab-dog-256.webp`} alt="" className={pet.photoDataUrl ? "is-photo" : ""} />
                        </span>
                        <span>
                            <em>우리 아이</em>
                            <b>{pet.name} 등록 완료</b>
                            <small>{[pet.breed, sizeLabel, pet.age].filter(Boolean).join(" · ")}</small>
                        </span>
                        <i className="fa-solid fa-circle-check" aria-hidden="true" />
                    </div>
                ) : (
                    <Link href="/mypage/#pet-profiles" className="sxw-gift" data-tone="mint" onClick={onLeave}>
                        <span className="sxw-gift-art" aria-hidden="true">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}lab-dog-256.webp`} alt="" />
                        </span>
                        <span>
                            <em>우리 아이</em>
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
                        <b>마케팅 정보 수신 동의 결과</b>
                        댕다방 · {processed.getFullYear()}년 {processed.getMonth() + 1}월 {processed.getDate()}일 · {channels} 수신에 동의했어요. 마이페이지에서 언제든 바꿀 수 있어요.
                    </span>
                </p>
            )}

            <p className="sxw-next3-t">이어서 해 보세요</p>
            <div className="sxw-next3">
                <Link href="/recommendations/" onClick={onLeave}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}hotpick-outdoor-128.webp`} alt="" aria-hidden="true" />
                    <span>{pet ? `${pet.name} 맞춤 상품` : "맞춤 상품"}</span>
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

/** 단계가 바뀌면 화면 맨 위로 */
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
