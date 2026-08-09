"use client";

import { useEffect, useState } from "react";
import GoodsContest from "@/components/growth/GoodsContest";
import {
    DEFAULT_GROWTH_HUB_CONTENT,
    loadPublishedGrowthContent,
} from "@/lib/growth-content";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import { useAuth } from "@/lib/store";

export default function GoodsContestLanding() {
    const { hydrated, user } = useAuth();
    const [content, setContent] = useState(DEFAULT_GROWTH_HUB_CONTENT.goods);
    const [contentReady, setContentReady] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        loadPublishedGrowthContent(controller.signal).then((published) => {
            if (controller.signal.aborted) return;
            if (published) setContent(published.content.goods);
            setContentReady(true);
        });
        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        trackStorefrontEvent("growth_hub_viewed", {
            surface: "goods_contest",
            audience: user ? "member" : "guest",
        });
    }, [hydrated, user]);

    return (
        <main className="w-full overflow-x-clip" data-growth-motion-scope>
            <GoodsContest content={content} contentReady={contentReady} />
        </main>
    );
}
