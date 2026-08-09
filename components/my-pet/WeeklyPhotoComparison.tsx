"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    buildPetLensAnalysisImage,
    PETLENS_PHOTO_VIEWS,
    petLensPhotoViewCount,
    preparePetLensPhotoCapture,
    type PetLensPhotoCaptures,
    type PetLensPhotoViewId,
} from "@/lib/petlens-multiview";
import { useAuth, type PetProfile } from "@/lib/store";
import {
    createWeeklyPhotoAnalysis,
    type WeeklyPhotoAnalysisRecord,
} from "@/lib/weekly-photo-analysis";
import styles from "./WeeklyPhotoComparison.module.css";

type Props = {
    pet: PetProfile;
    history?: WeeklyPhotoAnalysisRecord[];
    onCompleted?: (record: WeeklyPhotoAnalysisRecord) => void;
};

type FlowPhase = "capture" | "uploading" | "analyzing" | "complete";

const nextMissingView = (views: PetLensPhotoCaptures, current: PetLensPhotoViewId) => {
    const currentIndex = PETLENS_PHOTO_VIEWS.findIndex((view) => view.id === current);
    const ordered = [
        ...PETLENS_PHOTO_VIEWS.slice(currentIndex + 1),
        ...PETLENS_PHOTO_VIEWS.slice(0, currentIndex + 1),
    ];
    return ordered.find((view) => !views[view.id])?.id || current;
};

