"use client";

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    analyzePetLensSmart,
    reconcilePetLensResultWithConfirmedProfile,
    type PetLensAnalysisResult,
} from "@/lib/daengdabang-llm";
import { savePetProfileSmart } from "@/lib/customer-api";
import {
    buildPetLensAnalysisImage,
    PETLENS_PHOTO_VIEWS,
    petLensPhotoViewCount,
    petLensPhotoViewMetadata,
    persistPetLensPhotoViews,
    preparePetLensPhotoCapture,
    primaryPetLensPhotoEntry,
    restorePetLensPhotoViews,
    type PetLensPhotoCaptures,
    type PetLensPhotoViewId,
} from "@/lib/petlens-multiview";
import { hasVerifiedPetPhoto, useAuth, useStore, type PetProfile } from "@/lib/store";
import ProductCard from "@/components/products/ProductCard";
import PetLensAnalysisSummary from "@/components/petlens/PetLensAnalysisSummary";
import PetLensMemberGate from "@/components/petlens/PetLensMemberGate";
import PetLensModeTabs, { type PetLensMode } from "@/components/petlens/PetLensModeTabs";
import PetLensObservationExperience from "@/components/petlens/PetLensObservationExperience";
import DaengLabServiceTitle from "@/components/petlens/DaengLabServiceTitle";
import DaengLabSymbol from "@/components/petlens/DaengLabSymbol";
import PetLensPetSelector from "@/components/petlens/PetLensPetSelector";
import { CrayonGrainFilter, PawTrail } from "@/components/daily/CrayonArt";
import { getPetBreedVisual, resolvePetBreedId } from "@/lib/pet-companion-breeds";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import {
    loadPetObservationJobStatus,
    PetObservationRequestError,
    type PetObservationJobStatus,
} from "@/lib/petlens-observation";
import {
    cleanPetLensProfileId,
    cleanPetLensObservationRequestId,
    petLensAuthHref,
    petLensObservationHref,
} from "@/lib/petlens-routing";
import {
    buildPetLensProfileForSave,
    mergeSavedPetLensProfile,
} from "@/lib/petlens-profile-persistence";

const CONCERN_OPTIONS = ["눈 보호", "피부/발바닥 케어", "체중 관리", "산책 안전", "놀이/분리불안"];

const PETLENS_OBSERVATION_LOCATION_CHANGE = "ddb:petlens-observation-location-change";
const subscribeToObservationLocation = (notify: () => void) => {
    if (typeof window === "undefined") return () => {};
    const hydrationTimer = window.setTimeout(notify, 0);
    window.addEventListener("popstate", notify);
    window.addEventListener("hashchange", notify);
    window.addEventListener(PETLENS_OBSERVATION_LOCATION_CHANGE, notify);
    return () => {
        window.clearTimeout(hydrationTimer);
        window.removeEventListener("popstate", notify);
        window.removeEventListener("hashchange", notify);
        window.removeEventListener(PETLENS_OBSERVATION_LOCATION_CHANGE, notify);
    };
};
const getServerObservationRequestId = () => "";
const getClientObservationRequestId = () => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("observation")?.slice(0, 256) || "";
};

type ObservationDeepLinkState = "idle" | "resolving" | "processing" | "found" | "invalid" | "not_found" | "profile_unavailable" | "cancelled" | "failed";

