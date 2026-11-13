"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Commit the hero/categories before loading and evaluating the full catalog.
// Keep enough space for scrolling while a below-fold section is still deferred.
export default function DeferredShopContent({ children, minHeight }: { children: ReactNode; minHeight: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: "120px" });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    return <div ref={ref} style={visible ? undefined : { minHeight }}>
        {visible ? children : <p className="ah-light pt-8 text-center text-[12px] text-[#7d6a61]" role="status">상품을 불러오고 있어요.</p>}
    </div>;
}
