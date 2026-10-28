"use client";

/**
 * 스티커북 시안 — 앱 회원가입(/app/sticker/signup) · 로컬 시안 전용, 배포 X
 * ---------------------------------------------------------------------
 * 앱 안의 회원가입은 모두 이 화면으로 온다(앱 틀이 웹 가입 링크 · 주소를 이리로 바꿔 보냄). 웹 가입 화면(app/auth/signup)은 그대로.
 * 가입 기능은 웹 가입 화면과 같은 공용 함수 · 부품을 그대로 쓴다(흐름 · 검사 · 문구 동일) — 화면 모양과 나눔만 앱용.
 *  - 약관 · 개인정보 문구: lib/signup-agreements · 봇 방지: SignupBotChallenge · 이메일 인증: SignupEmailVerification
 *  - 간편 가입: SocialAuthButtons(mode=signup, 필수 동의 + 보안 확인을 통과해야 열림)
 *  - 이메일 가입: signupCustomer → (이메일 확인이 필요한 계정이면) 계정 활성화 인증 → 가입 비밀번호로 로그인 → 반려견 저장
 *                                → (바로 쓸 수 있는 계정이면) 로그인 → 반려견 저장 → 신규 가입 혜택 20C 이메일 인증(건너뛰기 가능)
 *  - 반려견(선택): 4방향 사진 → 사진 분석 후보(견종 · 크기 · 모질 · 털색 · 예상 체중) — 후보는 언제나 회원이 확인 · 수정
 *  - 펫렌즈에서 넘어온 임시 저장(초안) · 이메일 인증 중 다시 들어온 경우 이어서 진행
 * 화면(스티커북 다이어리) — 2026-10-26 사용자: 웹 단계별 가입(components/auth/signup-web/SignupWebFlow)과 같은 흐름 · 갈림길로
 *   이메일 가입: ① 가입 방법 → ② 약관(만 14세 · 이용약관 · 개인정보 + 전체 동의, 항목마다 내용 속지) → ③ 계정 정보(비밀번호 확인 · 강도)
 *               → ④ 우리 아이(지금/나중에 고르기 + 마지막 확인 · 보안 확인) → 가입 완료 화면(가입 혜택 · 우리 아이 · 이어서 해 보세요)
 *   간편 가입:   ① 가입 방법 → ② 약관 + 보안 확인 → ③ 공급자 화면(돌아오면 /auth/social-callback 의 앱 정보 확인 · 우리 아이 · 완료)
 *   이메일 확인 후 계정을 여는 방식(activation)이면 웹과 같이 확인 화면 → 비밀번호 로그인. 20C 이메일 인증은 완료 화면에서 바로(앱) 또는 마이페이지.
 *   서버가 아직 없는 기능(이메일 중복 확인 · 마케팅 수신 동의 저장)은 웹과 같은 스위치(lib/signup-flow)가 켜질 때만 나타남. 휴대폰 본인인증은 스위치 · 서버 연결 후 추가.
 *   모양: 동의 = 손글씨 체크 스티커 · 내용은 아래 속지 · 입력칸 = 라벨 스티커 · 사진 = 점선 폴라로이드 4칸 · 고르기 = 오린 카드 · 버튼 = 자수 와펜.
 */

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { appLoginHref } from "@/components/app-shell/appTabs";
import SignupBotChallenge, { signupTurnstileSiteKey } from "@/components/auth/SignupBotChallenge";
import SignupEmailVerification, { type SignupEmailVerificationResult } from "@/components/auth/SignupEmailVerification";
import { beginSocialAuth, useSocialProviderStatus } from "@/components/auth/SocialAuthButtons";
import { useDdbApiReady } from "@/hooks/useDdbApiReady";
import { customerApiErrorMessage, DdbApiError, ddbApiReady, loadPetProfilesSmart, loginCustomer, savePetProfileSmart, setCustomerToken, signupCustomer, type SocialProvider } from "@/lib/customer-api";
import { analyzePetLensSmart, getPetLensStorefrontCandidates, getPetLensWeightEstimate, type PetLensWeightEstimate } from "@/lib/daengdabang-llm";
import { safeInternalRedirect } from "@/lib/internal-redirect";
import { getPetBreedVisual, isPetBreedId, PET_BREEDS, resolvePetBreedIdExact } from "@/lib/pet-companion-breeds";
import { resizePetPhoto } from "@/lib/pet-photo";
import { petLensPostAuthDestination } from "@/lib/petlens-routing";
import { clearPetLensSignupDraft, loadPetLensSignupDraft, savePetLensSignupDraft } from "@/lib/petlens-signup-draft";
import { SIGNUP_PETLENS_PRIVACY_CONSENT, SIGNUP_PRIVACY_VERSION, SIGNUP_REQUIRED_PRIVACY_CONSENT, SIGNUP_TERMS_AGREEMENT, SIGNUP_TERMS_VERSION } from "@/lib/signup-agreements";
import { checkSignupEmail, maskEmail, readSignupFlowFeatures, saveMarketingConsent, startIdentityVerification, type EmailAvailability, type IdentityResult, type MarketingChoice } from "@/lib/signup-flow";
import { clearSignupActivationResume, clearSignupEmailResume, loadSignupActivationResume, loadSignupEmailResume, saveSignupActivationResume, saveSignupEmailResume } from "@/lib/signup-email-verification";
import { useAuth, type PetProfile, type User } from "@/lib/store";
import { trackSignupCompleted } from "@/lib/storefront-analytics";
import { haptic } from "../gestures";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { HC_CSS } from "../shared";
import { SHOW_PARTS_CSS, Sheet } from "../show-parts";
import { DiaryBody, DiaryTabs, PARTS_CSS } from "../sticker-parts";
import { Patch, STICKER_CSS, Tape } from "../sticker-kit";

const APP_HOME = "/app/home-1/";
/** 가입 선물 코인 — 웹 가입 화면 문구("신규 가입 혜택 · 20C", app/auth/signup/page.tsx ~:853 · lib/signup-agreements.ts)와 같은 값 */
const SIGNUP_BONUS_COINS = 20;
/** 이메일 형식 — 웹 가입 이메일 칸(type="email" required)의 브라우저 검사와 같은 규칙(HTML 표준 이메일 형식, 앞뒤 공백 제외) */
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
/* 색인 탭 = 가입 단계(웹 단계별 가입과 같은 순서) — 카페24 글꼴에 동그라미 숫자가 없어 글자만.
   지나온 단계 탭만 눌러 돌아갈 수 있음(앞 단계는 "다음" 버튼의 검사를 거쳐야 함) */
const EMAIL_STEPS = [
    { label: "가입 방법", color: "#ffd6e2" },
    { label: "약관", color: "#fff1b8" },
    { label: "계정", color: "#dcf3e6" },
    { label: "우리 아이", color: "#e8ddff" },
    { label: "완료", color: "#ffe7c2" }, // 웹 단계 줄의 "가입 완료"(2026-10-28 사용자 "웹과 똑같이") — 가입을 마쳐야만 켜짐
];
/** 휴대폰 본인인증이 켜졌을 때(웹과 같은 스위치) — 약관 다음에 본인인증 */
const EMAIL_STEPS_WITH_IDENTITY = [{ label: "시작", color: "#ffd6e2" }, EMAIL_STEPS[1], { label: "본인인증", color: "#e3f2fb" }, EMAIL_STEPS[2], EMAIL_STEPS[3], EMAIL_STEPS[4]]; // 6칸 — 첫 칸 이름을 줄이고 좁은 탭으로 한 줄

/* 서버가 아직 없는 가입 기능 스위치(lib/signup-flow) — 화면이 붙은 뒤에 읽음(미리 만든 HTML 은 운영 설정 값 그대로 → 개발 미리보기에서도 화면 어긋남 없음) */
const noopSubscribe = () => () => {};
const featuresKey = () => { const f = readSignupFlowFeatures(); return `${f.identity ? 1 : 0}${f.emailCheck ? 1 : 0}${f.marketing ? 1 : 0}`; };
const serverFeaturesKey = () => `${process.env.NEXT_PUBLIC_SIGNUP_IDENTITY === "1" ? 1 : 0}${process.env.NEXT_PUBLIC_SIGNUP_EMAIL_CHECK === "1" ? 1 : 0}${process.env.NEXT_PUBLIC_SIGNUP_MARKETING === "1" ? 1 : 0}`;
function useSignupFeatures() {
    const key = useSyncExternalStore(noopSubscribe, featuresKey, serverFeaturesKey);
    return { identity: key[0] === "1", emailCheck: key[1] === "1", marketing: key[2] === "1" };
}
type SignupScreen = "method" | "terms" | "identity" | "account" | "pet";
/** 간편 가입 공급자 — 웹과 같은 이름 · 받는 정보 안내 */
const SOCIAL: Array<{ id: SocialProvider; label: string; gives: string; bg: string; ink: string; mark: string }> = [
    { id: "kakao", label: "카카오", gives: "프로필 이름 · 이메일(카카오 화면에서 동의한 항목만)", bg: "#fee500", ink: "#3c1e1e", mark: "fa-comment" },
    { id: "naver", label: "네이버", gives: "이름 · 이메일 · 휴대폰 번호(네이버 화면에서 동의한 항목만)", bg: "#03c75a", ink: "#fff", mark: "N" },
    { id: "google", label: "구글", gives: "이름 · 이메일 · 프로필 사진", bg: "#fff", ink: "#4285f4", mark: "G" },
];
const socialStepTabs = (label: string) => [
    { label: "가입 방법", color: "#ffd6e2" },
    { label: "약관", color: "#fff1b8" },
    { label: `${label} 로그인`, color: "#dcf3e6" },
];
/** 약관 · 동의 내용 속지 종류(웹 SxDocModal 과 같은 다섯 가지) */
type DocKind = "age14" | "terms" | "privacy" | "marketing" | "petlens";
const DOC_TITLE: Record<DocKind, string> = {
    age14: "만 14세 이상 확인",
    terms: "이용약관 동의",
    privacy: "개인정보 수집·이용 동의",
    marketing: "마케팅 정보 수신 동의",
    petlens: "반려동물 정보 수집·이용 동의",
};
/** 비밀번호 강도 0~3 — 웹 가입 계정 단계와 같은 규칙 */
function passwordScore(value: string) {
    if (value.length < 8) return value ? 1 : 0;
    let score = 1;
    if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) score += 1;
    return score;
}

/* ───────── 아래는 웹 가입 화면(app/auth/signup/page.tsx)과 같은 규칙 · 도우미 ───────── */
const CONCERN_OPTIONS = ["눈 보호", "피부/발바닥 케어", "체중 관리", "산책 안전", "놀이/분리불안"];
const CUSTOM_BREED_OPTION = "__custom";
const passwordUtf8Bytes = (value: string) => new TextEncoder().encode(value).length;
const subscribeToLocation = () => () => {};
const getServerRedirect = () => null;
const getClientRedirect = () => {
    if (typeof window === "undefined") return null;
    return safeInternalRedirect(new URLSearchParams(window.location.search).get("redirect"), window.location.origin);
};
const PET_PHOTO_VIEWS = [
    { id: "front", label: "정면", helper: "얼굴·가슴" },
    { id: "left", label: "왼쪽", helper: "옆선·다리" },
    { id: "right", label: "오른쪽", helper: "반대 옆선" },
    { id: "back", label: "뒷면", helper: "등선·꼬리" },
] as const;
type PetPhotoViewId = typeof PET_PHOTO_VIEWS[number]["id"];
type PetPhotoCapture = { dataUrl: string; imageName: string; file?: File; restored?: boolean };
type PetPhotoCaptures = Partial<Record<PetPhotoViewId, PetPhotoCapture>>;
type PendingBonusVerification = { kind: "bonus"; member: User; destination: string };
type PendingAccountActivation = {
    kind: "activation"; apiUserId: number; name: string; email: string; destination: string; pets: PetProfile[];
    verified: boolean; activationToken?: string; activationExpiresAt?: number;
    /** "우리 아이는 나중에 등록"으로 가입 — 펫렌즈 임시 저장(초안)을 지우지 않고 남겨 둠(앱 전용 버튼) */
    keepPetLensDraft?: boolean;
};
type PendingVerification = PendingBonusVerification | PendingAccountActivation;
const PET_PHOTO_VIEW_LABELS = PET_PHOTO_VIEWS.reduce((acc, view) => { acc[view.id] = view.label; return acc; }, {} as Record<PetPhotoViewId, string>);

function petLensCandidateMessage(rawAnalysis: unknown) {
    const candidates = getPetLensStorefrontCandidates(rawAnalysis);
    const labels = [candidates.size ? "크기" : "", candidates.coat ? "모질" : "", candidates.coatColor ? "털 색상" : "", candidates.weightEstimate ? "예상 체중 범위" : ""].filter(Boolean);
    if (labels.length === 0) return "신뢰 가능한 자동 후보를 확정하지 못해 기존 입력값을 유지했습니다. 실제 정보를 직접 확인해 주세요.";
    return `사진 분석 후보(${labels.join("·")})를 불러왔습니다. 가입 전에 실제 정보와 맞는지 확인해 주세요.`;
}
function petPhotoViewEntries(views: PetPhotoCaptures): Array<[PetPhotoViewId, PetPhotoCapture]> {
    return PET_PHOTO_VIEWS.map((view): [PetPhotoViewId, PetPhotoCapture | undefined] => [view.id, views[view.id]])
        .filter((entry): entry is [PetPhotoViewId, PetPhotoCapture] => Boolean(entry[1]));
}
const petPhotoViewCount = (views: PetPhotoCaptures) => petPhotoViewEntries(views).length;
function primaryPetPhotoEntry(views: PetPhotoCaptures): [PetPhotoViewId, PetPhotoCapture] | undefined {
    if (views.front) return ["front", views.front];
    return petPhotoViewEntries(views)[0];
}
function petPhotoViewMetadata(views: PetPhotoCaptures) {
    return petPhotoViewEntries(views).map(([viewId, photo]) => ({ viewId, label: PET_PHOTO_VIEW_LABELS[viewId], imageName: photo.imageName, usedForPetLensAnalysis: true }));
}
function loadSignupImage(dataUrl: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("PetLens image could not be loaded."));
        image.src = dataUrl;
    });
}
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error("PetLens contact sheet could not be generated.")); }, type, quality);
    });
}
/* 여러 방향 사진 → 2×2 한 장(분석용) */
async function buildPetLensViewSheet(views: PetPhotoCaptures) {
    const entries = petPhotoViewEntries(views);
    if (entries.length === 0) return undefined;
    if (entries.length === 1 && entries[0][1].file) {
        const [viewId, photo] = entries[0];
        return { file: photo.file, imageName: `${PET_PHOTO_VIEW_LABELS[viewId]}_${photo.imageName}` };
    }
    const cellSize = 480, labelHeight = 48, padding = 18;
    const canvas = document.createElement("canvas");
    canvas.width = cellSize * 2;
    canvas.height = cellSize * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("PetLens contact sheet is not supported.");
    ctx.fillStyle = "#fffaf3";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#e8ddd2";
    ctx.lineWidth = 3;
    ctx.font = "700 28px sans-serif";
    ctx.textBaseline = "middle";
    await Promise.all(entries.map(async ([viewId, photo], index) => {
        const image = await loadSignupImage(photo.dataUrl);
        const x = (index % 2) * cellSize;
        const y = Math.floor(index / 2) * cellSize;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + 6, y + 6, cellSize - 12, cellSize - 12);
        ctx.strokeRect(x + 6, y + 6, cellSize - 12, cellSize - 12);
        ctx.fillStyle = "#2f2926";
        ctx.fillText(PET_PHOTO_VIEW_LABELS[viewId], x + padding, y + labelHeight / 2);
        const drawX = x + padding, drawY = y + labelHeight;
        const drawWidth = cellSize - padding * 2, drawHeight = cellSize - labelHeight - padding;
        const scale = Math.min(drawWidth / image.width, drawHeight / image.height);
        const width = image.width * scale, height = image.height * scale;
        ctx.drawImage(image, drawX + (drawWidth - width) / 2, drawY + (drawHeight - height) / 2, width, height);
    }));
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.88);
    return { file: new File([blob], "daengdabang-petlens-four-view.jpg", { type: "image/jpeg", lastModified: Date.now() }), imageName: "정면-좌-우-뒷면 PetLens 분석 시트.jpg" };
}

