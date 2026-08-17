"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CatalogProduct } from "@/lib/catalog";
import {
    getLatestPetTryOnMaster,
    getPetTryOnJob,
    isPetTryOnFootwearProduct,
    isPetTryOnHarnessJacketProduct,
    isPetTryOnHearingProtectionProduct,
    isPetTryOnLifeJacketProduct,
    isPetTryOnNeckwearProduct,
    isPetTryOnSnoodProduct,
    petTryOnReferencePhoto,
    requestPetTryOnColorPreview,
    reviewPetTryOnGeometry,
    type PetTryOnApiErrorCode,
    type PetTryOnColorPreview,
    type PetTryOnCorrectionIssue,
    type PetTryOnProgressStage,
} from "@/lib/pet-tryon";
import {
    petTryOnReferenceKey,
    readPetTryOnFitMasterWithLegacy,
    removePetTryOnFitMaster,
    savePetTryOnFitMaster,
    type PetTryOnFitMasterIdentity,
} from "@/lib/pet-tryon-fit-master";
import {
    getPetTryOnEligibility,
    isPetTryOnDogPackProduct,
} from "@/lib/pet-tryon-eligibility";
import {
    PetTryOnEmailDeliveryControls,
    usePetTryOnTask,
} from "@/lib/pet-tryon-background";
import { hasVerifiedPetPhoto, useAuth, type PetProfile } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import ColorSelect from "./ColorSelect";

function petOptionLabel(pet: PetProfile) {
    const size = pet.size === "small" ? "소형" : pet.size === "large" ? "대형" : "중형";
    return `${pet.name || "우리 아이"} · ${size}`;
}

function loadingLabel(locale: "ko" | "en", stage: PetTryOnProgressStage) {
    const labels = locale === "en"
        ? {
            queued: "Waiting for the fitting room",
            preparing: "Checking your dog's photo and exact product",
            generating: "Creating a natural fit on your dog",
            finalizing: "Finishing fur, shadows, and product details",
            ready: "Fitting complete",
            failed: "Fitting needs another try",
        }
        : {
            queued: "입혀보기 작업 순서를 기다리고 있어요",
            preparing: "우리 아이 사진과 선택 상품을 확인하고 있어요",
            generating: "몸에 맞게 자연스럽게 입히고 있어요",
            finalizing: "털·그림자·상품 디테일을 마무리하고 있어요",
            ready: "입혀보기가 완성됐어요",
            failed: "입혀보기를 다시 시도해 주세요",
        };
    return labels[stage];
}

function formatElapsed(seconds: number) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const PROGRESS_STAGES: PetTryOnProgressStage[] = ["preparing", "generating", "finalizing", "ready"];
type CorrectionOption = { value: PetTryOnCorrectionIssue; ko: string; en: string };
type PetTryOnReviewKind = "wear" | "harness" | "goggles" | "leash" | "collar" | "snood" | "hearing_protection" | "harness_jacket" | "dog_pack" | "footwear" | "life_jacket" | "neckwear";

const PRODUCT_SHAPE_CORRECTION_OPTIONS: Record<PetTryOnReviewKind, CorrectionOption[]> = {
    wear: [
        { value: "back_length", ko: "등·밑단 길이", en: "Back / hem length" },
        { value: "belly_line", ko: "배 부분·아랫단", en: "Belly / lower hem" },
        { value: "front_sleeve", ko: "앞다리 구멍·앞소매", en: "Front leg holes / sleeves" },
        { value: "rear_leg", ko: "뒷다리 구멍·하반신", en: "Rear leg holes / lower body" },
        { value: "neckline", ko: "목 부분", en: "Neckline" },
    ],
    harness: [
        { value: "back_length", ko: "등판 위치·길이", en: "Back panel placement" },
        { value: "belly_line", ko: "가슴·배 스트랩", en: "Chest / belly straps" },
        { value: "front_sleeve", ko: "앞다리 간격·겨드랑이", en: "Front-leg clearance" },
        { value: "neckline", ko: "목·가슴 둘레", en: "Neck / chest fit" },
    ],
    goggles: [
        { value: "neckline", ko: "렌즈·눈 위치·머리끈", en: "Lens / eye / head straps" },
    ],
    leash: [
        { value: "neckline", ko: "스냅 고리·목 부착 위치", en: "Snap hook / neck attachment" },
    ],
    collar: [
        { value: "neckline", ko: "목 둘레·버클·D링", en: "Neck loop / buckle / D-ring" },
    ],
    snood: [
        { value: "coverage", ko: "머리·귀 덮임", en: "Head / ear coverage" },
        { value: "neckline", ko: "얼굴 구멍·목 아랫단", en: "Face opening / neck edge" },
    ],
    hearing_protection: [
        { value: "coverage", ko: "양쪽 귀 보호 패널", en: "Both ear-protection panels" },
        { value: "neckline", ko: "머리·목 착용 위치", en: "Head / neck placement" },
    ],
    harness_jacket: [
        { value: "back_length", ko: "등·엉덩이 덮임 길이", en: "Back / upper-rump length" },
        { value: "coverage", ko: "옆구리·엉덩이 덮임", en: "Flank / upper-rump coverage" },
        { value: "belly_line", ko: "배 부분·하네스 스트랩", en: "Belly / harness straps" },
        { value: "neckline", ko: "목·가슴 시작 위치", en: "Neck / chest placement" },
    ],
    dog_pack: [
        { value: "coverage", ko: "양쪽 수납 가방", en: "Both side panniers" },
        { value: "back_length", ko: "등판 위치와 길이", en: "Back bridge placement" },
        { value: "belly_line", ko: "가슴·배 스트랩", en: "Chest / belly straps" },
        { value: "front_sleeve", ko: "앞다리 여유", en: "Front-leg clearance" },
    ],
    footwear: [
        { value: "coverage", ko: "신발 개수와 발 위치", en: "Shoe count / paw placement" },
    ],
    life_jacket: [
        { value: "coverage", ko: "부력 패널과 몸통 감쌈", en: "Flotation-panel coverage" },
        { value: "belly_line", ko: "가슴·배 스트랩", en: "Chest / belly straps" },
        { value: "back_length", ko: "등판과 뒤쪽 밑단", en: "Back panel / rear hem" },
        { value: "neckline", ko: "목둘레 위치", en: "Neck opening" },
    ],
    neckwear: [
        { value: "coverage", ko: "목만 감싸는 범위", en: "Neck-only coverage" },
        { value: "neckline", ko: "위·아래 가장자리", en: "Upper / lower edge" },
    ],
};

const COLOR_PATTERN_CORRECTION_OPTIONS: CorrectionOption[] = [
    { value: "pattern", ko: "색상·무늬", en: "Color / pattern" },
];

function petTryOnReviewKind(product: CatalogProduct): PetTryOnReviewKind {
    if (isPetTryOnHearingProtectionProduct(product)) return "hearing_protection";
    if (isPetTryOnSnoodProduct(product)) return "snood";
    if (isPetTryOnHarnessJacketProduct(product)) return "harness_jacket";
    if (isPetTryOnDogPackProduct(product)) return "dog_pack";
    if (isPetTryOnFootwearProduct(product)) return "footwear";
    if (isPetTryOnLifeJacketProduct(product)) return "life_jacket";
    if (isPetTryOnNeckwearProduct(product)) return "neckwear";
    if (product.subcategory === "wear") return "wear";
    if (product.subcategory === "harness") return "harness";
    if (product.subcategory === "goggles") return "goggles";
    const identity = `${product.raw.useSub} ${product.name} ${product.folder || ""}`.toLocaleLowerCase();
    if (identity.includes("목줄") || /collar|martingale/.test(identity)) return "collar";
    return "leash";
}

