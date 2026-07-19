"use client";

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    customerApiErrorMessage,
    ddbApiReady,
    loadPetProfilesSmart,
    loginCustomer,
    savePetProfileSmart,
    setCustomerToken,
    signupCustomer,
} from "@/lib/customer-api";
import {
    analyzePetLensSmart,
    getPetLensStorefrontCandidates,
    getPetLensWeightEstimate,
    type PetLensWeightEstimate,
} from "@/lib/daengdabang-llm";
import { resizePetPhoto } from "@/lib/pet-photo";
import {
    clearPetLensSignupDraft,
    loadPetLensSignupDraft,
} from "@/lib/petlens-signup-draft";
import {
    SIGNUP_PETLENS_PRIVACY_CONSENT,
    SIGNUP_REQUIRED_PRIVACY_CONSENT,
    SIGNUP_TERMS_AGREEMENT,
} from "@/lib/signup-agreements";
import {
    getPetBreedVisual,
    isPetBreedId,
    PET_BREEDS,
    resolvePetBreedIdExact,
} from "@/lib/pet-companion-breeds";
import { useAuth, type PetProfile, type User } from "@/lib/store";
import { useDdbApiReady } from "@/hooks/useDdbApiReady";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import SignupPhoneVerification from "@/components/auth/SignupPhoneVerification";
import DaengLabCoinMark from "@/components/petlens/DaengLabCoinMark";
import { safeInternalRedirect } from "@/lib/internal-redirect";
import { petLensPostAuthDestination } from "@/lib/petlens-routing";
import {
    clearSignupPhoneResume,
    formatKoreanMobileNumber,
    loadSignupPhoneResume,
    normalizeKoreanMobileNumber,
    saveSignupPhoneResume,
} from "@/lib/signup-phone-verification";

const CONCERN_OPTIONS = ["눈 보호", "피부/발바닥 케어", "체중 관리", "산책 안전", "놀이/분리불안"];
const CUSTOM_BREED_OPTION = "__custom";
const subscribeToLocation = () => () => {};
const getServerRedirect = () => null;
const getClientRedirect = () => {
    if (typeof window === "undefined") return null;
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    return safeInternalRedirect(redirect, window.location.origin);
};
const PET_PHOTO_VIEWS = [
    { id: "front", label: "정면", helper: "얼굴·가슴" },
    { id: "left", label: "왼쪽", helper: "옆선·다리" },
    { id: "right", label: "오른쪽", helper: "반대 옆선" },
    { id: "back", label: "뒷면", helper: "등선·꼬리" },
] as const;
type PetPhotoViewId = typeof PET_PHOTO_VIEWS[number]["id"];
type PetPhotoCapture = {
    dataUrl: string;
    imageName: string;
    file?: File;
    restored?: boolean;
};
type PetPhotoCaptures = Partial<Record<PetPhotoViewId, PetPhotoCapture>>;

const PET_PHOTO_VIEW_LABELS = PET_PHOTO_VIEWS.reduce((acc, view) => {
    acc[view.id] = view.label;
    return acc;
}, {} as Record<PetPhotoViewId, string>);

function petLensCandidateMessage(rawAnalysis: unknown) {
    const candidates = getPetLensStorefrontCandidates(rawAnalysis);
    const labels = [
        candidates.size ? "크기" : "",
        candidates.coat ? "모질" : "",
        candidates.coatColor ? "털 색상" : "",
        candidates.weightEstimate ? "예상 체중 범위" : "",
    ].filter(Boolean);
    if (labels.length === 0) {
        return "신뢰 가능한 자동 후보를 확정하지 못해 기존 입력값을 유지했습니다. 실제 정보를 직접 확인해 주세요.";
    }
    return `사진 분석 후보(${labels.join("·")})를 불러왔습니다. 가입 전에 실제 정보와 맞는지 확인해 주세요.`;
}

function petPhotoViewEntries(views: PetPhotoCaptures): Array<[PetPhotoViewId, PetPhotoCapture]> {
    return PET_PHOTO_VIEWS
        .map((view): [PetPhotoViewId, PetPhotoCapture | undefined] => [view.id, views[view.id]])
        .filter((entry): entry is [PetPhotoViewId, PetPhotoCapture] => Boolean(entry[1]));
}

function petPhotoViewCount(views: PetPhotoCaptures) {
    return petPhotoViewEntries(views).length;
}

function primaryPetPhotoEntry(views: PetPhotoCaptures): [PetPhotoViewId, PetPhotoCapture] | undefined {
    if (views.front) return ["front", views.front];
    return petPhotoViewEntries(views)[0];
}

function petPhotoViewMetadata(views: PetPhotoCaptures) {
    return petPhotoViewEntries(views).map(([viewId, photo]) => ({
        viewId,
        label: PET_PHOTO_VIEW_LABELS[viewId],
        imageName: photo.imageName,
        usedForPetLensAnalysis: true,
    }));
}

