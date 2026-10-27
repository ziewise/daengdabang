/**
 * PetProfileModal — 웹 마이페이지 반려견 "정보 수정 · 추가 등록" 창(2026-10-24 사용자)
 * ---------------------------------------------------------------------
 * MemberPetProfileEditor(정보 수정) · MemberPetProfileCreateForm(추가 등록)이 같이 쓰는 웹 전용 겉모양.
 *  - usePetModalHost: 웹이면 document.body(창으로 띄울 자리), 앱 화면(html.ddb-app-mode)이면 null → 앱은 카드 안 펼침 그대로
 *    (예외 2026-10-28: 앱 "우리 아이" 화면은 PetAppSheet 로 감싸 앱에서도 같은 창 — 앱 겉모양은 appShopSkin "반려견 프로필 창")
 *  - PetProfileModal: 흐린 뒤 화면 + 흰 종이 창 · 민트 띠 머리(둥근 아이 사진 · 손글씨 꼬리표 · 주아 이름 + 세 색 밑줄) ·
 *    Esc · 닫기(×) · 뒤 화면 스크롤 잠금 · 닫으면 여는 버튼으로 초점 되돌림
 *  - PetProfileWebFields: 사진 · 기본 정보 · 몸과 성격 묶음 칸. 크기 · 성별 · 모질 · 활동량은 알약 고르기(값은 기존 select 와 같음)
 * 저장 · 검사 · 서버 호출은 각 폼의 원래 submit 그대로(여기는 모양만). 꾸밈은 app/globals.css "반려견 프로필 창".
 */
"use client";

import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type FormEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import PetLensPhotoViewFields from "@/components/petlens/PetLensPhotoViewFields";
import { PET_BREEDS } from "@/lib/pet-companion-breeds";
import type { PetLensPhotoCaptures } from "@/lib/petlens-multiview";
import type { PetProfile } from "@/lib/store";

// 웹 화면인가(html 에 ddb-app-mode 가 없는가) — html class 바뀜을 지켜봄. 서버 렌더는 false
function subscribeHtmlClass(onChange: () => void) {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
}
const isWebScreen = () => !document.documentElement.classList.contains("ddb-app-mode");

// 앱 "우리 아이" 화면(/app/sticker/pets, 2026-10-28) — 이 안에서는 앱에서도 같은 창을 띄움(겉모양은 앱 스킨이 스티커북으로).
// 이 표시가 없는 앱 화면(간편 가입 반려견 단계 등)은 카드 안 펼침 그대로
const PetAppSheetContext = createContext(false);
export function PetAppSheet({ children }: { children: ReactNode }) {
    return <PetAppSheetContext.Provider value={true}>{children}</PetAppSheetContext.Provider>;
}
const noopSubscribe = () => () => {};

/** 창으로 띄울 자리 — 웹이면 body, 앱이면 null(앱은 카드 안 펼침 그대로). 앱 "우리 아이" 화면 안이면 앱도 body */
export function usePetModalHost(open: boolean) {
    const web = useSyncExternalStore(subscribeHtmlClass, isWebScreen, () => false);
    const appSheet = useContext(PetAppSheetContext);
    const client = useSyncExternalStore(noopSubscribe, () => true, () => false); // 서버 그리기 · 첫 맞추기 땐 창 없음
    return open && client && (web || appSheet) ? document.body : null;
}

type ModalProps = {
    host: HTMLElement;
    titleId: string;
    kicker: string;
    name: string;
    titleRest: string;
    sub: string;
    avatar?: string;
    avatarIsPhoto?: boolean;
    busy: boolean;
    onClose: () => void;
    onSubmit: (event: FormEvent) => void;
    hint: string;
    submit: ReactNode;
    formProps?: Record<string, string | boolean>;
    children: ReactNode;
};

