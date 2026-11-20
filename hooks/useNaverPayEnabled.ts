"use client";

import { useEffect, useState } from "react";
import { loadTossCheckoutAvailability } from "@/lib/toss-checkout-availability";

export function useNaverPayEnabled(check = true) {
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        if (!check) return;
        let active = true;
        void loadTossCheckoutAvailability().then((availability) => {
            if (active) setEnabled(availability.naverPayEnabled);
        });
        return () => { active = false; };
    }, [check]);
    return check && enabled;
}
