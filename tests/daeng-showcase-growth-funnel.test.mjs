import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

import {
    buildShowcaseDeepLink,
    buildShowcaseTopicShareLink,
    SHOWCASE_TOPIC_ID_PATTERN,
    showcaseAuthHref,
    showcaseMemberShareCampaign,
    showcaseReturnPath,
} from "../lib/daeng-showcase-share.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const POST_ID = `dsp_${"a".repeat(20)}`;
const TOPIC_ID = "dst_daily_walk_20260810";

function loadShowcaseApi(fetchImpl) {
    const compiled = ts.transpileModule(read("../lib/daeng-showcase.ts"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const moduleRecord = { exports: {} };
    vm.runInNewContext(compiled, {
        module: moduleRecord,
        exports: moduleRecord.exports,
        fetch: fetchImpl,
        Headers,
        URL,
        URLSearchParams,
        require(specifier) {
            if (specifier === "@/lib/ddb-api-base") return { ddbApiBase: () => "https://api.example.test" };
            if (specifier === "@/lib/customer-api") return { getCustomerToken: () => "" };
            if (specifier === "@/lib/daeng-showcase-share") {
                return { buildShowcaseTopicShareLink, SHOWCASE_TOPIC_ID_PATTERN };
            }
            throw new Error(`Unexpected runtime import: ${specifier}`);
        },
    });
    return moduleRecord.exports;
}

function topicPayload({ active, topicId = TOPIC_ID, featured = true }) {
    return {
        topic: {
            topic_id: topicId,
            title: active ? "오늘의 산책" : "지난 여름 산책",
            prompt: "우리 아이가 좋아한 산책 순간을 보여 주세요.",
            starts_at: active ? "2026-08-10T00:00:00+09:00" : "2026-07-01T00:00:00+09:00",
            ends_at: active ? "2026-08-11T00:00:00+09:00" : "2026-07-02T00:00:00+09:00",
            is_active: active,
            share_url: `https://www.daengdabang.com/daeng-showcase/?topic=${topicId}&redirect=https%3A%2F%2Fevil.example`,
            featured_post: featured ? {
                post_id: POST_ID,
                caption: "지난 주제의 대표 댕자랑",
                image_url: `https://api.example.test/api/v1/showcase/posts/${POST_ID}/image`,
                image_width: 1200,
                image_height: 1200,
                author: { author_id: "author_1", display_name: "댕친구" },
                topic: { topic_id: topicId, title: "지난 여름 산책" },
                conversion_receipt: "",
                created_at: "2026-07-01T12:00:00+09:00",
            } : null,
        },
    };
}

test("showcase links use the canonical origin and keep only exact safe routing attribution", () => {
    const link = new URL(buildShowcaseDeepLink({
        baseUrl: `https://attacker.example/private?post=${POST_ID}&topic=${TOPIC_ID}&email=hidden%40example.com&utm_source=member%20share&utm_medium=referral&utm_campaign=daeng%2Fshowcase&utm_content=post%20${POST_ID}`,
    }));

    assert.equal(link.origin, "https://www.daengdabang.com");
    assert.equal(link.pathname, "/daeng-showcase/");
    assert.equal(link.searchParams.get("post"), POST_ID);
    assert.equal(link.searchParams.get("topic"), TOPIC_ID);
    assert.equal(link.searchParams.get("utm_source"), "member_share");
    assert.equal(link.searchParams.get("utm_medium"), "referral");
    assert.equal(link.searchParams.get("utm_campaign"), "daeng_showcase");
    assert.equal(link.searchParams.get("utm_content"), `post_${POST_ID}`);
    assert.equal(link.searchParams.has("email"), false);
    assert.equal(link.searchParams.has("code"), false);

    const malformed = new URL(buildShowcaseDeepLink({
        baseUrl: "javascript:alert(1)",
        postId: "../../private",
        topicId: "오늘의 주제",
        campaign: showcaseMemberShareCampaign(`post_${POST_ID}`),
    }));
    assert.equal(malformed.origin, "https://www.daengdabang.com");
    assert.equal(malformed.searchParams.has("post"), false);
    assert.equal(malformed.searchParams.has("topic"), false);
    assert.equal(malformed.searchParams.get("utm_source"), "member_share");
});

test("API topic share links replace mismatched topics and discard untrusted query controls", () => {
    const mismatchedTopic = "dst_other_topic_20260810";
    const link = new URL(buildShowcaseTopicShareLink(
        `https://www.daengdabang.com/daeng-showcase/?post=${POST_ID}&topic=${mismatchedTopic}&redirect=https%3A%2F%2Fevil.example&next=%2Fadmin&utm_source=member%20share&utm_medium=referral&utm_campaign=daeng%2Fshowcase&utm_content=topic%20card`,
        TOPIC_ID,
    ));

    assert.equal(link.origin, "https://www.daengdabang.com");
    assert.equal(link.pathname, "/daeng-showcase/");
    assert.equal(link.searchParams.get("post"), POST_ID);
    assert.equal(link.searchParams.get("topic"), TOPIC_ID);
    assert.equal(link.searchParams.get("utm_source"), "member_share");
    assert.equal(link.searchParams.get("utm_medium"), "referral");
    assert.equal(link.searchParams.get("utm_campaign"), "daeng_showcase");
    assert.equal(link.searchParams.get("utm_content"), "topic_card");
    assert.equal(link.searchParams.has("redirect"), false);
    assert.equal(link.searchParams.has("next"), false);

    const invalidExpected = new URL(buildShowcaseTopicShareLink(
        `https://evil.example/private?topic=${TOPIC_ID}&redirect=https%3A%2F%2Fevil.example`,
        "daily-walk_20260810",
    ));
    assert.equal(invalidExpected.origin, "https://www.daengdabang.com");
    assert.equal(invalidExpected.pathname, "/daeng-showcase/");
    assert.equal(invalidExpected.searchParams.has("topic"), false);
    assert.equal(invalidExpected.searchParams.has("redirect"), false);

    assert.equal(SHOWCASE_TOPIC_ID_PATTERN.test(TOPIC_ID), true);
    assert.equal(SHOWCASE_TOPIC_ID_PATTERN.test("dst_too_short"), false);
    assert.equal(SHOWCASE_TOPIC_ID_PATTERN.test("daily-walk_20260810"), false);
});

test("login and signup return paths preserve the selected post, topic, and issued campaign", () => {
    const current = `http://localhost:3000/daeng-showcase/?post=${POST_ID}&topic=${TOPIC_ID}&utm_source=member_share&utm_medium=referral&utm_campaign=daeng_showcase&utm_content=topic_${TOPIC_ID}&oauth_code=secret`;
    const returnPath = showcaseReturnPath(current);

    assert.equal(returnPath, `/daeng-showcase/?post=${POST_ID}&topic=${TOPIC_ID}&utm_source=member_share&utm_medium=referral&utm_campaign=daeng_showcase&utm_content=topic_${TOPIC_ID}`);
    assert.equal(new URL(`https://example.test${showcaseAuthHref("login", current)}`).searchParams.get("redirect"), returnPath);
    assert.equal(new URL(`https://example.test${showcaseAuthHref("signup", current)}`).searchParams.get("redirect"), returnPath);
    assert.equal(showcaseReturnPath(current, { postId: "" }), `/daeng-showcase/?topic=${TOPIC_ID}&utm_source=member_share&utm_medium=referral&utm_campaign=daeng_showcase&utm_content=topic_${TOPIC_ID}`);
});

test("an exact expired topic link uses historical lookup and preserves its published featured post", async () => {
    const requests = [];
    const showcaseApi = loadShowcaseApi(async (url, init) => {
        requests.push({ url, init });
        const historical = url.endsWith(`/api/v1/showcase/topics/${TOPIC_ID}`);
        return {
            ok: true,
            status: 200,
            json: async () => topicPayload({ active: !historical, featured: historical }),
        };
    });

    const historical = await showcaseApi.loadShowcaseTopic({ topicId: TOPIC_ID });
    const current = await showcaseApi.loadShowcaseTopic();
    const invalidFallsBackToCurrent = await showcaseApi.loadShowcaseTopic({ topicId: "topic_not_strict" });

    assert.equal(requests[0].url, `https://api.example.test/api/v1/showcase/topics/${TOPIC_ID}`);
    assert.equal(historical.topicId, TOPIC_ID);
    assert.equal(historical.isActive, false);
    assert.equal(historical.featuredPost.postId, POST_ID);
    assert.equal(new URL(historical.shareUrl).searchParams.get("topic"), TOPIC_ID);
    assert.equal(new URL(historical.shareUrl).searchParams.has("redirect"), false);
    assert.equal(requests[1].url, "https://api.example.test/api/v1/showcase/topic");
    assert.equal(current.isActive, true);
    assert.equal(requests[2].url, "https://api.example.test/api/v1/showcase/topic");
    assert.equal(invalidFallsBackToCurrent.isActive, true);
});

test("showcase mutation receipts are strictly normalized and public posts drop them", async () => {
    const showcaseApi = loadShowcaseApi(async (url) => {
        if (url.endsWith("/follow")) {
            const invalidReceipt = url.includes("author_bad");
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    author_id: "author_1",
                    followed: true,
                    already_in_state: false,
                    follower_count: 1,
                    first_follow_by_member: !invalidReceipt,
                    conversion_receipt: invalidReceipt
                        ? 12345
                        : "  gcr1.follow_payload.follow_signature  ",
                }),
            };
        }
        if (url.endsWith("/bone")) {
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    post_id: POST_ID,
                    boned: true,
                    already_in_state: false,
                    bone_count: 1,
                    first_bone_by_member: true,
                    conversion_receipt: "  gcr1.bone_payload.bone_signature  ",
                }),
            };
        }
        return {
            ok: true,
            status: 200,
            json: async () => ({
                ...topicPayload({ active: true }).topic.featured_post,
                post_id: POST_ID,
                image_url: `https://api.example.test/api/v1/showcase/posts/${POST_ID}/image`,
                first_post_by_author: true,
                conversion_receipt: "  gcr1.post_payload.post_signature  ",
            }),
        };
    });

    const post = await showcaseApi.loadShowcasePost(POST_ID);
    const follow = await showcaseApi.setShowcaseFollow("author_1", true, "member-token");
    const invalidReceiptFollow = await showcaseApi.setShowcaseFollow("author_bad", true, "member-token");
    const bone = await showcaseApi.setShowcaseBone(POST_ID, true, "member-token");

    assert.equal(post.conversionReceipt, undefined, "public post models must not retain mutation receipts");
    assert.equal(follow.conversionReceipt, "gcr1.follow_payload.follow_signature");
    assert.equal(invalidReceiptFollow.conversionReceipt, "", "non-string showcase receipts must fail closed");
    assert.equal(bone.conversionReceipt, "gcr1.bone_payload.bone_signature");
});

