import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReviewRefresh } from '../lib/catalog/review-refresh.ts';
import { acceptRemoteReviewRefresh } from '../lib/catalog/remote-review-refresh.ts';
const url='https://smartstore.naver.com/daengdabang/products/123';
const snippets=[{reviewId:'1',text:'가벼워요',rating:'5',sourceUrl:url},{reviewId:'2',text:'잘 맞아요',rating:'5',sourceUrl:url},{reviewId:'3',text:'조금 커요',rating:'3',sourceUrl:url}];
const source={collectedAt:'2026-09-18T14:41:21Z',count:17,average:4.94,snippets};
const summary={headline:'후기',body:'가볍다는 평가와 크다는 의견',tags:[],sourceKeys:snippets.map(s=>`${s.sourceUrl}\n${s.rating}\n${s.text}`).sort()};
test('refresh changes reviews without mutating original inventory/options/IDs',()=>{
 const row={no:1,options:['S','M'],stock:4,externalReviewUrl:url,externalReviewCount:8};
 const before=structuredClone(row); const updated=applyReviewRefresh(row,{[url]:source});
 assert.equal(updated.externalReviewCount,17); assert.equal(updated.stock,4); assert.deepEqual(row,before);
});
test('malformed or wrong source refresh retains the entire fallback',()=>{
 const row={externalReviewUrl:url};
 for(const bad of [{...source,count:-1},{...source,average:6},{...source,collectedAt:'invalid'},{...source,snippets:[{text:'a',sourceUrl:'https://example.com'}]}]) assert.equal(applyReviewRefresh(row,{[url]:bad}),row);
});

test('an older backend snapshot cannot replace a newer verified static source',()=>{
 const current=snippets.map(item=>({...item,collectedAt:'2026-09-19T01:00:00Z'}));
 const row={externalReviewUrl:url,externalReviewSnippets:current,externalReviewCount:20};
 assert.equal(applyReviewRefresh(row,{[url]:source}),row);
 assert.equal(acceptRemoteReviewRefresh('a',[{url,count:20,average:4.9}],current,{schema:'ddb.review-refresh.v1',groupKey:'a',sources:{[url]:source},summary}),undefined);
});
test('server summary and exact input must validate together',()=>{
 const oldSources=[{url,count:8,average:5}];
 const payload={schema:'ddb.review-refresh.v1',groupKey:'a',sources:{[url]:source},summary};
 assert.equal(acceptRemoteReviewRefresh('a',oldSources,[],payload).reviews.count,17);
 assert.equal(acceptRemoteReviewRefresh('b',oldSources,[],payload),undefined);
 assert.equal(acceptRemoteReviewRefresh('a',oldSources,[],{...payload,summary:{...summary,sourceKeys:[]}}),undefined);
 assert.equal(acceptRemoteReviewRefresh('a',oldSources,[],{...payload,sources:{'https://unknown.com':source}}),undefined);
});
