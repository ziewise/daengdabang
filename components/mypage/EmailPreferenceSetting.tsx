"use client";

import { useEffect, useState } from "react";
import {
    consentOutboundEmailPreference,
    loadOutboundEmailPreference,
    withdrawOutboundEmailPreference,
    type OutboundEmailPreference,
} from "@/lib/customer-api";

export default function EmailPreferenceSetting({ token }: { token?: string }) {
    const [preference, setPreference] = useState<OutboundEmailPreference>();
    const [agree, setAgree] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    useEffect(() => {
        let active = true;
        if (token) void loadOutboundEmailPreference(token).then((value) => {
            if (active) setPreference(value);
        }).catch(() => { if (active) setMessage("수신 설정을 확인하지 못했어요. 잠시 후 다시 시도해 주세요."); });
        return () => { active = false; };
    }, [token]);
    const subscribed = Boolean(preference?.consented && !preference.suppressed);
    const save = async (withdraw: boolean) => {
        if (!token || busy || (!withdraw && !agree)) return;
        setBusy(true); setMessage("");
        try {
            const value = await (withdraw ? withdrawOutboundEmailPreference(token) : consentOutboundEmailPreference(token));
            setPreference(value); setAgree(false);
            setMessage(withdraw ? "이메일 소식 수신을 중단했어요." : value.sendAuthorized
                ? "이메일 소식 수신에 동의했어요."
                : "동의는 저장됐지만 받을 이메일 확인이 필요해요.");
        } catch {
            setMessage("수신 설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
        } finally { setBusy(false); }
    };
    return <li className="rounded-xl border border-neutral-100 p-4">
        <b>이메일 소식</b>
        <p className="my-2 text-sm">{preference ? subscribed ? "수신에 동의했어요" : "받지 않아요" : "수신 설정을 확인하고 있어요"}</p>
        {subscribed ? <button type="button" disabled={busy} onClick={() => void save(true)} className="btn btn-secondary">{busy ? "저장하는 중" : "그만 받기"}</button>
            : preference && <div className="space-y-3">
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} />[선택] 새 상품·할인·이벤트 이메일 수신에 동의해요.</label>
                <button type="button" disabled={!agree || busy} onClick={() => void save(false)} className="btn btn-secondary disabled:opacity-50">{busy ? "저장하는 중" : "동의하고 받기"}</button>
            </div>}
        <p className="mt-3 text-xs text-neutral-500">주문·배송 안내는 수신 설정과 관계없이 받을 수 있어요.</p>
        {message && <p role="status" className="mt-2 text-sm">{message}</p>}
    </li>;
}
