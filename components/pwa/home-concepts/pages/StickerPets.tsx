"use client";

/**
 * 스티커북 — 우리 아이(/app/sticker/pets) · 앱 전용 반려견 프로필 화면(2026-10-28 사용자 "반려견 프로필 추가·수정을 앱 화면으로")
 * ---------------------------------------------------------------------
 * 웹 마이페이지 "반려견 프로필" 칸(app/mypage/page.tsx #pet-profiles)과 같은 정보 · 같은 부품을 앱 다이어리 한 장으로.
 *  - 아이마다 테이프 붙인 종이 카드: 폴라로이드 사진(서버가 확인한 사진만 — hasVerifiedPetPhoto) · 형광펜 이름 · 견종 ·
 *    크기 · 나이 · 모질 / 체중 · 성별 / 털 색 · 활동량(웹과 같은 글) · 자동 피팅 도장 · 관심 케어 칩 4개
 *  - 정보 수정 = 협업자 MemberPetProfileEditor 그대로(같은 검사 · 같은 저장) · 주간 리포트 = 앱 건강 변화 리포트(그 아이 먼저)
 *  - 아이 추가 = 협업자 MemberPetProfileCreateForm 그대로(이름 · 견종 · 동의 필수, 같은 저장)
 *  - 등록 · 수정 창: PetAppSheet 로 감싸 웹과 같은 창(PetProfileModal)을 앱에서도 띄움 — 겉모양은 appShopSkin "반려견 프로필 창"(아래에서 올라오는 스티커북 시트)
 *  - 펫렌즈 열기(서버 등록 · 실제 견종 확인을 마친 아이가 있을 때) / 아니면 웹과 같은 안내 메모
 * 주소: ?petProfile=required(펫렌즈 · 리포트의 "반려견 등록하기", 웹과 같은 뜻) · ?add=1(마이 "아이 추가" — 기존 등록 버튼을 대신 눌러 창을 엶)
 * 로그인 전: 앱 로그인 초대.
 */

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import MemberPetProfileCreateForm from "@/components/mypage/MemberPetProfileCreateForm";
import MemberPetProfileEditor from "@/components/mypage/MemberPetProfileEditor";
import { PetAppSheet } from "@/components/mypage/PetProfileModal";
import { hasPetLensReadyProfile, PETLENS_PAGE_HREF, petLensProfileNeedsAttention } from "@/lib/petlens-routing";
import { hasVerifiedPetPhoto, useAuth, type PetProfile } from "@/lib/store";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { HC_CSS, useDemoSession } from "../shared";
import { DiaryBody, InkStamp, PARTS_CSS, SectionLabel } from "../sticker-parts";
import { LoginInvite, Patch, STICKER_CSS, Tape } from "../sticker-kit";

const REDIRECT = "/app/sticker/pets/";
const APP_REPORT = "/app/sticker/report/";

/* 웹 마이페이지와 같은 표시 글(sizeLabel · coatLabel · activityLabel · sexLabel) */
const sizeLabel = (size: PetProfile["size"]) => (size === "small" ? "소형" : size === "large" ? "대형" : "중형");
const coatLabel = (coat: PetProfile["coat"]) => (coat === "short" ? "단모" : coat === "long" ? "장모" : "중모");
const activityLabel = (activity: PetProfile["activity"]) => (activity === "low" ? "차분한 편" : activity === "high" ? "활동량 많음" : "보통 활동량");
const sexLabel = (sex: PetProfile["sex"]) => (sex === "female" ? "암컷" : sex === "male" ? "수컷" : "성별 미입력");
/** 웹과 같은 카드 열쇠(서버 번호가 있으면 그 번호) */
const petKey = (pet: PetProfile, index: number) => (pet.apiProfileId ? `pet-profile-id-${pet.apiProfileId}` : `pet-profile-local-${index}-${pet.name}`);

