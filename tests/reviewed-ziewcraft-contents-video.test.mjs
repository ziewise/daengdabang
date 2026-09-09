import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { contentsReviewFixture, contentsEvidenceFixture, refreshContentsFixture } from "./fixtures/ziewcraft-contents-review-fixture.mjs";
import { matchesReviewedZiewcraftContentsVideo as matches, validZiewcraftContentsIdentity, CONTENTS_REVIEW_CHECKS } from "../lib/catalog/reviewed-ziewcraft-contents-video.mjs";
import { verifyZiewcraftContentsEvidence, ziewcraftContentsEvidenceManifestSha256 } from "../lib/catalog/ziewcraft-contents-evidence.mjs";
import { validZiewcraftHumanReviewIdentity } from "../lib/catalog/reviewed-ziewcraft-human-video.mjs";
import { safeCatalogHoverVideo, getPetTryOnEligibility } from "../lib/pet-tryon-eligibility.ts";
const valid = f => matches(f.product, f.records);

function injectedRuntime(f) {
    const file = new URL("../lib/pet-tryon-eligibility.ts", import.meta.url), require = createRequire(file);
    const compiled = ts.transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const loaded = { exports: {} };
    new Function("require", "module", "exports", compiled)(id => id === "./catalog/reviewed-ziewcraft-contents-videos.json" ? f.records : require(id), loaded, loaded.exports);
    return loaded.exports;
}
test("single4 contents uses exact separate registry and does not become dog try-on or an approved pair", () => {
    for (const mode of ["explicit_human", "legacy_service_attestation"]) {
        const f = contentsReviewFixture(mode);
        assert.equal(validZiewcraftContentsIdentity(f.record.videoZiewcraftIdentity), true);
        assert.equal(valid(f), true);
        assert.equal(validZiewcraftHumanReviewIdentity(f.record.videoZiewcraftIdentity), false);
        assert.equal(injectedRuntime(f).safeCatalogHoverVideo(f.product), f.record.video);
        assert.equal(getPetTryOnEligibility(f.product).eligible, false);
        assert.equal(safeCatalogHoverVideo(f.product), undefined);
        assert.equal(f.record.videoZiewcraftIdentity.segment.receipt.publication_allowed, false);
    }
    assert.deepEqual(JSON.parse(readFileSync(new URL("../lib/catalog/reviewed-ziewcraft-contents-videos.json", import.meta.url), "utf8")), {});
});

test("current SKU, flavor, source image and contents evidence must still match", () => {
    for (const [key, value] of [["no", 999], ["name", "different flavour"], ["brandEn", "OTHER"], ["image", "/images/other.jpg"],
        ["sourceUrl", "https://example.test/other"], ["isFood", false], ["details", []], ["supplierCatalogHistorical", true]]) {
        const f = contentsReviewFixture(); f.product.raw[key] = value; assert.equal(valid(f), false, key);
    }
    for (const change of [i => { i.source.sceneContentsVerified = false; }, i => { i.source.image = "/images/other.jpg"; },
        i => { i.source.sceneImageSha256 = "f".repeat(64); }, i => { i.source.referenceImageSha256 = "f".repeat(64); },
        i => { i.humanReview.sourceImageSha256 = "f".repeat(64); }, i => { i.humanReview.productReferenceAssets = []; }]) {
        const f = contentsReviewFixture(); change(f.record.videoZiewcraftIdentity); refreshContentsFixture(f); assert.equal(valid(f), false);
    }
});

test("failed or missing server gates, wrong frame count and fabricated pairs cannot be admitted", () => {
    for (const change of [s => { s.status = "evaluating"; }, s => { s.validation.technical_gate_passed = false; },
        s => { s.validation.technical_failed_gates = ["fixed_camera"]; }, s => { delete s.validation.gates.full_decode; },
        s => { s.validation.gates.fixed_camera.status = "failed"; }, s => { s.validation.gates.extra_measured_gate = { status: "failed" }; },
        s => { s.validation.unverified_gates = []; }, s => { s.review_video.duration_seconds = 8; },
        s => { s.review_video.frame_count = 97; }, s => { s.review_video.fps = 30; }, s => { s.review_video.width = 512; },
        s => { s.review_terminal.provenance.origin = "client_extracted"; }, s => { s.continuation_of_job_id = "a".repeat(32); },
        s => { s.receipt.bindings.pair_video = s.review_video; }, s => { s.receipt.checks.pair_and_loop_watched = true; }]) {
        const f = contentsReviewFixture(); change(f.record.videoZiewcraftIdentity.segment); refreshContentsFixture(f); assert.equal(valid(f), false);
    }
});

