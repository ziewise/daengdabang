import assert from 'node:assert/strict';import test from 'node:test';
import {contentsReviewFixture} from './fixtures/ziewcraft-contents-review-fixture.mjs';
import {fixtureHash} from './fixtures/ziewcraft-human-review-fixture.mjs';
import {matchesReviewedZiewcraftSingleVideo as valid,SINGLE_REVIEW_CHECKS} from '../lib/catalog/reviewed-ziewcraft-single-video.mjs';
import {matchesReviewedZiewcraftContentsVideo} from '../lib/catalog/reviewed-ziewcraft-contents-video.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {safeCatalogHoverVideo} from '../lib/pet-tryon-eligibility.ts';
import {applyReviewedHoverOverride} from '../lib/catalog/reviewed-hover-overrides.ts';
// Synthetic regression data, never provider evidence and never written to production registries.
function fixture(food=true){
 const f=contentsReviewFixture('legacy_service_attestation'),r=f.record,i=r.videoZiewcraftIdentity;
 i.kind='ziewcraft_human_review_single_4s.v1';i.playbackMode='once_hold_last_frame';i.source.sceneProductVerified=true;
 delete i.source.sceneContentsVerified;i.source.catalog.isFood=f.product.raw.isFood=food;
 i.humanReview.basisSha256=fixtureHash('synthetic original human reply');i.humanReview.checks=Object.fromEntries(SINGLE_REVIEW_CHECKS.map(k=>[k,true]));
 r.schema='ddb.ziewcraft-single-hover-4s.v1';r.sha256=i.segment.review_video.sha256;r.video=`/images/products/catalog/${r.folder}/videos/${r.sha256}/hover.mp4`;
 r.videoQuality=food?'approved_product_contents':'approved_dog_using';r.playbackMode='once_hold_last_frame';
 Object.assign(r.review,{actor:'ai',scope:'actual_human_approved_4_second_single_pass',finalVideoSha256:r.sha256,authorizationSha256:fixtureHash('synthetic owner instruction'),playbackReportSha256:fixtureHash('synthetic actual browser playback'),checks:{...i.humanReview.checks,fullDecode:true,branding:true}});
 sync(f);return f;
}
function sync(f){const r=f.record;Object.assign(f.product.raw,{video:r.video,videoQuality:r.videoQuality,videoPlaybackMode:r.playbackMode,videoReviewSha256:r.review.sha256,videoZiewcraftIdentity:structuredClone(r.videoZiewcraftIdentity)});f.product.video=r.video;}
test('unchanged human-approved first four seconds supports food and dog-use single-pass presentation',()=>{
 for(const food of [true,false]){const f=fixture(food);assert.equal(valid(f.product,f.records),true);assert.equal(matchesReviewedZiewcraftContentsVideo(f.product,f.records),false);}
});
test('dog-worn products cannot publish a first four seconds in place of the required four plus four',()=>{
 for(const subcategory of ['wear','harness','goggles','leash']){
  const f=fixture(false);f.product.subcategory=subcategory;
  assert.equal(valid(f.product,f.records),false,subcategory);
 }
 const f=fixture(false);f.record.videoQuality='approved_dog_wearing';sync(f);
 assert.equal(valid(f.product,f.records),false,'wearing quality remains blocked without a category hint');
 for(const subcategory of ['bed','toy','snack']){
  const f=fixture(subcategory==='snack');f.product.subcategory=subcategory;
  assert.equal(valid(f.product,f.records),true,subcategory);
 }
});
test('AI delegation does not substitute for the actual human source-video review',()=>{
 for(const mutate of [h=>h.actor='ai',h=>h.actor='service',h=>h.checks.fullClipWatched=false,h=>delete h.basisSha256,h=>h.jobId='f'.repeat(32),h=>h.videoSha256=fixtureHash('other')]){const f=fixture();mutate(f.record.videoZiewcraftIdentity.humanReview);sync(f);assert.equal(valid(f.product,f.records),false);}
});
test('no loop, re-edit, continuation, eight-second substitution or inactive publication is admitted',()=>{
 const changes=[f=>f.record.playbackMode='loop',f=>f.record.videoZiewcraftIdentity.playbackMode='loop',f=>f.record.sha256=fixtureHash('changed file'),f=>f.record.videoZiewcraftIdentity.pair={},f=>f.record.videoZiewcraftIdentity.segment.continuation_of_job_id='a'.repeat(32),f=>f.record.technical.durationSeconds=8,f=>f.record.technical.frameCount=192,f=>f.record.publicationStatus='staged'];
 for(const mutate of changes){const f=fixture();mutate(f);sync(f);assert.equal(valid(f.product,f.records),false);}
});
test('failed technical gates and stale or AI/server approvals remain blocked',()=>{
 const mutations=[i=>i.segment.validation.technical_gate_passed=false,i=>i.segment.validation.gates.residual_motion.status='failed',i=>delete i.segment.validation.gates.full_decode,i=>i.segment.currentDecision.status='rejected',i=>i.segment.receipt.status='rejected',i=>i.segment.receipt.review_actor={kind:'ai'},i=>i.segment.receipt.checks.full_segment_watched=false,i=>i.segment.receipt.bindings.pair_video={artifact_id:'a'.repeat(32),sha256:fixtureHash('pair')}];
 for(const mutate of mutations){const f=fixture();mutate(f.record.videoZiewcraftIdentity);sync(f);assert.equal(valid(f.product,f.records),false);}
});
test('current SKU source and delegated publication authority must bind independently',()=>{
 for(const mutate of [f=>f.product.raw.name='different SKU',f=>f.product.raw.gallery=['/images/other.jpg'],f=>delete f.record.review.authorizationSha256,f=>delete f.record.review.playbackReportSha256,f=>f.record.videoQuality='unreviewed',f=>f.record.review.actor='human']){const f=fixture();mutate(f);sync(f);assert.equal(valid(f.product,f.records),false);}
});