/** 창 겉모양 — 머리 · 본문(칸 묶음) · 아래 버튼 줄 */
export function PetProfileModal({ host, titleId, kicker, name, titleRest, sub, avatar, avatarIsPhoto, busy, onClose, onSubmit, hint, submit, formProps, children }: ModalProps) {
    const closeRef = useRef<HTMLButtonElement>(null);

    // 열려 있는 동안 뒤 화면 스크롤 잠금 · 닫기 단추에 초점
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = "hidden";
        closeRef.current?.focus();
        return () => { root.style.overflow = previous; };
    }, []);

    // Esc 로 닫기(저장 중에는 닫지 않음)
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [busy, onClose]);

    return createPortal(
        <div className="ddb-petform" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="ddb-pf-backdrop" onClick={() => { if (!busy) onClose(); }} aria-hidden="true" />
            <form onSubmit={onSubmit} className="ddb-pf-card" {...formProps}>
                <header className="ddb-pf-head">
                    <span className={`ddb-pf-avatar${avatarIsPhoto ? " is-photo" : ""}`} aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 회원 사진(data URL) · 3D 그림 그대로 */}
                        <img src={avatar || "/images/ui/mypet-view-front-160.webp"} alt="" />
                    </span>
                    <div className="ddb-pf-titles">
                        <p className="ddb-pf-kicker">{kicker}</p>
                        <h2 id={titleId}>
                            {name && <span className="ddb-pf-name">{name}</span>}
                            {titleRest}
                        </h2>
                        <p className="ddb-pf-sub">{sub}</p>
                    </div>
                    <button ref={closeRef} type="button" className="ddb-pf-close" onClick={onClose} disabled={busy} aria-label={`${name || "반려견"} ${titleRest.trim()} 닫기`}>
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </header>
                <div className="ddb-pf-body">{children}</div>
                <footer className="ddb-pf-foot">
                    <p className="ddb-pf-hint"><i className="fa-solid fa-paw" aria-hidden="true" />{hint}</p>
                    <button type="button" className="ddb-pf-cancel" onClick={onClose} disabled={busy}>닫기</button>
                    {submit}
                </footer>
            </form>
        </div>,
        host,
    );
}

