import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
    getPetLensReviewOnlyBreedCandidate,
    isPetLensUnknownBreedAttributeCandidate,
} from "../lib/petlens-review-breed.ts";

function providerResult(overrides = {}) {
    return {
        interpreter: "gemini",
        pet_presence: "dog",
        pet_presence_confidence: 0.99,
        breed_resolution_status: "unknown",
        unlisted_breed_candidate: "시바견",
        unlisted_breed_candidate_en: "Shiba Inu",
        unlisted_breed_confidence: 0.88,
        unlisted_breed_requires_user_confirmation: true,
        analysis_quality: "high",
        ...overrides,
    };
}

test("a real-provider unlisted breed becomes a review-only custom-input candidate", () => {
    assert.deepEqual(getPetLensReviewOnlyBreedCandidate(providerResult()), {
        label: "시바견",
        labelEn: "Shiba Inu",
        confidence: 0.88,
        resolutionStatus: "unknown",
        requiresUserConfirmation: true,
    });
});

test("ambiguous generic Poodle stays review-only instead of becoming canonical", () => {
    assert.deepEqual(getPetLensReviewOnlyBreedCandidate(providerResult({
        breed_resolution_status: "ambiguous",
        unlisted_breed_candidate: "푸들",
        unlisted_breed_candidate_en: "Poodle",
        unlisted_breed_confidence: 0.9,
    })), {
        label: "푸들",
        labelEn: "Poodle",
        confidence: 0.9,
        resolutionStatus: "ambiguous",
        requiresUserConfirmation: true,
    });
});

test("unknown Shiba allows editable physical candidates while ambiguous Poodle blocks them", () => {
    assert.equal(isPetLensUnknownBreedAttributeCandidate(providerResult()), true);
    assert.equal(isPetLensUnknownBreedAttributeCandidate(providerResult({
        breed_resolution_status: "ambiguous",
        unlisted_breed_candidate: "푸들",
        unlisted_breed_candidate_en: "Poodle",
    })), false);
    assert.equal(isPetLensUnknownBreedAttributeCandidate(providerResult({
        analysis_quality: "low",
    })), false);
});

test("untrusted, low-confidence, non-dog, or already-canonical values are rejected", () => {
    assert.equal(getPetLensReviewOnlyBreedCandidate(providerResult({ interpreter: "echo" })), undefined);
    assert.equal(getPetLensReviewOnlyBreedCandidate(providerResult({ unlisted_breed_confidence: 0.64 })), undefined);
    assert.equal(getPetLensReviewOnlyBreedCandidate(providerResult({ pet_presence: "other_pet" })), undefined);
    assert.equal(getPetLensReviewOnlyBreedCandidate(providerResult({
        breed_resolution_status: "exact",
        unlisted_breed_candidate: "골든 리트리버",
    })), undefined);
    assert.equal(getPetLensReviewOnlyBreedCandidate(providerResult({
        unlisted_breed_requires_user_confirmation: false,
    })), undefined);
});

test("PetLens mapping separates canonical breed and gates review-only physical candidates", async () => {
    const source = await readFile(new URL("../lib/daengdabang-llm.ts", import.meta.url), "utf8");

    assert.match(source, /const reviewOnlyBreed = getPetLensReviewOnlyBreedCandidate\(data\)/);
    assert.match(source, /const breed = canonicalBreed \?\? reviewOnlyBreed\?\.label/);
    assert.match(source, /reviewOnlyBreed \? \{ reviewOnlyBreed \} : \{\}/);
    assert.match(source, /canonicalCandidateReady \|\| isPetLensUnknownBreedAttributeCandidate\(data\)/);
    assert.match(source, /const trustworthyCanonicalBreed = isTrustworthyCanonicalBreedCandidate\(data\)/);
    assert.match(source, /const weightEstimate = trustworthyCandidate \? getPetLensWeightEstimate\(data\) : undefined/);
});
