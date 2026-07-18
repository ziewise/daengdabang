import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("footer opts specific emails out of Cloudflare DOM rewriting", async () => {
    const [footer, safeEmail] = await Promise.all([
        source("components/footer/Footer.tsx"),
        source("components/footer/CloudflareSafeEmail.tsx"),
    ]);

    assert.match(footer, /CloudflareSafeEmail/);
    assert.match(footer, /email=\{BUSINESS_INFO\.customerServiceEmail\}/);
    assert.match(footer, /email=\{BUSINESS_INFO\.partnerEmail\}/);
    assert.match(safeEmail, /<!--email_off-->/);
    assert.match(safeEmail, /<!--\/email_off-->/);
    assert.match(safeEmail, /escapeHtml\(email\)/);
    assert.match(safeEmail, /replaceAll\("&", "&amp;"\)/);
    assert.doesNotMatch(footer, /<br\s*\/>\{BUSINESS_INFO\.customerServiceEmail\}/);
});

test("public contact and legal routes use the same protected email rendering", async () => {
    const files = [
        "app/legal/page.tsx",
        "app/legal/business/page.tsx",
        "app/privacy/page.tsx",
    ];
    const contents = await Promise.all(files.map(source));

    for (const [index, content] of contents.entries()) {
        assert.match(content, /CloudflareSafeEmail/, files[index]);
        assert.doesNotMatch(content, /\$\{BUSINESS_INFO\.(?:customerServiceEmail|partnerEmail)\}/, files[index]);
    }

    const [inquiry, inquiryPanel, customerApi] = await Promise.all([
        source("app/inquiry/page.tsx"),
        source("components/contact/CustomerInquiryPanel.tsx"),
        source("lib/customer-api.ts"),
    ]);
    assert.match(inquiry, /<CustomerInquiryPanel email=\{CS_EMAIL\} phone=\{CS_PHONE\}/);
    assert.match(inquiryPanel, /CloudflareSafeEmail/);
    assert.match(inquiryPanel, /submitCustomerSupportInquiry/);
    assert.doesNotMatch(inquiryPanel, /window\.location\.href\s*=\s*`mailto:/);
    assert.match(customerApi, /"\/api\/v1\/customer-support\/inquiries"/);
});

test("hydrated number formatting always uses an explicit locale", async () => {
    const files = [
        "components/products/detail/ProductInfo.tsx",
        "components/products/detail/ProductTabs.tsx",
        "components/mypage/MypageHello.tsx",
        "components/main/ReviewSection.tsx",
        "app/products/ProductsClient.tsx",
    ];
    const contents = await Promise.all(files.map(source));

    for (const [index, content] of contents.entries()) {
        assert.doesNotMatch(content, /\.toLocaleString\(\s*\)/, files[index]);
    }
});

test("auth API readiness waits for a hydration-safe browser snapshot", async () => {
    const [hook, login, signup, social] = await Promise.all([
        source("hooks/useDdbApiReady.ts"),
        source("app/auth/login/page.tsx"),
        source("app/auth/signup/page.tsx"),
        source("components/auth/SocialAuthButtons.tsx"),
    ]);

    assert.match(hook, /useSyncExternalStore/);
    assert.match(hook, /getServerSnapshot = \(\) => null/);
    assert.match(hook, /getClientSnapshot = \(\) => ddbApiReady\(\)/);
    assert.match(login, /const apiReady = useDdbApiReady\(\)/);
    assert.match(login, /apiReady === false/);
    assert.doesNotMatch(login, /\{!ddbApiReady\(\)/);
    assert.match(login, /const redirect = useSyncExternalStore\(/);
    assert.doesNotMatch(login, /setRedirect/);
    assert.match(signup, /const apiReady = useDdbApiReady\(\)/);
    assert.match(signup, /apiReady === false/);
    assert.doesNotMatch(signup, /\{!ddbApiReady\(\)/);
    assert.match(social, /const apiReady = useDdbApiReady\(\)/);
    assert.doesNotMatch(social, /Boolean\(ddbApiBase\(\)\)/);
});
