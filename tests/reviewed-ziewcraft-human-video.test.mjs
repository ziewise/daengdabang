import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { humanReviewFixture, fixtureHash } from "./fixtures/ziewcraft-human-review-fixture.mjs";
import { humanEvidenceFixture } from "./fixtures/ziewcraft-human-evidence-fixture.mjs";
import { verifyZiewcraftHumanEvidence, ziewcraftHumanEvidenceManifestSha256 } from "../lib/catalog/ziewcraft-human-evidence.mjs";
import { matchesReviewedZiewcraftHumanVideo, validZiewcraftHumanReviewIdentity } from "../lib/catalog/reviewed-ziewcraft-human-video.mjs";
import { safeCatalogHoverVideo } from "../lib/pet-tryon-eligibility.ts";
import { applyReviewedHoverOverride } from "../lib/catalog/reviewed-hover-overrides.ts";

const read = file => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
const valid = f => matchesReviewedZiewcraftHumanVideo(f.product, f.records, f.colors);
function changeIdentity(f, mutate) {
    mutate(f.record.videoZiewcraftIdentity);
    f.product.raw.videoZiewcraftIdentity = structuredClone(f.record.videoZiewcraftIdentity);
}
function runtime(f) {
    const file = new URL("../lib/pet-tryon-eligibility.ts", import.meta.url);
    const require = createRequire(file);
    const compiled = ts.transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const loaded = { exports: {} };
    new Function("require", "module", "exports", compiled)(id => {
        if (id === "./catalog/reviewed-ziewcraft-human-videos.json") return f.records;
        if (id === "./catalog/colors.json") return f.colors;
        return require(id);
    }, loaded, loaded.exports);
    return loaded.exports;
}

test("a complete human-reviewed server pair remains private at source and needs separate final publication approval", () => {
    const f = humanReviewFixture();
    assert.equal(validZiewcraftHumanReviewIdentity(f.record.videoZiewcraftIdentity), true);
    assert.equal(valid(f), true);
    assert.equal(runtime(f).safeCatalogHoverVideo(f.product), f.product.video);
    assert.equal(safeCatalogHoverVideo(f.product), undefined, "synthetic evidence is never added to live approval registries");
    assert.equal(read("lib/catalog/reviewed-ziewcraft-human-videos.json")[f.product.folder], undefined);
    assert.equal(f.record.videoZiewcraftIdentity.first.production_eligible, false);
    assert.equal(f.record.videoZiewcraftIdentity.continuation.receipt.publication_allowed, false);
    f.record.publicationStatus = "pending";
    assert.equal(valid(f), false);
});

test("missing, rejected, AI/service, legacy or partial-watching receipts cannot authorize either segment", () => {
    const mutations = [
        s => { delete s.receipt; }, s => { s.receipt.status = "rejected"; }, s => { delete s.receipt.originalSha256; },
        s => { s.receipt.review_id = null; }, s => { s.receipt.api_job_id = "a".repeat(32); },
        s => { s.receipt.ownerSha256 = fixtureHash("different owner"); }, s => { s.receipt.reviewer = ""; },
        s => { s.receipt.note = ""; }, s => { s.receipt.reviewedAt = "not-a-time"; },
        s => { delete s.receipt.review_actor; }, s => { s.receipt.review_actor.kind = "ai"; },
        s => { s.receipt.review_actor.kind = "service"; }, s => { s.receipt.review_actor.kind = "legacy_service_attestation"; },
        s => { s.receipt.review_actor.evidence_id = ""; }, s => { s.receipt.review_actor.evidence_sha256 = "unverified"; },
        s => { s.receipt.review_actor.full_segment_watched = false; }, s => { s.receipt.checks.full_segment_watched = false; },
        s => { s.receipt.private_only = false; }, s => { s.receipt.publication_allowed = true; }, s => { s.receipt.human_identity_verified = true; },
        s => { s.currentDecision.status = "rejected"; }, s => { s.currentDecision.reviewId = "a".repeat(32); },
        s => { s.currentDecision.receiptSha256 = fixtureHash("superseded receipt"); },
        s => { s.receipt.product_reference_assets = []; }, s => { s.receipt.product_reference_assets[0].sha256 = fixtureHash("another product"); },
    ];
    for (const part of ["first", "continuation"]) mutations.forEach((mutate, index) => {
        const f = humanReviewFixture(); changeIdentity(f, i => mutate(i[part])); assert.equal(valid(f), false, `${part} mutation ${index}`);
    });
});

