"use client";
import { useEffect, useState } from "react";
import { Browser } from "@capacitor/browser";
import { isNativeAppRuntime } from "@/lib/native-runtime";
import { commerceApi, commerceUrl } from "@/lib/commerce-api";

export default function SocialPhoneRegistration() {
    const [phone, setPhone] = useState<{ masked_phone?: string; provider?: string }>();
    const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
    useEffect(() => {
        const refresh = () => commerceApi<{ masked_phone?: string; provider?: string }>("/api/v1/me/phone").then(setPhone).catch(() => setMessage("등록된 번호를 확인하지 못했어요."));
        const showResult = (result: string | null) => {
        if (result === "registered") setMessage("소셜계정의 휴대폰 번호를 등록했어요.");
        else if (result === "phone_unavailable") setMessage("소셜계정에서 휴대폰 번호를 제공하지 않았어요. 번호 제공에 동의하거나 다른 계정을 이용해 주세요.");
        else if (result === "account_mismatch") setMessage("다른 댕다방 회원과 연결된 소셜계정이에요. 현재 회원의 계정을 이용해 주세요.");
        else if (result === "cancelled") setMessage("번호 등록을 취소했어요. 기존에 등록한 번호는 그대로 유지돼요.");
        else if (result === "provider_unavailable") setMessage("소셜계정의 번호를 확인하지 못했어요. 잠시 후 다시 시도하거나 다른 소셜계정을 이용해 주세요.");
        };
        void refresh(); showResult(new URLSearchParams(window.location.search).get("phone_result"));
        const completed = (event: Event) => { setBusy(false); showResult((event as CustomEvent<string>).detail); void refresh(); };
        window.addEventListener("ddb-phone-link-result", completed);
        return () => window.removeEventListener("ddb-phone-link-result", completed);
    }, []);
    const start = async (provider: "kakao" | "naver") => {
        if (busy) return; setBusy(true); setMessage("");
        try {
            const response = await commerceApi<{ auth_url: string }>("/api/v1/me/phone/link", { method: "POST", body: JSON.stringify({ provider, native_app: isNativeAppRuntime() }) });
            if (isNativeAppRuntime()) { await Browser.open({ url: commerceUrl(response.auth_url) }); setBusy(false); }
            else window.location.href = commerceUrl(response.auth_url);
        } catch (e) { setMessage((e as Error).message); setBusy(false); }
    };
    return <li className="rounded-xl border border-neutral-100 p-4"><b>휴대폰 번호</b><p className="my-2 text-sm">{phone?.masked_phone || "등록 전"}{phone?.provider ? ` · ${phone.provider === "kakao" ? "카카오" : "네이버"} 계정에서 확인` : ""}</p>
        <div className="flex flex-wrap gap-2"><button disabled={busy} type="button" onClick={() => void start("kakao")} className="rounded-full bg-[#fee500] px-4 py-2 text-sm font-bold">카카오로 번호 {phone?.masked_phone ? "변경" : "등록"}</button><button disabled={busy} type="button" onClick={() => void start("naver")} className="rounded-full bg-[#03c75a] px-4 py-2 text-sm font-bold text-white">네이버로 번호 {phone?.masked_phone ? "변경" : "등록"}</button></div>
        <p className="mt-3 text-xs leading-5 text-neutral-500">별도 문자 인증 없이 소셜계정에서 제공하는 번호를 등록해요. 해당 계정의 번호 제공 동의가 필요하며, 법정 본인확인 서비스와는 달라요.</p>
        {message && <p role="status" className="mt-2 text-sm">{message}</p>}
    </li>;
}
