"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/store";

type Props = {
    productIds: string[];
    itemCount: number;
    discountRate: number;
};

export default function BundleAddButton({ productIds, itemCount, discountRate }: Props) {
    const cart = useCart();
    const [added, setAdded] = useState(false);

    const addBundle = () => {
        productIds.forEach((productId) => cart.addToCart(productId, 1));
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
    };

    return (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <button
                type="button"
                onClick={addBundle}
                className="btn btn-primary h-12 w-full text-base"
            >
                <i className="fa-solid fa-box-open text-sm" />
                {added ? "묶음이 장바구니에 담겼어요" : `${itemCount}종 묶음 전체 담기`}
            </button>
            <Link href="/cart" className="btn btn-secondary h-12 px-5">
                <i className="fa-solid fa-bag-shopping text-sm" />
                장바구니
            </Link>
            <p className="sm:col-span-2 text-xs font-bold leading-5 text-neutral-500">
                장바구니에 같은 묶음 구성이 모두 담기면 {discountRate}% 묶음 배송 할인이 자동 적용됩니다.
            </p>
        </div>
    );
}
