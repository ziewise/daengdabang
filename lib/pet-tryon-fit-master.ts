export const PET_TRYON_FIT_MASTER_STORAGE_PREFIX = "ddb.tryon.fit-master.v2";
export const LEGACY_PET_TRYON_FIT_MASTER_STORAGE_PREFIX = "ddb.tryon.fit-master.v1";

export type PetTryOnFitMasterIdentity = {
    ownerKey: string;
    petProfileId: number;
    productId: string;
    petReferenceKey: string;
};

export type PetTryOnFitMaster = {
    jobId: string;
    productImage: string;
};

export type PetTryOnFitMasterLookup =
    | { status: "found"; value: PetTryOnFitMaster }
    | { status: "missing" }
    | { status: "invalid" }
    | { status: "unavailable" };

function validIdentity(identity: PetTryOnFitMasterIdentity) {
    return Boolean(
        identity.ownerKey
        && Number.isInteger(identity.petProfileId)
        && identity.petProfileId > 0
        && identity.productId
        && identity.petReferenceKey,
    );
}

export function petTryOnReferenceKey(value: string) {
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        first = Math.imul(first ^ code, 0x01000193);
        second = Math.imul(second ^ code, 0x85ebca6b);
    }
    return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

function legacyPetTryOnReferenceKey(value: string) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193);
    }
    return (hash >>> 0).toString(36);
}

export function petTryOnFitMasterStorageKey(identity: PetTryOnFitMasterIdentity) {
    return [
        PET_TRYON_FIT_MASTER_STORAGE_PREFIX,
        identity.ownerKey,
        identity.petProfileId,
        identity.productId,
        identity.petReferenceKey,
    ].join(":");
}

function legacyPetTryOnFitMasterStorageKey(
    identity: PetTryOnFitMasterIdentity,
    petReferenceImage: string,
) {
    return [
        LEGACY_PET_TRYON_FIT_MASTER_STORAGE_PREFIX,
        identity.petProfileId,
        identity.productId,
        legacyPetTryOnReferenceKey(petReferenceImage),
    ].join(":");
}

function parseFitMaster(raw: string): PetTryOnFitMasterLookup {
    try {
        const parsed = JSON.parse(raw) as Partial<PetTryOnFitMaster> | null;
        if (!parsed || typeof parsed.jobId !== "string" || typeof parsed.productImage !== "string") {
            return { status: "invalid" };
        }
        const jobId = parsed.jobId.trim();
        const productImage = parsed.productImage.trim();
        if (!jobId || !productImage) return { status: "invalid" };
        return { status: "found", value: { jobId, productImage } };
    } catch {
        return { status: "invalid" };
    }
}

export function readPetTryOnFitMaster(identity: PetTryOnFitMasterIdentity): PetTryOnFitMasterLookup {
    if (!validIdentity(identity)) return { status: "invalid" };
    if (typeof window === "undefined") return { status: "unavailable" };
    try {
        const raw = window.sessionStorage.getItem(petTryOnFitMasterStorageKey(identity));
        if (!raw) return { status: "missing" };
        return parseFitMaster(raw);
    } catch {
        return { status: "unavailable" };
    }
}

export function savePetTryOnFitMaster(
    identity: PetTryOnFitMasterIdentity,
    value: PetTryOnFitMaster,
) {
    if (
        !validIdentity(identity)
        || !value.jobId.trim()
        || !value.productImage.trim()
        || typeof window === "undefined"
    ) return false;
    try {
        // Store only the server job id and the public product reference. The
        // member photo, bearer token, and generated image never enter storage.
        window.sessionStorage.setItem(
            petTryOnFitMasterStorageKey(identity),
            JSON.stringify({
                jobId: value.jobId.trim(),
                productImage: value.productImage.trim(),
            }),
        );
        return true;
    } catch {
        return false;
    }
}

export function removePetTryOnFitMaster(identity: PetTryOnFitMasterIdentity) {
    if (!validIdentity(identity) || typeof window === "undefined") return;
    try {
        window.sessionStorage.removeItem(petTryOnFitMasterStorageKey(identity));
    } catch {
        // Removal is best-effort; an unreadable record must still fail closed.
    }
}

export function readPetTryOnFitMasterWithLegacy(
    identity: PetTryOnFitMasterIdentity,
    petReferenceImage: string,
): PetTryOnFitMasterLookup {
    const current = readPetTryOnFitMaster(identity);
    if (current.status !== "missing") return current;
    if (!petReferenceImage || typeof window === "undefined") return { status: "unavailable" };

    const legacyKey = legacyPetTryOnFitMasterStorageKey(identity, petReferenceImage);
    try {
        const raw = window.sessionStorage.getItem(legacyKey);
        if (!raw) return { status: "missing" };
        const legacy = parseFitMaster(raw);
        if (
            legacy.status === "found"
            && savePetTryOnFitMaster(identity, legacy.value)
        ) {
            // Delete v1 only after its owner-scoped v2 replacement is durable.
            window.sessionStorage.removeItem(legacyKey);
        }
        return legacy;
    } catch {
        return { status: "unavailable" };
    }
}
