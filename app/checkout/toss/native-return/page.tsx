"use client";

import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { nativePaymentReturnLink } from "@/lib/toss-native-payment";

export default function NativePaymentReturnPage() {
    const { menuLabel: labelText } = useI18n();
    const [link, setLink] = useState<string | null>(null);
    useEffect(() => {
        const target = nativePaymentReturnLink(window.location.search);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- callback parameters are available after hydration.
        setLink(target);
        // A visible link is required when the browser blocks automatic app opening.
        if (target) window.location.replace(target);
    }, []);
    return <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-black">{labelText("댕다방 앱에서 확인해 주세요")}</h1>
        <p className="mt-5 text-sm leading-6 text-neutral-600">
            {labelText(link ? "앱으로 돌아가면 결제 결과를 확인할게요. 자동으로 열리지 않으면 아래 버튼을 눌러 주세요."
                : "결제 결과 주소를 확인할 수 없어요. 앱의 주문 내역에서 결제 상태를 확인해 주세요.")}
        </p>
        {link && <a href={link} className="btn btn-primary mt-7">{labelText("댕다방 앱으로 돌아가기")}</a>}
    </main>;
}
