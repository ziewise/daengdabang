import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("member wallet reads server balances and converts points through an idempotent API", async () => {
    const [api, card, page] = await Promise.all([
        source("lib/customer-api.ts"),
        source("components/mypage/DaengLabWalletCard.tsx"),
        source("app/mypage/page.tsx"),
    ]);

    assert.match(api, /\/api\/v1\/daenglab\/wallet/);
    assert.match(api, /\/api\/v1\/daenglab\/wallet\/convert/);
    assert.match(api, /reward_points: rewardPoints, idempotency_key: idempotencyKey/);
    assert.match(api, /body\.detail\.code|detail\.code/);
    assert.match(card, /loadDaengLabWallet\(accessToken\)/);
    assert.match(card, /convertRewardPointsToDaengLabCoins\(points, key, accessToken\)/);
    assert.match(card, /wallet\?\.pointConversionUnit \?\? 1_000/);
    assert.match(card, /wallet\?\.coinConversionUnit \?\? 10/);
    assert.match(card, /전환한 댕랩코인은 적립금으로 되돌릴 수 없습니다/);
    assert.match(card, /최종 결제금액 확인 및 구매확정 뒤 지급/);
    assert.match(card, /data-daenglab-wallet/);
    assert.match(page, /DaengLabWalletCard accessToken=\{user\.apiAccessToken\}/);
    assert.doesNotMatch(card, /localStorage|sessionStorage/);
});

test("behavior and sound analysis shows, enforces, and refreshes the ten-coin cost", async () => {
    const [experience, observationApi] = await Promise.all([
        source("components/petlens/PetLensObservationExperience.tsx"),
        source("lib/petlens-observation.ts"),
    ]);

    assert.match(experience, /data-daenglab-analysis-wallet/);
    assert.match(experience, /댕랩 행동·소리 분석 1회 \{analysisCoinCost\}C/);
    assert.match(experience, /wallet\.daengLabCoins >= analysisCoinCost/);
    assert.match(experience, /walletLoading \|\| !hasEnoughCoins/);
    assert.match(experience, /\/mypage#daenglab-wallet/);
    assert.match(experience, /분석 실패·반려견 미검출 영상은 자동 환급/);
    assert.match(experience, /const requestId = requestIdRef\.current \|\| analysisRequestId\(\)/);
    assert.match(experience, /requestIdRef\.current = requestId/);
    assert.match(experience, /daenglab_coin_insufficient/);
    assert.match(observationApi, /form\.append\("request_id", request\.requestId\)/);
    assert.match(observationApi, /PetObservationRequestError/);
    assert.match(observationApi, /daenglab_coin_balance/);
    assert.match(observationApi, /daenglab_coin_refunded/);
});

test("the local demo checkout never mints a server wallet balance", async () => {
    const checkout = await source("app/checkout/page.tsx");
    assert.match(checkout, /결제 확인과 구매확정이 완료된 주문에만 적립됩니다/);
    assert.doesNotMatch(checkout, /purchase-rewards|creditPurchase|daenglab\/wallet/);
});
