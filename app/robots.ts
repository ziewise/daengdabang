import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
    return {
        // Advisory only: API admission/authentication enforce request limits.
        rules: [
            { userAgent: "*", allow: "/", disallow: ["/api/", "/chat/", "/pet-lens/", "/petlens/", "/mypage/", "/my-pet/", "/auth/", "/outbound/"] },
            { userAgent: ["GPTBot", "OAI-SearchBot", "ClaudeBot", "Claude-SearchBot", "CCBot", "Google-Extended", "PerplexityBot", "ChatGPT-User", "Claude-User", "Perplexity-User"], disallow: "/" },
        ],
        sitemap: "https://www.daengdabang.com/sitemap.xml",
        host: "https://www.daengdabang.com",
    };
}
