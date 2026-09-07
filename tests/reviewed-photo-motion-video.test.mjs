import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { matchesReviewedPhotoMotionVideo, PHOTO_MOTION_HASH_FIELDS } from '../lib/catalog/reviewed-photo-motion-video.mjs';
import { safeCatalogHoverVideo, getPetTryOnEligibility } from '../lib/pet-tryon-eligibility.ts';
import { applyReviewedHoverOverride } from '../lib/catalog/reviewed-hover-overrides.ts';
import { videoBrandingMode } from '../lib/catalog/video-branding.ts';

test('the three user-rejected photo edits stay withdrawn while exact source and assets are preserved', () => {
    const read = relative => JSON.parse(readFileSync(new URL(relative, import.meta.url),'utf8'));
    const reviews=read('../lib/catalog/reviewed-photo-motion-videos.json');
    const rows=read('../lib/catalog/raw.json');
    const flow=read('../lib/catalog/reviewed-flow-videos.json');
    assert.deepEqual(Object.keys(reviews).sort(),['soopa_dental_appleblueberry','soopa_dental_coconutchia','soopa_dental_kaleapple']);
    for(const review of Object.values(reviews)) {
        const raw=applyReviewedHoverOverride(rows.find(row=>row.folder===review.folder));
        const product={id:`p_${raw.no}`,folder:raw.folder,video:raw.video,image:raw.image,raw,subcategory:'treats'};
        assert.equal(safeCatalogHoverVideo(product), flow[review.folder]?.video);
        assert.equal(safeCatalogHoverVideo({...product,video:review.video}),undefined);
        assert.equal(review.publicationStatus,'withdrawn_user_feedback');
        assert.equal(review.withdrawal.reasonCode,'rejected_photo_zoom_motion');
        assert.equal(getPetTryOnEligibility(product).eligible,false);
        assert.equal(raw.videoJobId,flow[review.folder] ? null : undefined);
        assert.equal(raw.videoEditIdentity,undefined);
        assert.equal(matchesReviewedPhotoMotionVideo({id:review.productId,folder:review.folder,video:review.video,raw:{...review}},reviews),false);
        for(const [file,digest] of [[review.video,review.sha256],[review.sourceImagePath,review.videoEditIdentity.sourceImageSha256]]) {
            assert.equal(createHash('sha256').update(readFileSync(new URL(`../public${file}`,import.meta.url))).digest('hex'),digest);
        }
        assert.equal(videoBrandingMode(review.video),'baked');
        assert.equal(videoBrandingMode(`https://cdn.jsdelivr.net/gh/ziewise/daengdabang@${'a'.repeat(40)}/public${review.video}`),'baked');
    }
    const active=rows.map(applyReviewedHoverOverride).filter(raw=>safeCatalogHoverVideo({id:`p_${raw.no}`,folder:raw.folder,video:raw.video,raw}));
    assert.equal(active.length,83);
    assert.equal(active.filter(r=>r.videoProvider==='google_flow_web').length,76);
});

// Synthetic policy examples do not enter the production authority manifest.
function fixture() {
    const videoEditIdentity = {
        method: 'source_photo_motion_edit', durationSeconds: 4,
        sourceImageSha256: '1'.repeat(64), recipeSha256: '2'.repeat(64),
        technicalReviewSha256: '3'.repeat(64), visualReviewSha256: '4'.repeat(64),
    };
    const review = {
        productId: 'p_230', folder: 'soopa_dental_appleblueberry', sha256: 'a'.repeat(64),
        video: `/images/products/catalog/soopa_dental_appleblueberry/videos/${'a'.repeat(64)}/hover.mp4`,
        videoProvider: 'ddb_exact_product_renderer', videoQuality: 'approved_product_contents', videoJobId: null,
        publicationStatus: 'approved', videoEditIdentity,
        sourceImagePath: '/images/products/catalog/soopa_dental_appleblueberry/details/official-visual-01.webp',
        reviewScope: 'verified_product_contents_without_live_dog',
        width: 720, height: 720, durationSeconds: 4, frameCount: 96, fps: 24,
        checks: Object.fromEntries(['sourceProvenance','contentsMatch','sourcePhotoOnly','branding','loop','fullDecode','noLiveDog','noNewProductGeometry'].map(k => [k, true])),
    };
    const raw = { folder: review.folder, video: review.video, videoProvider: review.videoProvider,
        videoQuality: review.videoQuality, videoJobId: null, videoEditIdentity: { ...videoEditIdentity } };
    return { review, product: { id: 'p_230', folder: review.folder, video: review.video, raw } };
}

test('a source-photo edit needs an exact trusted content review, independent of generated jobs', () => {
    const { product, review } = fixture();
    assert.equal(matchesReviewedPhotoMotionVideo(product, {}), false);
    assert.equal(matchesReviewedPhotoMotionVideo(product, { [review.folder]: review }), true);
    for (const patch of [
        { id: 'p_231' }, { folder: 'another-flavour' }, { video: review.video + '?different=1' },
        ...[{videoProvider:'ziewcraft'}, {videoJobId:'generated-job'}, {videoQuality:'approved_dog_wearing'},
            {videoReviewClass:'legacy_reviewed'}, {videoGenerationIdentity:{providerSceneId:'scene'}},
            {videoEditIdentity:undefined}, {folder:'another-flavour'}, {video:review.video+'?different=1'}]
            .map(change => ({raw:{...product.raw,...change}})),
        ...PHOTO_MOTION_HASH_FIELDS.map(key => ({raw:{...product.raw,videoEditIdentity:{...product.raw.videoEditIdentity,[key]:'f'.repeat(64)}}})),
    ]) assert.equal(matchesReviewedPhotoMotionVideo({ ...product, ...patch }, { [review.folder]: review }), false);
});

test('wrong duration, dimensions, evidence or review scope never authorize an edit', () => {
    const { product, review } = fixture();
    for (const patch of [
        {publicationStatus:'pending'}, {publicationStatus:'withdrawn_user_feedback'}, {durationSeconds:8}, {width:512}, {frameCount:97}, {fps:30},
        {videoJobId:'fake-job'}, {reviewScope:'approved_dog_using'}, {sha256:'x'.repeat(64)},
        {sourceImagePath:'/images/products/catalog/another-flavour/details/official-visual-01.webp'},
        ...Object.keys(review.checks).map(key => ({checks:{...review.checks,[key]:false}})),
        ...PHOTO_MOTION_HASH_FIELDS.map(key => ({videoEditIdentity:{...review.videoEditIdentity,[key]:undefined}})),
    ]) assert.equal(matchesReviewedPhotoMotionVideo(product, { [review.folder]: { ...review, ...patch } }), false);
});
