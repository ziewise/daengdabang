"use client";

import { useState } from "react";
import { useCart } from "@/lib/store";

type Props = {
    productIds: string[];
};

export default function BundleAddButton({ productIds }: Props) {
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
            {added ? "세트가 담겼어요" : "세트 한 번에 담기"}
        </button>
    );
}
