"use client";

/**
 * 스티커북 시안 — 연구소(/app/sticker/lab) · 로컬 시안 전용, 배포 X
 * ---------------------------------------------------------------------
 * 다이어리 속지 = 우리 아이 관찰 일기. 실제 기능(사진 분석 · 행동·소리 분석 · 주간 리포트)은 협업자 화면(/pet-lens · /my-pet)으로 이어진다.
 * 매일 댕생활과 같은 기준: 자수 와펜 버튼 · 종이/테이프/메모지 카드 · 줄 없는 종이 · 기울기 ±1도 · 터치 반응만.
 *  - 회원: 색인 탭 2개(우리 아이 · 기록), 옆으로 밀면 넘어감. 주소 ?tab=N 으로 바로 열림
 *    우리 아이: 아이 이름표(폴라로이드 + 견종 확인 도장 + 나이·몸무게 이름표, 줄 없음) ·
 *              이번 주 사진 4칸(정면 · 왼쪽 · 오른쪽 · 뒷면, 무료) + 지난 기록 메모 ·
 *              분석 두 가지 젤리 카드(사진·외형 무료 / 행동·소리 10코인 · 남은 횟수) ·
 *              행동·소리 분석 별개 기능 안내 · 코인이 모자라면 매일 댕생활(출근도장)로 가는 길 · 자동 환급 안내 ·
 *              응급 안내 메모(톡 하면 응급 증상 목록 — 협업자 문구)
  *    기록: 주간 기록(가로로 넘기는 메모 카드 · 새로 보임/이번엔 안 보임, 실제 기록처럼 사진 없음) · 행동·소리 분석 메모(긴급도 = 테이프 이름표) ·
 *          진단 아님 안내 · 주간 리포트 전체 보기(와펜 → 앱 전용 건강 변화 리포트 /app/sticker/report)
 *  - 로그인 전: 지난주 · 이번 주 예시 비교 폴라로이드(예시 도장) + 로그인 초대
 *  - 반려견 = 서버 프로필(apiProfileId)이 있는 첫 마리(웹 AppAiCareOverview), 없으면 반려견 등록하기 와펜 · 불러오는 중 / 실패(분홍 메모) / 없음을 나눔
 *  - 분석 카드 주소 = 웹 AppAiCareOverview 와 같은 profile 주소, 분석 기록 메모 = 그 기록 결과(협업자 ?observation= 딥링크)
 * 문구: 사진 방향 · 코인 · 긴급도 · 응급 안내는 협업자 연구소 화면 문구(docs/07 03-댕다방연구소.md). 그 밖 짧은 안내는 시안용.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { haptic } from "../gestures";
import { CoinChip, KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { LAB_EXAMPLE, WEEKLY_RECORDS, pageHref } from "../page-data";
import { hasVerifiedPetPhoto, useAuth, type PetProfile } from "@/lib/store";
import { loadPetObservationHistory, type PetObservationHistoryItem } from "@/lib/petlens-observation";
import { loadWeeklyPhotoAnalyses, type WeeklyPhotoAnalysisRecord } from "@/lib/weekly-photo-analysis";
import { PETLENS_PROFILE_SETUP_HREF, petLensObservationHref, petLensProfileHref } from "@/lib/petlens-routing";
import { ConceptBar, HC_CSS, useDemoSession, useTodayDemo, useInitialTab } from "../shared";
import { DiaryBody, DiaryTabs, InkStamp, PARTS_CSS, SectionLabel } from "../sticker-parts";
import { LoginInvite, STICKER_CSS, Tape, Patch } from "../sticker-kit";

const TABS = [
    { label: "우리 아이", color: "#ffe7c2" },
    { label: "기록", color: "#e8ddff" },
];
const REDIRECT = "/app/sticker/lab/";

/* 이번 주 사진 4방향 — 협업자 펫렌즈 촬영 칸과 같은 순서 · 설명 */
const SHOTS = [
    { label: "정면", hint: "얼굴 · 가슴" },
    { label: "왼쪽", hint: "옆선 · 다리" },
    { label: "오른쪽", hint: "반대 옆선" },
    { label: "뒷면", hint: "등선 · 꼬리" },
];

/* 긴급도 → 테이프 이름표 색(협업자 긴급도 4단계) */
/** 실제 주간 기록 → 사진첩 칸(주차 · 날짜 · 한 줄 비교 · 새로 보임 · 안 보임) */
function toWeekCard(r: WeeklyPhotoAnalysisRecord) {
    const d = new Date(r.analyzedAt);
    const valid = !Number.isNaN(d.getTime());
    return {
        week: valid ? `${d.getMonth() + 1}월 ${Math.ceil(d.getDate() / 7)}주` : r.weekKey,
        date: valid ? `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}` : "",
        headline: r.comparison.headline || r.title,
        added: r.comparison.newObservations.slice(0, 2),
        gone: r.comparison.notObservedNow.slice(0, 2),
    };
}

