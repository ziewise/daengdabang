"use client";

import { useMemo, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { productHref } from "@/lib/shop";

export default function ProductShareActions({ product }: { product: CatalogProduct }) {
    const [copied, setCopied] = useState("");
    const href = productHref(product);
    const absoluteUrl = useMemo(() => `https://www.daengdabang.com${href}`, [href]);
    const caption = [
        product.name,
        `${product.brandKo || product.brandEn} · ${product.priceText}`,
        absoluteUrl,
        "#댕다방 #반려견용품 #강아지용품",
    ].join("\n");

    const copy = async (type: "link" | "caption") => {
        const text = type === "link" ? absoluteUrl : caption;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(type);
            window.setTimeout(() => setCopied(""), 1500);
        } catch {
            setCopied("");
        }
    };

    const share = async () => {
        if (!navigator.share) {
            await copy("link");
            return;
        }
        try {
            await navigator.share({ title: product.name, text: product.name, url: absoluteUrl });
        } catch {
            // Ignore cancelled native share sheets.
        }
    };

    return (
        <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => copy("link")} className="h-10 rounded-md border border-neutral-200 bg-white text-xs font-black text-neutral-700 hover:border-indigo-300 hover:text-indigo-700">
                <i className="fa-solid fa-link mr-1.5" />
                {copied === "link" ? "복사됨" : "링크"}
            </button>
            <button type="button" onClick={() => copy("caption")} className="h-10 rounded-md border border-neutral-200 bg-white text-xs font-black text-neutral-700 hover:border-indigo-300 hover:text-indigo-700">
                <i className="fa-regular fa-copy mr-1.5" />
                {copied === "caption" ? "복사됨" : "캡션"}
            </button>
            <button type="button" onClick={share} className="h-10 rounded-md border border-neutral-200 bg-white text-xs font-black text-neutral-700 hover:border-indigo-300 hover:text-indigo-700">
                <i className="fa-solid fa-share-nodes mr-1.5" />
                공유
            </button>
        </div>
    );
}
