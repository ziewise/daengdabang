/**
 * AddressModal — 웹 마이페이지 배송지 추가 · 수정 창(2026-10-24 사용자)
 * ---------------------------------------------------------------------
 * 배송지 관리 화면(app/mypage/address)의 같은 입력값 · 같은 저장(create/updateCustomerAddress)을 창으로 보여 줌. 추가 · 수정 한 창.
 * 겉 틀은 반려견 프로필 창(.ddb-petform, app/globals.css), 안쪽 꾸밈은 app/mypage-web.css "배송지 창".
 *  - 배송지 이름: 집 · 회사 · 부모님 댁 알약(누르면 이름 칸에 채움) + 직접 입력 · 받는 분 · 연락처
 *  - 주소: 우편번호 칸 + 옆 "주소 검색" 버튼 · 기본 주소 칸(둘 다 검색으로 채움, 누르면 검색 창) · 상세 주소
 *    "주소 검색" → 주소 검색 전용 창(AddressSearchModal — 카카오(다음) 우편번호 검색)이 위에 열리고,
 *    주소를 고르면 아래에 고른 주소가 보이고 "적용"을 누르면 우편번호 · 기본 주소가 채워진 뒤 상세 주소 칸으로 초점.
 *    검색을 불러오지 못하면(네트워크 · 차단) 우편번호 · 기본 주소를 직접 적을 수 있게 칸이 열림
 *  - 기본 배송지 켜기 단추 · 아래 버튼 줄(암호화 안내 · 닫기 · 분홍 저장)
 * 앱 화면은 이 창을 쓰지 않음(카드 아래 입력 칸 그대로).
 */
"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { CustomerAddressInput } from "@/lib/customer-api";

// 카카오(다음) 우편번호 서비스 — 무료 · 키 없음. 필요할 때 한 번만 불러옴
const POSTCODE_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

type PostcodeData = {
    zonecode: string;
    roadAddress: string;
    jibunAddress: string;
    autoRoadAddress?: string;
    autoJibunAddress?: string;
    userSelectedType: "R" | "J";
    bname: string;
    buildingName: string;
    apartment: "Y" | "N";
};
type PostcodeCtor = new (options: {
    oncomplete: (data: PostcodeData) => void;
    width?: string;
    height?: string;
    theme?: Record<string, string>;
    animation?: boolean;
}) => { embed: (element: HTMLElement, options?: { autoClose?: boolean; q?: string }) => void };

let postcodeLoader: Promise<PostcodeCtor> | null = null;
function loadPostcode(): Promise<PostcodeCtor> {
    const existing = (window as Window & { daum?: { Postcode?: PostcodeCtor } }).daum?.Postcode;
    if (existing) return Promise.resolve(existing);
    postcodeLoader ??= new Promise<PostcodeCtor>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = POSTCODE_SRC;
        script.async = true;
        script.onload = () => {
            const ctor = (window as Window & { daum?: { Postcode?: PostcodeCtor } }).daum?.Postcode;
            if (ctor) resolve(ctor); else reject(new Error("postcode_unavailable"));
        };
        script.onerror = () => { postcodeLoader = null; reject(new Error("postcode_load_failed")); };
        document.head.appendChild(script);
    });
    return postcodeLoader;
}

// 도로명 주소 + 참고 항목(동 · 건물명) — 카카오 안내 방식
function composeAddress(data: PostcodeData) {
    const base = data.userSelectedType === "J" ? (data.jibunAddress || data.autoJibunAddress || "") : (data.roadAddress || data.autoRoadAddress || "");
    if (data.userSelectedType === "J") return base;
    const extras: string[] = [];
    if (data.bname && /[동로가]$/.test(data.bname)) extras.push(data.bname);
    if (data.buildingName && data.apartment === "Y") extras.push(data.buildingName);
    return extras.length ? `${base} (${extras.join(", ")})` : base;
}

type PickedAddress = { postalCode: string; address: string; other: string };

