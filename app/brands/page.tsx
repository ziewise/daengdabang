import Link from "next/link";
import type { Metadata } from "next";
import { listBrands } from "@/lib/catalog";

export const metadata: Metadata = {
    title: "브랜드 | 댕다방",
    description: "댕다방 입점 브랜드",
};

const BRAND_STYLES: Record<string, { bg: string; fg: string; line: string; label?: string }> = {
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

function initials(text: string) {
    const words = text.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "D";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function brandStyle(slug: string, en: string) {
    return BRAND_STYLES[slug] ?? { bg: "#f4f5f7", fg: "#111827", line: "#a3aab7", label: initials(en) };
}

export default function BrandsPage() {
    const brands = listBrands();

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <p className="text-sm font-black text-indigo-700">BRANDS</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">브랜드</h1>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {brands.map((brand) => {
                    const visual = brandStyle(brand.slug, brand.en);
                    return (
                        <Link
                            key={brand.slug}
                            href={`/brand/${brand.slug}`}
                            className="group relative overflow-hidden rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border text-center shadow-inner"
                                    style={{ background: visual.bg, borderColor: `${visual.line}55`, color: visual.fg }}
                                >
                                    <span className="max-w-[5.5rem] text-[11px] font-black uppercase leading-tight tracking-[0.12em]">
                                        {visual.label ?? brand.en}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate text-lg font-black text-neutral-950">{brand.ko || brand.en}</h2>
                                    <p className="mt-1 truncate text-xs font-black uppercase text-neutral-500">{brand.en}</p>
                                </div>
                                <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 px-2 text-sm font-black text-neutral-700 transition group-hover:bg-neutral-950 group-hover:text-white">
                                    {brand.count}
                                </span>
                            </div>
                            <span
                                className="absolute inset-x-4 bottom-0 h-0.5 origin-left scale-x-0 rounded-full transition group-hover:scale-x-100"
                                style={{ background: visual.line }}
                            />
                        </Link>
                    );
                })}
            </div>
        </main>
    );
}