/** 협업자 PetLensObservationHistory 와 같은 긴급도 이름 */
const URGENCY_LABEL = { emergency: "즉시 병원 연락", same_day: "오늘 병원 문의", observe: "평소와 비교 관찰", unclear: "판단 어려움" } as const;
function toObservationCard(item: PetObservationHistoryItem) {
    const d = new Date(item.createdAt);
    return {
        key: item.id,
        date: Number.isNaN(d.getTime()) ? "" : `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`,
        urgency: URGENCY_LABEL[item.result.urgency.level] ?? "판단 어려움",
        // 웹 기록 목록(PetLensObservationHistory)과 같은 글 = result.summary
        summary: item.result.summary,
        // 누르면 그 기록의 결과 — 웹은 목록에서 openHistoryResult(item) 로 result 를 바로 띄우고,
        // 앱은 협업자 딥링크(/pet-lens/?observation=requestId → loadPetObservationJobStatus → 완료 결과를 같은 setResult 로 띄움)로 같은 결과를 엶.
        // 기록 id 가 곧 requestId(parsePetObservationHistoryItem), 형식이 틀리면 협업자 함수가 ?mode=observation 으로 돌려줌
        href: petLensObservationHref(item.requestId),
    };
}

/** 연구소에서 쓸 반려견 — 웹 AppAiCareOverview availablePets 와 같은 기준(apiProfileId 가 양의 정수) */
function availablePets(pets: PetProfile[]) {
    return pets.filter((p): p is PetProfile & { apiProfileId: number } => Number.isInteger(p.apiProfileId) && Number(p.apiProfileId) > 0);
}

/** 웹 마이펫 불러오기 실패 문구(MyPetHub weeklyState.error) 그대로 */
const WEEKLY_ERROR = "주간 사진 기록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";

/** 주간 기록 — 협업자 loadWeeklyPhotoAnalyses(웹 마이펫과 같은 함수)를 위 반려견 기준으로. 불러오는 중(null) · 실패(error) · 없음([])을 나눔 */
function useLabWeekly(petProfileId: number | undefined, limit = 6) {
    const { user } = useAuth();
    const token = user?.apiAccessToken || "";
    const [state, setState] = useState<{ profileId?: number; records: WeeklyPhotoAnalysisRecord[] | null; error: string }>({ records: null, error: "" });
    useEffect(() => {
        if (!petProfileId || !token) return;
        let active = true;
        loadWeeklyPhotoAnalyses({ petProfileId, accessToken: token, limit })
            .then((list) => { if (active) setState({ profileId: petProfileId, records: list, error: "" }); })
            .catch(() => { if (active) setState({ profileId: petProfileId, records: [], error: WEEKLY_ERROR }); });
        return () => { active = false; };
    }, [petProfileId, token, limit]);
    // 로그인 토큰이 없으면 웹처럼 불러오지 않음 → 기록 없음
    if (!petProfileId || !token) return { records: [] as WeeklyPhotoAnalysisRecord[], error: "" };
    return state.profileId === petProfileId ? state : { records: null, error: "" };
}

/** 최근 행동 · 소리 분석 기록 — 협업자 loadPetObservationHistory 그대로(웹 기록 목록 refreshHistory 와 같은 8개 · 실패하면 빈 목록) */
function useObservationHistory(petProfileId?: number) {
    const { user } = useAuth();
    const token = user?.apiAccessToken || "";
    const [state, setState] = useState<{ profileId?: number; items: PetObservationHistoryItem[] }>({ items: [] });
    useEffect(() => {
        if (!petProfileId || !token) return;
        const controller = new AbortController();
        loadPetObservationHistory({ petProfileId, accessToken: token, limit: 8, signal: controller.signal })
            .then((items) => setState({ profileId: petProfileId, items }))
            .catch(() => { if (!controller.signal.aborted) setState({ profileId: petProfileId, items: [] }); });
        return () => controller.abort();
    }, [petProfileId, token]);
    if (!petProfileId || !token) return [] as PetObservationHistoryItem[];
    return state.profileId === petProfileId ? state.items : null; // null = 불러오는 중
}

/** 반려견이 없을 때 안내 — 웹 MyPetHub "먼저 우리 아이를 등록해 주세요"(반려견은 있는데 서버 프로필이 없으면 AppAiCareOverview "우리 아이부터 연결해 주세요")
 *  + 반려견 등록하기 와펜(협업자 PETLENS_PROFILE_SETUP_HREF — 마이페이지가 읽는 petProfile=required) */
