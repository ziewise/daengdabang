"use client";

import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { useCart } from "@/lib/store";

type Props = {
    productIds: string[];
};

export default function BundleAddButton({ productIds }: Props) {
    const { menuLabel: labelText } = useI18n();
    const { addToCart } = useCart();
    const [added, setAdded] = useState(false);

    const addBundle = () => {
        productIds.forEach((productId) => addToCart(productId, 1));
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
    };

    return (
        <button type="button" onClick={addBundle} className="btn btn-primary w-full md:w-auto">
            <i className="fa-solid fa-bag-shopping text-xs" />
            {labelText(added ? "세트가 담겼어요" : "세트 한 번에 담기")}
        </button>
    );
}
