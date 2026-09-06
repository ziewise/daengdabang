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
const expected=read('./fixtures/flow-publication-batch09.json');
const previous=read('./fixtures/hover-publication-legacy-coyote.json');
const raw=read('../lib/catalog/raw.json');

test('the reviewed reuse list is exactly approved legacy four with prior Porcini and Coyote unchanged',()=>{
    assert.deepEqual(reviews,expected.approvedLegacy);
    assert.deepEqual(Object.keys(reviews).sort(),['rs_hardcase','rs_v2_coyote','rw_kibblecaddy','rw_porcini_toy']);
    for(const [folder,review] of Object.entries(previous.approvedLegacy)) assert.deepEqual(reviews[folder],review);
    for(const review of Object.values(reviews)) {
        const row=raw.find(x=>x.folder===review.folder);
        assert.equal(review.provider,'unknown');assert.equal(review.model,'unknown');assert.equal(review.jobId,null);
        for(const [asset,hash] of [[review.assetPath,review.assetSha256],[row.video,review.sourceVideoSha256]])
            assert.equal(createHash('sha256').update(readFileSync(new URL('../public'+asset,import.meta.url))).digest('hex'),hash);
        assert.equal(videoBrandingMode(review.assetPath),'baked');
        assert.equal(videoBrandingMode(review.assetPath+'?replacement=1'),'overlay');
    }
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

for(const [folder,quality,functionShown] of [
    ['rs_hardcase','approved_dog_interacting',false],
    ['rw_kibblecaddy','approved_dog_using',true],
]) test(`${folder} exact reviewed reuse retains truthful interaction and rejects changed identity or provenance`,()=>{
    const row=raw.find(x=>x.folder===folder), effective=applyReviewedHoverOverride(row), review=reviews[folder];
    const product={id:`p_${row.no}`,folder,video:effective.video,image:row.image,subcategory:expected.expectedLegacySubcategories[folder],raw:effective};
    assert.equal(review.quality,quality);
    assert.equal(review.demonstratedProductFunction,functionShown);
    assert.equal(safeCatalogHoverVideo(product),review.assetPath);
    assert.equal(matchesReviewedLegacyVideo(product,reviews),true);
    assert.deepEqual(getPetTryOnEligibility(product),getPetTryOnEligibility({...product,video:undefined,raw:row}));
    for(const change of [
        {id:'p_9999'},{folder:'unreviewed'},{video:row.video},{video:review.assetPath+'?new'},
        ...Object.entries({video:row.video,folder:'unreviewed',videoProvider:'google_flow_web',videoJobId:'invented',
            videoReviewSha256:'0'.repeat(64),videoReviewClass:undefined,videoQuality:quality==='approved_dog_interacting'?'approved_dog_using':'approved_dog_interacting'}).map(([k,v])=>({raw:{...effective,[k]:v}})),
        {raw:{...effective,videoJobId:undefined}},{raw:{...effective,videoJobId:''}},
    ]) assert.equal(safeCatalogHoverVideo({...product,...change}),undefined);
    for(const change of [
        {publicationStatus:'pending'},{jobId:'invented'},{provider:'google_flow_web'},{model:'Omni'},
        {assetSha256:'0'.repeat(64)},{reviewSha256:'0'.repeat(64)},
        ...['productIdentity','scale','motion','branding','providerMarkPreserved'].map(k=>({checks:{...review.checks,[k]:false}})),
    ]) assert.equal(matchesReviewedLegacyVideo(product,{[folder]:{...review,...change}}),false);
});
