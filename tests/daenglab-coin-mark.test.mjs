import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("DaengDaBang Research Lab coin uses one accessible crayon signature across customer surfaces", async () => {
    const [mark, styles, ...surfaces] = await Promise.all([
        source("components/petlens/DaengLabCoinMark.tsx"),
        source("app/globals.css"),
        source("components/products/detail/ProductInfo.tsx"),
        source("components/products/detail/OptionSheet.tsx"),
        source("app/cart/page.tsx"),
        source("components/mypage/DaengLabWalletCard.tsx"),
        source("components/petlens/PetLensObservationExperience.tsx"),
    ]);

    assert.match(mark, /role="img"/);
    assert.match(mark, /aria-label=\{accessibleLabel\}/);
    assert.match(mark, /댕다방 연구소 코인/);
    assert.doesNotMatch(mark, /댕랩|"DaengLab coin"/);
    assert.match(mark, /data-daenglab-coin-mark/);
    assert.match(styles, /\.ddb-daenglab-coin-brand--teal/);
    assert.match(styles, /\.ddb-daenglab-coin-brand--coral/);
    assert.match(styles, /\.ddb-daenglab-coin-disc/);
    for (const surface of surfaces) {
        assert.match(surface, /DaengLabCoinMark/);
    }
});

test("customer-facing research lab name replaces the legacy wordmark without renaming compatibility identifiers", async () => {
    const [title, launcher, memberGate, experience, result, wallet, privacy] = await Promise.all([
        source("components/petlens/DaengLabServiceTitle.tsx"),
        source("components/petlens/PetLensModalLauncher.tsx"),
        source("components/petlens/PetLensMemberGate.tsx"),
        source("components/petlens/PetLensObservationExperience.tsx"),
        source("components/petlens/PetLensObservationResult.tsx"),
        source("components/mypage/DaengLabWalletCard.tsx"),
        source("app/privacy/page.tsx"),
    ]);

    for (const surface of [title, launcher, memberGate, experience, result, wallet, privacy]) {
        assert.match(surface, /댕다방 연구소/);
        assert.doesNotMatch(surface, /댕랩/);
    }
    assert.match(title, /DaengDaBang Research Lab/);
    assert.doesNotMatch(title, /"DaengLab"/);
    assert.match(launcher, /Open DaengDaBang Research Lab Behavior and Sound Analysis/);
    assert.match(wallet, /data-daenglab-wallet/);
    assert.match(privacy, /daenglab-observation-privacy-20260724-v2/);
});

test("analysis refund copy uses the explicit refund amount and current wallet balance", async () => {
    const experience = await source("components/petlens/PetLensObservationExperience.tsx");

    assert.match(experience, /const resultRefundAmount = result\.daengLabCoinRefundAmount/);
    assert.match(experience, /const currentCoinBalance = wallet\?\.daengLabCoins \?\? result\.daengLabCoinBalance/);
    assert.match(experience, /\{resultRefundAmount\}C 전액 환급 완료/);
    assert.match(experience, /data-daenglab-refund-notice/);
    assert.doesNotMatch(experience, /\{resultCoinCost\}C를 자동으로 돌려드렸어요/);
});