function loadSignupImage(dataUrl: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("PetLens image could not be loaded."));
        image.src = dataUrl;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("PetLens contact sheet could not be generated."));
        }, type, quality);
    });
}

async function buildPetLensViewSheet(views: PetPhotoCaptures) {
    const entries = petPhotoViewEntries(views);
    if (entries.length === 0) return undefined;
    if (entries.length === 1 && entries[0][1].file) {
        const [viewId, photo] = entries[0];
        return {
            file: photo.file,
            imageName: `${PET_PHOTO_VIEW_LABELS[viewId]}_${photo.imageName}`,
        };
    }

    const cellSize = 480;
    const labelHeight = 48;
    const padding = 18;
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
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = column * cellSize;
        const y = row * cellSize;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + 6, y + 6, cellSize - 12, cellSize - 12);
        ctx.strokeRect(x + 6, y + 6, cellSize - 12, cellSize - 12);
        ctx.fillStyle = "#2f2926";
        ctx.fillText(PET_PHOTO_VIEW_LABELS[viewId], x + padding, y + labelHeight / 2);

        const drawX = x + padding;
        const drawY = y + labelHeight;
        const drawWidth = cellSize - padding * 2;
        const drawHeight = cellSize - labelHeight - padding;
        const scale = Math.min(drawWidth / image.width, drawHeight / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        const offsetX = drawX + (drawWidth - width) / 2;
        const offsetY = drawY + (drawHeight - height) / 2;
        ctx.drawImage(image, offsetX, offsetY, width, height);
    }));

    const blob = await canvasToBlob(canvas, "image/jpeg", 0.88);
    return {
        file: new File([blob], "daengdabang-petlens-four-view.jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
        }),
        imageName: "정면-좌-우-뒷면 PetLens 분석 시트.jpg",
    };
}

