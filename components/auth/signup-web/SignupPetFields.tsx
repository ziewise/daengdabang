/**
 * SignupPetFields — 웹 회원가입 "우리 아이" 입력(2026-10-24 3차: 사용자 "비주얼 · 디테일이 부족")
 * ---------------------------------------------------------------------
 * 값 · 사진 분석 · 저장은 app/auth/signup/page.tsx 의 것 그대로(SignupWebFlow 가 넘겨줌) — 겉모양만.
 *  1) 우리 아이 카드: 대표 사진 · 이름(세 색 밑줄) · 견종 · 크기 · 나이 · 체중 · 성별이 입력하는 대로 바로 채워짐 + 프로필 채움 막대
 *  2) 사진: 잘 나오는 사진 팁 셋 · 네 방향 칸(방향 그림 · 고르면 사진 + 분홍 체크) · 살펴보는 중 표시
 *  3) 사진으로 찾은 후보(연보라): 분석 안내 · 예상 체중 · 털 색 후보 — "후보예요, 직접 확인해 주세요"
 *  4) 기본 정보: 이름 · 나이 · 견종(자주 고르는 견종 칩 + 전체 목록 + 직접 입력) · 크기(강아지 크기 아이콘) · 체중(kg)
 *  5) 몸과 성격: 털 길이 · 털 색(색 동그라미 칩) · 성별(♀♂) · 활동량 · 관심 케어(아이콘 칩)
 *  6) 선택 동의(반려동물 정보) — 고르면 분홍
 * 색 규칙은 가입 화면 전체와 같음(분홍 고르기 · 초록 완료 · 연보라 안내 · 노랑 주의).
 */
"use client";

import { PET_BREEDS } from "@/lib/pet-companion-breeds";
import type { PetProfile } from "@/lib/store";
import { SxBlock, SxCheck, UI } from "@/components/auth/signup-web/SignupWebParts";
import type { PetPhotoViewId, SignupWebPetOptions, SignupWebPetState } from "@/components/auth/signup-web/SignupWebFlow";

/** 자주 고르는 견종(목록 이름표 그대로) */
const POPULAR_BREEDS = ["maltese-dog", "toy-poodle", "pomeranian", "bichon-frise", "shih-tzu", "chihuahua", "jindo-dog", "golden-retriever"];

/** 털 색 바로 고르기(글자는 털 색 칸에 그대로 들어감) */
const COAT_COLORS: Array<{ label: string; swatch: string }> = [
    { label: "흰색", swatch: "#ffffff" },
    { label: "크림", swatch: "#f3dfb8" },
    { label: "갈색", swatch: "#a86b3c" },
    { label: "검정", swatch: "#2b2b2b" },
    { label: "회색", swatch: "#a3a8b0" },
    { label: "검정·갈색", swatch: "linear-gradient(135deg, #2b2b2b 50%, #a86b3c 50%)" },
];

/** 관심 케어 아이콘 */
const CONCERN_ICON: Record<string, string> = {
    "눈 보호": "fa-eye",
    "피부/발바닥 케어": "fa-paw",
    "체중 관리": "fa-weight-scale",
    "산책 안전": "fa-person-walking",
    "놀이/분리불안": "fa-heart",
};

const SIZE_LABEL: Record<PetProfile["size"], string> = { small: "소형", medium: "중형", large: "대형" };
const SEX_LABEL: Record<string, string> = { female: "암컷", male: "수컷", unknown: "" };

