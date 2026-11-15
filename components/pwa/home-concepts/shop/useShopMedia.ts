"use client";

import shopMedia from "@/lib/catalog/native-shop-media.generated.json";
import { shopMediaUrl } from "@/lib/shop-media-url";

const resolve = (src: string | null | undefined) => shopMediaUrl(src, shopMedia as Record<string, string>);

/** Resolve portable app URLs during rendering, including the exported first
 * frame. Images no longer wait for a separate hydration/readiness update. */
export function useShopMedia(): typeof resolve | null {
    return resolve;
}