function PetSetupMemo({ hasPets, className = "" }: { hasPets: boolean; className?: string }) {
    return (
        <div className={`lb-memo relative rounded-[10px] px-3.5 pb-3.5 pt-3 ${className}`} style={{ rotate: "-0.6deg" }}>
            <span className="ah-display block text-[13.5px] leading-snug">{hasPets ? "우리 아이부터 연결해 주세요" : "먼저 우리 아이를 등록해 주세요"}</span>
            <span className="ah-light mt-1 block text-[12px] leading-relaxed" style={{ color: TEXT_SOFT }}>프로필이 생기면 주간 사진 분석과 건강 관찰 기록이 이곳에 차곡차곡 쌓입니다.</span>
            <Patch href={PETLENS_PROFILE_SETUP_HREF} small className="mt-3">반려견 등록하기<i aria-hidden="true" className="fa-solid fa-paw text-[12px]" /></Patch>
        </div>
    );
}

/** 불러오기 실패 — 분홍 메모지(웹 MyPetHub 빨간 안내 줄과 같은 문구) */
function ErrorMemo({ message, className = "" }: { message: string; className?: string }) {
    return <p role="alert" className={`st-postit ah-light relative px-3.5 pb-2.5 pt-3 text-[12px] ${className}`} style={{ background: "#ffd6e2", rotate: "0.8deg" }}>{message}</p>;
}

const URGENCY_TAPE: Record<string, { tape: string; ink: string }> = {
    "즉시 병원 연락": { tape: "rgba(255,170,170,.9)", ink: "#b3261e" },
    "오늘 병원 문의": { tape: "rgba(255,206,150,.9)", ink: "#a8560f" },
    "평소와 비교 관찰": { tape: "rgba(170,230,200,.9)", ink: "#1f7a59" },
    "판단 어려움": { tape: "rgba(225,215,208,.95)", ink: "#7a6a63" },
};

/**
 * 분석 카드 젤리 그림(40×40) — 헤더 · 탭바 아이콘과 같은 말랑한 입체 결
 *  - photo: 버터 카메라 + 분홍 렌즈 속 발바닥 + 반짝
 *  - sound: 라벤더 말풍선 + 흰 소리 물결
 */