test("actual native/review/terminal bytes and full provenance cannot be substituted with a local terminal or another job", () => {
    const mutations = [
        s => { s.status = "evaluating"; }, s => { s.jobResponseSha256 = undefined; }, s => { s.requestSha256 = ""; }, s => { s.inputReceiptSha256 = ""; },
        s => { s.delivery_mode = "creative_review"; }, s => { s.production_eligible = true; }, s => { s.semantic_verified = true; },
        s => { s.human_review_required = false; }, s => { s.receipt.bindings.native_video.sha256 = fixtureHash("replacement video"); },
        s => { s.receipt.bindings.review_video.artifact_id = "a".repeat(32); }, s => { s.receipt.bindings.terminal.sha256 = fixtureHash("replacement terminal"); },
        s => { s.terminal_frame.origin = "client_extracted_terminal"; }, s => { s.terminal_frame.source_rendition = "native"; },
        s => { s.terminal_frame.frame_index = 96; }, s => { s.terminal_frame.frame_count = 97; }, s => { s.terminal_frame.width = 512; },
        s => { s.terminal_frame.pixel_sha256 = ""; }, s => { s.terminal_frame.recipe_sha256 = fixtureHash("another recipe"); },
        s => { s.terminal_frame.source_artifact_id = s.native_video.artifact_id; }, s => { s.terminal_frame.native_artifact_sha256 = fixtureHash("different native"); },
        s => { s.receipt.terminal_provenance.producer = "different decoder"; }, s => { s.native_terminal.sha256 = ""; },
    ];
    for (const part of ["first", "continuation"]) mutations.forEach((mutate, index) => {
        const f = humanReviewFixture(); changeIdentity(f, i => mutate(i[part])); assert.equal(valid(f), false, `${part} mutation ${index}`);
    });
});

test("continuation requires the current approved first review and the exact unchanged server terminal upload", () => {
    const mutations = [
        i => { i.continuation.continuation_of_job_id = "a".repeat(32); },
        i => { i.continuation.continuation_review_id = "a".repeat(32); },
        i => { i.continuation.ownerSha256 = fixtureHash("another owner"); },
        i => { i.continuation.uploadedTerminal.sha256 = fixtureHash("recompressed PNG"); },
        i => { i.continuation.input.asset_id = "a".repeat(32); },
        i => { i.continuation.uploadedTerminal.sha256 = i.continuation.input.sha256 = fixtureHash("same pixels different PNG bytes"); },
        i => { i.first.input.sha256 = fixtureHash("different first scene"); },
        i => { i.continuation.receipt.reviewedAt = "2026-09-08T01:00:00Z"; },
        i => { i.evidenceVerifiedAt = "2026-09-08T01:00:00Z"; },
    ];
    mutations.forEach((mutate, index) => { const f = humanReviewFixture(); changeIdentity(f, mutate); assert.equal(valid(f), false, `mutation ${index}`); });
});

test("server pair assembly, pair receipt, all-frame preservation and loop watching are mandatory", () => {
    const mutations = [
        i => { delete i.pair; }, i => { i.pair.jobId = i.first.jobId; },
        i => { delete i.continuation.receipt.bindings.pair_video; },
        i => { i.continuation.receipt.bindings.pair_video.sha256 = fixtureHash("different pair"); },
        i => { i.continuation.receipt.checks.pair_and_loop_watched = false; },
        i => { i.pair.assembly.method = "local_concat"; }, i => { i.pair.assembly.decoded_frames_preserved = false; },
        i => { i.pair.assembly.source_job_ids.reverse(); }, i => { i.pair.assembly.source_review_videos.reverse(); },
        i => { i.pair.video.frame_count = 191; }, i => { i.pair.video.fps = 30; }, i => { i.pair.video.duration_seconds = 8.04; },
    ];
    mutations.forEach((mutate, index) => { const f = humanReviewFixture(); changeIdentity(f, mutate); assert.equal(valid(f), false, `mutation ${index}`); });
});

test("failed or missing technical gates stay blocked; unverified proxy measurements are preserved honestly", () => {
    assert.equal(valid(humanReviewFixture()), true, "fixed_camera proxy may remain unverified with actual human reviews");
    const mutations = [
        v => { v.technical_gate_passed = false; }, v => { delete v.technical_core_complete; },
        v => { v.technical_failed_gates = ["non_static"]; }, v => { v.gates.non_static = "failed"; },
        v => { delete v.gates.delivery_format; }, v => { v.gates.full_decode = "unverified"; },
        v => { v.unverified_gates = []; }, v => { v.gates.fixed_camera = null; }, v => { v.sha256 = ""; },
    ];
    for (const part of ["first", "continuation", "pair"]) mutations.forEach((mutate, index) => {
        const f = humanReviewFixture(); changeIdentity(f, i => mutate(i[part].validation)); assert.equal(valid(f), false, `${part} mutation ${index}`);
    });
    const f = humanReviewFixture(); changeIdentity(f, i => { i.pair.validation.gates.loop_continuity = "failed"; }); assert.equal(valid(f), false);
});