/* ───────── 화면 부품(스티커북) ───────── */
/** 손글씨 체크 스티커 동의 줄 */
function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
    return (
        <label className="flex cursor-pointer items-start gap-2.5">
            <input type="checkbox" checked={checked} onChange={(e) => { onChange(e.target.checked); haptic("light"); }} className="peer sr-only" />
            <span aria-hidden="true" className={`su-check mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[7px] ${checked ? "is-on" : ""}`}>
                {checked ? <svg viewBox="0 0 28 28" className="h-5 w-5"><path d="M7 14 L12 19 L23 6" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className="st-check" /></svg> : null}
            </span>
            <span className="ah-display min-w-0 flex-1 text-[14px] leading-snug">{children}</span>
        </label>
    );
}
/** 라벨 스티커 입력칸(왼쪽 색 칸 + 절취선) */
function LabelField({ icon, stub, ink, children, grow = false }: { icon: string; stub: string; ink: string; children: ReactNode; grow?: boolean }) {
    return (
        <label className={`su-label flex h-[50px] items-stretch ${grow ? "min-w-0 flex-1" : ""}`} style={{ ["--stub" as string]: stub, ["--ink" as string]: ink }}>
            <span className="su-stub grid w-11 shrink-0 place-items-center text-[13px]"><i aria-hidden="true" className={`fa-solid ${icon}`} /></span>
            {children}
        </label>
    );
}
/** 작은 이름표 + 입력(우리 아이 쪽) */
function Small({ label, hint, children, wide = false }: { label: string; hint?: ReactNode; children: ReactNode; wide?: boolean }) {
    return (
        <label className={`block ${wide ? "col-span-2" : ""}`}>
            <span className="ah-display mb-1 block text-[12px] text-[#b07a8a]">{label}</span>
            {children}
            {hint ? <span className="ah-light mt-1 block text-[11px] leading-snug" style={{ color: TEXT_SOFT }}>{hint}</span> : null}
        </label>
    );
}
/** 알림 포스트잇 */
export function Note({ tone, children }: { tone: "warn" | "error" | "info"; children: ReactNode }) {
    const c = { warn: ["#fff3a6", "#8f5e12"], error: ["#ffd6e2", "#c4456f"], info: ["#e8ddff", "#563fa8"] }[tone];
    return (
        <p role={tone === "error" ? "alert" : "status"} className="su-note st-postit ah-light relative px-3.5 pb-2.5 pt-3 text-[12px] leading-relaxed" style={{ background: c[0], color: c[1], rotate: "-0.6deg" }}>
            <Tape className="-top-1.5 left-4 h-3 w-9" color="rgba(255,255,255,.75)" style={{ rotate: "-5deg" }} />
            {children}
        </p>
    );
}

