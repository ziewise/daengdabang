import type { CatalogProduct } from "@/lib/catalog";
import { productVolumeBadge } from "@/lib/shop";

type Props = {
    product: CatalogProduct;
    active?: boolean;
    detail?: boolean;
};

function motionType(product: CatalogProduct) {
    if (product.folder?.includes("taurus")) return "water";
    if (product.category === "food") return "crunch";
    if (product.category === "toy") return "bounce";
    if (product.category === "care") return "care";
    return "walk";
}

export default function ProductMotionOverlay({ product, active, detail }: Props) {
    const volumeBadge = productVolumeBadge(product);
    const type = motionType(product);

    return (
        <div className={`product-motion product-motion-${type} ${active ? "product-motion-active" : ""} ${detail ? "product-motion-detail" : ""}`} aria-hidden="true">
            {volumeBadge && <span className="product-volume-badge">{volumeBadge}</span>}
            <span className="motion-dot motion-dot-one" />
            <span className="motion-dot motion-dot-two" />
            <span className="motion-dot motion-dot-three" />
            {type === "crunch" && <span className="motion-word">아그작</span>}
            {type === "water" && <span className="motion-water-ring" />}
        </div>
    );
}
