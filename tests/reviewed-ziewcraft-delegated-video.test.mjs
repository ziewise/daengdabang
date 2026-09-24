import assert from 'node:assert/strict';
import { motionWithdrawals, motionWithdrawnFolders } from './helpers/hover-motion-withdrawals.mjs';
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
    for(const subcategory of ['wear','harness','goggles']) {
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
test('reviewed four-second leash demonstrations survive the storefront leash category', () => {
    for (const folder of ['rw_ridgeline_leash_26', 'rw_frontrangeflex_leash_26']) {
        const f = fixture(folder);
        f.product.subcategory = 'leash';
        assert.equal(f.record.videoQuality, 'approved_product_interaction');
        assert.equal(f.record.videoZiewcraftIdentity.seconds, 4);
        assert.equal(valid(f.product, f.records), true, folder);
        assert.equal(safeCatalogHoverVideo(f.product), f.record.video, folder);
        f.record.delegatedReview.server_technical_gate_passed = false;
        assert.equal(valid(f.product, f.records), false, 'leash classification cannot waive technical QA');
    }
    const worn = fixture('rw_jsk_1000001172');
    worn.product.subcategory = 'leash';
    assert.equal(worn.record.videoZiewcraftIdentity.seconds, 8);
    assert.equal(valid(worn.product, worn.records), true);
    worn.record.videoZiewcraftIdentity.seconds = 4;
    sync(worn);
    assert.equal(valid(worn.product, worn.records), false, 'existing dog-worn leash video still requires both segments');
});
test('toothpaste uses its reviewed hand demonstration as oral care rather than edible treats', () => {
    const f = fixture('fumble_toothpaste');
    assert.equal(f.product.raw.isFood, false);
    assert.equal(f.product.raw.isHygiene, true);
    assert.equal(f.product.raw.useMain, '위생/미용');
    assert.equal(f.record.videoQuality, 'approved_product_interaction');
    f.product.subcategory = 'hygiene';
    assert.equal(valid(f.product, f.records), true);
    assert.equal(safeCatalogHoverVideo(f.product), f.record.video);
    f.record.delegatedReview.server_technical_gate_passed = false;
    assert.equal(valid(f.product, f.records), false);
});

test('OH Bowl tongue-cleaner bowls remain feeding accessories with exact reviewed dog use', () => {
    for (const folder of ['ip_obowl_l', 'ip_obowl_m']) {
        const f = fixture(folder);
        assert.equal(f.product.raw.isFood, false, 'a reusable bowl is not an edible dental treat');
        assert.equal(f.product.raw.useMain, '식기/급수');
        assert.equal(f.product.raw.useSub, '식기/보울/급수');
        f.product.subcategory = 'bowl';
        assert.equal(f.record.videoQuality, 'approved_dog_interacting');
        assert.equal(valid(f.product, f.records), true);
        assert.equal(safeCatalogHoverVideo(f.product), f.record.video);
        f.record.delegatedReview.server_technical_gate_passed = false;
        assert.equal(valid(f.product, f.records), false, 'classification does not waive media QA');
    }
});

test('actual owner-delegated AI receipts activate exact product video bytes without a human claim', () => {
    assert.ok(Object.keys(records).length);
    for (const [folder, record] of Object.entries(records)) {
        const f = fixture(folder);
        const withdrawn = motionWithdrawnFolders.includes(folder);
        if (withdrawn) {
            assert.equal(record.productId, motionWithdrawals[folder].productId);
            assert.equal(record.sha256, motionWithdrawals[folder].sha256);
            for (const field of ['video', 'videoProvider', 'videoJobId', 'videoQuality', 'videoZiewcraftIdentity']) {
                assert.equal(f.product.raw[field], undefined, `${folder}: withdrawn ${field}`);
            }
        }
        assert.equal(valid(f.product, records), !withdrawn, folder);
        assert.equal(safeCatalogHoverVideo(f.product), withdrawn ? undefined : record.video, folder);
        const bytes = readFileSync(new URL('../public' + record.video, import.meta.url));
        assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256);
        assert.equal(record.delegatedReview.review_actor.kind, 'ai');
        assert.equal(record.delegatedReview.review_actor.full_segment_watched, false);
    }
});

test('the reviewed Everest bed retains its complete dog-using video and exact review scope', () => {
    const f = fixture('rw_everest_coat');
    f.product.subcategory = 'bed';
    assert.equal(f.record.videoQuality, 'approved_dog_using');
    assert.equal(f.record.videoZiewcraftIdentity.seconds, 8);
    assert.equal(valid(f.product, f.records), true);
    f.record.videoZiewcraftIdentity.seconds = 4;
    sync(f);
    assert.equal(valid(f.product, f.records), false, 'a bed classification cannot waive the registered eight-second review');
});

test('reviewed replacement-lens demonstrations survive the storefront goggles category', () => {
    const f = fixture('rs_lens_original');
    f.product.subcategory = 'goggles';
    assert.equal(f.record.videoQuality, 'approved_product_interaction');
    assert.equal(f.record.delegationScope.required_final_seconds, 4);
    assert.equal(valid(f.product, f.records), true);
    assert.equal(safeCatalogHoverVideo(f.product), f.record.video);
    f.record.delegatedReview.server_technical_gate_passed = false;
    assert.equal(valid(f.product, f.records), false, 'accessory classification cannot waive technical QA');
});
test('JSK V2 replacement lenses use accessory duration while real goggles still require wearing footage', () => {
    for (const no of [416, 417]) {
        const catalog = rows.find(row => row.no === no);
        assert.match(catalog.name, /교체 렌즈.*V2/);
        // Rebind a test-only accepted accessory fixture to exercise product type.
        const f = fixture('rs_lens_original');
        f.product.id = f.record.productId = `p_${no}`;
        f.product.raw.no = f.record.videoZiewcraftIdentity.source.no = no;
        f.record.delegatedReview.product.product_id = `p_${no}`;
        if (f.record.delegationScope) f.record.delegationScope.product.product_id = `p_${no}`;
        sync(f);
        f.product.subcategory = 'goggles';
        assert.equal(valid(f.product, f.records), true);
        f.record.delegatedReview.server_technical_gate_passed = false;
        assert.equal(valid(f.product, f.records), false);
        f.record.delegatedReview.server_technical_gate_passed = true;
        f.record.delegatedReview.coverage.native_frames.pop();
        assert.equal(valid(f.product, f.records), false);
    }
    const goggles = fixture('rw_stashbag_mini_2');
    goggles.product.subcategory = 'goggles';
    assert.equal(valid(goggles.product, goggles.records), false);
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