export default function StickerSignup() {
    const router = useRouter();
    const { login, updateMemberEmail, user } = useAuth();
    const redirect = useSyncExternalStore(subscribeToLocation, getClientRedirect, getServerRedirect);
    const back = redirect || APP_HOME;
    const [step, setStep] = useState(0);
    // 쪽 넘김 방향 — 0 = 처음 연 쪽(속지 전체가 이미 넘겨지며 나타나므로 단계 내용은 따로 움직이지 않음)
    const [dir, setDir] = useState(0);
    const features = useSignupFeatures(); // 서버가 아직 없는 기능 스위치(본인인증 · 이메일 중복 확인 · 마케팅 동의 저장)
    const goStep = (i: number) => { setDir(i > step ? 1 : -1); setStep(i); window.scrollTo({ top: 0, behavior: "smooth" }); };
    // 단계 이름(웹과 같은 순서) — 본인인증 스위치가 켜지면 약관과 계정 사이에 본인인증. 이름으로 이동(goTo)
    const order: SignupScreen[] = ["method", "terms", ...(features.identity ? ["identity" as const] : []), "account", "pet"];
    const cur: SignupScreen = order[step] ?? "method";
    const goTo = (screen: SignupScreen) => goStep(Math.max(0, order.indexOf(screen)));

    /* 웹 가입 화면과 같은 상태 */
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [petName, setPetName] = useState("");
    const [petAge, setPetAge] = useState("성견");
    const [petSize, setPetSize] = useState<PetProfile["size"]>("medium");
    const [petWeightKg, setPetWeightKg] = useState("");
    const [petWeightEstimate, setPetWeightEstimate] = useState<PetLensWeightEstimate | undefined>();
    const [petSex, setPetSex] = useState<NonNullable<PetProfile["sex"]>>("unknown");
    const [petCoatColor, setPetCoatColor] = useState("");
    const [petCoatColorSource, setPetCoatColorSource] = useState<"" | "ai" | "manual">("");
    const [petCoat, setPetCoat] = useState<PetProfile["coat"]>("medium");
    const [petActivity, setPetActivity] = useState<PetProfile["activity"]>("normal");
    const [petConcerns, setPetConcerns] = useState<string[]>(["일상 케어"]);
    const [petPhotoDataUrl, setPetPhotoDataUrl] = useState<string | undefined>();
    const [petPhotoViews, setPetPhotoViews] = useState<PetPhotoCaptures>({});
    const [petBreedId, setPetBreedId] = useState("");
    const [petBreedCustom, setPetBreedCustom] = useState("");
    const [petBreedSource, setPetBreedSource] = useState<"" | "ai" | "manual">("");
    const [petBreedMessage, setPetBreedMessage] = useState("");
    const [petAnalysisMessage, setPetAnalysisMessage] = useState("");
    const [petRawAnalysis, setPetRawAnalysis] = useState<Record<string, unknown> | undefined>();
    const [photoLoading, setPhotoLoading] = useState(false);
    const [photoError, setPhotoError] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);
    const [activationFinalizing, setActivationFinalizing] = useState(false);
    const [activationLoginError, setActivationLoginError] = useState("");
    const activationFinalizeInFlightRef = useRef(false);
    const petPhotoViewsRef = useRef<PetPhotoCaptures>({});
    const photoCaptureInFlight = useRef(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [agreePrivacy, setAgreePrivacy] = useState(false);
    const [agreePetLensPrivacy, setAgreePetLensPrivacy] = useState(false);
    // 약관 · 동의 내용은 접는 메모 대신 아래 속지(doc)로 봄(2026-10-26)
    const [botToken, setBotToken] = useState("");
    const [botResetKey, setBotResetKey] = useState(0);
    const apiReady = useDdbApiReady();
    const botChallengeConfigured = Boolean(signupTurnstileSiteKey());
    /* 웹 단계별 가입과 같은 값(2026-10-26) — 가입 방법(이메일 · 공급자) · 만 14세 · 마케팅 · 비밀번호 확인 · 우리 아이 지금/나중에 */
    const providers = useSocialProviderStatus(); // 간편 가입 공급자 준비 상태(웹 가입 방법 화면과 같음)
    const [route, setRoute] = useState<"email" | SocialProvider>("email");
    const [age14, setAge14] = useState(false);
    const [marketing, setMarketing] = useState<MarketingChoice>({ email: false, sms: false });
    const [doc, setDoc] = useState<DocKind | null>(null); // 약관 · 동의 내용 속지
    const [password2, setPassword2] = useState("");
    const [tried, setTried] = useState(false); // "다음"을 눌러 본 뒤에만 칸 아래 안내를 보임
    const [petChoice, setPetChoice] = useState<"now" | "later" | null>(null);
    const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | EmailAvailability>("idle");
    const [errorKind, setErrorKind] = useState<"" | "email_taken" | "email_domain">("");
    const [socialError, setSocialError] = useState("");
    const [marketingProcessedAt, setMarketingProcessedAt] = useState<string | null>(null);
    const marketingSavedRef = useRef(false);
    const [verifyOpen, setVerifyOpen] = useState(false); // 가입 완료 화면에서 "이메일 인증하고 20C 받기"를 누름
    // 휴대폰 본인인증(스위치가 켜졌을 때) — 웹과 같은 startIdentityVerification · 같은 통과 조건(identityPasses)
    const [identity, setIdentity] = useState<IdentityState>({ phase: "idle" });
    const identityOk = identityPasses(identity);
    const identityVerified = identity.phase === "result" && identity.result.status === "verified" ? identity.result : null;
    const startIdentity = () => {
        setIdentity({ phase: "busy" });
        void startIdentityVerification().then((result) => {
            setIdentity({ phase: "result", result });
            if (result.status === "verified" && result.name) setName(result.name); // 이름은 본인인증 정보로(웹과 같음)
        });
    };
    const isSocial = route !== "email";
    const socialInfo = SOCIAL.find((item) => item.id === route);
    const requiredConsentsAccepted = age14 && agreeTerms && agreePrivacy;
    const signupSecurityReady = botChallengeConfigured && requiredConsentsAccepted && Boolean(botToken);
    // 펫렌즈에서 넘어온 정보가 있으면 "지금 등록"을 미리 고른 것으로(웹과 같음)
    const petHasData = Boolean(petName.trim() || petPhotoDataUrl || Object.keys(petPhotoViews).length || petBreedId || petBreedCustom.trim());
    const choice = petChoice ?? (petHasData ? "now" : null);

    // 펫렌즈에서 넘어온 반려견 초안 불러오기(웹 가입 화면과 같음)
    useEffect(() => {
        const draft = loadPetLensSignupDraft();
        if (!draft) return;
        const restoreId = window.setTimeout(() => {
            setPetName(draft.name || "우리 아이");
            setPetAge(draft.age || "성견");
            setPetSize(draft.size);
            setPetCoat(draft.coat);
            setPetActivity(draft.activity);
            setPetConcerns(draft.concerns.length > 0 ? draft.concerns : ["일상 케어"]);
            setPetPhotoDataUrl(draft.photoDataUrl);
            if (draft.photoViews?.length) {
                const restored = draft.photoViews.reduce<PetPhotoCaptures>((views, photo) => {
                    views[photo.viewId] = { dataUrl: photo.dataUrl, imageName: photo.imageName, restored: true };
                    return views;
                }, {});
                if (Object.keys(petPhotoViewsRef.current).length === 0) { petPhotoViewsRef.current = restored; setPetPhotoViews(restored); }
            } else if (draft.photoDataUrl) {
                const restored = { front: { dataUrl: draft.photoDataUrl, imageName: "펫렌즈 저장 사진", restored: true } };
                if (Object.keys(petPhotoViewsRef.current).length === 0) { petPhotoViewsRef.current = restored; setPetPhotoViews(restored); }
            }
            setPetRawAnalysis(draft.rawAnalysis);
            if (draft.rawAnalysis?.petLensDraftPhotosDropped === true) setPhotoError("브라우저 저장 공간이 부족해 이전 사진은 옮기지 못했습니다. 네 방향 사진을 다시 등록해 주세요.");
            setPetWeightEstimate(getPetLensWeightEstimate(draft.rawAnalysis));
            setPetSex("unknown");
            if (draft.coatColor) { setPetCoatColor(draft.coatColor); setPetCoatColorSource("ai"); }
            const rawBreedCandidate = (draft.breed || "").trim();
            const candidateId = resolvePetBreedIdExact(rawBreedCandidate, "");
            if (candidateId && isPetBreedId(candidateId)) {
                const candidate = getPetBreedVisual(candidateId);
                setPetBreedId(candidateId); setPetBreedCustom(""); setPetBreedSource("ai");
                setPetBreedMessage(`펫렌즈 견종 후보: ${candidate.ko} · ${candidate.en}. 실제 견종인지 확인하거나 수정해 주세요.`);
            } else if (rawBreedCandidate) {
                setPetBreedId(CUSTOM_BREED_OPTION); setPetBreedCustom(rawBreedCandidate); setPetBreedSource("ai");
                setPetBreedMessage(`펫렌즈 견종 후보: ${rawBreedCandidate}. 120종 캐릭터 목록 밖의 견종 또는 상위 분류이므로 직접 확인해 주세요.`);
            } else {
                setPetBreedMessage("펫렌즈 분석을 불러왔습니다. 실제 견종을 직접 선택해 주세요.");
            }
            setPetAnalysisMessage(petLensCandidateMessage(draft.rawAnalysis));
        }, 0);
        return () => window.clearTimeout(restoreId);
    }, []);

    // 이메일 인증 중이던 가입 이어가기(웹 가입 화면과 같음)
    useEffect(() => {
        if (pendingVerification) return;
        const activationResume = loadSignupActivationResume();
        if (activationResume) {
            const stagedPet = loadPetLensSignupDraft();
            const restoreId = window.setTimeout(() => {
                setName(activationResume.name);
                setEmail(activationResume.email);
                setPendingVerification({
                    kind: "activation", apiUserId: activationResume.apiUserId, name: activationResume.name, email: activationResume.email,
                    destination: activationResume.returnTo, pets: stagedPet ? [stagedPet] : [], verified: activationResume.phase === "verified_login",
                    activationToken: activationResume.activationToken, activationExpiresAt: activationResume.activationExpiresAt,
                });
            }, 0);
            return () => window.clearTimeout(restoreId);
        }
        if (!user?.apiAccessToken) return;
        const resume = loadSignupEmailResume();
        if (resume?.source !== "email") return;
        const restoreId = window.setTimeout(() => setPendingVerification({ kind: "bonus", member: user, destination: resume.returnTo }), 0);
        return () => window.clearTimeout(restoreId);
    }, [pendingVerification, user]);

    const toggleConcern = (concern: string) => {
        haptic("light");
        setPetConcerns((prev) => (prev.includes(concern) ? prev.filter((item) => item !== concern) : [...prev.filter((item) => item !== "일상 케어"), concern]));
    };

    // 사진 한 방향 등록 → (서버가 준비돼 있으면) 여러 방향을 한 장으로 합쳐 분석 → 후보만 채움(회원이 확인)
    const handlePetPhotoView = async (viewId: PetPhotoViewId, file?: File) => {
        if (!file || photoCaptureInFlight.current) return;
        photoCaptureInFlight.current = true;
        setPhotoLoading(true); setPhotoError("");
        setPetBreedId(""); setPetBreedCustom(""); setPetBreedSource(""); setPetBreedMessage(""); setPetAnalysisMessage("");
        setPetRawAnalysis(undefined); setPetWeightEstimate(undefined);
        if (petCoatColorSource === "ai") { setPetCoatColor(""); setPetCoatColorSource(""); }
        try {
            const dataUrl = await resizePetPhoto(file);
            const nextViews: PetPhotoCaptures = { ...petPhotoViewsRef.current, [viewId]: { dataUrl, imageName: file.name, file } };
            petPhotoViewsRef.current = nextViews;
            const primaryEntry = primaryPetPhotoEntry(nextViews);
            const primaryPhoto = primaryEntry?.[1];
            const viewMeta = petPhotoViewMetadata(nextViews);
            const viewCount = petPhotoViewCount(nextViews);
            setPetPhotoViews(nextViews);
            setPetPhotoDataUrl(primaryPhoto?.dataUrl || dataUrl);
            if (!ddbApiReady()) { setPetBreedMessage(`사진 ${viewCount}장을 준비했습니다. 견종을 직접 선택해 주세요.`); return; }
            try {
                const analysisImage = await buildPetLensViewSheet(nextViews);
                if (!analysisImage) return;
                const analysis = await analyzePetLensSmart({
                    name: petName, age: petAge, size: petSize, coat: petCoat, activity: petActivity, concerns: petConcerns,
                    imageName: analysisImage.imageName, photoDataUrl: primaryPhoto?.dataUrl || dataUrl, photoViews: viewMeta,
                }, analysisImage.file);
                const rawAnalysis = {
                    ...(analysis.profile.rawAnalysis || {}),
                    petPhotoViews: viewMeta, petPhotoViewCount: viewMeta.length, petPhotoPrimaryView: primaryEntry?.[0] || viewId,
                    multiViewAnalysis: { enabled: viewMeta.length > 1, source: viewMeta.length > 1 ? "signup_multiview_contact_sheet" : "signup_single_photo", imageName: analysisImage.imageName, requiresUserConfirmation: true },
                };
                setPetRawAnalysis(rawAnalysis);
                setPetSize(analysis.profile.size);
                setPetCoat(analysis.profile.coat);
                setPetWeightEstimate(getPetLensWeightEstimate(rawAnalysis));
                if (analysis.profile.coatColor) { setPetCoatColor(analysis.profile.coatColor); setPetCoatColorSource("ai"); }
                setPetAnalysisMessage(`${petLensCandidateMessage(rawAnalysis)}${viewMeta.length > 1 ? " 여러 방향 사진을 함께 비교해 확인했습니다." : ""}`);
                const rawBreedCandidate = (analysis.profile.breed || "").trim();
                const candidateId = resolvePetBreedIdExact(rawBreedCandidate, "");
                if (candidateId && isPetBreedId(candidateId)) {
                    const candidate = getPetBreedVisual(candidateId);
                    setPetBreedId(candidateId); setPetBreedCustom(""); setPetBreedSource("ai");
                    setPetBreedMessage(`사진 분석 후보: ${candidate.ko} · ${candidate.en}. 아래에서 꼭 확인하거나 수정해 주세요.`);
                } else if (rawBreedCandidate) {
                    setPetBreedId(CUSTOM_BREED_OPTION); setPetBreedCustom(rawBreedCandidate); setPetBreedSource("ai");
                    setPetBreedMessage(`사진 분석 후보: ${rawBreedCandidate}. 목록 외 견종/믹스견 입력값으로 가져왔으니 꼭 확인해 주세요.`);
                } else {
                    setPetBreedMessage("사진 분석 결과를 확정하지 못했습니다. 아래 120종 중 견종을 직접 선택해 주세요.");
                }
            } catch {
                setPetBreedMessage(`사진 ${viewCount}장은 준비되었지만 견종 분석을 확정하지 못했습니다. 아래에서 직접 선택해 주세요.`);
            }
        } catch {
            setPhotoError("사진을 불러오지 못했습니다. 다른 이미지를 선택해 주세요.");
        } finally {
            photoCaptureInFlight.current = false;
            setPhotoLoading(false);
        }
    };

    /* 단계 넘기기 검사 — 웹 단계별 가입과 같은 조건 */
    // 약관: 필수 3가지(만 14세 · 이용약관 · 개인정보)
    const nextFromTerms = () => {
        setError(""); setTried(true);
        if (!requiredConsentsAccepted) { haptic("light"); return; }
        setTried(false);
        goTo(features.identity ? "identity" : "account");
    };
    // 간편 가입: 필수 동의 + 보안 확인 → 공급자 화면으로(웹 beginSocialAuth 그대로)
    const continueSocial = () => {
        if (!isSocial) return;
        setSocialError("");
        if (!signupSecurityReady) { setTried(true); haptic("light"); return; }
        const started = beginSocialAuth(route, "signup", back, { botToken, termsVersion: SIGNUP_TERMS_VERSION, privacyVersion: SIGNUP_PRIVACY_VERSION });
        if (!started) setSocialError("간편 가입을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
    };
    /* 계정 칸 검사 — 웹 계정 단계와 같은 조건(이름 · 이메일 형식 · 8자 이상 · 72바이트 이하 · 비밀번호 확인 · 이미 가입된 이메일 아님).
       "다음" 버튼과 실제 가입(submit) 둘 다 이 검사를 씀 */
    const accountProblem = () => {
        if (!name.trim() || !email.trim()) return "이름과 이메일을 입력해 주세요.";
        if (!EMAIL_PATTERN.test(email.trim())) return "이메일 주소 형식을 확인해 주세요. (예: hello@example.com)";
        if (password.length < 8 || passwordUtf8Bytes(password) > 72) return "비밀번호는 8자 이상, 최대 72바이트로 입력해 주세요.";
        if (password2 !== password) return "비밀번호 확인이 달라요. 한 번 더 같게 넣어 주세요.";
        if (emailStatus === "taken") return "이미 가입된 이메일이에요. 로그인하거나 다른 이메일을 넣어 주세요.";
        return "";
    };
    // 이메일 중복 확인(스위치가 켜졌을 때만 버튼이 보임 — 웹과 같은 함수)
    const runEmailCheck = async () => {
        if (!EMAIL_PATTERN.test(email.trim())) return "idle" as const;
        setEmailStatus("checking");
        const result = await checkSignupEmail(email.trim());
        setEmailStatus(result);
        return result;
    };
    const nextFromAccount = async () => {
        setError(""); setTried(true);
        if (accountProblem()) { haptic("light"); return; }
        if (features.emailCheck && emailStatus === "idle") {
            const result = await runEmailCheck();
            if (result === "taken") { haptic("light"); return; }
        }
        setTried(false);
        goTo("pet");
    };

    // 가입이 끝나면 마케팅 수신 동의 저장(연동됐을 때만) → 완료 화면에 처리 결과(웹과 같음)
    const doneMember = pendingVerification?.kind === "bonus" ? pendingVerification.member : null;
    useEffect(() => {
        if (!doneMember || !features.marketing || marketingSavedRef.current) return;
        marketingSavedRef.current = true;
        void saveMarketingConsent(doneMember.apiAccessToken, marketing).then((processedAt) => {
            if (processedAt) setMarketingProcessedAt(processedAt);
        });
    }, [doneMember, features.marketing, marketing]);

    /* 가입 — withPet=false 면 반려견 정보 없이(건너뛰기). 그 밖 검사 · 흐름은 웹 가입 화면과 같음 */
    const submit = async (withPet: boolean) => {
        setError("");
        setErrorKind("");
        // 웹은 이름 · 이메일 칸(required · type="email")을 브라우저가 가입 처리 전에 먼저 막음 → 같은 순서로 맨 먼저 검사, 문제면 계정 쪽으로
        // (비밀번호는 웹과 같이 아래 서버 준비 확인 다음 순서에서 검사)
        if (!name.trim() || !email.trim() || !EMAIL_PATTERN.test(email.trim())) { setError(accountProblem()); haptic("light"); goTo("account"); return; }
        if (!ddbApiReady()) { setCustomerToken(); setError("지금은 회원가입 준비 중입니다. 잠시 후 다시 이용해 주세요."); return; }
        const passwordBytes = passwordUtf8Bytes(password);
        if (password.length < 8 || passwordBytes > 72) { setError("비밀번호는 8자 이상, 최대 72바이트로 입력해 주세요."); goTo("account"); return; }
        if (!age14 || !agreeTerms || !agreePrivacy) { setError("필수 약관(만 14세 이상 · 이용약관 · 개인정보 수집·이용)에 동의해 주세요."); goTo("terms"); return; }
        if (!botChallengeConfigured) { setError("가입 보안 확인을 준비 중입니다. 잠시 후 다시 이용해 주세요."); return; }
        // 보안 확인 토큰이 비었으면(시간 만료 · 미완료) — 이메일 가입은 마지막 확인 칸에 보안 확인이 있어 이 쪽 그대로(웹과 같은 문구)
        if (!botToken) { setError("가입 보안 확인을 완료해 주세요."); haptic("light"); return; }
        const weightText = withPet ? petWeightKg.trim() : "";
        const confirmedWeightKg = weightText ? Number(weightText) : undefined;
        if (confirmedWeightKg !== undefined && (!Number.isFinite(confirmedWeightKg) || confirmedWeightKg < 0.1 || confirmedWeightKg > 120)) {
            setError("현재 체중은 직접 확인한 값으로 0.1~120kg 사이를 입력해 주세요."); return;
        }
        const photoViewMeta = withPet ? petPhotoViewMetadata(petPhotoViews) : [];
        const primaryPhotoView = primaryPetPhotoEntry(petPhotoViews)?.[0];
        const shouldCreatePet = withPet && Boolean(
            petName.trim() || petPhotoDataUrl || photoViewMeta.length > 0 || petBreedId || petBreedCustom.trim()
            || confirmedWeightKg !== undefined || petCoatColor.trim() || petSex !== "unknown"
        );
        if (shouldCreatePet && !agreePetLensPrivacy) {
            setError("반려동물 사진·품종·체중 등 PetLens 프로필을 함께 저장하려면 선택 개인정보 수집·이용 동의가 필요합니다. 동의하지 않아도 회원가입은 가능하며, 가입 후 마이페이지에서 다시 등록할 수 있습니다.");
            return;
        }
        const customBreed = petBreedId === CUSTOM_BREED_OPTION ? petBreedCustom.trim().slice(0, 100) : "";
        if (shouldCreatePet && !isPetBreedId(petBreedId) && customBreed.length < 2) {
            setError("반려견 사진 또는 정보를 등록하셨다면, 아래에서 우리 아이의 견종을 확인해 주세요."); return;
        }
        const selectedBreed = isPetBreedId(petBreedId) ? getPetBreedVisual(petBreedId) : null;
        const confirmedBreed = selectedBreed?.ko || customBreed || undefined;
        const pets: PetProfile[] = shouldCreatePet ? [{
            name: petName.trim() || "우리 아이", breed: confirmedBreed, size: petSize, age: petAge.trim() || "성견", weightKg: confirmedWeightKg, sex: petSex,
            coatColor: petCoatColor.trim() || undefined, coat: petCoat, activity: petActivity, concerns: petConcerns.length > 0 ? petConcerns : ["일상 케어"],
            photoDataUrl: petPhotoDataUrl,
            photoViews: petPhotoViewEntries(petPhotoViews).map(([viewId, photo]) => ({ viewId, dataUrl: photo.dataUrl, imageName: photo.imageName })),
            rawAnalysis: confirmedBreed ? {
                ...(petRawAnalysis || {}),
                ...(photoViewMeta.length > 0 ? { petPhotoViews: photoViewMeta, petPhotoViewCount: photoViewMeta.length, petPhotoPrimaryView: primaryPhotoView } : {}),
                ...(selectedBreed ? { breedId: selectedBreed.id, breed_ko: selectedBreed.ko, breed_en: selectedBreed.en } : { breed_ko: confirmedBreed }),
                breedSource: petBreedSource || "manual",
                storefrontConfirmation: {
                    size: petSize,
                    weightKgSource: confirmedWeightKg === undefined ? "not_provided" : "member_input",
                    sexSource: petSex === "unknown" ? "not_provided" : "member_input",
                    coatColorSource: petCoatColor.trim() ? (petCoatColorSource || "manual") : "not_provided",
                },
            } : undefined,
            lastAnalyzedAt: new Date().toISOString(),
        }] : [];

        setLoading(true);
        try {
            const apiUser = await signupCustomer({
                email: email.trim(), password, name: name.trim() || "댕다방 회원", bot_token: botToken,
                terms_version: SIGNUP_TERMS_VERSION, privacy_version: SIGNUP_PRIVACY_VERSION,
            });
            const destination = petLensPostAuthDestination(back, pets);
            if (apiUser.email_verification_required) {
                const activationToken = String(apiUser.activation_token || "");
                const activationExpiresIn = Number(apiUser.activation_expires_in || 0);
                if (activationToken.length < 20 || activationExpiresIn <= 0) throw new Error("Signup activation grant is missing.");
                const createdAt = Date.now();
                const activationExpiresAt = createdAt + activationExpiresIn * 1_000;
                // 웹과 같음(초안 지우고 이번 반려견을 대기 저장). "나중에 등록"이면 펫렌즈 초안을 그대로 남김
                if (withPet) {
                    clearPetLensSignupDraft();
                    if (pets[0]) savePetLensSignupDraft(pets[0]);
                }
                setCustomerToken();
                clearSignupEmailResume();
                saveSignupActivationResume({
                    phase: "pending_email", email: apiUser.email, name: apiUser.name || name.trim() || "댕다방 회원",
                    apiUserId: apiUser.id, returnTo: destination, createdAt, activationToken, activationExpiresAt,
                });
                setPendingVerification({
                    kind: "activation", apiUserId: apiUser.id, name: apiUser.name || name.trim() || "댕다방 회원", email: apiUser.email,
                    destination, pets, verified: false, activationToken, activationExpiresAt, keepPetLensDraft: !withPet,
                });
                return;
            }
            const token = await loginCustomer({ email: email.trim(), password });
            const apiAccessToken = token.access_token;
            setCustomerToken(apiAccessToken);
            if (pets[0]) await savePetProfileSmart(pets[0], apiAccessToken);
            const savedPets = (await loadPetProfilesSmart(apiAccessToken).catch(() => null)) || pets;
            const member: User = {
                apiUserId: apiUser.id, apiAccessToken, name: apiUser.name || name.trim() || "댕다방 회원", email: apiUser.email,
                joinedAt: new Date().toISOString(), pets: savedPets,
            };
            const confirmedDestination = petLensPostAuthDestination(back, savedPets);
            login(member);
            trackSignupCompleted("email");
            // 웹과 같음(가입 + 반려견 저장 뒤 초안 지움). "나중에 등록"이면 반려견을 저장하지 않았으니 펫렌즈 초안을 남김
            if (withPet) clearPetLensSignupDraft();
            clearSignupActivationResume();
            saveSignupEmailResume({ source: "email", returnTo: confirmedDestination });
            haptic("medium");
            setPendingVerification({ kind: "bonus", member, destination: confirmedDestination });
        } catch (err) {
            setCustomerToken();
            setBotToken("");
            setBotResetKey((value) => value + 1);
            setError(customerApiErrorMessage(err));
            // 갈림길 — 이미 가입된 이메일(409) · 받지 않는 이메일 주소(웹과 같은 판단)
            if (err instanceof DdbApiError) setErrorKind(err.status === 409 ? "email_taken" : err.apiCode === "signup_email_domain_not_allowed" ? "email_domain" : "");
        } finally {
            setLoading(false);
        }
    };

    const finishBonusSignup = () => {
        if (!pendingVerification || pendingVerification.kind !== "bonus") return;
        const destination = pendingVerification.destination;
        clearSignupEmailResume();
        setPendingVerification(null);
        router.push(destination);
    };

    const finalizeActivatedSignup = async (activation: PendingAccountActivation, loginPassword: string) => {
        if (activationFinalizeInFlightRef.current) return;
        if (loginPassword.length < 8 || passwordUtf8Bytes(loginPassword) > 72) { setActivationLoginError("가입 때 입력한 비밀번호를 다시 입력해 주세요."); return; }
        activationFinalizeInFlightRef.current = true;
        setActivationFinalizing(true);
        setActivationLoginError("");
        try {
            const token = await loginCustomer({ email: activation.email, password: loginPassword });
            const apiAccessToken = token.access_token;
            setCustomerToken(apiAccessToken);
            if (activation.pets[0]) await savePetProfileSmart(activation.pets[0], apiAccessToken);
            const savedPets = (await loadPetProfilesSmart(apiAccessToken).catch(() => null)) || activation.pets;
            login({ apiUserId: activation.apiUserId, apiAccessToken, name: activation.name, email: activation.email, joinedAt: new Date().toISOString(), pets: savedPets });
            trackSignupCompleted("email");
            clearSignupActivationResume();
            clearSignupEmailResume();
            // 웹과 같음. 단 "나중에 등록"으로 가입했으면 펫렌즈 초안을 남김
            if (!activation.keepPetLensDraft) clearPetLensSignupDraft();
            setPendingVerification(null);
            router.push(activation.destination);
        } catch (reason) {
            setCustomerToken();
            setActivationLoginError(customerApiErrorMessage(reason));
        } finally {
            activationFinalizeInFlightRef.current = false;
            setActivationFinalizing(false);
        }
    };

    const completeEmailVerification = (result: SignupEmailVerificationResult) => {
        if (!pendingVerification) return;
        if (pendingVerification.kind === "activation") {
            const verifiedActivation: PendingAccountActivation = { ...pendingVerification, email: result.verifiedEmail || pendingVerification.email, verified: true, activationToken: undefined, activationExpiresAt: undefined };
            saveSignupActivationResume({
                phase: "verified_login", email: verifiedActivation.email, name: verifiedActivation.name, apiUserId: verifiedActivation.apiUserId,
                returnTo: verifiedActivation.destination, createdAt: Date.now(),
            });
            setPendingVerification(verifiedActivation);
            void finalizeActivatedSignup(verifiedActivation, password);
            return;
        }
        if (result.verifiedEmail) updateMemberEmail(result.verifiedEmail);
        finishBonusSignup();
    };

    /* 공통 틀 — 크림 배경 + 속지 */
    // 가입을 마친 뒤 화면(완료 · 이메일 인증) — 웹 단계 줄처럼 마지막 "완료" 탭이 켜진 색인 탭(돌아가기 없음)
    const emailTabs = features.identity ? EMAIL_STEPS_WITH_IDENTITY : EMAIL_STEPS;
    const doneTabs = <DiaryTabs tabs={emailTabs} active={emailTabs.length - 1} onPick={() => {}} compact={emailTabs.length > 5} />;
    const frame = (body: ReactNode, tabs?: ReactNode) => (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + SHOW_PARTS_CSS + SIGNUP_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">{tabs}{body}</div>
        </div>
    );

    /* ───────── 가입 완료(바로 쓸 수 있는 계정) — 웹 SignupWebDone 과 같은 내용을 스티커북으로(간편 가입과 같은 부품 SignupDone) ───────── */
    if (pendingVerification?.kind === "bonus" && !verifyOpen) {
        const member = pendingVerification.member;
        return frame(
            <DiaryBody pageKey="signup-done" dir={1}>
                <SignupDone
                    name={member.name}
                    pet={member.pets[0]}
                    marketingResult={marketingProcessedAt ? { processedAt: marketingProcessedAt, choice: marketing } : null}
                    onVerify={() => setVerifyOpen(true)}
                    finishLabel="쇼핑 시작하기"
                    onFinish={finishBonusSignup}
                    onLeave={clearSignupEmailResume}
                />
            </DiaryBody>,
            doneTabs,
        );
    }

    /* ───────── 이메일 인증 화면들(가입 뒤) — 계정 열기(activation) · 가입 혜택 20C 인증 ───────── */
    if (pendingVerification) {
        const verifyTitle = pendingVerification.kind === "bonus" ? "가입 혜택 이메일 인증" : pendingVerification.verified ? "이메일 확인 완료" : "회원가입 이메일 확인";
        const verifyBody = pendingVerification.kind === "bonus"
            ? "가입 이메일로 자동 발송된 6자리 인증번호를 확인하면 신규 가입 혜택 20C를 받을 수 있어요."
            : pendingVerification.verified
                ? "이메일이 확인되었습니다. 안전하게 계정 이용을 시작하기 위해 가입 때 입력한 비밀번호로 로그인해 주세요."
                : "이메일 확인을 마쳐야 계정 이용이 시작됩니다. 확인 전에는 로그인 정보나 회원 프로필을 저장하지 않습니다.";
        return frame(
            <DiaryBody pageKey={`verify-${pendingVerification.kind}-${pendingVerification.kind === "activation" && pendingVerification.verified}`} dir={1}>
                <div className="flex flex-col items-center text-center">
                    <Image src={pendingVerification.kind === "bonus" ? "/images/ui/stickers/signup-gift.webp" : "/images/ui/stickers/inquiry-email.webp"} alt="" width={72} height={72} className="su-mail-img h-[4.5rem] w-[4.5rem]" />
                    <h1 className="ah-display mt-3 text-[20px]"><span className="st-marker">{verifyTitle}</span></h1>
                    <p className="ah-light mt-2 text-[13px] leading-relaxed" style={{ color: TEXT_SOFT }}>{verifyBody}</p>
                </div>
                {pendingVerification.kind === "activation" && pendingVerification.verified ? (
                    activationFinalizing ? (
                        <div className="mt-5"><Note tone="info"><i aria-hidden="true" className="fa-solid fa-circle-notch fa-spin mr-1.5" />계정과 반려견 프로필을 준비하고 있습니다.</Note></div>
                    ) : (
                        <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); void finalizeActivatedSignup(pendingVerification, password); }}>
                            {activationLoginError ? <Note tone="error">{activationLoginError}</Note> : null}
                            <LabelField icon="fa-lock" stub="#fff1c4" ink="#c98a12">
                                <span className="sr-only">가입 비밀번호</span>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={72} autoComplete="current-password" required placeholder="가입 비밀번호"
                                    className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-[#c2b2aa]" />
                            </LabelField>
                            <Patch type="submit">계정 이용 시작<i aria-hidden="true" className="fa-solid fa-paw text-[14px]" /></Patch>
                        </form>
                    )
                ) : (
                    <div className="su-verify mt-5">
                        <SignupEmailVerification
                            accessToken={pendingVerification.kind === "bonus" ? pendingVerification.member.apiAccessToken : pendingVerification.activationToken}
                            accountEmail={pendingVerification.kind === "bonus" ? pendingVerification.member.email : pendingVerification.email}
                            accountActivationRequired={pendingVerification.kind === "activation"}
                            onComplete={completeEmailVerification}
                            onContinueWithoutBonus={pendingVerification.kind === "bonus" ? () => finishBonusSignup() : undefined}
                        />
                        {/* 혜택 인증은 완료 화면에서 연 것 — 돌아가기 */}
                        {pendingVerification.kind === "bonus" ? (
                            <div className="mt-4"><Patch tone="cream" small onClick={() => setVerifyOpen(false)}><i aria-hidden="true" className="fa-solid fa-chevron-left text-[11px]" />가입 완료 화면으로</Patch></div>
                        ) : null}
                    </div>
                )}
            </DiaryBody>,
            doneTabs,
        );
    }

    /* ───────── 가입 단계 ───────── */
    // 단계 내용 쪽 넘김 애니메이션(속지 DiaryBody 와 같은 dt-in-next / dt-in-prev) — 처음 연 쪽(dir 0)은 속지가 이미 움직이므로 없음
    const turnClass = dir > 0 ? "dt-in-next" : dir < 0 ? "dt-in-prev" : "";
    const tabs = isSocial ? socialStepTabs(socialInfo?.label ?? "") : emailTabs;
    // 공급자 준비 상태 — 웹 가입 방법 화면과 같은 판단(준비 중 · 확인 중 · 연결 오류)
    const providerState = (provider: SocialProvider) => {
        if (apiReady !== true) return "off";
        if (!providers.statusChecked) return "checking";
        if (!providers.enabledByProvider) return "error";
        return providers.enabledByProvider[provider] ? "ready" : "off";
    };
    const providerConnectionError = apiReady === true && providers.statusChecked && !providers.enabledByProvider;
    const requiredCount = [age14, agreeTerms, agreePrivacy].filter(Boolean).length;
    const allAgreed = requiredCount === 3 && (!features.marketing || isSocial || (marketing.email && marketing.sms));
    const setAllAgreed = (checked: boolean) => {
        setAge14(checked); setAgreeTerms(checked); setAgreePrivacy(checked);
        if (features.marketing && !isSocial) setMarketing({ email: checked, sms: checked });
    };
    // 계정 칸 상태(웹 계정 단계와 같은 표시)
    const emailFormatOk = EMAIL_PATTERN.test(email.trim());
    const lengthOk = password.length >= 8;
    const bytesOk = passwordUtf8Bytes(password) <= 72;
    const mixOk = /[A-Za-z]/.test(password) && /\d/.test(password);
    const score = passwordScore(password);
    const matchOk = Boolean(password2) && password2 === password;
    const canSubmit = Boolean(choice) && apiReady === true && signupSecurityReady && !loading && !photoLoading;
    const goPick = (i: number) => { if (i < step) goStep(i); }; // 지나온 단계만 탭으로 돌아감

    return frame(
        <DiaryBody pageKey="signup-steps" dir={dir}>
            <h1 className="sr-only">회원가입</h1>
            <div key={`step-${step}`} className={turnClass}>
            {apiReady === false ? <div className="mb-4"><Note tone="warn">지금은 회원가입 준비 중입니다. 잠시 후 다시 이용해 주세요.</Note></div> : null}

            {cur === "method" ? (
                <>
                    {/* ① 가입 방법 — 이메일 카드 · 간편 가입 동그란 스티커 셋 · 가입 혜택 포스트잇 */}
                    <p className="ah-light text-[10.5px] tracking-[.16em] text-[#c4567a]">STEP 1 · START</p>
                    <p className="ah-display mt-0.5 text-[19px] leading-snug">어떻게 <span className="st-marker">가입</span>할까요?</p>
                    <p className="ah-light mt-1 text-[12.5px]" style={{ color: TEXT_SOFT }}>이메일로 가입하거나, 쓰던 계정으로 바로 시작할 수 있어요.</p>

                    <button type="button" disabled={apiReady === false} onClick={() => { haptic("light"); setRoute("email"); setError(""); goTo("terms"); }}
                        className="su-way st-sheet relative mt-5 flex w-full items-center gap-3 rounded-[16px] px-3.5 pb-3.5 pt-4 text-left disabled:opacity-60" style={{ rotate: "-0.6deg" }}>
                        <Tape className="-top-2 left-5 h-3.5 w-12" color="rgba(255,214,228,.9)" style={{ rotate: "-4deg" }} />
                        <Image src="/images/ui/stickers/my-profile.webp" alt="" width={56} height={56} className="st-diecut-img h-14 w-14 shrink-0 object-contain" />
                        <span className="min-w-0 flex-1">
                            <span className="ah-display block text-[15.5px]">이메일로 가입하기</span>
                            <span className="ah-light block text-[11.5px]" style={{ color: TEXT_SOFT }}>이메일 · 비밀번호로 로그인해요</span>
                            <span className="mt-1.5 flex flex-wrap items-center gap-1" aria-label="가입 순서">
                                {["약관", "계정 정보", "우리 아이"].map((label, i) => (
                                    <span key={label} className="ah-light inline-flex items-center gap-1 text-[10.5px] text-[#a8968d]">
                                        {i > 0 ? <i aria-hidden="true" className="fa-solid fa-chevron-right text-[7px]" /> : null}{label}
                                    </span>
                                ))}
                            </span>
                        </span>
                        <span className="su-way-go grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px]"><i aria-hidden="true" className="fa-solid fa-arrow-right" /></span>
                    </button>

                    <p className="ah-display mb-3 mt-6 flex items-center justify-center gap-2 text-[12px] text-[#c4567a]">
                        <i aria-hidden="true" className="fa-solid fa-paw text-[9px] opacity-60" />또는 쓰던 계정으로 바로 시작<i aria-hidden="true" className="fa-solid fa-paw text-[9px] opacity-60" />
                    </p>
                    <div className="grid grid-cols-3 gap-2.5">
                        {SOCIAL.map((provider, i) => {
                            const state = providerState(provider.id);
                            return (
                                <button key={provider.id} type="button" disabled={state !== "ready"} aria-label={`${provider.label}로 간편 가입`}
                                    onClick={() => { haptic("light"); setRoute(provider.id); setSocialError(""); setError(""); goTo("terms"); }}
                                    className="su-social-way flex flex-col items-center rounded-[14px] bg-white px-1 pb-2.5 pt-3 disabled:opacity-55" style={{ rotate: `${[-1.2, 0.8, -0.6][i]}deg` }}>
                                    <ProviderMark provider={provider} />
                                    <span className="ah-display mt-1.5 text-[12.5px]">{provider.label}로 시작</span>
                                    {state === "checking" ? <span className="ah-light text-[10px] text-[#a8968d]">확인 중</span> : null}
                                    {state === "off" && apiReady === true ? <span className="ah-light text-[10px] text-[#a8968d]">준비 중</span> : null}
                                </button>
                            );
                        })}
                    </div>
                    {providerConnectionError ? (
                        <p role="status" className="ah-light mt-2.5 text-center text-[11.5px]" style={{ color: TEXT_SOFT }}>
                            간편 가입 연결을 확인하지 못했어요. <button type="button" onClick={providers.retryProviders} className="ah-display text-[#e0557f] underline underline-offset-2">다시 확인</button>
                        </p>
                    ) : null}
                    <p className="ah-light mt-2.5 text-center text-[11px] leading-snug" style={{ color: TEXT_SOFT }}>간편 가입은 비밀번호 없이 카카오 · 네이버 · 구글 계정으로 로그인해요. 그 화면에서 동의하면 댕다방으로 돌아와요.</p>

                    {/* 가입 혜택 — 노란 포스트잇 */}
                    <div className="su-gift st-postit relative mt-6 flex items-center gap-3 px-3.5 pb-3 pt-3.5" style={{ background: "#fff3a6", rotate: "0.6deg" }}>
                        <Tape className="-top-2 left-1/2 h-3.5 w-12 -translate-x-1/2" color="rgba(200,226,255,.85)" style={{ rotate: "3deg" }} />
                        <Image src="/images/ui/goods-pay-ready-256.webp" alt="" width={44} height={44} className="h-11 w-11 shrink-0 object-contain" />
                        <span className="min-w-0 flex-1">
                            <span className="ah-light block text-[11px] text-[#8f5e12]">가입 혜택</span>
                            <span className="ah-display block text-[14px]">코인 {SIGNUP_BONUS_COINS}C · 행동·소리 분석 2회</span>
                            <span className="ah-light mt-0.5 block text-[11px] leading-snug text-[#8f5e12]">가입 이메일 인증 완료 후 자동 지급됩니다. 반복 가입 등 부정 수령이 확인되면 코인이 회수되거나 이용이 제한될 수 있습니다.</span>
                        </span>
                    </div>
                </>
            ) : cur === "terms" ? (
                <>
                    {/* ② 약관 — 전체 동의 · 필수 3가지(만 14세 · 이용약관 · 개인정보) · (스위치) 마케팅, 항목마다 내용 속지 */}
                    <p className="ah-light text-[10.5px] tracking-[.16em] text-[#c4567a]">STEP 2 · AGREEMENT</p>
                    <p className="ah-display mt-0.5 text-[19px] leading-snug"><span className="st-marker">약관</span>에 동의해 주세요</p>
                    <p className="ah-light mt-1 text-[12.5px]" style={{ color: TEXT_SOFT }}>필수 3가지에 동의하면 다음으로 넘어가요. 내용은 항목마다 펼쳐 볼 수 있어요.</p>

                    {isSocial && socialInfo ? (
                        <div className="su-paper mt-4 flex items-center gap-3 rounded-[16px] px-3.5 py-3">
                            <ProviderMark provider={socialInfo} small />
                            <span className="min-w-0 flex-1">
                                <span className="ah-display block text-[13.5px]">{socialInfo.label}에서 받는 정보</span>
                                <span className="ah-light block text-[11px] leading-snug" style={{ color: TEXT_SOFT }}>{socialInfo.gives} · 비밀번호는 받지 않아요</span>
                            </span>
                        </div>
                    ) : null}

                    {/* 전체 동의 — 큰 체크 스티커 판 + 필수 n/3 도장 */}
                    <label className={`su-all mt-4 flex cursor-pointer items-center gap-3 rounded-[16px] px-3.5 py-3.5 ${allAgreed ? "is-on" : ""}`}>
                        <input type="checkbox" checked={allAgreed} onChange={(e) => { setAllAgreed(e.target.checked); haptic("light"); }} className="sr-only" />
                        <span aria-hidden="true" className={`su-check grid h-7 w-7 shrink-0 place-items-center rounded-[8px] ${allAgreed ? "is-on" : ""}`}>
                            {allAgreed ? <svg viewBox="0 0 28 28" className="h-5 w-5"><path d="M7 14 L12 19 L23 6" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className="st-check" /></svg> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="ah-display block text-[15px]">전체 동의할게요</span>
                            <span className="ah-light block text-[11px]" style={{ color: TEXT_SOFT }}>{features.marketing && !isSocial ? "필수 3가지와 선택 1가지를 한 번에 동의해요" : "필수 3가지를 한 번에 동의해요"}</span>
                        </span>
                        <span className={`su-stamp ah-display shrink-0 rounded-full px-2.5 py-1 text-[11px] ${requiredCount === 3 ? "is-ok" : ""}`}>필수 {requiredCount}/3</span>
                    </label>

                    <div className="su-paper mt-3 space-y-3 rounded-[16px] px-3.5 py-3.5">
                        <ConsentRow checked={age14} onChange={setAge14} required onOpen={() => setDoc("age14")}>만 14세 이상이에요</ConsentRow>
                        <ConsentRow checked={agreeTerms} onChange={setAgreeTerms} required onOpen={() => setDoc("terms")}>이용약관에 동의해요</ConsentRow>
                        <ConsentRow checked={agreePrivacy} onChange={setAgreePrivacy} required onOpen={() => setDoc("privacy")}>개인정보 수집·이용에 동의해요</ConsentRow>
                        {features.marketing && !isSocial ? (
                            <div>
                                <ConsentRow checked={marketing.email || marketing.sms} onChange={(v) => setMarketing({ email: v, sms: v })} onOpen={() => setDoc("marketing")}>마케팅 정보 수신에 동의해요</ConsentRow>
                                <div className="ml-[34px] mt-1.5 flex gap-1.5" role="group" aria-label="받을 방법">
                                    {([["email", "이메일"], ["sms", "문자(SMS)"]] as const).map(([key, label]) => (
                                        <button key={key} type="button" aria-pressed={marketing[key]} onClick={() => { haptic("light"); setMarketing({ ...marketing, [key]: !marketing[key] }); }}
                                            className={`su-chip ah-display rounded-full px-3 py-1 text-[11.5px] ${marketing[key] ? "is-on" : ""}`}>
                                            {marketing[key] ? <i aria-hidden="true" className="fa-solid fa-check mr-1 text-[9px]" /> : null}{label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                    {!isSocial ? <p className="ah-light mt-2.5 text-[11px]" style={{ color: TEXT_SOFT }}><i aria-hidden="true" className="fa-solid fa-paw mr-1 text-[9px] text-[#f08eae]" />반려동물 정보 동의(선택)는 &quot;우리 아이&quot; 단계에서 따로 받아요.</p> : null}

                    {/* 간편 가입 — 이 쪽에서 보안 확인 후 공급자 화면으로(웹과 같음) */}
                    {isSocial ? (
                        <div className="su-bot mt-4">
                            <SignupBotChallenge onTokenChange={setBotToken} resetKey={botResetKey} title="가입 보안 확인" description="자동 가입을 막기 위해 확인해요. 확인이 끝나면 다음 버튼이 켜져요." />
                        </div>
                    ) : null}
                    {tried && !requiredConsentsAccepted ? <div className="mt-3"><Note tone="error">필수 3가지에 모두 동의해 주세요.</Note></div> : null}
                    {socialError ? <div className="mt-3"><Note tone="error">{socialError}</Note></div> : null}
                    {isSocial && !signupSecurityReady ? <p className="ah-light mt-3 text-center text-[11px]" style={{ color: TEXT_SOFT }}>필수 동의와 보안 확인을 마치면 {socialInfo?.label} 화면으로 넘어가요.</p> : null}

                    <div className="mt-5 grid grid-cols-[auto_1fr] gap-2.5">
                        <Patch tone="cream" small onClick={() => goTo("method")}><i aria-hidden="true" className="fa-solid fa-chevron-left text-[11px]" />이전</Patch>
                        {isSocial ? (
                            <Patch small onClick={continueSocial} disabled={!signupSecurityReady}>{socialInfo?.label}로 계속하기<i aria-hidden="true" className="fa-solid fa-arrow-right text-[11px]" /></Patch>
                        ) : (
                            <Patch small onClick={nextFromTerms} className={requiredConsentsAccepted ? "" : "su-off"}>동의하고 계속<i aria-hidden="true" className="fa-solid fa-chevron-right text-[11px]" /></Patch>
                        )}
                    </div>
                </>
            ) : cur === "identity" ? (
                <>
                    {/* ③ 휴대폰 본인인증(스위치) — 웹과 같은 안내 · 결과 갈림길(이미 가입 · 만 14세 미만 · 재가입 제한 · 취소 · 시간 초과 · 실패) */}
                    <p className="ah-light text-[10.5px] tracking-[.16em] text-[#3d8fb8]">STEP 3 · IDENTITY</p>
                    <p className="ah-display mt-0.5 text-[19px] leading-snug">휴대폰으로 <span className="st-marker">본인인증</span> 해 주세요</p>
                    <p className="ah-light mt-1 text-[12.5px]" style={{ color: TEXT_SOFT }}>내 명의 휴대폰으로 인증해요. 입력은 인증기관 창에서 해요.</p>
                    <div className="mt-4"><IdentityStep state={identity} onStart={startIdentity} onRestart={() => setIdentity({ phase: "idle" })} /></div>
                    <div className="mt-5 grid grid-cols-[auto_1fr] gap-2.5">
                        <Patch tone="cream" small onClick={() => goTo("terms")}><i aria-hidden="true" className="fa-solid fa-chevron-left text-[11px]" />이전</Patch>
                        <Patch small onClick={() => goTo("account")} disabled={!identityOk}>{identityOk ? "다음 · 계정 정보" : "인증을 마치면 다음으로"}<i aria-hidden="true" className="fa-solid fa-chevron-right text-[11px]" /></Patch>
                    </div>
                </>
            ) : cur === "account" ? (
                <>
                    {/* ③ 계정 정보 — 이름 · 이메일(중복 확인 스위치) · 비밀번호 · 비밀번호 확인 · 강도 */}
                    <p className="ah-light text-[10.5px] tracking-[.16em] text-[#c4567a]">STEP {order.indexOf("account") + 1} · ACCOUNT</p>
                    <p className="ah-display mt-0.5 text-[19px] leading-snug"><span className="st-marker">계정 정보</span>를 정해 주세요</p>
                    <p className="ah-light mt-1 text-[12.5px]" style={{ color: TEXT_SOFT }}>이메일이 로그인 아이디가 돼요. 주문 안내도 이 주소로 보내 드려요.</p>
                    <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); void nextFromAccount(); }}>
                        <LabelField icon="fa-user" stub="#d9f2e4" ink="#1f9e75">
                            <span className="sr-only">이름</span>
                            {identityVerified ? (
                                // 본인인증 정보로 채운 이름 — 잠금(웹과 같음)
                                <span className="flex min-w-0 flex-1 items-center justify-between px-3.5 text-[15px] text-[#5a4038]">{identityVerified.name}<i aria-label="본인인증 정보" className="fa-solid fa-lock text-[12px] text-[#b8a59c]" /></span>
                            ) : (
                                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={40} placeholder="이름 · 예: 김댕댕" aria-invalid={tried && !name.trim()} className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-[#c2b2aa]" />
                            )}
                        </LabelField>
                        {identityVerified ? (
                            <LabelField icon="fa-mobile-screen-button" stub="#e3f2fb" ink="#3d8fb8">
                                <span className="sr-only">휴대폰</span>
                                <span className="flex min-w-0 flex-1 items-center justify-between px-3.5 text-[15px] text-[#5a4038]">{identityVerified.maskedPhone}<i aria-label="본인인증 정보" className="fa-solid fa-lock text-[12px] text-[#b8a59c]" /></span>
                            </LabelField>
                        ) : (
                            <p className="ah-light pl-1 text-[11px] leading-snug" style={{ color: TEXT_SOFT }}><i aria-hidden="true" className="fa-solid fa-receipt mr-1 text-[10px] text-[#f08eae]" />주문 · 배송 안내와 영수증을 이메일로 보내 드려요. 실제로 쓰는 주소를 넣어 주세요.</p>
                        )}
                        {tried && !name.trim() ? <p className="su-err ah-light">이름을 넣어 주세요.</p> : null}
                        <div className="flex items-stretch gap-2">
                            <LabelField icon="fa-envelope" stub="#ffe1ea" ink="#d2457a" grow>
                                <span className="sr-only">이메일</span>
                                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailStatus("idle"); setError(""); setErrorKind(""); }} autoComplete="email" inputMode="email" placeholder="이메일 · 로그인 아이디" aria-invalid={(tried && !emailFormatOk) || emailStatus === "taken"} className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-[#c2b2aa]" />
                                {emailStatus === "available" ? <span className="ah-display grid shrink-0 place-items-center pr-3 text-[11px] text-[#1f9e75]">쓸 수 있어요</span> : null}
                            </LabelField>
                            {features.emailCheck ? (
                                <button type="button" onClick={() => void runEmailCheck()} disabled={!emailFormatOk || emailStatus === "checking"} className="su-mini ah-display shrink-0 rounded-[12px] px-3 text-[12px] disabled:opacity-50">
                                    <i aria-hidden="true" className={emailStatus === "checking" ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-magnifying-glass"} /> 중복 확인
                                </button>
                            ) : null}
                        </div>
                        {tried && !emailFormatOk ? <p className="su-err ah-light">이메일 주소 모양을 확인해 주세요. 예: daeng@example.com</p> : null}
                        {!features.emailCheck && emailFormatOk ? <p className="ah-light pl-1 text-[11px]" style={{ color: TEXT_SOFT }}>이미 가입된 이메일인지는 가입하기를 누를 때 확인해요.</p> : null}
                        {emailStatus === "taken" ? <EmailTakenNote email={email} onOther={undefined} /> : null}

                        <LabelField icon="fa-lock" stub="#fff1c4" ink="#c98a12">
                            <span className="sr-only">비밀번호</span>
                            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} autoComplete="new-password" placeholder="비밀번호 · 8자 이상" aria-invalid={tried && (!lengthOk || !bytesOk)}
                                className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-[#c2b2aa]" />
                            <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"} aria-pressed={showPw} className="su-eye grid w-11 shrink-0 place-items-center text-[13px] text-[#b8a59c]">
                                <i aria-hidden="true" className={`fa-solid ${showPw ? "fa-eye-slash" : "fa-eye"}`} />
                            </button>
                        </LabelField>
                        {/* 강도 — 크레용 세 칸 + 이름 */}
                        <div className="flex items-center gap-1.5 pl-1" aria-hidden="true">
                            {[1, 2, 3].map((n) => <span key={n} className="su-meter h-[7px] flex-1 rounded-full" data-on={score >= n ? String(score) : undefined} />)}
                            {password ? <span className="ah-display ml-1 w-14 text-right text-[11px]" style={{ color: score >= 3 ? "#1f9e75" : score === 2 ? "#c98a12" : "#d2457a" }}>{score >= 3 ? "튼튼해요" : score === 2 ? "괜찮아요" : "약해요"}</span> : null}
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-1">
                            {[
                                { ok: lengthOk, bad: false, label: "8자 이상" },
                                { ok: mixOk, bad: false, label: "영문 · 숫자 섞기" },
                                { ok: Boolean(password) && bytesOk, bad: !bytesOk, label: "72바이트 이하" },
                            ].map((rule) => (
                                <span key={rule.label} className={`su-rule ah-light inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] ${rule.ok ? "is-ok" : rule.bad ? "is-bad" : ""}`}>
                                    <i aria-hidden="true" className={rule.ok ? "fa-solid fa-check" : rule.bad ? "fa-solid fa-xmark" : "fa-regular fa-circle"} />{rule.label}
                                </span>
                            ))}
                        </div>
                        {tried && !lengthOk ? <p className="su-err ah-light">비밀번호는 8자 이상으로 정해 주세요.</p> : null}
                        {!bytesOk ? <p className="su-err ah-light">너무 길어요(한글은 한 글자에 3바이트). 조금 줄여 주세요.</p> : null}

                        <LabelField icon="fa-key" stub="#e8ddff" ink="#7457d8">
                            <span className="sr-only">비밀번호 확인</span>
                            <input type={showPw ? "text" : "password"} value={password2} onChange={(e) => setPassword2(e.target.value)} maxLength={72} autoComplete="new-password" placeholder="비밀번호 확인 · 한 번 더" aria-invalid={Boolean(password2) && !matchOk}
                                className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-[#c2b2aa]" />
                            {matchOk ? <span className="ah-display grid shrink-0 place-items-center pr-3 text-[11px] text-[#1f9e75]">같아요</span> : password2 ? <span className="ah-display grid shrink-0 place-items-center pr-3 text-[11px] text-[#d2457a]">달라요</span> : null}
                        </LabelField>
                        {tried && !password2 ? <p className="su-err ah-light">비밀번호를 한 번 더 넣어 주세요.</p> : null}

                        <div className="grid grid-cols-[auto_1fr] gap-2.5 pt-2">
                            <Patch tone="cream" small onClick={() => goTo(features.identity ? "identity" : "terms")}><i aria-hidden="true" className="fa-solid fa-chevron-left text-[11px]" />이전</Patch>
                            <Patch small type="submit" disabled={emailStatus === "checking"} className={accountProblem() ? "su-off" : ""}>다음 · 우리 아이<i aria-hidden="true" className="fa-solid fa-chevron-right text-[11px]" /></Patch>
                        </div>
                    </form>
                </>
            ) : (
                <>
                    {/* ④ 우리 아이 — 지금 / 나중에 고르기 → (지금) 사진 · 정보 · 선택 동의, 그리고 가입 전 마지막 확인 · 보안 확인 */}
                    <p className="ah-light text-[10.5px] tracking-[.16em] text-[#c4567a]">STEP {order.indexOf("pet") + 1} · MY DOG</p>
                    <p className="ah-display mt-0.5 text-[19px] leading-snug"><span className="st-marker">우리 아이</span>도 함께 등록할까요?</p>
                    <p className="ah-light mt-1 text-[12.5px]" style={{ color: TEXT_SOFT }}>사진 한 장만 있어도 견종 · 크기 후보를 찾아 드려요. 지금 안 해도 돼요.</p>
                    <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="우리 아이 등록">
                        {([
                            { key: "now", img: "/images/ui/mypet-view-front-160.webp", title: "지금 등록할게요", sub: "맞춤 추천을 바로 받아요", r: -1 },
                            { key: "later", img: "/images/ui/daily-checkin-256.webp", title: "나중에 할게요", sub: "계정만 먼저 만들어요", r: 1 },
                        ] as const).map((item) => (
                            <button key={item.key} type="button" role="radio" aria-checked={choice === item.key} onClick={() => { haptic("light"); setPetChoice(item.key); }}
                                className={`su-choice relative flex flex-col items-center rounded-[16px] bg-white px-2 pb-3 pt-3.5 text-center ${choice === item.key ? "is-on" : ""}`} style={{ rotate: `${item.r}deg` }}>
                                {choice === item.key ? <i aria-hidden="true" className="fa-solid fa-circle-check absolute right-2 top-2 text-[15px] text-[#f47aa0]" /> : null}
                                <Image src={item.img} alt="" width={56} height={56} className="h-14 w-14 object-contain" />
                                <span className="ah-display mt-1.5 text-[13.5px]">{item.title}</span>
                                <span className="ah-light text-[10.5px]" style={{ color: TEXT_SOFT }}>{item.sub}</span>
                            </button>
                        ))}
                    </div>
                    {tried && !choice ? <div className="mt-3"><Note tone="error">우리 아이를 지금 등록할지 골라 주세요.</Note></div> : null}

                    {choice === "now" ? (
                        <>
                            <p className="ah-light mt-5 text-[12px] leading-relaxed" style={{ color: TEXT_SOFT }}>모바일에서는 카메라가 바로 열립니다. 정면은 대표 사진으로 쓰고, 좌·우·뒷면까지 찍으면 네 방향 사진을 함께 비교해 견종·체형·털색 후보를 더 꼼꼼히 확인합니다.</p>
                            <div className="mt-3 grid grid-cols-4 gap-2">
                                {PET_PHOTO_VIEWS.map((view, i) => {
                                    const photo = petPhotoViews[view.id];
                                    return (
                                        <label key={view.id} className="su-shot flex cursor-pointer flex-col items-center rounded-[10px] bg-white px-1 pb-1.5 pt-1.5" style={{ rotate: `${[-1, 0.8, -0.6, 1][i]}deg` }}>
                                            <span className={`grid aspect-square w-full place-items-center overflow-hidden rounded-[7px] text-[15px] text-[#f08eae] ${photo ? "" : "su-shot-hole"}`}>
                                                {/* eslint-disable-next-line @next/next/no-img-element -- 사용자가 고른 사진 미리보기(dataURL) */}
                                                {photo ? <img src={photo.dataUrl} alt={`${view.label} 반려견 사진`} className="h-full w-full object-cover" /> : <i aria-hidden="true" className="fa-solid fa-camera" />}
                                            </span>
                                            <span className="ah-display mt-1 text-[11.5px]">{view.label}</span>
                                            <span className="ah-light text-[9.5px] leading-tight" style={{ color: TEXT_SOFT }}>{photo ? "다시 선택" : view.helper}</span>
                                            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={photoLoading || loading}
                                                onChange={(e) => { void handlePetPhotoView(view.id, e.target.files?.[0]); e.currentTarget.value = ""; }} />
                                        </label>
                                    );
                                })}
                            </div>
                            {photoLoading ? <p className="ah-display mt-2 text-[12px] text-[#7457d8]"><i aria-hidden="true" className="fa-solid fa-circle-notch fa-spin mr-1" />사진 분석 중</p> : null}
                            {photoError ? <p className="ah-display mt-2 text-[12px] text-[#e0557f]">{photoError}</p> : null}
                            {petAnalysisMessage ? <div className="mt-3"><Note tone="info">{petAnalysisMessage}</Note></div> : null}

                            <div className="su-paper mt-4 grid grid-cols-2 gap-x-3 gap-y-3.5 rounded-[16px] px-4 py-4">
                                <Small label="반려견 이름"><input value={petName} onChange={(e) => setPetName(e.target.value)} className="su-input" /></Small>
                                <Small label="나이" hint="사진으로 나이를 확정하지 않습니다. 직접 입력해 주세요."><input value={petAge} onChange={(e) => setPetAge(e.target.value)} className="su-input" /></Small>
                                <Small label="견종 캐릭터" wide hint={petBreedMessage || "사진 분석 결과는 후보입니다. 120종 캐릭터 또는 목록 외 견종으로 확인해 주세요."}>
                                    <select value={petBreedId} className="su-input"
                                        onChange={(e) => {
                                            const nextBreedId = e.target.value;
                                            setPetBreedId(nextBreedId);
                                            setPetBreedSource(nextBreedId ? "manual" : "");
                                            if (isPetBreedId(nextBreedId)) { const selected = getPetBreedVisual(nextBreedId); setPetBreedCustom(""); setPetBreedMessage(`선택됨: ${selected.ko} · ${selected.en}`); }
                                            else if (nextBreedId === CUSTOM_BREED_OPTION) setPetBreedMessage("목록 외 견종 또는 믹스견 이름을 아래에 직접 입력해 주세요.");
                                            else { setPetBreedCustom(""); setPetBreedMessage(""); }
                                        }}>
                                        <option value="">사진 분석 결과 확인 또는 직접 선택</option>
                                        <option value={CUSTOM_BREED_OPTION}>목록 외 견종 · 믹스견 직접 입력</option>
                                        {PET_BREEDS.map((breed) => <option key={breed.id} value={breed.id}>{breed.ko} · {breed.en}</option>)}
                                    </select>
                                </Small>
                                {petBreedId === CUSTOM_BREED_OPTION ? (
                                    <Small label="실제 견종 또는 믹스견" wide hint="캐릭터 120종에 없어도 회원 프로필에는 실제 견종명을 그대로 저장하며, 나중에 마이페이지에서 수정할 수 있습니다.">
                                        <input value={petBreedCustom} onChange={(e) => { setPetBreedCustom(e.target.value); setPetBreedSource("manual"); }} maxLength={100} placeholder="예: 시바견, 골든두들, 믹스견" className="su-input" />
                                    </Small>
                                ) : null}
                                <Small label="크기" hint="사진 후보가 반영될 수 있으니 실제 크기로 확인해 주세요.">
                                    <select value={petSize} onChange={(e) => setPetSize(e.target.value as PetProfile["size"])} className="su-input">
                                        <option value="small">소형</option><option value="medium">중형</option><option value="large">대형</option>
                                    </select>
                                </Small>
                                <Small label="현재 체중 (kg)" hint={petWeightEstimate ? <span className="text-[#c98a12]">예상 {petWeightEstimate.minKg}~{petWeightEstimate.maxKg}kg · 확인 필요</span> : "사진으로 실제 체중을 측정하지 않습니다."}>
                                    <input type="number" min="0.1" max="120" step="0.1" inputMode="decimal" value={petWeightKg} onChange={(e) => setPetWeightKg(e.target.value)} placeholder="직접 확인한 체중" className="su-input" />
                                </Small>
                                <Small label="모질 길이">
                                    <select value={petCoat} onChange={(e) => setPetCoat(e.target.value as PetProfile["coat"])} className="su-input">
                                        <option value="short">단모</option><option value="medium">중모</option><option value="long">장모</option>
                                    </select>
                                </Small>
                                <Small label="털 색상" hint={petCoatColorSource === "ai" ? <span className="text-[#c98a12]">사진 분석 후보 · 확인 필요</span> : undefined}>
                                    <input value={petCoatColor} onChange={(e) => { setPetCoatColor(e.target.value); setPetCoatColorSource(e.target.value ? "manual" : ""); }} maxLength={80} placeholder="예: 크림, 검정·갈색" className="su-input" />
                                </Small>
                                <Small label="성별" hint="사진으로 성별을 추정하지 않습니다.">
                                    <select value={petSex} onChange={(e) => setPetSex(e.target.value as NonNullable<PetProfile["sex"]>)} className="su-input">
                                        <option value="unknown">선택 안 함</option><option value="female">암컷</option><option value="male">수컷</option>
                                    </select>
                                </Small>
                                <Small label="활동량">
                                    <select value={petActivity} onChange={(e) => setPetActivity(e.target.value as PetProfile["activity"])} className="su-input">
                                        <option value="low">차분한 편</option><option value="normal">보통 활동량</option><option value="high">활동량 많음</option>
                                    </select>
                                </Small>
                                <div className="col-span-2">
                                    <span className="ah-display mb-1.5 block text-[12px] text-[#b07a8a]">관심 케어</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {CONCERN_OPTIONS.map((concern) => {
                                            const on = petConcerns.includes(concern);
                                            return (
                                                <button key={concern} type="button" aria-pressed={on} onClick={() => toggleConcern(concern)} className={`su-chip ah-display rounded-full px-3 py-1.5 text-[12px] ${on ? "is-on" : ""}`}>
                                                    {on ? <i aria-hidden="true" className="fa-solid fa-check mr-1 text-[10px]" /> : null}{concern}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* 선택 동의 — 반려견 정보를 함께 저장할 때만 필요(내용은 속지) */}
                            <div className="su-paper mt-4 rounded-[16px] px-3.5 py-3.5">
                                <ConsentRow checked={agreePetLensPrivacy} onChange={setAgreePetLensPrivacy} onOpen={() => setDoc("petlens")}>{SIGNUP_PETLENS_PRIVACY_CONSENT.title.replace(/^\[선택\]\s*/, "")}</ConsentRow>
                            </div>
                        </>
                    ) : choice === "later" ? (
                        <div className="su-later st-postit relative mt-5 flex items-center gap-3 px-3.5 pb-3 pt-3.5" style={{ background: "#e8ddff", rotate: "-0.6deg" }}>
                            <Tape className="-top-2 left-6 h-3.5 w-11" color="rgba(255,232,170,.92)" style={{ rotate: "-4deg" }} />
                            <Image src="/images/ui/mypet-analysis-256.webp" alt="" width={48} height={48} className="h-12 w-12 shrink-0 object-contain" />
                            <span className="min-w-0 flex-1">
                                <span className="ah-display block text-[13.5px] text-[#563fa8]">마이에서 언제든 등록할 수 있어요</span>
                                <span className="ah-light mt-0.5 block text-[11px] leading-snug text-[#563fa8]">마이 · 우리 아이에서 사진 네 방향과 정보를 넣으면 맞춤 추천과 펫렌즈 분석이 같은 아이를 기준으로 시작돼요.</span>
                            </span>
                        </div>
                    ) : null}

                    {/* 가입 전 마지막 확인 — 민트 메모(누가 · 무엇에 동의 · 우리 아이) + 보안 확인 */}
                    <div className="su-final relative mt-6 rounded-[16px] px-3.5 pb-3.5 pt-4" style={{ rotate: "0.4deg" }}>
                        <span className="st-tape ah-display absolute -top-2.5 left-4 px-2.5 py-0.5 text-[11px] text-[#1f7f5a]" style={{ background: "rgba(200,240,215,.95)", rotate: "-3deg" }}>가입 전 마지막 확인</span>
                        <div className="flex items-center gap-3">
                            <span aria-hidden="true" className="ah-display grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffe1ea] text-[16px] text-[#c4456f]">{(name.trim() || "댕").slice(0, 1)}</span>
                            <span className="min-w-0 flex-1">
                                <span className="ah-display block truncate text-[14px]">{name.trim() || "댕다방 회원"}</span>
                                <span className="ah-light block truncate text-[11.5px]" style={{ color: TEXT_SOFT }}>{email.trim()}</span>
                            </span>
                            <button type="button" onClick={() => goTo("account")} className="ah-display shrink-0 text-[12px] text-[#e0557f] underline underline-offset-2">수정</button>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                            <span className="su-done-chip ah-light"><i aria-hidden="true" className="fa-solid fa-check" />약관 동의</span>
                            {identityVerified ? <span className="su-done-chip ah-light"><i aria-hidden="true" className="fa-solid fa-check" />본인인증</span> : null}
                            {marketing.email || marketing.sms ? <span className="su-done-chip ah-light"><i aria-hidden="true" className="fa-solid fa-check" />마케팅 수신</span> : null}
                            {choice === "now" ? <span className="su-done-chip ah-light"><i aria-hidden="true" className="fa-solid fa-paw" />{petName.trim() || "우리 아이"} 함께 등록</span> : null}
                        </div>
                        <div className="su-bot mt-3">
                            <SignupBotChallenge onTokenChange={setBotToken} resetKey={botResetKey} title="가입 보안 확인" description="자동 가입을 막기 위해 확인해요. 확인이 끝나면 가입하기 버튼이 켜져요." />
                        </div>
                    </div>

                    {/* 갈림길 — 이미 가입된 이메일 · 받지 않는 이메일 · 그 밖 오류 */}
                    {errorKind === "email_taken" ? (
                        <div className="mt-4"><EmailTakenNote email={email} onOther={() => goTo("account")} /></div>
                    ) : errorKind === "email_domain" ? (
                        <div className="mt-4">
                            <Note tone="warn">
                                <b className="ah-display block text-[13px]">이 이메일 주소로는 가입할 수 없어요</b>
                                임시 · 일회용 이메일은 받지 않아요. 실제로 쓰는 다른 이메일을 넣어 주세요.
                                <button type="button" onClick={() => goTo("account")} className="ah-display mt-1.5 block text-[12px] text-[#c4456f] underline underline-offset-2">이메일 바꾸기</button>
                            </Note>
                        </div>
                    ) : error ? <div className="mt-4"><Note tone="error">{error}</Note></div> : null}

                    <div className="mt-5 grid grid-cols-[auto_1fr] gap-2.5">
                        <Patch tone="cream" small onClick={() => goTo("account")}><i aria-hidden="true" className="fa-solid fa-chevron-left text-[11px]" />이전</Patch>
                        <Patch small disabled={!canSubmit} onClick={() => { if (!choice) { setTried(true); haptic("light"); return; } void submit(choice === "now"); }}>
                            {loading ? <><i aria-hidden="true" className="fa-solid fa-circle-notch fa-spin text-[11px]" />가입하는 중</> : <>{choice === "now" ? "우리 아이와 함께 가입" : "가입하기"}<i aria-hidden="true" className="fa-solid fa-user-plus text-[11px]" /></>}
                        </Patch>
                    </div>
                    {!canSubmit && !loading ? (
                        <p className="ah-light mt-2.5 text-center text-[11px]" style={{ color: TEXT_SOFT }}>
                            {!choice ? "우리 아이를 지금 등록할지 먼저 골라 주세요." : !botToken ? "가입 보안 확인이 끝나면 가입하기 버튼이 켜져요." : "잠시만 기다려 주세요."}
                        </p>
                    ) : null}
                </>
            )}
            </div>

            <p className="ah-light mt-6 text-center text-[12.5px]" style={{ color: TEXT_SOFT }}>
                이미 계정이 있다면 <Link href={appLoginHref(redirect)} className="ah-display text-[#e0557f] underline underline-offset-4">로그인</Link>
            </p>

            {/* 약관 · 동의 내용 속지(아래에서 올라오는 시트) — 웹 SxDocModal 과 같은 내용 */}
            <Sheet open={doc !== null} onClose={() => setDoc(null)} label={doc ? DOC_TITLE[doc] : "약관 내용"}
                title={doc ? <span className="ah-display text-[17px]"><span className={`su-badge ${doc === "age14" || doc === "terms" || doc === "privacy" ? "is-req" : ""}`}>{doc === "age14" || doc === "terms" || doc === "privacy" ? "필수" : "선택"}</span> <span className="st-marker">{DOC_TITLE[doc]}</span></span> : null}>
                {doc ? <DocBody kind={doc} /> : null}
                <div className="mt-5"><Patch small onClick={() => setDoc(null)}>확인했어요</Patch></div>
            </Sheet>
        </DiaryBody>,
        // 색인 탭 — 지나온 단계로만 돌아감(앞 단계는 "다음" 버튼의 검사를 거쳐야 함)
        <DiaryTabs tabs={tabs} active={step} onPick={goPick} compact={tabs.length > 5} />,
    );
}

/* ───────── 휴대폰 본인인증 — 웹 IdentityPanel 과 같은 안내 · 결과 갈림길을 스티커북으로(이메일 가입 · 간편 가입이 같이 씀) ─────────
   처음: 이렇게 진행돼요(댕다방 · 인증기관 창 세 단계) · 확인하는 것 · 받는 정보 · 시작 와펜
   결과: 인증 완료(이름 · 생년월일 · 휴대폰 · 통신사) / 이미 가입한 사람 / 만 14세 미만 / 재가입 제한 / 취소 · 시간 초과 · 실패(다시 하기) */
export type IdentityState = { phase: "idle" } | { phase: "busy" } | { phase: "result"; result: IdentityResult };
/** 다음 단계로 갈 수 있는가 — 웹 identityPasses 와 같은 조건 */
export function identityPasses(state: IdentityState) {
    return state.phase === "result" && state.result.status === "verified" && state.result.over14 && !state.result.existingAccount && !state.result.rejoinBlockedUntil;
}
const idDate = (value: string) => value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1. $2. $3");

export function IdentityStep({ state, onStart, onRestart }: { state: IdentityState; onStart: () => void; onRestart: () => void }) {
    // 결과 — 인증 완료 · 갈림길
    if (state.phase === "result" && state.result.status === "verified") {
        const result = state.result;
        if (result.existingAccount) {
            const isEmail = result.existingAccount.provider === "email";
            return (
                <div className="st-postit relative px-3.5 pb-3.5 pt-4" style={{ background: "#ffe1ea", rotate: "-0.5deg" }} data-branch="identity-duplicate">
                    <Tape className="-top-2 left-6 h-3.5 w-11" color="rgba(255,232,170,.92)" style={{ rotate: "-4deg" }} />
                    <div className="flex items-center gap-3">
                        <Image src="/images/ui/stickers/my-profile.webp" alt="" width={44} height={44} className="st-diecut-img h-11 w-11 shrink-0 object-contain" />
                        <span className="min-w-0 flex-1">
                            <span className="ah-light block text-[10.5px] text-[#c4456f]">이미 가입한 사람</span>
                            <span className="ah-display block text-[14.5px] leading-snug">{result.name}님 명의로 가입된 계정이 있어요</span>
                        </span>
                    </div>
                    <p className="ah-display mt-2.5 rounded-full bg-white px-3 py-1.5 text-center text-[12.5px] text-[#7a6a63]">{result.existingAccount.maskedAccount}</p>
                    <p className="ah-light mt-2 text-[11.5px] leading-snug text-[#b0597a]">한 사람은 한 계정만 만들 수 있어요. 쓰던 계정으로 로그인해 주세요.</p>
                    <div className={`mt-3 grid gap-2 ${isEmail ? "grid-cols-2" : "grid-cols-1"}`}>
                        <Patch small href={appLoginHref(null)}>그 계정으로 로그인</Patch>
                        {isEmail ? <Patch small tone="cream" href="/forgot-password/">비밀번호 찾기</Patch> : null}
                    </div>
                    <button type="button" onClick={onRestart} className="ah-display mt-2.5 block w-full text-center text-[12px] text-[#c4456f] underline underline-offset-2">다른 명의로 인증</button>
                </div>
            );
        }
        if (!result.over14 || result.rejoinBlockedUntil) {
            const under14 = !result.over14;
            return (
                <div className="st-postit relative px-3.5 pb-3.5 pt-4" style={{ background: "#f1ece6", rotate: "0.5deg" }} data-branch={under14 ? "identity-under14" : "identity-rejoin"}>
                    <Tape className="-top-2 left-6 h-3.5 w-11" color="rgba(190,224,255,.88)" style={{ rotate: "-4deg" }} />
                    <div className="flex items-center gap-3">
                        <Image src={under14 ? "/images/ui/stickers/login-lock.webp" : "/images/ui/policy-info-192.webp"} alt="" width={44} height={44} className="h-11 w-11 shrink-0 object-contain" />
                        <span className="min-w-0 flex-1">
                            <span className="ah-light block text-[10.5px] text-[#8f7a70]">{under14 ? "만 14세 미만" : "탈퇴 후 다시 가입"}</span>
                            <span className="ah-display block text-[14.5px] leading-snug">{under14 ? "지금은 가입할 수 없어요" : `${idDate(result.rejoinBlockedUntil ?? "")}부터 다시 가입할 수 있어요`}</span>
                        </span>
                    </div>
                    <p className="ah-light mt-2.5 text-[11.5px] leading-snug" style={{ color: TEXT_SOFT }}>
                        {under14 ? "만 14세 미만은 법정대리인(부모님 등)의 동의가 있어야 가입할 수 있어요. 법정대리인 동의 절차를 갖추기 전까지는 가입을 받지 않아요."
                            : "가입 혜택을 여러 번 받는 일을 막기 위해, 탈퇴한 뒤 정해진 기간에는 같은 사람이 다시 가입할 수 없어요."}
                    </p>
                    <div className="mt-3"><Patch small tone="cream" href={under14 ? "/app/home-1/" : "/inquiry/?category=other#inquiry-form"}>{under14 ? "홈으로" : "1:1 문의하기"}</Patch></div>
                </div>
            );
        }
        return (
            <div className="su-idok relative rounded-[16px] px-3.5 pb-3.5 pt-4 text-center" role="status" data-branch="identity-verified">
                <span aria-hidden="true" className="su-idok-big mx-auto grid h-12 w-12 place-items-center rounded-full text-[18px] text-white"><i className="fa-solid fa-check" /></span>
                <p className="ah-light mt-2 text-[10.5px] tracking-[.18em] text-[#1f9e75]">VERIFIED</p>
                <p className="ah-display text-[16px]">본인인증이 끝났어요</p>
                <dl className="mt-3 grid grid-cols-2 gap-1.5 text-left">
                    {[["이름", result.name], ["생년월일", idDate(result.birthDate)], ["휴대폰", result.maskedPhone], ["통신사", result.carrier]].map(([label, value]) => (
                        <div key={label} className="rounded-[10px] bg-white px-2.5 py-1.5">
                            <dt className="ah-light text-[10px]" style={{ color: TEXT_SOFT }}>{label}</dt>
                            <dd className="ah-display truncate text-[13px]">{value}</dd>
                        </div>
                    ))}
                </dl>
                <span className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                    <span className="su-done-chip ah-light"><i aria-hidden="true" className="fa-solid fa-check" />만 14세 이상</span>
                    <span className="su-done-chip ah-light"><i aria-hidden="true" className="fa-solid fa-check" />가입 이력 없음</span>
                </span>
                <button type="button" onClick={onRestart} className="ah-display mt-2.5 text-[12px] text-[#7a6a63] underline decoration-dashed underline-offset-2">다른 명의로 다시 인증</button>
            </div>
        );
    }

    // 취소 · 시간 초과 · 실패 안내 + 처음 안내
    const notice = state.phase === "result" ? (
        state.result.status === "cancelled" ? { title: "본인인증을 취소했어요", text: "가입하려면 본인인증이 필요해요. 준비되면 다시 시작해 주세요." }
            : state.result.status === "expired" ? { title: "인증 시간이 지났어요", text: "보안을 위해 인증 창은 10분 동안만 열려 있어요. 다시 시작해 주세요." }
                : state.result.status === "failed" ? { title: "본인인증을 마치지 못했어요", text: state.result.message || "통신사 확인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }
                    : null
    ) : null;
    const busy = state.phase === "busy";
    const steps: Array<[string, string, string, string]> = [
        ["댕다방", "아래 버튼을 눌러요", "인증기관 창이 새로 열려요.", "#ffe1ea"],
        ["인증기관 창", "통신사를 고르고 정보를 넣어요", "이름 · 생년월일 · 휴대폰 번호를 넣고 문자 또는 PASS 앱으로 인증해요.", "#e3f2fb"],
        ["댕다방", "결과를 확인하고 다음으로", "이름과 휴대폰 번호는 다음 단계에 자동으로 채워져요.", "#ffe1ea"],
    ];
    return (
        <div>
            {notice ? <div className="mb-3"><Note tone="warn"><b className="ah-display block text-[13px]">{notice.title}</b>{notice.text}</Note></div> : null}
            {/* 이렇게 진행돼요 — 번호 스티커 세 줄(누가 하는지 꼬리표) */}
            <div className="su-paper rounded-[16px] px-3.5 py-3.5">
                <p className="ah-display text-[13px] text-[#3d8fb8]"><i aria-hidden="true" className="fa-solid fa-route mr-1 text-[11px]" />이렇게 진행돼요</p>
                <ol className="mt-2.5 space-y-2.5">
                    {steps.map(([owner, title, sub, tone], i) => (
                        <li key={title} className="flex items-start gap-2.5">
                            <span className="ah-display grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] text-[#5a4038]" style={{ background: tone, boxShadow: "0 0 0 2px #fff, 0 3px 6px -3px rgba(90,60,50,.4)" }}>{i + 1}</span>
                            <span className="min-w-0">
                                <span className="ah-light mr-1.5 rounded-full bg-[#f6f1ec] px-1.5 py-px text-[10px] text-[#8f7a70]">{owner}</span>
                                <span className="ah-display text-[13px]">{title}</span>
                                <span className="ah-light mt-0.5 block text-[11px] leading-snug" style={{ color: TEXT_SOFT }}>{sub}</span>
                            </span>
                        </li>
                    ))}
                </ol>
            </div>
            {/* 확인하는 것 · 받는 정보 — 노란 메모 */}
            <div className="st-postit relative mt-4 px-3.5 pb-3 pt-3.5" style={{ background: "#fff3a6", rotate: "-0.4deg" }}>
                <Tape className="-top-2 right-8 h-3.5 w-11" color="rgba(200,240,215,.92)" style={{ rotate: "4deg" }} />
                <p className="ah-display text-[13px]"><i aria-hidden="true" className="fa-solid fa-shield-halved mr-1 text-[11px] text-[#c98a12]" />확인하는 것 · 받는 정보</p>
                <ul className="ah-light mt-1.5 space-y-1 text-[11.5px] leading-snug text-[#8f5e12]">
                    <li><b className="ah-display text-[#6b4708]">중복 가입</b> 이미 가입한 사람인지 확인해요.</li>
                    <li><b className="ah-display text-[#6b4708]">나이</b> 만 14세 이상인지 확인해요.</li>
                    <li><b className="ah-display text-[#6b4708]">받는 정보</b> 이름 · 생년월일 · 성별 · 휴대폰 번호 · 중복가입 확인값(CI/DI). 주민등록번호는 받지 않아요.</li>
                </ul>
            </div>
            {/* 시작 — 하늘 와펜(인증기관 창이 열림) */}
            <div className="mt-4">
                <Patch tone="mint" onClick={onStart} disabled={busy}>
                    {busy ? <><i aria-hidden="true" className="fa-solid fa-circle-notch fa-spin text-[12px]" />인증 창에서 진행하고 있어요</> : <><i aria-hidden="true" className="fa-solid fa-mobile-screen-button text-[13px]" />{notice ? "본인인증 다시 하기" : "휴대폰 본인인증 시작"}</>}
                </Patch>
                <p className="ah-light mt-1.5 text-center text-[10.5px]" style={{ color: TEXT_SOFT }}>{busy ? "창을 닫으면 취소돼요" : "SKT · KT · LG U+ · 알뜰폰 · PASS 앱"}</p>
            </div>
        </div>
    );
}

/* ───────── 동의 한 줄 — 체크 스티커 + 필수/선택 꼬리표 + 내용 보기 ───────── */
function ConsentRow({ checked, onChange, required = false, onOpen, children }: { checked: boolean; onChange: (v: boolean) => void; required?: boolean; onOpen: () => void; children: ReactNode }) {
    return (
        <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
                <CheckRow checked={checked} onChange={onChange}>
                    <span className={`su-badge ${required ? "is-req" : ""}`}>{required ? "필수" : "선택"}</span> {children}
                </CheckRow>
            </div>
            <button type="button" onClick={() => { haptic("light"); onOpen(); }} aria-label={`${typeof children === "string" ? children : "동의"} 내용 보기`}
                className="ah-light mt-0.5 shrink-0 text-[11.5px] text-[#a8968d] underline decoration-dashed underline-offset-2">내용<i aria-hidden="true" className="fa-solid fa-chevron-right ml-0.5 text-[8px]" /></button>
        </div>
    );
}

/* ───────── 간편 가입 공급자 동그라미(카카오 노랑 · 네이버 초록 · 구글 흰) ───────── */
function ProviderMark({ provider, small = false }: { provider: (typeof SOCIAL)[number]; small?: boolean }) {
    const size = small ? "h-9 w-9 text-[14px]" : "h-12 w-12 text-[18px]";
    return (
        <span aria-hidden="true" className={`su-provider grid shrink-0 place-items-center rounded-full ${size}`} style={{ background: provider.bg, color: provider.ink }}>
            {provider.mark.startsWith("fa-") ? <i className={`fa-solid ${provider.mark}`} /> : <b className="font-black">{provider.mark}</b>}
        </span>
    );
}

/* ───────── 이미 가입된 이메일 — 분홍 포스트잇(로그인 · 비밀번호 찾기 · 다른 이메일) ───────── */
function EmailTakenNote({ email, onOther }: { email: string; onOther?: () => void }) {
    return (
        <Note tone="error">
            <b className="ah-display block text-[13px]">{maskEmail(email.trim())} 계정이 이미 있어요</b>
            예전에 가입했다면 로그인해 주세요. 다른 이메일로 새로 가입할 수도 있어요.
            <span className="mt-2 flex flex-wrap gap-2">
                <Link href={appLoginHref(null)} className="ah-display rounded-full bg-white px-3 py-1 text-[12px] text-[#c4456f]">로그인</Link>
                <Link href="/forgot-password/" className="ah-display rounded-full bg-white px-3 py-1 text-[12px] text-[#7a6a63]">비밀번호 찾기</Link>
                {onOther ? <button type="button" onClick={onOther} className="ah-display rounded-full bg-white px-3 py-1 text-[12px] text-[#7a6a63]">다른 이메일로</button> : null}
            </span>
        </Note>
    );
}

/* ───────── 약관 · 동의 내용(속지 본문) — 웹 SxDocModal 과 같은 내용 ───────── */
function DocBody({ kind }: { kind: DocKind }) {
    const rows = (list: ReadonlyArray<{ item: string; purpose: string; retention: string }>) => list.map((row) => (
        <p key={row.item} className="ah-light rounded-[10px] bg-[#fff8ef] px-3 py-2 text-[12px] leading-relaxed" style={{ color: TEXT_SOFT }}>
            <b className="ah-display text-[#7a6a63]">수집 항목</b> {row.item}<br /><b className="ah-display text-[#7a6a63]">이용 목적</b> {row.purpose}<br /><b className="ah-display text-[#7a6a63]">보유 · 이용 기간</b> {row.retention}
        </p>
    ));
    const list = (items: readonly string[]) => (
        <ul className="ah-light mt-2 space-y-1.5 text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>
            {items.map((item) => <li key={item} className="flex gap-1.5"><i aria-hidden="true" className="fa-solid fa-paw mt-1 text-[8px] text-[#f08eae]" />{item}</li>)}
        </ul>
    );
    if (kind === "age14") return (
        <div className="mt-3">
            <p className="ah-display text-[13.5px]">댕다방은 만 14세 이상만 가입할 수 있어요.</p>
            {list(["만 14세 미만은 개인정보를 받을 때 법정대리인(부모님 등)의 동의가 필요해요.", "법정대리인 동의 절차를 갖추기 전까지는 만 14세 미만의 가입을 받지 않아요.", "사실과 다르게 동의한 것이 확인되면 계정 이용이 제한될 수 있어요."])}
        </div>
    );
    if (kind === "terms") return (
        <div className="mt-3">
            <p className="ah-light text-[12.5px]" style={{ color: TEXT_SOFT }}>주요 내용을 먼저 보여 드려요. 전체 약관은 아래에서 볼 수 있어요.</p>
            {list(SIGNUP_TERMS_AGREEMENT.summary)}
            <Link href={SIGNUP_TERMS_AGREEMENT.href} className="ah-display mt-3 inline-block text-[12.5px] text-[#e0557f] underline underline-offset-2">이용약관 전문 보기</Link>
        </div>
    );
    if (kind === "privacy") return (
        <div className="mt-3 space-y-2">
            <p className="ah-light text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>{SIGNUP_REQUIRED_PRIVACY_CONSENT.intro}</p>
            {rows(SIGNUP_REQUIRED_PRIVACY_CONSENT.rows)}
            <p className="ah-light text-[11.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>{SIGNUP_REQUIRED_PRIVACY_CONSENT.refusalNotice}</p>
            <Link href={SIGNUP_REQUIRED_PRIVACY_CONSENT.href} className="ah-display inline-block text-[12.5px] text-[#e0557f] underline underline-offset-2">개인정보처리방침 전문 보기</Link>
        </div>
    );
    if (kind === "marketing") return (
        <div className="mt-3 space-y-2">
            <p className="ah-light text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>새 상품 · 할인 · 이벤트 소식을 이메일이나 문자로 받아요. 동의하지 않아도 가입과 쇼핑은 똑같이 할 수 있어요.</p>
            {rows([{ item: "이메일 주소, 휴대전화번호", purpose: "상품 · 할인 · 이벤트 등 광고성 정보 안내", retention: "동의 철회 또는 회원 탈퇴 시까지" }])}
            <p className="ah-light text-[11.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>동의한 뒤에도 마이에서 언제든 바꿀 수 있고, 처리 결과는 날짜와 함께 알려 드려요.</p>
        </div>
    );
    return (
        <div className="mt-3 space-y-2">
            <p className="ah-light text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>{SIGNUP_PETLENS_PRIVACY_CONSENT.intro}</p>
            {rows(SIGNUP_PETLENS_PRIVACY_CONSENT.rows)}
            <p className="ah-light text-[11.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>{SIGNUP_PETLENS_PRIVACY_CONSENT.refusalNotice}</p>
        </div>
    );
}

/* ───────── 가입 완료 — 이메일 가입 · 간편 가입이 같이 씀(웹 SignupWebDone 과 같은 내용 · 스티커북 모양) ─────────
   가입 혜택(이메일 인증 20C — 앱은 바로 인증 창으로) · 우리 아이(등록 완료 또는 등록하기) · 마케팅 동의 결과 · 이어서 해 보세요 셋 · 시작 단추 */
export function SignupDone({ name, pet, providerLabel, emailNeedsSetup = false, marketingResult, onVerify, finishLabel, onFinish, onLeave }: {
    name: string;
    pet?: PetProfile;
    /** 간편 가입이면 공급자 이름(카카오 등) */
    providerLabel?: string;
    /** 간편 가입에서 이메일을 받지 못함 → 이메일 등록 · 인증 안내 */
    emailNeedsSetup?: boolean;
    /** 마케팅 수신 동의 처리 결과(저장이 연동됐을 때만) */
    marketingResult: { processedAt: string; choice: MarketingChoice } | null;
    onVerify: () => void;
    finishLabel: string;
    onFinish: () => void;
    /** 다른 화면으로 나갈 때(가입 이어 하기 표시 지우기) */
    onLeave: () => void;
}) {
    const sizeLabel = pet ? (pet.size === "small" ? "소형" : pet.size === "large" ? "대형" : "중형") : "";
    const processed = marketingResult ? new Date(marketingResult.processedAt) : null;
    const channels = marketingResult ? [marketingResult.choice.email && "이메일", marketingResult.choice.sms && "문자(SMS)"].filter(Boolean).join(" · ") : "";
    return (
        <>
                <div className="relative flex flex-col items-center text-center">
                    {/* 축하 스티커 — 귀퉁이에 붙인 요일 스티커 셋(장식) */}
                    <Image src="/images/ui/stickers/sticker-mon.webp" alt="" width={44} height={44} aria-hidden="true" className="su-confetti st-diecut-img absolute -left-1 top-0 h-11 w-11" style={{ rotate: "-14deg" }} />
                    <Image src="/images/ui/stickers/sticker-fri.webp" alt="" width={40} height={40} aria-hidden="true" className="su-confetti st-diecut-img absolute right-0 top-6 h-10 w-10" style={{ rotate: "12deg", animationDelay: "120ms" }} />
                    <Image src="/images/ui/daily-hero-treasure-384.webp" alt="" width={132} height={132} aria-hidden="true" className="su-done-art st-diecut-img h-[8.2rem] w-[8.2rem]" />
                    <p className="ah-light mt-1 text-[10.5px] tracking-[.18em] text-[#c4567a]">WELCOME TO DAENGDABANG</p>
                    <h1 className="ah-display mt-1 text-[21px] leading-snug">가입을 환영해요,<br /><span className="st-marker">{name}</span>님!</h1>
                    <p className="ah-light mt-2 text-[12.5px]" style={{ color: TEXT_SOFT }}>{providerLabel ? `다음부터는 ${providerLabel} 버튼 하나로 로그인해요.` : "다음부터는 이메일과 비밀번호로 로그인해요."}</p>
                </div>

                {/* 가입 혜택 · 우리 아이 — 포스트잇 두 장 */}
                <div className="mt-6 space-y-3.5">
                    <button type="button" onClick={() => { haptic("light"); onVerify(); }}
                        className="su-gift-card st-postit relative flex w-full items-center gap-3 px-3.5 pb-3 pt-3.5 text-left" style={{ background: "#fff3a6", rotate: "-0.8deg" }}>
                        <Tape className="-top-2 left-6 h-3.5 w-12" color="rgba(200,226,255,.88)" style={{ rotate: "-4deg" }} />
                        <Image src="/images/ui/goods-pay-ready-256.webp" alt="" width={52} height={52} className="h-[3.2rem] w-[3.2rem] shrink-0 object-contain" />
                        <span className="min-w-0 flex-1">
                            <span className="ah-light block text-[11px] text-[#8f5e12]">가입 혜택</span>
                            <span className="ah-display block text-[15px]">{emailNeedsSetup ? "이메일 등록하고" : "이메일 인증하고"} {SIGNUP_BONUS_COINS}C 받기</span>
                            <span className="ah-light mt-0.5 block text-[11px] leading-snug text-[#8f5e12]">{emailNeedsSetup ? "실제로 쓰는 이메일을 넣고 6자리 번호로 인증하면 바로 들어와요" : "가입 이메일로 보낸 6자리 번호를 넣으면 바로 들어와요"} · 나중에 마이에서도 돼요</span>
                        </span>
                        <i aria-hidden="true" className="fa-solid fa-chevron-right text-[11px] text-[#c79a3a]" />
                    </button>
                    {pet ? (
                        <div className="su-gift-card st-postit relative flex items-center gap-3 px-3.5 pb-3 pt-3.5" style={{ background: "#dcf3e6", rotate: "0.7deg" }}>
                            <Tape className="-top-2 right-8 h-3.5 w-11" color="rgba(255,200,215,.9)" style={{ rotate: "5deg" }} />
                            <span className="st-polaroid relative block w-[3.4rem] shrink-0 bg-white p-1 pb-2" style={{ rotate: "-4deg" }}>
                                <span className="relative block aspect-square overflow-hidden bg-[#f3fbf6]">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- 회원 사진(data URL) 또는 3D 그림 */}
                                    <img src={pet.photoDataUrl || "/images/ui/lab-dog-256.webp"} alt="" className={`absolute inset-0 h-full w-full ${pet.photoDataUrl ? "object-cover" : "object-contain p-1"}`} />
                                </span>
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="ah-light block text-[11px] text-[#1f7f5a]">우리 아이</span>
                                <span className="ah-display block text-[15px]">{pet.name} 등록 완료</span>
                                <span className="ah-light mt-0.5 block text-[11px] text-[#1f7f5a]">{[pet.breed, sizeLabel, pet.age].filter(Boolean).join(" · ")}</span>
                            </span>
                            <i aria-hidden="true" className="fa-solid fa-circle-check text-[16px] text-[#2fb37f]" />
                        </div>
                    ) : (
                        <Link href="/mypage/#pet-profiles" onClick={() => { haptic("light"); onLeave(); }}
                            className="su-gift-card st-postit relative flex items-center gap-3 px-3.5 pb-3 pt-3.5" style={{ background: "#dcf3e6", rotate: "0.7deg" }}>
                            <Tape className="-top-2 right-8 h-3.5 w-11" color="rgba(255,200,215,.9)" style={{ rotate: "5deg" }} />
                            <Image src="/images/ui/lab-dog-256.webp" alt="" width={52} height={52} className="h-[3.2rem] w-[3.2rem] shrink-0 object-contain" />
                            <span className="min-w-0 flex-1">
                                <span className="ah-light block text-[11px] text-[#1f7f5a]">우리 아이</span>
                                <span className="ah-display block text-[15px]">우리 아이 등록하기</span>
                                <span className="ah-light mt-0.5 block text-[11px] text-[#1f7f5a]">마이에서 언제든 등록할 수 있어요</span>
                            </span>
                            <i aria-hidden="true" className="fa-solid fa-chevron-right text-[11px] text-[#4fae84]" />
                        </Link>
                    )}
                </div>

                {/* 마케팅 수신 동의 처리 결과(저장이 연동됐을 때만) */}
                {processed ? (
                    <div className="mt-4"><Note tone="info">마케팅 정보 수신 동의 결과 · 댕다방 · {processed.getFullYear()}년 {processed.getMonth() + 1}월 {processed.getDate()}일 · {channels} 수신에 동의했어요. 마이에서 언제든 바꿀 수 있어요.</Note></div>
                ) : null}

                {/* 이어서 해 보세요 — 오린 스티커 셋 */}
                <p className="ah-display mt-7 text-center text-[13px] text-[#b07a8a]">이어서 해 보세요</p>
                <div className="mt-3 grid grid-cols-3 gap-2.5">
                    {[
                        { href: "/app/sticker/shop/#recommend", img: "/images/ui/hotpick-outdoor-128.webp", label: pet ? `${pet.name} 맞춤 상품` : "맞춤 상품", tone: "#ffe1ea", r: -2 },
                        { href: "/app/sticker/daily/", img: "/images/ui/daily-checkin-256.webp", label: "첫 출석 도장", tone: "#fff1c4", r: 1.5 },
                        { href: "/pet-lens/", img: "/images/ui/header-petlens-128.webp", label: "사진 건강 분석", tone: "#e8ddff", r: -1 },
                    ].map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => { haptic("light"); onLeave(); }}
                            className="su-next3 flex flex-col items-center rounded-[14px] bg-white px-1.5 pb-2.5 pt-3 text-center" style={{ rotate: `${item.r}deg` }}>
                            <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: item.tone }}>
                                <Image src={item.img} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
                            </span>
                            <span className="ah-display mt-1.5 text-[11.5px] leading-tight">{item.label}</span>
                        </Link>
                    ))}
                </div>

                <div className="mt-7"><Patch onClick={onFinish}>{finishLabel}<i aria-hidden="true" className="fa-solid fa-arrow-right text-[13px]" /></Patch></div>
        </>
    );
}

/* 앱 회원가입 CSS */
export const SIGNUP_CSS = `
/* 접는 메모(자세히 보기) — 매일 댕생활과 같은 펼침(지원 브라우저는 높이 자동 늘림) */
.dt-fold { interpolate-size: allow-keywords; height: 0; overflow: hidden; opacity: 0; transition: height .4s cubic-bezier(.2,.9,.2,1), opacity .3s, margin .3s; }
.dt-fold[data-open="true"] { height: auto; opacity: 1; margin-top: 6px; }
/* 종이 판(줄 없음) */
.su-paper { background: #fff; box-shadow: inset 0 0 0 1.5px #f3e6dc, 0 10px 16px -12px rgba(120,80,60,.45); }
/* 손글씨 체크 스티커: 빈 칸은 점선, 체크하면 분홍으로 톡 + 펜 체크 */
.su-check { background: #fff; box-shadow: inset 0 0 0 2px #f2b8c9; transition: transform .35s cubic-bezier(.3,1.6,.5,1), background .2s; }
.su-check.is-on { background: #f47aa0; box-shadow: 0 0 0 2px #fff, 0 3px 6px -3px rgba(200,80,120,.6); transform: rotate(-6deg) scale(1.06); }
/* 라벨 스티커 입력칸 */
.su-label { border-radius: 12px; background: #fff; overflow: hidden; box-shadow: inset 0 0 0 1.5px #f3e3da, 0 7px 12px -9px rgba(150,90,70,.45); transition: box-shadow .2s; }
.su-label:focus-within { box-shadow: inset 0 0 0 2px var(--ink), 0 7px 12px -9px rgba(150,90,70,.45); }
.su-stub { background: var(--stub); color: var(--ink); border-right: 2px dashed rgba(255,255,255,.95); }
.su-label input, .su-input { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; color: #5a4038; }
.su-eye { -webkit-tap-highlight-color: transparent; }
/* 우리 아이 쪽 작은 입력칸 */
.su-input { width: 100%; height: 40px; padding: 0 12px; border-radius: 10px; background: #fffaf5; font-size: 14px; outline: none; box-shadow: inset 0 0 0 1.5px #f3e3da; }
.su-input:focus { box-shadow: inset 0 0 0 2px #f6a9bf; background: #fff; }
/* 사진 4칸 */
.su-shot { box-shadow: 0 8px 12px -9px rgba(120,80,60,.5), inset 0 0 0 1px #f5ebe4; -webkit-tap-highlight-color: transparent; }
.su-shot-hole { background: #fff6f8; outline: 1.5px dashed #f4b6c8; outline-offset: -5px; }
/* 관심 케어 칩 */
.su-chip { background: #fff; color: #7a6a63; box-shadow: inset 0 0 0 1.5px #f3e3da; transition: transform .3s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.su-chip.is-on { background: #ffe1ea; color: #c4456f; box-shadow: inset 0 0 0 1.5px #f6a9bf; }
.su-chip:active { transform: scale(.94); }
/* 알림 포스트잇 · 가입 선물 */
.su-note { animation: hc-pop .35s cubic-bezier(.3,1.6,.5,1) both; }
/* 간편 가입(웹 공용 부품): 받침지 위 동그란 스티커처럼 흰 칼선 */
.su-social a, .su-social button { box-shadow: 0 0 0 3px #fff, 0 6px 10px -6px rgba(90,60,50,.4); }
/* 네이버 "N" 글자(협업자 SocialAuthButtons) — 앱 글꼴(카페24 써라운드)로 */
.su-social span { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; }
/* 이메일 인증 화면 머리 아이콘 */
.su-mail { background: radial-gradient(circle at 35% 30%, #ffb3c8, #e9628c 70%); box-shadow: 0 0 0 4px #fff, 0 10px 16px -8px rgba(200,80,120,.55); rotate: -6deg; animation: hc-pop .45s cubic-bezier(.3,1.6,.5,1) both; }
/* 가입 보안 확인(협업자 SignupBotChallenge) 안내 · 위젯 글자 — 둥근 본문 글꼴(글꼴 두 가지 규칙) */
.su-bot :is(p, span, label, button) { font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; }
/* 인증 메일 그림(사용자 3D 이메일 아이콘) — 동그라미와 같이 살짝 기울여 톡 */
.su-mail-img { rotate: -6deg; filter: drop-shadow(0 8px 8px rgba(200,80,120,.3)); animation: hc-pop .45s cubic-bezier(.3,1.6,.5,1) both; }
/* ── 2026-10-26 웹 단계별 가입과 같은 흐름 — 가입 방법 · 약관 · 계정 · 우리 아이 · 완료 ── */
/* 가입 방법 — 이메일 카드(받침지) · 간편 가입 동그란 스티커 카드, 누르면 꾹 */
.su-way, .su-social-way, .su-choice, .su-next3, .su-gift-card { -webkit-tap-highlight-color: transparent; transition: transform .35s cubic-bezier(.3,1.6,.5,1); }
.su-way:active, .su-social-way:active, .su-next3:active, .su-gift-card:active { transform: scale(.96); }
.su-way-go { background: #ffe1ea; color: #d2457a; }
.su-social-way, .su-next3 { box-shadow: inset 0 0 0 1.5px #f3e6dc, 0 10px 16px -12px rgba(120,80,60,.45); }
.su-provider { box-shadow: 0 0 0 3px #fff, 0 6px 10px -6px rgba(90,60,50,.45); }
/* 약관 — 전체 동의 판(분홍 체크 스티커) · 필수 n/3 도장 · 필수/선택 꼬리표 */
.su-all { background: #fff; box-shadow: inset 0 0 0 1.5px #f3e3da, 0 10px 16px -12px rgba(120,80,60,.45); transition: background .2s, box-shadow .2s; }
.su-all.is-on { background: #fff4f7; box-shadow: inset 0 0 0 2px #f6a9bf, 0 10px 16px -12px rgba(200,80,120,.4); }
.su-stamp { background: #fff6ee; color: #b07a8a; box-shadow: inset 0 0 0 1.5px #f3e3da; rotate: -4deg; }
.su-stamp.is-ok { background: #dcf3e6; color: #1f9e75; box-shadow: inset 0 0 0 1.5px #a8e0c6; }
.su-badge { display: inline-block; margin-right: 4px; padding: 1px 7px; border-radius: 999px; background: #f1ece6; color: #8f7a70; font-size: 10.5px; vertical-align: 1px; }
.su-badge.is-req { background: #ffe1ea; color: #d2457a; }
/* 계정 — 안내 글 · 강도 크레용 세 칸 · 규칙 알약 · 중복 확인 단추 */
.su-err { padding-left: 4px; color: #d2457a; font-size: 11.5px; }
/* 다음 단추 — 필수를 다 채우기 전(웹 sxw-next is-off): 흐리게, 누르면 빠진 것을 알려 줌(잠그지는 않음) */
.st-patch.su-off { opacity: .55; filter: saturate(.7); }
.su-meter { background: #f3e6dc; transition: background .3s; }
.su-meter[data-on="1"] { background: #f6a9bf; }
.su-meter[data-on="2"] { background: #f5c46a; }
.su-meter[data-on="3"] { background: #7fcfa9; }
.su-rule { background: #fff6ee; color: #a8968d; box-shadow: inset 0 0 0 1px #f3e3da; }
.su-rule.is-ok { background: #e6f7ee; color: #1f9e75; box-shadow: inset 0 0 0 1px #b8e6cf; }
.su-rule.is-bad { background: #ffe8ee; color: #d2457a; box-shadow: inset 0 0 0 1px #f6b8c9; }
.su-mini { background: #fff; color: #7a6a63; box-shadow: inset 0 0 0 1.5px #f3e3da, 0 7px 12px -9px rgba(150,90,70,.45); }
/* 우리 아이 — 지금/나중에 고르기(오린 카드, 고르면 분홍 테) · 나중에 메모 · 마지막 확인(민트 메모) */
.su-choice { box-shadow: inset 0 0 0 1.5px #f3e6dc, 0 10px 16px -12px rgba(120,80,60,.45); }
.su-choice.is-on { box-shadow: inset 0 0 0 2.5px #f6a9bf, 0 12px 18px -12px rgba(200,80,120,.45); transform: scale(1.03); }
.su-choice:active { transform: scale(.96); }
.su-final { background: #f1fbf5; box-shadow: inset 0 0 0 1.5px #c8ecd9, 0 10px 16px -12px rgba(60,120,90,.4); }
.su-done-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 999px; background: #fff; color: #1f7f5a; font-size: 11px; box-shadow: inset 0 0 0 1px #c8ecd9; }
.su-done-chip i { font-size: 9px; }
/* 가입 완료 — 보물 상자 톡 · 요일 스티커 톡 */
.su-done-art { rotate: -5deg; animation: hc-pop .5s cubic-bezier(.3,1.6,.5,1) both; }
.su-confetti { animation: hc-pop .45s cubic-bezier(.3,1.6,.5,1) both; }
/* 본인인증 완료 — 민트 메모 · 체크 동그라미 스티커 */
.su-idok { background: #f1fbf5; box-shadow: inset 0 0 0 1.5px #c8ecd9, 0 10px 16px -12px rgba(60,120,90,.4); }
.su-idok-big { background: #3fbf8a; box-shadow: 0 0 0 3px #fff, 0 6px 10px -5px rgba(40,140,100,.55); animation: hc-pop .45s cubic-bezier(.3,1.6,.5,1) both; }
/* 간편 가입 반려견 등록 창(마이와 같은 부품 MemberPetProfileCreateForm) — 남색 단추 · 칸을 앱 결(분홍 알약 · 크림 칸)로 */
.su-petcreate button[class*="bg-indigo"], .su-petcreate button[class*="bg-neutral-9"] { border-radius: 999px; background: #f2789d; color: #fff; font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; box-shadow: inset 0 0 0 2px #d9547d, 0 8px 14px -8px rgba(200,80,120,.6); }
.su-petcreate :is(input, select, textarea) { border-radius: 10px; border-color: #f3e3da; background: #fffaf5; }
.su-petcreate [class*="text-indigo"] { color: #c4456f; }
/* 간편 로그인 처리 중 — 로그인 그림 통통 · 점 세 개 차례로 · 간편 가입 반려견 등록 창(마이와 같은 부품)을 종이 판 안에 */
.su-wait-art { animation: su-bob 1.4s ease-in-out infinite; }
.su-wait-dot { animation: su-dot 1s ease-in-out infinite; }
@keyframes su-bob { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-6px) rotate(3deg); } }
@keyframes su-dot { 0%, 100% { opacity: .35; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.1); } }
@media (prefers-reduced-motion: reduce) { .su-note, .su-mail, .su-mail-img, .su-done-art, .su-confetti, .su-wait-art, .su-wait-dot { animation: none; } }
`;
