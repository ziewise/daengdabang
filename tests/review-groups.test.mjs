import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aggregateReviews, exactReviewRows, reviewSellerLabel, hasReviewBody, reviewedSummary, visibleProductGroups } from '../lib/catalog/review-groups.ts';

const url = 'https://smartstore.naver.com/daengdabang/products/123';
const other = 'https://smartstore.naver.com/daengdabang/products/456';
test('review identity requires the exact original product URL, not a listing family or seller name',()=>{
    const rows=[{folder:'old',externalReviewUrl:url},{folder:'new'},{folder:'other_model',externalReviewUrl:other}, {folder:'copy',externalReviewUrl:url+'?ref=copy'}];
    assert.deepEqual(exactReviewRows(rows[0],rows),[rows[0],rows[3]]);
    assert.deepEqual(exactReviewRows(rows[1],rows),[]);
    assert.match(reviewSellerLabel(url),/내츄럴랩스/);
    assert.doesNotMatch(reviewSellerLabel('https://smartstore.naver.com/daengdabangmall/products/123'),/내츄럴랩스/);
});
test('review aggregation deduplicates a source URL, retains distinct sources and never mutates originals', () => {
    const rows = [{ folder:'a', externalReviewUrl:url, externalReviewCount:10, externalReviewAverage:4, externalReviewSnippets:[{rating:'4',text:'좋아요'}]},
        { folder:'b', externalReviewUrl:url+'?ref=old', externalReviewCount:12, externalReviewAverage:4.5, externalReviewSnippets:[{rating:'4',text:'좋아요'},{rating:'2',text:'불편해요'}]},
        { folder:'c', externalReviewUrl:other, externalReviewCount:3, externalReviewAverage:5, externalReviewSnippets:[{rating:'4',text:'좋아요'}]}];
    const original = structuredClone(rows);
    const result = aggregateReviews(rows);
    assert.equal(result.count,15);
    assert.equal(result.average,4.6);
    assert.equal(result.snippets.length,3);
    assert.equal(result.ratedSampleCount,3);
    assert.equal(result.positivePercent,67);
    assert.deepEqual(result.snippets.map(s=>s.sourceUrl),[url,url,other]);
    assert.deepEqual(rows,original);
});
test('missing/invalid ratings cannot silently become positive reviews',()=>{
    const r=aggregateReviews([{externalReviewSnippets:[{text:'후기',rating:'NaN'},{text:'다른 후기',rating:'6'},{text:'만족',rating:'5점'}]}]);
    assert.equal(r.average,null);assert.equal(r.positivePercent,null);assert.equal(r.ratedSampleCount,0);
    assert.equal(hasReviewBody({text:'sabl******26.05.19.'}),false);
    assert.equal(hasReviewBody({text:'강아지가 잘 먹어요'}),true);
});
test('published summaries stay bound to the exact source excerpts',()=>{
    const snippets=[{text:'좋아요',rating:'5',sourceUrl:url},{text:'튼튼해요',rating:'4',sourceUrl:url},{text:'아쉬워요',rating:'2',sourceUrl:url}];
    const summary={headline:'평가',body:'평가',tags:[],sourceKeys:snippets.map(s=>`${s.sourceUrl}\n${s.rating}\n${s.text}`).sort()};
    assert.equal(reviewedSummary(summary,snippets),summary);
    assert.equal(reviewedSummary(summary,[...snippets,{text:'새 불만'}]),undefined);
    assert.equal(reviewedSummary(summary,snippets.map(s=>({...s,rating:'5'}))),undefined);
});
test('source records, option inventory, routes and reviews survive listing grouping',()=>{
    const raw=JSON.parse(readFileSync(new URL('../lib/catalog/raw.json',import.meta.url),'utf8'));
    const groups=JSON.parse(readFileSync(new URL('../lib/catalog/product-groups.json',import.meta.url),'utf8'));
    const before=JSON.stringify(raw);
    const listing=visibleProductGroups(raw.filter(r=>!r.supplierCatalogHistorical),groups);
    const seen=new Set();
    for(const g of groups){
        assert.ok(listing.some(r=>r.folder===g.canonical),g.key);
        for(const f of g.members){assert.ok(raw.some(r=>r.folder===f));assert.ok(!seen.has(f),f);seen.add(f);}
        assert.equal(listing.filter(r=>g.members.includes(r.folder)).length,1,g.key);
    }
    assert.equal(JSON.stringify(raw),before);
    assert.equal(raw.length,476);
});
test('missing representatives never hide remaining options',()=>{
    const rows=[{folder:'old'}];
    assert.deepEqual(visibleProductGroups(rows,[{key:'x',canonical:'missing',members:['old','missing']}]),rows);
});
