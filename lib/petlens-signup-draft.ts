import type { PetProfile } from "@/lib/store";

const STORAGE_KEY = "ddb.petlens.signupDraft.v1";
const MAX_AGE_MS = 60 * 60 * 1000;
const MAX_PHOTO_DATA_URL_LENGTH = 4_500_000;

type DraftEnvelope = {
    version: 1;
    createdAt: number;
    profile: PetProfile;
};

function sessionStorageSafe(): Storage | undefined {
    if (typeof window === "undefined") return undefined;
    try {
        return window.sessionStorage;
    } catch {
        return undefined;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength: number): string | undefined {
    if (typeof value !== "string") return undefined;
    const text = value.trim().slice(0, maxLength);
    return text || undefined;
}

function cleanPhotoDataUrl(value: unknown) {
    if (typeof value !== "string" || value.length > MAX_PHOTO_DATA_URL_LENGTH) return undefined;
    return /^data:image\/[a-z0-9.+-]+;base64,/i.test(value) ? value : undefined;
}

function cleanPhotoViews(value: unknown): PetProfile["photoViews"] {
    if (!Array.isArray(value)) return undefined;
    const allowed = new Set(["front", "left", "right", "back"]);
    const seen = new Set<string>();
    return value.flatMap((item) => {
        if (!isRecord(item)) return [];
        const viewId = cleanText(item.viewId, 10);
        const dataUrl = cleanPhotoDataUrl(item.dataUrl);
        if (!viewId || !allowed.has(viewId) || seen.has(viewId) || !dataUrl) return [];
        seen.add(viewId);
        return [{
            viewId: viewId as NonNullable<PetProfile["photoViews"]>[number]["viewId"],
            dataUrl,
            imageName: cleanText(item.imageName, 240) || `${viewId}-pet-photo.jpg`,
        }];
    }).slice(0, 4);
}

function sanitizeProfile(value: unknown): PetProfile | undefined {
    if (!isRecord(value)) return undefined;
    const size = value.size;
    const coat = value.coat;
    const activity = value.activity;
    if (!(["small", "medium", "large"] as unknown[]).includes(size)) return undefined;
    if (!(["short", "medium", "long"] as unknown[]).includes(coat)) return undefined;
    if (!(["low", "normal", "high"] as unknown[]).includes(activity)) return undefined;
    const rawAnalysis = isRecord(value.rawAnalysis) ? value.rawAnalysis : undefined;
    return {
        name: cleanText(value.name, 100) || "우리 아이",
        breed: cleanText(value.breed, 100),
        size: size as PetProfile["size"],
        age: cleanText(value.age, 80) || "성견",
        // PetLens must never turn an image estimate into a confirmed value.
        // The low-confidence range remains in rawAnalysis for signup review.
        sex: "unknown",
        coatColor: cleanText(value.coatColor, 80),
        coat: coat as PetProfile["coat"],
        activity: activity as PetProfile["activity"],
        concerns: Array.isArray(value.concerns)
            ? value.concerns.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 20)
            : [],
        photoDataUrl: cleanPhotoDataUrl(value.photoDataUrl),
        photoViews: cleanPhotoViews(value.photoViews),
        rawAnalysis,
        lastAnalyzedAt: cleanText(value.lastAnalyzedAt, 40),
    };
}

export function savePetLensSignupDraft(profile: PetProfile): boolean {
    const storage = sessionStorageSafe();
    if (!storage) return false;
    const sanitized = sanitizeProfile(profile);
    if (!sanitized) return false;
    const envelope: DraftEnvelope = { version: 1, createdAt: Date.now(), profile: sanitized };
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
        return true;
    } catch {
        // Keep the analysis fields even when a browser quota cannot hold the image.
        try {
            storage.setItem(STORAGE_KEY, JSON.stringify({
                ...envelope,
                profile: {
                    ...envelope.profile,
                    photoDataUrl: undefined,
                    photoViews: undefined,
                    rawAnalysis: {
                        ...(envelope.profile.rawAnalysis || {}),
                        petLensDraftPhotosDropped: true,
                    },
                },
            }));
            return false;
        } catch {
            return false;
        }
    }
}

export function loadPetLensSignupDraft(): PetProfile | undefined {
    const storage = sessionStorageSafe();
    if (!storage) return undefined;
    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return undefined;
        const envelope = JSON.parse(raw) as unknown;
        if (
            !isRecord(envelope) ||
            envelope.version !== 1 ||
            typeof envelope.createdAt !== "number" ||
            Date.now() - envelope.createdAt > MAX_AGE_MS ||
            Date.now() < envelope.createdAt - 60_000
        ) {
            storage.removeItem(STORAGE_KEY);
            return undefined;
        }
        const profile = sanitizeProfile(envelope.profile);
        if (!profile) storage.removeItem(STORAGE_KEY);
        return profile;
    } catch {
        storage.removeItem(STORAGE_KEY);
        return undefined;
    }
}

export function clearPetLensSignupDraft() {
    sessionStorageSafe()?.removeItem(STORAGE_KEY);
}

export const PETLENS_SIGNUP_DRAFT_STORAGE_KEY = STORAGE_KEY;
