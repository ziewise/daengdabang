"use client";

import Image from "next/image";
import type { PetLensResultDetails } from "@/lib/daengdabang-llm";
import type { PetProfile } from "@/lib/store";

type Props = {
    profile: PetProfile;
    details: PetLensResultDetails;
};

const STATUS_STYLES: Record<PetLensResultDetails["status"], string> = {
    confirmed: "border-indigo-200 bg-indigo-50 text-indigo-900",
    ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
    review: "border-amber-200 bg-amber-50 text-amber-900",
    retake: "border-sky-200 bg-sky-50 text-sky-900",
};

function InsightList({ items, icon = "fa-check" }: { items: string[]; icon?: string }) {
    return (
        <ul className="grid gap-2 text-sm font-bold leading-6 text-neutral-700">
            {items.map((item) => (
                <li key={item} className="flex gap-2">
                    <i className={`fa-solid ${icon} mt-1.5 text-[10px] text-indigo-600`} aria-hidden="true" />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

export default function PetLensAnalysisSummary({ profile, details }: Props) {
    return (
        <div className="grid gap-3" data-petlens-trust-result>
            <section className={`rounded-2xl border p-4 sm:p-5 ${STATUS_STYLES[details.status]}`}>
                <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
                            <span className="rounded-full bg-white/80 px-2.5 py-1">{details.statusLabel}</span>
                            <span className="rounded-full bg-white/80 px-2.5 py-1">{details.photoQualityLabel}</span>
                            {details.analyzedViewCount > 0 && (
                                <span className="rounded-full bg-white/80 px-2.5 py-1">
                                    {details.analyzedViewCount}개 방향 확인
                                </span>
                            )}
                        </div>
                        <h3 className="mt-3 text-lg font-black leading-7 text-neutral-950">{details.title}</h3>
                        <p className="mt-2 text-sm font-bold leading-6 text-neutral-700">{details.description}</p>
                    </div>
                    {profile.photoDataUrl && (
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/80 bg-white sm:h-24 sm:w-24">
                            <Image
                                src={profile.photoDataUrl}
                                alt={`${profile.name || "우리 아이"} 분석 사진`}
                                fill
                                sizes="96px"
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                    )}
                </div>
            </section>

            {details.observations.length > 0 && (
                <section className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <p className="mb-3 text-xs font-black text-neutral-500">사진에서 직접 확인한 특징</p>
                    <InsightList items={details.observations} />
                </section>
            )}

            {details.confirmedBreed && (
                <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                    <p className="text-xs font-black text-indigo-700">회원이 확인한 등록 견종</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <strong className="text-base font-black text-neutral-950">{details.confirmedBreed}</strong>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-indigo-700">회원 확인</span>
                    </div>
                    <p className="mt-2 text-[11px] font-bold leading-5 text-neutral-600">
                        등록 견종은 상품·케어 기준으로 사용하며, 아래 사진 후보와 구분해서 보여드려요.
                    </p>
                </section>
            )}

            {details.breedCandidates.length > 0 && (
                <section className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="mb-3 flex items-end justify-between gap-3">
                        <p className="text-xs font-black text-neutral-500">사진에서 본 가까운 견종 후보</p>
                        <span className="text-[10px] font-bold text-neutral-400">등록 견종을 자동으로 바꾸지 않아요</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                        {details.breedCandidates.map((candidate, index) => (
                            <article key={candidate.label} className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                                <p className="text-[10px] font-black text-indigo-500">후보 {index + 1}</p>
                                <p className="mt-1 text-sm font-black text-neutral-950">{candidate.label}</p>
                                <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[10px] font-black text-indigo-700">
                                    {candidate.confidenceLabel}
                                </span>
                                {candidate.reason && (
                                    <p className="mt-2 text-[11px] font-bold leading-5 text-neutral-600">{candidate.reason}</p>
                                )}
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {details.profileNotice && (
                <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <p className="text-sm font-bold leading-6 text-sky-900">{details.profileNotice}</p>
                </section>
            )}

            {(details.profileCandidates.length > 0 || details.ownerChecks.length > 0) && (
                <section className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <p className="mb-3 text-xs font-black text-neutral-500">보호자가 확인해 주세요</p>
                    {details.profileCandidates.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                            {details.profileCandidates.map((item) => (
                                <span key={item} className="rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-black text-neutral-700">
                                    {item}
                                </span>
                            ))}
                        </div>
                    )}
                    <InsightList items={details.ownerChecks} icon="fa-pen" />
                </section>
            )}

            {details.retakeReasons.length > 0 && (
                <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <p className="mb-3 text-xs font-black text-sky-800">다음 촬영에서 보완할 점</p>
                    <InsightList items={details.retakeReasons} icon="fa-camera" />
                </section>
            )}

            {details.careActions.length > 0 && (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <p className="mb-3 text-xs font-black text-emerald-800">지금 도움이 되는 케어</p>
                    <InsightList items={details.careActions} icon="fa-heart" />
                </section>
            )}

            {details.recommendationSignals.length > 0 && (
                <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                    <p className="mb-3 text-xs font-black text-indigo-700">상품을 고른 기준</p>
                    <InsightList items={details.recommendationSignals} icon="fa-paw" />
                </section>
            )}
        </div>
    );
}
