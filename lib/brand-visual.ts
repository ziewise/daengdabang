/**
 * brand-visual — 브랜드 로고 판 색(배경 · 글자 · 강조 줄 · 영문 표시) · 2026-10-25
 * ---------------------------------------------------------------------
 * 원래 app/brands/page.tsx 안에 있던 표를 브랜드 상세(/brand/[slug]) 웹 머리 판도 같이 쓰도록 옮김(값 그대로).
 */

export type BrandVisual = { bg: string; fg: string; line: string; label?: string };

export const BRAND_STYLES: Record<string, BrandVisual> = {
    ruffwear: { bg: "#f4efe5", fg: "#202b2f", line: "#f2b544", label: "RUFFWEAR" },
    "rex-specs": { bg: "#101820", fg: "#f5f7f8", line: "#49a3ff", label: "REX SPECS" },
    yora: { bg: "#e9f5ed", fg: "#143929", line: "#63a86c", label: "YORA" },
    soopa: { bg: "#fff3d9", fg: "#302314", line: "#f2a51a", label: "SOOPA" },
    affetto: { bg: "#f6ece9", fg: "#37231f", line: "#d88b7f", label: "AFFETTO" },
    ibiyaya: { bg: "#eef3f7", fg: "#1d2a35", line: "#7fa6c4", label: "IBIYAYA" },
    "zoo-snoods": { bg: "#f5eef7", fg: "#30203a", line: "#b987c5", label: "ZOO SNOODS" },
    "pumble-pet-soap": { bg: "#eef8f6", fg: "#173834", line: "#7cbcb4", label: "PUMBLE" },
    "industry-pet": { bg: "#f1f4f5", fg: "#171717", line: "#f47b20", label: "THRO BIZZ" },
    perity: { bg: "#edf8ee", fg: "#213326", line: "#79b56d", label: "PERITY" },
    naturediet: { bg: "#f4f0e6", fg: "#322817", line: "#a47a3b", label: "NATUREDIET" },
    "skinner-s": { bg: "#f1efe8", fg: "#2e2b22", line: "#a89050", label: "SKINNER'S" },
    canagan: { bg: "#f6f1df", fg: "#2f2814", line: "#c7a64d", label: "CANAGAN" },
    "i-m-different": { bg: "#f2f4ec", fg: "#25301d", line: "#9ca66a", label: "I'M DIFFERENT" },
    fitdreamhouse: { bg: "#eef5f3", fg: "#18312d", line: "#66a89b", label: "FITDREAM" },
    onetigris: { bg: "#eeece6", fg: "#27241d", line: "#8c7d5b", label: "1TIGRIS" },
    joaru: { bg: "#f6f3ef", fg: "#2d2823", line: "#bfa58b", label: "JOARU" },
    "polkadog-bakery": { bg: "#f7f0e8", fg: "#33261d", line: "#c48655", label: "POLKADOG" },
    heyrex: { bg: "#eef4f7", fg: "#172b34", line: "#6d9db3", label: "HEYREX" },
    anapet: { bg: "#f2f1f8", fg: "#242239", line: "#8b82c5", label: "ANAPET" },
    "billy-margot": { bg: "#f7f3ea", fg: "#352c1e", line: "#c1a46d", label: "BILLY + MARGOT" },
    "handmade-other": { bg: "#f4f4f1", fg: "#292925", line: "#aaa28f", label: "HANDMADE" },
    jjayo: { bg: "#eef3ff", fg: "#18213a", line: "#6b7fd7", label: "JJAYO" },
    mittyborn: { bg: "#f3eef2", fg: "#302232", line: "#b583ac", label: "MITTYBORN" },
    packt: { bg: "#edf0f4", fg: "#1e2733", line: "#74879f", label: "PACKT" },
    wow: { bg: "#f2f6ee", fg: "#20321a", line: "#77a35b", label: "WOW" },
    daengscream: { bg: "#fff0f5", fg: "#351d28", line: "#ee7aa9", label: "DAENGSCREAM" },
    "hugo-celine": { bg: "#f8eef1", fg: "#31202a", line: "#d38aa4", label: "HUGO & CELINE" },
    pugnutty: { bg: "#f0f2f6", fg: "#1f2734", line: "#7d8fae", label: "PUGNUTTY" },
    "sweet-pet": { bg: "#fff1ee", fg: "#3a201c", line: "#f28c78", label: "SWEET PET" },
    "tam-life": { bg: "#eef6f4", fg: "#19312d", line: "#73afa3", label: "TAM LIFE" },
    thule: { bg: "#eef2f8", fg: "#17233a", line: "#6c88b9", label: "THULE" },
};

export function brandInitials(text: string) {
    const words = text.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "D";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

export function brandStyle(slug: string, en: string): BrandVisual {
    return BRAND_STYLES[slug] ?? { bg: "#f4f5f7", fg: "#111827", line: "#a3aab7", label: brandInitials(en) };
}