test('the three actual human-approved release files activate only their exact current SKU and bytes',()=>{
 const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
 const expected=read('./fixtures/ziewcraft-single-release-20260911.json'),records=read('../lib/catalog/reviewed-ziewcraft-single-videos.json'),raw=read('../lib/catalog/raw.json');
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const [folder,e] of Object.entries(expected)){
  const rows=raw.filter(r=>r.folder===folder);assert.equal(rows.length,1);
  const r=records[folder],effective=applyReviewedHoverOverride(rows[0]),product={id:`p_${effective.no}`,folder,raw:effective,video:effective.video};
  assert.equal(r.productId,e.productId);assert.equal(r.sha256,e.sha256);assert.equal(valid(product,records),true);
  assert.equal(safeCatalogHoverVideo(product),r.video);
  assert.equal(createHash('sha256').update(readFileSync(new URL(`../public${r.video}`,import.meta.url))).digest('hex'),e.sha256);
  assert.equal(safeCatalogHoverVideo({...product,video:`/images/products/catalog/${folder}/videos/hover.mp4`}),undefined);
  assert.equal(safeCatalogHoverVideo({...product,id:'p_1'}),undefined);
 }
});

test('HTTP supplier-page metadata is preserved without allowing HTTP media or credential URLs',()=>{
 const f=fixture(false);f.record.videoZiewcraftIdentity.source.catalog.sourceUrl=f.product.raw.sourceUrl='http://www.jskglobalbiz.co.kr/goods/goods_view.php?goodsNo=1000000943';sync(f);assert.equal(valid(f.product,f.records),true);
 for(const url of ['http://user:pass@example.com/product','javascript:alert(1)']){f.record.videoZiewcraftIdentity.source.catalog.sourceUrl=f.product.raw.sourceUrl=url;sync(f);assert.equal(valid(f.product,f.records),false);}
});
