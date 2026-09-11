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
