/**
 * SocialSignupWebFinish — 웹 간편가입(카카오 · 네이버 · 구글)에서 돌아온 뒤 화면(2026-10-24)
 * ---------------------------------------------------------------------
 * app/auth/social-callback/page.tsx 가 로그인까지 마친 뒤 웹에서만 그림(앱은 기존 이메일 인증 화면 그대로).
 *   ③ 정보 확인: 공급자에게 받은 이름 · 이메일 · 연결 표시, 1단계에서 받은 필수 동의 표시,
 *      이메일을 못 받았으면 "마이페이지에서 실제 이메일 등록 · 인증하면 20C" 안내,
 *      (연동되면) 마케팅 수신 동의 · 휴대폰 본인인증
 *   ④ 우리 아이: 마이페이지와 같은 등록 창(MemberPetProfileCreateForm — 같은 검사 · 같은 저장) 또는 나중에
 *   완료: 축하 · 20C 안내 · 다음에 할 일
 * SocialReturnWebNotice — 돌아왔지만 가입이 안 된 갈림길(동의 취소 · 이미 이메일로 가입 · 실패) · 이미 가입된 간편 계정(로그인됨)
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import MemberPetProfileCreateForm from "@/components/mypage/MemberPetProfileCreateForm";
import { clearSignupEmailResume } from "@/lib/signup-email-verification";
import {
    isPlaceholderEmail,
    maskEmail,
    readSignupFlowFeatures,
    saveMarketingConsent,
    startIdentityVerification,
    type MarketingChoice,
    type SocialReturnKind,
} from "@/lib/signup-flow";
import { useAuth, type User } from "@/lib/store";
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
    UI,
    useScrollTopOn,
    type IdentityState,
    type SxDocKind,
} from "@/components/auth/signup-web/SignupWebParts";

type Screen = "check" | "pet" | "done";

export default function SocialSignupWebFinish({ member, provider, onFinish }: { member: User; provider: string; onFinish: () => void }) {
    const { user } = useAuth();
    const [features] = useState(readSignupFlowFeatures);
    const [screen, setScreen] = useState<Screen>("check");
    const [marketing, setMarketing] = useState<MarketingChoice>({ email: false, sms: false });
    const [marketingProcessedAt, setMarketingProcessedAt] = useState<string | null>(null);
    const [identity, setIdentity] = useState<IdentityState>({ phase: "idle" });
    const [saving, setSaving] = useState(false);
    const [doc, setDoc] = useState<SxDocKind | null>(null);
    useScrollTopOn(screen);

    const providerLabel = PROVIDER_NAME[provider] || "간편";
    const labels = ["약관 동의", `${providerLabel} 로그인`, "정보 확인", "우리 아이", "완료"];
    const current: User = user && user.apiAccessToken === member.apiAccessToken ? user : member;
    const noEmail = isPlaceholderEmail(member.email);
    const firstPet = current.pets[0];
    const canGoOn = !features.identity || identityPasses(identity);
    const marketingAny = marketing.email || marketing.sms;

    // ③ → ④ : 마케팅 수신 동의를 고른 경우에만 저장(연동됐을 때)
    const toPet = async () => {
        if (!canGoOn) return;
        if (features.marketing && marketingAny && !marketingProcessedAt) {
            setSaving(true);
            const processedAt = await saveMarketingConsent(member.apiAccessToken, marketing);
            setSaving(false);
            if (processedAt) setMarketingProcessedAt(processedAt);
        }
        setScreen("pet");
    };

    if (screen === "done") {
        return (
            <div className="sxw-wrap" data-signup-screen="social-done">
                <SxTop compact lead="가입이 모두 끝났어요." />
                <SxSteps labels={labels} now={4} />
                <SignupWebDone
                    name={current.name}
                    pet={firstPet}
                    providerLabel={providerLabel}
                    emailNeedsSetup={noEmail}
                    marketing={marketingProcessedAt ? { choice: marketing, processedAt: marketingProcessedAt } : null}
                    finishLabel="시작하기"
                    onFinish={onFinish}
                    onLeave={clearSignupEmailResume}
                />
            </div>
        );
    }

    if (screen === "pet") {
        return (
            <div className="sxw-wrap" data-signup-screen="social-pet">
                <SxTop compact lead="우리 아이를 함께 등록하면 꼭 맞는 상품을 먼저 보여 드려요." />
                <SxSteps labels={labels} now={3} />
                <section className="sxw-card" aria-labelledby="sxw-spet-title">
                    <SxHead
                        art="lab-dog-256.webp"
                        kicker="STEP 4 · MY DOG"
                        title={<span id="sxw-spet-title">우리 아이도 함께 등록할까요?</span>}
                        sub="이름 · 견종만 있어도 등록할 수 있어요. 사진을 넣으면 펫렌즈가 같은 아이를 기준으로 분석해요."
                    />
                    {current.pets.length > 0 && (
                        <ul className="sxw-agreed" aria-label="등록한 아이">
                            {current.pets.map((pet) => (
                                <li key={pet.apiProfileId || pet.name} style={{ listStyle: "none" }}>
                                    <span><i className="fa-solid fa-paw" aria-hidden="true" />{pet.name}{pet.breed ? ` · ${pet.breed}` : ""}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="sxw-petcreate">
                        <MemberPetProfileCreateForm />
                    </div>
                    <div className="sxw-foot">
                        <button type="button" className="sxw-prev" onClick={() => setScreen("check")}>
                            <i className="fa-solid fa-chevron-left" aria-hidden="true" />이전
                        </button>
                        <button type="button" className={firstPet ? "sxw-next" : "sxw-next is-soft"} onClick={() => setScreen("done")} data-signup-next="social-pet">
                            {firstPet ? "다음 · 가입 완료" : "나중에 할게요"}
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="sxw-wrap" data-signup-screen="social-check">
            <SxTop compact lead={`${providerLabel}에서 받은 정보를 확인해 주세요.`} />
            <SxSteps labels={labels} now={2} />
            <section className="sxw-card" aria-labelledby="sxw-check-title">
                <SxHead
                    art="policy-info-192.webp"
                    kicker="STEP 3 · CHECK"
                    title={<span id="sxw-check-title">거의 다 됐어요!</span>}
                    sub={`${providerLabel} 계정이 연결됐어요. 받은 정보가 맞는지 확인해 주세요.`}
                />
                <div className="sxw-got" data-provider={provider}>
                    <span className="sxw-av" aria-hidden="true">{(member.name || "댕").slice(0, 1)}</span>
                    <span>
                        <b>{member.name}</b>
                        <small>{noEmail ? `${providerLabel}에서 이메일을 받지 못했어요` : maskEmail(member.email)}</small>
                    </span>
                    <em><ProviderMark provider={provider} /> {providerLabel} 연결됨</em>
                </div>

                <div className="sxw-sec">
                    <h3><i className="fa-solid fa-list-check" aria-hidden="true" />동의한 항목</h3>
                    <span className="sxw-agreed">
                        <span><i className="fa-solid fa-check" aria-hidden="true" />만 14세 이상</span>
                        <span><i className="fa-solid fa-check" aria-hidden="true" />이용약관</span>
                        <span><i className="fa-solid fa-check" aria-hidden="true" />개인정보 수집·이용</span>
                        <span><i className="fa-solid fa-check" aria-hidden="true" />가입 보안 확인</span>
                    </span>
                </div>

                {noEmail && (
                    <SxNotice tone="lav" icon="fa-envelope-open-text" title="이메일은 마이페이지에서 등록해 주세요">
                        주문 · 배송 안내를 받으려면 실제로 쓰는 이메일이 필요해요. 가입을 마친 뒤 마이페이지 코인 탭에서 이메일을 등록 · 인증하면 20C도 받아요.
                    </SxNotice>
                )}

                {features.marketing && (
                    <div className="sxw-sec">
                        <h3><i className="fa-solid fa-bullhorn" aria-hidden="true" />선택 동의</h3>
                        <div className="sxw-terms">
                            <ul style={{ marginTop: 0 }}>
                                <li className={marketingAny ? "is-on sxw-mkt" : "sxw-mkt"}>
                                    <label>
                                        <SxCheck checked={marketingAny} onChange={(checked) => setMarketing({ email: checked, sms: checked })} />
                                        <span className="sxw-opt">선택</span>
                                        <span className="sxw-terms-t">마케팅 정보 수신 동의</span>
                                    </label>
                                    <button type="button" className="sxw-view" onClick={() => setDoc("marketing")}>보기 <i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>
                                    <span className="sxw-channels" role="group" aria-label="받을 방법">
                                        {([["email", "이메일", "fa-envelope"], ["sms", "문자(SMS)", "fa-comment-sms"]] as const).map(([key, label, icon]) => (
                                            <label key={key} className={marketing[key] ? "is-on" : ""}>
                                                <input type="checkbox" checked={marketing[key]} onChange={(event) => setMarketing({ ...marketing, [key]: event.target.checked })} />
                                                <i className={`fa-solid ${marketing[key] ? "fa-circle-check" : icon}`} aria-hidden="true" />
                                                {label}
                                            </label>
                                        ))}
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                {features.identity && (
                    <div className="sxw-sec">
                        <h3><i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />휴대폰 본인인증</h3>
                        <IdentityPanel
                            state={identity}
                            onStart={() => {
                                setIdentity({ phase: "busy" });
                                void startIdentityVerification().then((result) => setIdentity({ phase: "result", result }));
                            }}
                            onRestart={() => setIdentity({ phase: "idle" })}
                        />
                    </div>
                )}

                <div className="sxw-foot">
                    <button type="button" className="sxw-next" disabled={!canGoOn || saving} onClick={() => void toPet()} data-signup-next="social-check">
                        {saving ? "저장하는 중이에요" : features.identity && !canGoOn ? "인증을 마치면 다음으로" : "맞아요 · 우리 아이 등록"}
                        <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                    </button>
                </div>
            </section>
            <SxDocModal kind={doc} onClose={() => setDoc(null)} />
        </div>
    );
}

/** 간편가입에서 돌아왔는데 새 가입이 아닌 경우 */
export function SocialReturnWebNotice({ kind, provider, message, onContinue }: { kind: SocialReturnKind; provider: string; message?: string; onContinue?: () => void }) {
    const providerLabel = PROVIDER_NAME[provider] || "간편";
    const content = kind === "existing" ? {
        art: "header-login-128.webp", tone: "mint", kicker: "WELCOME BACK",
        title: `이미 가입된 ${providerLabel} 계정이에요`,
        text: "새로 가입하지 않고 그 계정으로 로그인했어요. 하던 쇼핑을 이어서 할 수 있어요.",
    } : kind === "cancelled" ? {
        art: "header-login-128.webp", tone: "amber", kicker: "CANCELLED",
        title: `${providerLabel} 가입을 취소했어요`,
        text: `${providerLabel} 화면에서 로그인이나 정보 제공 동의를 마치지 않아 가입되지 않았어요.`,
    } : kind === "email_exists" ? {
        art: "stickers/my-profile.webp", tone: "pink", kicker: "ALREADY JOINED",
        title: "같은 이메일로 가입한 계정이 있어요",
        text: "한 사람이 계정을 두 개 만들지 않도록, 예전에 가입한 계정으로 로그인해 주세요.",
    } : {
        art: "policy-info-192.webp", tone: "rose", kicker: "TRY AGAIN",
        title: "간편가입을 마치지 못했어요",
        text: message || "간편로그인 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };

    return (
        <div className="sxw-wrap" data-signup-screen={`social-${kind}`}>
            <SxTop compact lead={kind === "existing" ? "다시 만나서 반가워요." : "간편가입 결과를 알려 드려요."} />
            <section className={`sxw-card sxw-return is-${content.tone}`} aria-labelledby="sxw-return-title">
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img src={`${UI}${content.art}`} alt="" aria-hidden="true" />
                <p className="sxw-kicker">{content.kicker}</p>
                <h2 id="sxw-return-title">{content.title}</h2>
                <p>{content.text}</p>
                <div className="sxw-return-go">
                    {kind === "existing" && (
                        <button type="button" className="sxw-next" onClick={onContinue}>계속하기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
                    )}
                    {kind === "cancelled" && (
                        <>
                            <Link href="/auth/signup" className="sxw-next">다시 가입하기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                            <Link href="/" className="sxw-prev">홈으로</Link>
                        </>
                    )}
                    {kind === "email_exists" && (
                        <>
                            <Link href="/auth/login" className="sxw-next">그 계정으로 로그인<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                            <Link href="/forgot-password" className="sxw-prev">비밀번호 찾기</Link>
                        </>
                    )}
                    {(kind === "failed" || kind === "new") && (
                        <>
                            <Link href="/auth/signup" className="sxw-next">가입 다시 하기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                            <Link href="/auth/login" className="sxw-prev">로그인</Link>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
