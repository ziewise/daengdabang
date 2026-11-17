// 상품 후기 탭(2026-11-17 사용자 "하나의 후기 탭에서 나눠지게" · "우리 디자인과 전혀 맞지 않잖아") — 화면 코드 확인
//  ① 탭은 "후기" 하나, 안에서 댕다방 구매 후기 | 네이버 스토어 후기 스위치로 나눔(별점은 섞지 않음)
//  ② 댕다방 후기가 0개고 네이버 후기가 있으면 손님이 고르기 전까지 네이버 쪽을 먼저
//  ③ 댕다방 구매 후기는 크레파스 디자인으로 바꿔도 협업자 동작(불러오기 · 정렬 · 사진만 · 도움돼요 · 신고 · 더 보기 · 후기 쓰기)은 그대로
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const tabs = await readFile(new URL("../components/products/detail/ProductTabs.tsx", import.meta.url), "utf8");
const reviews = await readFile(new URL("../components/reviews/PurchaseReviews.tsx", import.meta.url), "utf8");

test("review tab is a single tab with a 댕다방 | 네이버 source switch", () => {
    assert.match(tabs, /\{ key: "review", label: locale === "en" \? "Reviews" : "후기"/);
    assert.match(tabs, /data-review-switch=""/);
    assert.match(tabs, /onClick=\{\(\) => pickReviewView\("own"\)\}/);
    assert.match(tabs, /onClick=\{\(\) => pickReviewView\("external"\)\}/);
    // 두 쪽 다 늘 그려 두고 숨김만 바꿈(불러온 내용 · 다른 시즌 링크 유지)
    assert.match(tabs, /<PurchaseReviews productId=\{p\.id\} active=\{reviewsNear\} hidden=\{reviewView !== "own"\} onSummary=\{onOwnSummary\} \/>/);
    assert.match(tabs, /<div data-store-reviews="" hidden=\{reviewView !== "external"\}>/);
    // 탭 숫자는 두 출처 후기 수의 합
    assert.match(tabs, /const totalReviews = externalCount \+ \(ownCount \?\? 0\);/);
});

test("store reviews open first only when there are no 댕다방 reviews and the shopper has not picked", () => {
    assert.match(tabs, /if \(!viewTouched\.current && ownCount === 0 && hasStoreReviews\) setReviewView\("external"\);/);
    assert.match(tabs, /const pickReviewView = \(view: "own" \| "external"\) => \{ viewTouched\.current = true; setReviewView\(view\); \};/);
});

test("purchase reviews keep the collaborator's API calls and drop native select/checkbox", () => {
    assert.match(reviews, /\/api\/v1\/products\/\$\{encodeURIComponent\(productId\)\}\/reviews\?sort=\$\{sort\}\$\{photo \? "&type=photo" : ""\}&offset=\$\{offset\}/);
    assert.match(reviews, /\/api\/v1\/reviews\/\$\{review\.id\}\/helpful`, \{ method: "POST" \}/);
    assert.match(reviews, /\/api\/v1\/reviews\/\$\{review\.id\}\/report`, \{ method: "POST", body: JSON\.stringify\(\{ reason \}\) \}/);
    assert.match(reviews, /"\/api\/v1\/reviews\/reward-settings"/);
    assert.match(reviews, /href="\/mypage\/orders\/" className="rvb-write-btn"/);
    assert.match(reviews, /onClick=\{\(\) => void load\(result\.next_offset!\)\}/);
    // 정렬 값은 서버 그대로
    for (const key of ["latest", "helpful", "rating_high", "rating_low"]) assert.match(reviews, new RegExp(`key: "${key}"`));
    assert.doesNotMatch(reviews, /<select|type="checkbox"/);
    // 불러오기 전엔 "첫 후기" 빈 화면 대신 불러오는 중
    assert.match(reviews, /const loading = !summary && !error;/);
});
