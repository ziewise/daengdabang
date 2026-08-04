"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/store";
import {
    loadPetObservationHistory,
    type PetObservationHistoryItem,
} from "@/lib/petlens-observation";

type SavedPhotoAnalysis = {
    summary: string[];
    details?: {
        statusLabel?: string;
        title?: string;
        description?: string;
        observations?: string[];
        careActions?: string[];
    };
};

function savedPhotoAnalysis(value: unknown): SavedPhotoAnalysis | null {
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    const snapshot = row.petLens && typeof row.petLens === "object"
        ? row.petLens as Record<string, unknown>
        : row;
    const details = snapshot.details && typeof snapshot.details === "object"
        ? snapshot.details as SavedPhotoAnalysis["details"]
        : undefined;
    const summary = Array.isArray(snapshot.summary)
        ? snapshot.summary.filter((item): item is string => typeof item === "string").slice(0, 6)
        : typeof snapshot.summary === "string" && snapshot.summary.trim()
            ? [snapshot.summary.trim()]
            : [];
    if (!details && summary.length === 0) return null;
    return { summary, details };
}

function formatDate(value?: string) {
    if (!value) return "아직 기록 없음";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "기록 날짜 확인 필요";
    return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function MyPetHub() {
    const { hydrated, user } = useAuth();
    const [selectedPetId, setSelectedPetId] = useState<number | undefined>();
    const [historyState, setHistoryState] = useState<{
        profileId?: number;
        items: PetObservationHistoryItem[];
        loading: boolean;
    }>({ items: [], loading: false });
    const pet = user?.pets.find((candidate) => candidate.apiProfileId === selectedPetId) || user?.pets[0];
    const petProfileId = pet?.apiProfileId;
    const accessToken = user?.apiAccessToken;
    const history = historyState.profileId === petProfileId ? historyState.items : [];
    const historyLoading = Boolean(petProfileId && accessToken)
        && (historyState.profileId !== petProfileId || historyState.loading);

    useEffect(() => {
        if (!petProfileId || !accessToken) return;
        let active = true;
        const timer = window.setTimeout(() => {
            if (!active) return;
            setHistoryState({ profileId: petProfileId, items: [], loading: true });
            void loadPetObservationHistory({
                petProfileId,
                accessToken,
                limit: 8,
            }).then((items) => {
                if (active) setHistoryState({ profileId: petProfileId, items, loading: false });
            }).catch(() => {
                if (active) setHistoryState({ profileId: petProfileId, items: [], loading: false });
            });
        }, 0);
        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [accessToken, petProfileId]);

    if (!hydrated) {
        return <main className="mx-auto grid min-h-[50vh] w-full max-w-[1280px] place-items-center px-4 py-10 text-sm font-black text-neutral-500">우리 아이 기록을 불러오는 중입니다.</main>;
    }

    if (!user) {
        return (
            <main className="mx-auto w-full max-w-[900px] px-4 py-16 text-center md:px-6">
                <div className="rounded-[32px] border border-white/80 bg-white/90 p-8 shadow-card md:p-12">
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-2xl text-white"><i className="fa-solid fa-dog" /></span>
                    <h1 className="mt-5 text-3xl font-black text-neutral-950">우리 아이 기록은 로그인 후 볼 수 있어요</h1>
                    <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">사진·행동·소리 분석 결과를 회원 계정에 안전하게 연결합니다.</p>
                    <Link href="/auth/login/?redirect=%2Fmy-pet" className="btn btn-primary mt-6">로그인하기</Link>
                </div>
            </main>
        );
    }

    if (!pet) {
        return (
            <main className="mx-auto w-full max-w-[900px] px-4 py-16 text-center md:px-6">
                <div className="rounded-[32px] border border-white/80 bg-white/90 p-8 shadow-card md:p-12">
                    <h1 className="text-3xl font-black text-neutral-950">먼저 우리 아이를 등록해 주세요</h1>
                    <p className="mt-3 text-sm font-bold text-neutral-600">프로필이 생기면 분석과 건강 관찰 기록이 이곳에 차곡차곡 쌓입니다.</p>
                    <Link href="/mypage/?profile=required#pet-profiles" className="btn btn-primary mt-6">반려견 등록하기</Link>
                </div>
            </main>
        );
    }

    const photoAnalysis = savedPhotoAnalysis(pet.rawAnalysis);
    const latestObservation = history[0];
    const previousObservation = history[1];

    return (
        <main className="mx-auto w-full max-w-[1280px] px-4 py-10 md:px-6 md:py-14" data-my-pet-hub>
            <header className="flex flex-col gap-5 rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-cyan-50 to-indigo-50 p-5 shadow-card md:flex-row md:items-center md:justify-between md:p-8">
                <div className="flex min-w-0 items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[26px] border-4 border-white bg-white shadow-lg md:h-24 md:w-24">
                        {pet.photoDataUrl ? (
                            <Image src={pet.photoDataUrl} alt={`${pet.name} 프로필`} fill sizes="96px" className="object-cover" unoptimized />
                        ) : (
                            <span className="grid h-full place-items-center text-3xl text-indigo-300"><i className="fa-solid fa-dog" /></span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black tracking-[0.16em] text-indigo-600">MY PET AI HISTORY</p>
                        <h1 className="mt-2 truncate text-3xl font-black text-neutral-950 md:text-4xl">{pet.name}의 기록</h1>
                        <p className="mt-1 text-sm font-bold text-neutral-600">{pet.breed || "견종 확인 전"} · {pet.weightKg ? `${pet.weightKg}kg` : "체중 기록 전"}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {user.pets.filter((item) => item.apiProfileId).map((item) => (
                        <button key={item.apiProfileId} type="button" onClick={() => setSelectedPetId(item.apiProfileId)} className={`rounded-full px-4 py-2 text-xs font-black ${item.apiProfileId === pet.apiProfileId ? "bg-indigo-600 text-white" : "border border-neutral-200 bg-white text-neutral-700"}`}>
                            {item.name}
                        </button>
                    ))}
                </div>
            </header>

            <section className="mt-6 grid gap-4 md:grid-cols-3" aria-label="우리 아이 요약">
                {[
                    ["최근 사진 분석", formatDate(pet.lastAnalyzedAt), "fa-camera-retro", "bg-cyan-50 text-cyan-800"],
                    ["행동·소리 기록", `${history.length}개`, "fa-wave-square", "bg-violet-50 text-violet-800"],
                    ["관심 케어", pet.concerns[0] || "아직 선택 전", "fa-heart", "bg-rose-50 text-rose-800"],
                ].map(([label, value, icon, tone]) => (
                    <article key={label} className={`rounded-3xl p-5 ${tone}`}>
                        <i className={`fa-solid ${icon} text-lg`} aria-hidden="true" />
                        <p className="mt-3 text-xs font-black opacity-70">{label}</p>
                        <strong className="mt-1 block text-lg font-black">{value}</strong>
                    </article>
                ))}
            </section>

            <section id="health-report" className="mt-8 scroll-mt-28" aria-labelledby="health-report-title">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-black tracking-[0.16em] text-emerald-700">AI 건강 변화 리포트</p>
                        <h2 id="health-report-title" className="mt-2 text-2xl font-black text-neutral-950">최근 기록 비교</h2>
                    </div>
                    <Link href="/pet-lens/" className="btn btn-primary">새 분석 시작</Link>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    <article className="rounded-[26px] border border-neutral-200 bg-white p-5 shadow-card">
                        <p className="text-xs font-black text-indigo-600">사진 분석</p>
                        {photoAnalysis ? (
                            <>
                                <h3 className="mt-3 text-lg font-black text-neutral-950">{photoAnalysis.details?.title || "저장된 사진 분석"}</h3>
                                {photoAnalysis.details?.description && <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">{photoAnalysis.details.description}</p>}
                                <ul className="mt-4 grid gap-2 text-sm font-bold text-neutral-700">
                                    {(photoAnalysis.details?.careActions || photoAnalysis.summary).slice(0, 4).map((item) => <li key={item} className="flex gap-2"><i className="fa-solid fa-check mt-1 text-[10px] text-emerald-600" /><span>{item}</span></li>)}
                                </ul>
                            </>
                        ) : (
                            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">사진 분석을 완료하면 결과와 케어 포인트가 이곳에 저장됩니다.</p>
                        )}
                    </article>
                    <article className="rounded-[26px] border border-neutral-200 bg-white p-5 shadow-card">
                        <p className="text-xs font-black text-violet-600">행동·소리 관찰</p>
                        {historyLoading ? (
                            <p className="mt-3 text-sm font-bold text-neutral-500">관찰 기록을 불러오는 중입니다.</p>
                        ) : latestObservation ? (
                            <>
                                <h3 className="mt-3 text-lg font-black text-neutral-950">{latestObservation.result.urgency.headline}</h3>
                                <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">{latestObservation.result.summary}</p>
                                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-black">
                                    <div className="rounded-xl bg-violet-50 p-3"><span className="block text-violet-600">최근</span><strong className="mt-1 block text-neutral-900">{formatDate(latestObservation.completedAt || latestObservation.createdAt)}</strong></div>
                                    <div className="rounded-xl bg-neutral-50 p-3"><span className="block text-neutral-500">이전</span><strong className="mt-1 block text-neutral-900">{previousObservation ? formatDate(previousObservation.completedAt || previousObservation.createdAt) : "비교 기록 없음"}</strong></div>
                                </div>
                            </>
                        ) : (
                            <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">행동·소리 분석을 두 번 이상 기록하면 최근 변화를 나란히 확인할 수 있습니다.</p>
                        )}
                    </article>
                </div>
                <p className="mt-3 text-xs font-bold leading-5 text-neutral-500">이 리포트는 저장된 관찰 기록을 정리한 것으로 수의학적 진단을 대신하지 않습니다.</p>
            </section>
        </main>
    );
}
