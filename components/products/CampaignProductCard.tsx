"use client";

import { useI18n } from "@/lib/i18n";
import type { CatalogProduct } from "@/lib/catalog";
import { productHref } from "@/lib/shop";

export default function CampaignProductCard({ product }: { product: CatalogProduct }) {
    const { productName, formatPrice } = useI18n();
    const name = productName(product);
    return (
        <a href={`${productHref(product)}?utm_source=social&utm_medium=profile&utm_campaign=sns_launch`} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <div className="aspect-square overflow-hidden rounded-md bg-white">
                <img src={product.image} alt={name} className="h-full w-full object-contain p-3" />
            </div>
            <p className="mt-3 line-clamp-2 text-sm font-black text-neutral-950">{name}</p>
            <p className="mt-1 text-xs font-bold text-neutral-500">{formatPrice(product.price)}</p>
        </a>
    );
}