test("AI reviews, unseen clips, stale approvals and absent contents-specific checks remain blocked", () => {
    const changes = [i => { i.humanReview.actor = "ai"; }, i => { i.humanReview.checks.fullClipWatched = false; },
        i => { i.segment.receipt.review_actor.kind = "service"; }, i => { i.segment.receipt.review_actor.full_segment_watched = false; },
        i => { i.segment.receipt.review_actor.evidence_sha256 = "f".repeat(64); }, i => { delete i.segment.receipt.review_actor; },
        i => { i.segment.receiptMode = "legacy_service_attestation"; }, i => { i.segment.receipt.status = "rejected"; },
        i => { i.segment.currentDecision.reviewId = "f".repeat(32); }, i => { i.segment.currentDecision.status = "rejected"; },
        i => { i.segment.receipt.publication_allowed = true; }, i => { i.humanReview.reviewedAt = "invalid"; },
        ...CONTENTS_REVIEW_CHECKS.map(key => i => { i.humanReview.checks[key] = false; })];
    for (const change of changes) {
        const f = contentsReviewFixture(); change(f.record.videoZiewcraftIdentity); refreshContentsFixture(f); assert.equal(valid(f), false);
    }
    const f = contentsReviewFixture("legacy_service_attestation"); f.record.videoZiewcraftIdentity.humanReview.actor = "service";
    refreshContentsFixture(f); assert.equal(valid(f), false, "actorless original receipts cannot convert service QA into human viewing");
});

test("shop publication review and final exact4s export remain independent requirements", () => {
    for (const change of [r => { r.publicationStatus = "pending"; }, r => { r.technical.durationSeconds = 8; },
        r => { r.technical.frameCount = 97; }, r => { r.technical.fullDecode = false; }, r => { r.technical.audioStreams = 1; },
        r => { r.export.sourceReviewSha256 = "f".repeat(64); }, r => { r.export.serverPublicationAllowed = true; },
        r => { r.review.decision = "pending"; }, r => { r.review.checks.contentsVisible = false; }, r => { r.review.checks.loopWatched = false; },
        r => { r.review.finalVideoSha256 = "f".repeat(64); }, r => { r.review.reviewedAt = "2020-01-01T00:00:00Z"; }]) {
        const f = contentsReviewFixture(); change(f.record); refreshContentsFixture(f); assert.equal(valid(f), false);
    }
});

test("offline evidence verifies actual archived bytes and bindings for explicit and genuine actorless receipts", () => {
    for (const mode of ["explicit_human", "legacy_service_attestation"]) {
        const f = contentsEvidenceFixture(mode);
        assert.equal(valid(f), true);
        const result = verifyZiewcraftContentsEvidence(f.record, f.files, f.product);
        assert.equal(result.verified, true); assert.equal(result.humanApprovalCreated, false); assert.equal(result.publicationPerformed, false);
        for (const role of f.files.keys()) {
            const changed = new Map(f.files); changed.set(role, Buffer.from("changed bytes"));
            assert.throws(() => verifyZiewcraftContentsEvidence(f.record, changed, f.product), /Missing or changed evidence/);
        }
        const missing = new Map(f.files); missing.delete("server-receipt");
        assert.throws(() => verifyZiewcraftContentsEvidence(f.record, missing, f.product), /Exact original evidence set/);
    }
});

test("rehashing stale decisions or a different server input cannot bypass original semantic bindings", () => {
    for (const mutate of [job => { job.request.input_asset_id = "f".repeat(32); },
        job => { job.plan.effective_params.hover_review_decision.status = "rejected"; },
        job => { job.plan.effective_params.hover_review.validation.gates.non_static.status = "failed"; },
        job => { job.plan.effective_params.hover_review_decision.review_actor.kind = "ai"; }]) {
        const f = contentsEvidenceFixture(), i = f.record.videoZiewcraftIdentity;
        const job = JSON.parse(f.files.get("current-job").toString("utf8")); mutate(job);
        const bytes = Buffer.from(JSON.stringify(job)); f.files.set("current-job", bytes);
        i.segment.jobResponseSha256 = createHash("sha256").update(bytes).digest("hex");
        i.evidenceManifestSha256 = ziewcraftContentsEvidenceManifestSha256(f.files); refreshContentsFixture(f);
        assert.throws(() => verifyZiewcraftContentsEvidence(f.record, f.files, f.product), /differs/);
    }
    const f = contentsEvidenceFixture(); f.product.raw.name = "different flavour";
    assert.throws(() => verifyZiewcraftContentsEvidence(f.record, f.files, f.product), /Current product/);
});
