/**
 * ProfileWebView — 웹 마이페이지 "개인정보 확인/수정"(2026-10-25 사용자 "들어갈 때 비밀번호 한 번 더 · 가입 때 정보 변경 · 비밀번호 변경 · 놓친 것까지")
 * ---------------------------------------------------------------------
 * 앱은 같은 페이지의 기존 화면 그대로(이 부품은 hidden → app/mypage-web.css "개인정보 확인/수정"에서만 보임).
 * 기능은 전부 기존 것: 비밀번호 확인 = loginCustomer(서버가 검사) · 간편가입 다시 로그인 = startSocialLogin(login) ·
 *   이름 = updateCurrentCustomerName · 비밀번호 = changeCurrentCustomerPassword · 이메일 인증 상태 = loadCurrentCustomer ·
 *   이메일 소식 = loadOutboundEmailPreference / consentOutboundEmailPreference · 이메일 · 계정 변경 / 소식 끄기 = 1:1 문의 창.
 *  0) 한 번 더 확인(잠금): 계정 카드 · 비밀번호(간편가입은 공급자로 다시 로그인) · 10분 유지 · 비밀번호 찾기
 *  1) 확인 완료 줄: 남은 시간 · 잠그기
 *  2) 내 정보(하늘): 이름 바꾸기 · 이메일/로그인 계정 + 인증 상태 + 변경 문의 · 휴대폰(본인인증 연동 준비 중)
 *  3) 로그인 · 보안(연보라): 로그인 방식 · 비밀번호 바꾸기(현재 · 새 · 확인, 강도 · 규칙 · 일치) — 간편가입은 공급자에서 관리
 *  4) 알림 · 수신 동의(민트): 이메일 소식 상태 · 받기 · 끄기(문의) · 문자(준비 중) · 필수 알림 안내
 *  5) 다른 정보(노랑): 우리 아이 · 배송지 · 추천 데이터 · 회원 탈퇴 바로 가기
 * 비밀번호는 입력칸에만 있고 어디에도 저장하지 않음.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
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

const UI = "/images/ui/";
const PROVIDER: Record<string, string> = { email: "이메일", kakao: "카카오", naver: "네이버", google: "구글" };
const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;

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

    // 남은 시간 표시 · 만료 — 20초마다 시계만 다시 읽음
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

/* ═════════ 0) 한 번 더 확인 ═════════ */
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
            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
            <img className="pf-gate-art" src={`${UI}stickers/login-lock.webp`} alt="" aria-hidden="true" />
            <span className="pf-kicker">SECURITY CHECK</span>
            <h2 id="pf-gate-title">개인정보를 보기 전에 <span className="pf-hl">한 번 더 확인</span>할게요</h2>
            <p className="pf-gate-sub">
                {expired ? "확인한 지 10분이 지나 다시 잠겼어요. " : ""}
                다른 사람이 내 정보를 바꾸지 못하도록 {isEmailAccount ? "비밀번호를" : `${providerLabel} 로그인을`} 다시 확인해요.
            </p>

            <div className="pf-account">
                <span className="pf-av" aria-hidden="true">{(user.name || "댕").slice(0, 1)}</span>
                <span className="pf-account-text">
                    <small>확인할 계정</small>
                    <b>{user.name}</b>
                    <em>{accountDisplay}</em>
                </span>
                <span className="pf-provider" data-provider={provider}><ProviderMark provider={provider} />{providerLabel}</span>
            </div>

            {isEmailAccount ? (
                <form className="pf-gate-form" onSubmit={submit} noValidate>
                    <label className="pf-label" htmlFor="pf-reauth-password">비밀번호</label>
                    <span className="pf-row">
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
                                autoFocus
                            />
                            <button type="button" className="pf-eye" onClick={() => setShow((value) => !value)} aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"} aria-pressed={show}>
                                <i className={show ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} aria-hidden="true" />
                            </button>
                        </span>
                        <button type="submit" className="pf-go" disabled={checking || !password}>
                            {checking ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />확인 중</> : <>확인하기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></>}
                        </button>
                    </span>
                    {error && <p className="pf-msg is-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{error}</p>}
                    <Link href="/forgot-password" className="pf-link">비밀번호를 잊으셨나요?</Link>
                </form>
            ) : (
                <div className="pf-gate-form">
                    <button type="button" className={`pf-social is-${provider}`} onClick={socialAgain}>
                        <ProviderMark provider={provider} />{providerLabel}로 다시 확인
                    </button>
                    <p className="pf-hint">{providerLabel} 화면에서 로그인하면 이 화면으로 돌아와요.</p>
                    {error && <p className="pf-msg is-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{error}</p>}
                </div>
            )}

            <ul className="pf-gate-tips">
                <li><i className="fa-solid fa-clock" aria-hidden="true" />확인은 10분 동안 유지돼요</li>
                <li><i className="fa-solid fa-window-restore" aria-hidden="true" />창을 닫으면 다시 확인해요</li>
                <li><i className="fa-solid fa-shield-halved" aria-hidden="true" />비밀번호는 저장하지 않아요</li>
            </ul>
        </section>
    );
}