/** 칸 묶음 — 3D 그림 · 주아 제목 · 설명 */
export function PetFormSection({ icon, title, sub, children, tone }: { icon: string; title: string; sub?: string; children: ReactNode; tone: "mint" | "sky" | "pink" | "lav" }) {
    return (
        <section className="ddb-pf-sec" data-tone={tone}>
            <header className="ddb-pf-sec-head">
                {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                <img src={icon} alt="" aria-hidden="true" />
                <div>
                    <h3>{title}</h3>
                    {sub && <p>{sub}</p>}
                </div>
            </header>
            {children}
        </section>
    );
}

/** 알약 고르기(라디오) — 값은 기존 select 와 같은 문자열 */
function ChoicePills<T extends string>({ label, name, value, options, onChange, disabled }: {
    label: string;
    name: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (next: T) => void;
    disabled?: boolean;
}) {
    return (
        <fieldset className="ddb-pf-choice" disabled={disabled}>
            <legend className="ddb-pf-label">{label}</legend>
            <div className="ddb-pf-pills" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
                {options.map((option) => (
                    <label key={option.value} className="ddb-pf-pill">
                        <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
                        <span>{option.label}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

const SIZE_OPTIONS: { value: PetProfile["size"]; label: string }[] = [
    { value: "small", label: "소형" },
    { value: "medium", label: "중형" },
    { value: "large", label: "대형" },
];
const SEX_OPTIONS: { value: NonNullable<PetProfile["sex"]>; label: string }[] = [
    { value: "unknown", label: "선택 안 함" },
    { value: "female", label: "암컷" },
    { value: "male", label: "수컷" },
];
const COAT_OPTIONS: { value: PetProfile["coat"]; label: string }[] = [
    { value: "short", label: "단모" },
    { value: "medium", label: "중모" },
    { value: "long", label: "장모" },
];
const ACTIVITY_OPTIONS: { value: PetProfile["activity"]; label: string }[] = [
    { value: "low", label: "차분한 편" },
    { value: "normal", label: "보통 활동량" },
    { value: "high", label: "활동량 많음" },
];

type FieldsProps = {
    groupId: string;
    breedListId: string;
    saving: boolean;
    /** 정보 수정은 이름 고정(읽기 전용), 추가 등록은 입력 */
    name: string;
    onName?: (value: string) => void;
    nameHelp?: string;
    required?: boolean;
    breed: string;
    onBreed: (value: string) => void;
    photoViews: PetLensPhotoCaptures;
    onPhotoViews: (value: PetLensPhotoCaptures) => void;
    onPhotoBusy: (busy: boolean) => void;
    onError: (message: string) => void;
    size: PetProfile["size"];
    onSize: (value: PetProfile["size"]) => void;
    age: string;
    onAge: (value: string) => void;
    weightKg: string;
    onWeightKg: (value: string) => void;
    weightHint?: ReactNode;
    weightPlaceholder: string;
    sex: NonNullable<PetProfile["sex"]>;
    onSex: (value: NonNullable<PetProfile["sex"]>) => void;
    coat: PetProfile["coat"];
    onCoat: (value: PetProfile["coat"]) => void;
    coatColor: string;
    onCoatColor: (value: string) => void;
    coatColorPlaceholder: string;
    activity: PetProfile["activity"];
    onActivity: (value: PetProfile["activity"]) => void;
};

/** 웹 창 입력 칸 — 사진 · 기본 정보 · 몸과 성격 */
export function PetProfileWebFields(props: FieldsProps) {
    const { groupId, breedListId, saving, required } = props;
    const must = required ? <b className="ddb-pf-must">필수</b> : null;
    return (
        <>
            {/* 사진 — 기존 사진 칸 그대로(앞·뒤·좌·우), 모양만 창에 맞춤 */}
            <div className="ddb-pf-sec ddb-pf-photos" data-tone="sky">
                <PetLensPhotoViewFields
                    value={props.photoViews}
                    disabled={saving}
                    onChange={props.onPhotoViews}
                    onBusyChange={props.onPhotoBusy}
                    onError={props.onError}
                />
            </div>

            <PetFormSection icon="/images/ui/pet-home-96.webp" title="기본 정보" sub="이름과 실제 견종을 적어 주세요." tone="mint">
                <div className="ddb-pf-grid">
                    <label className="ddb-pf-field">
                        <span className="ddb-pf-label">이름 {must}</span>
                        {props.onName ? (
                            <input value={props.name} onChange={(event) => props.onName?.(event.target.value)} className="input" maxLength={80} placeholder="예: 럭키" required />
                        ) : (
                            <input value={props.name} className="input" readOnly disabled />
                        )}
                        {props.nameHelp && <span className="ddb-pf-help">{props.nameHelp}</span>}
                    </label>
                    <label className="ddb-pf-field">
                        <span className="ddb-pf-label">{required ? "실제 견종" : "견종"} {must}</span>
                        <input
                            value={props.breed}
                            onChange={(event) => props.onBreed(event.target.value)}
                            className="input"
                            list={breedListId}
                            maxLength={100}
                            placeholder="견종을 입력하거나 목록에서 선택"
                            required={required}
                        />
                        <datalist id={breedListId}>
                            {PET_BREEDS.map((item) => <option key={item.id} value={item.ko}>{item.en}</option>)}
                        </datalist>
                    </label>
                </div>
            </PetFormSection>

            <PetFormSection icon="/images/ui/lab-health-160.webp" title="몸과 성격" sub="고르기만 하면 돼요. 모르는 칸은 비워 두세요." tone="pink">
                <div className="ddb-pf-grid">
                    <label className="ddb-pf-field">
                        <span className="ddb-pf-label">나이</span>
                        <input value={props.age} onChange={(event) => props.onAge(event.target.value)} className="input" maxLength={80} placeholder="예: 3살" />
                    </label>
                    <label className="ddb-pf-field">
                        <span className="ddb-pf-label">현재 체중</span>
                        <span className="ddb-pf-unit">
                            <input
                                type="number"
                                min="0.1"
                                max="120"
                                step="0.1"
                                inputMode="decimal"
                                value={props.weightKg}
                                onChange={(event) => props.onWeightKg(event.target.value)}
                                className="input"
                                placeholder={props.weightPlaceholder}
                            />
                            <em>kg</em>
                        </span>
                        {props.weightHint}
                    </label>
                    <ChoicePills label="크기" name={`${groupId}-size`} value={props.size} options={SIZE_OPTIONS} onChange={props.onSize} disabled={saving} />
                    <ChoicePills label="성별" name={`${groupId}-sex`} value={props.sex} options={SEX_OPTIONS} onChange={props.onSex} disabled={saving} />
                    <ChoicePills label="모질 길이" name={`${groupId}-coat`} value={props.coat} options={COAT_OPTIONS} onChange={props.onCoat} disabled={saving} />
                    <label className="ddb-pf-field">
                        <span className="ddb-pf-label">털 색상</span>
                        <input value={props.coatColor} onChange={(event) => props.onCoatColor(event.target.value)} className="input" maxLength={80} placeholder={props.coatColorPlaceholder} />
                    </label>
                    <div className="ddb-pf-wide">
                        <ChoicePills label="활동량" name={`${groupId}-activity`} value={props.activity} options={ACTIVITY_OPTIONS} onChange={props.onActivity} disabled={saving} />
                    </div>
                </div>
            </PetFormSection>
        </>
    );
}

/** 여는 버튼 초점 되돌리기용 — 창이 닫힌 뒤 한 프레임 뒤에 */
export function focusLater(ref: RefObject<HTMLElement | null>) {
    requestAnimationFrame(() => ref.current?.focus());
}
