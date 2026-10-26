"use client";

/*
 * HealthReport — 웹 "건강 변화 리포트"(/health-report/) 화면 · 2026-10-23 사용자 선택 H2(변화 일기 카드)
 * ---------------------------------------------------------------------
 * 댕다방 연구소 메뉴 "건강 변화 리포트"가 우리 아이 기록(/my-pet/)과 같은 페이지로 가던 것을 따로 나눔.
 *  - 우리 아이 기록 = 기록하는 곳(주인공 소개 · 이번 주 사진 찍기 · 지난 쪽)
 *  - 건강 변화 리포트 = 읽는 곳(여러 주를 이어 무엇이 새로 보이고 · 그대로이고 · 안 보이는지)
 * 데이터는 우리 아이 기록과 같은 주간 사진 기록(loadWeeklyPhotoAnalyses) 그대로 — 서버 · 기능 변경 없음, 읽기만.
 * 구성: 민트 머리 판(아이 고르기) → 발자국 → 변화 일기(왼쪽 날짜 · 가운데 줄 · 오른쪽 카드 = 이야기 | 케어).
 * 꾸밈은 app/lab-web.css 7부(웹 data-lab-web 범위). 앱에서는 AppShell 이 앱 건강 변화 리포트 화면으로 보냄.
 */

import { useEffect, useState } from "react";
// 웹/앱 문구 갈림(웹은 해요체, 2026-10-26)
import { useWebScreen } from "@/hooks/useWebScreen";
import Image from "next/image";
import Link from "next/link";
import { CrayonGrainFilter, PawTrail } from "@/components/daily/CrayonArt";
import { useAuth } from "@/lib/store";
import { PETLENS_PHOTO_VIEWS } from "@/lib/petlens-multiview";
import { getPetBreedVisual, resolvePetBreedId } from "@/lib/pet-companion-breeds";
import { loadWeeklyPhotoAnalyses, type WeeklyPhotoAnalysisRecord } from "@/lib/weekly-photo-analysis";

// 카드 바탕 차례 — 이번 주 분홍, 지난주부터 연보라 · 민트 · 노랑
const CARD_TINTS = ["is-pink", "is-lav", "is-mint", "is-yellow"];
const BREED_ART_ROOT = "/images/pet-companion/cute-v4-breeds";

// 카드 머리 날짜("10월 21일")
function shortDate(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" }).format(date);
}

// 색 점 줄 하나(새로 보인 것 · 계속 보이는 것 · 이번엔 안 보인 것 · 케어 · 사진에서 본 것)
function Marks({ items, kind }: { items: string[]; kind: "new" | "same" | "gone" | "care" | "seen" }) {
    if (items.length === 0) return null;
    return <>{items.map((item) => <li key={`${kind}-${item}`} className={`hr-mark is-${kind}`}>{item}</li>)}</>;
}

// 변화 일기 카드 한 장 — 왼쪽 칸: 제목 · 비교 한 줄 · 새로/계속/안 보임(비교 전이면 사진에서 본 것) · 방향 점, 오른쪽 칸: 케어
function DiaryCard({ record, index }: { record: WeeklyPhotoAnalysisRecord; index: number }) {
    const isNow = index === 0;
    const compared = record.comparison.status === "ready";
    return (
        <article className={`dw-csheet ${CARD_TINTS[index % CARD_TINTS.length]} hr-card`}>
            <div>
                <h3>{record.title || "주간 사진 기록"}</h3>
                {record.comparison.headline && <p className="hr-headline">{record.comparison.headline}</p>}
                <ul className="hr-marks">
                    {compared ? (
                        <>
                            <Marks items={record.comparison.newObservations} kind="new" />
                            <Marks items={record.comparison.commonObservations} kind="same" />
                            <Marks items={record.comparison.notObservedNow} kind="gone" />
                        </>
                    ) : (
                        <Marks items={record.observations} kind="seen" />
                    )}
                </ul>
                <p className="hr-meta">
                    <span className="hr-dots" aria-hidden="true">
                        {PETLENS_PHOTO_VIEWS.map((view) => <i key={view.id} className={record.viewIds.includes(view.id) ? "is-on" : ""} />)}
                    </span>
                    {record.viewCount}방향{record.photoQualityLabel ? ` · ${record.photoQualityLabel}` : ""}
                </p>
            </div>
            {record.careActions.length > 0 && (
                <div>
                    <p className="hr-care-head">{isNow ? "이번 주 케어" : "그 주의 케어"}</p>
                    <ul className="hr-marks"><Marks items={record.careActions} kind="care" /></ul>
                </div>
            )}
        </article>
    );
}