test("today's topic, explicit sharing, and first conversion receipts stay wired to the API contract", () => {
    const api = read("../lib/daeng-showcase.ts");
    const client = read("../components/daeng-showcase/DaengShowcaseClient.tsx");
    const topicCard = read("../components/daeng-showcase/ShowcaseTopicCard.tsx");
    const shareModal = read("../components/daeng-showcase/ShowcaseShareModal.tsx");
    const composer = read("../components/daeng-showcase/ShowcaseComposer.tsx");
    const card = read("../components/daeng-showcase/ShowcaseCard.tsx");

    assert.match(api, /`\/api\/v1\/showcase\/topics\/\$\{encodeURIComponent\(topicId\)\}`/);
    assert.match(api, /: "\/api\/v1\/showcase\/topic"/);
    assert.match(api, /isActive: value\.is_active === true/);
    assert.match(api, /form\.append\("topic_id", input\.topicId\)/);
    assert.match(api, /first_post_by_author/);
    assert.match(api, /first_follow_by_member/);
    assert.match(api, /first_bone_by_member/);
    assert.equal((api.match(/conversionReceipt: normalizeConversionReceipt\([^)]*\.conversion_receipt\)/g) || []).length, 3);
    assert.match(api, /return buildShowcaseTopicShareLink\(value, topicId\)/);

    assert.match(client, /<ShowcaseTopicCard/);
    assert.match(client, /<ShowcaseShareModal target=\{shareTarget\} onClose=\{closeShare\} \/>/);
    assert.match(client, /showcaseAuthHref\("login", window\.location\.href\)/);
    assert.match(client, /topicId: requestedTopicId \|\| undefined/);
    assert.match(client, /if \(!topic\?\.isActive\) return/);
    assert.match(client, /topic=\{topic\?\.isActive \?/);
    assert.match(topicCard, /오늘의 댕주제/);
    assert.match(topicCard, /onViewFeatured/);
    assert.match(topicCard, /주제 참여 기간이 끝났어요/);
    assert.match(topicCard, /topic\.isActive \? \(/);
    assert.match(shareModal, /role="dialog"/);
    assert.match(shareModal, /navigator\.share/);
    assert.match(shareModal, /navigator\.clipboard/);
    assert.match(shareModal, /자동 게시나 외부 메시지 발송은 하지 않아요/);

    assert.match(composer, /topicId: joinTopic \? topic\?\.topicId : undefined/);
    assert.match(composer, /const \{ conversionReceipt, \.\.\.publishedPost \} = post/);
    assert.match(composer, /if \(publishedPost\.firstPostByAuthor && conversionReceipt\)/);
    assert.match(composer, /showcase_first_post_completed[\s\S]*conversionReceipt,/);
    assert.match(composer, /onCreated\(publishedPost\)/);
    assert.doesNotMatch(composer, /onCreated\(post\)/);
    assert.match(card, /receipt\.followed && receipt\.firstFollowByMember && receipt\.conversionReceipt/);
    assert.match(card, /showcase_follow_completed[\s\S]*conversionReceipt: receipt\.conversionReceipt/);
    assert.match(card, /receipt\.boned && receipt\.firstBoneByMember && receipt\.conversionReceipt/);
    assert.match(card, /showcase_bone_completed[\s\S]*conversionReceipt: receipt\.conversionReceipt/);
    assert.match(card, /onShare\(post\)/);
});

test("goods contest and showcase events record only successful first conversion receipts", () => {
    const analytics = read("../lib/storefront-analytics.ts");
    const goodsContest = read("../components/growth/GoodsContest.tsx");
    const page = read("../app/daeng-showcase/page.tsx");

    for (const eventName of [
        "showcase_first_post_completed",
        "showcase_follow_completed",
        "showcase_bone_completed",
        "goods_contest_selection_completed",
    ]) {
        assert.match(analytics, new RegExp(`\\| "${eventName}"`));
    }
    assert.match(goodsContest, /!wasSelected[\s\S]*"conversionReceipt" in nextItem[\s\S]*nextItem\.firstSelectionByIdentity === true[\s\S]*nextItem\.conversionReceipt/);
    assert.match(goodsContest, /goods_contest_selection_completed[\s\S]*conversionReceipt: nextItem\.conversionReceipt/);
    assert.match(goodsContest, /!selectedSummary\.alreadySelected\s*&& selectedSummary\.firstSelectionByIdentity === true\s*&& selectedSummary\.conversionReceipt/);
    assert.match(goodsContest, /goods_contest_selection_completed[\s\S]*conversionReceipt: selectedSummary\.conversionReceipt/);
    assert.equal((goodsContest.match(/firstSelectionByIdentity === true/g) || []).length, 2);
    assert.equal((goodsContest.match(/trackStorefrontEvent\("goods_contest_selection_completed"/g) || []).length, 2);
    assert.match(goodsContest, /const replacement: GoodsContestItemSummary = \{[\s\S]*productionEligible: nextItem\.productionEligible,[\s\S]*\}/);
    assert.match(goodsContest, /items: current\.items\.map\(\(item\) => item\.itemId === replacement\.itemId \? replacement : item\)/);
    assert.match(page, /card: "summary_large_image"/);
    assert.match(page, /og-ai-platform-20260804-1200x630\.png/);
});
