"use client";

import type { ElementType, ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

type Props = {
    ko: ReactNode;
    en: ReactNode;
    as?: ElementType;
    className?: string;
};

export default function LocalizedText({ ko, en, as: Tag = "span", className }: Props) {
    const { locale } = useI18n();
    return <Tag className={className}>{locale === "en" ? en : ko}</Tag>;
}