export default function HealthReport() {
    const { hydrated, user } = useAuth();
    // 웹 화면인가(웹은 해요체 문구)
    const webScreen = useWebScreen();
    const [selectedPetId, setSelectedPetId] = useState<number | undefined>();
    const [weeklyState, setWeeklyState] = useState<{
        profileId?: number;
        items: WeeklyPhotoAnalysisRecord[];
        loading: boolean;
        error?: string;
    }>({ items: [], loading: false });
    const pet = user?.pets.find((candidate) => candidate.apiProfileId === selectedPetId) || user?.pets[0];
    const petProfileId = pet?.apiProfileId;
    const accessToken = user?.apiAccessToken;
    const records = weeklyState.profileId === petProfileId ? weeklyState.items : [];
    const loading = Boolean(petProfileId && accessToken) && (weeklyState.profileId !== petProfileId || weeklyState.loading);

    // ?profile=N 으로 들어오면 그 아이를 먼저 고름(우리 아이 기록과 같은 규칙)
    useEffect(() => {
        const profileId = Number(new URLSearchParams(window.location.search).get("profile"));
        const timer = window.setTimeout(() => {
            if (Number.isInteger(profileId) && profileId > 0 && user?.pets.some((item) => item.apiProfileId === profileId)) {
                setSelectedPetId(profileId);
            }
        }, 0);
        return () => window.clearTimeout(timer);
    }, [user?.pets]);

    // 주간 사진 기록 불러오기 — 우리 아이 기록과 같은 함수 · 같은 개수
    useEffect(() => {
        if (!petProfileId || !accessToken) return;
        let active = true;
        const timer = window.setTimeout(() => {
            if (!active) return;
            setWeeklyState({ profileId: petProfileId, items: [], loading: true });
            void loadWeeklyPhotoAnalyses({ petProfileId, accessToken, limit: 8 }).then((items) => {
                if (active) setWeeklyState({ profileId: petProfileId, items, loading: false });
            }).catch(() => {
                if (active) setWeeklyState({ profileId: petProfileId, items: [], loading: false, error: "주간 사진 기록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요." });
            });
        }, 0);
        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [accessToken, petProfileId]);

    if (!hydrated) {
        return (
            // 불러오는 중 — 앱은 원래 회색 글씨(wl-app), 웹은 3D 그림 + 해요체 쿠션(wl-card, daily-web.css data-web-loading)
            <main className="mx-auto grid min-h-[50vh] w-full max-w-[1280px] place-items-center px-4 py-10 text-sm font-black text-neutral-500" data-daily-web data-lab-web data-web-loading>
                <span className="wl-app">건강 변화 리포트를 불러오는 중입니다.</span>
                <span className="hidden wl-card" role="status">
                    <Image src="/images/ui/menu-lab-report-128.webp" alt="" width={64} height={64} aria-hidden="true" />
                    <span>건강 변화 리포트를 불러오고 있어요</span>
                </span>
            </main>
        );
    }

    // 로그인 전 · 아이 등록 전 — 우리 아이 기록과 같은 안내 판
    if (!user || !pet) {
        return (
            <main className="mx-auto w-full max-w-[860px] px-4 py-14 text-center md:px-6" data-daily-web data-lab-web>
                <div className={`dw-gate ${user ? "dw-tint-yellow" : "dw-tint-sky"}`}>
                    <span className="dw-gate-art" aria-hidden="true">
                        <Image src="/images/ui/menu-lab-report-128.webp" alt="" width={150} height={150} priority />
                    </span>
                    <h1 className="ddb-crayon-title dw-h2">{user ? "먼저 우리 아이를 등록해 주세요" : "건강 변화 리포트는 로그인 후 볼 수 있어요"}</h1>
                    <p className="dw-sub">{user ? "프로필이 생기면 매주 찍은 사진의 변화가 이곳에 이어져요." : "매주 찍은 우리 아이 사진을 이어서, 무엇이 달라졌는지 정리해 드려요."}</p>
                    <Link href={user ? "/mypage/?profile=required#pet-profiles" : "/auth/login/?redirect=%2Fhealth-report"} className="ddb-crayon-link dw-pill dw-pill-main mt-6">
                        {user ? "반려견 등록하기" : "로그인하기"}
                    </Link>
                </div>
            </main>
        );
    }

    const switchablePets = user.pets.filter((item) => item.apiProfileId);
    const pageNumber = (index: number) => records.length - index;

    return (
        <main className="mx-auto w-full max-w-[1280px] px-4 py-10 md:px-6 md:py-14" data-daily-web data-lab-web data-health-report>
            <CrayonGrainFilter />

            {/* 머리 판 — 이름표 · 제목 · 설명 · 아이 고르기(견종 그림 알약) · 리포트 그림 고리 */}
            <section className="dw-csheet is-mint hr-hero ddb-hero-band" aria-labelledby="hr-title">
                <div className="min-w-0">
                    <p className="ddb-crayon-kicker dw-kicker">DAENGDABANG LAB · HEALTH REPORT</p>
                    <h1 id="hr-title" className="hr-title">{pet.name}의 <span className="ddb-crayon-underline">건강 변화 리포트</span></h1>
                    <p className="hr-lead">매주 찍은 네 방향 사진을 이어서, 무엇이 새로 보이고 무엇이 그대로인지 정리했어요. 진단이 아니라 사진으로 본 변화예요.</p>
                    {switchablePets.length > 1 && (
                        <div className="hr-pets" role="group" aria-label="리포트를 볼 반려견">
                            {switchablePets.map((item) => {
                                const active = item.apiProfileId === pet.apiProfileId;
                                const art = `${BREED_ART_ROOT}/${getPetBreedVisual(resolvePetBreedId(item.breed || "")).assetId}-poster.webp`;
                                return (
                                    <button key={item.apiProfileId} type="button" aria-pressed={active} onClick={() => setSelectedPetId(item.apiProfileId)} className={`hr-pet ${active ? "is-on" : ""}`}>
                                        <span className="hr-pet-face">
                                            <Image src={item.photoDataUrl || art} alt="" width={34} height={34} unoptimized={Boolean(item.photoDataUrl)} />
                                        </span>
                                        {item.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                <span className="hr-ring" aria-hidden="true">
                    <span><Image src="/images/ui/menu-lab-report-128.webp" alt="" width={120} height={120} priority /></span>
                </span>
            </section>

            <PawTrail />

            {/* 변화 일기 — 최근 주가 맨 위 */}
            <section className="hr-diary-wrap" aria-labelledby="hr-diary-title">
                <h2 id="hr-diary-title" className="hr-h2">변화 일기</h2>
                <ul className="hr-legend" aria-label="점 색 안내">
                    <li className="is-new">새로 보인 것</li>
                    <li className="is-same">계속 보이는 것</li>
                    <li className="is-gone">이번엔 안 보인 것</li>
                    <li className="is-care">케어</li>
                </ul>

                {weeklyState.error && weeklyState.profileId === petProfileId && (
                    <p className="hr-note is-error" role="alert">{webScreen ? "주간 사진 기록을 불러오지 못했어요. 잠시 후 다시 확인해 주세요." : weeklyState.error}</p>
                )}

                {loading ? (
                    <p className="hr-note" role="status">{pet.name}의 주간 기록을 불러오는 중이에요.</p>
                ) : records.length === 0 ? (
                    // 아직 기록 없음 — 우리 아이 기록의 이번 주 촬영으로
                    <div className="hr-empty">
                        <Image src="/images/ui/mypet-shutter-384.webp" alt="" width={120} height={120} aria-hidden="true" />
                        <div>
                            <h3>아직 주간 사진 기록이 없어요</h3>
                            <p>우리 아이 기록에서 이번 주 네 방향 사진을 찍으면, 여기에서 주마다 달라진 점을 이어 볼 수 있어요.</p>
                            <Link href={`/my-pet/?profile=${pet.apiProfileId}#weekly-camera`} className="hr-link">이번 주 사진 찍으러 가기 →</Link>
                        </div>
                    </div>
                ) : (
                    <ol className="hr-diary">
                        {records.map((record, index) => (
                            <li key={record.id} className={`hr-entry ${index === 0 ? "is-now" : ""}`}>
                                <p className="hr-when">
                                    <b>{shortDate(record.analyzedAt)}</b>
                                    <small>{pageNumber(index)}쪽{index === 0 ? " · 최근" : ""}</small>
                                </p>
                                <span className="hr-rail" aria-hidden="true"><i /></span>
                                <DiaryCard record={record} index={index} />
                            </li>
                        ))}
                    </ol>
                )}

                {records.length === 1 && (
                    <p className="hr-note">다음 주에 한 번 더 찍으면, 지난주와 비교한 변화가 여기에 이어져요.</p>
                )}

                {/* 아래 링크 — 이번 주 촬영만(지난 쪽은 이 리포트가 같은 최근 8주를 이미 모두 보여 줌, 2026-10-23 사용자) */}
                {records.length > 0 && (
                    <div className="hr-links">
                        <Link href={`/my-pet/?profile=${pet.apiProfileId}#weekly-camera`} className="hr-link">이번 주 사진 찍으러 가기 →</Link>
                    </div>
                )}
            </section>
        </main>
    );
}
