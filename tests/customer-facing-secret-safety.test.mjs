import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readSource(path) {
    return readFile(new URL(path, root), "utf8");
}

async function productionCopySources(directory) {
    const entries = await readdir(new URL(directory, root), { withFileTypes: true });
    const paths = [];
    for (const entry of entries) {
        const path = `${directory}${entry.name}`;
        if (entry.isDirectory()) {
            paths.push(...await productionCopySources(`${path}/`));
        } else if (/\.(?:ts|tsx|js|jsx|json)$/.test(entry.name)) {
            paths.push(path);
        }
    }
    return paths;
}

function assertNoCustomerLeak(source, label) {
    const blocked = [
        /API 연결 필요/,
        /운영 API/,
        /OAuth 설정/,
        /기준 문서/,
        /PetLens API/,
        /DaengDaBang API/,
        /Gemini/,
        /OpenAI/,
        /interpreter_model/,
        /Photo stored/,
        /Caution:/,
        /해석 엔진/,
        /AI SMART SET/,
        /AI 후보/,
        /AI 예상/,
        /AI 사진 후보/,
        /임시 모드/,
        /데모 계정/,
        /demo@daengdabang\.com/,
        /테스트 인증번호/,
        /데모 결제/,
        /백엔드 연동/,
        /서버 계정 연동/,
        /제공사 설정 대기/,
        /market-intelligence-rpa/,
    ];
    for (const pattern of blocked) {
        assert.doesNotMatch(source, pattern, `${label} leaked ${pattern}`);
    }
}

test("public image manifests do not expose local paths or generation internals", async () => {
    const [heroManifest, companionManifest] = await Promise.all([
        readSource("public/images/hero/manifest.json"),
        readSource("public/images/pet-companion/cute-v4-breeds/manifest.json"),
    ]);

    assertNoCustomerLeak(heroManifest, "hero manifest");
    assertNoCustomerLeak(companionManifest, "pet companion manifest");

    for (const source of [heroManifest, companionManifest]) {
        assert.doesNotMatch(source, /[A-Z]:\\/);
        assert.doesNotMatch(source, /ChatGPT Image/);
        assert.doesNotMatch(source, /sourceRoot/);
        assert.doesNotMatch(source, /targetRoot/);
        assert.doesNotMatch(source, /sourceRig/);
        assert.doesNotMatch(source, /sha256/i);
        assert.doesNotMatch(source, /Bytes/);
    }
});

test("customer-facing auth and PetLens surfaces hide technical setup details", async () => {
    const paths = [
        "app/auth/signup/page.tsx",
        "app/auth/login/page.tsx",
        "app/pet-lens/PetLensClient.tsx",
        "components/auth/SocialAuthButtons.tsx",
        "components/auth/LoginModal.tsx",
        "components/bundles/BundleCard.tsx",
        "components/mypage/MemberPetProfileEditor.tsx",
        "components/mypage/PasswordChangeModal.tsx",
        "components/pet-companion/PetCompanionLayer.tsx",
        "components/petlens/PetLensModalContent.tsx",
        "lib/customer-api.ts",
        "lib/daengdabang-llm.ts",
        "lib/external-products/feed.json",
        "lib/pet-companion-guide.ts",
        "lib/signup-agreements.ts",
    ];
    const sources = await Promise.all(paths.map(async (path) => [path, await readSource(path)]));

    for (const [path, source] of sources) {
        assertNoCustomerLeak(source, path);
    }
});

test("customer-facing storefront copy uses plain feature names instead of AI labels", async () => {
    const paths = (await Promise.all([
        productionCopySources("app/"),
        productionCopySources("components/"),
        productionCopySources("lib/"),
    ])).flat();

    for (const path of paths) {
        const source = await readSource(path);
        const customerFeatureCopy = path === "app/privacy/page.tsx"
            ? source.replaceAll("AI 분석 및 자동화된 결정", "")
            : source;
        assert.doesNotMatch(customerFeatureCopy, /\bAI\b|인공지능|에이아이/, `${path} exposes an artificial feature label`);
    }
});

test("customer chat progress uses active plain-language steps", async () => {
    const paths = [
        "components/site/ChatThinkingProgress.tsx",
        "components/site/ChatWidget.tsx",
        "app/chat/ChatPageClient.tsx",
    ];
    const sources = await Promise.all(paths.map(async (path) => [path, await readSource(path)]));

    for (const [path, source] of sources) {
        const customerCopySource = source.replaceAll("@/lib/daengdabang-llm", "");
        assert.doesNotMatch(
            customerCopySource,
            /\b(?:llama|openai|gemini|llm|rag|model|token|backend|provider|router|pipeline|fallback)\b/i,
            `${path} exposes an internal chat term`,
        );
    }

    const progress = await readSource("components/site/ChatThinkingProgress.tsx");
    assert.match(progress, /답변을 준비하고 있어요/);
    assert.match(progress, /초째/);
    assert.match(progress, /조금 더 걸리고 있지만 멈추지 않았어요/);

    const widget = await readSource("components/site/ChatWidget.tsx");
    const page = await readSource("app/chat/ChatPageClient.tsx");
    assert.match(widget, /앞 대화와 연결한 답변/);
    assert.match(page, /앞 대화와 연결한 답변/);
});

test("chat respects an intentional empty product result", async () => {
    const source = await readSource("lib/daengdabang-llm.ts");

    assert.match(source, /const apiReturnedProducts = Array\.isArray\(data\.products\)/);
    assert.match(source, /products: apiReturnedProducts \? unique\(apiProducts\)\.slice\(0, 6\) : fallback\.products/);
    assert.doesNotMatch(source, /apiProducts\.length \? unique\(apiProducts\)/);
});
