import type { PetProfile, User } from "@/lib/store";
import {
    getPetBreedVisual,
    isPetBreedId,
    resolvePetBreedId,
    type PetBreedFamily,
} from "@/lib/pet-companion-breeds";

export type CompanionCharacterId = "poodle" | "retriever" | "corgi" | "bulldog";
export type CompanionToneId = "cream" | "apricot" | "caramel" | "charcoal";
export type CompanionAccessoryId = "none" | "sky" | "rose" | "mint";
export type CompanionMotionId = "calm" | "lively";

export type PetCompanionSettings = {
    version: 1;
    ownerKey: string;
    activePetName: string;
    enabled: boolean;
    breedId: string;
    characterId: CompanionCharacterId;
    toneId: CompanionToneId;
    accessoryId: CompanionAccessoryId;
    motion: CompanionMotionId;
    speechEnabled: boolean;
};

type StoredPetCompanionSettings = Omit<PetCompanionSettings, "ownerKey">;

export const PET_COMPANION_STORAGE_KEY = "ddb.petCompanion.v1";
export const PET_COMPANION_OPEN_EVENT = "ddb:pet-companion-open";
export const PET_COMPANION_GUEST_BREED_SESSION_KEY = "ddb.petCompanion.guestBreed.v1";
const PET_COMPANION_ACTIVE_HERO_BREED_KEY = "activeHeroBreedKey";

const HERO_BREED_CANDIDATES = {
    poodle: ["toy-poodle", "miniature-poodle", "maltese-dog"],
    englishbulldog: ["french-bulldog", "pug", "boston-bull"],
    welshcorgi: ["pembroke", "cardigan"],
} as const;

export type PetCompanionHeroBreedKey = keyof typeof HERO_BREED_CANDIDATES;

const HERO_CHARACTER_IDS: Record<PetCompanionHeroBreedKey, CompanionCharacterId> = {
    poodle: "poodle",
    englishbulldog: "bulldog",
    welshcorgi: "corgi",
};

const HERO_FAMILY_CHARACTER_IDS: Partial<Record<PetBreedFamily, CompanionCharacterId>> = {
    poodle: "poodle",
    corgi: "corgi",
    bully: "bulldog",
    retriever: "retriever",
};

export type PetCompanionHeroVisual = {
    breedId: string;
    characterId: CompanionCharacterId;
};

const sessionBreedFallback = new Map<PetCompanionHeroBreedKey, string>();
let sessionHeroBreedKeyFallback: PetCompanionHeroBreedKey | null = null;

export const COMPANION_CHARACTERS: Array<{
    id: CompanionCharacterId;
    label: string;
    description: string;
}> = [
    { id: "poodle", label: "푸들·비숑 모델", description: "소형·곱슬·장모 견종군" },
    { id: "retriever", label: "리트리버 모델", description: "중대형·하운드·목양 견종군" },
    { id: "corgi", label: "코기 모델", description: "짧은 다리·로우독 견종군" },
    { id: "bulldog", label: "불도그 모델", description: "단두·불리·마스티프 견종군" },
];

export const COMPANION_TONES: Array<{ id: CompanionToneId; label: string; color: string }> = [
    { id: "cream", label: "크림", color: "#f5dfb8" },
    { id: "apricot", label: "애프리콧", color: "#d8904e" },
    { id: "caramel", label: "캐러멜", color: "#9d603d" },
    { id: "charcoal", label: "차콜", color: "#4a4749" },
];

export const COMPANION_ACCESSORIES: Array<{
    id: CompanionAccessoryId;
    label: string;
    color: string;
}> = [
    { id: "none", label: "없음", color: "#f4f4f5" },
    { id: "sky", label: "하늘", color: "#5aa9e6" },
    { id: "rose", label: "장미", color: "#ef6f91" },
    { id: "mint", label: "민트", color: "#43b89c" },
];

