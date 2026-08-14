"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RecommendationItem, RecommendationMode } from "@/lib/recommendation";
import { RECOMMENDATION_FEATURE_FLAGS } from "@/lib/recommendation";
import {
    createRecommendationRunId,
    trackStorefrontEvent,
} from "@/lib/storefront-analytics";

type RecommendationAnalyticsSurface = "home" | "recommendations" | "petlens_followup";

function recommendationSourceSet(items: RecommendationItem[]): "profile" | "profile+petlens" | "editorial" {
    if (items.some((item) => item.sourceGroups.includes("petlens"))) return "profile+petlens";
    if (items.some((item) => item.sourceGroups.includes("profile"))) return "profile";
    return "editorial";
}

export function useRecommendationAnalytics({
    enabled = RECOMMENDATION_FEATURE_FLAGS.analytics,
    surface,
    mode,
    items,
    ready = true,
}: {
    enabled?: boolean;
    surface: RecommendationAnalyticsSurface;
    mode: RecommendationMode;
    items: RecommendationItem[];
    ready?: boolean;
}) {
    const trackingEnabled = RECOMMENDATION_FEATURE_FLAGS.analytics && enabled;
    const productIds = items.map((item) => item.product.id).join("|");
    const signature = `${surface}:${mode}:${productIds}`;
    const runId = useMemo(() => {
        if (!signature) return "";
        return createRecommendationRunId();
    }, [signature]);
    const sourceSet = recommendationSourceSet(items);
    const [hiddenState, setHiddenState] = useState<{ signature: string; productIds: Set<string> }>(() => ({
        signature,
        productIds: new Set(),
    }));
    const hiddenProductIds = hiddenState.signature === signature ? hiddenState.productIds : new Set<string>();

    useEffect(() => {
        if (!trackingEnabled || !ready || items.length === 0 || typeof document === "undefined") return;
        const target = document.querySelector(`[data-recommendation-run="${runId}"]`);
        if (!target) return;
        let sent = false;
        const sendImpression = () => {
            if (sent) return;
            sent = true;
            trackStorefrontEvent("recommendation_impression", {
                engineVersion: "recommendation-v1",
                surface,
                mode,
                runId,
                resultCount: items.length,
                sourceSet,
            });
        };
        if (typeof IntersectionObserver === "undefined") {
            sendImpression();
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                sendImpression();
                observer.disconnect();
            }
        }, { threshold: 0.15 });
        observer.observe(target);
        return () => observer.disconnect();
    }, [items.length, mode, ready, runId, sourceSet, surface, trackingEnabled]);

    useEffect(() => {
        if (!trackingEnabled || !ready || items.length !== 0) return;
        trackStorefrontEvent("recommendation_empty", {
            engineVersion: "recommendation-v1",
            surface,
            mode,
            runId,
            resultCount: 0,
            sourceSet,
            outcome: "empty",
        });
    }, [items.length, mode, ready, runId, sourceSet, surface, trackingEnabled]);

    const itemMetadata = useCallback((productId: string) => ({
        engineVersion: "recommendation-v1",
        surface,
        mode,
        runId,
        productId,
        rank: Math.max(1, items.findIndex((item) => item.product.id === productId) + 1),
        resultCount: items.length,
        sourceSet,
    }), [items, mode, runId, sourceSet, surface]);

    const trackProductClick = useCallback((productId: string) => {
        if (!trackingEnabled) return;
        trackStorefrontEvent("recommendation_clicked", itemMetadata(productId));
    }, [itemMetadata, trackingEnabled]);

    const trackReasonOpened = useCallback((productId: string) => {
        if (!trackingEnabled) return;
        trackStorefrontEvent("recommendation_reason_opened", itemMetadata(productId));
    }, [itemMetadata, trackingEnabled]);

    const hideProduct = useCallback((productId: string) => {
        setHiddenState((current) => ({
            signature,
            productIds: new Set(current.signature === signature ? current.productIds : []).add(productId),
        }));
        if (trackingEnabled) {
            trackStorefrontEvent("recommendation_hidden", {
                ...itemMetadata(productId),
                outcome: "hidden",
            });
        }
    }, [itemMetadata, signature, trackingEnabled]);

    const resetHidden = useCallback(() => setHiddenState({ signature, productIds: new Set() }), [signature]);
    const visibleItems = items.filter((item) => !hiddenProductIds.has(item.product.id));

    return {
        runId,
        trackingEnabled,
        visibleItems,
        hiddenCount: hiddenProductIds.size,
        trackProductClick,
        trackReasonOpened,
        hideProduct,
        resetHidden,
    };
}
