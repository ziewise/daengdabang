import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("DaengLab coin uses one accessible crayon signature across customer surfaces", async () => {
    const [mark, styles, ...surfaces] = await Promise.all([
        source("components/petlens/DaengLabCoinMark.tsx"),
        source("app/globals.css"),
        source("components/products/detail/ProductInfo.tsx"),
        source("components/products/detail/OptionSheet.tsx"),
        source("app/cart/page.tsx"),
        source("app/checkout/page.tsx"),
        source("components/mypage/DaengLabWalletCard.tsx"),
        source("components/petlens/PetLensObservationExperience.tsx"),
    ]);

    assert.match(mark, /role="img"/);
    assert.match(mark, /aria-label=\{accessibleLabel\}/);
    assert.match(mark, /댕랩코인/);
    assert.match(mark, /data-daenglab-coin-mark/);
    assert.match(styles, /\.ddb-daenglab-coin-brand--teal/);
    assert.match(styles, /\.ddb-daenglab-coin-brand--coral/);
    assert.match(styles, /\.ddb-daenglab-coin-disc/);
    for (const surface of surfaces) {
        assert.match(surface, /DaengLabCoinMark/);
    }
});

test("analysis refund copy follows the charged coin cost instead of a hard-coded amount", async () => {
    const experience = await source("components/petlens/PetLensObservationExperience.tsx");

    assert.match(experience, /const resultCoinCost = result\.daengLabCoinCost \?\? wallet\?\.analysisCoinCost \?\? 10/);
    assert.match(experience, /\{resultCoinCost\}C를 자동으로 돌려드렸어요/);
    assert.doesNotMatch(experience, /영상이라 10C를 자동으로/);
});