function formatWeeklyDate(value?: string) {
    if (!value) return "첫 기록";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "날짜 확인 필요";
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

export default function WeeklyPhotoComparison({ pet, history = [], onCompleted }: Props) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [activeView, setActiveView] = useState<PetLensPhotoViewId>("front");
    const [views, setViews] = useState<PetLensPhotoCaptures>({});
    const [cameraActive, setCameraActive] = useState(false);
    const [photoBusy, setPhotoBusy] = useState(false);
    const [phase, setPhase] = useState<FlowPhase>("capture");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState("");
    const [savedRecord, setSavedRecord] = useState<WeeklyPhotoAnalysisRecord | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const launcherRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const idempotencyKeyRef = useRef("");
    const busy = photoBusy || phase === "uploading" || phase === "analyzing";
    const busyRef = useRef(busy);
    const capturedCount = petLensPhotoViewCount(views);
    const priorRecord = savedRecord
        ? history.find((item) => item.id !== savedRecord.id)
        : history[0];

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraActive(false);
    };

    useEffect(() => () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
    }, []);

    useEffect(() => {
        busyRef.current = busy;
    }, [busy]);

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        const launcher = launcherRef.current;
        const dialog = dialogRef.current;
        const portalRoot = dialog?.closest("[data-weekly-photo-modal-viewport]");
        const background = Array.from(document.body.children)
            .filter((node): node is HTMLElement => node instanceof HTMLElement && node !== portalRoot)
            .map((node) => ({ node, inert: node.inert }));
        document.body.style.overflow = "hidden";
        background.forEach(({ node }) => {
            node.inert = true;
        });
        const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !busyRef.current) {
                stopCamera();
                setOpen(false);
                return;
            }
            if (event.key !== "Tab" || !dialogRef.current) return;
            const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            )).filter((node) => !node.inert && node.getClientRects().length > 0);
            if (!focusable.length) {
                event.preventDefault();
                dialogRef.current.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!dialogRef.current.contains(document.activeElement)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
                return;
            }
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
            background.forEach(({ node, inert }) => {
                node.inert = inert;
            });
            window.requestAnimationFrame(() => launcher?.focus());
        };
    }, [open]);

    useEffect(() => {
        if (!cameraActive || !streamRef.current || !videoRef.current) return;
        videoRef.current.srcObject = streamRef.current;
        void videoRef.current.play().catch(() => undefined);
    }, [cameraActive, open]);

    const startCamera = async () => {
        setError("");
        if (!navigator.mediaDevices?.getUserMedia) {
            setError("이 브라우저에서는 화면 카메라를 열 수 없어 촬영 버튼으로 연결합니다.");
            fileInputRef.current?.click();
            return;
        }
        try {
            stopCamera();
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 960 },
                },
            });
            streamRef.current = stream;
            setCameraActive(true);
        } catch {
            setError("카메라 권한을 허용해 주세요. 어려우면 아래 사진 촬영·선택 버튼을 이용할 수 있어요.");
        }
    };

    const openFlow = () => {
        setViews({});
        setActiveView("front");
        setSavedRecord(null);
        setUploadProgress(0);
        idempotencyKeyRef.current = "";
        setPhase("capture");
        setError("");
        setOpen(true);
        void startCamera();
    };

    const closeFlow = () => {
        if (busy) return;
        stopCamera();
        setOpen(false);
    };

    const storeCapture = async (file: File) => {
        if (photoBusy || phase !== "capture") return;
        setPhotoBusy(true);
        setError("");
        try {
            const capture = await preparePetLensPhotoCapture(file);
            const next = { ...views, [activeView]: capture };
            idempotencyKeyRef.current = "";
            setViews(next);
            setActiveView(nextMissingView(next, activeView));
        } catch {
            setError("사진을 준비하지 못했습니다. JPG·PNG·WebP 사진으로 다시 시도해 주세요.");
        } finally {
            setPhotoBusy(false);
        }
    };

    const captureLiveFrame = async () => {
        const video = videoRef.current;
        if (!video || !cameraActive || video.videoWidth <= 0 || video.videoHeight <= 0) {
            setError("카메라 화면이 준비된 뒤 다시 눌러 주세요.");
            return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (!context) {
            setError("카메라 화면을 사진으로 만들지 못했습니다.");
            return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
        if (!blob) {
            setError("촬영 사진을 준비하지 못했습니다.");
            return;
        }
        await storeCapture(new File([blob], `${pet.name}-${activeView}-${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
        }));
    };

    const analyzeWeeklyPhotos = async () => {
        if (!user?.apiAccessToken || !pet.apiProfileId || capturedCount === 0 || busy) return;
        setError("");
        setUploadProgress(0);
        setPhase("uploading");
        try {
            const analysisImage = await buildPetLensAnalysisImage(views);
            if (!analysisImage) throw new Error("분석할 사진을 준비하지 못했습니다.");
            const viewIds = PETLENS_PHOTO_VIEWS
                .filter((view) => Boolean(views[view.id]))
                .map((view) => view.id);
            if (!idempotencyKeyRef.current) {
                idempotencyKeyRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                    ? crypto.randomUUID()
                    : `${pet.apiProfileId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            }
            const record = await createWeeklyPhotoAnalysis({
                petProfileId: pet.apiProfileId,
                accessToken: user.apiAccessToken,
                file: analysisImage.file,
                viewIds,
                idempotencyKey: idempotencyKeyRef.current,
                onUploadProgress: ({ percent }) => {
                    setUploadProgress(percent);
                    if (percent >= 100) setPhase("analyzing");
                },
            });
            setPhase("analyzing");
            setSavedRecord(record);
            onCompleted?.(record);
            setUploadProgress(100);
            setPhase("complete");
            stopCamera();
        } catch (caught) {
            setPhase("capture");
            setError(caught instanceof Error ? caught.message : "주간 사진 분석을 완료하지 못했습니다. 다시 시도해 주세요.");
        }
    };

    return (
        <>
            <button
                ref={launcherRef}
                type="button"
                className="ddb-crayon-link inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-black"
                onClick={openFlow}
                data-weekly-photo-analysis-launcher
            >
                <i className="fa-solid fa-camera-retro" aria-hidden="true" />
                새 주간 분석 시작
            </button>

            {open && typeof document !== "undefined" && createPortal((
                <div
                    className="fixed inset-0 z-[2600] flex h-[100dvh] items-start justify-center overflow-hidden bg-neutral-950/65 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-[max(.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:p-4"
                    role="presentation"
                    data-weekly-photo-modal-viewport
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeFlow();
                    }}
                >
                    <section
                        ref={dialogRef}
                        role="dialog"
                        tabIndex={-1}
                        aria-modal="true"
                        aria-busy={busy}
                        aria-labelledby="weekly-photo-title"
                        className="ddb-crayon-paper flex max-h-full w-full max-w-[1120px] flex-col overflow-hidden rounded-[28px] border bg-[#fffdf8] shadow-2xl sm:rounded-[34px]"
                        data-weekly-photo-comparison
                    >
                        <header className="relative z-20 flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200/80 bg-[#fffdf8]/95 px-4 py-4 backdrop-blur sm:px-6" data-weekly-photo-modal-header>
                            <div>
                                <p className="ddb-crayon-kicker text-[10px] sm:text-xs">WEEKLY LIVE PHOTO CHECK</p>
                                <h2 id="weekly-photo-title" className="ddb-crayon-title mt-1 text-xl text-neutral-950 sm:text-2xl">{pet.name}의 이번 주 사진 비교</h2>
                                <p className="mt-1 text-xs font-bold text-neutral-500">최초 등록 사진은 그대로 보존하고, 이번 촬영만 새 기록으로 저장해요.</p>
                            </div>
                            <button ref={closeButtonRef} type="button" onClick={closeFlow} disabled={busy} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border bg-white text-neutral-600 disabled:opacity-40" aria-label="주간 분석 닫기">
                                <i className="fa-solid fa-xmark" aria-hidden="true" />
                            </button>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6" data-weekly-photo-modal-scroll-region>
                            <ol className="mb-5 grid grid-cols-3 gap-2" aria-label="주간 분석 단계">
                                {[
                                    ["1", "실시간 촬영", phase === "capture"],
                                    ["2", "자동 업로드", phase === "uploading"],
                                    ["3", "변화 분석", phase === "analyzing" || phase === "complete"],
                                ].map(([number, label, active]) => (
                                    <li key={String(number)} className={`rounded-2xl border px-2 py-3 text-center text-[10px] font-black sm:text-xs ${active ? "border-cyan-400 bg-cyan-50 text-cyan-800" : "border-neutral-200 bg-white text-neutral-500"}`}>
                                        <span className="mr-1 inline-grid h-5 w-5 place-items-center rounded-full bg-current/10">{number}</span>{label}
                                    </li>
                                ))}
                            </ol>

                            {phase === "complete" && savedRecord ? (
                                <div className={styles.readyPop} data-weekly-analysis-complete>
                                    <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-center sm:p-7">
                                        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-2xl text-white shadow-lg"><i className="fa-solid fa-check" /></span>
                                        <p className="ddb-crayon-kicker mt-4 text-xs">분석 준비 완료 · 기록 저장 완료</p>
                                        <h3 className="ddb-crayon-title mt-2 text-2xl text-neutral-950">이번 주 변화 기록이 쌓였어요!</h3>
                                        <p className="mx-auto mt-2 max-w-2xl text-sm font-bold leading-6 text-neutral-650">{savedRecord.comparison.headline}</p>
                                    </div>
                                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                                        <article className="rounded-3xl border bg-white p-5">
                                            <p className="text-xs font-black text-violet-600">이번 주 · {formatWeeklyDate(savedRecord.analyzedAt)}</p>
                                            <h4 className="mt-2 text-lg font-black text-neutral-950">{savedRecord.title || "이번 주 사진 분석"}</h4>
                                            <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">{savedRecord.description}</p>
                                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black"><span className="rounded-full bg-cyan-50 px-3 py-1.5 text-cyan-800">{savedRecord.viewCount}방향 분석</span><span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-700">{savedRecord.photoQualityLabel}</span></div>
                                        </article>
                                        <article className="rounded-3xl border bg-white p-5">
                                            <p className="text-xs font-black text-neutral-500">이전 주 · {formatWeeklyDate(savedRecord.comparison.previousAnalyzedAt)}</p>
                                            <h4 className="mt-2 text-lg font-black text-neutral-950">나란히 비교한 관찰 포인트</h4>
                                            {priorRecord ? <p className="mt-2 text-sm font-bold text-neutral-600">{priorRecord.title}</p> : <p className="mt-2 text-sm font-bold text-neutral-600">이번 기록이 다음 주 비교 기준이 됩니다.</p>}
                                            <ul className="mt-3 grid gap-2 text-xs font-bold text-neutral-700">
                                                {savedRecord.comparison.newObservations.slice(0, 3).map((item) => <li key={item} className="flex gap-2"><i className="fa-solid fa-sparkles mt-0.5 text-orange-500" /><span>{item}</span></li>)}
                                                {savedRecord.comparison.commonObservations.slice(0, 3).map((item) => <li key={item} className="flex gap-2"><i className="fa-solid fa-equals mt-0.5 text-teal-600" /><span>{item}</span></li>)}
                                            </ul>
                                        </article>
                                    </div>
                                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                                        <button type="button" className="min-h-11 rounded-full border bg-white px-5 text-sm font-black" onClick={() => {
                                            setViews({});
                                            setSavedRecord(null);
                                            setPhase("capture");
                                            setActiveView("front");
                                            idempotencyKeyRef.current = "";
                                            void startCamera();
                                        }}>한 번 더 촬영</button>
                                        <button type="button" className="ddb-crayon-link min-h-11 rounded-full px-6 text-sm font-black" onClick={closeFlow}>기록 확인 완료</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                                    <div>
                                        <div className="relative aspect-[4/3] overflow-hidden rounded-[26px] bg-neutral-900 shadow-inner" data-weekly-live-camera>
                                            <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${cameraActive ? "opacity-100" : "opacity-25"}`} />
                                            {!cameraActive && (
                                                <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
                                                    <div><i className="fa-solid fa-camera text-4xl" /><p className="mt-3 text-sm font-black">카메라를 연결하면 여기에 실시간 화면이 보여요</p><button type="button" onClick={() => void startCamera()} className="mt-4 min-h-11 rounded-full bg-white px-5 text-sm font-black text-neutral-900">카메라 켜기</button></div>
                                                </div>
                                            )}
                                            {cameraActive && (
                                                <>
                                                    <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-[10px] font-black text-white shadow-lg"><span className={`${styles.liveDot} h-2 w-2 rounded-full bg-white`} /> LIVE</div>
                                                    <div className="pointer-events-none absolute inset-[12%] rounded-[42%_42%_34%_34%] border-2 border-dashed border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" aria-hidden="true"><span className={`${styles.scanLine} absolute left-[8%] h-0.5 w-[84%]`} /></div>
                                                    <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-neutral-950/65 px-4 py-2 text-center text-xs font-black text-white backdrop-blur">{PETLENS_PHOTO_VIEWS.find((view) => view.id === activeView)?.label} · 가이드 안에 얼굴과 몸이 보이게 맞춰 주세요</div>
                                                </>
                                            )}
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-center">
                                            <button type="button" disabled={!cameraActive || photoBusy || phase !== "capture"} onClick={() => void captureLiveFrame()} className="ddb-crayon-link min-h-12 rounded-full px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40"><i className="fa-solid fa-camera mr-2" />{photoBusy ? "사진 준비 중" : `${PETLENS_PHOTO_VIEWS.find((view) => view.id === activeView)?.label} 촬영`}</button>
                                            <button type="button" disabled={photoBusy || phase !== "capture"} onClick={() => fileInputRef.current?.click()} className="min-h-12 rounded-full border bg-white px-5 text-sm font-black text-neutral-700 disabled:opacity-40"><i className="fa-solid fa-images mr-2 text-violet-500" />사진 촬영·선택</button>
                                            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" aria-label={`${PETLENS_PHOTO_VIEWS.find((view) => view.id === activeView)?.label} 사진 촬영 또는 선택`} onChange={(event) => {
                                                const file = event.target.files?.[0];
                                                if (file) void storeCapture(file);
                                                event.currentTarget.value = "";
                                            }} />
                                        </div>
                                    </div>

                                    <aside>
                                        <div className="rounded-[24px] border bg-white p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div><p className="text-sm font-black text-neutral-950">촬영 즉시 자동 추가</p><p className="mt-1 text-[11px] font-bold leading-5 text-neutral-500">썸네일과 체크 표시로 업로드할 사진을 바로 확인해요.</p></div>
                                                <span className="shrink-0 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-black text-cyan-800">{capturedCount} / 4</span>
                                            </div>
                                            <div className="mt-4 grid grid-cols-2 gap-2" data-weekly-photo-thumbnails>
                                                {PETLENS_PHOTO_VIEWS.map((view) => {
                                                    const photo = views[view.id];
                                                    const selected = activeView === view.id;
                                                    return (
                                                        <button key={view.id} type="button" disabled={phase !== "capture"} onClick={() => setActiveView(view.id)} className={`relative aspect-square overflow-hidden rounded-2xl border-2 text-center transition ${selected ? "border-cyan-500 ring-2 ring-cyan-100" : "border-neutral-200"}`} aria-label={`${view.label} 촬영 칸 선택`}>
                                                            {photo ? <Image src={photo.dataUrl} alt={`${pet.name} ${view.label} 주간 사진`} fill sizes="160px" className="object-cover" unoptimized /> : <span className="grid h-full place-items-center bg-neutral-50 px-2 text-neutral-400"><span><i className="fa-solid fa-camera-retro text-xl" /><strong className="mt-1 block text-xs">{view.label}</strong><small className="mt-1 block text-[9px] font-bold">{view.helper}</small></span></span>}
                                                            {photo && <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-xs text-white shadow"><i className="fa-solid fa-check" /></span>}
                                                            {selected && <span className="absolute inset-x-2 bottom-2 rounded-full bg-neutral-950/70 px-2 py-1 text-[9px] font-black text-white">{photo ? "다시 촬영" : "촬영할 방향"}</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="mt-3 rounded-[24px] border border-dashed border-violet-200 bg-violet-50/55 p-4">
                                            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm"><i className="fa-solid fa-shield-dog" /></span><div><p className="text-xs font-black text-neutral-800">최초 등록 기준 사진 보존</p><p className="mt-0.5 text-[10px] font-bold text-neutral-500">등록 사진 {pet.photoViews?.length || (pet.photoDataUrl ? 1 : 0)}장은 덮어쓰지 않아요.</p></div></div>
                                        </div>

                                        {(phase === "uploading" || phase === "analyzing") && (
                                            <div className="mt-3 rounded-[24px] border border-cyan-200 bg-cyan-50 p-4" aria-live="polite" data-weekly-upload-progress>
                                                <div className="flex items-center justify-between gap-3 text-xs font-black text-cyan-950"><span><i className={`fa-solid ${phase === "uploading" ? "fa-cloud-arrow-up" : "fa-wand-magic-sparkles"} mr-2`} />{phase === "uploading" ? "사진 실시간 업로드 중" : "업로드 완료 · 변화 분석 중"}</span><strong>{phase === "uploading" ? `${uploadProgress}%` : "AI"}</strong></div>
                                                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white shadow-inner"><div className={`${styles.uploadGlow} h-full rounded-full transition-[width] duration-200`} style={{ width: `${phase === "analyzing" ? 100 : Math.max(4, uploadProgress)}%` }} /></div>
                                                <div className="mt-3 flex items-center gap-2 text-[10px] font-black text-cyan-800"><span className="grid h-6 w-6 place-items-center rounded-full bg-white"><i className="fa-solid fa-check" /></span><span>{capturedCount}개 썸네일 확인</span><i className="fa-solid fa-angle-right opacity-40" /><span className="grid h-6 w-6 place-items-center rounded-full bg-white"><i className="fa-solid fa-cloud-arrow-up" /></span><span>{phase === "uploading" ? "전송 중" : "전송 완료"}</span></div>
                                            </div>
                                        )}

                                        {error && <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black leading-5 text-red-700" role="alert">{error}</p>}
                                        <button type="button" disabled={capturedCount === 0 || busy} onClick={() => void analyzeWeeklyPhotos()} className="ddb-crayon-link mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40"><i className="fa-solid fa-cloud-arrow-up" />{busy ? "업로드·분석 중" : `${capturedCount}장 자동 업로드하고 비교 분석`}</button>
                                        <p className="mt-2 text-center text-[10px] font-bold leading-4 text-neutral-500">비교 품질을 위해 네 방향을 권장하지만, 한 장부터 분석할 수 있어요.</p>
                                    </aside>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            ), document.body)}
        </>
    );
}
