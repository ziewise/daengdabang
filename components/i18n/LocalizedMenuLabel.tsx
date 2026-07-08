"use client";

import { useI18n } from "@/lib/i18n";

export default function LocalizedMenuLabel({ label }: { label: string }) {
    const { menuLabel } = useI18n();
    return <>{menuLabel(label)}</>;
}
