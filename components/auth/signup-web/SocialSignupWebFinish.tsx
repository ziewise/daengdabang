/**
 * SocialSignupWebFinish — 웹 간편가입(카카오 · 네이버 · 구글)에서 돌아온 뒤 화면(2026-10-24 2차: 이메일 가입과 같은 틀)
 * ---------------------------------------------------------------------
 * app/auth/social-callback/page.tsx 가 로그인까지 마친 뒤 웹에서만 그림(앱은 기존 이메일 인증 화면 그대로).
 * 틀 · 색 · 모양은 이메일 가입(SignupWebFlow)과 같음 — SxShell(왼쪽 안내판) + SxCard(머리 → 묶음 → 아래 단추 줄).
 *   ④ 정보 확인: 공급자에게 받은 이름 · 이메일 · 연결 표시, ②에서 받은 동의 표시,
 *      이메일을 못 받았으면 "마이페이지에서 이메일 등록 · 인증하면 20C" 안내, (연동되면) 마케팅 수신 동의 · 휴대폰 본인인증
 *   ⑤ 우리 아이: 마이페이지와 같은 등록 창(MemberPetProfileCreateForm — 같은 검사 · 같은 저장) 또는 나중에
 *   ⑥ 가입 완료
 * SocialReturnWebNotice — 돌아왔지만 새 가입이 아닌 경우(동의 취소 · 이미 이메일로 가입 · 실패 · 이미 가입된 간편 계정)
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
    MarketingRow,
    PROVIDER_NAME,
    ProviderMark,
    SignupWebDone,
    socialSteps,
    SxBlock,
    SxCard,
    SxDocModal,
    SxFoot,
    SxHead,
    SxNotice,
    SxShell,
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
    const steps = socialSteps(providerLabel);
    const current: User = user && user.apiAccessToken === member.apiAccessToken ? user : member;
    const noEmail = isPlaceholderEmail(member.email);
    const firstPet = current.pets[0];
    const canGoOn = !features.identity || identityPasses(identity);
    const marketingAny = marketing.email || marketing.sms;

    // 정보 확인 → 우리 아이 : 마케팅 수신 동의를 고른 경우에만 저장(연동됐을 때)
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

    /* ───────── 가입 완료 ───────── */
    if (screen === "done") {
        return (
            <SxShell steps={steps} now={5} route={provider} lead="가입이 모두 끝났어요.">
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
            </SxShell>
        );
    }

    /* ───────── 우리 아이 ───────── */
    if (screen === "pet") {
        return (
            <SxShell steps={steps} now={4} route={provider} lead="우리 아이를 함께 등록하면 꼭 맞는 상품을 먼저 보여 드려요.">
                <SxCard labelledBy="sxw-spet-title" screen="social-pet">
                    <SxHead
                        id="sxw-spet-title"
                        art="lab-dog-256.webp"
                        kicker="STEP 5 · MY DOG"
                        title="우리 아이도 함께 등록할까요?"
                        sub="이름 · 견종만 있어도 등록할 수 있어요. 지금 안 해도 돼요."
                    />
                    {current.pets.length > 0 && (
                        <SxBlock icon="fa-paw" title="등록한 아이">
                            <ul className="sxw-petlist">
                                {current.pets.map((pet) => (
                                    <li key={pet.apiProfileId || pet.name}>
                                        <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                        <b>{pet.name}</b>
                                        {pet.breed && <small>{pet.breed}</small>}
                                    </li>
                                ))}
                            </ul>
                        </SxBlock>
                    )}
                    <div className="sxw-petcreate">
                        <div className="sxw-petcreate-art" aria-hidden="true">
                            {(["front", "left", "right", "back"] as const).map((view) => (
                                // eslint-disable-next-line @next/next/no-img-element -- 3D 그림
                                <img key={view} src={`/images/ui/mypet-view-${view}-160.webp`} alt="" />
                            ))}
                        </div>
                        <p>사진 네 방향 · 이름 · 견종 · 크기 · 체중을 등록 창에서 넣어요. 마이페이지와 같은 창이에요.</p>
                        <MemberPetProfileCreateForm />
                    </div>
                    <SxFoot onPrev={() => setScreen("check")}>
                        <button type="button" className={firstPet ? "sxw-next" : "sxw-next is-soft"} onClick={() => setScreen("done")} data-signup-next="social-pet">
                            {firstPet ? "다음 · 가입 완료" : "나중에 할게요"}
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </button>
                    </SxFoot>
                </SxCard>
            </SxShell>
        );
    }

    /* ───────── 정보 확인 ───────── */
    return (
        <SxShell steps={steps} now={3} route={provider} lead={`${providerLabel}에서 받은 정보를 확인해 주세요.`}>
            <SxCard labelledBy="sxw-check-title" screen="social-check">
                <SxHead
                    id="sxw-check-title"
                    art="policy-info-192.webp"
                    kicker="STEP 4 · CHECK"
                    title="거의 다 됐어요!"
                    sub={`${providerLabel} 계정이 연결됐어요. 받은 정보가 맞는지 확인해 주세요.`}
                />
                <div className="sxw-got" data-provider={provider}>
                    <span className="sxw-av" aria-hidden="true">{(member.name || "댕").slice(0, 1)}</span>
                    <span className="sxw-got-who">
                        <b>{member.name}</b>
                        <small>{noEmail ? `${providerLabel}에서 이메일을 받지 못했어요` : maskEmail(member.email)}</small>
                    </span>
                    <em><ProviderMark provider={provider} />{providerLabel} 연결됨</em>
                </div>

                <SxBlock icon="fa-list-check" title="동의한 항목">
                    <span className="sxw-agreed">
                        <span><i className="fa-solid fa-check" aria-hidden="true" />만 14세 이상</span>
                        <span><i className="fa-solid fa-check" aria-hidden="true" />이용약관</span>
                        <span><i className="fa-solid fa-check" aria-hidden="true" />개인정보 수집·이용</span>
                        <span><i className="fa-solid fa-check" aria-hidden="true" />가입 보안 확인</span>
                    </span>
                </SxBlock>

                {noEmail && (
                    <SxNotice tone="lav" icon="fa-envelope-open-text" title="이메일은 마이페이지에서 등록해 주세요">
                        주문 · 배송 안내를 받으려면 실제로 쓰는 이메일이 필요해요. 가입 뒤 마이페이지 코인 탭에서 이메일을 등록 · 인증하면 20C도 받아요.
                    </SxNotice>
                )}

                {features.marketing && (
                    <SxBlock icon="fa-bullhorn" title="선택 동의">
                        <div className="sxw-terms">
                            <ul className="is-flat">
                                <MarketingRow value={marketing} onChange={setMarketing} onOpenDoc={() => setDoc("marketing")} />
                            </ul>
                        </div>
                    </SxBlock>
                )}

                {features.identity && (
                    <SxBlock icon="fa-mobile-screen-button" title="휴대폰 본인인증">
                        <IdentityPanel
                            state={identity}
                            onStart={() => {
                                setIdentity({ phase: "busy" });
                                void startIdentityVerification().then((result) => setIdentity({ phase: "result", result }));
                            }}
                            onRestart={() => setIdentity({ phase: "idle" })}
                        />
                    </SxBlock>
                )}

                <SxFoot>
                    <button type="button" className="sxw-next" disabled={!canGoOn || saving} onClick={() => void toPet()} data-signup-next="social-check">
                        {saving ? "저장하는 중이에요" : features.identity && !canGoOn ? "인증을 마치면 다음으로" : "맞아요 · 다음"}
                        <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                    </button>
                </SxFoot>
            </SxCard>
            <SxDocModal kind={doc} onClose={() => setDoc(null)} />
        </SxShell>
    );
}

