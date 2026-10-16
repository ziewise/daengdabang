/**
 * 댕자랑 실제 피드 — 스티커북 시안 전용 (로컬 시안 · 배포 X)
 * ---------------------------------------------------------------------
 * 협업자 lib/daeng-showcase 함수를 그대로 부르고(같은 주소 · 같은 응답 · 같은 로그인 토큰),
 * 서버 게시물(ShowcasePost)을 시안 폴라로이드 벽(Post) 모양으로만 바꾼다. (배포 전 연결 2026-10-16)
 *  - 피드: loadShowcaseFeed(전체 = 로그인 없이 · 팔로잉 = 로그인)
 *  - 작성자 프로필: loadShowcaseAuthorProfile
 */

import { loadShowcaseAuthorProfile, loadShowcaseFeed, type ShowcaseFeedScope, type ShowcasePost } from "@/lib/daeng-showcase";
import type { Post } from "./page-data";

/** 작성 시각 — 협업자 댕자랑 카드(ShowcaseCard)와 같은 표기 */
function formatCreatedAt(value: string) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "방금 전";
    return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

/** 서버 게시물 → 시안 폴라로이드(Post) */
export function toPost(p: ShowcasePost): Post {
    return {
        id: p.postId,
        authorId: p.author.authorId,
        author: p.author.displayName,
        official: p.author.displayName.includes("공식"), // 운영팀 공식 계정 표시
        followers: p.author.followerCount,
        date: formatCreatedAt(p.createdAt),
        pet: p.pet?.name || undefined,
        breed: p.pet?.breed || undefined,
        img: p.imageUrl,
        text: p.caption,
        bones: p.boneCount,
        followed: p.author.followedByMe,
        mine: p.author.isMe,
        topic: Boolean(p.topic),
        boned: p.bonedByMe,
        canDelete: p.canDelete,
    };
}

/** 피드 한 쪽(limit 개, 서버 최대 30) — next 가 있으면 다음 쪽이 더 있음 */
export async function loadLiveFeed(scope: ShowcaseFeedScope, cursor: string | undefined, token: string, signal?: AbortSignal, limit = 12): Promise<{ posts: Post[]; next?: string }> {
    const feed = await loadShowcaseFeed(scope, { cursor, limit, token: token || undefined, signal });
    return { posts: feed.items.map(toPost), next: feed.nextCursor };
}

/** 작성자 프로필 속지 — 게시물 수 · 팔로워 · 받은 응원 · 최근 12장 */
export type ProfileView = { authorId: string; name: string; official: boolean; followers: number; followed: boolean; isMe: boolean; postCount: number; received: number; posts: Post[] };
export async function loadProfile(authorId: string, token: string, signal?: AbortSignal): Promise<ProfileView> {
    const p = await loadShowcaseAuthorProfile(authorId, { token: token || undefined, signal, limit: 12 });
    return {
        authorId: p.author.authorId,
        name: p.author.displayName,
        official: p.author.displayName.includes("공식"),
        followers: p.author.followerCount,
        followed: p.author.followedByMe,
        isMe: p.author.isMe,
        postCount: p.postCount,
        received: p.receivedBoneCount,
        posts: p.posts.map(toPost),
    };
}
