/**
 * ProfileWebView — 웹 마이페이지 "개인정보 확인/수정"
 * ---------------------------------------------------------------------
 * 2026-10-25 2차(사용자 "핑크가 부담 · 나열한 느낌 · 보기 편하고 작성하기 편하게"):
 *   흰 · 크림 바탕에 색은 아이콘에만, 분홍은 저장 단추에만. 한 번에 한 주제(탭) · 보기 → "수정"을 누른 줄만 열림.
 * 앱은 같은 페이지의 기존 화면 그대로(이 부품은 hidden → app/mypage-web.css "개인정보 확인/수정"에서만 보임).
 * 기능은 전부 기존 것: 비밀번호 확인 = loginCustomer(서버가 검사) · 간편가입 다시 로그인 = startSocialLogin(login) ·
 *   이름 = updateCurrentCustomerName · 비밀번호 = changeCurrentCustomerPassword · 이메일 인증 상태 = loadCurrentCustomer ·
 *   이메일 소식 = loadOutboundEmailPreference / consentOutboundEmailPreference · 이메일 · 계정 변경 / 소식 끄기 = 1:1 문의 창.
 *  0) 한 번 더 확인: 흰 카드 — 자물쇠 · 계정 · 비밀번호(간편가입은 공급자로 다시 로그인) · 10분 유지
 *  1) 내 카드: 이름 동그라미 · 이름 · 계정 · 로그인 방식 · 이메일 인증 상태 · 남은 시간 · 잠그기
 *  2) 탭: 내 정보(이름 · 이메일 · 휴대폰) / 로그인 · 보안(로그인 방식 · 비밀번호) / 알림 수신(이메일 · 문자)
 *     줄마다 지금 값 + 상태 칩 + 단추, "수정"을 누른 줄만 입력칸이 열리고 취소 · 저장
 *  3) 다른 정보: 우리 아이 · 배송지 · 추천 데이터 · 회원 탈퇴 작은 바로 가기
 * 비밀번호는 입력칸에만 있고 어디에도 저장하지 않음.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import MypageInquiryLink from "@/components/mypage/MypageInquiryLink";
import { beginSocialAuth } from "@/components/auth/SocialAuthButtons";
import {
    changeCurrentCustomerPassword,
    consentOutboundEmailPreference,
    customerApiErrorMessage,
    DdbApiError,
    getCustomerToken,
    loadCurrentCustomer,
    loadOutboundEmailPreference,
    loginCustomer,
    updateCurrentCustomerName,
    type SocialProvider,
} from "@/lib/customer-api";
import { isInternalSocialEmail, memberAccountDisplay } from "@/lib/member-account-display";
import { normalizedMemberName } from "@/lib/member-name";
import { clearReauth, consumeSocialReauth, markSocialReauthPending, REAUTH_TTL_MS, saveReauth, useReauthAt } from "@/lib/profile-reauth";
import { useAuth, type User } from "@/lib/store";
// 2026-10-26 서버 원문(영어 detail 등) 대신 상황별 해요체 오류 문장
import { mypageErrorText } from "@/components/mypage/mypageWebText";

const UI = "/images/ui/";
const PROVIDER: Record<string, string> = { email: "이메일", kakao: "카카오", naver: "네이버", google: "구글" };
const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;

/** 이메일 계정 · 인증 변경 문의 창 내용(기존 문의 창 그대로) */
const ACCOUNT_INQUIRY = {
    kicker: "MY ACCOUNT",
    title: "이메일·계정 변경 문의",
    sub: "본인 확인 후 바꿔 드려요. 바꾸고 싶은 이메일이나 가입 계정을 적어 주세요.",
    art: "/images/ui/stickers/my-profile.webp",
    category: "other" as const,
    subject: "[기타 문의] 이메일·계정 변경 요청",
    hint: "본인 확인을 위해 답변은 입력한 이메일로 보내 드려요.",
};

/** 비밀번호 강도 0~3 */
function passwordScore(value: string) {
    if (value.length < 8) return value ? 1 : 0;
    let score = 1;
    if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) score += 1;
    return score;
}

function ProviderMark({ provider }: { provider: string }) {
    if (provider === "kakao") return <i className="fa-solid fa-comment" aria-hidden="true" />;
    if (provider === "naver") return <span className="pf-nv" aria-hidden="true">N</span>;
    if (provider === "google") return <span className="pf-gg" aria-hidden="true">G</span>;
    return <i className="fa-solid fa-envelope" aria-hidden="true" />;
}