function geometryReviewDescription(kind: PetTryOnReviewKind, locale: "ko" | "en") {
    const descriptions = locale === "en"
        ? {
            wear: "Compare the hem, belly, front and rear leg openings, neckline, and length with the product photo.",
            harness: "Compare the neck and chest fit, back panel, strap routing, and front-leg clearance with the product photo.",
            goggles: "Compare the lens position, eye coverage, worn angle, and every head or chin strap with the product photo.",
            leash: "Confirm that the exact snap hook is visibly closed through a collar or harness D-ring at the neck. The lead must not start from fur, the shoulder, or the back. Any newly shown plain collar is a fitting aid and is not included with the product.",
            collar: "Confirm that the collar forms a continuous neck loop and that its real buckle, adjuster, D-ring, and width match the product photo.",
            snood: "Confirm that the snood covers both real ears completely, shows only the product's decorative ears, frames the face, and stops above the shoulders.",
            hearing_protection: "Confirm that both padded acoustic side panels fully cover the real ears, the crown and rear wrap match the product, the eyes and muzzle stay open, and no goggles or lenses were added.",
            harness_jacket: "Confirm that the continuous jacket shell reaches the tail base and covers both flanks, hips, and upper rump while leaving the tail, groin, and legs free, and that the integrated harness hardware remains complete.",
            dog_pack: "Confirm that two balanced panniers sit on the left and right ribcage, remain joined to one centered harness, and preserve every real zipper, strap, buckle, handle, and leash point.",
            footwear: "Confirm the product count, paw placement, forward toe direction, low cuff, sole, and closures, and make sure no footwear became a leg or body garment.",
            life_jacket: "Confirm the flotation panels wrap the neck, chest, ribcage, and belly, the rescue handle and straps remain complete, and all legs, the groin, and tail stay free.",
            neckwear: "Confirm that one closed fabric loop wraps only the lower neck below both ears and above both shoulders without covering the head, face, chest, or torso.",
        }
        : {
            wear: "상품 사진과 밑단·배 부분·앞뒤 다리 구멍·목 부분·길이가 맞는지 확인해 주세요.",
            harness: "상품 사진과 목·가슴 둘레, 등판, 스트랩 경로, 앞다리 간격이 맞는지 확인해 주세요.",
            goggles: "상품 사진과 렌즈·눈 위치, 착용 각도, 머리끈·턱끈 경로가 맞는지 확인해 주세요.",
            leash: "상품의 실제 스냅 고리가 목 부분의 목줄·하네스 D링에 닫혀 있는지 확인해 주세요. 줄이 털·어깨·등에서 바로 시작하면 잘못된 결과예요. 새로 표시된 무채색 기본 목줄은 연결 연출용이며 상품 구성에 포함되지 않아요.",
            collar: "목줄이 목을 한 바퀴 연속해서 감싸고 실제 버클·조절부·D링·폭이 상품 사진과 맞는지 확인해 주세요.",
            snood: "스누드가 강아지의 실제 양쪽 귀를 완전히 덮고 상품 장식 귀만 보이는지, 얼굴 구멍과 어깨 위 아랫단이 맞는지 확인해 주세요.",
            hearing_protection: "양쪽 청력보호 패널이 실제 귀를 완전히 덮고 머리 위·뒤쪽 감싸임이 상품과 맞는지, 눈과 주둥이는 열려 있고 고글·렌즈가 추가되지 않았는지 확인해 주세요.",
            harness_jacket: "재킷의 연속된 등판이 꼬리 시작점까지 이어져 양쪽 옆구리·엉덩이 윗부분을 덮는지, 꼬리·사타구니·다리는 열려 있고 일체형 하네스 부품이 모두 유지됐는지 확인해 주세요.",
            dog_pack: "왼쪽과 오른쪽 수납 가방이 균형 있게 갈비뼈 옆에 있고 하나의 중앙 하네스에 연결됐는지, 지퍼·스트랩·버클·손잡이·리드 연결부가 유지됐는지 확인해 주세요.",
            footwear: "상품 수량과 발 위치, 발끝 방향, 낮은 커프, 밑창과 잠금부가 맞는지, 신발이 다리 덮개나 몸통 옷으로 바뀌지 않았는지 확인해 주세요.",
            life_jacket: "부력 패널이 목·가슴·갈비뼈·배를 감싸고 구조 손잡이와 스트랩이 유지됐는지, 모든 다리·사타구니·꼬리는 열려 있는지 확인해 주세요.",
            neckwear: "하나의 닫힌 천 고리가 양쪽 귀 아래와 양쪽 어깨 위의 목만 감싸고 머리·얼굴·가슴·몸통을 덮지 않는지 확인해 주세요.",
        };
    return descriptions[kind];
}

function geometryCorrectionTitle(kind: PetTryOnReviewKind, locale: "ko" | "en") {
    if (locale === "en") {
        if (kind === "leash") return "Correct leash connection";
        if (kind === "collar") return "Correct collar fit";
        if (kind === "goggles") return "Correct goggles fit";
        if (kind === "snood") return "Correct snood coverage";
        if (kind === "hearing_protection") return "Correct hearing-protection fit";
        if (kind === "harness_jacket") return "Correct harness-jacket coverage";
        if (kind === "dog_pack") return "Correct dog-pack fit";
        if (kind === "footwear") return "Correct footwear placement";
        if (kind === "life_jacket") return "Correct life-jacket fit";
        if (kind === "neckwear") return "Correct neck-gaiter fit";
        return "Correct product shape";
    }
    if (kind === "leash") return "리드줄 연결 위치 보정";
    if (kind === "collar") return "목줄 착용 형태 보정";
    if (kind === "goggles") return "고글 착용 위치 보정";
    if (kind === "snood") return "스누드 머리·귀 덮임 보정";
    if (kind === "hearing_protection") return "청력보호 헤드기어 보정";
    if (kind === "harness_jacket") return "하네스 재킷 길이·덮임 보정";
    if (kind === "dog_pack") return "강아지용 백팩 위치·균형 보정";
    if (kind === "footwear") return "신발 개수·발 위치 보정";
    if (kind === "life_jacket") return "구명조끼 부력 패널·스트랩 보정";
    if (kind === "neckwear") return "넥 게이터 목 덮임 보정";
    return "제품 형태 보정";
}

function sidePhotoRequirement(kind: PetTryOnReviewKind, locale: "ko" | "en") {
    if (locale === "en") {
        if (kind === "leash") return "Add a left or right full-body photo first. Leash connection preview needs a clear side view of the neck and body.";
        if (kind === "collar") return "Add a left or right full-body photo first. Collar preview needs a clear side view of the neck.";
        if (kind === "harness") return "Add a left or right full-body photo first. Harness Smart Fit uses a side view, not the front photo.";
        if (kind === "snood") return "Add a clear front photo first. Snood Smart Fit needs the head, both ears, and neck to be visible.";
        if (kind === "hearing_protection") return "Add a clear front or side photo first. Hearing-protection Smart Fit needs the head, both ears, and upper neck to be visible.";
        if (kind === "dog_pack") return "Add a left or right full-body photo first. Dog-pack Smart Fit needs a clear side view of the back, ribcage, belly, and legs.";
        if (kind === "footwear") return "Add a left or right full-body photo first. Footwear Smart Fit needs every intended paw to be visible.";
        if (kind === "life_jacket") return "Add a left or right full-body photo first. Life-jacket Smart Fit needs the neck, torso, belly, legs, and tail base to be visible.";
        if (kind === "neckwear") return "Add a left or right full-body photo first. Neck-gaiter Smart Fit needs the ears, neck, shoulders, and chest boundary to be visible.";
        return "Add a left or right full-body photo first. Clothing Smart Fit uses a side view, not the front photo.";
    }
    if (kind === "leash") return "리드줄 연결 확인에는 목과 몸이 잘 보이는 왼쪽 또는 오른쪽 측면 전신 사진이 필요해요.";
    if (kind === "collar") return "목줄 착용 확인에는 목이 잘 보이는 왼쪽 또는 오른쪽 측면 전신 사진이 필요해요.";
    if (kind === "harness") return "하네스 입혀보기는 정면이 아닌 측면 전신 사진을 사용해요. 왼쪽 또는 오른쪽 사진을 먼저 등록해 주세요.";
    if (kind === "snood") return "스누드 입혀보기에는 머리·양쪽 귀·목이 잘 보이는 정면 사진이 필요해요.";
    if (kind === "hearing_protection") return "청력보호 헤드기어 입혀보기에는 머리·양쪽 귀·목 윗부분이 잘 보이는 정면 또는 측면 사진이 필요해요.";
    if (kind === "dog_pack") return "강아지용 백팩 입혀보기에는 등·갈비뼈·배·다리가 잘 보이는 왼쪽 또는 오른쪽 측면 전신 사진이 필요해요.";
    if (kind === "footwear") return "신발 입혀보기에는 착용할 발이 모두 보이는 왼쪽 또는 오른쪽 측면 전신 사진이 필요해요.";
    if (kind === "life_jacket") return "구명조끼 입혀보기에는 목·몸통·배·다리·꼬리 시작점이 보이는 측면 전신 사진이 필요해요.";
    if (kind === "neckwear") return "넥 게이터 입혀보기에는 귀·목·어깨·가슴 경계가 보이는 측면 전신 사진이 필요해요.";
    return "옷 입혀보기는 정면이 아닌 측면 전신 사진을 사용해요. 왼쪽 또는 오른쪽 사진을 먼저 등록해 주세요.";
}

function apiErrorMessage(code: PetTryOnApiErrorCode, locale: "ko" | "en") {
    if (locale === "en") {
        if (code === "login_required") return "Your login has expired. Sign in again to continue Smart Fit.";
        if (code === "already_running") return "A Smart Fit job is already running. Open the status panel and wait for it to finish.";
        if (code === "rate_limited") return "The analysis system is taking longer than usual. Nothing new was started automatically, so please try again later.";
        if (code === "invalid_request") return "We could not connect the selected product with the saved photo. The photo itself may be fine. Re-select it from the product page; nothing new was started automatically.";
        if (code === "not_found") return "We could not reconnect to the saved fitting. Nothing new was started automatically, so please try again later.";
        if (code === "aborted") return "The request was stopped. No additional fitting was started.";
        return "The analysis system is temporarily delayed. Nothing new was started automatically, so please try again later.";
    }
    if (code === "login_required") return "로그인이 만료됐어요. 다시 로그인한 뒤 입혀보기를 이어서 확인해 주세요.";
    if (code === "already_running") return "이미 진행 중인 입혀보기가 있어요. 상태 창에서 완료될 때까지 기다려 주세요.";
    if (code === "rate_limited") return "현재 분석 시스템이 평소보다 지연되고 있어요. 새 작업은 자동으로 시작되지 않았으니 잠시 후 다시 이용해 주세요.";
    if (code === "invalid_request") return "상품과 저장된 사진의 연결 정보를 확인하지 못했어요. 사진 자체의 문제가 아닐 수 있어요. 상품 화면에서 사진을 다시 선택해 주세요. 새 작업은 자동으로 시작하지 않았습니다.";
    if (code === "not_found") return "저장된 입혀보기 작업을 다시 연결하지 못했어요. 새 작업은 자동으로 시작되지 않았으니 잠시 후 다시 이용해 주세요.";
    if (code === "aborted") return "요청이 중단됐어요. 추가 입혀보기 작업은 시작하지 않았습니다.";
    return "현재 분석 시스템이 잠시 지연되고 있어요. 새 작업은 자동으로 시작되지 않았으니 잠시 후 다시 이용해 주세요.";
}

