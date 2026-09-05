import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getPetTryOnEligibility, safeDogWearingCatalogVideo, safeCatalogHoverVideo } from '../lib/pet-tryon-eligibility.ts';
import { applyReviewedHoverOverride } from '../lib/catalog/reviewed-hover-overrides.ts';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const raw = read('../lib/catalog/raw.json');
const reviews = read('../lib/catalog/reviewed-flow-videos.json');
const retained = [
  ['rw_flagline_harness_24', 20, '522372c35a252a1279c5d507c2e311292bb0fbe0d4dfeb69ae16f7e0543bb357'],
  ['rw_coverall_snow_25fw', 39, '139fa44ad841c8a80fad7e549842c30e1ec3a5d1ff228d6b75761002dd22f7a8'],
  ['rs_v2_volcanored', 99, '5a2ac6a0e464e74a4bcb4ac65b02082b1ec979b453e2be572ddfb88c995acb62'],
];
function candidate(row) {
  const effective = applyReviewedHoverOverride(row);
  return { id: `p_${row.no}`, folder: row.folder, name: effective.name, image: effective.image,
    subcategory: 'wear', video: effective.video, raw: effective };
}

test('only the three specifically retained legacy assets pass, with unchanged local bytes', () => {
  for (const [folder, no, digest] of retained) {
    const product = candidate(raw.find(row => row.folder === folder));
    assert.equal(product.id, `p_${no}`);
    assert.ok(product.video);
    assert.equal(safeDogWearingCatalogVideo(product), product.video);
    assert.equal(safeCatalogHoverVideo(product), product.video);
    assert.equal(createHash('sha256').update(readFileSync(new URL(`../public${product.video}`, import.meta.url))).digest('hex'), digest);
    assert.equal(safeCatalogHoverVideo({ ...product, name: '상품명 변경', subcategory: 'unclassified' }), product.video,
      'retained publication depends on explicit asset identity, not mutable name/category');
  }
  const legacyActive = raw.map(candidate).filter(product => product.raw.videoProvider !== 'google_flow_web' && safeCatalogHoverVideo(product));
  assert.deepEqual(legacyActive.map(product => product.folder).sort(), retained.map(([folder]) => folder).sort());
});

test('retained product/path/provider/job/quality substitutions never grant approval', () => {
  for (const [folder] of retained) {
    const product = candidate(raw.find(row => row.folder === folder));
    for (const changed of [
      { ...product, id: 'p_9999' }, { ...product, folder: 'other' },
      { ...product, raw: { ...product.raw, folder: 'other' } },
      { ...product, video: `${product.video}?new=1` },
      { ...product, video: `/images/products/catalog/${folder}/videos/${'f'.repeat(64)}/hover.mp4` },
      { ...product, video: `https://www.daengdabang.com${product.video}` },
      ...['ziewcraft', 'ddb_exact_product_renderer', 'google_flow_web', 'unknown'].map(videoProvider => ({ ...product, raw: { ...product.raw, videoProvider } })),
      { ...product, raw: { ...product.raw, videoJobId: 'new-job' } },
      { ...product, raw: { ...product.raw, videoQuality: undefined } },
    ]) {
      assert.equal(safeCatalogHoverVideo(changed), undefined);
      assert.equal(safeDogWearingCatalogVideo(changed), undefined);
    }
  }
});

test('renaming or recategorizing an unreviewed source cannot expose its archival video', () => {
  const product = { id: 'p_unreviewed', folder: 'unreviewed', image: '/source.webp',
    video: '/images/products/catalog/unreviewed/videos/hover.mp4', subcategory: 'wear',
    name: '강아지 배낭', raw: { folder: 'unreviewed', videoQuality: 'approved_dog_wearing' } };
  assert.equal(getPetTryOnEligibility(product).eligible, true, 'Smart Fit eligibility remains independently available');
  for (const subcategory of ['wear', 'harness', 'goggles', 'leash', 'carrier']) {
    assert.equal(safeCatalogHoverVideo({ ...product, subcategory }), undefined);
  }
});

test('provider labels and plausible job/hash strings alone cannot publish generated outputs', () => {
  for (const videoProvider of ['ziewcraft', 'ddb_exact_product_renderer', 'google_flow_web']) {
    for (const videoQuality of ['approved_dog_wearing', 'approved_dog_using', 'approved_dog_product_interaction', 'approved_exact_product_images']) {
      const product = { id: 'p_9999', folder: 'unreviewed', name: '강아지 장난감', subcategory: 'wear', image: '/source.webp',
        video: `/images/products/catalog/unreviewed/videos/${'a'.repeat(64)}/hover.mp4`,
        raw: { folder: 'unreviewed', videoProvider, videoQuality, videoJobId: 'plausible-completed-job' } };
      assert.equal(safeCatalogHoverVideo(product), undefined);
    }
  }
});

test('each exact approved Flow manifest record still passes and substitutions still fail', () => {
  for (const [folder, review] of Object.entries(reviews)) {
    const product = candidate(raw.find(row => row.folder === folder));
    assert.equal(safeCatalogHoverVideo(product), review.video);
    assert.equal(safeCatalogHoverVideo({ ...product, raw: { ...product.raw, videoProvider: 'ziewcraft' } }), undefined);
    assert.equal(safeCatalogHoverVideo({ ...product, raw: { ...product.raw, videoJobId: 'pending-job' } }), undefined);
    assert.equal(safeCatalogHoverVideo({ ...product, video: `${review.video}?unreviewed` }), undefined);
    assert.equal(safeCatalogHoverVideo({ ...product, id: 'p_9999' }), undefined);
  }
});
