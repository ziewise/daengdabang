import type { MetadataRoute } from "next";
import { CATALOG, CATEGORY_LABEL, listBrands } from "@/lib/catalog";
import { CATEGORY_ORDER, productHref } from "@/lib/shop";

const BASE_URL = "https://www.daengdabang.com";

export const dynamic = "force-static";

function url(path: string) {
    return `${BASE_URL}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    const staticPages: MetadataRoute.Sitemap = [
        "",
        "/products",
        "/best",
        "/new",
        "/brands",
        "/reviews",
        "/recommendations",
        "/brand-story",
        "/partner",
        "/bulk-order",
        "/pet-lens",
        "/chat",
        "/campaign/sns-launch",
        "/auth/signup",
    ].map((path) => ({
        url: url(path || "/"),
        lastModified: now,
        changeFrequency: "daily",
        priority: path === "" ? 1 : 0.75,
    }));

    const categoryPages: MetadataRoute.Sitemap = CATEGORY_ORDER.map((slug) => ({
        url: url(`/category/${slug}`),
        lastModified: now,
        changeFrequency: "daily",
        priority: CATEGORY_LABEL[slug] ? 0.8 : 0.6,
    }));

    const brandPages: MetadataRoute.Sitemap = listBrands().map((brand) => ({
        url: url(`/brand/${brand.slug}`),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.55,
    }));

    const productPages: MetadataRoute.Sitemap = CATALOG.map((product) => ({
        url: url(productHref(product)),
        lastModified: now,
        changeFrequency: "weekly",
        priority: product.video ? 0.8 : 0.7,
    }));

    return [...staticPages, ...categoryPages, ...brandPages, ...productPages];
}
