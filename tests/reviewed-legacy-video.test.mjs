import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {safeCatalogHoverVideo, getPetTryOnEligibility} from '../lib/pet-tryon-eligibility.ts';
import {applyReviewedHoverOverride} from '../lib/catalog/reviewed-hover-overrides.ts';
import {videoBrandingMode} from '../lib/catalog/video-branding.ts';
import {matchesReviewedLegacyVideo} from '../lib/catalog/reviewed-legacy-video.mjs';

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const reviews=read('../lib/catalog/reviewed-legacy-videos.json');
const expected=read('./fixtures/hover-publication-legacy-coyote.json');
const raw=read('../lib/catalog/raw.json');

test('the reviewed reuse list is exactly unchanged Porcini plus approved Coyote',()=>{
    assert.deepEqual(reviews,expected.approvedLegacy);
    assert.deepEqual(Object.keys(reviews).sort(),['rs_v2_coyote','rw_porcini_toy']);
    const review=reviews.rw_porcini_toy;
    assert.equal(review.provider,'unknown');assert.equal(review.model,'unknown');assert.equal(review.jobId,null);
    assert.equal(createHash('sha256').update(readFileSync(new URL('../public'+review.assetPath,import.meta.url))).digest('hex'),review.assetSha256);
    assert.equal(videoBrandingMode(review.assetPath),'baked');
    assert.equal(videoBrandingMode(review.assetPath+'?replacement=1'),'overlay');
});

test('Porcini exact reuse is available for hover while remaining excluded from Smart Fit',()=>{
    const row=raw.find(x=>x.folder==='rw_porcini_toy'), effective=applyReviewedHoverOverride(row);
    const product={id:`p_${row.no}`,folder:row.folder,video:effective.video,image:row.image,subcategory:'latex',raw:effective};
    const review=reviews[row.folder];
    assert.equal(safeCatalogHoverVideo(product),review.assetPath);
    assert.equal(getPetTryOnEligibility(product).eligible,false);
    assert.equal(row.video,`/images/products/catalog/${row.folder}/videos/hover.mp4`);
    for(const change of [
        {id:'p_9999'},{folder:'rw_morel_toy'},{video:row.video},{video:review.assetPath+'?new'},
        ...Object.entries({video:row.video,folder:'other',videoProvider:'google_flow_web',videoJobId:'invented',videoReviewSha256:'0'.repeat(64),
            videoReviewClass:undefined,videoQuality:'approved_dog_wearing'}).map(([key,value])=>({raw:{...effective,[key]:value}})),
        {raw:{...effective,videoJobId:undefined}},{raw:{...effective,videoJobId:''}},
    ]) assert.equal(safeCatalogHoverVideo({...product,...change}),undefined);
    for(const change of [{publicationStatus:'pending'},{jobId:'invented'},{provider:'google_flow_web'},{checks:{...review.checks,branding:false}}]) {
        assert.equal(matchesReviewedLegacyVideo(product,{[row.folder]:{...review,...change}}),false);
    }
});

test('Coyote exact reviewed reuse preserves wearing quality, source bytes and independent Smart Fit rules',()=>{
    const row=raw.find(x=>x.folder==='rs_v2_coyote'), effective=applyReviewedHoverOverride(row), review=reviews.rs_v2_coyote;
    const product={id:'p_104',folder:row.folder,video:effective.video,image:row.image,subcategory:'goggles',raw:effective};
    assert.equal(safeCatalogHoverVideo(product),review.assetPath);
    assert.equal(review.quality,'approved_dog_wearing');
    assert.equal(review.provider,'unknown');assert.equal(review.model,'unknown');assert.equal(review.jobId,null);
    assert.equal(videoBrandingMode(review.assetPath),'baked');assert.equal(videoBrandingMode(review.assetPath+'?replacement=1'),'overlay');
    for(const [asset,hash] of [[review.assetPath,review.assetSha256],[row.video,review.sourceVideoSha256]])
        assert.equal(createHash('sha256').update(readFileSync(new URL('../public'+asset,import.meta.url))).digest('hex'),hash);
    assert.deepEqual(getPetTryOnEligibility(product),getPetTryOnEligibility({...product,video:undefined,raw:row}));
    for(const change of [{id:'p_99'},{folder:'rs_v2_gallatingray'},{video:row.video},{video:review.assetPath+'?new'},
        ...Object.entries({video:row.video,folder:'rs_v2_black',videoProvider:'google_flow_web',videoJobId:'made-up',videoReviewSha256:'0'.repeat(64),videoReviewClass:undefined,videoQuality:'approved_dog_using'}).map(([k,v])=>({raw:{...effective,[k]:v}})),
        {raw:{...effective,videoJobId:undefined}},{raw:{...effective,videoJobId:''}}])
        assert.equal(safeCatalogHoverVideo({...product,...change}),undefined);
    for(const change of [{publicationStatus:'pending'},{jobId:'invented'},{model:'Omni'},{checks:{...review.checks,scale:false}}])
        assert.equal(matchesReviewedLegacyVideo(product,{[row.folder]:{...review,...change}}),false);
});