function LabArt({ k }: { k: "photo" | "sound" }) {
    if (k === "photo") {
        return (
            <svg viewBox="0 0 40 40" className="lb-art h-11 w-11" aria-hidden="true">
                <defs>
                    <linearGradient id="lb-cam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe59a" /><stop offset="1" stopColor="#f5b13c" /></linearGradient>
                    <linearGradient id="lb-lens" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffc2d4" /><stop offset="1" stopColor="#ec6a92" /></linearGradient>
                </defs>
                <path fill="url(#lb-cam)" d="M8.6 12.6h4.6l2-3.4a2 2 0 0 1 1.7-1h6.2a2 2 0 0 1 1.7 1l2 3.4h4.6a3.6 3.6 0 0 1 3.6 3.6v14.4a3.6 3.6 0 0 1-3.6 3.6H8.6A3.6 3.6 0 0 1 5 30.6V16.2a3.6 3.6 0 0 1 3.6-3.6z" />
                <circle cx="20" cy="23" r="7.4" fill="#fff" />
                <circle cx="20" cy="23" r="5.6" fill="url(#lb-lens)" />
                <g fill="#fff"><ellipse cx="20" cy="24.4" rx="2.1" ry="1.7" /><circle cx="17.6" cy="21.8" r=".9" /><circle cx="19.2" cy="20.6" r=".9" /><circle cx="20.8" cy="20.6" r=".9" /><circle cx="22.4" cy="21.8" r=".9" /></g>
                <path fill="#fff" d="M32.6 3.6l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" />
                <path fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="1.8" strokeLinecap="round" d="M8.6 17v5" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 40 40" className="lb-art h-11 w-11" aria-hidden="true">
            <defs>
                <linearGradient id="lb-bub" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cdbcff" /><stop offset="1" stopColor="#8e72ea" /></linearGradient>
            </defs>
            <path fill="url(#lb-bub)" d="M20 6c8.6 0 15 5.6 15 12.6S28.6 31.2 20 31.2c-1.6 0-3.1-.2-4.6-.6L9.2 34a1 1 0 0 1-1.4-1.2l1.6-5.2C6.6 25.4 5 22.2 5 18.6 5 11.6 11.4 6 20 6z" />
            <path fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" d="M12.4 18.6v.1M16.2 15.4v6.4M20 12.6v12M23.8 15.4v6.4M27.6 18.6v.1" />
            <path fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.8" strokeLinecap="round" d="M10.4 12.2a9 9 0 0 1 4.4-3.2" />
        </svg>
    );
}

export default function StickerLab() {
    const [session, setSession] = useDemoSession();
    const initialTab = useInitialTab(TABS.length);
    const member = session === "member";
    const today = useTodayDemo(session);
    // 실제 데이터(배포 전 연결 2026-10-16) — 반려견은 pets[0] 이 아니라 서버 프로필(apiProfileId)이 있는 첫 마리(웹 AppAiCareOverview 와 같음)
    const { user } = useAuth();
    const allPets = user?.pets ?? [];
    const pet = availablePets(allPets)[0];
    const petName = pet?.name ?? "우리 아이";
    const petId = pet?.apiProfileId;
    const weekly = useLabWeekly(petId, 6);
    const records = (weekly.records ?? []).map(toWeekCard);
    const observations = useObservationHistory(petId);
    // 분석 카드 주소 — 웹 AppAiCareOverview photoHref · observationHref 와 같음(아이가 없으면 같은 협업자 함수의 기본 주소)
    const photoHref = petLensProfileHref(petId);
    const observationHref = petId ? `/pet-lens/?profile=${petId}&mode=observation#observation` : "/pet-lens/?mode=observation#observation";
    const coinRef = useRef<HTMLSpanElement>(null);
    // 처음 쪽: 주소 ?tab= 그대로(처음 그릴 때부터)
    const [tab, setTab] = useState(() => initialTab);
    const [dir, setDir] = useState(1);
    const [sosOpen, setSosOpen] = useState(false); // 응급 증상 메모 펼침
    const go = (i: number) => { setDir(i > tab ? 1 : -1); setTab(i); };
    const times = Math.floor(today.coins / Math.max(1, today.analysisCoinCost));

    return (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + LAB_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">
                <ConceptBar session={session} onSession={setSession} />

                {member ? <DiaryTabs tabs={TABS} active={tab} onPick={go} /> : null}
                <DiaryBody pageKey={`${tab}-${session}`} dir={dir} onSwipe={member ? (s) => { const n = tab + s; if (n >= 0 && n < TABS.length) { haptic("light"); go(n); } } : undefined}>
                    {!member ? (
                        <>
                            {/* ───────── 로그인 전: 주간 기록 예시 — 실제 기록과 같은 모양(사용자 2026-10-16 "실제와 같아야 오해가 없다")
                                주간 분석 기록엔 사진이 남지 않아(서버는 촬영 방향 · 분석 글만 저장) 사진 나란히 비교는 넣지 않는다.
                                실제로 나오는 것: 주차 · 한 줄 비교(comparison.headline) · 새로 보임(newObservations) · 이번엔 안 보임(notObservedNow) ───────── */}
                            <p className="ah-display text-[18px] leading-snug">매주 사진을 찍으면<br /><span className="st-marker">달라진 점을 글로 정리해요</span></p>
                            <div className="lb-compare relative mt-5 rounded-[16px] bg-white px-4 pb-4 pt-5">
                                <Tape className="-top-2 left-1/2 h-4 w-16 -translate-x-1/2" color="rgba(255,226,150,.9)" style={{ rotate: "-3deg" }} />
                                <InkStamp rot={12} color="#5a7fe0" className="absolute -right-2 -top-3 z-[1] bg-white/90 text-[11px]">예시</InkStamp>
                                <span className="st-tape ah-display inline-block px-2 py-0.5 text-[11px] text-[#563fa8]" style={{ background: "rgba(220,205,255,.92)", rotate: "-2deg" }}>{WEEKLY_RECORDS[0].week} 기록</span>
                                <p className="ah-display mt-2.5 text-[15px] leading-snug">{LAB_EXAMPLE.headline}</p>
                                <p className="mt-2.5 flex flex-wrap gap-1.5">
                                    <span className="ah-display rounded-full bg-[#ddf5ea] px-2.5 py-0.5 text-[11px] text-[#1f7a59]">새로 보임 · {LAB_EXAMPLE.added[0]}</span>
                                    <span className="ah-display rounded-full bg-[#f1ece9] px-2.5 py-0.5 text-[11px] text-[#7a6a63]">이번엔 안 보임 · {LAB_EXAMPLE.gone[0]}</span>
                                </p>
                                <p className="ah-light mt-3 text-[11px] leading-relaxed" style={{ color: TEXT_SOFT }}>찍은 사진은 분석에만 쓰이고, 기록에는 달라진 점만 글로 남아요.</p>
                            </div>
                            <LoginInvite redirect={REDIRECT} title={["로그인하고", "우리 아이 기록 시작"]} cta="로그인하고 기록하기"
                                items={[
                                    { icon: "fa-camera", text: "매주 사진으로 변화 비교 · 무료" },
                                    { icon: "fa-wand-magic-sparkles", text: "외형 · 털 · 케어 분석과 맞춤 상품" },
                                    { icon: "fa-wave-square", text: "행동 · 소리 분석 · 가입하면 20코인" },
                                ]} />
                        </>
                    ) : tab === 0 ? (
                        <>
                            {/* ───────── 우리 아이 ───────── */}
                            {/* 아이 이름표 — 폴라로이드 + 이름 · 견종 확인 도장 · 나이 · 몸무게 이름표(줄 없음) */}
                            <div className="flex items-center gap-3.5">
                                <span className="st-polaroid relative block w-[6.2rem] shrink-0 bg-white p-1.5 pb-5" style={{ rotate: "-3deg" }}>
                                    <Tape className="-top-2 left-1/2 h-3.5 w-10 -translate-x-1/2" color="rgba(200,226,255,.85)" />
                                    <span className="relative grid aspect-square place-items-center overflow-hidden bg-[#fff3e8]">
                                        {pet && hasVerifiedPetPhoto(pet)
                                            // eslint-disable-next-line @next/next/no-img-element
                                            ? <img src={pet.photoDataUrl} alt={`${petName} 사진`} className="h-full w-full object-cover" />
                                            : <i aria-hidden="true" className="fa-solid fa-paw text-[24px] text-[#f4b9ca]" />}
                                    </span>
                                    <span className="ah-display absolute inset-x-0 bottom-0.5 truncate px-1 text-center text-[12px] text-[#e0557f]">{petName}</span>
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="ah-display flex items-center justify-between gap-2 text-[19px]"><span className="st-marker">{petName}</span><CoinChip ref={coinRef} coins={today.coins} /></p>
                                    <p className="mt-1.5 flex items-center gap-2">
                                        <span className="ah-light text-[13px]">{pet?.breed || "견종 미등록"}</span>
                                        {pet?.breed ? <InkStamp rot={-8} color="#1f9e75" className="!px-1.5 !py-0.5 text-[9.5px]">견종 확인</InkStamp> : null}
                                    </p>
                                    <p className="mt-2 flex flex-wrap gap-1.5">
                                        {[pet?.age, pet?.weightKg ? `${pet.weightKg}kg` : ""].filter(Boolean).map((t) => <span key={t} className="lb-tag ah-display text-[11.5px]">{t}</span>)}
                                    </p>
                                </div>
                            </div>

                            {/* 이번 주 사진 4칸 — 비어 있는 칸은 점선 폴라로이드, 누르면 촬영 화면 */}
                            <SectionLabel className="mt-6" icon="fa-camera">이번 주 사진 기록</SectionLabel>
                            <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>4방향을 남기면 지난주와 비교해 드려요 · 무료</p>
                            <Link href="/app/sticker/report/" className="lb-shots mt-3 grid grid-cols-4 gap-2" aria-label="이번 주 사진 남기러 가기">
                                {SHOTS.map((s, i) => (
                                    <span key={s.label} className="lb-shot flex flex-col items-center rounded-[10px] bg-white px-1 pb-1.5 pt-1.5" style={{ rotate: `${[-1, 0.8, -0.6, 1][i]}deg` }}>
                                        <span className="lb-shot-hole grid aspect-square w-full place-items-center rounded-[7px] text-[15px] text-[#f08eae]"><i aria-hidden="true" className="fa-solid fa-camera" /></span>
                                        <span className="ah-display mt-1 text-[11.5px]">{s.label}</span>
                                        <span className="ah-light text-[9.5px] leading-tight" style={{ color: TEXT_SOFT }}>{s.hint}</span>
                                    </span>
                                ))}
                            </Link>
                            {/* 지난 기록 — 메모지 한 장 */}
                            {/* 반려견(서버 프로필)이 없으면 끝없는 "확인 중" 대신 등록 안내 · 불러오기 실패는 분홍 메모 */}
                            {!pet ? <PetSetupMemo hasPets={allPets.length > 0} className="mt-3.5" /> : weekly.error ? <ErrorMemo message={weekly.error} className="mt-3.5" /> : (
                                <div className="lb-memo relative mt-3.5 rounded-[10px] px-3.5 pb-2.5 pt-3" style={{ rotate: "-0.6deg" }}>
                                    <span className="ah-display block text-[11px] text-[#8f5e12]">{records[0] ? `지난 기록 · ${records[0].week}` : "지난 기록"}</span>
                                    <span className="ah-display mt-0.5 block text-[13.5px] leading-snug">{records[0] ? records[0].headline : weekly.records ? "아직 주간 기록이 없어요. 이번 주 첫 사진을 남겨 보세요." : "기록을 확인하고 있어요"}</span>
                                </div>
                            )}

                            {/* 분석 두 가지 — 젤리 그림 카드 */}
                            <SectionLabel className="mt-7" icon="fa-lightbulb">궁금할 땐 분석해요</SectionLabel>
                            {/* 코인 — 분석 카드 위(분석 전에 남은 코인을 먼저 보게, 사용자 2026-10-17) · 남은 횟수 · 모자라면 매일 댕생활(출근도장)로. 출근 보상 코인은 서버 값(today.dailyRewardCoins).
                                웹 연구소의 코인 부족 버튼은 /mypage#daenglab-wallet(적립금 → 코인 전환)로 가지만, 앱은 코인 모으는 곳 = 출근 화면이라 /app/sticker/daily/ 유지 */}
                            <Link href={pageHref("sticker", "daily")} className="lb-coin mt-3 flex items-center gap-2.5 rounded-full py-2 pl-2.5 pr-3.5">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff3b0,#ffc93d_55%,#e9a514)] text-[11px] text-[#7a4b00] ah-display">C</span>
                                <span className="ah-display flex-1 text-[12.5px]">
                                    {/* 지갑을 아직 못 불러왔으면 "부족해요" 대신 확인 중(불러오기 실패면 그 문구) */}
                                    {!today.ready ? <span style={{ color: TEXT_SOFT }}>{today.error || "코인을 확인하고 있어요"}</span>
                                        : times > 0 ? <>행동 · 소리 분석 <b className="text-[#e0557f]">{times}회</b> 가능해요</>
                                            : <>코인이 부족해요 · <b className="text-[#e0557f]">매일 출근하면 {today.dailyRewardCoins}코인씩</b></>}
                                </span>
                                <span className="ah-light text-[11.5px] text-[#c4567a]">코인 모으기</span>
                                <i aria-hidden="true" className="fa-solid fa-chevron-right text-[9px] text-[#c4567a]" />
                            </Link>
                            {/* 코인이 모자랄 때 적립금 전환 — 웹 연구소 "전환하러 가기"(/mypage#daenglab-wallet) 자리.
                                앱의 적립금 → 코인 바꾸기는 앱 마이 화면 코인 봉투(웹 DaengLabWalletCard 와 같은 함수)에 있어서 /app/sticker/my/ 로 */}
                            {today.ready && times === 0 ? (
                                <Link href={pageHref("sticker", "my")} className="ah-display ml-auto mt-1.5 flex w-fit items-center gap-1 px-2 text-[11.5px] text-[#5b46b0]">
                                    적립금을 코인으로 바꾸기<i aria-hidden="true" className="fa-solid fa-chevron-right text-[9px]" />
                                </Link>
                            ) : null}
                            <p className="ah-light mt-1.5 px-2 text-[11px]" style={{ color: TEXT_SOFT }}>분석 실패·반려견 미검출·고객용 후보 0건 결과는 코인이 자동 환급돼요.</p>
                            <div className="mt-4 grid grid-cols-2 gap-2.5">
                                <Link href={photoHref} className="lb-card relative flex flex-col items-start px-3 pb-3 pt-3" style={{ background: "#fff8e3", rotate: "-0.8deg" }}>
                                    <LabArt k="photo" />
                                    <span className="ah-display mt-2 block text-[14px] leading-snug">사진 · 외형 분석</span>
                                    <span className="ah-light mt-0.5 block text-[11.5px] leading-snug" style={{ color: TEXT_SOFT }}>털 · 체형 · 케어 포인트와 맞춤 상품</span>
                                    <span className="st-tape ah-display absolute right-2.5 top-2.5 px-2 py-0.5 text-[10.5px] text-[#1f7a59]" style={{ background: "rgba(170,230,200,.9)", rotate: "4deg" }}>무료</span>
                                </Link>
                                <Link href={observationHref} className="lb-card relative flex flex-col items-start px-3 pb-3 pt-3" style={{ background: "#f3eeff", rotate: "0.8deg" }}>
                                    <LabArt k="sound" />
                                    <span className="ah-display mt-2 block text-[14px] leading-snug">행동 · 소리 분석</span>
                                    <span className="ah-light mt-0.5 block text-[11.5px] leading-snug" style={{ color: TEXT_SOFT }}>15초 영상으로 행동 · 소리 · 건강 신호</span>
                                    <span className="st-tape ah-display absolute right-2.5 top-2.5 px-2 py-0.5 text-[10.5px] text-[#a8560f]" style={{ background: "rgba(255,226,150,.9)", rotate: "-4deg" }}>1회 {today.analysisCoinCost}C</span>
                                </Link>
                            </div>
                            {/* 행동·소리 분석은 별개 기능 — 운영 연구소 문구 */}
                            <p className="ah-light mt-3 flex items-start gap-1.5 px-1 text-[11.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>
                                <i aria-hidden="true" className="fa-solid fa-circle-info mt-[3px] text-[10px] text-[#8a74d6]" />
                                <span><b className="ah-display font-normal text-[#5b46b0]">행동·소리 분석은 등록한 우리 아이와 별개예요.</b> 궁금한 강아지의 행동·소리 영상을 관찰하는 독립 기능이며, 주간 사진 변화 기록과 섞이지 않습니다.</span>
                            </p>
                            {/* 응급 안내 — 톡 하면 증상 목록이 펼쳐지는 메모(운영 연구소 문구) */}
                            <div className="lb-alert mt-4 rounded-[10px] px-3 py-2.5">
                                <button type="button" onClick={() => { setSosOpen((v) => !v); haptic("light"); }} aria-expanded={sosOpen} className="ah-display flex w-full items-center gap-2 text-left text-[12.5px]">
                                    <i aria-hidden="true" className="fa-solid fa-truck-medical text-[13px]" />
                                    <span className="flex-1">이럴 때는 촬영보다 병원 연락이 먼저예요</span>
                                    <i aria-hidden="true" className={`fa-solid fa-chevron-down text-[10px] transition-transform ${sosOpen ? "rotate-180" : ""}`} />
                                </button>
                                <div className="lb-fold" data-open={sosOpen}>
                                    <ul className="flex flex-wrap gap-1.5">
                                        {["숨을 매우 힘들게 쉼", "입 벌린 호흡·푸르거나 회색 잇몸", "쓰러짐·의식 저하", "계속되는 발작", "심한 출혈", "갑자기 부푼 배와 헛구역질", "열사병·중독 의심"].map((t) => (
                                            <li key={t} className="ah-light rounded-full bg-white/85 px-2.5 py-0.5 text-[11px]">{t}</li>
                                        ))}
                                    </ul>
                                    <p className="ah-display mt-2 text-[11.5px]">이런 증상이 있으면 즉시 응급 동물병원에 연락하세요.</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* ───────── 기록 ───────── */}
                            {/* 주간 기록 — 가로로 넘기는 메모 카드(주차 테이프 · 한 줄 비교 · 새로 보임/안 보임).
                                실제 기록엔 사진이 없어서 사진칸을 뺐다(사용자 2026-10-16 "실제와 같게"). 실제 데이터는 loadWeeklyPhotoAnalyses */}
                            <SectionLabel icon="fa-images">주간 기록</SectionLabel>
                            <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>옆으로 넘겨 지난 기록을 봐요</p>
                            {/* 반려견(서버 프로필)이 없으면 등록 안내 · 실패면 분홍 메모 · 불러오는 중 / 없음은 아래 글 */}
                            {!pet ? <PetSetupMemo hasPets={allPets.length > 0} className="mt-3" /> : weekly.error ? <ErrorMemo message={weekly.error} className="mt-3" /> : null}
                            <ol className="lb-album -mr-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 pr-4 pt-2">
                                {pet && !weekly.error && records.length === 0 ? <li className="ah-light w-full py-3 text-[12.5px]" style={{ color: TEXT_SOFT }}>{weekly.records ? "아직 주간 기록이 없어요." : "기록을 확인하고 있어요."}</li> : null}
                                {records.map((r, i) => (
                                    <li key={r.week} className="lb-page flex w-[11.5rem] shrink-0 snap-start">
                                        {/* 사진첩 칸 높이를 같게(h-full) */}
                                        <div className="st-polaroid relative h-full w-full bg-white px-3 pb-3 pt-3" style={{ rotate: `${[-1, 0.8, -0.6][i % 3]}deg` }}>
                                            <span className="st-tape ah-display absolute -top-2 left-3 z-[1] px-2 py-0.5 text-[10.5px] text-[#563fa8]" style={{ background: "rgba(220,205,255,.92)", rotate: "-3deg" }}>{r.week}</span>
                                            <span className="ah-light mt-3 block text-[10.5px]" style={{ color: TEXT_SOFT }}>{r.date}</span>
                                            <span className="ah-display block text-[12.5px] leading-snug">{r.headline}</span>
                                            {r.added.length || r.gone.length ? (
                                                <span className="mt-1.5 flex flex-wrap gap-1">
                                                    {r.added.map((a) => <span key={a} className="ah-display rounded-full bg-[#ddf5ea] px-2 py-0.5 text-[10px] text-[#1f7a59]">새로 보임 · {a}</span>)}
                                                    {r.gone.map((g) => <span key={g} className="ah-display rounded-full bg-[#f1ece9] px-2 py-0.5 text-[10px] text-[#7a6a63]">안 보임 · {g}</span>)}
                                                </span>
                                            ) : null}
                                        </div>
                                    </li>
                                ))}
                            </ol>

                            {/* 행동 · 소리 분석 기록 — 메모지(긴급도는 테이프 이름표) */}
                            <SectionLabel className="mt-5" icon="fa-wave-square">행동 · 소리 분석 기록</SectionLabel>
                            <ul className="mt-4 space-y-4">
                                {/* 불러오는 중(null) · 없음([]) — 웹 기록 목록처럼 실패도 빈 목록 */}
                                {pet && observations === null ? <li className="ah-light text-[12.5px]" style={{ color: TEXT_SOFT }}>기록을 확인하고 있어요.</li> : null}
                                {pet && observations && observations.length === 0 ? <li className="ah-light text-[12.5px]" style={{ color: TEXT_SOFT }}>아직 행동 · 소리 분석 기록이 없어요.</li> : null}
                                {(observations ?? []).map(toObservationCard).map((o, i) => {
                                    const u = URGENCY_TAPE[o.urgency] ?? URGENCY_TAPE["판단 어려움"];
                                    return (
                                        <li key={o.key}>
                                            <Link href={o.href} className="lb-obs relative flex items-center gap-3 rounded-[12px] bg-white px-3.5 pb-3 pt-4" style={{ rotate: `${i % 2 ? 0.6 : -0.6}deg` }}>
                                                <span className="st-tape ah-display absolute -top-2.5 left-3 px-2.5 py-0.5 text-[10.5px]" style={{ background: u.tape, color: u.ink, rotate: `${i % 2 ? 3 : -3}deg` }}>{o.urgency}</span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="ah-light block text-[11px]" style={{ color: TEXT_SOFT }}>{o.date}</span>
                                                    <span className="ah-display block text-[13px] leading-snug">{o.summary}</span>
                                                </span>
                                                <i aria-hidden="true" className="fa-solid fa-chevron-right text-[10px] text-[#c9b4a8]" />
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                            {/* 진단 아님 안내 — 연한 메모 */}
                            <p className="lb-note ah-light mt-5 rounded-[10px] px-3.5 py-2.5 text-[12px] leading-relaxed">
                                AI 기록은 의료 진단이 아닌 참고 정보예요. 걱정되는 변화가 계속되면 동물병원에 확인해 주세요.
                            </p>
                            <Patch href="/app/sticker/report/" small className="mt-4">주간 리포트 전체 보기<i aria-hidden="true" className="fa-solid fa-chart-line text-[12px]" /></Patch>
                        </>
                    )}
                </DiaryBody>
                {member ? <p className="ah-light mt-3 text-center text-[11.5px]" style={{ color: TEXT_SOFT }}>속지를 옆으로 밀면 다음 쪽으로 넘어가요</p> : null}
            </div>
        </div>
    );
}

/* 연구소 화면 CSS */
const LAB_CSS = `
/* 로그인 전 예시: 흰 종이 카드 */
.lb-compare { box-shadow: inset 0 0 0 1.5px #f3e6dc, 0 12px 20px -14px rgba(120,80,60,.5); rotate: -.6deg; }
/* 아이 이름표: 나이 · 몸무게 작은 종이 이름표 */
.lb-tag { padding: 3px 10px; border-radius: 999px; background: #fff; color: #7a6a63; box-shadow: inset 0 0 0 1.5px #f3e3da; }
/* 이번 주 사진 4칸: 흰 폴라로이드 속 점선 빈 칸, 누르면 살짝 눌림 */
.lb-shot { box-shadow: 0 8px 12px -9px rgba(120,80,60,.5), inset 0 0 0 1px #f5ebe4; }
.lb-shot-hole { background: #fff6f8; outline: 1.5px dashed #f4b6c8; outline-offset: -5px; }
.lb-shots { transition: transform .35s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.lb-shots:active { transform: scale(.98); transition-duration: .1s; }
/* 지난 기록 메모지 */
.lb-memo { background: #fff6c9; box-shadow: 0 8px 12px -9px rgba(120,80,60,.45); }
/* 분석 카드: 파스텔 메모지 + 젤리 그림, 누르면 들렸다 붙음(그림은 한 번 더 통) */
.lb-card { border-radius: 10px 10px 16px 10px; box-shadow: 0 9px 14px -10px rgba(110,70,55,.45), inset 0 0 0 1px rgba(255,255,255,.6);
  transition: transform .45s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.lb-card:active { transform: translateY(-4px) scale(1.03); transition-duration: .12s; }
.lb-art { filter: drop-shadow(0 3px 3px rgba(120,80,60,.22)); transition: transform .45s cubic-bezier(.3,1.8,.5,1); }
.lb-card:active .lb-art { transform: scale(1.12) rotate(-4deg); transition-duration: .12s; }
/* 코인 줄: 흰 종이 알약 */
.lb-coin { background: #fff; box-shadow: inset 0 0 0 1.5px #f3e3da, 0 6px 10px -8px rgba(120,80,60,.4); transition: transform .35s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.lb-coin:active { transform: scale(.97); }
/* 응급 안내: 연한 살구 메모 */
.lb-alert { background: #ffeee6; color: #b4532a; }
.lb-fold { interpolate-size: allow-keywords; height: 0; overflow: hidden; opacity: 0; transition: height .4s cubic-bezier(.2,.9,.2,1), opacity .3s, margin .3s; }
.lb-fold[data-open="true"] { height: auto; opacity: 1; margin-top: 8px; }
/* 주간 기록: 가로로 넘기기(속지 넘김 밀기와 겹치지 않게 가로 스크롤은 사진첩이 가져감) · 스크롤 막대 숨김 */
.lb-album { touch-action: pan-x pan-y; scrollbar-width: none; overscroll-behavior-x: contain; }
.lb-album::-webkit-scrollbar { display: none; }
/* 분석 기록 메모 · 진단 아님 안내 */
.lb-obs { box-shadow: inset 0 0 0 1.5px #f3e6dc, 0 9px 14px -11px rgba(120,80,60,.5); transition: transform .35s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.lb-obs:active { transform: scale(.98); }
.lb-note { background: #fff6c9; color: #7a6248; }
`;