function ineligibleMessage(reason: ReturnType<typeof getPetTryOnEligibility>["reason"], locale: "ko" | "en") {
    if (locale === "en") {
        if (reason === "missing_image") return "This product does not have a usable catalog image yet.";
        if (reason === "requires_base_product") return "This accessory needs its complete base product and cannot be fitted by itself.";
        if (reason === "accessory_only" || reason === "not_pet_wearable") return "This item is not worn directly by a dog.";
        return "Smart Fit is not available for this product category yet.";
    }
    if (reason === "missing_image") return "이 상품은 입혀보기에 사용할 수 있는 상품 이미지가 아직 없어요.";
    if (reason === "requires_base_product") return "이 액세서리는 완제품과 함께 사용해야 해서 단독으로 입혀볼 수 없어요.";
    if (reason === "accessory_only" || reason === "not_pet_wearable") return "강아지가 직접 착용하는 상품이 아니라 입혀보기를 제공하지 않아요.";
    return "이 상품 분류는 아직 스마트 입혀보기를 지원하지 않아요.";
}

type ReadyFit = {
    jobId: string;
    productImage: string;
    imageDataUrl: string;
    geometryVerified: boolean;
};

function preciseCacheKey(petProfileId: number, productId: string, productImage: string) {
    return `${petProfileId}:${productId}:${productImage}`;
}

function fastPreviewCacheKey(sourceJobId: string, productImage: string) {
    return `${sourceJobId}:${productImage}`;
}