/* ═════════ 확인 뒤 ═════════ */
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
    const minutesLeft = Math.max(1, Math.ceil((until - now) / 60_000));
    const untilDate = new Date(until);
    const untilText = `${String(untilDate.getHours()).padStart(2, "0")}:${String(untilDate.getMinutes()).padStart(2, "0")}`;
    const internalEmail = isInternalSocialEmail(user.email);

    // 이메일 인증 상태(서버) — 불러오기 전엔 확인 중
    const [verifiedAt, setVerifiedAt] = useState<string | null | undefined>(undefined);
    useEffect(() => {
        if (!token) return;
        let alive = true;
        loadCurrentCustomer(token)
            .then((me) => { if (alive) setVerifiedAt(me?.email_verified_at || null); })
            .catch(() => { if (alive) setVerifiedAt(null); });
        return () => { alive = false; };
    }, [token]);

    return (
        <>
            <div className="pf-unlocked" role="status">
                <span className="pf-unlocked-i" aria-hidden="true"><i className="fa-solid fa-shield-heart" /></span>
                <span>
                    <b>본인 확인을 마쳤어요</b>
                    <small>{untilText}까지({minutesLeft}분) 정보를 바꿀 수 있어요.</small>
                </span>
                <button type="button" className="pf-lock" onClick={clearReauth}><i className="fa-solid fa-lock" aria-hidden="true" />잠그기</button>
            </div>

            <InfoSection
                user={user}
                token={token}
                accountDisplay={accountDisplay}
                internalEmail={internalEmail}
                verifiedAt={verifiedAt}
                onSavedName={onSavedName}
            />
            <SecuritySection
                user={user}
                token={token}
                provider={provider}
                providerLabel={providerLabel}
                accountDisplay={accountDisplay}
                isEmailAccount={isEmailAccount}
                onPasswordChanged={onPasswordChanged}
            />
            <NoticeSection token={token} internalEmail={internalEmail} />

            <section className="pf-sec" data-tone="yellow" aria-labelledby="pf-more-title">
                <h2 id="pf-more-title" className="pf-h"><span aria-hidden="true"><i className="fa-solid fa-table-cells-large" /></span>다른 정보도 여기서 관리해요</h2>
                <div className="pf-tiles">
                    {[
                        { href: "/mypage/#pet-profiles", art: "stickers/my-pets.webp", title: "우리 아이 정보", sub: "사진 · 견종 · 체중" },
                        { href: "/mypage/address/", art: "stickers/my-address.webp", title: "배송지 관리", sub: "받는 곳 · 기본 배송지" },
                        { href: "/mypage/recommendations/", art: "stickers/my-recommend.webp", title: "추천 데이터", sub: "맞춤 추천 켜기 · 끄기" },
                        { href: "/mypage/withdrawal/", art: "stickers/login-lock.webp", title: "회원 탈퇴", sub: "탈퇴 전 확인할 것" },
                    ].map((tile) => (
                        <Link key={tile.href} href={tile.href}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}${tile.art}`} alt="" aria-hidden="true" />
                            <span><b>{tile.title}</b><small>{tile.sub}</small></span>
                            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                        </Link>
                    ))}
                </div>
            </section>
        </>
    );
}

/* ═════════ 2) 내 정보 ═════════ */
function InfoSection({ user, token, accountDisplay, internalEmail, verifiedAt, onSavedName }: {
    user: User;
    token?: string;
    accountDisplay: string;
    internalEmail: boolean;
    verifiedAt: string | null | undefined;
    onSavedName: (name: string) => void;
}) {
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
            setMessage({ ok: true, text: "이름을 바꿨어요." });
        } catch (caught) {
            setMessage({ ok: false, text: caught instanceof DdbApiError ? caught.message : "이름을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="pf-sec" data-tone="sky" aria-labelledby="pf-info-title">
            <h2 id="pf-info-title" className="pf-h"><span aria-hidden="true"><i className="fa-solid fa-user" /></span>내 정보</h2>

            <form className="pf-row-card" onSubmit={saveName} noValidate>
                <span className="pf-row-label"><i className="fa-solid fa-signature" aria-hidden="true" />이름</span>
                <span className="pf-row-body">
                    <span className="pf-row">
                        <input
                            className="pf-in"
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value);
                                setMessage(null);
                            }}
                            maxLength={50}
                            autoComplete="name"
                            aria-label="이름"
                            aria-invalid={Boolean(message && !message.ok)}
                        />
                        <button type="submit" className="pf-mini" disabled={saving || !changed}>
                            {saving ? "저장 중" : "이름 저장"}
                        </button>
                    </span>
                    {message ? (
                        <span className={message.ok ? "pf-msg is-ok" : "pf-msg is-error"} role={message.ok ? "status" : "alert"}>
                            <i className={message.ok ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation"} aria-hidden="true" />{message.text}
                        </span>
                    ) : (
                        <span className="pf-hint">주문서 · 배송 안내에 쓰이는 이름이에요. 2~50자.</span>
                    )}
                </span>
            </form>

            <div className="pf-row-card">
                <span className="pf-row-label"><i className="fa-solid fa-at" aria-hidden="true" />이메일 · 로그인 계정</span>
                <span className="pf-row-body">
                    <span className="pf-value">
                        <b>{internalEmail ? "등록된 이메일이 없어요" : accountDisplay}</b>
                        {internalEmail ? (
                            <em className="is-amber">이메일 없음</em>
                        ) : verifiedAt === undefined ? (
                            <em>확인 중</em>
                        ) : verifiedAt ? (
                            <em className="is-ok"><i className="fa-solid fa-check" aria-hidden="true" />인증됨{formatDate(verifiedAt) ? ` · ${formatDate(verifiedAt)}` : ""}</em>
                        ) : (
                            <em className="is-amber">인증 전</em>
                        )}
                    </span>
                    <span className="pf-actions">
                        {(internalEmail || verifiedAt === null) && (
                            <Link href="/mypage/#daenglab-wallet" className="pf-pill is-lav">
                                <i className="fa-solid fa-coins" aria-hidden="true" />{internalEmail ? "이메일 등록하고 20C" : "인증하고 20C 받기"}
                            </Link>
                        )}
                        <MypageInquiryLink
                            href="/inquiry?category=other#inquiry-form"
                            className="pf-pill"
                            preset={{
                                kicker: "MY ACCOUNT",
                                title: "이메일·계정 변경 문의",
                                sub: "본인 확인 후 바꿔 드려요. 바꾸고 싶은 이메일이나 가입 계정을 적어 주세요.",
                                art: "/images/ui/stickers/my-profile.webp",
                                category: "other",
                                subject: "[기타 문의] 이메일·계정 변경 요청",
                                hint: "본인 확인을 위해 답변은 입력한 이메일로 보내 드려요.",
                            }}
                        >
                            <i className="fa-solid fa-pen" aria-hidden="true" />변경 문의
                        </MypageInquiryLink>
                    </span>
                    <span className="pf-hint">로그인 아이디라서 직접 바꿀 수 없어요. 본인 확인 뒤 고객센터에서 바꿔 드려요.</span>
                </span>
            </div>

            <div className="pf-row-card is-soon">
                <span className="pf-row-label"><i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />휴대폰 번호</span>
                <span className="pf-row-body">
                    <span className="pf-value"><b>등록 전</b><em className="is-amber">준비 중</em></span>
                    <span className="pf-hint">휴대폰 본인인증이 연결되면 여기서 내 명의 번호를 등록 · 변경할 수 있어요. 주문 연락처는 주문서 · 배송지에 따로 넣어요.</span>
                </span>
            </div>
        </section>
    );
}

/* ═════════ 3) 로그인 · 보안 ═════════ */
function SecuritySection({ user, token, provider, providerLabel, accountDisplay, isEmailAccount, onPasswordChanged }: {
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
            else setError(caught instanceof DdbApiError ? caught.message : "비밀번호를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="pf-sec" data-tone="lav" aria-labelledby="pf-sec-title">
            <h2 id="pf-sec-title" className="pf-h"><span aria-hidden="true"><i className="fa-solid fa-key" /></span>로그인 · 보안</h2>

            <div className="pf-row-card">
                <span className="pf-row-label"><i className="fa-solid fa-right-to-bracket" aria-hidden="true" />로그인 방식</span>
                <span className="pf-row-body">
                    <span className="pf-value">
                        <span className="pf-provider" data-provider={provider}><ProviderMark provider={provider} />{isEmailAccount ? "이메일 로그인" : `${providerLabel} 간편 로그인`}</span>
                        <b className="pf-value-sub">{isEmailAccount ? accountDisplay : `${providerLabel} 계정으로 로그인해요`}</b>
                    </span>
                </span>
            </div>

            <div className="pf-row-card">
                <span className="pf-row-label"><i className="fa-solid fa-lock" aria-hidden="true" />비밀번호</span>
                <span className="pf-row-body">
                    {!isEmailAccount ? (
                        <>
                            <span className="pf-value"><b>{providerLabel}에서 관리해요</b></span>
                            <span className="pf-hint">간편 로그인은 댕다방 비밀번호가 없어요. 비밀번호는 {providerLabel} 계정 설정에서 바꿔 주세요.</span>
                        </>
                    ) : done ? (
                        <p className="pf-done" role="status">
                            <span aria-hidden="true"><i className="fa-solid fa-check" /></span>
                            <b>비밀번호를 바꿨어요</b>
                            <small>보안을 위해 모든 기기에서 로그아웃하고 로그인 화면으로 이동해요.</small>
                        </p>
                    ) : !open ? (
                        <>
                            <span className="pf-value"><b>••••••••</b><button type="button" className="pf-pill is-pink" onClick={() => setOpen(true)}><i className="fa-solid fa-pen" aria-hidden="true" />비밀번호 바꾸기</button></span>
                            <span className="pf-hint">바꾸면 모든 기기에서 로그아웃되고 새 비밀번호로 다시 로그인해요.</span>
                        </>
                    ) : (
                        <form className="pf-pw" onSubmit={submit} noValidate>
                            <label className="pf-label" htmlFor="pf-pw-current">현재 비밀번호</label>
                            <input id="pf-pw-current" className="pf-in" type={show ? "text" : "password"} value={current} onChange={(event) => { setCurrent(event.target.value); setError(""); }} autoComplete="current-password" />
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
                            <span className="pf-pw-foot">
                                <button type="button" className="pf-cancel" onClick={() => { setOpen(false); setCurrent(""); setNext(""); setConfirm(""); setError(""); }}>취소</button>
                                <button type="submit" className="pf-go" disabled={!ready || saving}>
                                    {saving ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />바꾸는 중</> : "비밀번호 바꾸기"}
                                </button>
                            </span>
                            <Link href="/forgot-password" className="pf-link">현재 비밀번호가 기억나지 않나요?</Link>
                        </form>
                    )}
                </span>
            </div>
        </section>
    );
}

/* ═════════ 4) 알림 · 수신 동의 ═════════ */
function NoticeSection({ token, internalEmail }: { token?: string; internalEmail: boolean }) {
    const [state, setState] = useState<"loading" | "on" | "off" | "unknown">(internalEmail || !token ? "unknown" : "loading");
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

    const subscribe = async () => {
        if (!token || !agree || saving) return;
        setSaving(true);
        setMessage(null);
        try {
            const preference = await consentOutboundEmailPreference(token);
            setState(preference.sendAuthorized ? "on" : "off");
            setMessage(preference.sendAuthorized
                ? { ok: true, text: `${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일 · 댕다방 이메일 소식 수신에 동의했어요.` }
                : { ok: false, text: "동의는 저장됐지만 받을 이메일 확인이 필요해요. 코인 탭에서 이메일을 인증해 주세요." });
        } catch (caught) {
            setMessage({ ok: false, text: caught instanceof DdbApiError ? caught.message : "저장하지 못했어요. 잠시 후 다시 시도해 주세요." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="pf-sec" data-tone="mint" aria-labelledby="pf-notice-title">
            <h2 id="pf-notice-title" className="pf-h"><span aria-hidden="true"><i className="fa-solid fa-bell" /></span>알림 · 수신 동의</h2>

            <div className="pf-row-card">
                <span className="pf-row-label"><i className="fa-solid fa-envelope-open-text" aria-hidden="true" />이메일 소식</span>
                <span className="pf-row-body">
                    <span className="pf-value">
                        <b>새 상품 · 할인 · 이벤트 소식</b>
                        {state === "loading" && <em>확인 중</em>}
                        {state === "on" && <em className="is-ok"><i className="fa-solid fa-check" aria-hidden="true" />받는 중</em>}
                        {state === "off" && <em>받지 않음</em>}
                        {state === "unknown" && <em className="is-amber">{internalEmail ? "이메일 없음" : "확인 못 함"}</em>}
                    </span>
                    {state === "off" && (
                        <span className="pf-optin">
                            <label>
                                <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} />
                                <span><b className="pf-opt">선택</b> 광고성 정보를 이메일로 받는 데 동의해요</span>
                            </label>
                            <button type="button" className="pf-mini" onClick={() => void subscribe()} disabled={!agree || saving}>{saving ? "저장 중" : "받기"}</button>
                        </span>
                    )}
                    {state === "on" && (
                        <span className="pf-actions">
                            <MypageInquiryLink
                                href="/inquiry?category=other#inquiry-form"
                                className="pf-pill"
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
                        </span>
                    )}
                    {internalEmail && (
                        <span className="pf-actions"><Link href="/mypage/#daenglab-wallet" className="pf-pill is-lav"><i className="fa-solid fa-at" aria-hidden="true" />이메일 등록하기</Link></span>
                    )}
                    {message && (
                        <span className={message.ok ? "pf-msg is-ok" : "pf-msg is-error"} role={message.ok ? "status" : "alert"}>
                            <i className={message.ok ? "fa-solid fa-envelope-circle-check" : "fa-solid fa-circle-exclamation"} aria-hidden="true" />{message.text}
                        </span>
                    )}
                </span>
            </div>

            <div className="pf-row-card is-soon">
                <span className="pf-row-label"><i className="fa-solid fa-comment-sms" aria-hidden="true" />문자(SMS) 소식</span>
                <span className="pf-row-body">
                    <span className="pf-value"><b>문자로 받는 소식</b><em className="is-amber">준비 중</em></span>
                    <span className="pf-hint">휴대폰 번호 등록이 열리면 함께 고를 수 있어요.</span>
                </span>
            </div>

            <p className="pf-note"><i className="fa-solid fa-circle-info" aria-hidden="true" />주문 · 배송 · 환불 안내처럼 꼭 필요한 알림은 수신 동의와 관계없이 보내 드려요.</p>
        </section>
    );
}