/* 주소 값 — 서버 그리기는 false, 화면에서는 주소에서 읽음(웹 마이페이지 profileRouteRequested 와 같은 방법) */
const noopSubscribe = () => () => {};
const readParam = (key: string, value: string) => () => new URLSearchParams(window.location.search).get(key) === value;

/* 카드 테이프 · 폴라로이드 기울기 차례 */
const TAPES = ["rgba(255,200,215,.88)", "rgba(190,230,210,.9)", "rgba(255,226,150,.9)", "rgba(210,200,255,.9)"];

export default function StickerPets() {
    const [session] = useDemoSession();
    const member = session === "member";
    const { user } = useAuth();
    const pets = user?.pets ?? [];
    // ?petProfile=required — 등록이 필요해서 온 경우(아이가 없으면 등록 창, 고칠 아이가 있으면 그 아이 수정 창)
    const profileRequired = useSyncExternalStore(noopSubscribe, readParam("petProfile", "required"), () => false);
    // ?add=1 — 마이 "아이 추가": 이미 아이가 있어도 등록 창을 바로 엶(기존 등록 버튼을 대신 누름)
    const addRequested = useSyncExternalStore(noopSubscribe, readParam("add", "1"), () => false);
    const needsAttentionIndex = pets.findIndex(petLensProfileNeedsAttention);
    const petLensReady = Boolean(user && hasPetLensReadyProfile(pets));
    const addRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!member || !addRequested) return;
        const timer = window.setTimeout(() => {
            addRef.current?.querySelector<HTMLButtonElement>("[data-member-pet-create-open]")?.click();
        }, 120);
        return () => window.clearTimeout(timer);
    }, [member, addRequested]);

    return (
        <div className="ap-pets relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + PETS_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">
                <DiaryBody pageKey={member ? "pets" : "guest"} dir={1}>
                    {!member ? (
                        <LoginInvite redirect={REDIRECT} title={["로그인하고", "우리 아이 등록하기"]} cta="로그인하고 등록하기"
                            items={[{ icon: "fa-dog", text: "우리 아이 프로필 등록 · 수정" }, { icon: "fa-camera", text: "펫렌즈 사진 분석 · 주간 리포트" }]} />
                    ) : (
                        <PetAppSheet>
                            {/* 머리 — 웹 "반려견 프로필" 칸 제목 · 자동 피팅 준비 꼬리표 */}
                            <p className="ah-light text-[10.5px] tracking-[.16em] text-[#c4567a]">MY DOG</p>
                            <div className="mt-0.5 flex items-center justify-between gap-2">
                                <h2 className="ah-display text-[20px] leading-snug"><span className="st-marker">반려견 프로필</span></h2>
                                {pets.some(hasVerifiedPetPhoto) ? <InkStamp rot={-6} color="#1f9e75" className="shrink-0 whitespace-nowrap !px-2 !py-0.5 text-[10.5px]">자동 피팅 준비</InkStamp> : null}
                            </div>
                            <p className="ah-light mt-1 text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>
                                직접 확인한 정보로 고치면 추천 · 펫렌즈 · 연구소가 같은 아이를 기준으로 분석해요.
                            </p>

                            {pets.length > 0 ? (
                                <ul className="mt-5 grid gap-5">
                                    {pets.map((pet, index) => {
                                        const photo = hasVerifiedPetPhoto(pet);
                                        return (
                                            <li key={petKey(pet, index)} id={`pet-${index}`} className="pp-card relative scroll-mt-24 rounded-[4px_4px_18px_4px] px-3.5 pb-3.5 pt-5" style={{ rotate: `${index % 2 ? 0.5 : -0.5}deg` }}>
                                                <Tape className="-top-2 left-7 h-3.5 w-12" color={TAPES[index % TAPES.length]} style={{ rotate: `${index % 2 ? 4 : -4}deg` }} />
                                                <div className="flex items-start gap-3">
                                                    {/* 폴라로이드 — 서버가 확인한 사진만(웹과 같은 기준), 없으면 발바닥 */}
                                                    <span className="st-polaroid relative block w-[5.9rem] shrink-0 bg-white p-1.5 pb-4" style={{ rotate: `${index % 2 ? 2.5 : -2.5}deg` }}>
                                                        <span className="relative grid aspect-square place-items-center overflow-hidden bg-[#fff3e8]">
                                                            {photo
                                                                // eslint-disable-next-line @next/next/no-img-element -- 회원 사진(서버 주소 · data URL)
                                                                ? <img src={pet.photoDataUrl} alt={`${pet.name} 사진`} className="h-full w-full object-cover" />
                                                                : <i aria-hidden="true" className="fa-solid fa-camera text-[20px] text-[#f4b9ca]" />}
                                                        </span>
                                                    </span>
                                                    <div className="min-w-0 flex-1 pt-0.5">
                                                        <h3 className="ah-display truncate text-[18px] leading-tight"><span className="st-marker">{pet.name}</span></h3>
                                                        {pet.breed ? <p className="ah-display mt-1 text-[13px] text-[#c4456f]">{pet.breed}</p> : null}
                                                        {/* 크기 · 나이 · 모질 — 작은 종이 칩 */}
                                                        <p className="mt-1.5 flex flex-wrap gap-1">
                                                            {[sizeLabel(pet.size), pet.age, coatLabel(pet.coat)].filter(Boolean).map((t) => <span key={t} className="pp-chip ah-display">{t}</span>)}
                                                        </p>
                                                        <p className="ah-light mt-1.5 text-[11.5px] leading-snug" style={{ color: TEXT_SOFT }}>
                                                            {pet.weightKg !== undefined ? `${pet.weightKg}kg` : "체중 미입력"} · {sexLabel(pet.sex)}
                                                        </p>
                                                        <p className="ah-light text-[11.5px] leading-snug" style={{ color: TEXT_SOFT }}>{pet.coatColor ? `${pet.coatColor} · ` : ""}{activityLabel(pet.activity)}</p>
                                                    </div>
                                                </div>
                                                {/* 자동 피팅 — 사진이 있으면 초록 도장, 없으면 웹과 같은 안내 */}
                                                {photo ? (
                                                    <p className="ah-display mt-3 flex items-center gap-1.5 text-[11.5px] text-[#1f9e75]"><i aria-hidden="true" className="fa-solid fa-shirt text-[10px]" />착용 상품 자동 피팅 가능</p>
                                                ) : (
                                                    <p className="ah-light mt-3 text-[11.5px]" style={{ color: TEXT_SOFT }}><i aria-hidden="true" className="fa-solid fa-camera mr-1 text-[10px] text-[#f08eae]" />사진을 올리면 자동 피팅이 켜져요</p>
                                                )}
                                                {pet.concerns.length > 0 ? (
                                                    <p className="mt-2 flex flex-wrap gap-1.5">
                                                        {pet.concerns.slice(0, 4).map((c) => <span key={c} className="pp-concern ah-light">{c}</span>)}
                                                    </p>
                                                ) : null}
                                                {/* 아래 줄 — 주간 리포트(서버 프로필이 있을 때) · 정보 수정(협업자 부품 그대로, 앱 스킨이 작은 와펜으로) */}
                                                <div className="pp-actions mt-3 flex items-center justify-end gap-2 border-t border-dashed border-[#efdcd2] pt-3">
                                                    {pet.apiProfileId ? (
                                                        <Link href={`${APP_REPORT}?profile=${pet.apiProfileId}`} className="pp-link ah-display">
                                                            <i aria-hidden="true" className="fa-solid fa-chart-line text-[10px]" />주간 리포트
                                                        </Link>
                                                    ) : null}
                                                    <MemberPetProfileEditor
                                                        key={`${petKey(pet, index)}-${profileRequired && index === needsAttentionIndex ? "required" : "default"}`}
                                                        pet={pet}
                                                        initiallyOpen={profileRequired && index === needsAttentionIndex}
                                                    />
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                // 아직 아이가 없을 때 — 웹과 같은 안내(앱은 노란 메모)
                                <p className="st-postit ah-light relative mt-5 px-3.5 pb-3 pt-4 text-[12.5px] leading-relaxed" style={{ background: "#fff3a6", rotate: "-0.6deg" }}>
                                    <Tape className="-top-2 left-6 h-3.5 w-11" color="rgba(255,200,215,.88)" style={{ rotate: "-4deg" }} />
                                    먼저 우리 아이 이름과 실제 견종을 등록해 주세요. 저장이 끝나면 펫렌즈 사진 분석과 댕다방 연구소 행동·소리 분석을 바로 시작할 수 있어요.
                                </p>
                            )}

                            {/* 아이 추가 — 협업자 등록 부품 그대로(누르면 아래에서 등록 창) */}
                            <div ref={addRef} className="pp-add">
                                <MemberPetProfileCreateForm key={profileRequired ? "required" : "default"} initiallyOpen={profileRequired} />
                            </div>

                            {/* 다음 할 일 — 펫렌즈(준비된 아이가 있을 때) 또는 웹과 같은 안내 */}
                            <SectionLabel className="mt-7" icon="fa-wand-magic-sparkles">이어서 하기</SectionLabel>
                            {petLensReady ? (
                                <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                                    <Patch href={PETLENS_PAGE_HREF} small><i aria-hidden="true" className="fa-solid fa-camera text-[11px]" />펫렌즈 분석</Patch>
                                    <Patch href={APP_REPORT} small tone="cream"><i aria-hidden="true" className="fa-solid fa-chart-line text-[11px]" />주간 리포트</Patch>
                                </div>
                            ) : pets.length > 0 ? (
                                <p className="ah-light mt-3 rounded-[4px_4px_14px_4px] bg-[#fff3e0] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#9a5b12]">
                                    위 프로필의 ‘정보 수정’에서 서버 등록과 실제 견종 확인을 마치면 펫렌즈 버튼이 열려요.
                                </p>
                            ) : (
                                <p className="ah-light mt-3 text-[12px]" style={{ color: TEXT_SOFT }}>아이를 등록하면 펫렌즈 사진 분석과 주간 리포트를 시작할 수 있어요.</p>
                            )}
                        </PetAppSheet>
                    )}
                </DiaryBody>
            </div>
        </div>
    );
}

/* 우리 아이 화면 CSS — 카드 · 칩 · 링크(협업자 부품의 단추 · 안내 · 창 겉모양은 appShopSkin "우리 아이 화면 · 반려견 프로필 창") */
const PETS_CSS = `
/* 아이 카드: 흰 종이(테이프로 붙임) */
.pp-card { background: #fff; box-shadow: inset 0 0 0 1.5px #f3e6dc, 0 12px 18px -13px rgba(120,80,60,.5); }
/* 크기 · 나이 · 모질 칩: 크림 종이 스티커 */
.pp-chip { padding: 2px 8px; border-radius: 999px; background: #fff6ee; color: #8a5a48; font-size: 11px; box-shadow: inset 0 0 0 1.2px #f6dccd; }
/* 관심 케어: 분홍 작은 스티커 */
.pp-concern { padding: 2px 9px; border-radius: 999px; background: #ffe1ea; color: #b23a5e; font-size: 10.5px; box-shadow: 0 0 0 1.5px #fff, 0 3px 6px -4px rgba(200,70,110,.45); }
/* 주간 리포트: 글자 링크(작은 와펜 옆 보조) — 누르면 살짝 흐려짐 */
.pp-link { display: inline-flex; align-items: center; gap: 5px; padding: 0 6px; height: 32px; color: #6a52c4; font-size: 12.5px; -webkit-tap-highlight-color: transparent; }
.pp-link:active { opacity: .6; }
`;
