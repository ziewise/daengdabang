"use client";
import { useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { careTalkCopy } from "@/lib/care-talk-copy";

export function useCareTalkCopy() {
    const { locale } = useI18n();
    return useCallback((text: string) => careTalkCopy(locale, text), [locale]);
}