const CHARACTER_IDS = new Set<CompanionCharacterId>(COMPANION_CHARACTERS.map((item) => item.id));
const TONE_IDS = new Set<CompanionToneId>(COMPANION_TONES.map((item) => item.id));
const ACCESSORY_IDS = new Set<CompanionAccessoryId>(COMPANION_ACCESSORIES.map((item) => item.id));
const MOTION_IDS = new Set<CompanionMotionId>(["calm", "lively"]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeHeroBreedKey(value: string | null | undefined): PetCompanionHeroBreedKey | null {
    const normalized = value?.trim().toLowerCase();
    return normalized && Object.prototype.hasOwnProperty.call(HERO_BREED_CANDIDATES, normalized)
        ? normalized as PetCompanionHeroBreedKey
        : null;
}

/**
 * Resolves the breed rendered in a hero video to the companion's visual rig.
 * This reads the current hero attribute directly (no session fallback), so a
 * weather/season scene swap cannot leave the previous hero's pet on screen.
 * Known video aliases retain their curated canonical representatives; future
 * manifest breeds fall back to the 120-breed catalog when an alias exists.
 */
export function resolveHeroCompanionVisual(
    heroBreedKey: string | null | undefined,
): PetCompanionHeroVisual | null {
    const normalizedKey = normalizeHeroBreedKey(heroBreedKey);
    if (normalizedKey) {
        const breedId = HERO_BREED_CANDIDATES[normalizedKey].find(isPetBreedId);
        if (breedId) {
            return {
                breedId,
                characterId: HERO_CHARACTER_IDS[normalizedKey],
            };
        }
    }

    const breedId = resolvePetBreedId(heroBreedKey || "", "");
    if (!breedId || !isPetBreedId(breedId)) return null;
    const visual = getPetBreedVisual(breedId);
    return {
        breedId,
        characterId: HERO_FAMILY_CHARACTER_IDS[visual.family] || "poodle",
    };
}

function readSessionBreedSelections(): Record<string, unknown> {
    if (typeof window === "undefined") return {};
    try {
        const stored = JSON.parse(
            window.sessionStorage.getItem(PET_COMPANION_GUEST_BREED_SESSION_KEY) || "null",
        );
        return isRecord(stored) ? stored : {};
    } catch {
        return {};
    }
}

export function resolveSessionCompanionHeroBreedKey(
    heroBreedKey: string | null | undefined,
): PetCompanionHeroBreedKey | null {
    const direct = normalizeHeroBreedKey(heroBreedKey);
    if (direct) {
        sessionHeroBreedKeyFallback = direct;
        return direct;
    }
    if (sessionHeroBreedKeyFallback) return sessionHeroBreedKeyFallback;

    const stored = readSessionBreedSelections();
    const storedKey = typeof stored[PET_COMPANION_ACTIVE_HERO_BREED_KEY] === "string"
        ? normalizeHeroBreedKey(stored[PET_COMPANION_ACTIVE_HERO_BREED_KEY])
        : null;
    if (storedKey) sessionHeroBreedKeyFallback = storedKey;
    return storedKey;
}

/**
 * Selects one canonical 120-class breed for the current hero dog. The choice is
 * stored per hero key for the browser session, so route changes and remounts do
 * not make a guest's companion unexpectedly change breed.
 */
export function selectSessionCompanionBreedId(
    heroBreedKey: string | null | undefined,
): string | null {
    const normalizedKey = resolveSessionCompanionHeroBreedKey(heroBreedKey);
    if (!normalizedKey) return null;

    const candidates = HERO_BREED_CANDIDATES[normalizedKey]
        .filter((breedId) => isPetBreedId(breedId));
    if (!candidates.length) return null;

    const storedSelections = readSessionBreedSelections();
    const rememberSelection = (breedId: string) => {
        sessionBreedFallback.set(normalizedKey, breedId);
        sessionHeroBreedKeyFallback = normalizedKey;
        if (typeof window !== "undefined") {
            try {
                window.sessionStorage.setItem(
                    PET_COMPANION_GUEST_BREED_SESSION_KEY,
                    JSON.stringify({
                        ...storedSelections,
                        [normalizedKey]: breedId,
                        [PET_COMPANION_ACTIVE_HERO_BREED_KEY]: normalizedKey,
                    }),
                );
            } catch {
                // The module cache remains stable while sessionStorage is blocked.
            }
        }
        return breedId;
    };

    const memorySelection = sessionBreedFallback.get(normalizedKey);
    if (memorySelection && candidates.some((breedId) => breedId === memorySelection)) {
        return rememberSelection(memorySelection);
    }

    const storedBreedId = storedSelections[normalizedKey];
    if (
        typeof storedBreedId === "string"
        && isPetBreedId(storedBreedId)
        && candidates.some((breedId) => breedId === storedBreedId)
    ) {
        return rememberSelection(storedBreedId);
    }

    // Candidate order is a closest-match ranking for the hero archetype.
    // Keep an existing session choice, but make every new choice deterministic.
    return rememberSelection(candidates[0]);
}

export function companionCharacterIdForHeroBreed(
    heroBreedKey: string | null | undefined,
): CompanionCharacterId | null {
    const normalizedKey = resolveSessionCompanionHeroBreedKey(heroBreedKey);
    return normalizedKey ? HERO_CHARACTER_IDS[normalizedKey] : null;
}

function petBreedText(pet?: PetProfile | null) {
    const raw = isRecord(pet?.rawAnalysis) ? pet.rawAnalysis : {};
    return [pet?.breed, raw.breed, raw.breed_ko, raw.breed_en]
        .filter((value): value is string => typeof value === "string")
        .join(" ")
        .toLowerCase();
}

function petBreedIdentity(pet?: PetProfile | null) {
    const raw = isRecord(pet?.rawAnalysis) ? pet.rawAnalysis : {};
    const value = [raw.breed_en, pet?.breed, raw.breed_ko, raw.breed]
        .find((item) => typeof item === "string" && item.trim());
    return typeof value === "string" ? value.trim() : "";
}

function legacyBreedId(characterId: CompanionCharacterId) {
    if (characterId === "retriever") return "golden-retriever";
    if (characterId === "corgi") return "pembroke";
    if (characterId === "bulldog") return "french-bulldog";
    return "toy-poodle";
}

export function suggestCompanionCharacter(pet?: PetProfile | null): CompanionCharacterId {
    const breed = petBreedText(pet);
    // Stanford Dogs 120종과 국내 통용 별칭을 네 가지 프리미엄 체형 모델로 안정적으로 묶는다.
    // 구체 견종 자산이 추가되면 이 반환값만 확장하고 이동/추천 로직은 그대로 재사용한다.
    if (/불도그|불독|퍼그|복서|마스티프|보스턴|브라방송|아펜핀셔|페키니즈|bulldog|pug|boxer|mastiff|boston bull|brabancon griffon|affenpinscher|pekinese|staffordshire|bullterrier|bull terrier/.test(breed)) return "bulldog";
    if (/코기|웰시|닥스훈트|바셋|스코티시|댄디 딘몬트|실리햄|corgi|pembroke|cardigan|dachshund|basset|scotch terrier|scottish terrier|dandie dinmont|sealyham/.test(breed)) return "corgi";
    if (/푸들|비숑|말티|시츄|포메|사모예드|차우|키스혼드|슈나우저|테리어|스패니얼|라사|빠삐용|치와와|poodle|bichon|maltese|shih|pomeranian|samoyed|chow|keeshond|schnauzer|terrier|spaniel|lhasa|papillon|chihuahua|bedlington|cairn|silky|yorkshire|west highland|norfolk|norwich|schipperke/.test(breed)) return "poodle";
    if (/리트리버|래브라도|골든|진도|셰퍼드|콜리|허스키|말라뮤트|하운드|세터|포인터|도베르만|로트바일러|retriever|labrador|golden|jindo|shepherd|collie|husky|malamute|hound|setter|pointer|doberman|rottweiler|ridgeback|weimaraner|vizsla|newfoundland|leonberg|pyrenees|bernese|great dane|saint bernard|wolfhound|greyhound|whippet|borzoi|saluki|elkhound|briard|malinois|groenendael|kelpie|komondor|kuvasz|bouvier|dingo|dhole/.test(breed)) return "retriever";
    if (pet?.size === "small" || pet?.coat === "long") return "poodle";
    if (pet?.size === "large") return "retriever";
    return "corgi";
}

export function suggestCompanionTone(pet?: PetProfile | null): CompanionToneId {
    const breed = petBreedText(pet);
    if (/블랙|검정|black|charcoal/.test(breed)) return "charcoal";
    if (/초코|브라운|brown|chocolate/.test(breed)) return "caramel";
    if (/레드|애프리콧|apricot|red/.test(breed)) return "apricot";
    return "cream";
}

export function defaultCompanionSettings(ownerKey: string, pet?: PetProfile | null): PetCompanionSettings {
    const characterId = suggestCompanionCharacter(pet);
    return {
        version: 1,
        ownerKey,
        activePetName: pet?.name?.trim() || "몽이",
        enabled: true,
        breedId: petBreedIdentity(pet) || legacyBreedId(characterId),
        characterId,
        toneId: suggestCompanionTone(pet),
        accessoryId: "sky",
        motion: pet?.activity === "high" ? "lively" : "calm",
        speechEnabled: true,
    };
}

function normalizeSettings(
    value: unknown,
    fallback: PetCompanionSettings,
    ownerKey: string,
): PetCompanionSettings | null {
    if (!isRecord(value)) return null;
    const characterId = value.characterId;
    const toneId = value.toneId;
    const accessoryId = value.accessoryId;
    const motion = value.motion;
    return {
        version: 1,
        ownerKey,
        activePetName: typeof value.activePetName === "string" && value.activePetName.trim()
            ? value.activePetName.trim()
            : fallback.activePetName,
        enabled: typeof value.enabled === "boolean" ? value.enabled : fallback.enabled,
        breedId: typeof value.breedId === "string" && value.breedId.trim()
            ? value.breedId.trim()
            : fallback.breedId,
        characterId: typeof characterId === "string" && CHARACTER_IDS.has(characterId as CompanionCharacterId)
            ? characterId as CompanionCharacterId
            : fallback.characterId,
        toneId: typeof toneId === "string" && TONE_IDS.has(toneId as CompanionToneId)
            ? toneId as CompanionToneId
            : fallback.toneId,
        accessoryId: typeof accessoryId === "string" && ACCESSORY_IDS.has(accessoryId as CompanionAccessoryId)
            ? accessoryId as CompanionAccessoryId
            : fallback.accessoryId,
        motion: typeof motion === "string" && MOTION_IDS.has(motion as CompanionMotionId)
            ? motion as CompanionMotionId
            : fallback.motion,
        speechEnabled: typeof value.speechEnabled === "boolean"
            ? value.speechEnabled
            : fallback.speechEnabled,
    };
}

export function companionSettingsFromPet(
    pet: PetProfile | null | undefined,
    ownerKey: string,
): PetCompanionSettings | null {
    if (!pet || !isRecord(pet.rawAnalysis)) return null;
    const fallback = defaultCompanionSettings(ownerKey, pet);
    return normalizeSettings(pet.rawAnalysis.companion, fallback, ownerKey);
}

export function readLocalCompanionSettings(
    ownerKey: string,
    pet?: PetProfile | null,
    pets: PetProfile[] = [],
): PetCompanionSettings | null {
    if (typeof window === "undefined") return null;
    try {
        const value = JSON.parse(window.localStorage.getItem(PET_COMPANION_STORAGE_KEY) || "null");
        if (!isRecord(value) || value.ownerKey !== ownerKey) return null;
        const activePet = typeof value.activePetName === "string"
            ? pets.find((candidate) => candidate.name === value.activePetName) || pet
            : pet;
        return normalizeSettings(value, defaultCompanionSettings(ownerKey, activePet), ownerKey);
    } catch {
        return null;
    }
}

export function writeLocalCompanionSettings(settings: PetCompanionSettings) {
    if (typeof window === "undefined") return false;
    try {
        window.localStorage.setItem(PET_COMPANION_STORAGE_KEY, JSON.stringify(settings));
        return true;
    } catch {
        // The live in-memory setting still changes when storage is blocked.
        return false;
    }
}

export function resolveCompanionSettings(user: User | null): PetCompanionSettings {
    const ownerKey = user?.email || "guest";
    const local = readLocalCompanionSettings(ownerKey, user?.pets[0], user?.pets || []);
    const localPet = user?.pets.find((pet) => pet.name === local?.activePetName);
    const usableLocal = user && local && !localPet ? null : local;
    const activePet = localPet
        || user?.pets.find((pet) => companionSettingsFromPet(pet, ownerKey)?.enabled)
        || user?.pets[0]
        || null;
    return usableLocal
        || companionSettingsFromPet(activePet, ownerKey)
        || defaultCompanionSettings(ownerKey, activePet);
}

export function withCompanionSettings(
    pet: PetProfile,
    settings: PetCompanionSettings,
): PetProfile {
    const stored: StoredPetCompanionSettings = {
        version: 1,
        activePetName: pet.name,
        enabled: settings.enabled,
        breedId: settings.breedId,
        characterId: settings.characterId,
        toneId: settings.toneId,
        accessoryId: settings.accessoryId,
        motion: settings.motion,
        speechEnabled: settings.speechEnabled,
    };
    return {
        ...pet,
        rawAnalysis: {
            ...(isRecord(pet.rawAnalysis) ? pet.rawAnalysis : {}),
            companion: stored,
        },
    };
}

export function petCompanionBreedLabel(pet?: PetProfile | null) {
    const breed = petBreedText(pet).trim();
    if (pet?.breed) return pet.breed;
    if (breed) return breed;
    if (pet?.size === "large") return "대형견 체형";
    if (pet?.size === "small") return "소형견 체형";
    return "중형견 체형";
}
