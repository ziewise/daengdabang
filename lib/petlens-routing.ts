import type { PetProfile } from "@/lib/store";

export const PETLENS_PAGE_HREF = "/pet-lens";
export const PETLENS_PROFILE_SETUP_HREF = "/mypage?petProfile=required#pet-profiles";
const PETLENS_OBSERVATION_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,99}$/;

export function cleanPetLensObservationRequestId(value: string | null | undefined) {
    const requestId = value?.trim() || "";
    return PETLENS_OBSERVATION_REQUEST_ID.test(requestId) ? requestId : "";
}

export function petLensObservationHref(requestId: string) {
    const safeRequestId = cleanPetLensObservationRequestId(requestId);
    return safeRequestId
        ? `${PETLENS_PAGE_HREF}/?observation=${encodeURIComponent(safeRequestId)}`
        : `${PETLENS_PAGE_HREF}/?mode=observation`;
}

export function petLensAuthHref(kind: "login" | "signup", returnTo = PETLENS_PAGE_HREF) {
    return `/auth/${kind}?redirect=${encodeURIComponent(returnTo)}`;
}

export function isPetLensProfileReady(pet: PetProfile) {
    return Boolean(pet.apiProfileId && pet.breed?.trim());
}

export function hasPetLensReadyProfile(pets: PetProfile[]) {
    return pets.some(isPetLensProfileReady);
}

export function petLensProfileNeedsAttention(pet: PetProfile) {
    return !isPetLensProfileReady(pet);
}

function isPetLensDestination(href: string) {
    return href === PETLENS_PAGE_HREF
        || href === `${PETLENS_PAGE_HREF}/`
        || href.startsWith(`${PETLENS_PAGE_HREF}?`)
        || href.startsWith(`${PETLENS_PAGE_HREF}#`)
        || href.startsWith(`${PETLENS_PAGE_HREF}/?`)
        || href.startsWith(`${PETLENS_PAGE_HREF}/#`);
}

function isPetLensObservationDestination(href: string) {
    if (!isPetLensDestination(href)) return false;
    try {
        const destination = new URL(href, "https://daengdabang.local");
        return Boolean(cleanPetLensObservationRequestId(destination.searchParams.get("observation")));
    } catch {
        return false;
    }
}

/**
 * A login/signup return must not send an incomplete member straight back to
 * the same PetLens gate. The profile setup screen is the only safe next step.
 * `requestedHref` is expected to have passed safeInternalRedirect first.
 */
export function petLensPostAuthDestination(requestedHref: string | null, pets: PetProfile[]) {
    if (requestedHref && isPetLensObservationDestination(requestedHref)) {
        return requestedHref;
    }
    if (requestedHref && isPetLensDestination(requestedHref) && !hasPetLensReadyProfile(pets)) {
        return PETLENS_PROFILE_SETUP_HREF;
    }
    return requestedHref || "/mypage";
}