/** 간편가입에서 돌아왔는데 새 가입이 아닌 경우 — 같은 틀(안내판 + 카드) */
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
        title: "간편 가입을 마치지 못했어요",
        text: message || "간편 로그인 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
    const steps = socialSteps(providerLabel);

    return (
        <SxShell steps={steps} now={kind === "existing" ? 5 : 2} route={provider || undefined} lead={kind === "existing" ? "다시 만나서 반가워요." : "간편 가입 결과를 알려 드려요."}>
            <SxCard labelledBy="sxw-return-title" className={`sxw-return is-${content.tone}`} screen={`social-${kind}`}>
                <span className="sxw-return-art" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`/images/ui/${content.art}`} alt="" />
                </span>
                <span className="sxw-kicker">{content.kicker}</span>
                <h2 id="sxw-return-title">{content.title}</h2>
                <p>{content.text}</p>
                <div className="sxw-return-go">
                    {kind === "existing" && (
                        <button type="button" className="sxw-next" onClick={onContinue}>계속하기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
                    )}
                    {kind === "cancelled" && (
                        <>
                            <Link href="/" className="sxw-prev">홈으로</Link>
                            <Link href="/auth/signup" className="sxw-next">다시 가입하기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                        </>
                    )}
                    {kind === "email_exists" && (
                        <>
                            <Link href="/forgot-password" className="sxw-prev">비밀번호 찾기</Link>
                            <Link href="/auth/login" className="sxw-next">그 계정으로 로그인<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                        </>
                    )}
                    {(kind === "failed" || kind === "new") && (
                        <>
                            <Link href="/auth/login" className="sxw-prev">로그인</Link>
                            <Link href="/auth/signup" className="sxw-next">가입 다시 하기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                        </>
                    )}
                </div>
            </SxCard>
        </SxShell>
    );
}
