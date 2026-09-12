import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { matchesReviewedZiewcraftDelegatedVideo as valid } from '../lib/catalog/reviewed-ziewcraft-delegated-video.mjs';
import { safeCatalogHoverVideo } from '../lib/pet-tryon-eligibility.ts';
import { applyReviewedHoverOverride } from '../lib/catalog/reviewed-hover-overrides.ts';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const records = read('../lib/catalog/reviewed-ziewcraft-delegated-videos.json');
const rows = read('../lib/catalog/raw.json');
function fixture(folder = 'soopa_dental_bananapumpkin') {
    const record = structuredClone(records[folder]);
    const raw = structuredClone(applyReviewedHoverOverride(rows.find(r => r.folder === folder)));
    return { record, records: { [folder]: record }, product: { id: `p_${raw.no}`, folder, video: raw.video, raw } };
}
function sync(f) { f.product.raw.videoZiewcraftIdentity = structuredClone(f.record.videoZiewcraftIdentity); }

test('reviewed hand demonstrations are eligible for accessories without claiming a dog appears', () => {
    const treatBag=fixture('rw_treattrader_bag');
    assert.equal(treatBag.product.raw.isFood,false,'a treat storage bag is not edible food');
    assert.equal(treatBag.record.videoQuality,'approved_product_interaction');
    assert.equal(valid(treatBag.product,treatBag.records),true);
    const f=fixture('rw_stashbag_mini_2');
    assert.equal(f.record.videoQuality,'approved_product_interaction');
    assert.equal(f.record.videoZiewcraftIdentity.seconds,4);
    f.product.subcategory='hygiene';
    assert.equal(valid(f.product,f.records),true);
    for(const subcategory of ['wear','harness','goggles','leash']) {
        assert.equal(valid({...f.product,subcategory},f.records),false,'hand footage cannot replace an eight-second wearing video');
    }
    const food=fixture('rw_stashbag_mini_2');
    food.product.raw.isFood=true;
    food.record.videoZiewcraftIdentity.source.isFood=true;
    sync(food);
    assert.equal(valid(food.product,food.records),false,'food still needs its contents review classification');
    const revoked=fixture('rw_stashbag_mini_2');
    revoked.record.currentEligibility.owner_delegated_shop_candidate_current=false;
    assert.equal(valid(revoked.product,revoked.records),false);
});
test('actual owner-delegated AI receipts activate exact product video bytes without a human claim', () => {
    assert.ok(Object.keys(records).length);
    for (const [folder, record] of Object.entries(records)) {
        const f = fixture(folder);
        assert.equal(valid(f.product, records), true, folder);
        assert.equal(safeCatalogHoverVideo(f.product), record.video, folder);
        const bytes = readFileSync(new URL('../public' + record.video, import.meta.url));
        assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256);
        assert.equal(record.delegatedReview.review_actor.kind, 'ai');
        assert.equal(record.delegatedReview.review_actor.full_segment_watched, false);
    }
});
test('revoked eligibility, rejection, changed current receipt and fabricated human flags cannot publish', () => {
    for (const change of [
        f => f.record.currentEligibility.owner_delegated_shop_candidate_current = false,
        f => f.record.currentEligibility.reviewId = 'f'.repeat(32),
        f => f.record.delegatedReview.status = 'rejected',
        f => f.record.delegatedReview.review_actor.kind = 'human',
        f => f.record.delegatedReview.review_actor.full_segment_watched = true,
        f => f.record.delegatedReview.human_approved = true,
        f => f.record.delegatedReview.publication_allowed = true,
        f => f.record.publication.ownerAuthorized = false,
        f => f.record.delegatedReview.server_technical_gate_passed = false,
        f => f.record.delegatedReview.coverage.native_frames.pop(),
        f => f.record.delegatedReview.bindings.review_video.sha256 = 'e'.repeat(64),
    ]) { const f=fixture(); change(f); sync(f); assert.equal(valid(f.product,f.records),false); }
});
test('source changes and another SKU or artifact cannot inherit an AI publication decision', () => {
    for (const change of [
        f => f.product.raw.image = '/images/different-product.png',
        f => f.product.id = 'p_389',
        f => f.record.delegatedReview.product.sku = 'different',
        f => f.product.video = '/images/different.mp4',
        f => f.record.delegatedReview.product_reference_assets = [],
        f => f.product.raw.supplierCatalogHistorical = true,
    ]) { const f=fixture(); change(f); assert.equal(valid(f.product,f.records),false); }
});
test('a four-second file remains ineligible for clothing and other worn categories', () => {
    for (const subcategory of ['wear','harness','goggles','leash']) {
        const f=fixture(); f.product.subcategory=subcategory; assert.equal(valid(f.product,f.records),false);
    }
    const f=fixture(); f.record.videoZiewcraftIdentity.seconds=8; sync(f);
    assert.equal(valid(f.product,f.records),false,'changing metadata cannot invent the second segment');
});

function registeredFixture() {
    const f = fixture();
    const review = f.record.delegatedReview;
    review.scope_id = 'a'.repeat(64);
    f.record.videoZiewcraftIdentity.scopeId = review.scope_id;
    f.record.videoZiewcraftIdentity.scopeRegistrationSha256 = 'b'.repeat(64);
    f.record.delegationScope = {
        scope_id: review.scope_id, policy_id: review.policy_id,
        policy_evidence_sha256: review.policy_evidence_sha256,
        product: structuredClone(review.product), references: structuredClone(review.product_reference_assets),
        required_final_seconds: 4, approval_granted: false,
        scene_asset_id: 'c'.repeat(32), scene_sha256: 'd'.repeat(64),
    };
    f.record.currentEligibility.scopeId = review.scope_id;
    sync(f);
    return f;
}

test('self-registered product scope must match the current AI receipt and exact reference set', () => {
    const f = registeredFixture();
    assert.equal(valid(f.product, f.records), true);
    for (const change of [
        r => r.record.delegationScope.product.color = 'different colour',
        r => r.record.delegationScope.product.sku = 'different sku',
        r => r.record.delegationScope.references[0].source_sha256 = 'e'.repeat(64),
        r => r.record.delegationScope.required_final_seconds = 8,
        r => r.record.delegationScope.approval_granted = true,
        r => r.record.currentEligibility.scopeId = 'f'.repeat(64),
        r => r.record.videoZiewcraftIdentity.scopeId = 'e'.repeat(64),
        r => delete r.record.videoZiewcraftIdentity.scopeRegistrationSha256,
        r => delete r.record.delegationScope,
        r => delete r.record.delegatedReview.scope_id,
    ]) {
        const changed = registeredFixture(); change(changed); sync(changed);
        assert.equal(valid(changed.product, changed.records), false);
    }
});