function ObservationDeepLinkNotice({
    state,
    message,
    recoveryHref,
}: {
    state: ObservationDeepLinkState;
    message: string;
    recoveryHref?: string;
}) {
    const pending = state === "resolving" || state === "processing";
    const cancelled = state === "cancelled";
    return (
        <div
            className={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 ${
                pending
                    ? "border-indigo-200 bg-indigo-50 text-indigo-950"
                    : cancelled
                        ? "border-amber-200 bg-amber-50 text-amber-950"
                        : "border-rose-200 bg-rose-50 text-rose-950"
            }`}
            role={pending ? "status" : "alert"}
            aria-live="polite"
            data-petlens-observation-deep-link={state}
        >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80" aria-hidden="true">
                <i className={`fa-solid ${pending ? "fa-circle-notch fa-spin" : cancelled ? "fa-rotate-left" : "fa-circle-exclamation"}`} />
            </span>
            <div className="min-w-0">
                <p className="text-sm font-black">
                    {state === "resolving"
                        ? "분석 기록 확인 중"
                        : state === "processing"
                            ? "분석 진행 중"
                            : cancelled
                                ? "취소된 분석"
                                : "분석 기록 안내"}
                </p>
                <p className="mt-1 break-keep text-xs font-bold leading-5 opacity-80">{message}</p>
                {recoveryHref && (
                    <Link
                        href={recoveryHref}
                        className="mt-3 inline-flex min-h-12 items-center justify-center rounded-xl border border-current bg-white px-4 text-xs font-black shadow-sm transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                        다른 계정으로 다시 로그인
                    </Link>
                )}
            </div>
        </div>
    );
}

function clearObservationDeepLink() {
    const url = new URL(window.location.href);
    url.searchParams.delete("observation");
    const search = url.searchParams.toString();
    window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${search ? `?${search}` : ""}${url.hash}`,
    );
    window.dispatchEvent(new Event(PETLENS_OBSERVATION_LOCATION_CHANGE));
}

type Result = PetLensAnalysisResult;

// 웹 연구소 페이지 틀(2026-10-23) — 기록 결 꾸밈 범위(data-daily-web · data-lab-web, 앱에서는 꾸밈 없음) + 크레파스 결 필터.
// 꾸밈 CSS 는 app/daily-web.css(공용 기록 결) · app/lab-web.css(연구소 전용)
function LabMain({ children }: { children: React.ReactNode }) {
    return (
        <main className="mx-auto w-full max-w-[1280px] px-4 py-8 md:px-6" data-daily-web data-lab-web>
            <CrayonGrainFilter />
            {children}
        </main>
    );
}

// 사진 칸 그림(우리 아이 기록 카메라와 같은 방향 그림) — 웹 연구소에서만 보이고 앱에서는 숨김(lab-web.css)
const LAB_VIEW_ART = {
    front: "/images/ui/mypet-view-front-160.webp",
    left: "/images/ui/mypet-view-left-160.webp",
    right: "/images/ui/mypet-view-right-160.webp",
    back: "/images/ui/mypet-view-back-160.webp",
} as const;

// 머리 판 안 고르기 줄(웹) — 분석할 아이(견종 그림 알약, 프로필 · 견종이 있는 아이만) · 분석 종류(그림 알약 둘).
// 기존 selectPetProfile · setMode 를 그대로 부름. 앱에서는 원래 PetLensPetSelector · PetLensModeTabs 가 보인다.
const BREED_ART_ROOT = "/images/pet-companion/cute-v4-breeds";
function LabHeroControls({
    pets,
    selectedPetProfileId,
    disabled,
    onSelectPet,
    mode,
    onMode,
}: {
    pets: PetProfile[];
    selectedPetProfileId?: number;
    disabled: boolean;
    onSelectPet: (petProfileId: number) => void;
    mode: PetLensMode;
    onMode: (mode: PetLensMode) => void;
}) {
    return (
        <>
            {pets.length > 1 ? (
                <div className="lab-pet-pills" role="group" aria-label="분석할 반려견">
                    {pets.map((pet, index) => {
                        const ready = Boolean(pet.apiProfileId && pet.breed?.trim());
                        const active = pet.apiProfileId === selectedPetProfileId;
                        const art = `${BREED_ART_ROOT}/${getPetBreedVisual(resolvePetBreedId(pet.breed || "")).assetId}-core.webp`;
                        return (
                            <button
                                key={pet.apiProfileId ? `pet-${pet.apiProfileId}` : `unsaved-pet-${index}`}
                                type="button"
                                disabled={disabled || !ready}
                                aria-pressed={active}
                                onClick={() => { if (pet.apiProfileId) onSelectPet(pet.apiProfileId); }}
                                className={`lab-pet-pill ${active ? "is-on" : ""}`}
                                title={ready ? undefined : "견종 확인 필요"}
                            >
                                {pet.photoDataUrl
                                    ? <span className="lab-pet-face"><Image src={pet.photoDataUrl} alt="" fill sizes="34px" className="object-cover" unoptimized /></span>
                                    : <span className="lab-pet-face is-breed" style={{ backgroundImage: `url("${art}")` }} aria-hidden="true" />}
                                {pet.name || `반려견 ${index + 1}`}
                                <small>{pet.breed?.trim() || "견종 확인 필요"}</small>
                            </button>
                        );
                    })}
                </div>
            ) : null}
            <div className="lab-mode-pills" role="group" aria-label="분석 종류">
                <button type="button" aria-pressed={mode === "photo"} onClick={() => onMode("photo")} className={mode === "photo" ? "is-on" : ""}>
                    <Image src="/images/ui/lab-tab-photo-160.webp" alt="" width={32} height={32} aria-hidden="true" />사진 건강 분석
                </button>
                <button type="button" aria-pressed={mode === "observation"} onClick={() => onMode("observation")} className={mode === "observation" ? "is-on" : ""}>
                    <Image src="/images/ui/lab-tab-observation-160.webp" alt="" width={32} height={32} aria-hidden="true" />행동 · 소리 분석
                </button>
            </div>
        </>
    );
}

// 연구소 머리 판 — 사진 분석 = 연보라 쿠션 + 카메라 그림, 행동·소리 = 하늘 쿠션 + 연구하는 강아지 그림(무지개 고리).
// 웹에서만 보이고 앱에서는 아래 원래 머리글(lab-legacy-head)이 보인다.
function LabHero({ mode, controls }: { mode: PetLensMode; controls?: React.ReactNode }) {
    const observation = mode === "observation";
    return (
        <section className={`dw-csheet ${observation ? "is-sky" : "is-lav"} dw-chero lab-hero ${controls ? "is-compact" : ""} hidden`} aria-labelledby="lab-hero-title">
            <div className="min-w-0">
                <p className="ddb-crayon-kicker dw-kicker">{observation ? "DAENGDABANG LAB · BEHAVIOR & SOUND" : "DAENGDABANG LAB · PETLENS"}</p>
                <h1 id="lab-hero-title" className="ddb-crayon-title dw-h1">
                    {observation ? (
                        <>행동 · 소리로 읽는{controls ? " " : <br />}<span className="ddb-crayon-underline">우리 아이 신호</span></>
                    ) : (
                        <>네 방향 사진으로 보는{controls ? " " : <br />}<span className="ddb-crayon-underline">우리 아이 오늘</span></>
                    )}
                </h1>
                {controls ? <div className="lab-hero-controls">{controls}</div> : (
                <>
                <p className="dw-lead">
                    {observation
                        ? "카메라·마이크로 포착한 행동과 소리를 함께 살펴 우리 아이의 관찰 포인트를 정리합니다."
                        : "회원가입 때 확인한 견종과 생활 정보를 기준으로, 네 방향 사진에서 현재 외형·체형·털 상태와 케어 포인트를 정리해 드립니다."}
                </p>
                <ul className="lab-hero-chips">
                    {(observation
                        ? ["카메라 + 마이크", "아이별 개별 분석", "행동 · 소리 · 건강 신호"]
                        : ["정면 · 왼쪽 · 오른쪽 · 뒷면", "회원 견종 기준", "외형 · 체형 · 털 상태"]
                    ).map((chip) => <li key={chip} className="dw-chip">{chip}</li>)}
                </ul>
                </>
                )}
            </div>
            <span className={`dw-rring dw-chero-ring ${observation ? "lab-ring-photo" : ""}`} aria-hidden="true">
                <span>
                    <Image
                        src={observation ? "/images/ui/lab-researcher-384.webp" : "/images/ui/mypet-analysis-camera-384.webp"}
                        alt=""
                        width={230}
                        height={230}
                        priority
                    />
                </span>
            </span>
        </section>
    );
}

export default function PetLensClient() {
    const queryString = useSearchParams().toString();
    const { user, upsertPet } = useAuth();
    const { hydrated } = useStore();
    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [size, setSize] = useState<PetProfile["size"]>("medium");
    const [coat, setCoat] = useState<PetProfile["coat"]>("medium");
    const [activity, setActivity] = useState<PetProfile["activity"]>("normal");
    const [concerns, setConcerns] = useState<string[]>(["산책 안전"]);
    const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
    const [photoViews, setPhotoViews] = useState<PetLensPhotoCaptures>({});
    const [result, setResult] = useState<Result | null>(null);
    const [analysisError, setAnalysisError] = useState("");
    const [loading, setLoading] = useState(false);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [mode, setMode] = useState<PetLensMode>("photo");
    const [editingPetProfileId, setEditingPetProfileId] = useState<number | undefined>();
    const [observationDeepLinkState, setObservationDeepLinkState] = useState<ObservationDeepLinkState>("idle");
    const [observationDeepLinkMessage, setObservationDeepLinkMessage] = useState("");
    const [observationDeepLinkJob, setObservationDeepLinkJob] = useState<PetObservationJobStatus | null>(null);
    const photoViewsRef = useRef<PetLensPhotoCaptures>({});
    const photoCaptureInFlight = useRef(false);
    const editingOwnerKeyRef = useRef(user?.apiUserId ? `id:${user.apiUserId}` : user?.email || "");
    const hydratedPetProfileIdRef = useRef<number | undefined>(undefined);
    const handledObservationRequestIdRef = useRef("");
    const rawObservationRequestId = useSyncExternalStore(
        subscribeToObservationLocation,
        getClientObservationRequestId,
        getServerObservationRequestId,
    );
    const observationRequestId = cleanPetLensObservationRequestId(rawObservationRequestId);
    const observationReturnTo = observationRequestId
        ? petLensObservationHref(observationRequestId)
        : mode === "observation" ? "/pet-lens?mode=observation" : undefined;

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const queryMode = query.get("mode");
        const queryObservation = query.get("observation");
        const hash = window.location.hash.replace(/^#/, "");
        const hashMode = hash === "observation"
            ? hash
            : new URLSearchParams(hash).get("mode");
        const initialMode = queryObservation || queryMode === "observation" || hashMode === "observation"
            ? "observation"
            : "photo";
        const modeSyncId = window.setTimeout(() => setMode(initialMode), 0);
        trackStorefrontEvent("petlens_opened", { mode: initialMode, surface: "page" });
        return () => window.clearTimeout(modeSyncId);
    }, [queryString]);

    useEffect(() => {
        const ownerKey = user?.apiUserId ? `id:${user.apiUserId}` : user?.email || "";
        const ownerChanged = editingOwnerKeyRef.current !== ownerKey;
        const currentPet = editingPetProfileId
            ? user?.pets.find((candidate) => candidate.apiProfileId === editingPetProfileId)
            : undefined;
        const requestedPetProfileId = cleanPetLensProfileId(
            typeof window === "undefined" ? undefined : new URLSearchParams(window.location.search).get("profile"),
        );
        const requestedPet = requestedPetProfileId
            ? user?.pets.find((candidate) => candidate.apiProfileId === requestedPetProfileId)
            : undefined;
        const firstReadyPet = user?.pets.find((candidate) => candidate.apiProfileId && candidate.breed?.trim());
        const firstSavedPet = user?.pets.find((candidate) => candidate.apiProfileId);
        const pet = ownerChanged
            ? requestedPet || firstReadyPet || firstSavedPet
            : currentPet || requestedPet || firstReadyPet || firstSavedPet;
        if (!pet?.apiProfileId) {
            editingOwnerKeyRef.current = ownerKey;
            hydratedPetProfileIdRef.current = undefined;
            setEditingPetProfileId(undefined);
            return;
        }
        const resetTarget = ownerChanged || hydratedPetProfileIdRef.current !== pet.apiProfileId;
        if (!resetTarget) return;
        const hydrateId = window.setTimeout(() => {
            editingOwnerKeyRef.current = ownerKey;
            hydratedPetProfileIdRef.current = pet.apiProfileId;
            setEditingPetProfileId(pet.apiProfileId);
            setName(pet.name || "");
            setAge(pet.age || "");
            setSize(pet.size || "medium");
            setCoat(pet.coat || "medium");
            setActivity(pet.activity || "normal");
            setConcerns(pet.concerns?.length ? pet.concerns : ["산책 안전"]);
            const restored = hasVerifiedPetPhoto(pet)
                ? restorePetLensPhotoViews(pet.photoViews, pet.photoDataUrl)
                : {};
            const primary = primaryPetLensPhotoEntry(restored)?.[1].dataUrl || pet.photoDataUrl;
            setPhotoDataUrl(primary);
            photoViewsRef.current = restored;
            setPhotoViews(restored);
            setResult(null);
            setAnalysisError("");
        }, 0);
        return () => window.clearTimeout(hydrateId);
    }, [editingPetProfileId, user]);

    useEffect(() => {
        if (!rawObservationRequestId) return;
        if (!observationRequestId) {
            if (handledObservationRequestIdRef.current === rawObservationRequestId) return;
            handledObservationRequestIdRef.current = rawObservationRequestId;
            const invalidTimer = window.setTimeout(() => {
                setObservationDeepLinkJob(null);
                setObservationDeepLinkState("invalid");
                setObservationDeepLinkMessage("분석 링크가 올바르지 않아요. 이메일의 링크를 다시 확인해 주세요.");
                clearObservationDeepLink();
            }, 0);
            return () => window.clearTimeout(invalidTimer);
        }
        if (!hydrated || !user?.apiAccessToken) return;
        if (handledObservationRequestIdRef.current === observationRequestId) return;
        handledObservationRequestIdRef.current = observationRequestId;
        const controller = new AbortController();
        const resolveTimer = window.setTimeout(() => {
            setObservationDeepLinkJob(null);
            setObservationDeepLinkState("resolving");
            setObservationDeepLinkMessage("이 계정의 분석 결과를 안전하게 확인하고 있어요.");

            void loadPetObservationJobStatus({
                requestId: observationRequestId,
                accessToken: user.apiAccessToken,
                signal: controller.signal,
            }).then((status) => {
                if (controller.signal.aborted) return;
                const matchedPet = user.pets.find((pet) => pet.apiProfileId === status.petProfileId);
                if (!matchedPet) {
                    setObservationDeepLinkJob(null);
                    setObservationDeepLinkState("profile_unavailable");
                    setObservationDeepLinkMessage("이 분석에 연결된 반려견 프로필을 현재 계정에서 확인하지 못했어요. 마이페이지의 반려견 목록을 확인해 주세요.");
                    clearObservationDeepLink();
                    return;
                }
                if (matchedPet?.apiProfileId) {
                    hydratedPetProfileIdRef.current = undefined;
                    setEditingPetProfileId(matchedPet.apiProfileId);
                }
                setObservationDeepLinkJob(status);
                if (status.status === "completed") {
                    setObservationDeepLinkState("found");
                    setObservationDeepLinkMessage("");
                } else if (status.status === "deferred") {
                    setObservationDeepLinkState("processing");
                    setObservationDeepLinkMessage(
                        status.state === "processing"
                            ? "분석 결과를 정리하고 있어요. 완료되면 이 화면에서 자동으로 열어드릴게요."
                            : "분석이 아직 진행 중이에요. 완료되면 이 화면에서 자동으로 열어드릴게요.",
                    );
                } else {
                    setObservationDeepLinkState(status.status);
                    setObservationDeepLinkMessage(status.message);
                }
                clearObservationDeepLink();
            }).catch((reason) => {
                if (controller.signal.aborted) return;
                setObservationDeepLinkJob(null);
                if (reason instanceof PetObservationRequestError && reason.status === 404) {
                    setObservationDeepLinkState("not_found");
                    setObservationDeepLinkMessage("이 계정의 분석 기록에서 결과를 찾지 못했어요. 이메일을 받은 계정으로 로그인했는지 확인해 주세요.");
                    return;
                }
                setObservationDeepLinkState("failed");
                setObservationDeepLinkMessage("분석 기록을 잠시 확인하지 못했어요. 네트워크 상태를 확인한 뒤 새로고침해 주세요.");
            });
        }, 0);

        return () => {
            window.clearTimeout(resolveTimer);
            controller.abort();
        };
    }, [hydrated, observationRequestId, rawObservationRequestId, user]);

    const toggleConcern = (concern: string) => {
        setConcerns((current) =>
            current.includes(concern)
                ? current.filter((item) => item !== concern)
                : [...current, concern]
        );
    };

    const selectPetProfile = (petProfileId: number) => {
        const target = user?.pets.find((pet) => pet.apiProfileId === petProfileId && pet.breed?.trim());
        if (!target?.apiProfileId || loading || photoLoading) return;
        hydratedPetProfileIdRef.current = undefined;
        photoViewsRef.current = {};
        setPhotoViews({});
        setPhotoDataUrl(undefined);
        setResult(null);
        setAnalysisError("");
        setEditingPetProfileId(target.apiProfileId);
    };

    const handleFile = async (viewId: PetLensPhotoViewId, file?: File) => {
        if (!file || photoCaptureInFlight.current) return;
        photoCaptureInFlight.current = true;
        setPhotoLoading(true);
        setAnalysisError("");
        try {
            const capture = await preparePetLensPhotoCapture(file);
            const nextViews: PetLensPhotoCaptures = {
                ...photoViewsRef.current,
                [viewId]: capture,
            };
            photoViewsRef.current = nextViews;
            setPhotoViews(nextViews);
            setPhotoDataUrl(primaryPetLensPhotoEntry(nextViews)?.[1].dataUrl || capture.dataUrl);
        } catch {
            setAnalysisError("사진을 불러오지 못했습니다. 다른 사진으로 다시 시도해 주세요.");
        } finally {
            photoCaptureInFlight.current = false;
            setPhotoLoading(false);
        }
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setAnalysisError("");
        trackStorefrontEvent("petlens_started", { mode: "photo", surface: "page" });
        try {
            const confirmedPet = user?.pets.find((pet) => pet.apiProfileId === editingPetProfileId);
            if (!user || !confirmedPet?.apiProfileId) {
                throw new Error("회원 반려견 프로필을 먼저 선택해 주세요.");
            }
            if (hydratedPetProfileIdRef.current !== confirmedPet.apiProfileId) {
                throw new Error("선택한 반려견 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
            }
            if (!confirmedPet.breed?.trim()) {
                throw new Error("마이페이지에서 실제 견종을 먼저 확인해 주세요.");
            }
            if (petLensPhotoViewCount(photoViews) === 0) {
                throw new Error("정면 사진부터 촬영해 주세요.");
            }
            const analysisImage = await buildPetLensAnalysisImage(photoViews);
            if (!analysisImage) throw new Error("분석할 사진을 준비하지 못했습니다.");
            const photoViewMeta = petLensPhotoViewMetadata(photoViews);
            const persistedPhotoViews = persistPetLensPhotoViews(photoViews);
            const primaryPhoto = primaryPetLensPhotoEntry(photoViews)?.[1];
            const analysis = await analyzePetLensSmart({
                name,
                age,
                size,
                coat,
                activity,
                concerns,
                imageName: analysisImage.imageName,
                photoDataUrl: primaryPhoto?.dataUrl || photoDataUrl,
                photoViews: photoViewMeta,
            }, analysisImage.file);
            const analyzedProfile = {
                ...analysis.profile,
                photoDataUrl: primaryPhoto?.dataUrl || photoDataUrl,
                photoViews: persistedPhotoViews,
            };
            const resultWithConfirmedProfile = reconcilePetLensResultWithConfirmedProfile({
                ...analysis,
                profile: analyzedProfile,
            }, confirmedPet);
            setResult(resultWithConfirmedProfile);
            trackStorefrontEvent("petlens_completed", { mode: "photo", surface: "page" });
            try {
                const profileToSave = buildPetLensProfileForSave(confirmedPet, resultWithConfirmedProfile, {
                    photoDataUrl: primaryPhoto?.dataUrl || photoDataUrl,
                    photoViews: persistedPhotoViews,
                });
                const saved = await savePetProfileSmart(profileToSave, user.apiAccessToken);
                if (!saved) throw new Error("profile_save_unavailable");
                upsertPet(mergeSavedPetLensProfile(profileToSave, saved));
            } catch {
                setAnalysisError("분석은 완료됐지만 결과와 사진을 내 아이 기록에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
            }
        } catch (error) {
            setResult(null);
            trackStorefrontEvent("petlens_failed", {
                mode: "photo",
                surface: "page",
                errorCode: "analysis_or_validation_failed",
            });
            const message = error instanceof Error ? error.message : "사진 분석을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
            setAnalysisError(`펫렌즈 분석을 완료하지 못했습니다. ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const selectedPet = user?.pets.find((pet) => pet.apiProfileId === editingPetProfileId);
    const gateService = mode === "observation" || Boolean(rawObservationRequestId) ? "daenglab" : "petlens";
    const observationDeepLinkHasError = ["invalid", "not_found", "profile_unavailable", "failed"].includes(observationDeepLinkState);
    const observationDeepLinkPending = Boolean(rawObservationRequestId)
        && !observationDeepLinkJob
        && !observationDeepLinkHasError;
    const observationDeepLinkBlocksExperience = observationDeepLinkPending || observationDeepLinkHasError;
    const observationRecoveryHref = observationDeepLinkState === "not_found" && observationReturnTo
        ? petLensAuthHref("login", observationReturnTo)
        : undefined;
    if (!hydrated) {
        return <LabMain><PetLensMemberGate reason="loading" service={gateService} /></LabMain>;
    }
    if (!user) {
        return (
            <LabMain>
                <LabHero mode={gateService === "daenglab" ? "observation" : "photo"} />
                <PawTrail />
                <PetLensMemberGate reason="login" service={gateService} returnTo={observationReturnTo} />
            </LabMain>
        );
    }
    if (observationDeepLinkPending || observationDeepLinkHasError) {
        return (
            <LabMain>
                <ObservationDeepLinkNotice
                    state={observationDeepLinkPending ? "resolving" : observationDeepLinkState}
                    message={observationDeepLinkMessage || "이 계정의 분석 기록을 안전하게 확인하고 있어요."}
                    recoveryHref={observationRecoveryHref}
                />
            </LabMain>
        );
    }
    if (!selectedPet?.apiProfileId) {
        return (
            <LabMain>
                <LabHero mode={gateService === "daenglab" ? "observation" : "photo"} />
                <PawTrail />
                <PetLensPetSelector pets={user.pets} selectedPetProfileId={editingPetProfileId} onChange={selectPetProfile} />
                <PetLensMemberGate reason="profile" service={gateService} />
            </LabMain>
        );
    }
    if (!selectedPet.breed?.trim() && !observationDeepLinkJob) {
        return (
            <LabMain>
                <LabHero mode={gateService === "daenglab" ? "observation" : "photo"} />
                <PawTrail />
                <PetLensPetSelector pets={user.pets} selectedPetProfileId={editingPetProfileId} onChange={selectPetProfile} />
                <PetLensMemberGate reason="breed" service={gateService} />
            </LabMain>
        );
    }

    return (
        <LabMain>
            <LabHero
                mode={mode}
                controls={(
                    <LabHeroControls
                        pets={user.pets}
                        selectedPetProfileId={editingPetProfileId}
                        disabled={loading || photoLoading}
                        onSelectPet={selectPetProfile}
                        mode={mode}
                        onMode={setMode}
                    />
                )}
            />
            <PawTrail />
            {/* 원래 머리글 — 앱에서 보이고, 웹 연구소에서는 위 머리 판이 대신(lab-web.css) */}
            <header className="lab-legacy-head mb-6">
                {mode === "observation" ? (
                    <>
                        <div className="flex items-center gap-3">
                            <DaengLabSymbol size={72} priority className="ring-1 ring-cyan-100 shadow-sm" />
                            <h1 className="min-w-0">
                                <DaengLabServiceTitle
                                    suffixClassName="text-3xl font-black tracking-tight text-neutral-950 md:text-4xl"
                                />
                            </h1>
                        </div>
                        <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-neutral-600">
                            카메라·마이크로 포착한 행동과 소리를 함께 살펴 우리 아이의 관찰 포인트를 정리합니다.
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-sm font-black text-indigo-700">펫렌즈 케어</p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">펫렌즈</h1>
                        <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-neutral-600">
                            회원가입 때 확인한 견종과 생활 정보를 기준으로, 네 방향 사진에서 현재 외형·체형·털 상태와 케어 포인트를 정리해 드립니다.
                        </p>
                    </>
                )}
            </header>

            {/* 원래 아이 · 분석 고르기 — 앱에서 보이고, 웹에서는 위 머리 판 고르기 줄이 대신(lab-web.css) */}
            <div className="lab-legacy-controls">
                <PetLensPetSelector
                    pets={user.pets}
                    selectedPetProfileId={editingPetProfileId}
                    disabled={loading || photoLoading}
                    onChange={selectPetProfile}
                />

                <PetLensModeTabs mode={mode} onChange={setMode} />
            </div>

            {mode === "observation" && !observationDeepLinkJob && !["idle", "found"].includes(observationDeepLinkState) && (
                <ObservationDeepLinkNotice state={observationDeepLinkState} message={observationDeepLinkMessage} />
            )}

            {mode === "observation" ? (
                observationDeepLinkBlocksExperience ? null : (
                    <PetLensObservationExperience
                        key={`${selectedPet.apiProfileId}:${observationDeepLinkJob?.requestId || "capture"}`}
                        pet={selectedPet}
                        petProfileId={selectedPet.apiProfileId}
                        accessToken={user.apiAccessToken}
                        variant="page"
                        initialJobStatus={observationDeepLinkJob || undefined}
                    />
                )
            ) : (
            <>
            <div className="lab-photo-grid grid gap-6 lg:grid-cols-[420px_1fr]">
                <form onSubmit={submit} className="surface lab-form grid h-fit gap-4 p-5">
                    <div data-petlens-page-multiview-upload>
                        <span className="lab-pane-head hidden" aria-hidden="true"><b>1</b>네 방향 사진</span>
                        <span className="mb-1 block text-xs font-black text-neutral-500 lab-legacy-label">사진</span>
                        <div className="grid grid-cols-2 gap-2">
                            {PETLENS_PHOTO_VIEWS.map((view) => {
                                const photo = photoViews[view.id];
                                return (
                                    <label key={view.id} className="block" data-petlens-photo-view={view.id}>
                                        <span className="mb-1 block text-[11px] font-black text-neutral-500">{view.label}</span>
                                        <span className="lab-slot relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-neutral-300 bg-white text-neutral-400 hover:border-indigo-300">
                                            {photo ? (
                                                <Image src={photo.dataUrl} alt={`${view.label} 반려견 사진`} fill sizes="190px" className="object-cover" unoptimized />
                                            ) : (
                                                <span className="grid place-items-center gap-1 text-center">
                                                    <Image src={LAB_VIEW_ART[view.id]} alt="" width={80} height={80} className="lab-slot-art hidden" aria-hidden="true" />
                                                    <i className="fa-solid fa-camera text-xl lab-slot-icon" />
                                                    <span className="text-[10px] font-black">{view.helper}</span>
                                                </span>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                data-petlens-mobile-camera-capture
                                                disabled={photoLoading || loading}
                                                className="absolute inset-0 cursor-pointer opacity-0"
                                                onChange={(event) => {
                                                    void handleFile(view.id, event.target.files?.[0]);
                                                    event.currentTarget.value = "";
                                                }}
                                            />
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        <p className="mt-2 text-[11px] font-bold leading-5 text-neutral-500">
                            모바일에서는 각 칸을 누르면 카메라가 열립니다. 네 방향 사진을 함께 올리면 얼굴·몸통·털 상태를 더 꼼꼼히 비교합니다.
                        </p>
                        {photoLoading && <p className="mt-2 text-xs font-black text-indigo-700">사진 준비 중</p>}
                    </div>

                    <span className="lab-pane-head lab-pane-head-info hidden" aria-hidden="true"><b>2</b>우리 아이 정보</span>
                    <AppPetInfoFold name={name} age={age} size={size} coat={coat} activity={activity}>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
                        <label>
                            <span className="mb-1 block text-xs font-black text-neutral-500">이름</span>
                            <input value={name} onChange={(event) => setName(event.target.value)} className="input" placeholder="우리 아이" />
                        </label>
                        <label>
                            <span className="mb-1 block text-xs font-black text-neutral-500">나이</span>
                            <input value={age} onChange={(event) => setAge(event.target.value)} className="input" placeholder="예: 3살" />
                        </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
                        <label>
                            <span className="mb-1 block text-xs font-black text-neutral-500">크기</span>
                            <select value={size} onChange={(event) => setSize(event.target.value as PetProfile["size"])} className="input">
                                <option value="small">소형</option>
                                <option value="medium">중형</option>
                                <option value="large">대형</option>
                            </select>
                        </label>
                        <label>
                            <span className="mb-1 block text-xs font-black text-neutral-500">모질</span>
                            <select value={coat} onChange={(event) => setCoat(event.target.value as PetProfile["coat"])} className="input">
                                <option value="short">단모</option>
                                <option value="medium">보통</option>
                                <option value="long">장모</option>
                            </select>
                        </label>
                        <label>
                            <span className="mb-1 block text-xs font-black text-neutral-500">활동량</span>
                            <select value={activity} onChange={(event) => setActivity(event.target.value as PetProfile["activity"])} className="input">
                                <option value="low">낮음</option>
                                <option value="normal">보통</option>
                                <option value="high">높음</option>
                            </select>
                        </label>
                    </div>
                    </AppPetInfoFold>

                    <div>
                        <span className="mb-2 block text-xs font-black text-neutral-500">관심 포인트</span>
                        <div className="lab-concerns flex flex-wrap gap-2">
                            {CONCERN_OPTIONS.map((option) => (
                                <label key={option} className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-black ${
                                    concerns.includes(option)
                                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                        : "border-neutral-200 bg-white text-neutral-700"
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={concerns.includes(option)}
                                        onChange={() => toggleConcern(option)}
                                        className="h-4 w-4"
                                    />
                                    {option}
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" disabled={loading || photoLoading} className="btn btn-primary w-full disabled:opacity-50">
                        <i className="fa-solid fa-wand-magic-sparkles text-xs" />
                        {loading ? "분석 중" : "추천 받기"}
                    </button>
                    {analysisError && (
                        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-bold leading-6 text-rose-700">
                            {analysisError}
                        </p>
                    )}
                </form>

                <section className="lab-result">
                    {result ? (
                        <div className="grid gap-5">
                            <div className="surface lab-result-card p-5">
                                <PetLensAnalysisSummary profile={result.profile} details={result.details} />
                                <Link
                                    href="/my-pet/#health-report"
                                    className="btn btn-secondary mt-4 w-full justify-center sm:w-auto"
                                    data-petlens-result-profile-cta
                                >
                                    <i className="fa-solid fa-chart-line text-xs" />
                                    내 아이 기록에서 결과 보기
                                </Link>
                            </div>
                            {result.products.length > 0 ? (
                                <section className="lab-products">
                                    <div className="mb-3">
                                        <h2 className="text-lg font-black text-neutral-950">확인된 정보로 골라본 상품</h2>
                                        <p className="mt-1 text-xs font-bold text-neutral-500">사진 근거와 입력한 생활 정보를 함께 반영했습니다.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                                        {result.products.map((product) => (
                                            <ProductCard key={product.id} product={product} />
                                        ))}
                                    </div>
                                </section>
                            ) : (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                                    <p className="text-sm font-black text-amber-900">견종과 체형을 확인하면 상품 추천을 이어갈게요.</p>
                                    <p className="mt-1 text-xs font-bold leading-5 text-amber-800">불확실한 사진 결과만으로 상품을 먼저 권하지 않습니다.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="surface lab-empty p-8 text-center">
                            <Image src="/images/ui/lab-summary-256.webp" alt="" width={120} height={120} className="lab-empty-art hidden" aria-hidden="true" />
                            <i className="fa-solid fa-camera-retro text-4xl text-neutral-300 lab-empty-icon" />
                            <h2 className="mt-4 text-xl font-black text-neutral-950">추천 결과가 여기에 표시됩니다.</h2>
                            <p className="mt-2 text-sm font-bold text-neutral-600">
                                정보를 입력하고 추천 받기를 눌러 주세요.
                            </p>
                        </div>
                    )}
                </section>
            </div>
            </>
            )}
        </LabMain>
    );
}

/**
 * 앱 전용 반려견 정보 접기(로컬 시안) — 사진 분석의 이름 · 나이 · 크기 · 모질 · 활동량은 등록 프로필에서 채워져 있어
 * 앱에서만 "코스 · 성견 · 중형 · 보통 · 높음 · 수정" 한 줄로 접고, 누르면 같은 입력칸이 펼쳐진다(사용자 결정 2026-10-17).
 * 웹: 틀은 display:contents(화면에 없는 것과 같음) · 버튼은 hidden → 지금과 똑같이 전부 펼쳐 보임.
 * 앱: components/app-shell/appShopSkin.ts 에서만 버튼을 보이고, 접힌 동안 안쪽을 숨긴다. 입력칸 · 값 · 저장 동작은 그대로.
 */
function AppPetInfoFold({ name, age, size, coat, activity, children }: {
    name: string;
    age: string;
    size: PetProfile["size"];
    coat: PetProfile["coat"];
    activity: PetProfile["activity"];
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    // 요약 글자 — 아래 select 의 보이는 이름과 같음
    const sizeLabel = { small: "소형", medium: "중형", large: "대형" }[size];
    const coatLabel = { short: "단모", medium: "보통 털", long: "장모" }[coat];
    const activityLabel = { low: "활동 낮음", normal: "활동 보통", high: "활동 높음" }[activity];
    const summary = [name.trim() || "이름 없음", age.trim(), sizeLabel, coatLabel, activityLabel].filter(Boolean).join(" · ");
    return (
        <div className="contents" data-app-fold="pet-info" data-app-fold-open={open ? "true" : "false"}>
            <button type="button" className="hidden" data-app-fold-toggle aria-expanded={open} onClick={() => setOpen((value) => !value)}>
                <span data-app-fold-title>반려견 정보</span>
                <span data-app-fold-summary>{summary}</span>
                <span data-app-fold-action>
                    {open ? "접기" : "수정"}
                    <i className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </span>
            </button>
            <div className="contents" data-app-fold-body>{children}</div>
        </div>
    );
}
