/**
 * AddressModal — 웹 마이페이지 배송지 추가 · 수정 창(2026-10-24 사용자)
 * ---------------------------------------------------------------------
 * 배송지 관리 화면(app/mypage/address)의 같은 입력값 · 같은 저장(create/updateCustomerAddress)을 창으로 보여 줌. 추가 · 수정 한 창.
 * 겉 틀은 반려견 프로필 창(.ddb-petform, app/globals.css), 안쪽 꾸밈은 app/mypage-web.css "배송지 창".
 *  - 배송지 이름: 집 · 회사 · 부모님 댁 알약(누르면 이름 칸에 채움) + 직접 입력
 *  - 받는 분 · 연락처
 *  - 주소: "주소 검색" → 창 안에 카카오(다음) 우편번호 검색이 펼쳐지고, 고르면 우편번호 · 도로명 주소가 채워지고 상세 주소 칸으로 초점.
 *    검색을 불러오지 못하면(네트워크 · 차단) 우편번호 · 기본 주소를 직접 적을 수 있게 칸이 열림
 *  - 기본 배송지 켜기 단추 · 아래 버튼 줄(암호화 안내 · 닫기 · 분홍 저장)
 * 앱 화면은 이 창을 쓰지 않음(카드 아래 입력 칸 그대로).
 */
"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
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
    const searchBoxRef = useRef<HTMLDivElement>(null);
    const detailRef = useRef<HTMLInputElement>(null);
    const [searching, setSearching] = useState(!editing && !form.addressLine1);
    const [searchState, setSearchState] = useState<"idle" | "loading" | "ready" | "failed">(!editing && !form.addressLine1 ? "loading" : "idle");
    // 주소 검색 열기 — "준비 중" 표시부터
    const openSearch = () => {
        setSearchState("loading");
        setSearching(true);
    };
    const [manual, setManual] = useState(false);
    // 검색 결과를 채우는 함수 — 화면이 다시 그려져도 검색창을 새로 심지 않게 참조로 둠
    const onFieldRef = useRef(onField);
    useEffect(() => { onFieldRef.current = onField; }, [onField]);

    // 열려 있는 동안 뒤 화면 스크롤 잠금 · Esc 로 닫기(저장 중 제외) · 닫기 단추에 초점
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = "hidden";
        closeRef.current?.focus();
        return () => { root.style.overflow = previous; };
    }, []);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !pending) onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [pending, onClose]);

    // 주소 검색 펼치기 — 창 안에 우편번호 검색을 심음
    useEffect(() => {
        if (!searching) return;
        let active = true;
        loadPostcode()
            .then((Postcode) => {
                if (!active || !searchBoxRef.current) return;
                searchBoxRef.current.innerHTML = "";
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
                        onFieldRef.current("postalCode", data.zonecode);
                        onFieldRef.current("addressLine1", composeAddress(data));
                        setSearching(false);
                        setManual(false);
                        requestAnimationFrame(() => detailRef.current?.focus());
                    },
                }).embed(searchBoxRef.current, { autoClose: false });
                setSearchState("ready");
            })
            .catch(() => { if (active) { setSearchState("failed"); setManual(true); } });
        return () => { active = false; };
    }, [searching]);

    const hasAddress = Boolean(form.postalCode || form.addressLine1);
    const presetActive = LABEL_PRESETS.some((preset) => preset.label === form.label);

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
                    {/* 배송지 이름 · 받는 분 */}
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

                    {/* 주소 */}
                    <section className="ddb-pf-sec" data-tone="sky">
                        <header className="ddb-pf-sec-head">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                            <img src="/images/ui/stickers/my-address.webp" alt="" aria-hidden="true" />
                            <div>
                                <h3>어디로 보낼까요?</h3>
                                <p>도로명 · 건물명 · 지번으로 검색하면 우편번호까지 채워져요.</p>
                            </div>
                        </header>

                        {/* 고른 주소 카드 */}
                        {hasAddress && !searching && !manual && (
                            <div className="ddb-addr-picked">
                                <span className="ddb-addr-zip"><em>우편번호</em>{form.postalCode || "—"}</span>
                                <strong>{form.addressLine1}</strong>
                                <button type="button" onClick={openSearch} disabled={pending}><i className="fa-solid fa-magnifying-glass" aria-hidden="true" />다시 검색</button>
                            </div>
                        )}

                        {/* 주소 검색 펼침 */}
                        {searching ? (
                            <div className="ddb-addr-search">
                                <div className="ddb-addr-search-top">
                                    <span><i className="fa-solid fa-magnifying-glass" aria-hidden="true" />주소 검색</span>
                                    {hasAddress && <button type="button" onClick={() => setSearching(false)}>검색 닫기</button>}
                                </div>
                                <div className="ddb-addr-search-box" aria-live="polite">
                                    {/* 우편번호 검색을 심는 빈 상자 — React 가 안을 그리지 않음(검색 화면이 직접 채움) */}
                                    <div ref={searchBoxRef} className="ddb-addr-embed" />
                                    {searchState === "loading" && <p className="ddb-addr-loading"><i className="fa-solid fa-paw fa-bounce" aria-hidden="true" />주소 검색을 준비하고 있어요</p>}
                                    {searchState === "failed" && <p className="ddb-addr-loading">주소 검색을 불러오지 못했어요. 아래에 직접 적어 주세요.</p>}
                                </div>
                            </div>
                        ) : !hasAddress && !manual ? (
                            <button type="button" className="ddb-addr-find" onClick={openSearch} disabled={pending}>
                                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                                <span><b>주소 검색</b><small>우편번호와 기본 주소가 자동으로 채워져요</small></span>
                                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                            </button>
                        ) : null}

                        {/* 직접 입력(검색을 못 불러온 경우 · 원하면) */}
                        {manual && (
                            <div className="ddb-pf-grid ddb-addr-manual">
                                <label className="ddb-pf-field">
                                    <span className="ddb-pf-label">우편번호</span>
                                    <input className="input" value={form.postalCode} onChange={(event) => onField("postalCode", event.target.value)} required maxLength={10} autoComplete="shipping postal-code" inputMode="numeric" />
                                </label>
                                <label className="ddb-pf-field ddb-pf-wide">
                                    <span className="ddb-pf-label">기본 주소</span>
                                    <input className="input" value={form.addressLine1} onChange={(event) => onField("addressLine1", event.target.value)} required maxLength={200} autoComplete="shipping address-line1" />
                                </label>
                            </div>
                        )}

                        {/* 숨은 필수 칸 — 검색으로 채운 값을 그대로 저장(직접 입력이 아닐 때) */}
                        {!manual && (
                            <>
                                <input type="hidden" name="postalCode" value={form.postalCode} />
                                <input type="hidden" name="addressLine1" value={form.addressLine1} />
                            </>
                        )}

                        <label className="ddb-pf-field ddb-addr-detail">
                            <span className="ddb-pf-label">상세 주소 <b className="ddb-addr-own">선택</b></span>
                            <input ref={detailRef} className="input" value={form.addressLine2} onChange={(event) => onField("addressLine2", event.target.value)} maxLength={200} autoComplete="shipping address-line2" placeholder="동 · 호수 · 층 등" />
                        </label>
                        {!manual && <button type="button" className="ddb-addr-manual-link" onClick={() => { setManual(true); setSearching(false); }}>검색이 안 되면 직접 적기</button>}
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
        </div>,
        host,
    );
}
