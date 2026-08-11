import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("showcase API client matches the public feed and authenticated mutation contract", () => {
    const api = read("../lib/daeng-showcase.ts");

    assert.match(api, /SHOWCASE_PRIVACY_NOTICE_VERSION = "ddb-showcase-public-v1"/);
    assert.match(api, /SHOWCASE_OFFICIAL_CHANNEL_CONSENT_VERSION = "ddb-showcase-official-channels-v1"/);
    assert.match(api, /SHOWCASE_MAX_UPLOAD_BYTES = 8 \* 1024 \* 1024/);
    assert.match(api, /\/api\/v1\/showcase\/posts\?\$\{query\.toString\(\)\}/);
    assert.match(api, /scope === "all"/);
    assert.match(api, /export async function loadShowcasePost/);
    assert.match(api, /\/api\/v1\/showcase\/posts\/\$\{encodeURIComponent\(postId\)\}/);
    assert.match(api, /export async function loadShowcaseAuthorProfile/);
    assert.match(api, /\/api\/v1\/showcase\/authors\/\$\{encodeURIComponent\(authorId\)\}/);
    assert.match(api, /form\.append\("file", input\.file\)/);
    assert.match(api, /form\.append\("caption", input\.caption\.trim\(\)\)/);
    assert.match(api, /form\.append\("display_name", input\.displayName\.trim\(\)\)/);
    assert.match(api, /form\.append\("public_display_consent", String\(input\.publicDisplayConsent\)\)/);
    assert.match(api, /form\.append\("privacy_notice_version", SHOWCASE_PRIVACY_NOTICE_VERSION\)/);
    assert.match(api, /form\.append\("pet_profile_id", String\(input\.petProfileId\)\)/);
    assert.match(api, /"official_channel_opt_in"/);
    assert.match(api, /\/authors\/\$\{encodeURIComponent\(authorId\)\}\/follow/);
    assert.match(api, /\/posts\/\$\{encodeURIComponent\(postId\)\}\/bone/);
    assert.match(api, /\/posts\/\$\{encodeURIComponent\(postId\)\}\/reports/);
    assert.match(api, /method: "DELETE"/);
    assert.doesNotMatch(api, /localStorage\.setItem|sessionStorage/);
});

test("live showcase supports public read, member posting, feed scopes, cursor paging, and deep links", () => {
    const client = read("../components/daeng-showcase/DaengShowcaseClient.tsx");

    assert.match(client, /import \{ useAuth \} from "@\/lib\/store"/);
    assert.match(client, /clean\.includes\("@"\)/);
    assert.match(client, /clean\.includes\(":\/\/"\)/);
    assert.match(client, /SHOWCASE_LOGIN_HREF = "\/auth\/login\?redirect=%2Fdaeng-showcase%2F"/);
    assert.match(client, /SHOWCASE_SIGNUP_HREF = "\/auth\/signup\?redirect=%2Fdaeng-showcase%2F"/);
    assert.match(client, /누구나 보고, 회원이면 바로 올리는/);
    assert.match(client, /공개 피드는 로그인 없이 볼 수 있고/);
    assert.match(client, /loadShowcaseFeed\(scope/);
    assert.match(client, /loadShowcasePost\(requestedPostId/);
    assert.match(client, /new URLSearchParams\(window\.location\.search\)\.get\("post"\)/);
    assert.match(client, /document\.getElementById\(`post-\$\{linkedPost\.postId\}`\)/);
    assert.match(client, /SHOWCASE_AUTHOR_ID_PATTERN/);
    assert.match(client, /new URLSearchParams\(window\.location\.search\)\.get\("author"\)/);
    assert.match(client, /<ShowcaseAuthorProfileModal/);
    assert.match(client, /chooseScope\("following"\)/);
    assert.match(client, /cursor: nextCursor/);
    assert.match(client, /댕자랑 더 보기/);
    assert.match(client, /sm:grid-cols-2 xl:grid-cols-3/);
    assert.match(client, /FeedSkeleton/);
    assert.match(client, /다시 불러오기/);
    assert.match(client, /첫 번째 댕자랑의 주인공/);
    assert.doesNotMatch(client, /준비 중|댓글/);
});

test("composer requires public consent and keeps official-channel consent optional and unchecked", () => {
    const composer = read("../components/daeng-showcase/ShowcaseComposer.tsx");

    assert.match(composer, /const \[publicConsent, setPublicConsent\] = useState\(false\)/);
    assert.match(composer, /const \[officialOptIn, setOfficialOptIn\] = useState\(false\)/);
    assert.match(composer, /사진과 글의 공개 게시 동의/);
    assert.match(composer, /선택 · 기본 해제/);
    assert.match(composer, /선택하지 않아도 피드 게시에는 영향이 없습니다/);
    assert.match(composer, /type="file"/);
    assert.match(composer, /사진 1장/);
    assert.match(composer, /maxLength=\{500\}/);
    assert.match(composer, /petProfileId: petProfileId \? Number\(petProfileId\) : undefined/);
});

test("showcase cards provide real follow, bone, report, own-delete, and highlighted deep-link targets", () => {
    const card = read("../components/daeng-showcase/ShowcaseCard.tsx");

    assert.match(card, /id=\{`post-\$\{post\.postId\}`\}/);
    assert.match(card, /setShowcaseFollow/);
    assert.match(card, /setShowcaseBone/);
    assert.match(card, /reportShowcasePost/);
    assert.match(card, /deleteShowcasePost/);
    assert.match(card, /onOpenAuthor\(post\.author\.authorId\)/);
    assert.match(card, /프로필 보기/);
    assert.match(card, /aria-pressed=\{post\.author\.followedByMe\}/);
    assert.match(card, /aria-pressed=\{post\.bonedByMe\}/);
    assert.match(card, /role="dialog"/);
    assert.match(card, /post\.canDelete/);
    assert.match(card, /신고는 운영자 확인용/);
    assert.doesNotMatch(card, /댓글/);
});

test("showcase author profile exposes only public counts and recent public posts", () => {
    const profile = read("../components/daeng-showcase/ShowcaseAuthorProfileModal.tsx");

    assert.match(profile, /loadShowcaseAuthorProfile/);
    assert.match(profile, /게시물/);
    assert.match(profile, /팔로워/);
    assert.match(profile, /받은 응원/);
    assert.match(profile, /공개 게시물만 표시/);
    assert.match(profile, /setShowcaseFollow/);
    assert.match(profile, /role="dialog"/);
    assert.doesNotMatch(profile, /email|이메일|주소|전화/);
});
