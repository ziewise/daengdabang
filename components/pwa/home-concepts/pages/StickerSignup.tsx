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
 * 화면(스티커북 다이어리): 색인 탭 3단계 약속(동의 · 보안 확인) → 계정(간편 가입 · 이메일) → 우리 아이(선택) — 한 쪽씩 짧게.
 *   동의 = 손글씨 체크 스티커 · 자세히 보기는 접는 메모 · 입력칸 = 라벨 스티커 · 사진 = 점선 폴라로이드 4칸 · 버튼 = 자수 와펜.
 */

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { appLoginHref } from "@/components/app-shell/appTabs";
import SignupBotChallenge, { signupTurnstileSiteKey } from "@/components/auth/SignupBotChallenge";
import SignupEmailVerification, { type SignupEmailVerificationResult } from "@/components/auth/SignupEmailVerification";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import { useDdbApiReady } from "@/hooks/useDdbApiReady";
import { customerApiErrorMessage, ddbApiReady, loadPetProfilesSmart, loginCustomer, savePetProfileSmart, setCustomerToken, signupCustomer } from "@/lib/customer-api";
import { analyzePetLensSmart, getPetLensStorefrontCandidates, getPetLensWeightEstimate, type PetLensWeightEstimate } from "@/lib/daengdabang-llm";
import { safeInternalRedirect } from "@/lib/internal-redirect";
import { getPetBreedVisual, isPetBreedId, PET_BREEDS, resolvePetBreedIdExact } from "@/lib/pet-companion-breeds";
import { resizePetPhoto } from "@/lib/pet-photo";
import { petLensPostAuthDestination } from "@/lib/petlens-routing";
import { clearPetLensSignupDraft, loadPetLensSignupDraft, savePetLensSignupDraft } from "@/lib/petlens-signup-draft";
import { SIGNUP_PETLENS_PRIVACY_CONSENT, SIGNUP_PRIVACY_VERSION, SIGNUP_REQUIRED_PRIVACY_CONSENT, SIGNUP_TERMS_AGREEMENT, SIGNUP_TERMS_VERSION } from "@/lib/signup-agreements";
import { clearSignupActivationResume, clearSignupEmailResume, loadSignupActivationResume, loadSignupEmailResume, saveSignupActivationResume, saveSignupEmailResume } from "@/lib/signup-email-verification";
import { useAuth, type PetProfile, type User } from "@/lib/store";
import { trackSignupCompleted } from "@/lib/storefront-analytics";
import { haptic } from "../gestures";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { HC_CSS, SAMPLE } from "../shared";
import { DiaryBody, DiaryTabs, PARTS_CSS } from "../sticker-parts";
import { Patch, STICKER_CSS, Tape } from "../sticker-kit";

