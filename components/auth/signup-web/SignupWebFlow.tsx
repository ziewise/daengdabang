/**
 * SignupWebFlow — 웹 새 회원가입 흐름(2026-10-24 사용자 "모든 갈림길 · 모든 단계 · 하나도 놓치지 말고 · 웹 컨셉")
 * ---------------------------------------------------------------------
 * 값(이름 · 이메일 · 비밀번호 · 동의 · 보안 확인 · 우리 아이) · 사진 분석 · 가입(submit)은 전부 app/auth/signup/page.tsx 의 것 그대로 —
 * 이 화면은 그 값을 단계로 나눠 보여 주는 겉모양. 앱은 같은 페이지의 기존 한 장 화면 그대로(웹에서만 이 부품을 그림).
 *
 * 이메일 가입:  가입 방법 → ① 약관 동의 → (② 휴대폰 본인인증 — 연동되면) → ③ 계정 정보 → ④ 우리 아이(선택) + 가입 보안 확인 → 완료
 * 간편 가입:    가입 방법(카카오 · 네이버 · 구글) → ① 약관 동의 + 가입 보안 확인 → ② 공급자 로그인 · 동의(공급자 화면)
 *               → ③ 정보 확인 → ④ 우리 아이 → 완료   (③부터는 app/auth/social-callback 의 SocialSignupWebFinish)
 * 이메일 인증은 가입 단계에서 받지 않음(2026-10-24 사용자) — 완료 화면에서 "마이페이지 코인 탭에서 인증하면 20C" 안내.
 *
 * 갈림길: 회원가입 준비 중 · 공급자 준비 중/연결 확인 실패 · 약관 보기 창 · 전체 동의 · 본인인증(취소 · 시간 초과 · 실패 ·
 *   이미 가입 · 만 14세 미만 · 재가입 제한) · 이메일 형식 · 이메일 중복(확인 단추 · 가입 때 409) · 가입 불가 이메일 ·
 *   비밀번호 길이 · 72바이트 · 강도 · 확인 불일치 · 우리 아이 지금/나중 · 선택 동의 없이 저장 불가 · 견종 확인 ·
 *   보안 확인 만료 · 가입 실패 안내 · 완료(마케팅 수신 동의 결과)
 * 아직 서버가 없는 기능(본인인증 · 이메일 중복 확인 · 마케팅 동의 저장)은 lib/signup-flow.ts 스위치가 켜질 때만 나타남.
 */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import SignupBotChallenge from "@/components/auth/SignupBotChallenge";
import { beginSocialAuth, useSocialProviderStatus } from "@/components/auth/SocialAuthButtons";
import type { SocialProvider } from "@/lib/customer-api";
import { PET_BREEDS } from "@/lib/pet-companion-breeds";
import { SIGNUP_PRIVACY_VERSION, SIGNUP_TERMS_VERSION } from "@/lib/signup-agreements";
import {
    checkSignupEmail,
    maskEmail,
    readSignupFlowFeatures,
    saveMarketingConsent,
    startIdentityVerification,
    type EmailAvailability,
    type MarketingChoice,
} from "@/lib/signup-flow";
import type { PetProfile, User } from "@/lib/store";
import {
    IdentityPanel,
    identityPasses,
    PROVIDER_NAME,
    ProviderMark,
    SignupWebDone,
    SxCheck,
    SxDocModal,
    SxHead,
    SxNotice,
    SxSteps,
    SxTop,
    TermsPanel,
    UI,
    useScrollTopOn,
    type IdentityState,
    type SxDocKind,
} from "@/components/auth/signup-web/SignupWebParts";

/** 우리 아이 칸 — 가입 페이지 상태 그대로 넘겨받음 */
/** 네 방향 사진 이름 */
export type PetPhotoViewId = "front" | "left" | "right" | "back";

export type SignupWebPetState = {
    name: string;
    setName: (value: string) => void;
    age: string;
    setAge: (value: string) => void;
    size: PetProfile["size"];
    setSize: (value: PetProfile["size"]) => void;
    weightKg: string;
    setWeightKg: (value: string) => void;
    weightEstimate?: { minKg: number; maxKg: number };
    sex: NonNullable<PetProfile["sex"]>;
    setSex: (value: NonNullable<PetProfile["sex"]>) => void;
    coatColor: string;
    onCoatColor: (value: string) => void;
    coatColorFromAi: boolean;
    coat: PetProfile["coat"];
    setCoat: (value: PetProfile["coat"]) => void;
    activity: PetProfile["activity"];
    setActivity: (value: PetProfile["activity"]) => void;
    concerns: string[];
    toggleConcern: (concern: string) => void;
    photos: Partial<Record<PetPhotoViewId, { dataUrl: string }>>;
    onPhoto: (viewId: PetPhotoViewId, file?: File) => void;
    photoLoading: boolean;
    photoError: string;
    breedId: string;
    onBreedId: (value: string) => void;
    breedCustom: string;
    onBreedCustom: (value: string) => void;
    breedMessage: string;
    analysisMessage: string;
    /** 펫렌즈에서 넘어온 값 등 이미 채워진 정보가 있음 */
    hasData: boolean;
};

export type SignupWebErrorKind = "" | "email_taken" | "email_domain";

/** 우리 아이 칸 고정 목록 — 가입 페이지(app/auth/signup/page.tsx)에 있는 값을 그대로 넘겨받음 */
export type SignupWebPetOptions = {
    photoViews: ReadonlyArray<{ id: PetPhotoViewId; label: string; helper: string }>;
    concerns: string[];
    customBreed: string;
};