const formatDate = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, "0")}. ${String(date.getDate()).padStart(2, "0")}`;
};

/** 상태 칩 — ok 초록 · warn 노랑 · soft 회색 */
function Chip({ tone = "soft", icon, children }: { tone?: "ok" | "warn" | "soft"; icon?: string; children: ReactNode }) {
    return <em className={`pf-chip is-${tone}`}>{icon && <i className={`fa-solid ${icon}`} aria-hidden="true" />}{children}</em>;
}

/** 설정 한 줄 — 아이콘 · 이름 · 지금 값(+칩) · 단추 / 열리면 아래에 입력 */
function SettingRow({ icon, label, value, action, open = false, soon = false, children }: {
    icon: string;
    label: string;
    value: ReactNode;
    action?: ReactNode;
    open?: boolean;
    soon?: boolean;
    children?: ReactNode;
}) {
    return (
        <li className={`pf-item${open ? " is-open" : ""}${soon ? " is-soon" : ""}`}>
            <span className="pf-item-i" aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
            <span className="pf-item-text">
                <small>{label}</small>
                <span className="pf-item-value">{value}</span>
            </span>
            {action && <span className="pf-item-act">{action}</span>}
            {open && children && <div className="pf-item-edit">{children}</div>}
        </li>
    );
}

type Tab = "info" | "security" | "notice";

export default function ProfileWebView({ user, onSavedName }: { user: User; onSavedName: (name: string) => void }) {
    const router = useRouter();
    const { logout } = useAuth();
    const provider = user.authProvider || "email";
    const isEmailAccount = provider === "email";
    const providerLabel = PROVIDER[provider] || "간편";
    const accountDisplay = memberAccountDisplay(user.email, user.authProvider);
    const token = user.apiAccessToken || getCustomerToken() || undefined;
    const reauthAt = useReauthAt(user.email);
    const [now, setNow] = useState(() => Date.now());
    const verified = reauthAt !== null && now - reauthAt < REAUTH_TTL_MS;

    // 남은 시간 · 만료 — 20초마다 시계만 다시 읽음
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 20_000);
        return () => window.clearInterval(id);
    }, []);

    // 간편가입 회원 — 공급자 다시 로그인에서 돌아오면(주소 ?reauth=1) 확인 완료로
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("reauth") !== "1") return;
        consumeSocialReauth(user.email, token);
        params.delete("reauth");
        const query = params.toString();
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }, [token, user.email]);

    return (
        <div className="hidden" data-pf-web>
            {verified && reauthAt !== null ? (
                <VerifiedView
                    user={user}
                    token={token}
                    provider={provider}
                    providerLabel={providerLabel}
                    accountDisplay={accountDisplay}
                    isEmailAccount={isEmailAccount}
                    until={reauthAt + REAUTH_TTL_MS}
                    now={now}
                    onSavedName={onSavedName}
                    onPasswordChanged={() => {
                        clearReauth();
                        logout();
                        router.replace("/auth/login/?reason=password_changed");
                    }}
                />
            ) : (
                <ReauthGate
                    user={user}
                    token={token}
                    provider={provider}
                    providerLabel={providerLabel}
                    accountDisplay={accountDisplay}
                    isEmailAccount={isEmailAccount}
                    expired={reauthAt !== null}
                />
            )}
        </div>
    );
}

/* ═════════ 0) 한 번 더 확인 — 흰 카드 ═════════ */
function ReauthGate({ user, token, provider, providerLabel, accountDisplay, isEmailAccount, expired }: {
    user: User;
    token?: string;
    provider: string;
    providerLabel: string;
    accountDisplay: string;
    isEmailAccount: boolean;
    expired: boolean;
}) {
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState("");

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (checking) return;
        if (!password) {
            setError("비밀번호를 넣어 주세요.");
            return;
        }
        setChecking(true);
        setError("");
        try {
            // 기존 로그인 확인으로 비밀번호를 서버에서 검사(새 토큰은 쓰지 않음)
            await loginCustomer({ email: user.email, password });
            setPassword("");
            saveReauth(user.email);
        } catch (caught) {
            setError(caught instanceof DdbApiError && caught.status === 401
                ? "비밀번호가 맞지 않아요. 다시 확인해 주세요."
                : customerApiErrorMessage(caught));
        } finally {
            setChecking(false);
        }
    };

    const socialAgain = () => {
        markSocialReauthPending(user.email, token);
        const started = beginSocialAuth(provider as SocialProvider, "login", "/mypage/profile/?reauth=1");
        if (!started) setError(`${providerLabel} 로그인 화면을 열지 못했어요. 잠시 후 다시 시도해 주세요.`);
    };

    return (
        <section className="pf-gate" aria-labelledby="pf-gate-title">
            <div className="pf-gate-head">
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img src={`${UI}stickers/login-lock.webp`} alt="" aria-hidden="true" />
                <span>
                    <span className="pf-kicker">SECURITY CHECK</span>
                    <h2 id="pf-gate-title">한 번 더 <span className="pf-hl">확인</span>할게요</h2>
                    <p>
                        {expired ? "확인한 지 10분이 지나 다시 잠겼어요. " : ""}
                        내 정보를 지키기 위해 {isEmailAccount ? "비밀번호를" : `${providerLabel} 로그인을`} 다시 확인해요.
                    </p>
                </span>
            </div>

            <div className="pf-gate-account">
                <span className="pf-av" aria-hidden="true">{(user.name || "댕").slice(0, 1)}</span>
                <span>
                    <b>{user.name}</b>
                    <small>{accountDisplay}</small>
                </span>
                <span className="pf-provider" data-provider={provider}><ProviderMark provider={provider} />{providerLabel}</span>
            </div>

            {isEmailAccount ? (
                <form className="pf-gate-form" onSubmit={submit} noValidate>
                    <label className="pf-label" htmlFor="pf-reauth-password">비밀번호</label>
                    <span className="pf-inwrap">
                        <input
                            id="pf-reauth-password"
                            className="pf-in"
                            type={show ? "text" : "password"}
                            value={password}
                            onChange={(event) => {
                                setPassword(event.target.value);
                                setError("");
                            }}
                            autoComplete="current-password"
                            placeholder="지금 쓰는 비밀번호"
                            aria-invalid={Boolean(error)}
                        />
                        <button type="button" className="pf-eye" onClick={() => setShow((value) => !value)} aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"} aria-pressed={show}>
                            <i className={show ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} aria-hidden="true" />
                        </button>
                    </span>
                    {error && <p className="pf-msg is-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{error}</p>}
                    <button type="submit" className="pf-go" disabled={checking || !password}>
                        {checking ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />확인하는 중</> : <>확인하고 내 정보 보기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></>}
                    </button>
                    <Link href="/forgot-password" className="pf-link">비밀번호를 잊으셨나요?</Link>
                </form>
            ) : (
                <div className="pf-gate-form">
                    <button type="button" className={`pf-social is-${provider}`} onClick={socialAgain}>
                        <ProviderMark provider={provider} />{providerLabel}로 다시 확인
                    </button>
                    <p className="pf-hint is-center">{providerLabel} 화면에서 로그인하면 이 화면으로 돌아와요.</p>
                    {error && <p className="pf-msg is-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{error}</p>}
                </div>
            )}

            <p className="pf-gate-tips">
                <span><i className="fa-solid fa-clock" aria-hidden="true" />10분 동안 유지</span>
                <span><i className="fa-solid fa-window-restore" aria-hidden="true" />창을 닫으면 다시 확인</span>
                <span><i className="fa-solid fa-shield-halved" aria-hidden="true" />비밀번호는 저장하지 않아요</span>
            </p>
        </section>
    );
}

/* ═════════ 확인 뒤 — 내 카드 · 탭 · 바로 가기 ═════════ */
function VerifiedView({ user, token, provider, providerLabel, accountDisplay, isEmailAccount, until, now, onSavedName, onPasswordChanged }: {
    user: User;
    token?: string;
    provider: string;
    providerLabel: string;
    accountDisplay: string;
    isEmailAccount: boolean;
    until: number;
    now: number;
    onSavedName: (name: string) => void;
    onPasswordChanged: () => void;
}) {
    const [tab, setTab] = useState<Tab>("info");
    const minutesLeft = Math.max(1, Math.ceil((until - now) / 60_000));
    const internalEmail = isInternalSocialEmail(user.email);

    // 이메일 인증 상태(서버) — 불러오기 전엔 undefined
    const [verifiedAt, setVerifiedAt] = useState<string | null | undefined>(undefined);
    useEffect(() => {
        if (!token) return;
        let alive = true;
        loadCurrentCustomer(token)
            .then((me) => { if (alive) setVerifiedAt(me?.email_verified_at || null); })
            .catch(() => { if (alive) setVerifiedAt(null); });
        return () => { alive = false; };
    }, [token]);

    const tabs: Array<{ id: Tab; icon: string; tone: string; label: string; sub: string }> = [
        { id: "info", icon: "fa-user", tone: "sky", label: "내 정보", sub: "이름 · 이메일 · 휴대폰" },
        { id: "security", icon: "fa-key", tone: "lav", label: "로그인 · 보안", sub: isEmailAccount ? "로그인 방식 · 비밀번호" : `${providerLabel} 로그인` },
        { id: "notice", icon: "fa-bell", tone: "mint", label: "알림 수신", sub: "이메일 · 문자 소식" },
    ];

    return (
        <>
            {/* 내 카드 */}
            <section className="pf-me" aria-label="내 계정">
                <span className="pf-me-av" aria-hidden="true">{(user.name || "댕").slice(0, 1)}</span>
                <span className="pf-me-text">
                    <b>{user.name}<small>님</small></b>
                    <span>{internalEmail ? `${providerLabel} 간편가입 회원` : accountDisplay}</span>
                    <span className="pf-me-chips">
                        <span className="pf-provider" data-provider={provider}><ProviderMark provider={provider} />{isEmailAccount ? "이메일 로그인" : `${providerLabel} 로그인`}</span>
                        {internalEmail ? (
                            <Chip tone="warn" icon="fa-at">이메일 없음</Chip>
                        ) : verifiedAt === undefined ? (
                            <Chip>이메일 확인 중</Chip>
                        ) : verifiedAt ? (
                            <Chip tone="ok" icon="fa-check">이메일 인증됨</Chip>
                        ) : (
                            <Chip tone="warn" icon="fa-envelope">이메일 인증 전</Chip>
                        )}
                    </span>
                </span>
                <span className="pf-me-timer" role="status">
                    <span><i className="fa-solid fa-shield-heart" aria-hidden="true" />본인 확인됨</span>
                    <small>{minutesLeft}분 동안 수정할 수 있어요</small>
                    <button type="button" onClick={clearReauth}><i className="fa-solid fa-lock" aria-hidden="true" />지금 잠그기</button>
                </span>
            </section>

            {/* 탭 */}
            <div className="pf-tabs" role="tablist" aria-label="개인정보 항목">
                {tabs.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        role="tab"
                        id={`pf-tab-${item.id}`}
                        aria-selected={tab === item.id}
                        aria-controls={`pf-panel-${item.id}`}
                        className={tab === item.id ? "is-on" : ""}
                        data-tone={item.tone}
                        onClick={() => setTab(item.id)}
                    >
                        <span className="pf-tab-i" aria-hidden="true"><i className={`fa-solid ${item.icon}`} /></span>
                        <span><b>{item.label}</b><small>{item.sub}</small></span>
                    </button>
                ))}
            </div>

            <section className="pf-panel" role="tabpanel" id={`pf-panel-${tab}`} aria-labelledby={`pf-tab-${tab}`} data-tone={tabs.find((item) => item.id === tab)?.tone}>
                {tab === "info" && (
                    <InfoPanel user={user} token={token} accountDisplay={accountDisplay} internalEmail={internalEmail} verifiedAt={verifiedAt} onSavedName={onSavedName} />
                )}
                {tab === "security" && (
                    <SecurityPanel user={user} token={token} provider={provider} providerLabel={providerLabel} accountDisplay={accountDisplay} isEmailAccount={isEmailAccount} onPasswordChanged={onPasswordChanged} />
                )}
                {tab === "notice" && <NoticePanel token={token} internalEmail={internalEmail} />}
            </section>

            {/* 다른 정보 */}
            <nav className="pf-more" aria-label="다른 정보 관리">
                <span>다른 정보도 관리해요</span>
                {[
                    { href: "/mypage/#pet-profiles", art: "stickers/my-pets.webp", title: "우리 아이 정보" },
                    { href: "/mypage/address/", art: "stickers/my-address.webp", title: "배송지 관리" },
                    { href: "/mypage/recommendations/", art: "stickers/my-recommend.webp", title: "추천 데이터" },
                    { href: "/mypage/withdrawal/", art: "stickers/login-lock.webp", title: "회원 탈퇴" },
                ].map((item) => (
                    <Link key={item.href} href={item.href}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src={`${UI}${item.art}`} alt="" aria-hidden="true" />
                        {item.title}
                        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    </Link>
                ))}
            </nav>
        </>
    );
}

/** 탭 판 머리 — 제목 · 한 줄 */
function PanelHead({ title, sub }: { title: string; sub: string }) {
    return (
        <header className="pf-panel-head">
            <h2>{title}</h2>
            <p>{sub}</p>
        </header>
    );
}

/* ═════════ 내 정보 ═════════ */
function InfoPanel({ user, token, accountDisplay, internalEmail, verifiedAt, onSavedName }: {
    user: User;
    token?: string;
    accountDisplay: string;
    internalEmail: boolean;
    verifiedAt: string | null | undefined;
    onSavedName: (name: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(user.name);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const candidate = normalizedMemberName(name);
    const changed = Boolean(candidate) && candidate !== user.name;

    const saveName = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) return;
        if (!candidate) {
            setMessage({ ok: false, text: "이름은 2~50자로, 특수 제어문자 없이 넣어 주세요." });
            return;
        }
        if (!token) {
            setMessage({ ok: false, text: "로그인이 만료되었어요. 다시 로그인해 주세요." });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            const updated = await updateCurrentCustomerName(candidate, token);
            const savedName = updated.name || candidate;
            setName(savedName);
            onSavedName(savedName);
            setEditing(false);
            setMessage({ ok: true, text: "이름을 바꿨어요." });
        } catch (caught) {
            setMessage({ ok: false, text: mypageErrorText(caught, caught instanceof DdbApiError ? caught.message : "이름을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.", "이름을 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.") });
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PanelHead title="내 정보" sub="주문서 · 배송 안내에 쓰이는 기본 정보예요." />
            <ul className="pf-list">
                <SettingRow
                    icon="fa-signature"
                    label="이름"
                    open={editing}
                    value={<><b>{user.name}</b>{message?.ok && !editing && <Chip tone="ok" icon="fa-check">{message.text}</Chip>}</>}
                    action={!editing && (
                        <button type="button" className="pf-act" onClick={() => { setEditing(true); setName(user.name); setMessage(null); }}>
                            <i className="fa-solid fa-pen" aria-hidden="true" />수정
                        </button>
                    )}
                >
                    <form className="pf-edit" onSubmit={saveName} noValidate>
                        <label className="pf-label" htmlFor="pf-name">새 이름</label>
                        <input
                            id="pf-name"
                            className="pf-in"
                            value={name}
                            onChange={(event) => { setName(event.target.value); setMessage(null); }}
                            maxLength={50}
                            autoComplete="name"
                            autoFocus
                            aria-invalid={Boolean(message && !message.ok)}
                        />
                        <span className="pf-hint">2~50자 · 주문서와 배송 안내에 이 이름이 쓰여요.</span>
                        {message && !message.ok && <p className="pf-msg is-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{message.text}</p>}
                        <span className="pf-edit-foot">
                            <button type="button" className="pf-cancel" onClick={() => { setEditing(false); setName(user.name); setMessage(null); }}>취소</button>
                            <button type="submit" className="pf-go" disabled={saving || !changed}>{saving ? "저장하는 중" : "이름 저장"}</button>
                        </span>
                    </form>
                </SettingRow>

                <SettingRow
                    icon="fa-at"
                    label="이메일 · 로그인 계정"
                    value={(
                        <>
                            <b>{internalEmail ? "등록된 이메일이 없어요" : accountDisplay}</b>
                            {internalEmail ? <Chip tone="warn">이메일 없음</Chip>
                                : verifiedAt === undefined ? <Chip>확인 중</Chip>
                                    : verifiedAt ? <Chip tone="ok" icon="fa-check">인증됨{formatDate(verifiedAt) ? ` · ${formatDate(verifiedAt)}` : ""}</Chip>
                                        : <Chip tone="warn">인증 전</Chip>}
                        </>
                    )}
                    action={(
                        <MypageInquiryLink href="/inquiry?category=other#inquiry-form" className="pf-act" preset={ACCOUNT_INQUIRY}>
                            <i className="fa-solid fa-headset" aria-hidden="true" />변경 문의
                        </MypageInquiryLink>
                    )}
                />
                {(internalEmail || verifiedAt === null) && (
                    <li className="pf-tip">
                        <i className="fa-solid fa-coins" aria-hidden="true" />
                        <span>{internalEmail ? "이메일을 등록 · 인증하면 주문 안내를 받고 20C도 받아요." : "이메일을 인증하면 가입 혜택 20C가 들어와요."}</span>
                        <Link href="/mypage/#daenglab-wallet">{internalEmail ? "이메일 등록" : "인증하러 가기"}<i className="fa-solid fa-chevron-right" aria-hidden="true" /></Link>
                    </li>
                )}

                <SettingRow
                    icon="fa-mobile-screen-button"
                    label="휴대폰 번호"
                    soon
                    value={<><b className="is-muted">등록 전</b><Chip tone="warn">준비 중</Chip></>}
                    action={<button type="button" className="pf-act" disabled><i className="fa-solid fa-clock" aria-hidden="true" />준비 중</button>}
                />
            </ul>
            <p className="pf-foot-note"><i className="fa-solid fa-circle-info" aria-hidden="true" />이메일은 로그인 아이디라 직접 바꿀 수 없어요. 휴대폰 번호는 본인인증이 연결되면 등록 · 변경할 수 있어요.</p>
        </>
    );
}

/* ═════════ 로그인 · 보안 ═════════ */
function SecurityPanel({ user, token, provider, providerLabel, accountDisplay, isEmailAccount, onPasswordChanged }: {
    user: User;
    token?: string;
    provider: string;
    providerLabel: string;
    accountDisplay: string;
    isEmailAccount: boolean;
    onPasswordChanged: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const lengthOk = next.length >= 8;
    const bytesOk = utf8Bytes(next) <= 72;
    const mixOk = /[A-Za-z]/.test(next) && /\d/.test(next);
    const differentOk = Boolean(next) && next !== current;
    const matchOk = Boolean(confirm) && confirm === next;
    const score = passwordScore(next);
    const ready = Boolean(current) && lengthOk && bytesOk && differentOk && matchOk;

    const reset = () => {
        setOpen(false);
        setCurrent("");
        setNext("");
        setConfirm("");
        setError("");
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving || !ready) return;
        if (!token) {
            setError("로그인이 만료되었어요. 다시 로그인해 주세요.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await changeCurrentCustomerPassword({ email: user.email, currentPassword: current, newPassword: next }, token);
            setCurrent("");
            setNext("");
            setConfirm("");
            setDone(true);
            window.setTimeout(onPasswordChanged, 1600);
        } catch (caught) {
            if (caught instanceof DdbApiError && caught.status === 401) setError("현재 비밀번호가 맞지 않아요.");
            else if (caught instanceof DdbApiError && caught.status === 403) setError("이 계정의 비밀번호는 간편로그인 제공자에서 바꿔 주세요.");
            else setError(mypageErrorText(caught, caught instanceof DdbApiError ? caught.message : "비밀번호를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.", "비밀번호를 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PanelHead title="로그인 · 보안" sub={isEmailAccount ? "로그인 방식과 비밀번호를 관리해요." : `${providerLabel} 계정으로 로그인하고 있어요.`} />
            <ul className="pf-list">
                <SettingRow
                    icon="fa-right-to-bracket"
                    label="로그인 방식"
                    value={<><span className="pf-provider" data-provider={provider}><ProviderMark provider={provider} />{isEmailAccount ? "이메일" : providerLabel}</span><b className="is-sub">{isEmailAccount ? accountDisplay : `${providerLabel} 계정으로 로그인`}</b></>}
                />
                {isEmailAccount ? (
                    <SettingRow
                        icon="fa-lock"
                        label="비밀번호"
                        open={open || done}
                        value={<b className="pf-dots">••••••••</b>}
                        action={!open && !done && (
                            <button type="button" className="pf-act" onClick={() => setOpen(true)}><i className="fa-solid fa-pen" aria-hidden="true" />변경</button>
                        )}
                    >
                        {done ? (
                            <p className="pf-done" role="status">
                                <span aria-hidden="true"><i className="fa-solid fa-check" /></span>
                                <b>비밀번호를 바꿨어요</b>
                                <small>보안을 위해 모든 기기에서 로그아웃하고 로그인 화면으로 이동해요.</small>
                            </p>
                        ) : (
                            <form className="pf-edit" onSubmit={submit} noValidate>
                                <label className="pf-label" htmlFor="pf-pw-current">현재 비밀번호</label>
                                <input id="pf-pw-current" className="pf-in" type={show ? "text" : "password"} value={current} onChange={(event) => { setCurrent(event.target.value); setError(""); }} autoComplete="current-password" autoFocus />
                                <label className="pf-label" htmlFor="pf-pw-next">새 비밀번호</label>
                                <span className="pf-inwrap">
                                    <input id="pf-pw-next" className="pf-in" type={show ? "text" : "password"} value={next} onChange={(event) => { setNext(event.target.value); setError(""); }} autoComplete="new-password" maxLength={72} placeholder="8자 이상" aria-describedby="pf-pw-rules" />
                                    <button type="button" className="pf-eye" onClick={() => setShow((value) => !value)} aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"} aria-pressed={show}>
                                        <i className={show ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} aria-hidden="true" />
                                    </button>
                                </span>
                                <span className="pf-meter" data-score={score} aria-hidden="true"><i /><i /><i />{next && <b>{score >= 3 ? "튼튼해요" : score === 2 ? "괜찮아요" : "약해요"}</b>}</span>
                                <span className="pf-rules" id="pf-pw-rules">
                                    <span className={lengthOk ? "is-ok" : ""}><i className={lengthOk ? "fa-solid fa-check" : "fa-regular fa-circle"} aria-hidden="true" />8자 이상</span>
                                    <span className={mixOk ? "is-ok" : ""}><i className={mixOk ? "fa-solid fa-check" : "fa-regular fa-circle"} aria-hidden="true" />영문 · 숫자 섞기</span>
                                    <span className={!next ? "" : bytesOk ? "is-ok" : "is-bad"}><i className={bytesOk && next ? "fa-solid fa-check" : bytesOk ? "fa-regular fa-circle" : "fa-solid fa-xmark"} aria-hidden="true" />72바이트 이하</span>
                                    <span className={!next ? "" : differentOk ? "is-ok" : "is-bad"}><i className={differentOk ? "fa-solid fa-check" : next ? "fa-solid fa-xmark" : "fa-regular fa-circle"} aria-hidden="true" />지금과 다르게</span>
                                </span>
                                <label className="pf-label" htmlFor="pf-pw-confirm">새 비밀번호 확인</label>
                                <span className={`pf-inwrap${matchOk ? " is-ok" : confirm ? " is-bad" : ""}`}>
                                    <input id="pf-pw-confirm" className="pf-in" type={show ? "text" : "password"} value={confirm} onChange={(event) => { setConfirm(event.target.value); setError(""); }} autoComplete="new-password" maxLength={72} placeholder="한 번 더 넣어 주세요" />
                                    {matchOk && <em className="is-ok">같아요</em>}
                                    {confirm && !matchOk && <em className="is-bad">달라요</em>}
                                </span>
                                {error && <p className="pf-msg is-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{error}</p>}
                                <span className="pf-edit-foot">
                                    <button type="button" className="pf-cancel" onClick={reset}>취소</button>
                                    <button type="submit" className="pf-go" disabled={!ready || saving}>
                                        {saving ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />바꾸는 중</> : "비밀번호 바꾸기"}
                                    </button>
                                </span>
                                <Link href="/forgot-password" className="pf-link">현재 비밀번호가 기억나지 않나요?</Link>
                            </form>
                        )}
                    </SettingRow>
                ) : (
                    <SettingRow
                        icon="fa-lock"
                        label="비밀번호"
                        value={<b className="is-sub">{providerLabel}에서 관리해요</b>}
                    />
                )}
            </ul>
            <p className="pf-foot-note">
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                {isEmailAccount
                    ? "비밀번호를 바꾸면 모든 기기에서 로그아웃되고 새 비밀번호로 다시 로그인해요."
                    : `간편 로그인은 댕다방 비밀번호가 없어요. 비밀번호는 ${providerLabel} 계정 설정에서 바꿔 주세요.`}
            </p>
        </>
    );
}

/* ═════════ 알림 수신 ═════════ */
function NoticePanel({ token, internalEmail }: { token?: string; internalEmail: boolean }) {
    const [state, setState] = useState<"loading" | "on" | "off" | "unknown">(internalEmail || !token ? "unknown" : "loading");
    const [editing, setEditing] = useState(false);
    const [agree, setAgree] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        if (internalEmail || !token) return;
        let alive = true;
        loadOutboundEmailPreference(token)
            .then((preference) => { if (alive) setState(preference.sendAuthorized ? "on" : "off"); })
            .catch(() => { if (alive) setState("unknown"); });
        return () => { alive = false; };
    }, [internalEmail, token]);

    const subscribe = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!token || !agree || saving) return;
        setSaving(true);
        setMessage(null);
        try {
            const preference = await consentOutboundEmailPreference(token);
            const today = new Date();
            setState(preference.sendAuthorized ? "on" : "off");
            setEditing(false);
            setMessage(preference.sendAuthorized
                ? { ok: true, text: `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 · 댕다방 이메일 소식 수신에 동의했어요.` }
                : { ok: false, text: "동의는 저장됐지만 받을 이메일 확인이 필요해요. 코인 탭에서 이메일을 인증해 주세요." });
        } catch (caught) {
            setMessage({ ok: false, text: mypageErrorText(caught, caught instanceof DdbApiError ? caught.message : "저장하지 못했어요. 잠시 후 다시 시도해 주세요.", "이메일 소식 설정을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.") });
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PanelHead title="알림 수신" sub="새 상품 · 할인 · 이벤트 소식을 받을지 정해요. 선택 사항이에요." />
            <ul className="pf-list">
                <SettingRow
                    icon="fa-envelope-open-text"
                    label="이메일 소식"
                    open={editing}
                    value={(
                        <>
                            <b>{state === "on" ? "받고 있어요" : state === "off" ? "받지 않아요" : state === "loading" ? "확인하는 중" : internalEmail ? "등록된 이메일이 없어요" : "상태를 확인하지 못했어요"}</b>
                            {state === "on" && <Chip tone="ok" icon="fa-check">수신 동의</Chip>}
                        </>
                    )}
                    action={state === "off" && !editing ? (
                        <button type="button" className="pf-act" onClick={() => { setEditing(true); setMessage(null); }}><i className="fa-solid fa-bell" aria-hidden="true" />받기</button>
                    ) : state === "on" ? (
                        <MypageInquiryLink
                            href="/inquiry?category=other#inquiry-form"
                            className="pf-act"
                            preset={{
                                kicker: "MY NEWS",
                                title: "이메일 소식 그만 받기",
                                sub: "이메일 소식 수신을 멈춰 드려요. 받는 이메일 주소를 적어 주세요.",
                                art: "/images/ui/web-cs-mail-256.webp",
                                category: "other",
                                subject: "[기타 문의] 이메일 소식 수신 거부",
                                hint: "처리되면 날짜와 함께 결과를 알려 드려요.",
                            }}
                        >
                            <i className="fa-solid fa-bell-slash" aria-hidden="true" />그만 받기
                        </MypageInquiryLink>
                    ) : internalEmail ? (
                        <Link href="/mypage/#daenglab-wallet" className="pf-act"><i className="fa-solid fa-at" aria-hidden="true" />이메일 등록</Link>
                    ) : undefined}
                >
                    <form className="pf-edit" onSubmit={subscribe} noValidate>
                        <label className="pf-check">
                            <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} />
                            <span><b>[선택] 광고성 정보 이메일 수신에 동의해요</b><small>새 상품 · 할인 · 이벤트 소식 · 동의 철회 시까지</small></span>
                        </label>
                        <span className="pf-edit-foot">
                            <button type="button" className="pf-cancel" onClick={() => { setEditing(false); setAgree(false); }}>취소</button>
                            <button type="submit" className="pf-go" disabled={!agree || saving}>{saving ? "저장하는 중" : "동의하고 받기"}</button>
                        </span>
                    </form>
                </SettingRow>
                {message && (
                    <li className={message.ok ? "pf-tip is-ok" : "pf-tip is-error"} role={message.ok ? "status" : "alert"}>
                        <i className={message.ok ? "fa-solid fa-envelope-circle-check" : "fa-solid fa-circle-exclamation"} aria-hidden="true" />
                        <span>{message.text}</span>
                    </li>
                )}
                <SettingRow
                    icon="fa-comment-sms"
                    label="문자(SMS) 소식"
                    soon
                    value={<><b className="is-muted">아직 받을 수 없어요</b><Chip tone="warn">준비 중</Chip></>}
                />
            </ul>
            <p className="pf-foot-note"><i className="fa-solid fa-circle-info" aria-hidden="true" />주문 · 배송 · 환불 안내처럼 꼭 필요한 알림은 수신 동의와 관계없이 보내 드려요.</p>
        </>
    );
}