const APP_HOME = "/app/home-1/";
/* 색인 탭 = 가입 단계(약속 → 계정 → 우리 아이) — 카페24 글꼴에 동그라미 숫자가 없어 글자만 */
const STEPS = [
    { label: "약속", color: "#ffd6e2" },
    { label: "계정", color: "#fff1b8" },
    { label: "우리 아이", color: "#e8ddff" },
];

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
function LabelField({ icon, stub, ink, children }: { icon: string; stub: string; ink: string; children: ReactNode }) {
    return (
        <label className="su-label flex h-[50px] items-stretch" style={{ ["--stub" as string]: stub, ["--ink" as string]: ink }}>
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
function Note({ tone, children }: { tone: "warn" | "error" | "info"; children: ReactNode }) {
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
    const [dir, setDir] = useState(1);
    const goStep = (i: number) => { setDir(i > step ? 1 : -1); setStep(i); window.scrollTo({ top: 0, behavior: "smooth" }); };

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
    const [openTerms, setOpenTerms] = useState(false);
    const [openPrivacy, setOpenPrivacy] = useState(false);
    const [openPetPrivacy, setOpenPetPrivacy] = useState(false);
    const [botToken, setBotToken] = useState("");
    const [botResetKey, setBotResetKey] = useState(0);
    const apiReady = useDdbApiReady();
    const botChallengeConfigured = Boolean(signupTurnstileSiteKey());
    const requiredConsentsAccepted = agreeTerms && agreePrivacy;
    const signupSecurityReady = botChallengeConfigured && requiredConsentsAccepted && Boolean(botToken);

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

    /* 단계 넘기기 검사 — 약속: 동의 · 보안 확인 / 계정: 이름 · 이메일 · 비밀번호 */
    const nextFromAgree = () => {
        setError("");
        if (!requiredConsentsAccepted) { setError("필수 약관과 개인정보 수집·이용에 동의해 주세요."); haptic("light"); return; }
        if (!botChallengeConfigured) { setError("가입 보안 확인을 준비 중입니다. 잠시 후 다시 이용해 주세요."); haptic("light"); return; }
        if (!botToken) { setError("가입 보안 확인을 완료해 주세요."); haptic("light"); return; }
        goStep(1);
    };
    const nextFromAccount = () => {
        setError("");
        if (!name.trim() || !email.trim()) { setError("이름과 이메일을 입력해 주세요."); haptic("light"); return; }
        if (password.length < 8 || passwordUtf8Bytes(password) > 72) { setError("비밀번호는 8자 이상, 최대 72바이트로 입력해 주세요."); haptic("light"); return; }
        goStep(2);
    };

    /* 가입 — withPet=false 면 반려견 정보 없이(건너뛰기). 그 밖 검사 · 흐름은 웹 가입 화면과 같음 */
    const submit = async (withPet: boolean) => {
        setError("");
        if (!ddbApiReady()) { setCustomerToken(); setError("지금은 회원가입 준비 중입니다. 잠시 후 다시 이용해 주세요."); return; }
        const passwordBytes = passwordUtf8Bytes(password);
        if (password.length < 8 || passwordBytes > 72) { setError("비밀번호는 8자 이상, 최대 72바이트로 입력해 주세요."); goStep(1); return; }
        if (!agreeTerms || !agreePrivacy) { setError("필수 약관과 개인정보 수집·이용에 동의해 주세요."); goStep(0); return; }
        if (!botChallengeConfigured) { setError("가입 보안 확인을 준비 중입니다. 잠시 후 다시 이용해 주세요."); return; }
        if (!botToken) { setError("가입 보안 확인을 완료해 주세요."); goStep(0); return; }
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
                clearPetLensSignupDraft();
                if (pets[0]) savePetLensSignupDraft(pets[0]);
                setCustomerToken();
                clearSignupEmailResume();
                saveSignupActivationResume({
                    phase: "pending_email", email: apiUser.email, name: apiUser.name || name.trim() || "댕다방 회원",
                    apiUserId: apiUser.id, returnTo: destination, createdAt, activationToken, activationExpiresAt,
                });
                setPendingVerification({
                    kind: "activation", apiUserId: apiUser.id, name: apiUser.name || name.trim() || "댕다방 회원", email: apiUser.email,
                    destination, pets, verified: false, activationToken, activationExpiresAt,
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
            clearPetLensSignupDraft();
            clearSignupActivationResume();
            saveSignupEmailResume({ source: "email", returnTo: confirmedDestination });
            haptic("medium");
            setPendingVerification({ kind: "bonus", member, destination: confirmedDestination });
        } catch (err) {
            setCustomerToken();
            setBotToken("");
            setBotResetKey((value) => value + 1);
            setError(customerApiErrorMessage(err));
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
            clearPetLensSignupDraft();
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
    const frame = (body: ReactNode, tabs?: ReactNode) => (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + SIGNUP_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">{tabs}{body}</div>
        </div>
    );

    /* ───────── 이메일 인증 화면들(가입 뒤) ───────── */
    if (pendingVerification) {
        const verifyTitle = pendingVerification.kind === "bonus" ? "가입 완료!" : pendingVerification.verified ? "이메일 확인 완료" : "회원가입 이메일 확인";
        const verifyBody = pendingVerification.kind === "bonus"
            ? "계정 가입은 완료되었습니다. 가입 이메일로 자동 발송된 6자리 인증번호를 확인하면 신규 가입 혜택 20C를 받을 수 있어요."
            : pendingVerification.verified
                ? "이메일이 확인되었습니다. 안전하게 계정 이용을 시작하기 위해 가입 때 입력한 비밀번호로 로그인해 주세요."
                : "이메일 확인을 마쳐야 계정 이용이 시작됩니다. 확인 전에는 로그인 정보나 회원 프로필을 저장하지 않습니다.";
        return frame(
            <DiaryBody pageKey={`verify-${pendingVerification.kind}-${pendingVerification.kind === "activation" && pendingVerification.verified}`} dir={1}>
                <div className="flex flex-col items-center text-center">
                    {pendingVerification.kind === "bonus"
                        ? <span className="su-mail grid h-16 w-16 place-items-center rounded-full text-[26px] text-white"><i aria-hidden="true" className="fa-solid fa-gift" /></span>
                        : <Image src="/images/ui/stickers/inquiry-email.webp" alt="" width={72} height={72} className="su-mail-img h-[4.5rem] w-[4.5rem]" />}
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
                    </div>
                )}
            </DiaryBody>,
        );
    }

    /* ───────── 가입 단계 ───────── */
    return frame(
        <DiaryBody pageKey={step} dir={dir}>
            <h1 className="sr-only">회원가입</h1>
            {apiReady === false ? <div className="mb-4"><Note tone="warn">지금은 회원가입 준비 중입니다. 잠시 후 다시 이용해 주세요.</Note></div> : null}
            {error ? <div className="mb-4"><Note tone="error">{error}</Note></div> : null}

            {step === 0 ? (
                <>
                    {/* 약속 — 가입 선물 포스트잇 · 필수 동의 2개(체크 스티커 + 접는 메모) · 보안 확인 */}
                    <p className="ah-display text-[19px] leading-snug"><span className="st-marker">먼저 약속해요</span></p>
                    <p className="ah-light mt-1 text-[12.5px]" style={{ color: TEXT_SOFT }}>두 가지 필수 동의와 보안 확인 후 가입 방법을 선택해 주세요.</p>
                    <div className="su-gift st-postit relative mt-4 flex items-center gap-3 px-3.5 pb-3 pt-3.5" style={{ background: "#fff3a6", rotate: "-0.6deg" }}>
                        <Tape className="-top-2 left-1/2 h-3.5 w-12 -translate-x-1/2" color="rgba(200,226,255,.85)" style={{ rotate: "3deg" }} />
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff3b0,#ffc93d_55%,#e9a514)] text-[13px] font-black text-[#7a4b00]">C</span>
                        <span className="min-w-0 flex-1">
                            <span className="ah-display block text-[14px]">신규 가입 혜택 · {SAMPLE.signupBonus}C <span className="ah-light text-[11.5px] text-[#8f5e12]">행동·소리 분석 2회</span></span>
                            <span className="ah-light mt-0.5 block text-[11px] leading-snug text-[#8f5e12]">가입 이메일 인증 완료 후 자동 지급됩니다. 반복 가입 등 부정 수령이 확인되면 코인이 회수되거나 이용이 제한될 수 있습니다.</span>
                        </span>
                    </div>

                    <div className="su-paper mt-5 space-y-3 rounded-[16px] px-4 py-4">
                        <div>
                            <CheckRow checked={agreeTerms} onChange={setAgreeTerms}>
                                {SIGNUP_TERMS_AGREEMENT.title} <Link href={SIGNUP_TERMS_AGREEMENT.href} className="ah-light text-[12px] text-[#e0557f] underline underline-offset-2">전체보기</Link>
                            </CheckRow>
                            <button type="button" onClick={() => setOpenTerms((v) => !v)} className="ah-light ml-[34px] mt-1 text-[11.5px] text-[#a8968d] underline decoration-dashed underline-offset-2">주요 내용 {openTerms ? "접기" : "보기"}</button>
                            <ul className="dt-fold ah-light ml-[34px] space-y-1 text-[11.5px] leading-relaxed" data-open={openTerms} style={{ color: TEXT_SOFT }}>
                                {SIGNUP_TERMS_AGREEMENT.summary.map((item) => <li key={item}>· {item}</li>)}
                            </ul>
                        </div>
                        <div>
                            <CheckRow checked={agreePrivacy} onChange={setAgreePrivacy}>
                                {SIGNUP_REQUIRED_PRIVACY_CONSENT.title} <Link href={SIGNUP_REQUIRED_PRIVACY_CONSENT.href} className="ah-light text-[12px] text-[#e0557f] underline underline-offset-2">처리방침 보기</Link>
                            </CheckRow>
                            <button type="button" onClick={() => setOpenPrivacy((v) => !v)} className="ah-light ml-[34px] mt-1 text-[11.5px] text-[#a8968d] underline decoration-dashed underline-offset-2">수집 항목·이용 목적·보유기간 {openPrivacy ? "접기" : "보기"}</button>
                            <div className="dt-fold ml-[34px] space-y-1.5 text-[11.5px]" data-open={openPrivacy}>
                                <p className="ah-light leading-relaxed" style={{ color: TEXT_SOFT }}>{SIGNUP_REQUIRED_PRIVACY_CONSENT.intro}</p>
                                {SIGNUP_REQUIRED_PRIVACY_CONSENT.rows.map((row) => (
                                    <p key={row.item} className="ah-light rounded-[10px] bg-[#fff8ef] px-2.5 py-2 leading-relaxed" style={{ color: TEXT_SOFT }}>
                                        <b className="ah-display text-[#7a6a63]">수집 항목</b> {row.item}<br /><b className="ah-display text-[#7a6a63]">이용 목적</b> {row.purpose}<br /><b className="ah-display text-[#7a6a63]">보유기간</b> {row.retention}
                                    </p>
                                ))}
                                <p className="ah-light text-[11px] leading-relaxed" style={{ color: TEXT_SOFT }}>{SIGNUP_REQUIRED_PRIVACY_CONSENT.refusalNotice}</p>
                            </div>
                        </div>
                    </div>
                    <div className="su-bot mt-4">
                        <SignupBotChallenge onTokenChange={setBotToken} resetKey={botResetKey} />
                    </div>
                    <div className="mt-5">
                        <Patch onClick={nextFromAgree} disabled={!requiredConsentsAccepted}>다음 · 가입 방법 고르기<i aria-hidden="true" className="fa-solid fa-chevron-right text-[12px]" /></Patch>
                    </div>
                </>
            ) : step === 1 ? (
                <>
                    {/* 계정 — 간편 가입(받침지 위 스티커) 또는 이메일(라벨 스티커 입력칸) */}
                    <p className="ah-display text-[19px] leading-snug"><span className="st-marker">계정을 만들어요</span></p>
                    <div className="st-sheet relative mt-5 rounded-[16px] px-4 pb-4 pt-5" style={{ rotate: "-0.6deg" }}>
                        <span className="st-tape ah-display absolute -top-2.5 left-4 px-2.5 py-0.5 text-[11px] text-[#c4567a]" style={{ background: "rgba(255,214,228,.9)", rotate: "-3deg" }}>간편 가입</span>
                        <div className="su-social">
                            <SocialAuthButtons mode="signup" variant="compact" returnTo={back}
                                signupSecurity={{ botToken, requiredConsentsAccepted, termsVersion: SIGNUP_TERMS_VERSION, privacyVersion: SIGNUP_PRIVACY_VERSION }} />
                        </div>
                    </div>
                    <p className="ah-display mb-3 mt-6 flex items-center justify-center gap-2 text-[12px] text-[#c4567a]">
                        <i aria-hidden="true" className="fa-solid fa-paw text-[9px] opacity-60" />이메일로 가입<i aria-hidden="true" className="fa-solid fa-paw text-[9px] opacity-60" />
                    </p>
                    <div className="space-y-3">
                        <LabelField icon="fa-user" stub="#d9f2e4" ink="#1f9e75">
                            <span className="sr-only">이름</span>
                            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="이름" className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-[#c2b2aa]" />
                        </LabelField>
                        <LabelField icon="fa-envelope" stub="#ffe1ea" ink="#d2457a">
                            <span className="sr-only">이메일</span>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="이메일" className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-[#c2b2aa]" />
                        </LabelField>
                        <LabelField icon="fa-lock" stub="#fff1c4" ink="#c98a12">
                            <span className="sr-only">비밀번호</span>
                            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={72} autoComplete="new-password" placeholder="비밀번호 · 8자 이상·최대 72바이트"
                                className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-[#c2b2aa]" />
                            <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"} className="su-eye grid w-11 shrink-0 place-items-center text-[13px] text-[#b8a59c]">
                                <i aria-hidden="true" className={`fa-solid ${showPw ? "fa-eye-slash" : "fa-eye"}`} />
                            </button>
                        </LabelField>
                    </div>
                    <div className="mt-5 grid grid-cols-[auto_1fr] gap-2.5">
                        <Patch tone="cream" small onClick={() => goStep(0)}><i aria-hidden="true" className="fa-solid fa-chevron-left text-[11px]" />이전</Patch>
                        <Patch small onClick={nextFromAccount}>다음 · 우리 아이(선택)<i aria-hidden="true" className="fa-solid fa-chevron-right text-[11px]" /></Patch>
                    </div>
                </>
            ) : (
                <>
                    {/* 우리 아이(선택) — 4방향 사진 폴라로이드 · 분석 후보 메모 · 정보 · 관심 케어 · 선택 동의 */}
                    <p className="ah-display text-[19px] leading-snug"><span className="st-marker">우리 아이도 소개해 주세요</span> <span className="ah-light text-[12px]" style={{ color: TEXT_SOFT }}>(선택)</span></p>
                    <p className="ah-light mt-1 text-[12px] leading-relaxed" style={{ color: TEXT_SOFT }}>모바일에서는 카메라가 바로 열립니다. 정면은 대표 사진으로 쓰고, 좌·우·뒷면까지 찍으면 네 방향 사진을 함께 비교해 견종·체형·털색 후보를 더 꼼꼼히 확인합니다.</p>
                    <div className="mt-4 grid grid-cols-4 gap-2">
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

                    {/* 선택 동의 — 반려견 정보를 함께 저장할 때만 필요 */}
                    <div className="su-paper mt-4 rounded-[16px] px-4 py-3.5">
                        <CheckRow checked={agreePetLensPrivacy} onChange={setAgreePetLensPrivacy}>{SIGNUP_PETLENS_PRIVACY_CONSENT.title}</CheckRow>
                        <button type="button" onClick={() => setOpenPetPrivacy((v) => !v)} className="ah-light ml-[34px] mt-1 text-[11.5px] text-[#a8968d] underline decoration-dashed underline-offset-2">자세히 {openPetPrivacy ? "접기" : "보기"}</button>
                        <div className="dt-fold ml-[34px] space-y-1.5 text-[11.5px]" data-open={openPetPrivacy}>
                            <p className="ah-light leading-relaxed" style={{ color: TEXT_SOFT }}>{SIGNUP_PETLENS_PRIVACY_CONSENT.intro}</p>
                            {SIGNUP_PETLENS_PRIVACY_CONSENT.rows.map((row) => (
                                <p key={row.item} className="ah-light rounded-[10px] bg-[#f6f2ff] px-2.5 py-2 leading-relaxed" style={{ color: TEXT_SOFT }}>
                                    <b className="ah-display text-[#7a6a63]">수집 항목</b> {row.item}<br /><b className="ah-display text-[#7a6a63]">이용 목적</b> {row.purpose}<br /><b className="ah-display text-[#7a6a63]">보유기간</b> {row.retention}
                                </p>
                            ))}
                            <p className="ah-light text-[11px] leading-relaxed" style={{ color: TEXT_SOFT }}>{SIGNUP_PETLENS_PRIVACY_CONSENT.refusalNotice}</p>
                        </div>
                    </div>

                    <div className="mt-5 space-y-2.5">
                        <Patch onClick={() => void submit(true)} disabled={photoLoading || loading || apiReady !== true || !signupSecurityReady}>
                            {loading ? "가입 처리 중" : "가입하고 이메일 인증"}<i aria-hidden="true" className="fa-solid fa-user-plus text-[13px]" />
                        </Patch>
                        <div className="grid grid-cols-[auto_1fr] gap-2.5">
                            <Patch tone="cream" small onClick={() => goStep(1)}><i aria-hidden="true" className="fa-solid fa-chevron-left text-[11px]" />이전</Patch>
                            <Patch tone="cream" small onClick={() => void submit(false)} disabled={loading || apiReady !== true || !signupSecurityReady}>우리 아이는 나중에 등록</Patch>
                        </div>
                    </div>
                </>
            )}

            <p className="ah-light mt-6 text-center text-[12.5px]" style={{ color: TEXT_SOFT }}>
                이미 계정이 있다면 <Link href={appLoginHref(redirect)} className="ah-display text-[#e0557f] underline underline-offset-4">로그인</Link>
            </p>
        </DiaryBody>,
        // 색인 탭은 자유롭게 넘겨 보기 — "다음" 버튼은 단계 검사, 실제 가입(submit)은 동의 · 보안 확인 · 비밀번호를 다시 모두 검사
        <DiaryTabs tabs={STEPS} active={step} onPick={goStep} />,
    );
}

/* 앱 회원가입 CSS */
const SIGNUP_CSS = `
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
/* 이메일 인증 화면 머리 아이콘 */
.su-mail { background: radial-gradient(circle at 35% 30%, #ffb3c8, #e9628c 70%); box-shadow: 0 0 0 4px #fff, 0 10px 16px -8px rgba(200,80,120,.55); rotate: -6deg; animation: hc-pop .45s cubic-bezier(.3,1.6,.5,1) both; }
/* 인증 메일 그림(사용자 3D 이메일 아이콘) — 동그라미와 같이 살짝 기울여 톡 */
.su-mail-img { rotate: -6deg; filter: drop-shadow(0 8px 8px rgba(200,80,120,.3)); animation: hc-pop .45s cubic-bezier(.3,1.6,.5,1) both; }
@media (prefers-reduced-motion: reduce) { .su-note, .su-mail, .su-mail-img { animation: none; } }
`;