type Props = {
    apiReady: boolean | null;
    returnTo: string;
    name: string;
    setName: (value: string) => void;
    email: string;
    setEmail: (value: string) => void;
    password: string;
    setPassword: (value: string) => void;
    agreeTerms: boolean;
    setAgreeTerms: (value: boolean) => void;
    agreePrivacy: boolean;
    setAgreePrivacy: (value: boolean) => void;
    agreePetLens: boolean;
    setAgreePetLens: (value: boolean) => void;
    botConfigured: boolean;
    botToken: string;
    setBotToken: (value: string) => void;
    botResetKey: number;
    pet: SignupWebPetState;
    options: SignupWebPetOptions;
    loading: boolean;
    error: string;
    errorKind: SignupWebErrorKind;
    clearError: () => void;
    submit: (event: FormEvent, options: { skipPet: boolean }) => void;
    /** 가입이 끝났으면(로그인까지 됨) 완료 화면 */
    done: { member: User; onFinish: () => void; onLeave: () => void } | null;
};

type Screen = "method" | "terms" | "identity" | "account" | "pet";
type Route = "email" | SocialProvider;

const SOCIAL: Array<{ id: SocialProvider; label: string; gives: string }> = [
    { id: "kakao", label: "카카오", gives: "프로필 이름 · 이메일(카카오 화면에서 동의한 항목만)" },
    { id: "naver", label: "네이버", gives: "이름 · 이메일 · 휴대폰 번호(네이버 화면에서 동의한 항목만)" },
    { id: "google", label: "구글", gives: "이름 · 이메일 · 프로필 사진" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;

/** 비밀번호 강도 0~3 */
function passwordScore(value: string) {
    if (value.length < 8) return value ? 1 : 0;
    let score = 1;
    if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) score += 1;
    return score;
}

/** 알약 고르기(라디오) — 크기 · 털 길이 · 성별 · 활동량 */
function Pills<T extends string>({ label, name, value, options, onChange, hint }: { label: string; name: string; value: T; options: Array<[T, string]>; onChange: (value: T) => void; hint?: string }) {
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

export default function SignupWebFlow(props: Props) {
    const { pet, done } = props;
    const { photoViews: PET_PHOTO_VIEWS, concerns: CONCERN_OPTIONS, customBreed: CUSTOM_BREED_OPTION } = props.options;
    const [features] = useState(readSignupFlowFeatures);
    const providers = useSocialProviderStatus();
    const [screen, setScreen] = useState<Screen>("method");
    const [route, setRoute] = useState<Route>("email");
    const [age14, setAge14] = useState(false);
    const [marketing, setMarketing] = useState<MarketingChoice>({ email: false, sms: false });
    const [doc, setDoc] = useState<SxDocKind | null>(null);
    const [identity, setIdentity] = useState<IdentityState>({ phase: "idle" });
    const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | EmailAvailability>("idle");
    const [showPassword, setShowPassword] = useState(false);
    const [password2, setPassword2] = useState("");
    const [tried, setTried] = useState(false);
    const [petChoice, setPetChoice] = useState<"now" | "later" | null>(null);
    const [socialError, setSocialError] = useState("");
    const [marketingProcessedAt, setMarketingProcessedAt] = useState<string | null>(null);
    const marketingSavedRef = useRef(false);

    const isSocial = route !== "email";
    const providerLabel = isSocial ? PROVIDER_NAME[route] : "";
    const choice = petChoice ?? (pet.hasData ? "now" : null);
    const identityOk = identityPasses(identity);
    const identityVerified = identity.phase === "result" && identity.result.status === "verified" ? identity.result : null;

    // 단계 줄 이름 · 지금 위치
    const labels = isSocial
        ? ["약관 동의", `${providerLabel} 로그인`, "정보 확인", "우리 아이", "완료"]
        : ["약관 동의", ...(features.identity ? ["본인인증"] : []), "계정 정보", "우리 아이", "완료"];
    const order: Screen[] = isSocial ? ["terms"] : ["terms", ...(features.identity ? ["identity" as const] : []), "account", "pet"];
    const stepIndex = done ? labels.length - 1 : Math.max(0, order.indexOf(screen));

    useScrollTopOn(done ? "done" : screen);

    // 가입이 끝나면 마케팅 수신 동의 저장(연동됐을 때만) → 완료 화면에 처리 결과 안내
    useEffect(() => {
        if (!done || !features.marketing || marketingSavedRef.current) return;
        marketingSavedRef.current = true;
        void saveMarketingConsent(done.member.apiAccessToken, marketing).then((processedAt) => {
            if (processedAt) setMarketingProcessedAt(processedAt);
        });
    }, [done, features.marketing, marketing]);

    const go = (next: Screen) => {
        props.clearError();
        setTried(false);
        setScreen(next);
    };

    const requiredAgreed = age14 && props.agreeTerms && props.agreePrivacy;

    /* ───────── 완료 ───────── */
    if (done) {
        return (
            <div className="sxw-wrap">
                <SxTop compact lead="가입이 모두 끝났어요." />
                <SxSteps labels={labels} now={stepIndex} />
                <SignupWebDone
                    name={done.member.name}
                    pet={done.member.pets[0]}
                    marketing={marketingProcessedAt ? { choice: marketing, processedAt: marketingProcessedAt } : null}
                    finishLabel="쇼핑 시작하기"
                    onFinish={done.onFinish}
                    onLeave={done.onLeave}
                />
            </div>
        );
    }

    /* ───────── 가입 방법 ───────── */
    if (screen === "method") {
        const status = (provider: SocialProvider) => {
            if (props.apiReady !== true) return "off";
            if (!providers.statusChecked) return "checking";
            if (!providers.enabledByProvider) return "error";
            return providers.enabledByProvider[provider] ? "ready" : "off";
        };
        const connectionError = props.apiReady === true && providers.statusChecked && !providers.enabledByProvider;
        return (
            <div className="sxw-wrap" data-signup-screen="method">
                <SxTop lead="우리 아이 정보를 함께 등록하면 꼭 맞는 상품과 돌봄을 추천해 드려요." />
                {props.apiReady === false && (
                    <SxNotice tone="amber" icon="fa-screwdriver-wrench" title="지금은 회원가입 준비 중이에요">잠시 후 다시 이용해 주세요.</SxNotice>
                )}
                <div className="sxw-bonus">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}goods-pay-ready-256.webp`} alt="" aria-hidden="true" />
                    <span>
                        <b>신규 가입 혜택 · 코인 20C</b>
                        <small>가입 후 마이페이지에서 이메일을 인증하면 바로 들어와요 · 행동·소리 분석 2회</small>
                    </span>
                </div>
                <div className="sxw-ways">
                    <section className="sxw-way" data-tone="pink" aria-labelledby="sxw-way-mail">
                        <header>
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}stickers/my-profile.webp`} alt="" aria-hidden="true" />
                            <span>
                                <h2 id="sxw-way-mail">이메일로 가입</h2>
                                <small>이메일 · 비밀번호로 로그인해요</small>
                            </span>
                        </header>
                        <ol className="sxw-flow">
                            <li>약관 동의<i className="fa-solid fa-file-signature" aria-hidden="true" /></li>
                            {features.identity && <li>휴대폰 본인인증<i className="fa-solid fa-mobile-screen-button" aria-hidden="true" /></li>}
                            <li>이메일 · 비밀번호<i className="fa-solid fa-key" aria-hidden="true" /></li>
                            <li>우리 아이 등록(선택)<i className="fa-solid fa-paw" aria-hidden="true" /></li>
                            <li>가입 완료<i className="fa-solid fa-gift" aria-hidden="true" /></li>
                        </ol>
                        <button
                            type="button"
                            className="sxw-btn is-pink"
                            disabled={props.apiReady === false}
                            onClick={() => {
                                setRoute("email");
                                go("terms");
                            }}
                            data-signup-start="email"
                        >
                            <i className="fa-solid fa-envelope" aria-hidden="true" />이메일로 가입하기
                        </button>
                    </section>
                    <section className="sxw-way" data-tone="sky" aria-labelledby="sxw-way-easy">
                        <header>
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}header-login-128.webp`} alt="" aria-hidden="true" />
                            <span>
                                <h2 id="sxw-way-easy">간편 가입</h2>
                                <small>쓰던 계정으로 비밀번호 없이 시작해요</small>
                            </span>
                        </header>
                        {SOCIAL.map((provider) => {
                            const state = status(provider.id);
                            return (
                                <button
                                    key={provider.id}
                                    type="button"
                                    className={`sxw-btn is-${provider.id}`}
                                    disabled={state !== "ready"}
                                    onClick={() => {
                                        setRoute(provider.id);
                                        setSocialError("");
                                        go("terms");
                                    }}
                                    aria-label={`${provider.label}로 간편가입`}
                                    data-signup-start={provider.id}
                                >
                                    <ProviderMark provider={provider.id} />
                                    {provider.label}로 시작하기
                                    {state === "checking" && <em>확인 중</em>}
                                    {state === "off" && props.apiReady === true && <em>준비 중</em>}
                                </button>
                            );
                        })}
                        {connectionError && (
                            <p className="sxw-retry" role="status">
                                간편가입 연결을 확인하지 못했어요.
                                <button type="button" onClick={providers.retryProviders}>다시 확인</button>
                            </p>
                        )}
                        <p className="sxw-way-note">공급자 화면에서 로그인 · 동의하면 댕다방으로 돌아와요.</p>
                    </section>
                </div>
                <p className="sxw-login">이미 회원이신가요?<Link href="/auth/login">로그인</Link></p>
            </div>
        );
    }

    /* ───────── ① 약관 동의 ───────── */
    if (screen === "terms") {
        const provider = SOCIAL.find((item) => item.id === route);
        const socialReady = requiredAgreed && Boolean(props.botToken) && props.botConfigured;
        return (
            <div className="sxw-wrap" data-signup-screen="terms">
                <SxTop compact lead={isSocial ? `${providerLabel} 계정으로 가입해요. 먼저 약관을 확인해 주세요.` : "가입 전에 꼭 필요한 약관을 확인해 주세요."} />
                <SxSteps labels={labels} now={stepIndex} />
                <section className="sxw-card" aria-labelledby="sxw-terms-title">
                    <SxHead
                        art="policy-info-192.webp"
                        kicker="STEP 1 · AGREEMENT"
                        title={<span id="sxw-terms-title">약관에 동의해 주세요</span>}
                        sub="필수 항목에 동의해야 가입할 수 있어요. 항목마다 보기를 눌러 내용을 확인할 수 있어요."
                    />
                    {isSocial && provider && (
                        <div className="sxw-provider" data-provider={provider.id}>
                            <span className="sxw-provider-mark"><ProviderMark provider={provider.id} /></span>
                            <span>
                                <b>{provider.label}에서 받는 정보</b>
                                <small>{provider.gives} · 비밀번호는 받지 않아요</small>
                            </span>
                        </div>
                    )}
                    <TermsPanel
                        value={{ age14, terms: props.agreeTerms, privacy: props.agreePrivacy, marketing }}
                        onChange={(next) => {
                            setAge14(next.age14);
                            props.setAgreeTerms(next.terms);
                            props.setAgreePrivacy(next.privacy);
                            setMarketing(next.marketing);
                        }}
                        marketingEnabled={features.marketing && !isSocial}
                        onOpenDoc={setDoc}
                    />
                    {!isSocial && (
                        <p className="sxw-note"><i className="fa-solid fa-paw" aria-hidden="true" />반려견 사진 · 정보 동의(선택)는 &quot;우리 아이&quot; 단계에서 따로 받아요.</p>
                    )}
                    {isSocial && (
                        <div className="sxw-bot">
                            <SignupBotChallenge
                                onTokenChange={props.setBotToken}
                                resetKey={props.botResetKey}
                                title="가입 보안 확인"
                                description="자동 가입을 막기 위한 확인이에요. 확인이 끝나면 다음 단추가 켜져요."
                            />
                        </div>
                    )}
                    {tried && !requiredAgreed && (
                        <SxNotice tone="rose" icon="fa-circle-exclamation">필수 항목 세 가지에 모두 동의해 주세요.</SxNotice>
                    )}
                    {socialError && <SxNotice tone="rose" icon="fa-circle-exclamation">{socialError}</SxNotice>}
                    <div className="sxw-foot">
                        <button type="button" className="sxw-prev" onClick={() => go("method")}>
                            <i className="fa-solid fa-chevron-left" aria-hidden="true" />이전
                        </button>
                        {isSocial ? (
                            <button
                                type="button"
                                className={`sxw-next is-${route}`}
                                disabled={!socialReady}
                                onClick={() => {
                                    setSocialError("");
                                    const started = beginSocialAuth(route as SocialProvider, "signup", props.returnTo, {
                                        botToken: props.botToken,
                                        termsVersion: SIGNUP_TERMS_VERSION,
                                        privacyVersion: SIGNUP_PRIVACY_VERSION,
                                    });
                                    if (!started) setSocialError("간편가입을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
                                }}
                                data-signup-social-go={route}
                            >
                                <ProviderMark provider={route} />
                                {providerLabel}로 계속하기
                                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                className={requiredAgreed ? "sxw-next" : "sxw-next is-off"}
                                aria-disabled={!requiredAgreed}
                                onClick={() => {
                                    if (!requiredAgreed) {
                                        setTried(true);
                                        return;
                                    }
                                    go(features.identity ? "identity" : "account");
                                }}
                                data-signup-next="terms"
                            >
                                {features.identity ? "동의하고 본인인증하기" : "동의하고 계속하기"}
                                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                    {isSocial && !socialReady && (
                        <p className="sxw-foot-hint">필수 동의 세 가지와 가입 보안 확인을 마치면 {providerLabel} 화면으로 넘어가요.</p>
                    )}
                </section>
                <SxDocModal kind={doc} onClose={() => setDoc(null)} />
            </div>
        );
    }

    /* ───────── ② 휴대폰 본인인증 ───────── */
    if (screen === "identity") {
        return (
            <div className="sxw-wrap" data-signup-screen="identity">
                <SxTop compact lead={identityOk ? "본인인증이 끝났어요. 이어서 계정을 만들어요." : "한 사람이 한 계정만 만들 수 있도록 확인해요."} />
                <SxSteps labels={labels} now={stepIndex} />
                <section className="sxw-card" aria-labelledby="sxw-id-title">
                    <SxHead
                        art="web-cs-phone-256.webp"
                        kicker="STEP 2 · IDENTITY"
                        title={<span id="sxw-id-title">휴대폰으로 본인인증 해 주세요</span>}
                        sub="본인확인 기관 창에서 내 명의 휴대폰으로 인증해요."
                    />
                    <IdentityPanel
                        state={identity}
                        onStart={() => {
                            setIdentity({ phase: "busy" });
                            void startIdentityVerification().then((result) => {
                                setIdentity({ phase: "result", result });
                                if (result.status === "verified" && result.name) props.setName(result.name);
                            });
                        }}
                        onRestart={() => setIdentity({ phase: "idle" })}
                    />
                    <div className="sxw-foot">
                        <button type="button" className="sxw-prev" onClick={() => go("terms")}>
                            <i className="fa-solid fa-chevron-left" aria-hidden="true" />이전
                        </button>
                        <button type="button" className="sxw-next" disabled={!identityOk} onClick={() => go("account")} data-signup-next="identity">
                            {identityOk ? "다음 · 계정 정보" : "인증을 마치면 다음으로"}
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    /* ───────── ③ 계정 정보 ───────── */
    if (screen === "account") {
        const emailValue = props.email.trim();
        const emailFormatOk = EMAIL_RE.test(emailValue);
        const nameOk = Boolean(props.name.trim());
        const lengthOk = props.password.length >= 8;
        const bytesOk = utf8Bytes(props.password) <= 72;
        const mixOk = /[A-Za-z]/.test(props.password) && /\d/.test(props.password);
        const score = passwordScore(props.password);
        const matchOk = Boolean(password2) && password2 === props.password;
        const emailTaken = emailStatus === "taken";
        const ready = nameOk && emailFormatOk && lengthOk && bytesOk && matchOk && !emailTaken && emailStatus !== "checking";

        const runEmailCheck = async () => {
            if (!emailFormatOk) return "idle" as const;
            setEmailStatus("checking");
            const result = await checkSignupEmail(emailValue);
            setEmailStatus(result);
            return result;
        };

        const next = async () => {
            setTried(true);
            if (!ready) return;
            if (features.emailCheck && emailStatus === "idle") {
                const result = await runEmailCheck();
                if (result === "taken") return;
            }
            go("pet");
        };

        return (
            <div className="sxw-wrap" data-signup-screen="account">
                <SxTop compact lead="로그인할 이메일과 비밀번호를 정해 주세요." />
                <SxSteps labels={labels} now={stepIndex} />
                <form
                    className="sxw-card"
                    aria-labelledby="sxw-acc-title"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        void next();
                    }}
                >
                    <SxHead
                        art="stickers/my-profile.webp"
                        kicker={`STEP ${features.identity ? 3 : 2} · ACCOUNT`}
                        title={<span id="sxw-acc-title">계정 정보를 입력해 주세요</span>}
                        sub={identityVerified ? "이름과 휴대폰은 본인인증 정보로 채워져요." : "이메일이 로그인 아이디가 돼요. 주문 안내도 이 주소로 보내 드려요."}
                    />
                    <div className="sxw-form">
                        <label className="sxw-f">
                            <span className="sxw-label">이름</span>
                            {identityVerified ? (
                                <span className="sxw-in is-lock">{identityVerified.name}<i className="fa-solid fa-lock" aria-label="본인인증 정보" /></span>
                            ) : (
                                <input
                                    className="sxw-in"
                                    value={props.name}
                                    onChange={(event) => props.setName(event.target.value)}
                                    autoComplete="name"
                                    maxLength={40}
                                    placeholder="예: 김댕댕"
                                    aria-invalid={tried && !nameOk}
                                />
                            )}
                            {tried && !nameOk && <span className="sxw-err">이름을 입력해 주세요.</span>}
                        </label>
                        {identityVerified ? (
                            <div className="sxw-f">
                                <span className="sxw-label">휴대폰</span>
                                <span className="sxw-in is-lock">{identityVerified.maskedPhone}<i className="fa-solid fa-lock" aria-label="본인인증 정보" /></span>
                            </div>
                        ) : (
                            <div className="sxw-f sxw-f-tip" aria-hidden="true">
                                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                <img src={`${UI}web-cs-mail-256.webp`} alt="" />
                                <span>주문 · 배송 안내와 영수증을 이메일로 보내 드려요. 실제로 쓰는 주소를 넣어 주세요.</span>
                            </div>
                        )}

                        <div className="sxw-f is-wide">
                            <label className="sxw-label" htmlFor="sxw-email">
                                이메일 <small>로그인 아이디 · 영수증과 알림을 받아요</small>
                            </label>
                            <span className="sxw-row">
                                <span className={`sxw-inwrap${emailStatus === "available" ? " is-ok" : ""}${emailTaken ? " is-bad" : ""}`}>
                                    <input
                                        id="sxw-email"
                                        className="sxw-in"
                                        type="email"
                                        value={props.email}
                                        onChange={(event) => {
                                            props.setEmail(event.target.value);
                                            setEmailStatus("idle");
                                            props.clearError();
                                        }}
                                        autoComplete="email"
                                        inputMode="email"
                                        placeholder="daeng@example.com"
                                        aria-invalid={(tried && !emailFormatOk) || emailTaken}
                                    />
                                    {emailStatus === "available" && <em>사용할 수 있어요</em>}
                                    {emailStatus === "unknown" && <em className="is-soft">가입할 때 다시 확인해요</em>}
                                </span>
                                {features.emailCheck && (
                                    <button type="button" className="sxw-mini" onClick={() => void runEmailCheck()} disabled={!emailFormatOk || emailStatus === "checking"}>
                                        <i className={emailStatus === "checking" ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-magnifying-glass"} aria-hidden="true" />
                                        중복 확인
                                    </button>
                                )}
                            </span>
                            {tried && !emailFormatOk && <span className="sxw-err">이메일 주소 형식을 확인해 주세요. 예: daeng@example.com</span>}
                            {!features.emailCheck && emailFormatOk && <span className="sxw-hint">이미 가입된 이메일인지는 가입하기를 누를 때 확인해요.</span>}
                            {emailTaken && (
                                <div className="sxw-branch is-inline" data-tone="pink" role="alert" data-email-branch="taken">
                                    <div>
                                        <h3>이미 가입된 이메일이에요</h3>
                                        <p>{maskEmail(emailValue)} 계정이 있어요. 로그인하거나 다른 이메일로 가입해 주세요.</p>
                                        <span className="sxw-branch-go">
                                            <Link href="/auth/login" className="sxw-pill is-pink">로그인</Link>
                                            <Link href="/forgot-password" className="sxw-pill">비밀번호 찾기</Link>
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="sxw-f">
                            <label className="sxw-label" htmlFor="sxw-pw">비밀번호</label>
                            <span className="sxw-inwrap">
                                <input
                                    id="sxw-pw"
                                    className="sxw-in"
                                    type={showPassword ? "text" : "password"}
                                    value={props.password}
                                    onChange={(event) => props.setPassword(event.target.value)}
                                    autoComplete="new-password"
                                    maxLength={72}
                                    placeholder="8자 이상"
                                    aria-invalid={tried && (!lengthOk || !bytesOk)}
                                    aria-describedby="sxw-pw-rules"
                                />
                                <button type="button" className="sxw-eye" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"} aria-pressed={showPassword}>
                                    <i className={showPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} aria-hidden="true" />
                                </button>
                            </span>
                            <span className="sxw-meter" data-score={score} aria-hidden="true"><i /><i /><i /></span>
                            <span className="sxw-rules" id="sxw-pw-rules">
                                <span className={lengthOk ? "is-ok" : ""}><i className={lengthOk ? "fa-solid fa-check" : "fa-solid fa-circle"} aria-hidden="true" />8자 이상</span>
                                <span className={mixOk ? "is-ok" : ""}><i className={mixOk ? "fa-solid fa-check" : "fa-solid fa-circle"} aria-hidden="true" />영문 · 숫자 섞기(권장)</span>
                                <span className={props.password && bytesOk ? "is-ok" : props.password ? "is-bad" : ""}><i className={bytesOk ? "fa-solid fa-check" : "fa-solid fa-xmark"} aria-hidden="true" />72바이트 이하</span>
                                {props.password && <b className="sxw-score">{score >= 3 ? "튼튼해요" : score === 2 ? "괜찮아요" : "조금 약해요"}</b>}
                            </span>
                            {tried && !lengthOk && <span className="sxw-err">비밀번호는 8자 이상으로 정해 주세요.</span>}
                            {!bytesOk && <span className="sxw-err">비밀번호가 너무 길어요(한글은 한 글자에 3바이트). 조금 줄여 주세요.</span>}
                        </div>
                        <div className="sxw-f">
                            <label className="sxw-label" htmlFor="sxw-pw2">비밀번호 확인</label>
                            <span className={`sxw-inwrap${matchOk ? " is-ok" : password2 && !matchOk ? " is-bad" : ""}`}>
                                <input
                                    id="sxw-pw2"
                                    className="sxw-in"
                                    type={showPassword ? "text" : "password"}
                                    value={password2}
                                    onChange={(event) => setPassword2(event.target.value)}
                                    autoComplete="new-password"
                                    maxLength={72}
                                    placeholder="한 번 더 입력"
                                    aria-invalid={Boolean(password2) && !matchOk}
                                />
                                {matchOk && <em>일치해요</em>}
                                {password2 && !matchOk && <em className="is-bad">달라요</em>}
                            </span>
                            {tried && !password2 && <span className="sxw-err">비밀번호를 한 번 더 입력해 주세요.</span>}
                        </div>
                    </div>
                    <div className="sxw-foot">
                        <button type="button" className="sxw-prev" onClick={() => go(features.identity ? "identity" : "terms")}>
                            <i className="fa-solid fa-chevron-left" aria-hidden="true" />이전
                        </button>
                        <button type="submit" className={ready ? "sxw-next" : "sxw-next is-off"} aria-disabled={!ready} data-signup-next="account">
                            다음 · 우리 아이 등록<i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    /* ───────── ④ 우리 아이 + 마지막 확인 · 가입 ───────── */
    const canSubmit = Boolean(choice) && props.apiReady === true && props.botConfigured && Boolean(props.botToken) && !props.loading && !pet.photoLoading;
    return (
        <div className="sxw-wrap" data-signup-screen="pet">
            <SxTop compact lead="우리 아이를 함께 등록하면 꼭 맞는 상품을 먼저 보여 드려요." />
            <SxSteps labels={labels} now={stepIndex} />
            <form
                className="sxw-stack"
                onSubmit={(event) => {
                    if (!choice) {
                        event.preventDefault();
                        setTried(true);
                        return;
                    }
                    props.submit(event, { skipPet: choice !== "now" });
                }}
                aria-labelledby="sxw-pet-title"
            >
                <section className="sxw-card">
                    <SxHead
                        art="lab-dog-256.webp"
                        kicker={`STEP ${features.identity ? 4 : 3} · MY DOG`}
                        title={<span id="sxw-pet-title">우리 아이도 함께 등록할까요?</span>}
                        sub="사진 한 장만 있어도 견종 · 크기 후보를 찾아 드려요. 지금 안 해도 마이페이지에서 등록할 수 있어요."
                    />
                    <div className="sxw-choice" role="radiogroup" aria-label="우리 아이 등록">
                        <label className={choice === "now" ? "is-on" : ""} data-tone="mint">
                            <input type="radio" name="sxw-pet-choice" checked={choice === "now"} onChange={() => setPetChoice("now")} />
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}mypet-view-front-160.webp`} alt="" aria-hidden="true" />
                            <span><b>지금 등록할게요</b><small>맞춤 추천을 바로 받아요</small></span>
                            <i className="fa-solid fa-circle-check" aria-hidden="true" />
                        </label>
                        <label className={choice === "later" ? "is-on" : ""} data-tone="cream">
                            <input type="radio" name="sxw-pet-choice" checked={choice === "later"} onChange={() => setPetChoice("later")} />
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}daily-checkin-256.webp`} alt="" aria-hidden="true" />
                            <span><b>나중에 할게요</b><small>계정만 먼저 만들어요</small></span>
                            <i className="fa-solid fa-circle-check" aria-hidden="true" />
                        </label>
                    </div>
                    {tried && !choice && <SxNotice tone="rose" icon="fa-circle-exclamation">우리 아이를 지금 등록할지, 나중에 할지 골라 주세요.</SxNotice>}

                    {choice === "now" && (
                        <div className="sxw-pet" data-petlens-multiview-upload>
                            <div className="sxw-shots-wrap">
                                <span className="sxw-label">사진 <small>정면은 대표 사진이에요</small></span>
                                <div className="sxw-shots">
                                    {PET_PHOTO_VIEWS.map((view) => {
                                        const photo = pet.photos[view.id];
                                        return (
                                            <label key={view.id} className={photo ? "sxw-shot is-on" : "sxw-shot"} data-petlens-photo-view={view.id}>
                                                {/* eslint-disable-next-line @next/next/no-img-element -- 회원 사진 · 3D 그림 */}
                                                <img src={photo ? photo.dataUrl : `${UI}mypet-view-${view.id}-160.webp`} alt={photo ? `${view.label} 반려견 사진` : ""} />
                                                <small>{view.label}</small>
                                                <em>{photo ? "다시 선택" : view.helper}</em>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    disabled={pet.photoLoading || props.loading}
                                                    data-petlens-mobile-camera-capture
                                                    onChange={(event) => {
                                                        pet.onPhoto(view.id, event.target.files?.[0]);
                                                        event.currentTarget.value = "";
                                                    }}
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
                                {pet.photoLoading && <span className="sxw-ai is-busy"><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />사진을 살펴보는 중이에요</span>}
                                {pet.photoError && <span className="sxw-err">{pet.photoError}</span>}
                                <span className="sxw-hint">모바일에서는 카메라가 바로 열려요. 네 방향을 다 찍으면 견종 · 체형 · 털색 후보를 더 꼼꼼히 확인해요.</span>
                            </div>
                            <div className="sxw-form">
                                <label className="sxw-f">
                                    <span className="sxw-label">이름</span>
                                    <input className="sxw-in" value={pet.name} onChange={(event) => pet.setName(event.target.value)} maxLength={80} placeholder="예: 몽이" />
                                </label>
                                <label className="sxw-f">
                                    <span className="sxw-label">나이</span>
                                    <input className="sxw-in" value={pet.age} onChange={(event) => pet.setAge(event.target.value)} maxLength={80} placeholder="예: 3살" />
                                    <span className="sxw-hint">사진으로 나이를 정하지 않아요.</span>
                                </label>
                                {pet.analysisMessage && (
                                    <p className="sxw-ai is-wide" data-petlens-signup-draft-restored aria-live="polite">
                                        <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />{pet.analysisMessage}
                                    </p>
                                )}
                                <label className="sxw-f is-wide">
                                    <span className="sxw-label">견종</span>
                                    <select className="sxw-in" value={pet.breedId} onChange={(event) => pet.onBreedId(event.target.value)}>
                                        <option value="">사진 분석 결과 확인 또는 직접 고르기</option>
                                        <option value={CUSTOM_BREED_OPTION}>목록 외 견종 · 믹스견 직접 입력</option>
                                        {PET_BREEDS.map((breed) => (
                                            <option key={breed.id} value={breed.id}>{breed.ko} · {breed.en}</option>
                                        ))}
                                    </select>
                                    <span className="sxw-hint">{pet.breedMessage || "사진 분석 결과는 후보예요. 실제 견종으로 확인해 주세요."}</span>
                                </label>
                                {pet.breedId === CUSTOM_BREED_OPTION && (
                                    <label className="sxw-f is-wide">
                                        <span className="sxw-label">실제 견종 또는 믹스견</span>
                                        <input
                                            className="sxw-in"
                                            value={pet.breedCustom}
                                            onChange={(event) => pet.onBreedCustom(event.target.value)}
                                            maxLength={100}
                                            placeholder="예: 시바견, 골든두들, 믹스견"
                                            data-petlens-custom-breed
                                        />
                                    </label>
                                )}
                                <Pills label="크기" name="sxw-size" value={pet.size} onChange={pet.setSize} options={[["small", "소형"], ["medium", "중형"], ["large", "대형"]]} />
                                <label className="sxw-f">
                                    <span className="sxw-label">현재 체중 (kg)</span>
                                    <span className="sxw-inwrap">
                                        <input
                                            className="sxw-in"
                                            type="number"
                                            min="0.1"
                                            max="120"
                                            step="0.1"
                                            inputMode="decimal"
                                            value={pet.weightKg}
                                            onChange={(event) => pet.setWeightKg(event.target.value)}
                                            placeholder="직접 확인한 체중"
                                        />
                                        {pet.weightEstimate && <em className="is-amber">예상 {pet.weightEstimate.minKg}~{pet.weightEstimate.maxKg}kg</em>}
                                    </span>
                                    <span className="sxw-hint">{pet.weightEstimate ? "사진으로 본 예상 범위예요. 실제 체중을 넣어 주세요." : "사진으로 체중을 재지 않아요."}</span>
                                </label>
                                <Pills label="털 길이" name="sxw-coat" value={pet.coat} onChange={pet.setCoat} options={[["short", "단모"], ["medium", "중모"], ["long", "장모"]]} />
                                <label className="sxw-f">
                                    <span className="sxw-label">털 색상</span>
                                    <span className="sxw-inwrap">
                                        <input className="sxw-in" value={pet.coatColor} onChange={(event) => pet.onCoatColor(event.target.value)} maxLength={80} placeholder="예: 크림, 검정·갈색" />
                                        {pet.coatColorFromAi && <em className="is-amber">사진 후보</em>}
                                    </span>
                                </label>
                                <Pills label="성별" name="sxw-sex" value={pet.sex} onChange={pet.setSex} options={[["female", "암컷"], ["male", "수컷"], ["unknown", "선택 안 함"]]} />
                                <div className="is-wide">
                                    <Pills label="활동량" name="sxw-activity" value={pet.activity} onChange={pet.setActivity} options={[["low", "차분한 편"], ["normal", "보통"], ["high", "활동량 많음"]]} />
                                </div>
                                <div className="sxw-f is-wide">
                                    <span className="sxw-label">관심 케어 <small>여러 개 골라도 돼요</small></span>
                                    <span className="sxw-concerns">
                                        {CONCERN_OPTIONS.map((concern) => {
                                            const on = pet.concerns.includes(concern);
                                            return (
                                                <label key={concern} className={on ? "is-on" : ""}>
                                                    <input type="checkbox" checked={on} onChange={() => pet.toggleConcern(concern)} />
                                                    <i className={on ? "fa-solid fa-heart" : "fa-regular fa-heart"} aria-hidden="true" />
                                                    {concern}
                                                </label>
                                            );
                                        })}
                                    </span>
                                </div>
                            </div>
                            <div className={props.agreePetLens ? "sxw-consent is-on" : "sxw-consent"} data-signup-petlens-optional-consent>
                                <label>
                                    <SxCheck checked={props.agreePetLens} onChange={props.setAgreePetLens} tone="mint" />
                                    <span>
                                        <span className="sxw-opt">선택</span> 반려동물 정보(사진 · 견종 · 체중 등) 수집·이용에 동의해요
                                        <small>맞춤 추천 · 서비스 개선에만 써요. 동의하지 않으면 우리 아이 정보는 저장하지 않아요.</small>
                                    </span>
                                </label>
                                <button type="button" className="sxw-view" onClick={() => setDoc("petlens")}>보기 <i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>
                            </div>
                        </div>
                    )}
                </section>

                <section className="sxw-card sxw-final" aria-labelledby="sxw-final-title">
                    <h2 id="sxw-final-title" className="sxw-h">
                        <span aria-hidden="true"><i className="fa-solid fa-shield-heart" /></span>가입 전 마지막 확인
                    </h2>
                    <div className="sxw-summary">
                        <span className="sxw-av" aria-hidden="true">{(props.name.trim() || "댕").slice(0, 1)}</span>
                        <span>
                            <b>{props.name.trim() || "댕다방 회원"}</b>
                            <small>{props.email.trim()}</small>
                        </span>
                        <span className="sxw-summary-chips">
                            <em><i className="fa-solid fa-check" aria-hidden="true" />약관 동의</em>
                            {identityVerified && <em><i className="fa-solid fa-check" aria-hidden="true" />본인인증</em>}
                            {(marketing.email || marketing.sms) && <em><i className="fa-solid fa-check" aria-hidden="true" />마케팅 수신</em>}
                            {choice === "now" && <em data-tone="mint"><i className="fa-solid fa-paw" aria-hidden="true" />{pet.name.trim() || "우리 아이"} 함께 등록</em>}
                        </span>
                        <button type="button" className="sxw-link" onClick={() => go("account")}>수정</button>
                    </div>
                    <div className="sxw-bot">
                        <SignupBotChallenge
                            onTokenChange={props.setBotToken}
                            resetKey={props.botResetKey}
                            title="가입 보안 확인"
                            description="자동 가입을 막기 위한 확인이에요. 확인이 끝나면 가입하기 단추가 켜져요."
                        />
                    </div>

                    {props.errorKind === "email_taken" ? (
                        <div className="sxw-branch" data-tone="pink" role="alert" data-email-branch="taken">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}stickers/my-profile.webp`} alt="" aria-hidden="true" />
                            <div>
                                <p className="sxw-branch-k">이미 가입된 이메일</p>
                                <h3>{maskEmail(props.email.trim())} 계정이 이미 있어요</h3>
                                <p>예전에 가입했다면 로그인해 주세요. 다른 이메일로 새로 가입할 수도 있어요.</p>
                                <span className="sxw-branch-go">
                                    <Link href="/auth/login" className="sxw-pill is-pink">로그인</Link>
                                    <Link href="/forgot-password" className="sxw-pill">비밀번호 찾기</Link>
                                    <button type="button" className="sxw-pill" onClick={() => go("account")}>다른 이메일로 가입</button>
                                </span>
                            </div>
                        </div>
                    ) : props.errorKind === "email_domain" ? (
                        <div className="sxw-branch" data-tone="gray" role="alert" data-email-branch="domain">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}web-cs-mail-256.webp`} alt="" aria-hidden="true" />
                            <div>
                                <p className="sxw-branch-k">가입할 수 없는 이메일</p>
                                <h3>이 이메일 주소로는 가입할 수 없어요</h3>
                                <p>임시 · 일회용 이메일은 받지 않아요. 실제로 쓰는 다른 이메일을 넣어 주세요.</p>
                                <span className="sxw-branch-go">
                                    <button type="button" className="sxw-pill is-pink" onClick={() => go("account")}>이메일 바꾸기</button>
                                </span>
                            </div>
                        </div>
                    ) : props.error ? (
                        <SxNotice tone="rose" icon="fa-circle-exclamation">{props.error}</SxNotice>
                    ) : null}
                    {props.apiReady === false && <SxNotice tone="amber" icon="fa-screwdriver-wrench">지금은 회원가입 준비 중이에요. 잠시 후 다시 이용해 주세요.</SxNotice>}

                    <div className="sxw-foot">
                        <button type="button" className="sxw-prev" onClick={() => go("account")}>
                            <i className="fa-solid fa-chevron-left" aria-hidden="true" />이전
                        </button>
                        <button type="submit" className="sxw-next" disabled={!canSubmit} aria-busy={props.loading} data-signup-submit>
                            {props.loading ? (
                                <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />가입하는 중이에요</>
                            ) : (
                                <>{choice === "now" ? "우리 아이와 함께 가입하기" : "가입하기"}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></>
                            )}
                        </button>
                    </div>
                    {!canSubmit && !props.loading && (
                        <p className="sxw-foot-hint">
                            {!choice ? "위에서 우리 아이 등록을 지금 할지 골라 주세요." : !props.botToken ? "가입 보안 확인을 마치면 가입하기 단추가 켜져요." : "잠시만 기다려 주세요."}
                        </p>
                    )}
                </section>
            </form>
            <SxDocModal kind={doc} onClose={() => setDoc(null)} />
        </div>
    );
}