export default function SignupPage() {
    const router = useRouter();
    const { login, user } = useAuth();
    const redirect = useSyncExternalStore(subscribeToLocation, getClientRedirect, getServerRedirect);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
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
    const [pendingVerification, setPendingVerification] = useState<{
        member: User;
        destination: string;
        defaultPhone: string;
    } | null>(null);
    const phoneRef = useRef<HTMLInputElement>(null);
    const petPhotoViewsRef = useRef<PetPhotoCaptures>({});
    const photoCaptureInFlight = useRef(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [agreePrivacy, setAgreePrivacy] = useState(false);
    const [agreePetLensPrivacy, setAgreePetLensPrivacy] = useState(false);
    const apiReady = useDdbApiReady();

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
                    views[photo.viewId] = {
                        dataUrl: photo.dataUrl,
                        imageName: photo.imageName,
                        restored: true,
                    };
                    return views;
                }, {});
                if (Object.keys(petPhotoViewsRef.current).length === 0) {
                    petPhotoViewsRef.current = restored;
                    setPetPhotoViews(restored);
                }
            } else if (draft.photoDataUrl) {
                const restored = { front: { dataUrl: draft.photoDataUrl, imageName: "펫렌즈 저장 사진", restored: true } };
                if (Object.keys(petPhotoViewsRef.current).length === 0) {
                    petPhotoViewsRef.current = restored;
                    setPetPhotoViews(restored);
                }
            }
            setPetRawAnalysis(draft.rawAnalysis);
            if (draft.rawAnalysis?.petLensDraftPhotosDropped === true) {
                setPhotoError("브라우저 저장 공간이 부족해 이전 사진은 옮기지 못했습니다. 네 방향 사진을 다시 등록해 주세요.");
            }
            setPetWeightEstimate(getPetLensWeightEstimate(draft.rawAnalysis));
            setPetSex("unknown");
            if (draft.coatColor) {
                setPetCoatColor(draft.coatColor);
                setPetCoatColorSource("ai");
            }
            const rawBreedCandidate = (draft.breed || "").trim();
            const candidateId = resolvePetBreedIdExact(rawBreedCandidate, "");
            if (candidateId && isPetBreedId(candidateId)) {
                const candidate = getPetBreedVisual(candidateId);
                setPetBreedId(candidateId);
                setPetBreedCustom("");
                setPetBreedSource("ai");
                setPetBreedMessage(`펫렌즈 견종 후보: ${candidate.ko} · ${candidate.en}. 실제 견종인지 확인하거나 수정해 주세요.`);
            } else if (rawBreedCandidate) {
                setPetBreedId(CUSTOM_BREED_OPTION);
                setPetBreedCustom(rawBreedCandidate);
                setPetBreedSource("ai");
                setPetBreedMessage(`펫렌즈 견종 후보: ${rawBreedCandidate}. 120종 캐릭터 목록 밖의 견종 또는 상위 분류이므로 직접 확인해 주세요.`);
            } else {
                setPetBreedMessage("펫렌즈 분석을 불러왔습니다. 실제 견종을 직접 선택해 주세요.");
            }
            setPetAnalysisMessage(petLensCandidateMessage(draft.rawAnalysis));
        }, 0);
        return () => window.clearTimeout(restoreId);
    }, []);

    useEffect(() => {
        if (pendingVerification || !user?.apiAccessToken) return;
        const resume = loadSignupPhoneResume();
        if (resume?.source !== "email") return;
        const restoreId = window.setTimeout(() => {
            setPendingVerification({
                member: user,
                destination: resume.returnTo,
                defaultPhone: user.phone || "",
            });
        }, 0);
        return () => window.clearTimeout(restoreId);
    }, [pendingVerification, user]);

    const toggleConcern = (concern: string) => {
        setPetConcerns((prev) =>
            prev.includes(concern)
                ? prev.filter((item) => item !== concern)
                : [...prev.filter((item) => item !== "일상 케어"), concern]
        );
    };

    const handlePetPhotoView = async (viewId: PetPhotoViewId, file?: File) => {
        if (!file || photoCaptureInFlight.current) return;
        photoCaptureInFlight.current = true;
        setPhotoLoading(true);
        setPhotoError("");
        setPetBreedId("");
        setPetBreedCustom("");
        setPetBreedSource("");
        setPetBreedMessage("");
        setPetAnalysisMessage("");
        setPetRawAnalysis(undefined);
        setPetWeightEstimate(undefined);
        if (petCoatColorSource === "ai") {
            setPetCoatColor("");
            setPetCoatColorSource("");
        }
        try {
            const dataUrl = await resizePetPhoto(file);
            const nextViews: PetPhotoCaptures = {
                ...petPhotoViewsRef.current,
                [viewId]: {
                    dataUrl,
                    imageName: file.name,
                    file,
                },
            };
            petPhotoViewsRef.current = nextViews;
            const primaryEntry = primaryPetPhotoEntry(nextViews);
            const primaryPhoto = primaryEntry?.[1];
            const viewMeta = petPhotoViewMetadata(nextViews);
            const viewCount = petPhotoViewCount(nextViews);
            setPetPhotoViews(nextViews);
            setPetPhotoDataUrl(primaryPhoto?.dataUrl || dataUrl);

            // The server classifier is helpful when configured, but its result
            // is always shown as an editable candidate. A missing/unavailable
            // model must never silently turn a member's dog into a poodle.
            if (!ddbApiReady()) {
                setPetBreedMessage(`사진 ${viewCount}장을 준비했습니다. 견종을 직접 선택해 주세요.`);
                return;
            }

            try {
                const analysisImage = await buildPetLensViewSheet(nextViews);
                if (!analysisImage) return;
                const analysis = await analyzePetLensSmart({
                    name: petName,
                    age: petAge,
                    size: petSize,
                    coat: petCoat,
                    activity: petActivity,
                    concerns: petConcerns,
                    imageName: analysisImage.imageName,
                    photoDataUrl: primaryPhoto?.dataUrl || dataUrl,
                    photoViews: viewMeta,
                }, analysisImage.file);
                const rawAnalysis = {
                    ...(analysis.profile.rawAnalysis || {}),
                    petPhotoViews: viewMeta,
                    petPhotoViewCount: viewMeta.length,
                    petPhotoPrimaryView: primaryEntry?.[0] || viewId,
                    multiViewAnalysis: {
                        enabled: viewMeta.length > 1,
                        source: viewMeta.length > 1 ? "signup_multiview_contact_sheet" : "signup_single_photo",
                        imageName: analysisImage.imageName,
                        requiresUserConfirmation: true,
                    },
                };
                setPetRawAnalysis(rawAnalysis);
                setPetSize(analysis.profile.size);
                setPetCoat(analysis.profile.coat);
                setPetWeightEstimate(getPetLensWeightEstimate(rawAnalysis));
                if (analysis.profile.coatColor) {
                    setPetCoatColor(analysis.profile.coatColor);
                    setPetCoatColorSource("ai");
                }
                setPetAnalysisMessage(
                    `${petLensCandidateMessage(rawAnalysis)}${viewMeta.length > 1 ? " 여러 방향 사진을 함께 비교해 확인했습니다." : ""}`
                );
                const rawBreedCandidate = (analysis.profile.breed || "").trim();
                const candidateId = resolvePetBreedIdExact(rawBreedCandidate, "");
                if (candidateId && isPetBreedId(candidateId)) {
                    const candidate = getPetBreedVisual(candidateId);
                    setPetBreedId(candidateId);
                    setPetBreedCustom("");
                    setPetBreedSource("ai");
                    setPetBreedMessage(`사진 분석 후보: ${candidate.ko} · ${candidate.en}. 아래에서 꼭 확인하거나 수정해 주세요.`);
                } else if (rawBreedCandidate) {
                    setPetBreedId(CUSTOM_BREED_OPTION);
                    setPetBreedCustom(rawBreedCandidate);
                    setPetBreedSource("ai");
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

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError("");
        if (!ddbApiReady()) {
            setCustomerToken();
            setError("지금은 회원가입 준비 중입니다. 잠시 후 다시 이용해 주세요.");
            return;
        }
        const normalizedSignupPhone = normalizeKoreanMobileNumber(phone);
        if (!normalizedSignupPhone) {
            setError("휴대전화번호를 010-1234-5678 형식으로 입력해 주세요.");
            phoneRef.current?.focus();
            return;
        }
        if (password.trim().length < 8) {
            setError("비밀번호는 8자 이상 입력해 주세요.");
            return;
        }
        if (!agreeTerms || !agreePrivacy) {
            setError("필수 약관과 개인정보 수집·이용에 동의해 주세요.");
            return;
        }
        const weightText = petWeightKg.trim();
        const confirmedWeightKg = weightText ? Number(weightText) : undefined;
        if (
            confirmedWeightKg !== undefined &&
            (!Number.isFinite(confirmedWeightKg) || confirmedWeightKg < 0.1 || confirmedWeightKg > 120)
        ) {
            setError("현재 체중은 직접 확인한 값으로 0.1~120kg 사이를 입력해 주세요.");
            return;
        }
        const photoViewMeta = petPhotoViewMetadata(petPhotoViews);
        const primaryPhotoView = primaryPetPhotoEntry(petPhotoViews)?.[0];
        const shouldCreatePet = Boolean(
            petName.trim() ||
            petPhotoDataUrl ||
            photoViewMeta.length > 0 ||
            petBreedId ||
            petBreedCustom.trim() ||
            confirmedWeightKg !== undefined ||
            petCoatColor.trim() ||
            petSex !== "unknown"
        );
        if (shouldCreatePet && !agreePetLensPrivacy) {
            setError("반려동물 사진·품종·체중 등 PetLens 프로필을 함께 저장하려면 선택 개인정보 수집·이용 동의가 필요합니다. 동의하지 않아도 회원가입은 가능하며, 가입 후 마이페이지에서 다시 등록할 수 있습니다.");
            return;
        }
        const customBreed = petBreedId === CUSTOM_BREED_OPTION ? petBreedCustom.trim().slice(0, 100) : "";
        if (shouldCreatePet && !isPetBreedId(petBreedId) && customBreed.length < 2) {
            setError("반려견 사진 또는 정보를 등록하셨다면, 아래에서 우리 아이의 견종을 확인해 주세요.");
            return;
        }
        const selectedBreed = isPetBreedId(petBreedId)
            ? getPetBreedVisual(petBreedId)
            : null;
        const confirmedBreed = selectedBreed?.ko || customBreed || undefined;
        const pets: PetProfile[] = shouldCreatePet
            ? [{
                name: petName.trim() || "우리 아이",
                breed: confirmedBreed,
                size: petSize,
                age: petAge.trim() || "성견",
                weightKg: confirmedWeightKg,
                sex: petSex,
                coatColor: petCoatColor.trim() || undefined,
                coat: petCoat,
                activity: petActivity,
                concerns: petConcerns.length > 0 ? petConcerns : ["일상 케어"],
                photoDataUrl: petPhotoDataUrl,
                photoViews: petPhotoViewEntries(petPhotoViews).map(([viewId, photo]) => ({
                    viewId,
                    dataUrl: photo.dataUrl,
                    imageName: photo.imageName,
                })),
                rawAnalysis: confirmedBreed
                    ? {
                        ...(petRawAnalysis || {}),
                        ...(photoViewMeta.length > 0 ? {
                            petPhotoViews: photoViewMeta,
                            petPhotoViewCount: photoViewMeta.length,
                            petPhotoPrimaryView: primaryPhotoView,
                        } : {}),
                        ...(selectedBreed ? {
                        breedId: selectedBreed.id,
                        breed_ko: selectedBreed.ko,
                        breed_en: selectedBreed.en,
                        } : {
                            breed_ko: confirmedBreed,
                        }),
                        breedSource: petBreedSource || "manual",
                        storefrontConfirmation: {
                            size: petSize,
                            weightKgSource: confirmedWeightKg === undefined ? "not_provided" : "member_input",
                            sexSource: petSex === "unknown" ? "not_provided" : "member_input",
                            coatColorSource: petCoatColor.trim() ? (petCoatColorSource || "manual") : "not_provided",
                        },
                    }
                    : undefined,
                lastAnalyzedAt: new Date().toISOString(),
            }]
            : [];

        setLoading(true);
        try {
            const apiUser = await signupCustomer({
                email: email.trim(),
                password: password.trim(),
                name: name.trim() || "댕다방 회원",
            });
            const token = await loginCustomer({ email: email.trim(), password: password.trim() });
            const apiAccessToken = token.access_token;
            setCustomerToken(apiAccessToken);

            if (pets[0]) {
                await savePetProfileSmart(pets[0], apiAccessToken);
            }
            const savedPets = (await loadPetProfilesSmart(apiAccessToken).catch(() => null)) || pets;

            const member: User = {
                apiUserId: apiUser.id,
                apiAccessToken,
                name: apiUser.name || name.trim() || "댕다방 회원",
                email: apiUser.email,
                joinedAt: new Date().toISOString(),
                pets: savedPets,
            };
            const destination = petLensPostAuthDestination(redirect, savedPets);
            login(member);
            clearPetLensSignupDraft();
            saveSignupPhoneResume({ source: "email", returnTo: destination });
            setPendingVerification({
                member,
                destination,
                defaultPhone: formatKoreanMobileNumber(normalizedSignupPhone),
            });
        } catch (err) {
            setCustomerToken();
            setError(customerApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const finishSignup = () => {
        if (!pendingVerification) return;
        const destination = pendingVerification.destination;
        clearSignupPhoneResume();
        setPendingVerification(null);
        router.push(destination);
    };

    if (pendingVerification) {
        return (
            <main className="mx-auto max-w-lg px-4 py-10 sm:py-16">
                <h1 className="text-2xl font-black tracking-tight text-neutral-950">회원가입 휴대전화 인증</h1>
                <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                    계정 가입은 완료되었습니다. 휴대전화 인증을 마치면 신규 가입 혜택 20C를 받을 수 있어요.
                </p>
                <div className="mt-5">
                    <SignupPhoneVerification
                        accessToken={pendingVerification.member.apiAccessToken}
                        defaultPhone={pendingVerification.defaultPhone}
                        onComplete={() => finishSignup()}
                        onContinueWithoutBonus={() => finishSignup()}
                    />
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-2xl px-4 py-10">
            <h1 className="text-3xl font-black tracking-tight text-neutral-950">회원가입</h1>
            <section
                className="mt-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-cyan-50 via-rose-50 to-amber-50 px-4 py-3"
                aria-labelledby="signup-daenglab-bonus-title"
                data-signup-daenglab-bonus
            >
                <div className="flex flex-wrap items-center gap-2">
                    <DaengLabCoinMark compact />
                    <p id="signup-daenglab-bonus-title" className="text-sm font-black text-neutral-950">
                        신규 가입 혜택 · 20C
                    </p>
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-indigo-700 shadow-sm">
                        행동·소리 분석 2회
                    </span>
                </div>
                <p className="mt-2 text-[11px] font-bold leading-5 text-neutral-600">
                    휴대전화 인증 완료 시 인증된 휴대전화번호 1개당 최초 1회만 자동 지급됩니다.
                </p>
            </section>
            <div data-pet-guide-target="signup-provider">
                <SocialAuthButtons mode="signup" returnTo={redirect || "/mypage"} />
            </div>
            <form onSubmit={submit} className="surface mt-6 grid gap-4 p-5">
                {apiReady === false && (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-bold leading-6 text-amber-800">
                        지금은 회원가입 준비 중입니다. 잠시 후 다시 이용해 주세요.
                    </p>
                )}
                {error && (
                    <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-bold leading-6 text-rose-700">
                        {error}
                    </p>
                )}
                <div className="grid gap-4 md:grid-cols-2" data-pet-guide-target="signup-account">
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">이름</span>
                        <input value={name} onChange={(event) => setName(event.target.value)} className="input" required autoComplete="name" />
                    </label>
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">이메일</span>
                        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" required autoComplete="email" />
                    </label>
                </div>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">휴대폰</span>
                    <input
                        ref={phoneRef}
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(formatKoreanMobileNumber(event.target.value))}
                        className="input"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="010-1234-5678"
                        required
                        aria-invalid={Boolean(phone) && !normalizeKoreanMobileNumber(phone)}
                        aria-describedby="signup-phone-help"
                    />
                    <span id="signup-phone-help" className="mt-1 block text-[11px] font-bold leading-4 text-neutral-500">
                        가입 후 문자 인증을 완료하면 20C가 지급됩니다.
                    </span>
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">비밀번호</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="input"
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="8자 이상 입력"
                    />
                </label>
                <div className="grid gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
                        <div className="block" data-pet-guide-target="signup-pet-photo" data-petlens-multiview-upload>
                            <span className="mb-1 block text-xs font-black text-neutral-500">사진</span>
                            <div className="grid grid-cols-2 gap-2">
                                {PET_PHOTO_VIEWS.map((view) => {
                                    const photo = petPhotoViews[view.id];
                                    return (
                                        <label key={view.id} className="block" data-petlens-photo-view={view.id}>
                                            <span className="mb-1 block text-[11px] font-black text-neutral-500">{view.label}</span>
                                            <span className="grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed border-neutral-300 bg-white text-neutral-400 hover:border-indigo-300">
                                                {photo ? (
                                                    <img src={photo.dataUrl} alt={`${view.label} 반려견 사진`} className="h-full w-full object-cover" />
                                                ) : (
                                                    <i className="fa-solid fa-camera text-xl" />
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    className="hidden"
                                                    data-petlens-mobile-camera-capture
                                                    disabled={photoLoading || loading}
                                                    onChange={(event) => {
                                                        void handlePetPhotoView(view.id, event.target.files?.[0]);
                                                        event.currentTarget.value = "";
                                                    }}
                                                />
                                            </span>
                                            <span className="mt-1 block text-[10px] font-bold leading-4 text-neutral-500">
                                                {photo ? "다시 선택" : view.helper}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                            <span className="mt-2 block text-[11px] font-bold leading-5 text-neutral-500">
                                모바일에서는 카메라가 바로 열립니다. 정면은 대표 사진으로 쓰고, 좌·우·뒷면까지 찍으면 네 방향 사진을 함께 비교해 견종·체형·털색 후보를 더 꼼꼼히 확인합니다.
                            </span>
                            {photoLoading && <span className="mt-2 block text-xs font-black text-indigo-700">사진 분석 중</span>}
                            {photoError && <span className="mt-2 block text-xs font-black text-rose-600">{photoError}</span>}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">반려견 이름</span>
                                <input value={petName} onChange={(event) => setPetName(event.target.value)} className="input" />
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">나이</span>
                                <input value={petAge} onChange={(event) => setPetAge(event.target.value)} className="input" />
                                <span className="mt-1 block text-[11px] font-bold leading-5 text-neutral-500">사진으로 나이를 확정하지 않습니다. 직접 입력해 주세요.</span>
                            </label>
                            <label className="md:col-span-2" data-pet-guide-target="signup-breed">
                                <span className="mb-1 block text-xs font-black text-neutral-500">견종 캐릭터</span>
                                <select
                                    value={petBreedId}
                                    onChange={(event) => {
                                        const nextBreedId = event.target.value;
                                        setPetBreedId(nextBreedId);
                                        setPetBreedSource(event.target.value ? "manual" : "");
                                        if (isPetBreedId(nextBreedId)) {
                                            const selected = getPetBreedVisual(nextBreedId);
                                            setPetBreedCustom("");
                                            setPetBreedMessage(`선택됨: ${selected.ko} · ${selected.en}`);
                                        } else if (nextBreedId === CUSTOM_BREED_OPTION) {
                                            setPetBreedMessage("목록 외 견종 또는 믹스견 이름을 아래에 직접 입력해 주세요.");
                                        } else {
                                            setPetBreedCustom("");
                                            setPetBreedMessage("");
                                        }
                                    }}
                                    className="input"
                                >
                                    <option value="">사진 분석 결과 확인 또는 직접 선택</option>
                                    <option value={CUSTOM_BREED_OPTION}>목록 외 견종 · 믹스견 직접 입력</option>
                                    {PET_BREEDS.map((breed) => (
                                        <option key={breed.id} value={breed.id}>
                                            {breed.ko} · {breed.en}
                                        </option>
                                    ))}
                                </select>
                                <span className="mt-1 block text-[11px] font-bold leading-5 text-neutral-500">
                                    {petBreedMessage || "사진 분석 결과는 후보입니다. 120종 캐릭터 또는 목록 외 견종으로 확인해 주세요."}
                                </span>
                            </label>
                            {petBreedId === CUSTOM_BREED_OPTION && (
                                <label className="md:col-span-2">
                                    <span className="mb-1 block text-xs font-black text-neutral-500">실제 견종 또는 믹스견</span>
                                    <input
                                        value={petBreedCustom}
                                        onChange={(event) => {
                                            setPetBreedCustom(event.target.value);
                                            setPetBreedSource("manual");
                                        }}
                                        className="input"
                                        maxLength={100}
                                        placeholder="예: 시바견, 골든두들, 믹스견"
                                        required
                                        data-petlens-custom-breed
                                    />
                                    <span className="mt-1 block text-[11px] font-bold leading-5 text-neutral-500">
                                        캐릭터 120종에 없어도 회원 프로필에는 실제 견종명을 그대로 저장하며, 나중에 마이페이지에서 수정할 수 있습니다.
                                    </span>
                                </label>
                            )}
                            {petAnalysisMessage && (
                                <p
                                    className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold leading-5 text-indigo-800 md:col-span-2"
                                    data-petlens-signup-draft-restored
                                    aria-live="polite"
                                >
                                    {petAnalysisMessage}
                                </p>
                            )}
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">크기</span>
                                <select value={petSize} onChange={(event) => setPetSize(event.target.value as PetProfile["size"])} className="input">
                                    <option value="small">소형</option>
                                    <option value="medium">중형</option>
                                    <option value="large">대형</option>
                                </select>
                                <span className="mt-1 block text-[11px] font-bold leading-5 text-neutral-500">사진 후보가 반영될 수 있으니 실제 크기로 확인해 주세요.</span>
                            </label>
                            <label data-pet-guide-target="signup-weight">
                                <span className="mb-1 block text-xs font-black text-neutral-500">현재 체중 (kg)</span>
                                <input
                                    type="number"
                                    min="0.1"
                                    max="120"
                                    step="0.1"
                                    inputMode="decimal"
                                    value={petWeightKg}
                                    onChange={(event) => setPetWeightKg(event.target.value)}
                                    className="input"
                                    placeholder="직접 확인한 체중"
                                />
                                {petWeightEstimate ? (
                                    <span className="mt-1 block text-[11px] font-black leading-5 text-amber-700">
                                        예상 {petWeightEstimate.minKg}~{petWeightEstimate.maxKg}kg · 확인 필요
                                    </span>
                                ) : (
                                    <span className="mt-1 block text-[11px] font-bold leading-5 text-neutral-500">사진으로 실제 체중을 측정하지 않습니다.</span>
                                )}
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">모질 길이</span>
                                <select value={petCoat} onChange={(event) => setPetCoat(event.target.value as PetProfile["coat"])} className="input">
                                    <option value="short">단모</option>
                                    <option value="medium">중모</option>
                                    <option value="long">장모</option>
                                </select>
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">털 색상</span>
                                <input
                                    value={petCoatColor}
                                    onChange={(event) => {
                                        setPetCoatColor(event.target.value);
                                        setPetCoatColorSource(event.target.value ? "manual" : "");
                                    }}
                                    className="input"
                                    maxLength={80}
                                    placeholder="예: 크림, 검정·갈색"
                                />
                                {petCoatColorSource === "ai" && (
                                    <span className="mt-1 block text-[11px] font-black leading-5 text-amber-700">사진 분석 후보 · 확인 필요</span>
                                )}
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">성별</span>
                                <select value={petSex} onChange={(event) => setPetSex(event.target.value as NonNullable<PetProfile["sex"]>)} className="input">
                                    <option value="unknown">선택 안 함</option>
                                    <option value="female">암컷</option>
                                    <option value="male">수컷</option>
                                </select>
                                <span className="mt-1 block text-[11px] font-bold leading-5 text-neutral-500">사진으로 성별을 추정하지 않습니다.</span>
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">활동량</span>
                                <select value={petActivity} onChange={(event) => setPetActivity(event.target.value as PetProfile["activity"])} className="input">
                                    <option value="low">차분한 편</option>
                                    <option value="normal">보통 활동량</option>
                                    <option value="high">활동량 많음</option>
                                </select>
                            </label>
                        </div>
                    </div>
                    <div>
                        <span className="mb-2 block text-xs font-black text-neutral-500">관심 케어</span>
                        <div className="flex flex-wrap gap-2">
                            {CONCERN_OPTIONS.map((concern) => {
                                const checked = petConcerns.includes(concern);
                                return (
                                    <label
                                        key={concern}
                                        className={[
                                            "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-black",
                                            checked
                                                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                                : "border-neutral-200 bg-white text-neutral-700",
                                        ].join(" ")}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleConcern(concern)}
                                            className="h-3.5 w-3.5 accent-indigo-600"
                                        />
                                        {concern}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <section
                    className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-4"
                    data-pet-guide-target="signup-submit"
                    data-signup-required-agreements
                >
                    <div>
                        <h2 className="text-sm font-black text-neutral-950">약관 및 개인정보 동의</h2>
                        <p className="mt-1 text-xs font-bold leading-5 text-neutral-500">
                            필수 동의는 회원가입에 필요하며, 선택 동의는 PetLens 프로필 저장을 원하는 경우에만 사용합니다.
                        </p>
                    </div>

                    <div className="grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3" data-signup-terms-agreement>
                        <label className="flex items-start gap-3 text-sm font-bold leading-6 text-neutral-700">
                            <input
                                type="checkbox"
                                checked={agreeTerms}
                                onChange={(event) => setAgreeTerms(event.target.checked)}
                                className="mt-1 h-4 w-4 accent-indigo-600"
                            />
                            <span>
                                <b className="font-black text-neutral-950">{SIGNUP_TERMS_AGREEMENT.title}</b>{" "}
                                <Link href={SIGNUP_TERMS_AGREEMENT.href} className="font-black text-indigo-700">
                                    전체보기
                                </Link>
                            </span>
                        </label>
                        <ul className="grid gap-1 pl-7 text-xs font-bold leading-5 text-neutral-600">
                            {SIGNUP_TERMS_AGREEMENT.summary.map((item) => (
                                <li key={item} className="list-disc">
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3" data-signup-privacy-consent>
                        <label className="flex items-start gap-3 text-sm font-bold leading-6 text-neutral-700">
                            <input
                                type="checkbox"
                                checked={agreePrivacy}
                                onChange={(event) => setAgreePrivacy(event.target.checked)}
                                className="mt-1 h-4 w-4 accent-indigo-600"
                            />
                            <span>
                                <b className="font-black text-neutral-950">{SIGNUP_REQUIRED_PRIVACY_CONSENT.title}</b>{" "}
                                <Link href={SIGNUP_REQUIRED_PRIVACY_CONSENT.href} className="font-black text-indigo-700">
                                    처리방침 보기
                                </Link>
                            </span>
                        </label>
                        <p className="pl-7 text-xs font-bold leading-5 text-neutral-600">
                            {SIGNUP_REQUIRED_PRIVACY_CONSENT.intro}
                        </p>
                        <div className="ml-7 overflow-hidden rounded-md border border-neutral-200 bg-white text-xs font-bold text-neutral-600">
                            <div className="grid grid-cols-[1fr_1.2fr_1.3fr] bg-neutral-100 text-[11px] font-black text-neutral-500">
                                <span className="border-r border-neutral-200 px-2 py-2">수집 항목</span>
                                <span className="border-r border-neutral-200 px-2 py-2">이용 목적</span>
                                <span className="px-2 py-2">보유 및 이용기간</span>
                            </div>
                            {SIGNUP_REQUIRED_PRIVACY_CONSENT.rows.map((row) => (
                                <div key={row.item} className="grid grid-cols-[1fr_1.2fr_1.3fr] border-t border-neutral-100">
                                    <span className="border-r border-neutral-100 px-2 py-2">{row.item}</span>
                                    <span className="border-r border-neutral-100 px-2 py-2">{row.purpose}</span>
                                    <span className="px-2 py-2">{row.retention}</span>
                                </div>
                            ))}
                        </div>
                        <p className="pl-7 text-[11px] font-bold leading-5 text-neutral-500">
                            {SIGNUP_REQUIRED_PRIVACY_CONSENT.refusalNotice}
                        </p>
                    </div>

                    <div className="grid gap-3 rounded-md border border-indigo-100 bg-indigo-50/50 p-3" data-signup-petlens-optional-consent>
                        <label className="flex items-start gap-3 text-sm font-bold leading-6 text-neutral-700">
                            <input
                                type="checkbox"
                                checked={agreePetLensPrivacy}
                                onChange={(event) => setAgreePetLensPrivacy(event.target.checked)}
                                className="mt-1 h-4 w-4 accent-indigo-600"
                            />
                            <span>
                                <b className="font-black text-neutral-950">{SIGNUP_PETLENS_PRIVACY_CONSENT.title}</b>
                            </span>
                        </label>
                        <p className="pl-7 text-xs font-bold leading-5 text-neutral-600">
                            {SIGNUP_PETLENS_PRIVACY_CONSENT.intro}
                        </p>
                        <div className="ml-7 overflow-hidden rounded-md border border-indigo-100 bg-white text-xs font-bold text-neutral-600">
                            {SIGNUP_PETLENS_PRIVACY_CONSENT.rows.map((row) => (
                                <div key={row.item} className="grid gap-1 p-3">
                                    <p>
                                        <b className="text-neutral-950">수집 항목:</b> {row.item}
                                    </p>
                                    <p>
                                        <b className="text-neutral-950">이용 목적:</b> {row.purpose}
                                    </p>
                                    <p>
                                        <b className="text-neutral-950">보유기간:</b> {row.retention}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <p className="pl-7 text-[11px] font-bold leading-5 text-neutral-500">
                            {SIGNUP_PETLENS_PRIVACY_CONSENT.refusalNotice}
                        </p>
                    </div>
                </section>
                <button type="submit" className="btn btn-primary w-full" disabled={photoLoading || loading}>
                    <i className="fa-solid fa-user-plus text-xs" />
                    {loading ? "가입 처리 중" : "가입하고 휴대전화 인증"}
                </button>
            </form>
            <p className="mt-5 text-center text-sm font-bold text-neutral-600">
                이미 계정이 있다면{" "}
                <Link href="/auth/login" className="font-black text-indigo-700">
                    로그인
                </Link>
            </p>
        </main>
    );
}
