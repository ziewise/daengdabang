"use client";

import { useI18n } from "@/lib/i18n";

export default function LocalizedMenuLabel({ label, english }: { label: string | null | undefined; english?: string }) {
    const { locale, menuLabel } = useI18n();
    return <>{locale === "en" && english !== undefined ? english : menuLabel(label)}</>;
}