export default function PetTryOnPreview({
    product,
    colorIdx,
    onColorChange,
    onClose,
}: {
    product: CatalogProduct;
    colorIdx: number | null;
    onColorChange: (index: number) => void;
    onClose: () => void;
}) {
    const { user, hydrated } = useAuth();
    const { locale, productName } = useI18n();
    const {
        notificationEnabled,
        start,
        getTaskFor,
        requestCompletionNotification,
        setPanelOpen,
    } = usePetTryOnTask();
    const hasColorVariants = Boolean(product.colors?.length);
    const selectedColor = colorIdx == null ? undefined : product.colors?.[colorIdx];
    const explicitColorRequired = hasColorVariants && !selectedColor?.image;
    const tryOnProduct = useMemo(
        () => selectedColor?.image ? { ...product, image: selectedColor.image } : product,
        [product, selectedColor],
    );
    const reviewKind = useMemo(() => petTryOnReviewKind(tryOnProduct), [tryOnProduct]);
    const productShapeCorrectionOptions = PRODUCT_SHAPE_CORRECTION_OPTIONS[reviewKind];
    const eligibility = getPetTryOnEligibility(tryOnProduct);
    const eligible = eligibility.eligible;
    // Every wearable asks the authenticated saved-fit preview endpoint first.
    // The server remains the authority and fails closed when a particular
    // product/photo pair cannot be recolored without touching the dog.
    const zeroAiColorPreviewEnabled = eligibility.zeroAiColorPreview === "server_verified";
    const pets = useMemo(() => (user?.pets ?? []).filter(hasVerifiedPetPhoto), [user]);
    const [selected, setSelected] = useState(0);
    const [error, setError] = useState("");
    const [errorCode, setErrorCode] = useState<PetTryOnApiErrorCode | null>(null);
    const [now, setNow] = useState(0);
    const [preciseFits, setPreciseFits] = useState<Record<string, ReadyFit>>({});
    const [fastPreviews, setFastPreviews] = useState<Record<string, PetTryOnColorPreview>>({});
    const [fastPreviewUnavailableKey, setFastPreviewUnavailableKey] = useState("");
    const [mismatchOpen, setMismatchOpen] = useState(false);
    const [correctionIssues, setCorrectionIssues] = useState<PetTryOnCorrectionIssue[]>([]);
    const [preciseRegenerationOpen, setPreciseRegenerationOpen] = useState(false);
    const [generationRequestPending, setGenerationRequestPending] = useState(false);
    const [geometryReviewOverrides, setGeometryReviewOverrides] = useState<Record<string, boolean>>({});
    const [geometryReviewSubmitting, setGeometryReviewSubmitting] = useState(false);
    const [geometryReviewError, setGeometryReviewError] = useState("");
    const [fitMasterRestorePending, setFitMasterRestorePending] = useState(true);
    const [fitMasterRestoreBlocked, setFitMasterRestoreBlocked] = useState(false);
    const generationRequestPendingRef = useRef(false);
    const geometryReviewPendingRef = useRef(false);

    const pet = pets[selected] ?? pets[0];
    const petReferenceImage = pet ? petTryOnReferencePhoto(tryOnProduct, pet) : undefined;
    const fitMasterIdentity = useMemo<PetTryOnFitMasterIdentity | null>(() => {
        if (!pet?.apiProfileId || !petReferenceImage) return null;
        return {
            ownerKey: user?.apiUserId ? `user:${user.apiUserId}` : `pet:${pet.apiProfileId}`,
            petProfileId: pet.apiProfileId,
            productId: product.id,
            petReferenceKey: petTryOnReferenceKey(petReferenceImage),
        };
    }, [pet?.apiProfileId, petReferenceImage, product.id, user?.apiUserId]);
    const sameProductTask = pet?.apiProfileId
        ? getTaskFor(product.id, pet.apiProfileId, undefined, petReferenceImage)
        : null;
    const currentTask = !explicitColorRequired && pet?.apiProfileId
        ? getTaskFor(product.id, pet.apiProfileId, tryOnProduct.image, petReferenceImage)
        : null;
    const result = currentTask?.result ?? null;
    const displayedError = error || currentTask?.error || "";
    const displayedErrorCode = errorCode || currentTask?.apiErrorCode || null;
    const loading = Boolean(currentTask?.submitting || result?.status === "queued" || result?.status === "running");
    const finalGenerationFailed = result?.status === "failed";
    const systemIssue = Boolean(displayedErrorCode || finalGenerationFailed);
    const systemIssueTitle = finalGenerationFailed
        ? locale === "en" ? "We could not prepare this result" : "이번 결과를 준비하지 못했어요"
        : displayedErrorCode === "login_required"
            ? locale === "en" ? "Sign in to continue" : "다시 로그인해 이어서 확인해 주세요"
            : displayedErrorCode === "already_running"
                ? locale === "en" ? "Your fitting is already in progress" : "진행 중인 입혀보기가 있어요"
                : displayedErrorCode === "invalid_request"
                    ? locale === "en" ? "Reconnect the product and saved photo" : "상품과 사진 연결을 다시 확인해 주세요"
                    : displayedErrorCode === "not_found"
                        ? locale === "en" ? "We could not reconnect this fitting" : "이전 입혀보기를 연결하지 못했어요"
                        : locale === "en" ? "Smart Fit is temporarily delayed" : "현재 분석 시스템이 잠시 지연되고 있어요";
    const progress = result?.progressPercent ?? (currentTask?.submitting ? 4 : 0);
    const stage: PetTryOnProgressStage = result?.progressStage ?? "queued";
    const elapsed = currentTask ? Math.max(0, Math.floor((now - currentTask.startedAt) / 1000)) : 0;
    const liveReadyFit = useMemo<ReadyFit | null>(() => (
        sameProductTask?.result?.status === "ready" && sameProductTask.result.imageDataUrl
            ? {
                jobId: sameProductTask.result.jobId,
                productImage: sameProductTask.productImage,
                imageDataUrl: sameProductTask.result.imageDataUrl,
                geometryVerified: geometryReviewOverrides[sameProductTask.result.jobId]
                    ?? sameProductTask.result.geometryVerified === true,
            }
            : null
    ), [geometryReviewOverrides, sameProductTask]);
    const selectedPreciseKey = pet?.apiProfileId && tryOnProduct.image
        ? preciseCacheKey(pet.apiProfileId, product.id, tryOnProduct.image)
        : "";
    const cachedSelectedFit = selectedPreciseKey ? preciseFits[selectedPreciseKey] : undefined;
    const selectedPreciseFit = liveReadyFit?.productImage === tryOnProduct.image
        ? liveReadyFit
        : cachedSelectedFit;
    const cachedSourceFit = pet?.apiProfileId
        ? Object.entries(preciseFits).find(([key]) => key.startsWith(`${pet.apiProfileId}:${product.id}:`))?.[1]
        : undefined;
    // When the member is looking at an exact cached precise result, that
    // displayed result is the one whose geometry must be reviewed/revoked.
    const sourceFit = selectedPreciseFit || liveReadyFit || cachedSourceFit;
    const selectedFastKey = sourceFit && tryOnProduct.image
        ? fastPreviewCacheKey(sourceFit.jobId, tryOnProduct.image)
        : "";
    const selectedFastPreview = selectedFastKey && sourceFit?.geometryVerified === true
        ? fastPreviews[selectedFastKey]
        : undefined;
    const isFastPreview = Boolean(!selectedPreciseFit && selectedFastPreview);
    const geometryReviewNeeded = Boolean(sourceFit && sourceFit.geometryVerified !== true);
    const shouldRequestFastPreview = Boolean(
        !explicitColorRequired
        && zeroAiColorPreviewEnabled
        && sourceFit
        && sourceFit.geometryVerified === true
        && tryOnProduct.image
        && sourceFit.productImage !== tryOnProduct.image
        && !selectedPreciseFit
        && selectedFastKey
        && !selectedFastPreview
    );
    const isFastPreviewLoading = Boolean(
        shouldRequestFastPreview
        && fastPreviewUnavailableKey !== selectedFastKey,
    );
    const geometryDecisionPending = Boolean(geometryReviewNeeded && correctionIssues.length === 0);
    const confirmedRegenerationRequired = Boolean(
        !explicitColorRequired
        && !fitMasterRestorePending
        && (
            correctionIssues.length > 0
            || fitMasterRestoreBlocked
            || !sourceFit
            || (
                sourceFit.productImage !== tryOnProduct.image
                && !selectedPreciseFit
            )
        )
    );
    const initialGenerationRequired = Boolean(confirmedRegenerationRequired && !sourceFit);
    const regenerationConfirmationVisible = Boolean(initialGenerationRequired || preciseRegenerationOpen);
    const showingSourceWhilePreparing = Boolean(
        !explicitColorRequired
        && !selectedPreciseFit
        && !selectedFastPreview
        && isFastPreviewLoading
        && sourceFit
        && sourceFit.productImage !== tryOnProduct.image
        && fastPreviewUnavailableKey !== selectedFastKey
    );
    const retainingSourceAfterRejectedPreview = Boolean(
        selectedFastKey
        && fastPreviewUnavailableKey === selectedFastKey
        && !selectedPreciseFit
        && !selectedFastPreview
        && sourceFit
        && sourceFit.productImage !== tryOnProduct.image
    );
    const retainingSourceUntilGeometryReview = Boolean(
        geometryReviewNeeded
        && !selectedPreciseFit
        && !selectedFastPreview
        && sourceFit
        && sourceFit.productImage !== tryOnProduct.image
    );
    const resultImage = selectedPreciseFit?.imageDataUrl
        || selectedFastPreview?.imageDataUrl
        || (showingSourceWhilePreparing || retainingSourceAfterRejectedPreview || retainingSourceUntilGeometryReview
            ? sourceFit?.imageDataUrl
            : undefined);
    const displayName = productName(product);
    const progressStageIndex = stage === "queued" ? -1 : PROGRESS_STAGES.indexOf(stage);
    const progressStageLabels = locale === "en"
        ? ["Check photos", "Create fitting", "Quality pass", "Ready"]
        : ["사진 확인", "자연스럽게 입히기", "품질 마무리", "완성"];
    const waitTips = locale === "en"
        ? [
            "A harness should allow about two fingers of room around the chest.",
            "Compare the size chart with your dog's chest girth before ordering.",
            "Your actual dog photo and the exact selected product are being used as references.",
        ]
        : [
            "하네스는 가슴과 스트랩 사이에 손가락 두 개 정도 여유가 좋아요.",
            "구매 전 상세 사이즈표와 우리 아이 가슴둘레를 함께 확인해 주세요.",
            "고객님의 실제 강아지 사진과 선택한 상품을 기준으로 작업하고 있어요.",
        ];
    const waitTip = waitTips[Math.floor(elapsed / 15) % waitTips.length];

    useEffect(() => {
        if (!pet?.apiProfileId || !liveReadyFit) return;
        const key = preciseCacheKey(pet.apiProfileId, product.id, liveReadyFit.productImage);
        setPreciseFits((previous) => {
            const existing = previous[key];
            if (existing?.jobId === liveReadyFit.jobId && existing.imageDataUrl === liveReadyFit.imageDataUrl) {
                return previous;
            }
            return { ...previous, [key]: liveReadyFit };
        });
        if (fitMasterIdentity) {
            savePetTryOnFitMaster(fitMasterIdentity, {
                jobId: liveReadyFit.jobId,
                productImage: liveReadyFit.productImage,
            });
        }
    }, [fitMasterIdentity, liveReadyFit, pet?.apiProfileId, product.id]);

    useEffect(() => {
        setFitMasterRestorePending(true);
        setFitMasterRestoreBlocked(false);
        if (!pet?.apiProfileId || !petReferenceImage || !fitMasterIdentity || liveReadyFit) {
            setFitMasterRestorePending(false);
            return;
        }
        const lookup = readPetTryOnFitMasterWithLegacy(fitMasterIdentity, petReferenceImage);
        const approvedImages = new Set<string>([
            product.image,
            ...(product.colors || []).map((color) => color.image),
        ].filter((image): image is string => Boolean(image)));
        if (lookup.status === "missing") {
            const controller = new AbortController();
            let active = true;
            void getLatestPetTryOnMaster(pet.apiProfileId, product.id, controller.signal)
                .then((remote) => {
                    if (!active || controller.signal.aborted) return;
                    if (remote.status === "missing") {
                        setFitMasterRestoreBlocked(false);
                        return;
                    }
                    if (remote.status === "error") {
                        setFitMasterRestoreBlocked(true);
                        if (remote.error.code !== "aborted") {
                            setErrorCode(remote.error.code);
                            setError(apiErrorMessage(remote.error.code, locale));
                        }
                        return;
                    }
                    if (
                        !approvedImages.has(remote.productImage)
                        || remote.result.status !== "ready"
                        || !remote.result.imageDataUrl
                    ) {
                        // A timeout/5xx or an unknown source image must never
                        // be interpreted as permission to start another full generation.
                        setFitMasterRestoreBlocked(true);
                        return;
                    }
                    const restoredFit: ReadyFit = {
                        jobId: remote.sourceJobId,
                        productImage: remote.productImage,
                        imageDataUrl: remote.result.imageDataUrl,
                        geometryVerified: remote.result.geometryVerified === true,
                    };
                    setPreciseFits((previous) => ({
                        ...previous,
                        [preciseCacheKey(pet.apiProfileId!, product.id, restoredFit.productImage)]: restoredFit,
                    }));
                    savePetTryOnFitMaster(fitMasterIdentity, {
                        jobId: restoredFit.jobId,
                        productImage: restoredFit.productImage,
                    });
                    setFitMasterRestoreBlocked(false);
                })
                .finally(() => {
                    if (active) setFitMasterRestorePending(false);
                });
            return () => {
                active = false;
                controller.abort();
            };
        }
        if (lookup.status !== "found") {
            if (lookup.status === "invalid") removePetTryOnFitMaster(fitMasterIdentity);
            setFitMasterRestoreBlocked(true);
            setFitMasterRestorePending(false);
            return;
        }
        const saved = lookup.value;
        if (!approvedImages.has(saved.productImage)) {
            removePetTryOnFitMaster(fitMasterIdentity);
            setFitMasterRestoreBlocked(true);
            setFitMasterRestorePending(false);
            return;
        }
        const controller = new AbortController();
        let active = true;
        void getPetTryOnJob(saved.jobId, controller.signal).then((restoredOutcome) => {
            if (!active || controller.signal.aborted) return;
            if (!restoredOutcome.ok) {
                setFitMasterRestoreBlocked(true);
                if (restoredOutcome.error.code !== "aborted") {
                    setErrorCode(restoredOutcome.error.code);
                    setError(apiErrorMessage(restoredOutcome.error.code, locale));
                }
                return;
            }
            const restored = restoredOutcome.value;
            if (restored.status !== "ready" || !restored.imageDataUrl) {
                // A non-ready master remains fail-closed: keep the saved identity
                // and never start another image without explicit confirmation.
                setFitMasterRestoreBlocked(true);
                return;
            }
            const restoredFit: ReadyFit = {
                jobId: restored.jobId,
                productImage: saved.productImage,
                imageDataUrl: restored.imageDataUrl,
                geometryVerified: restored.geometryVerified === true,
            };
            setPreciseFits((previous) => ({
                ...previous,
                [preciseCacheKey(pet.apiProfileId!, product.id, restoredFit.productImage)]: restoredFit,
            }));
            setFitMasterRestoreBlocked(false);
        }).catch(() => {
            if (active && !controller.signal.aborted) setFitMasterRestoreBlocked(true);
        }).finally(() => {
            if (active) setFitMasterRestorePending(false);
        });
        return () => {
            active = false;
            controller.abort();
        };
    }, [fitMasterIdentity, liveReadyFit, locale, pet?.apiProfileId, petReferenceImage, product.colors, product.id, product.image]);

    useEffect(() => {
        if (!shouldRequestFastPreview || !sourceFit || !tryOnProduct.image || !selectedFastKey) return;

        const controller = new AbortController();
        let active = true;
        setFastPreviewUnavailableKey((key) => key === selectedFastKey ? "" : key);
        void requestPetTryOnColorPreview(sourceFit.jobId, tryOnProduct.image, controller.signal)
            .then((previewOutcome) => {
                if (!active || controller.signal.aborted) return;
                if (!previewOutcome.ok) {
                    setFastPreviewUnavailableKey(selectedFastKey);
                    if (previewOutcome.error.code === "login_required") {
                        setErrorCode(previewOutcome.error.code);
                        setError(apiErrorMessage(previewOutcome.error.code, locale));
                    }
                    return;
                }
                const preview = previewOutcome.value;
                setFastPreviews((previous) => ({ ...previous, [selectedFastKey]: preview }));
                setFastPreviewUnavailableKey("");
            });
        return () => {
            active = false;
            controller.abort();
        };
    }, [
        selectedFastKey,
        locale,
        shouldRequestFastPreview,
        sourceFit,
        tryOnProduct.image,
    ]);

    const generate = useCallback(async (applyCorrections = false) => {
        if (!eligible || !pet || !tryOnProduct.image) return;
        if (fitMasterRestorePending) return;
        setError("");
        setErrorCode(null);
        if (explicitColorRequired) {
            setError(locale === "en"
                ? "Choose the exact product color first. Smart Fit never guesses a color from the main image."
                : "먼저 실제 상품 색상을 선택해 주세요. 대표 이미지만 보고 색상을 임의로 정하지 않아요.");
            return;
        }
        if (!petReferenceImage) {
            setError(sidePhotoRequirement(reviewKind, locale));
            return;
        }
        if (liveReadyFit && pet.apiProfileId) {
            const key = preciseCacheKey(pet.apiProfileId, product.id, liveReadyFit.productImage);
            setPreciseFits((previous) => ({ ...previous, [key]: liveReadyFit }));
        }
        if (generationRequestPendingRef.current) return;
        generationRequestPendingRef.current = true;
        setGenerationRequestPending(true);
        try {
        const outcome = await start(
            tryOnProduct,
            pet,
            applyCorrections ? correctionIssues : [],
            Boolean(sourceFit || fitMasterRestoreBlocked || finalGenerationFailed),
        );
            if (outcome.status === "queue_full") {
                setError(locale === "en"
                    ? "Your Smart Fit queue already has five items. Check the floating queue before adding another."
                    : "입혀보기는 한 번에 최대 5개까지 진행할 수 있어요. 진행 중인 작업이 완료된 후 다시 시도해 주세요.");
                setPanelOpen(true);
            } else if (outcome.status === "error" && outcome.error.code !== "aborted") {
                setErrorCode(outcome.error.code);
                setError(apiErrorMessage(outcome.error.code, locale));
                if (outcome.error.code === "already_running" || outcome.error.code === "login_required") {
                    setPanelOpen(true);
                }
            }
        } finally {
            generationRequestPendingRef.current = false;
            setGenerationRequestPending(false);
        }
    }, [
        correctionIssues,
        eligible,
        explicitColorRequired,
        fitMasterRestoreBlocked,
        fitMasterRestorePending,
        finalGenerationFailed,
        liveReadyFit,
        locale,
        pet,
        petReferenceImage,
        product.id,
        reviewKind,
        setPanelOpen,
        start,
        sourceFit,
        tryOnProduct,
    ]);

    useEffect(() => {
        if (!loading) return;
        const firstTick = window.setTimeout(() => setNow(Date.now()), 0);
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => {
            window.clearTimeout(firstTick);
            window.clearInterval(timer);
        };
    }, [loading]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [onClose]);

    const handlePetChange = (index: number) => {
        if (loading) return;
        setSelected(index);
        setError("");
        setErrorCode(null);
        setMismatchOpen(false);
        setCorrectionIssues([]);
        setPreciseRegenerationOpen(false);
        setFastPreviewUnavailableKey("");
        setGeometryReviewError("");
    };

    const toggleCorrectionIssue = (issue: PetTryOnCorrectionIssue) => {
        setPreciseRegenerationOpen(false);
        setCorrectionIssues((issues) => (
            issues.includes(issue)
                ? issues.filter((selectedIssue) => selectedIssue !== issue)
                : [...issues, issue]
        ));
    };

    const setLocalGeometryReview = (jobId: string, verified: boolean) => {
        setGeometryReviewOverrides((reviews) => ({ ...reviews, [jobId]: verified }));
        setPreciseFits((fits) => Object.fromEntries(
            Object.entries(fits).map(([key, fit]) => [
                key,
                fit.jobId === jobId ? { ...fit, geometryVerified: verified } : fit,
            ]),
        ));
        if (!verified) {
            setFastPreviews((previews) => Object.fromEntries(
                Object.entries(previews).filter(([key]) => !key.startsWith(`${jobId}:`)),
            ));
        }
        setFastPreviewUnavailableKey("");
    };

    const approveCurrentGeometry = async () => {
        if (!sourceFit || sourceFit.geometryVerified === true || geometryReviewPendingRef.current) return;
        const jobId = sourceFit.jobId;
        geometryReviewPendingRef.current = true;
        setGeometryReviewSubmitting(true);
        setGeometryReviewError("");
        try {
            const approved = await reviewPetTryOnGeometry(jobId, true);
            if (!approved.ok) {
                setGeometryReviewError(locale === "en"
                    ? `We could not save your product-shape approval. ${apiErrorMessage(approved.error.code, locale)} The original result is still shown and no new image was generated.`
                    : `상품 모양 확인을 저장하지 못했어요. ${apiErrorMessage(approved.error.code, locale)} 기존 결과는 그대로 유지되며 새 이미지는 생성하지 않았습니다.`);
                if (approved.error.code === "login_required") {
                    setErrorCode(approved.error.code);
                    setError(apiErrorMessage(approved.error.code, locale));
                }
                return;
            }
            setLocalGeometryReview(jobId, true);
            setMismatchOpen(false);
        } finally {
            geometryReviewPendingRef.current = false;
            setGeometryReviewSubmitting(false);
        }
    };

    const markCurrentGeometryMismatch = async () => {
        if (!sourceFit || geometryReviewPendingRef.current) return;
        const jobId = sourceFit.jobId;
        // Stop using the disputed master immediately, including any cached
        // saved-fit color previews, while the revocation is saved remotely.
        setLocalGeometryReview(jobId, false);
        setPreciseRegenerationOpen(false);
        setMismatchOpen(true);
        geometryReviewPendingRef.current = true;
        setGeometryReviewSubmitting(true);
        setGeometryReviewError("");
        try {
            const revoked = await reviewPetTryOnGeometry(jobId, false);
            if (!revoked.ok) {
                setGeometryReviewError(locale === "en"
                    ? `We could not save that the product shape is different. ${apiErrorMessage(revoked.error.code, locale)} Color comparison remains locked for safety, and no new image was generated.`
                    : `상품 모양이 다르다는 확인을 저장하지 못했어요. ${apiErrorMessage(revoked.error.code, locale)} 안전을 위해 색상 비교는 계속 잠겨 있으며 새 이미지는 생성하지 않았습니다.`);
                if (revoked.error.code === "login_required") {
                    setErrorCode(revoked.error.code);
                    setError(apiErrorMessage(revoked.error.code, locale));
                }
            }
        } finally {
            geometryReviewPendingRef.current = false;
            setGeometryReviewSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[2400] flex items-center justify-center overflow-y-auto bg-neutral-950/60 px-3 py-5 backdrop-blur-sm sm:px-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="pet-tryon-title"
                className="relative my-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-black text-indigo-700">
                                {locale === "en" ? "SMART FITTING" : "스마트 입혀보기"}
                            </p>
                            <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-700">
                                DDB SMART FIT
                            </span>
                        </div>
                        <h2 id="pet-tryon-title" className="mt-1 text-xl font-black text-neutral-950 sm:text-2xl">
                            {locale === "en" ? `Try ${displayName} on my dog` : `${displayName}, 우리 아이에게 입혀보기`}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200"
                        aria-label={locale === "en" ? "Close; fitting continues" : "닫기; 입혀보기는 계속 진행"}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </header>

                {!hydrated ? (
                    <div className="p-6 sm:p-10" role="status" aria-live="polite">
                        <div className="mx-auto max-w-xl rounded-xl border border-indigo-100 bg-indigo-50 p-7 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-indigo-700 shadow-sm">
                                <i className="fa-solid fa-paw animate-pulse text-xl" />
                            </div>
                            <h3 className="mt-4 text-lg font-black text-neutral-950">
                                {locale === "en" ? "Checking your member session" : "회원 정보를 확인하고 있어요"}
                            </h3>
                            <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                                {locale === "en"
                                    ? "Smart Fit will stay open while your saved dog and active jobs are restored."
                                    : "저장된 우리 아이와 진행 중인 작업을 불러오는 동안 이 창을 그대로 유지합니다."}
                            </p>
                        </div>
                    </div>
                ) : !eligible ? (
                    <div className="p-6 sm:p-10" role="status" aria-live="polite">
                        <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-7 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-amber-700 shadow-sm">
                                <i className="fa-solid fa-circle-info text-xl" />
                            </div>
                            <h3 className="mt-4 text-lg font-black text-neutral-950">
                                {locale === "en" ? "Smart Fit is unavailable for this item" : "이 상품은 스마트 입혀보기를 지원하지 않아요"}
                            </h3>
                            <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                                {ineligibleMessage(eligibility.reason, locale)}
                            </p>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-neutral-900 px-5 text-sm font-black text-white hover:bg-neutral-800"
                            >
                                {locale === "en" ? "Continue shopping" : "상품 계속 보기"}
                            </button>
                        </div>
                    </div>
                ) : !pet ? (
                    <div className="p-6 sm:p-10">
                        <div className="mx-auto max-w-xl rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-7 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                                <i className="fa-solid fa-camera text-xl" />
                            </div>
                            <h3 className="mt-4 text-lg font-black text-neutral-950">
                                {locale === "en"
                                    ? user ? "Add your dog's photo first" : "Create an account to try it on your dog"
                                    : user ? "먼저 우리 아이 사진을 등록해 주세요" : "회원가입하고 우리 아이에게 바로 입혀보세요"}
                            </h3>
                            <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                                {locale === "en"
                                    ? user
                                        ? "A clear full-body photo is needed to create a realistic fitting preview."
                                        : "Sign up once, add your dog's photo, and preview wearable products on your own dog."
                                    : user
                                        ? "실제로 입은 것처럼 자연스럽게 만들려면 몸이 잘 보이는 사진이 필요합니다."
                                        : "간편가입 후 우리 아이 사진을 한 번 등록하면, 착용 상품을 실제 우리 아이 모습으로 미리 확인할 수 있어요."}
                            </p>
                            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                                <Link
                                    href={user ? "/pet-lens" : "/auth/signup"}
                                    className="inline-flex h-11 items-center justify-center rounded-md bg-indigo-600 px-5 text-sm font-black text-white hover:bg-indigo-700"
                                >
                                    {locale === "en"
                                        ? user ? "Add my dog's photo" : "Sign up and add my dog"
                                        : user ? "우리 아이 사진 등록하기" : "회원가입하고 우리 아이 등록하기"}
                                </Link>
                                {!user && (
                                    <Link
                                        href="/auth/login"
                                        className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-200 bg-white px-5 text-sm font-black text-neutral-700 hover:border-indigo-300 hover:text-indigo-700"
                                    >
                                        {locale === "en" ? "I already have an account" : "이미 회원이면 로그인"}
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid max-h-[calc(100dvh-150px)] overflow-y-auto lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
                        <div className="relative min-h-[360px] bg-neutral-100 sm:min-h-[520px]">
                            <Image
                                src={resultImage || petReferenceImage || pet.photoDataUrl!}
                                alt={
                                    resultImage
                                        ? `${pet.name || "우리 아이"} ${displayName} 착용 결과`
                                        : `${pet.name || "우리 아이"} 사진`
                                }
                                fill
                                unoptimized
                                sizes="(min-width: 1024px) 65vw, 100vw"
                                className="absolute inset-0 h-full w-full object-contain"
                            />

                            {loading && (
                                <div className="absolute inset-0 flex items-end bg-neutral-950/52 p-4 sm:p-7">
                                    <div className="max-h-full w-full overflow-y-auto rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur sm:p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-[11px] font-black tracking-wide text-indigo-700">DDB SMART FIT</p>
                                                <p className="mt-1 text-sm font-black text-neutral-950 sm:text-base">
                                                    {loadingLabel(locale, stage)}
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-xs font-black text-neutral-500">
                                                    {result?.queuePosition
                                                        ? locale === "en" ? `Waiting #${result.queuePosition}` : `대기 ${result.queuePosition}번`
                                                        : locale === "en" ? "Average 1–2 min" : "평균 1~2분"}
                                                </p>
                                                <p className="mt-0.5 font-mono text-sm font-black text-indigo-700">{formatElapsed(elapsed)}</p>
                                            </div>
                                        </div>
                                        <div
                                            className="mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-200"
                                            role="progressbar"
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={Math.round(progress)}
                                        >
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 transition-[width] duration-700 ease-out"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>

                                        <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label={locale === "en" ? "Fitting progress stages" : "입혀보기 진행 단계"}>
                                            {progressStageLabels.map((label, index) => {
                                                const completed = progressStageIndex > index;
                                                const current = progressStageIndex === index;
                                                return (
                                                    <div
                                                        key={label}
                                                        className={`rounded-lg border px-1.5 py-2 text-center text-[10px] font-black sm:text-[11px] ${
                                                            completed
                                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                : current
                                                                    ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                                                                    : "border-neutral-200 bg-neutral-50 text-neutral-400"
                                                        }`}
                                                    >
                                                        <i className={`fa-solid mr-1 ${completed ? "fa-check" : current ? "fa-spinner fa-spin" : "fa-circle"}`} />
                                                        {label}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold leading-5 text-indigo-950">
                                            <i className="fa-solid fa-lightbulb mr-2 text-amber-500" />
                                            {waitTip}
                                        </p>
                                        {elapsed >= 120 && (
                                            <p className="mt-2 text-xs font-bold leading-5 text-neutral-500">
                                                {locale === "en"
                                                    ? "The final quality pass is taking longer. You can keep shopping; the result stays in Smart Fit."
                                                    : "정교한 마무리에 조금 더 시간이 걸리고 있어요. 쇼핑을 계속하셔도 결과는 Smart Fit에 보관됩니다."}
                                            </p>
                                        )}

                                        <PetTryOnEmailDeliveryControls
                                            task={currentTask}
                                            longWait={elapsed >= 120}
                                        />

                                        <p className="mt-3 text-xs font-bold leading-5 text-neutral-500">
                                            {locale === "en"
                                                ? "You may close this window. The fitting continues in the background."
                                                : "이 창을 닫아도 입혀보기는 계속 진행됩니다."}
                                        </p>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="flex h-10 min-w-0 items-center justify-center rounded-lg border border-neutral-200 bg-white px-2 text-xs font-black text-neutral-700 hover:border-indigo-300 hover:text-indigo-700"
                                            >
                                                <span className="break-keep text-center leading-tight">{locale === "en" ? "Keep shopping" : "계속 쇼핑"}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void requestCompletionNotification()}
                                                className="flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-2 text-xs font-black text-white hover:bg-indigo-700"
                                            >
                                                <i className="fa-regular fa-bell shrink-0" />
                                                <span className="break-keep text-center leading-tight">
                                                    {notificationEnabled
                                                        ? locale === "en" ? "Notification on" : "완료 알림 켜짐"
                                                        : locale === "en" ? "Notify me" : "완성되면 알려줘"}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {resultImage && !loading && (
                                <div className={`absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-2 text-xs font-black shadow-lg backdrop-blur ${
                                    geometryReviewNeeded || retainingSourceAfterRejectedPreview
                                        ? "text-amber-800"
                                        : isFastPreview || showingSourceWhilePreparing
                                            ? "text-indigo-700"
                                            : "text-emerald-700"
                                }`}>
                                    <i className={`fa-solid mr-1.5 ${geometryReviewNeeded || retainingSourceAfterRejectedPreview ? "fa-shield-halved" : isFastPreview || showingSourceWhilePreparing ? "fa-palette" : "fa-circle-check"}`} />
                                    {geometryReviewNeeded
                                        ? locale === "en" ? "Product shape needs your review" : "상품 모양 확인 필요"
                                        : retainingSourceAfterRejectedPreview
                                        ? locale === "en" ? "Color unchanged · original result kept" : "색상 변경 안 함 · 기존 결과 유지"
                                        : isFastPreview
                                        ? locale === "en" ? "No new image · quick color preview" : "새 이미지 생성 없음 · 빠른 색상 비교"
                                        : showingSourceWhilePreparing
                                            ? locale === "en" ? "Preparing quick color preview" : "빠른 색상 비교 준비 중"
                                            : locale === "en" ? "Precise fitting complete" : "정밀 입혀보기 완료"}
                                </div>
                            )}

                            {isFastPreviewLoading && (
                                <div className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-indigo-700 shadow-lg backdrop-blur">
                                    <i className="fa-solid fa-spinner fa-spin mr-1.5" />
                                    {locale === "en" ? "Comparing color from the saved fitting" : "저장된 결과에서 색상만 비교하는 중"}
                                </div>
                            )}
                        </div>

                        <aside className="border-t border-neutral-200 p-5 lg:border-l lg:border-t-0 lg:p-6">
                            <label className="block">
                                <span className="mb-2 block text-xs font-black text-neutral-500">
                                    {locale === "en" ? "Dog profile" : "입혀볼 아이"}
                                </span>
                                <select
                                    value={selected}
                                    onChange={(event) => handlePetChange(Number(event.target.value))}
                                    disabled={loading}
                                    className="input h-11"
                                >
                                    {pets.map((item, index) => (
                                        <option key={`${item.name}-${item.lastAnalyzedAt ?? index}`} value={index}>
                                            {petOptionLabel(item)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {Boolean(product.colors?.length) && (
                                <div className="mt-5">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <span className="text-xs font-black text-neutral-500">
                                            {locale === "en" ? "Fitting color" : "입혀볼 색상"}
                                        </span>
                                        <span className="truncate text-xs font-black text-indigo-700">
                                            {selectedColor?.name || (locale === "en" ? "Main color" : "대표 색상")}
                                        </span>
                                    </div>
                                    <ColorSelect
                                        colors={product.colors || []}
                                        colorIdx={colorIdx}
                                         onColorChange={loading ? undefined : (index) => {
                                             setError("");
                                             setErrorCode(null);
                                             setMismatchOpen(false);
                                            setCorrectionIssues([]);
                                            setPreciseRegenerationOpen(false);
                                            setFastPreviewUnavailableKey("");
                                            setGeometryReviewError("");
                                            onColorChange(index);
                                        }}
                                        className={loading ? "pointer-events-none opacity-60" : ""}
                                    />
                                    <p className="mt-2 text-[11px] font-bold leading-5 text-neutral-500">
                                        {explicitColorRequired
                                            ? locale === "en"
                                                ? "Choose an exact color first. We do not guess from the main product image."
                                                : "먼저 실제 상품 색상을 골라 주세요. 대표 이미지만 보고 색상을 임의로 정하지 않아요."
                                            : sourceFit
                                                ? locale === "en"
                                                    ? "Tap another color to compare it automatically. No new fitting image is created."
                                                    : "다른 색상은 색상 원만 누르면 자동으로 비교돼요. 새 착용 이미지는 만들지 않습니다."
                                                : locale === "en"
                                                    ? "The first precise fitting uses the exact color you selected."
                                                    : "처음 정밀 입혀보기에는 지금 고른 실제 색상 사진을 사용해요."}
                                    </p>
                                </div>
                            )}

                            {isFastPreview && (
                                <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-indigo-100 bg-white">
                                            <Image
                                                src={tryOnProduct.image!}
                                                alt={selectedColor?.name || displayName}
                                                fill
                                                sizes="56px"
                                                className="object-contain"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className="rounded-full bg-indigo-700 px-2 py-1 text-[10px] font-black text-white">
                                                    {locale === "en" ? "No new image" : "새 이미지 생성 없음"}
                                                </span>
                                                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-indigo-700">
                                                    {locale === "en" ? "Color comparison" : "색감 비교용"}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs font-black leading-5 text-indigo-950">
                                                {locale === "en"
                                                    ? "The pose and garment shape stay fixed; only the color is compared quickly."
                                                    : "처음 결과의 자세와 옷 모양은 그대로 두고 색감만 빠르게 비교했어요."}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="mt-3 text-[11px] font-bold leading-5 text-indigo-900/75">
                                        {locale === "en"
                                            ? "Use the product photo for patterns and small construction details."
                                            : "무늬와 세부 모양은 상품사진 기준으로 확인해 주세요."}
                                    </p>
                                </div>
                            )}

                            {sourceFit && geometryReviewNeeded && !loading && (
                                <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                                    <p className="text-sm font-black text-amber-950">
                                        <i className="fa-solid fa-ruler-combined mr-2" />
                                        {locale === "en" ? "Product shape needs your review" : "상품 모양 확인 필요"}
                                    </p>
                                    <p className="mt-2 text-xs font-bold leading-5 text-amber-900">
                                        {geometryReviewDescription(reviewKind, locale)}
                                    </p>
                                    {sourceFit.productImage !== tryOnProduct.image && (
                                        <p className="mt-2 text-[11px] font-bold leading-5 text-amber-800">
                                            {locale === "en"
                                                ? "The original fitting remains unchanged until you finish this review."
                                                : "확인이 끝날 때까지 원래 입혀보기 결과를 변경 없이 보여드려요."}
                                        </p>
                                    )}
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void approveCurrentGeometry()}
                                            disabled={geometryReviewSubmitting}
                                            className="flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:cursor-wait disabled:bg-emerald-300"
                                        >
                                            <i className={`fa-solid shrink-0 ${geometryReviewSubmitting ? "fa-spinner fa-spin" : "fa-check"}`} />
                                            <span className="break-keep text-center leading-tight">
                                                {geometryReviewSubmitting
                                                    ? locale === "en" ? "Saving…" : "저장 중…"
                                                    : locale === "en" ? "Product shape matches" : "제품 모양 맞아요"}
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPreciseRegenerationOpen(false);
                                                setMismatchOpen(true);
                                            }}
                                            disabled={geometryReviewSubmitting}
                                            className="flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-md border border-amber-400 bg-white px-3 py-2 text-xs font-black text-amber-950 hover:bg-amber-100 disabled:opacity-60"
                                        >
                                            <i className="fa-solid fa-pen-ruler shrink-0" />
                                            <span className="break-keep text-center leading-tight">{locale === "en" ? "Looks different" : "실제 상품과 달라요"}</span>
                                        </button>
                                    </div>
                                    {geometryReviewError && (
                                        <p className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[11px] font-bold leading-5 text-rose-800">
                                            <i className="fa-solid fa-triangle-exclamation mr-1.5" />
                                            {geometryReviewError}
                                        </p>
                                    )}
                                </div>
                            )}

                            {selectedFastKey && fastPreviewUnavailableKey === selectedFastKey && !selectedPreciseFit && (
                                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-900">
                                    <i className="fa-solid fa-shield-halved mr-2" />
                                    {locale === "en"
                                        ? "This color could not be changed safely, so the original fitting remains on screen. Check the selected color in the product photo. No new image was generated automatically."
                                        : "색상만 안전하게 바꾸기 어려워 기존 입혀보기 결과를 그대로 보여드려요. 선택한 실제 색상은 상품 사진으로 확인해 주세요. 새 이미지는 자동 생성하지 않았습니다."}
                                </div>
                            )}

                            {fitMasterRestoreBlocked && !sourceFit && (
                                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-900">
                                    <i className="fa-solid fa-shield-halved mr-2" />
                                    {locale === "en"
                                        ? "We could not safely reconnect the previous precise result. Nothing new was started automatically. Use the explicit new-image action below only if you want another result."
                                        : "이전 정밀 결과를 안전하게 다시 연결하지 못했어요. 새 입혀보기는 자동으로 시작하지 않았습니다. 새 결과가 필요할 때만 아래 새 이미지 생성 기능을 눌러 주세요."}
                                </div>
                            )}

                            <div className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50/70 p-4">
                                <p className="text-sm font-black text-indigo-950">
                                    {locale === "en" ? "Natural fitting preview" : "자연스러운 착용 미리보기"}
                                </p>
                                <p className="mt-2 text-xs font-bold leading-5 text-indigo-900/75">
                                    {locale === "en"
                                        ? "Your dog's photo and the selected product's shape, color, and details are reflected to create a natural fitting preview."
                                        : "우리 아이 사진과 선택한 상품의 형태·색상·디테일을 함께 반영해 자연스러운 착용 이미지를 만들어 드립니다."}
                                </p>
                            </div>

                            {displayedError && (
                                <div
                                    role={systemIssue ? "status" : "alert"}
                                    aria-live="polite"
                                    className={`mt-4 rounded-lg border p-4 text-sm font-bold leading-6 ${systemIssue
                                        ? "border-amber-200 bg-amber-50 text-amber-950"
                                        : "border-rose-200 bg-rose-50 text-rose-800"}`}
                                >
                                    {systemIssue && (
                                        <p className="mb-1 font-black">
                                            <i className="fa-solid fa-circle-info mr-2 text-amber-600" />
                                            {systemIssueTitle}
                                        </p>
                                    )}
                                    <p className={systemIssue ? "text-xs text-neutral-700" : ""}>
                                        {!systemIssue && <i className="fa-solid fa-triangle-exclamation mr-2" />}
                                        {displayedError}
                                    </p>
                                    {displayedErrorCode === "login_required" && (
                                        <Link
                                            href="/auth/login"
                                            className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-xs font-black text-white hover:bg-indigo-700"
                                        >
                                            {locale === "en" ? "Sign in again" : "다시 로그인"}
                                        </Link>
                                    )}
                                    {(displayedErrorCode === "already_running" || loading) && displayedErrorCode !== "login_required" && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPanelOpen(true);
                                                onClose();
                                            }}
                                            className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-xs font-black text-white hover:bg-indigo-700"
                                        >
                                            {locale === "en" ? "Open job status" : "진행 상태 확인"}
                                        </button>
                                    )}
                                </div>
                            )}

                            {(selectedPreciseFit || selectedFastPreview || retainingSourceAfterRejectedPreview || retainingSourceUntilGeometryReview) && !loading && (
                                <>
                                    <div className={`mt-4 rounded-lg border p-4 text-sm font-bold leading-6 ${
                                        geometryReviewNeeded || retainingSourceAfterRejectedPreview
                                            ? "border-amber-200 bg-amber-50 text-amber-900"
                                            : isFastPreview
                                            ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                                            : "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    }`}>
                                        {geometryReviewNeeded
                                            ? locale === "en"
                                                ? "This fitting is the unchanged original result. Confirm its product shape before using it for color comparisons."
                                                : "현재 화면은 변경하지 않은 원래 입혀보기 결과예요. 색상 비교에 사용하기 전에 상품 모양을 먼저 확인해 주세요."
                                            : retainingSourceAfterRejectedPreview
                                            ? locale === "en"
                                                ? "This is your original precise result, kept unchanged because the selected color could not be changed safely."
                                                : "선택한 색상을 안전하게 바꿀 수 없어, 원래 정밀 결과를 색상 변경 없이 유지하고 있어요."
                                            : isFastPreview
                                            ? locale === "en"
                                                ? "This comparison reused the saved fitting without creating a new image. Check the product photo for the exact pattern and construction details."
                                                : "저장된 착용 결과를 활용해 새 이미지를 만들지 않고 색상을 비교했어요. 실제 무늬와 세부 모양은 상품 사진에서 함께 확인해 주세요."
                                            : locale === "en"
                                                ? "The precise fitting is ready. Check the size chart and body measurements before purchase."
                                                : "정밀 착용 이미지가 완성됐어요. 구매 전에는 상세 사이즈표와 우리 아이의 가슴둘레를 함께 확인해 주세요."}
                                    </div>

                                    {(!geometryReviewNeeded || mismatchOpen) && (
                                    <div className="mt-3 rounded-lg border border-neutral-200 bg-white">
                                        {!geometryReviewNeeded && (
                                            <button
                                                type="button"
                                                onClick={() => void markCurrentGeometryMismatch()}
                                                disabled={geometryReviewSubmitting}
                                                className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs font-black text-neutral-800 disabled:cursor-wait disabled:opacity-60"
                                                aria-expanded={mismatchOpen}
                                            >
                                                <span>
                                                    <i className="fa-solid fa-ruler-combined mr-2 text-amber-500" />
                                                    {locale === "en" ? "Looks different from the real product" : "실제 상품과 달라요"}
                                                </span>
                                                <i className={`fa-solid fa-chevron-${mismatchOpen ? "up" : "down"} text-neutral-400`} />
                                            </button>
                                        )}
                                        {mismatchOpen && (
                                            <div className="border-t border-neutral-100 px-4 pb-4 pt-3">
                                                <p className="text-[11px] font-bold leading-5 text-neutral-600">
                                                    {locale === "en"
                                                        ? "Select every area that differs. The choices are sent only when you regenerate the precise preview below and are not posted publicly."
                                                        : "다른 부분을 모두 골라 주세요. 선택 내용은 아래에서 다시 정밀 확인할 때만 전달되며 공개되지 않아요."}
                                                </p>
                                                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                                                    <p className="text-[11px] font-black text-amber-950">
                                                        {geometryCorrectionTitle(reviewKind, locale)}
                                                    </p>
                                                    <p className="mt-1 text-[10px] font-bold leading-4 text-amber-900/75">
                                                        {geometryReviewDescription(reviewKind, locale)}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {productShapeCorrectionOptions.map((option) => {
                                                            const selectedIssue = correctionIssues.includes(option.value);
                                                            return (
                                                                <button
                                                                    key={option.value}
                                                                    type="button"
                                                                    onClick={() => toggleCorrectionIssue(option.value)}
                                                                    aria-pressed={selectedIssue}
                                                                    className={`min-h-9 rounded-full border px-3 py-2 text-[11px] font-black transition ${
                                                                        selectedIssue
                                                                            ? "border-amber-500 bg-amber-100 text-amber-950"
                                                                            : "border-amber-200 bg-white text-neutral-700 hover:border-amber-400"
                                                                    }`}
                                                                >
                                                                    {locale === "en" ? option.en : option.ko}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                                                    <p className="text-[11px] font-black text-indigo-950">
                                                        {locale === "en" ? "Correct color or pattern" : "색상·무늬 보정"}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {COLOR_PATTERN_CORRECTION_OPTIONS.map((option) => {
                                                            const selectedIssue = correctionIssues.includes(option.value);
                                                            return (
                                                                <button
                                                                    key={option.value}
                                                                    type="button"
                                                                    onClick={() => toggleCorrectionIssue(option.value)}
                                                                    aria-pressed={selectedIssue}
                                                                    className={`min-h-9 rounded-full border px-3 py-2 text-[11px] font-black transition ${
                                                                        selectedIssue
                                                                            ? "border-indigo-500 bg-indigo-100 text-indigo-950"
                                                                            : "border-indigo-100 bg-white text-neutral-700 hover:border-indigo-300"
                                                                    }`}
                                                                >
                                                                    {locale === "en" ? option.en : option.ko}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <p className="mt-3 text-[11px] font-bold leading-5 text-neutral-500">
                                                    {locale === "en"
                                                        ? "Corrections never run automatically. They are sent only after you open the optional action and explicitly confirm one new precise image."
                                                        : "보정은 자동 실행되지 않아요. 아래 선택 기능을 열고 새 정밀 이미지 1회 생성을 직접 확인한 경우에만 전달됩니다."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    )}
                                </>
                            )}

                            {!loading && fitMasterRestorePending && (
                                <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs font-black leading-5 text-indigo-900">
                                    <i className="fa-solid fa-spinner fa-spin mr-2" />
                                    {locale === "en"
                                        ? "Checking for your existing fitting. No new image is being started."
                                        : "기존 입혀보기 결과를 확인하고 있어요. 새 이미지는 시작하지 않습니다."}
                                </div>
                            )}

                            {!loading && !fitMasterRestorePending && isFastPreviewLoading && confirmedRegenerationRequired && (
                                <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs font-black leading-5 text-indigo-900">
                                    <i className="fa-solid fa-spinner fa-spin mr-2" />
                                    {locale === "en"
                                        ? "Comparing this color from the saved fitting. No new image is being generated."
                                        : "저장된 착용 결과에서 이 색상을 비교하고 있어요. 새 이미지는 생성하지 않습니다."}
                                </div>
                            )}

                            {!loading && !fitMasterRestorePending && !isFastPreviewLoading && !geometryDecisionPending && confirmedRegenerationRequired && !initialGenerationRequired && !preciseRegenerationOpen && (
                                <button
                                    type="button"
                                    onClick={() => setPreciseRegenerationOpen(true)}
                                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-3 text-xs font-black text-neutral-600 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900"
                                >
                                    <i className="fa-solid fa-chevron-down" />
                                    {correctionIssues.length > 0
                                        ? locale === "en" ? "Optional: create a corrected precise image" : "선택 기능: 보정한 새 정밀 이미지 만들기"
                                        : !sourceFit
                                            ? locale === "en" ? "Open: create one new precise fitting" : "새 정밀 착용 이미지 1회 만들기"
                                            : locale === "en" ? "Optional: create another precise image" : "선택 기능: 새 정밀 이미지가 꼭 필요한가요?"}
                                </button>
                            )}

                            {!loading && !fitMasterRestorePending && !isFastPreviewLoading && !geometryDecisionPending && confirmedRegenerationRequired && regenerationConfirmationVisible && (
                                <div className="mt-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                                    <p className="text-xs font-black text-amber-950">
                                        <i className="fa-solid fa-triangle-exclamation mr-2" />
                                        {initialGenerationRequired
                                            ? finalGenerationFailed
                                                ? locale === "en" ? "You can try again later" : "잠시 후 다시 시도할 수 있어요"
                                                : locale === "en" ? "Create a new fitting image" : "새 착용 이미지 만들기"
                                            : locale === "en" ? "Confirm one new full fitting image" : "새 전체 착용 이미지 생성을 확인해 주세요"}
                                    </p>
                                    <p className="mt-2 text-[11px] font-bold leading-5 text-amber-900">
                                        {finalGenerationFailed
                                            ? locale === "en"
                                                ? "The analysis system could not finish this result. Nothing new will start automatically; use the button below later only when you want to try again."
                                                : "현재 분석 시스템이 이번 결과를 끝까지 준비하지 못했어요. 새 작업은 자동으로 시작되지 않으니, 잠시 후 원하실 때만 아래 버튼으로 다시 요청해 주세요."
                                            : correctionIssues.length > 0
                                            ? locale === "en"
                                                ? "This creates one new full image with your selected corrections. It is not a normal color switch."
                                                : "선택한 보정을 반영해 전체 이미지를 새로 1회 만듭니다. 일반 색상 변경 기능이 아닙니다."
                                            : !sourceFit
                                                ? locale === "en"
                                                    ? "This creates one new fitting image from your dog's side photo and the selected product."
                                                    : "우리 아이 측면 사진과 선택한 실제 상품으로 새 착용 이미지를 1회 만듭니다."
                                            : locale === "en"
                                                ? "Color switching above creates no new image. Continue only if you want to redraw the entire fitting once."
                                                : "위 색상 변경은 새 이미지를 만들지 않습니다. 전체 착용 이미지를 1회 다시 만들려는 경우에만 계속해 주세요."}
                                    </p>
                                    <div className={`mt-3 grid gap-2 ${initialGenerationRequired ? "grid-cols-1" : "grid-cols-2"}`}>
                                        {!initialGenerationRequired && (
                                            <button
                                                type="button"
                                                onClick={() => setPreciseRegenerationOpen(false)}
                                                className="flex min-h-11 min-w-0 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-black text-neutral-700 hover:bg-neutral-50"
                                            >
                                                <span className="break-keep text-center leading-tight">{locale === "en" ? "Cancel" : "취소"}</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => void generate(correctionIssues.length > 0)}
                                            disabled={generationRequestPending}
                                            className="flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-md bg-amber-600 px-2 py-2 text-xs font-black text-white hover:bg-amber-700 disabled:cursor-wait disabled:bg-amber-300"
                                        >
                                            <i className={`fa-solid shrink-0 ${generationRequestPending ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"}`} />
                                            <span className="break-keep text-center leading-tight">
                                                {generationRequestPending
                                                    ? locale === "en" ? "Starting once…" : "한 번만 시작 중…"
                                                    : finalGenerationFailed
                                                        ? locale === "en" ? "Try again later" : "잠시 후 다시 시도"
                                                    : initialGenerationRequired
                                                        ? locale === "en" ? "Create one new fitting image" : "새 착용 이미지 1회 만들기"
                                                        : locale === "en" ? "Confirm: create one new fitting image" : "확인: 새 착용 이미지 1회 만들기"}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!loading && !fitMasterRestorePending && !geometryDecisionPending && !confirmedRegenerationRequired && (
                                <button
                                    type="button"
                                    onClick={() => void generate(correctionIssues.length > 0)}
                                    disabled={Boolean(
                                        explicitColorRequired
                                        || generationRequestPending
                                        || (selectedPreciseFit && correctionIssues.length === 0)
                                    )}
                                    className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-default disabled:bg-emerald-600"
                                >
                                    <i className={`fa-solid ${generationRequestPending ? "fa-spinner fa-spin" : selectedPreciseFit && correctionIssues.length === 0 ? "fa-circle-check" : "fa-wand-magic-sparkles"}`} />
                                    {explicitColorRequired
                                        ? locale === "en" ? "Choose a color first" : "먼저 색상을 선택해 주세요"
                                        : correctionIssues.length > 0
                                            ? locale === "en" ? "Create one precise image with these fixes" : "선택 내용 반영해 정밀 이미지 1회 만들기"
                                            : selectedPreciseFit
                                                ? locale === "en" ? "Precise result ready" : "정밀 결과 확인됨"
                                                : sourceFit
                                                    ? locale === "en" ? "Precise result ready" : "정밀 결과 확인됨"
                                                    : error
                                                        ? locale === "en" ? "Create one new image" : "새 이미지 1회 만들기"
                                                        : locale === "en" ? "Start one precise fitting" : "정밀 입혀보기 1회 시작"}
                                </button>
                            )}
                        </aside>
                    </div>
                )}
            </section>
        </div>
    );
}
