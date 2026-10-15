/**
 * 댕자랑 실제 피드 읽기 — 스티커북 시안 전용 (로컬 시안 · 배포 X)
 * ---------------------------------------------------------------------
 * 운영 댕자랑 서버의 공개 피드(전체)를 로그인 없이 "읽기만" 해서 시안 폴라로이드 벽(Post)에 맞게 바꾼다.
 * 올리기 · 응원 · 팔로우 · 신고는 여기서 서버로 보내지 않는다(시안 화면 안에서만 시연).
 * 서버 주소: 환경 설정(ddbApiBase)이 있으면 그것, 없으면(로컬 개발) 운영 공개 API.
 * 실제 연결 때는 협업자 lib/daeng-showcase 의 loadShowcaseFeed 로 바꾸면 된다(같은 주소 · 같은 응답).
 */

import { ddbApiBase } from "@/lib/ddb-api-base";
import type { Post } from "./page-data";

const PUBLIC_API = "https://api.daengdabang.com";

// 서버 응답(댕자랑 게시물) 중 시안에서 쓰는 칸만
type ApiPost = {
    post_id: string;
    caption: string;
    image_url: string;
    author: { author_id: string; display_name: string; follower_count?: number; followed_by_me?: boolean; is_me?: boolean };
    pet?: { name?: string; breed?: string } | null;
    topic?: { topic_id?: string; title?: string } | null;
    bone_count?: number;
    created_at: string;
};

/** 작성 시각 — 협업자 댕자랑 카드(ShowcaseCard)와 같은 표기 */
function formatCreatedAt(value: string) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "방금 전";
    return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

/** 사진 주소 — 서버가 준 상대 주소를 서버 주소에 붙임(댕자랑 사진 경로만 허용) */
function imageUrl(origin: string, value: string, postId: string) {
    const fallback = `${origin}/api/v1/showcase/posts/${encodeURIComponent(postId)}/image`;
    try {
        const url = new URL(value || fallback, `${origin}/`);
        return url.origin === new URL(origin).origin && url.pathname.startsWith("/api/v1/showcase/posts/") ? url.toString() : fallback;
    } catch {
        return fallback;
    }
}

/** 서버 게시물 → 시안 폴라로이드(Post) */
function toPost(origin: string, p: ApiPost): Post {
    return {
        id: p.post_id,
        authorId: p.author.author_id,
        author: p.author.display_name,
        official: p.author.display_name.includes("공식"), // 운영팀 공식 계정 표시
        followers: Math.max(0, Number(p.author.follower_count) || 0),
        date: formatCreatedAt(p.created_at),
        pet: p.pet?.name || undefined,
        breed: p.pet?.breed || undefined,
        img: imageUrl(origin, p.image_url, p.post_id),
        text: p.caption,
        bones: Math.max(0, Number(p.bone_count) || 0),
        followed: Boolean(p.author.followed_by_me),
        mine: Boolean(p.author.is_me),
        topic: Boolean(p.topic?.topic_id && p.topic.title),
    };
}

/** 공개 피드 한 쪽(limit 개, 서버 최대 30) — next 가 있으면 다음 쪽이 더 있음 */
export async function loadLiveFeed(cursor?: string, signal?: AbortSignal, limit = 12): Promise<{ posts: Post[]; next?: string }> {
    const origin = (ddbApiBase() || PUBLIC_API).replace(/\/$/, "");
    const query = new URLSearchParams({ scope: "all", limit: String(Math.min(30, Math.max(1, limit))) });
    if (cursor) query.set("cursor", cursor);
    const res = await fetch(`${origin}/api/v1/showcase/posts?${query}`, { cache: "no-store", signal });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    const data = (await res.json()) as { items?: ApiPost[]; next_cursor?: string | null };
    return { posts: (data.items || []).map((p) => toPost(origin, p)), next: data.next_cursor || undefined };
}