/** 주소 검색 전용 창 — 검색 · 고르기 · 적용 */
function AddressSearchModal({ onApply, onClose, onFailed }: { onApply: (picked: PickedAddress) => void; onClose: () => void; onFailed: () => void }) {
    const titleId = useId();
    const boxRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const applyRef = useRef<HTMLButtonElement>(null);
    const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
    const [picked, setPicked] = useState<PickedAddress | null>(null);
    const onFailedRef = useRef(onFailed);
    useEffect(() => { onFailedRef.current = onFailed; }, [onFailed]);

    // Esc 로 이 창만 닫기 · 닫기 단추에 초점
    useEffect(() => {
        closeRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.stopImmediatePropagation();
            onClose();
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [onClose]);

    // 카카오 우편번호 검색을 창 안에 심음 — 고르면 아래 "고른 주소"에 보이고 적용을 기다림
    useEffect(() => {
        let active = true;
        loadPostcode()
            .then((Postcode) => {
                if (!active || !boxRef.current) return;
                boxRef.current.innerHTML = "";
                new Postcode({
                    width: "100%",
                    height: "100%",
                    animation: true,
                    theme: {
                        bgColor: "#FDFAF5",
                        searchBgColor: "#FFFFFF",
                        contentBgColor: "#FFFFFF",
                        pageBgColor: "#FBF7F1",
                        textColor: "#334155",
                        queryTextColor: "#1E293B",
                        postcodeTextColor: "#E2557A",
                        emphTextColor: "#12A17A",
                        outlineColor: "#EFE5D8",
                    },
                    oncomplete: (data) => {
                        setPicked({
                            postalCode: data.zonecode,
                            address: composeAddress(data),
                            other: data.userSelectedType === "J" ? (data.roadAddress || data.autoRoadAddress || "") : (data.jibunAddress || data.autoJibunAddress || ""),
                        });
                        requestAnimationFrame(() => applyRef.current?.focus());
                    },
                }).embed(boxRef.current, { autoClose: false });
                setState("ready");
            })
            .catch(() => { if (active) { setState("failed"); onFailedRef.current(); } });
        return () => { active = false; };
    }, []);

    return createPortal(
        <div className="ddb-petform ddb-addrsearch" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="ddb-pf-backdrop" onClick={onClose} aria-hidden="true" />
            <div className="ddb-pf-card">
                <header className="ddb-pf-head">
                    <span className="ddb-pf-avatar" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                        <img src="/images/ui/stickers/my-address.webp" alt="" />
                    </span>
                    <div className="ddb-pf-titles">
                        <p className="ddb-pf-kicker">ADDRESS SEARCH</p>
                        <h2 id={titleId}><span className="ddb-pf-name">주소 검색</span></h2>
                        <p className="ddb-pf-sub">도로명 · 건물명 · 지번으로 찾고, 고른 뒤 적용을 눌러 주세요.</p>
                    </div>
                    <button ref={closeRef} type="button" className="ddb-pf-close" onClick={onClose} aria-label="주소 검색 닫기">
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </header>
                <div className="ddb-as-body">
                    <div className="ddb-as-box" aria-live="polite">
                        {/* 우편번호 검색을 심는 빈 상자 — React 가 안을 그리지 않음 */}
                        <div ref={boxRef} className="ddb-addr-embed" />
                        {state === "loading" && <p className="ddb-addr-loading"><i className="fa-solid fa-paw fa-bounce" aria-hidden="true" />주소 검색을 준비하고 있어요</p>}
                        {state === "failed" && <p className="ddb-addr-loading">주소 검색을 불러오지 못했어요. 창을 닫고 주소를 직접 적어 주세요.</p>}
                    </div>
                </div>
                {/* 고른 주소 + 적용 */}
                <footer className="ddb-as-foot" data-picked={picked ? "" : undefined}>
                    {picked ? (
                        <div className="ddb-as-picked">
                            <span className="ddb-addr-zip"><em>우편번호</em>{picked.postalCode}</span>
                            <strong>{picked.address}</strong>
                            {picked.other && <small>{picked.other}</small>}
                        </div>
                    ) : (
                        <p className="ddb-as-hint"><i className="fa-solid fa-hand-pointer" aria-hidden="true" />검색 결과에서 주소를 누르면 여기에 보여요.</p>
                    )}
                    <div className="ddb-as-actions">
                        <button type="button" className="ddb-pf-cancel" onClick={onClose}>닫기</button>
                        <button ref={applyRef} type="button" className="ddb-pf-save" disabled={!picked} onClick={() => { if (picked) onApply(picked); }}>
                            <i className="fa-solid fa-check" aria-hidden="true" />적용
                        </button>
                    </div>
                </footer>
            </div>
        </div>,
        document.body,
    );
}

const LABEL_PRESETS = [
    { label: "집", icon: "fa-house" },
    { label: "회사", icon: "fa-building" },
    { label: "부모님 댁", icon: "fa-heart" },
];

type Props = {
    host: HTMLElement;
    editing: boolean;
    form: CustomerAddressInput;
    onField: <K extends keyof CustomerAddressInput>(key: K, value: CustomerAddressInput[K]) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onClose: () => void;
    pending: boolean;
    error: string;
    saveDisabled: boolean;
};

export default function AddressModal({ host, editing, form, onField, onSubmit, onClose, pending, error, saveDisabled }: Props) {
    const titleId = useId();
    const closeRef = useRef<HTMLButtonElement>(null);
    const detailRef = useRef<HTMLInputElement>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    // 검색을 못 불러오면 · 원하면 직접 적기
    const [manual, setManual] = useState(false);

    // 열려 있는 동안 뒤 화면 스크롤 잠금 · 닫기 단추에 초점
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = "hidden";
        closeRef.current?.focus();
        return () => { root.style.overflow = previous; };
    }, []);
    // Esc 로 닫기(저장 중 · 검색 창이 떠 있을 때 제외 — 검색 창이 먼저 닫힘)
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !pending && !searchOpen) onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [pending, onClose, searchOpen]);

    const presetActive = LABEL_PRESETS.some((preset) => preset.label === form.label);
    const openSearch = () => { if (!pending) setSearchOpen(true); };
    const closeSearch = useCallback(() => setSearchOpen(false), []);
    const searchFailed = useCallback(() => setManual(true), []);
    const apply = (picked: PickedAddress) => {
        onField("postalCode", picked.postalCode);
        onField("addressLine1", picked.address);
        setSearchOpen(false);
        setManual(false);
        requestAnimationFrame(() => detailRef.current?.focus());
    };

    return createPortal(
        <div className="ddb-petform ddb-addr" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="ddb-pf-backdrop" onClick={() => { if (!pending) onClose(); }} aria-hidden="true" />
            <form onSubmit={onSubmit} className="ddb-pf-card" data-address-modal>
                <header className="ddb-pf-head">
                    <span className="ddb-pf-avatar" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                        <img src="/images/ui/pet-home-96.webp" alt="" />
                    </span>
                    <div className="ddb-pf-titles">
                        <p className="ddb-pf-kicker">{editing ? "EDIT ADDRESS" : "NEW ADDRESS"}</p>
                        <h2 id={titleId}><span className="ddb-pf-name">{editing ? "배송지 수정" : "새 배송지 추가"}</span></h2>
                        <p className="ddb-pf-sub">주소는 검색으로 찾고, 동 · 호수 같은 상세 주소만 적어 주세요.</p>
                    </div>
                    <button ref={closeRef} type="button" className="ddb-pf-close" onClick={onClose} disabled={pending} aria-label="배송지 창 닫기">
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </header>

                <div className="ddb-pf-body">
                    {/* 배송지 이름 · 받는 분 · 연락처 */}
                    <section className="ddb-pf-sec" data-tone="pink">
                        <header className="ddb-pf-sec-head">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                            <img src="/images/ui/stickers/checkout-address.webp" alt="" aria-hidden="true" />
                            <div>
                                <h3>누구에게 보낼까요?</h3>
                                <p>자주 쓰는 이름은 눌러서 고를 수 있어요.</p>
                            </div>
                        </header>
                        <div className="ddb-addr-presets" role="group" aria-label="배송지 이름 고르기">
                            {LABEL_PRESETS.map((preset) => (
                                <button key={preset.label} type="button" className={form.label === preset.label ? "is-on" : ""} aria-pressed={form.label === preset.label} onClick={() => onField("label", preset.label)} disabled={pending}>
                                    <i className={`fa-solid ${preset.icon}`} aria-hidden="true" />{preset.label}
                                </button>
                            ))}
                        </div>
                        <div className="ddb-pf-grid">
                            <label className="ddb-pf-field">
                                <span className="ddb-pf-label">배송지 이름 {!presetActive && form.label ? <b className="ddb-addr-own">직접 입력</b> : null}</span>
                                <input className="input" value={form.label} onChange={(event) => onField("label", event.target.value)} required maxLength={40} placeholder="집, 회사" />
                            </label>
                            <label className="ddb-pf-field">
                                <span className="ddb-pf-label">받는 분</span>
                                <input className="input" value={form.recipientName} onChange={(event) => onField("recipientName", event.target.value)} required maxLength={50} autoComplete="shipping name" placeholder="이름" />
                            </label>
                            <label className="ddb-pf-field ddb-pf-wide">
                                <span className="ddb-pf-label">연락처</span>
                                <input className="input" value={form.phone} onChange={(event) => onField("phone", event.target.value)} required maxLength={20} autoComplete="shipping tel" inputMode="tel" placeholder="010-0000-0000" />
                            </label>
                        </div>
                    </section>

                    {/* 주소 — 우편번호 + 주소 검색 버튼 · 기본 주소 · 상세 주소 */}
                    <section className="ddb-pf-sec" data-tone="sky">
                        <header className="ddb-pf-sec-head">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                            <img src="/images/ui/stickers/my-address.webp" alt="" aria-hidden="true" />
                            <div>
                                <h3>어디로 보낼까요?</h3>
                                <p>주소 검색으로 우편번호와 기본 주소를 채우고, 상세 주소를 적어 주세요.</p>
                            </div>
                        </header>
                        <div className="ddb-addr-fields">
                            <label className="ddb-pf-field ddb-addr-zipfield">
                                <span className="ddb-pf-label">우편번호</span>
                                <span className="ddb-addr-ziprow">
                                    <input
                                        className="input"
                                        value={form.postalCode}
                                        onChange={(event) => onField("postalCode", event.target.value)}
                                        readOnly={!manual}
                                        onClick={() => { if (!manual) openSearch(); }}
                                        required
                                        maxLength={10}
                                        autoComplete="shipping postal-code"
                                        inputMode="numeric"
                                        placeholder="우편번호"
                                    />
                                    <button type="button" className="ddb-addr-searchbtn" onClick={openSearch} disabled={pending}>
                                        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />주소 검색
                                    </button>
                                </span>
                            </label>
                            <label className="ddb-pf-field">
                                <span className="ddb-pf-label">기본 주소</span>
                                <input
                                    className="input"
                                    value={form.addressLine1}
                                    onChange={(event) => onField("addressLine1", event.target.value)}
                                    readOnly={!manual}
                                    onClick={() => { if (!manual && !form.addressLine1) openSearch(); }}
                                    required
                                    maxLength={200}
                                    autoComplete="shipping address-line1"
                                    placeholder="주소 검색을 누르면 채워져요"
                                />
                            </label>
                            <label className="ddb-pf-field">
                                <span className="ddb-pf-label">상세 주소 <b className="ddb-addr-own">선택</b></span>
                                <input ref={detailRef} className="input" value={form.addressLine2} onChange={(event) => onField("addressLine2", event.target.value)} maxLength={200} autoComplete="shipping address-line2" placeholder="동 · 호수 · 층 등" />
                            </label>
                        </div>
                        {!manual && <button type="button" className="ddb-addr-manual-link" onClick={() => setManual(true)}>검색이 안 되면 직접 적기</button>}
                    </section>

                    {/* 기본 배송지 */}
                    <label className="ddb-addr-default">
                        <input type="checkbox" checked={form.isDefault} onChange={(event) => onField("isDefault", event.target.checked)} />
                        <span className="ddb-addr-switch" aria-hidden="true" />
                        <span><b>기본 배송지로 설정</b><small>주문할 때 이 주소가 먼저 채워져요.</small></span>
                    </label>

                    {error && <p role="alert" className="ddb-pf-msg">{error}</p>}
                </div>

                <footer className="ddb-pf-foot">
                    <p className="ddb-pf-hint"><i className="fa-solid fa-lock" aria-hidden="true" />주소와 연락처는 암호화해 보관해요.</p>
                    <button type="button" className="ddb-pf-cancel" onClick={onClose} disabled={pending}>닫기</button>
                    <button type="submit" className="ddb-pf-save" disabled={pending || saveDisabled || !form.postalCode || !form.addressLine1}>
                        <i className="fa-solid fa-check" aria-hidden="true" />{pending ? "저장 중…" : editing ? "수정 저장" : "배송지 저장"}
                    </button>
                </footer>
            </form>
            {searchOpen && <AddressSearchModal onApply={apply} onClose={closeSearch} onFailed={searchFailed} />}
        </div>,
        host,
    );
}