test("512/640 native 96/97-frame evidence remains distinct from canonical 1080 96-frame reviews", () => {
    const f = humanReviewFixture();
    assert.equal(valid(f), true);
    changeIdentity(f, i => { i.first.native_video.width = i.first.native_video.height = 1080; });
    assert.equal(valid(f), false, "an upscaled review is not a native 1080 output");
    for (const patch of [{ frame_count: 97 }, { duration_seconds: 97 / 24 }, { width: 512, height: 512 }]) {
        const f = humanReviewFixture(); changeIdentity(f, i => Object.assign(i.first.review_video, patch)); assert.equal(valid(f), false);
    }
});

test("current source, final export and local visual review must independently match the approved pair", () => {
    const mutations = [
        f => { f.product.raw.supplierCatalogHistorical = true; }, f => { f.product.raw.gallery = []; },
        f => { f.colors[f.product.folder][0].name = "Red"; },
        f => { f.record.export.sourcePairSha256 = fixtureHash("different pair"); },
        f => { f.record.export.recipeSha256 = ""; }, f => { f.record.export.nativeGeneration = true; },
        f => { f.record.export.fullDecode = false; }, f => { f.record.export.frameCount = 96; },
        f => { f.record.review.checks.productIdentity = false; }, f => { f.record.review.sha256 = fixtureHash("different final review"); },
        f => { f.product.raw.videoJobId = f.record.videoZiewcraftIdentity.first.jobId; },
        f => { f.product.video += "?different"; }, f => { f.record.technical.audioStreams = 1; },
        f => { f.record.review.reviewedAt = "2026-09-08T01:00:00Z"; },
    ];
    mutations.forEach((mutate, index) => { const f = humanReviewFixture(); mutate(f); assert.equal(valid(f), false, `mutation ${index}`); });
});

test("the production registry cannot activate a record with missing source, receipts or final file bytes", () => {
    const records = read("lib/catalog/reviewed-ziewcraft-human-videos.json");
    const raw = read("lib/catalog/raw.json");
    const colors = read("lib/catalog/colors.json");
    for (const [folder, record] of Object.entries(records)) {
        const rows = raw.filter(row => row.folder === folder);
        assert.equal(rows.length, 1, folder);
        const effective = applyReviewedHoverOverride(rows[0]);
        const product = { id: `p_${effective.no}`, folder, raw: effective, video: effective.video };
        assert.equal(matchesReviewedZiewcraftHumanVideo(product, records, colors), true, folder);
        const bytes = readFileSync(new URL(`../public${record.video}`, import.meta.url));
        assert.equal(createHash("sha256").update(bytes).digest("hex"), record.sha256, folder);
    }
});

test("offline staging requires every original receipt, current job, human evidence record and artifact byte stream", () => {
    const f = humanEvidenceFixture();
    assert.equal(valid(f), true);
    const verified = verifyZiewcraftHumanEvidence(f.record, f.files);
    assert.equal(verified.verified, true);
    assert.equal(verified.humanApprovalCreated, false);
    assert.equal(verified.publicationPerformed, false);
    assert.equal(verified.humanIdentityVerified, false);
    for (const role of f.files.keys()) {
        const missing = new Map(f.files); missing.delete(role);
        assert.throws(() => verifyZiewcraftHumanEvidence(f.record, missing), /evidence set/, role);
        const changed = new Map(f.files); changed.set(role, Buffer.from("substituted bytes"));
        assert.throws(() => verifyZiewcraftHumanEvidence(f.record, changed), /missing or changed/, role);
    }
});

test("rehashing a stale current job or falsified actor cannot make it match the original approved receipt", () => {
    for (const field of ["status", "actor", "terminal", "owner", "artifacts"]) {
        const f = humanEvidenceFixture();
        const current = JSON.parse(f.files.get("first-current-job"));
        if (field === "status") current.plan.effective_params.hover_review_decision.status = "rejected";
        if (field === "actor") current.plan.effective_params.hover_review_decision.review_actor.kind = "ai";
        if (field === "terminal") current.plan.effective_params.terminal_frame.sha256 = fixtureHash("changed terminal");
        if (field === "owner") current.owner = { id: "SYNTHETIC OTHER OWNER" };
        if (field === "artifacts") current.artifacts = [];
        const bytes = Buffer.from(JSON.stringify(current));
        f.files.set("first-current-job", bytes);
        f.record.videoZiewcraftIdentity.first.jobResponseSha256 = createHash("sha256").update(bytes).digest("hex");
        f.record.videoZiewcraftIdentity.evidenceManifestSha256 = ziewcraftHumanEvidenceManifestSha256(f.files);
        assert.throws(() => verifyZiewcraftHumanEvidence(f.record, f.files), /differs|absent or changed/, field);
    }
});
