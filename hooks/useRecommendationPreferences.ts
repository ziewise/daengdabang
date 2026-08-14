"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    DdbApiError,
    loadRecommendationPreferences,
    updateRecommendationPreferences,
    type RecommendationPreferences,
} from "@/lib/customer-api";
import { RECOMMENDATION_FEATURE_FLAGS } from "@/lib/recommendation";
import { useAuth } from "@/lib/store";

export type RecommendationPreferenceStatus = "idle" | "loading" | "ready" | "saving" | "error";

function preferenceErrorMessage(error: unknown): string {
    if (error instanceof DdbApiError) {
        if (error.code === "missing_api_base") {
            return "추천 설정 서버에 연결할 수 없어 개인화 추천을 잠시 표시하지 않아요.";
        }
        if (error.status === 401) {
            return "로그인 시간이 지나 추천 설정을 확인하지 못했어요. 다시 로그인해 주세요.";
        }
        if (error.apiCode === "recommendation_consent_version_mismatch") {
            return "추천 동의 기준이 갱신됐어요. 페이지를 새로고침한 뒤 다시 확인해 주세요.";
        }
    }
    return "추천 설정을 확인하지 못해 개인화 추천을 잠시 표시하지 않아요.";
}

export function useRecommendationPreferences({
    enabled = RECOMMENDATION_FEATURE_FLAGS.preferences,
}: {
    enabled?: boolean;
} = {}) {
    const { hydrated, user } = useAuth();
    const [preferences, setPreferences] = useState<RecommendationPreferences | null>(null);
    const [preferenceOwner, setPreferenceOwner] = useState("");
    const [status, setStatus] = useState<RecommendationPreferenceStatus>("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const requestSequence = useRef(0);
    const userIdentity = user ? String(user.apiUserId ?? user.email) : "";
    const accessToken = user?.apiAccessToken;
    const visiblePreferences = enabled && preferenceOwner === userIdentity ? preferences : null;
    const visibleStatus: RecommendationPreferenceStatus = !enabled || !hydrated || !userIdentity
        ? "idle"
        : preferenceOwner === userIdentity
            ? status
            : "loading";
    const visibleErrorMessage = preferenceOwner === userIdentity ? errorMessage : "";

    const requestPreferences = useCallback(async () => {
        if (!enabled || !userIdentity) return null;
        const sequence = ++requestSequence.current;
        try {
            const loaded = await loadRecommendationPreferences(accessToken);
            if (sequence !== requestSequence.current) return null;
            setPreferenceOwner(userIdentity);
            setPreferences(loaded);
            setStatus("ready");
            return loaded;
        } catch (error) {
            if (sequence !== requestSequence.current) return null;
            setPreferenceOwner(userIdentity);
            setPreferences(null);
            setErrorMessage(preferenceErrorMessage(error));
            setStatus("error");
            return null;
        }
    }, [accessToken, enabled, userIdentity]);

    const refresh = useCallback(async () => {
        if (!enabled) return null;
        setStatus("loading");
        setErrorMessage("");
        return requestPreferences();
    }, [enabled, requestPreferences]);

    useEffect(() => {
        if (!enabled || !hydrated || !userIdentity) {
            requestSequence.current += 1;
            return;
        }
        const sequence = ++requestSequence.current;
        loadRecommendationPreferences(accessToken)
            .then((loaded) => {
                if (sequence !== requestSequence.current) return;
                setPreferenceOwner(userIdentity);
                setPreferences(loaded);
                setErrorMessage("");
                setStatus("ready");
            })
            .catch((error) => {
                if (sequence !== requestSequence.current) return;
                setPreferenceOwner(userIdentity);
                setPreferences(null);
                setErrorMessage(preferenceErrorMessage(error));
                setStatus("error");
            });
        return () => {
            if (sequence === requestSequence.current) requestSequence.current += 1;
        };
    }, [accessToken, enabled, hydrated, userIdentity]);

    const save = useCallback(async (
        patch: Partial<Omit<RecommendationPreferences, "consentVersion">>,
    ) => {
        if (!enabled) {
            throw new Error("추천 설정 기능이 현재 비활성화되어 있어요.");
        }
        if (!visiblePreferences || !userIdentity) {
            throw new Error("추천 설정을 먼저 불러와 주세요.");
        }
        const previous = visiblePreferences;
        const next: RecommendationPreferences = { ...previous, ...patch };
        const sequence = ++requestSequence.current;
        setPreferences(next);
        setStatus("saving");
        setErrorMessage("");
        try {
            const saved = await updateRecommendationPreferences(next, accessToken);
            if (sequence !== requestSequence.current) return saved;
            setPreferences(saved);
            setStatus("ready");
            return saved;
        } catch (error) {
            if (sequence !== requestSequence.current) throw error;
            setPreferences(previous);
            setErrorMessage(preferenceErrorMessage(error));
            setStatus("error");
            throw error;
        }
    }, [accessToken, enabled, userIdentity, visiblePreferences]);

    return {
        preferences: visiblePreferences,
        featureEnabled: enabled,
        status: visibleStatus,
        errorMessage: visibleErrorMessage,
        refresh,
        save,
        isLoading: enabled && (visibleStatus === "idle" || visibleStatus === "loading"),
        isSaving: visibleStatus === "saving",
        isReady: visibleStatus === "ready",
    };
}