/** 아이콘 알약 하나 고르기(라디오) */
function IconPills<T extends string>({ label, name, value, options, onChange }: { label: string; name: string; value: T; options: Array<{ value: T; label: string; icon: string; scale?: number }>; onChange: (value: T) => void }) {
    return (
        <div className="sxw-f">
            <span className="sxw-label" id={`${name}-label`}>{label}</span>
            <div className="sxw-pills is-icon" role="radiogroup" aria-labelledby={`${name}-label`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
                {options.map((option) => (
                    <label key={option.value} className={value === option.value ? "is-on" : ""}>
                        <input type="radio" name={name} checked={value === option.value} onChange={() => onChange(option.value)} />
                        <i className={`fa-solid ${option.icon}`} aria-hidden="true" style={option.scale ? { fontSize: `${option.scale}px` } : undefined} />
                        <span>{option.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

export default function SignupPetFields({ pet, options, agreePetLens, setAgreePetLens, onOpenPetDoc, busy }: {
    pet: SignupWebPetState;
    options: SignupWebPetOptions;
    agreePetLens: boolean;
    setAgreePetLens: (value: boolean) => void;
    onOpenPetDoc: () => void;
    /** 가입 처리 중(사진 고르기 막음) */
    busy: boolean;
}) {
    const views = options.photoViews;
    const photoCount = views.filter((view) => pet.photos[view.id]).length;
    const frontPhoto = pet.photos.front?.dataUrl || views.map((view) => pet.photos[view.id]?.dataUrl).find(Boolean);
    const breed = PET_BREEDS.find((item) => item.id === pet.breedId);
    const breedLabel = pet.breedId === options.customBreed ? pet.breedCustom.trim() : breed?.ko || "";
    const weight = pet.weightKg.trim();

    // 프로필 채움 — 사진 · 이름 · 견종 · 나이 · 체중 · 털 색
    const filled = [photoCount > 0, Boolean(pet.name.trim()), Boolean(breedLabel), Boolean(pet.age.trim()), Boolean(weight), Boolean(pet.coatColor.trim())];
    const filledCount = filled.filter(Boolean).length;
    const hasAiHint = Boolean(pet.analysisMessage || pet.weightEstimate || pet.coatColorFromAi);

    return (
        <div className="sxw-pet">
            {/* 1) 우리 아이 카드 — 입력하는 대로 채워짐 */}
            <div className="sxw-petcard" aria-live="polite">
                <span className={frontPhoto ? "sxw-petcard-photo is-photo" : "sxw-petcard-photo"}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- 회원 사진 · 3D 그림 */}
                    <img src={frontPhoto || `${UI}mypet-view-front-160.webp`} alt={frontPhoto ? "우리 아이 대표 사진" : ""} />
                    {pet.sex !== "unknown" && (
                        <em data-sex={pet.sex} aria-label={SEX_LABEL[pet.sex]}><i className={pet.sex === "female" ? "fa-solid fa-venus" : "fa-solid fa-mars"} aria-hidden="true" /></em>
                    )}
                </span>
                <span className="sxw-petcard-body">
                    <span className="sxw-kicker">MY DOG PROFILE</span>
                    <b className={pet.name.trim() ? "sxw-u" : "is-empty"}>{pet.name.trim() || "이름을 지어 주세요"}</b>
                    <span className="sxw-petcard-tags">
                        <span className={breedLabel ? "" : "is-empty"}><i className="fa-solid fa-dog" aria-hidden="true" />{breedLabel || "견종"}</span>
                        <span><i className="fa-solid fa-ruler" aria-hidden="true" />{SIZE_LABEL[pet.size]}</span>
                        <span className={pet.age.trim() ? "" : "is-empty"}><i className="fa-solid fa-cake-candles" aria-hidden="true" />{pet.age.trim() || "나이"}</span>
                        <span className={weight ? "" : "is-empty"}><i className="fa-solid fa-weight-scale" aria-hidden="true" />{weight ? `${weight}kg` : "체중"}</span>
                    </span>
                </span>
                <span className="sxw-petcard-meter" aria-label={`프로필 ${filledCount}/6 채움`}>
                    <small>프로필</small>
                    <b>{filledCount}<span>/6</span></b>
                    <span className="sxw-petcard-dots" aria-hidden="true">
                        {filled.map((on, index) => <i key={index} className={on ? "is-on" : ""} />)}
                    </span>
                </span>
            </div>

            {/* 2) 사진 */}
            <SxBlock icon="fa-camera" tone="yellow" title="사진" extra={<em className="sxw-count">{photoCount}/4</em>}>
                <ul className="sxw-phototips" aria-label="잘 나오는 사진">
                    <li><i className="fa-solid fa-sun" aria-hidden="true" />밝은 곳에서</li>
                    <li><i className="fa-solid fa-expand" aria-hidden="true" />몸 전체가 보이게</li>
                    <li><i className="fa-solid fa-dog" aria-hidden="true" />한 마리만</li>
                </ul>
                <div className={pet.photoLoading ? "sxw-shots is-busy" : "sxw-shots"} data-petlens-multiview-upload>
                    {views.map((view) => {
                        const photo = pet.photos[view.id as PetPhotoViewId];
                        return (
                            <label key={view.id} className={photo ? "sxw-shot is-on" : "sxw-shot"} data-petlens-photo-view={view.id}>
                                {/* eslint-disable-next-line @next/next/no-img-element -- 회원 사진 · 3D 그림 */}
                                <img src={photo ? photo.dataUrl : `${UI}mypet-view-${view.id}-160.webp`} alt={photo ? `${view.label} 반려견 사진` : ""} />
                                <small>{view.label}{view.id === "front" ? " · 대표" : ""}</small>
                                {photo ? (
                                    <b className="sxw-shot-ok" aria-hidden="true"><i className="fa-solid fa-check" /></b>
                                ) : (
                                    <b className="sxw-shot-add" aria-hidden="true"><i className="fa-solid fa-plus" /></b>
                                )}
                                <em>{photo ? "다시 고르기" : view.helper}</em>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    disabled={pet.photoLoading || busy}
                                    data-petlens-mobile-camera-capture
                                    onChange={(event) => {
                                        pet.onPhoto(view.id as PetPhotoViewId, event.target.files?.[0]);
                                        event.currentTarget.value = "";
                                    }}
                                />
                            </label>
                        );
                    })}
                    {pet.photoLoading && (
                        <span className="sxw-shots-busy" role="status">
                            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />사진을 살펴보는 중이에요
                        </span>
                    )}
                </div>
                {pet.photoError && <span className="sxw-err">{pet.photoError}</span>}
                <span className="sxw-hint">정면 한 장이면 충분해요. 모바일에서는 카메라가 바로 열리고, 네 방향을 다 찍으면 견종 · 체형 · 털색 후보를 더 꼼꼼히 찾아요.</span>
            </SxBlock>

            {/* 3) 사진으로 찾은 후보 */}
            {hasAiHint && (
                <div className="sxw-aicard" data-petlens-signup-draft-restored aria-live="polite">
                    <p className="sxw-aicard-h">
                        <span aria-hidden="true"><i className="fa-solid fa-wand-magic-sparkles" /></span>
                        사진으로 찾은 후보
                        <small>후보예요 · 아래에서 직접 확인해 주세요</small>
                    </p>
                    {pet.analysisMessage && <p className="sxw-aicard-t">{pet.analysisMessage}</p>}
                    <span className="sxw-aicard-chips">
                        {breedLabel && <span><i className="fa-solid fa-dog" aria-hidden="true" />견종 · {breedLabel}</span>}
                        {pet.weightEstimate && <span><i className="fa-solid fa-weight-scale" aria-hidden="true" />예상 {pet.weightEstimate.minKg}~{pet.weightEstimate.maxKg}kg</span>}
                        {pet.coatColorFromAi && pet.coatColor && <span><i className="fa-solid fa-palette" aria-hidden="true" />털 색 · {pet.coatColor}</span>}
                    </span>
                </div>
            )}

            {/* 4) 기본 정보 */}
            <SxBlock icon="fa-paw" title="기본 정보" tone="sky">
                <div className="sxw-form">
                    <label className="sxw-f">
                        <span className="sxw-label">이름</span>
                        <input className="sxw-in" value={pet.name} onChange={(event) => pet.setName(event.target.value)} maxLength={80} placeholder="예: 몽이" />
                    </label>
                    <label className="sxw-f">
                        <span className="sxw-label">나이 <small>사진으로 정하지 않아요</small></span>
                        <input className="sxw-in" value={pet.age} onChange={(event) => pet.setAge(event.target.value)} maxLength={80} placeholder="예: 3살, 8개월" />
                    </label>

                    <div className="sxw-f is-wide">
                        <span className="sxw-label" id="sxw-breed-label">견종 <small>자주 고르는 견종</small></span>
                        <span className="sxw-breeds" role="group" aria-labelledby="sxw-breed-label">
                            {POPULAR_BREEDS.map((id) => {
                                const item = PET_BREEDS.find((entry) => entry.id === id);
                                if (!item) return null;
                                const on = pet.breedId === id;
                                return (
                                    <button key={id} type="button" className={on ? "is-on" : ""} aria-pressed={on} onClick={() => pet.onBreedId(on ? "" : id)}>
                                        {on && <i className="fa-solid fa-check" aria-hidden="true" />}{item.ko}
                                    </button>
                                );
                            })}
                            <button type="button" className={pet.breedId === options.customBreed ? "is-on is-mix" : "is-mix"} aria-pressed={pet.breedId === options.customBreed} onClick={() => pet.onBreedId(options.customBreed)}>
                                <i className="fa-solid fa-pen" aria-hidden="true" />믹스 · 직접 입력
                            </button>
                        </span>
                        <select className="sxw-in" value={pet.breedId} onChange={(event) => pet.onBreedId(event.target.value)} aria-label="전체 견종에서 고르기">
                            <option value="">전체 견종에서 고르기(120종)</option>
                            <option value={options.customBreed}>목록 외 견종 · 믹스견 직접 입력</option>
                            {PET_BREEDS.map((item) => (
                                <option key={item.id} value={item.id}>{item.ko} · {item.en}</option>
                            ))}
                        </select>
                        {pet.breedId === options.customBreed && (
                            <input className="sxw-in" value={pet.breedCustom} onChange={(event) => pet.onBreedCustom(event.target.value)} maxLength={100} placeholder="예: 시바견, 골든두들, 믹스견" aria-label="실제 견종 또는 믹스견" data-petlens-custom-breed />
                        )}
                        <span className="sxw-hint">{pet.breedMessage || "사진 분석 결과는 후보예요. 실제 견종으로 확인해 주세요."}</span>
                    </div>

                    <IconPills
                        label="크기"
                        name="sxw-size"
                        value={pet.size}
                        onChange={pet.setSize}
                        options={[
                            { value: "small", label: "소형", icon: "fa-dog", scale: 12 },
                            { value: "medium", label: "중형", icon: "fa-dog", scale: 16 },
                            { value: "large", label: "대형", icon: "fa-dog", scale: 20 },
                        ]}
                    />
                    <label className="sxw-f">
                        <span className="sxw-label">현재 체중</span>
                        <span className="sxw-inwrap has-unit">
                            <input className="sxw-in" type="number" min="0.1" max="120" step="0.1" inputMode="decimal" value={pet.weightKg} onChange={(event) => pet.setWeightKg(event.target.value)} placeholder="직접 잰 체중" />
                            <span className="sxw-unit" aria-hidden="true">kg</span>
                        </span>
                        <span className="sxw-hint">{pet.weightEstimate ? `사진으로 본 예상은 ${pet.weightEstimate.minKg}~${pet.weightEstimate.maxKg}kg이에요. 실제 체중을 넣어 주세요.` : "사진으로 체중을 재지 않아요."}</span>
                    </label>
                </div>
            </SxBlock>

            {/* 5) 몸과 성격 */}
            <SxBlock icon="fa-heart" title="몸과 성격" tone="pink">
                <div className="sxw-form">
                    <IconPills
                        label="털 길이"
                        name="sxw-coat"
                        value={pet.coat}
                        onChange={pet.setCoat}
                        options={[
                            { value: "short", label: "단모", icon: "fa-minus" },
                            { value: "medium", label: "중모", icon: "fa-water" },
                            { value: "long", label: "장모", icon: "fa-wind" },
                        ]}
                    />
                    <div className="sxw-f">
                        <span className="sxw-label">털 색 {pet.coatColorFromAi && <small className="is-ai">사진 후보</small>}</span>
                        <span className="sxw-swatches" role="group" aria-label="털 색 바로 고르기">
                            {COAT_COLORS.map((color) => {
                                const on = pet.coatColor.trim() === color.label;
                                return (
                                    <button key={color.label} type="button" className={on ? "is-on" : ""} aria-pressed={on} aria-label={color.label} title={color.label} onClick={() => pet.onCoatColor(on ? "" : color.label)}>
                                        <i style={{ background: color.swatch }} aria-hidden="true" />
                                    </button>
                                );
                            })}
                        </span>
                        <input className="sxw-in" value={pet.coatColor} onChange={(event) => pet.onCoatColor(event.target.value)} maxLength={80} placeholder="예: 크림, 검정·갈색" aria-label="털 색" />
                    </div>
                    <IconPills
                        label="성별"
                        name="sxw-sex"
                        value={pet.sex}
                        onChange={pet.setSex}
                        options={[
                            { value: "female", label: "암컷", icon: "fa-venus" },
                            { value: "male", label: "수컷", icon: "fa-mars" },
                            { value: "unknown", label: "선택 안 함", icon: "fa-minus" },
                        ]}
                    />
                    <IconPills
                        label="활동량"
                        name="sxw-activity"
                        value={pet.activity}
                        onChange={pet.setActivity}
                        options={[
                            { value: "low", label: "차분해요", icon: "fa-couch" },
                            { value: "normal", label: "보통", icon: "fa-paw" },
                            { value: "high", label: "활발해요", icon: "fa-bolt" },
                        ]}
                    />
                    <div className="sxw-f is-wide">
                        <span className="sxw-label">관심 케어 <small>여러 개 골라도 돼요</small></span>
                        <span className="sxw-concerns">
                            {options.concerns.map((concern) => {
                                const on = pet.concerns.includes(concern);
                                return (
                                    <label key={concern} className={on ? "is-on" : ""}>
                                        <input type="checkbox" checked={on} onChange={() => pet.toggleConcern(concern)} />
                                        <span className="sxw-concern-i" aria-hidden="true"><i className={`fa-solid ${CONCERN_ICON[concern] || "fa-star"}`} /></span>
                                        {concern}
                                        {on && <i className="fa-solid fa-check sxw-concern-ok" aria-hidden="true" />}
                                    </label>
                                );
                            })}
                        </span>
                    </div>
                </div>
            </SxBlock>

            {/* 6) 선택 동의 */}
            <div className={agreePetLens ? "sxw-consent is-on" : "sxw-consent"} data-signup-petlens-optional-consent>
                <label>
                    <SxCheck checked={agreePetLens} onChange={setAgreePetLens} />
                    <span>
                        <span className="sxw-opt">선택</span> 반려동물 정보 수집·이용에 동의해요
                        <small>사진 · 견종 · 체중 등을 맞춤 추천과 서비스 개선에만 써요. 동의하지 않으면 우리 아이 정보는 저장하지 않아요.</small>
                    </span>
                </label>
                <button type="button" className="sxw-view" onClick={onOpenPetDoc}>내용 <i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>
            </div>
        </div>
    );
}
