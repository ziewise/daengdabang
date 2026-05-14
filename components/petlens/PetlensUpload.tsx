/**
 * PetlensUpload — Step 2: 부위별 순차 촬영/업로드
 * ---------------------------------------------------------------------
 * 3개 슬롯을 동시에 노출하던 기존 방식 → 한 부위씩 단계별 진행
 *   1단계 얼굴 → 촬영/업로드 → 미리보기 → 다음
 *   2단계 측면 → 동일
 *   3단계 정면 → 동일 → "분석 시작"
 *
 * 모드별 동작:
 *   camera → 슬롯 클릭 시 풀스크린 카메라 + 가이드 프레임 + 캡처
 *   file   → 슬롯 클릭 시 파일 다이얼로그
 */
"use client";

import { useRef, useState, useEffect } from "react";
import type { PetlensInputMode, PetlensSlot } from "@/lib/types";
import { SLOT_CONFIG } from "./petlens-data";
import styles from "./petlens.module.css";

interface Props {
    inputMode: PetlensInputMode;
    photos: (string | null)[];
    setPhotos: (next: (string | null)[]) => void;
    onChangeMode: () => void;
    onAnalyze: () => void;
}

const STEP_LABELS = ["얼굴", "측면", "정면"] as const;

/** 값 범위 제한 */
const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

export default function PetlensUpload({
    inputMode, photos, setPhotos, onChangeMode, onAnalyze,
}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<PetlensSlot>(0);   // 현재 단계 (0=얼굴, 1=측면, 2=정면)
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const guideRef = useRef<HTMLDivElement>(null);

    /** 파일 업로드 후 조정(crop) 모드 — null 이면 미진입.
     *  drag/zoom 으로 가이드 영역에 맞춘 뒤 적용하면 photos[step] 으로 저장됨 */
    const [editingImage, setEditingImage] = useState<string | null>(null);
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const stageRef = useRef<HTMLDivElement>(null);
    const editImgRef = useRef<HTMLImageElement>(null);
    const cropGuideRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ px: number; py: number; tx: number; ty: number } | null>(null);

    /** 카메라 정지 — 리소스 해제 */
    const stopCamera = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setCameraOpen(false);
    };

    /** 카메라 시작 — 현재 단계 슬롯에 대해 */
    const startCamera = async () => {
        setCameraError(false);
        setCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            console.warn("Camera access failed:", err);
            setCameraError(true);
            setCameraOpen(false);
        }
    };

    /** 가이드 프레임의 위치/크기를 video source 좌표계로 변환
     *  CSS object-fit: cover 로 인한 스케일/오프셋 보정 포함
     *  반환: 가이드의 source 좌표 (x, y, w, h, cx, cy, r) — 없으면 null */
    const computeGuideInSource = () => {
        const video = videoRef.current;
        const guide = guideRef.current;
        if (!video || !guide || !video.videoWidth) return null;

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const elRect = video.getBoundingClientRect();
        const ew = elRect.width;
        const eh = elRect.height;

        // object-fit: cover → source 가 컨테이너를 덮도록 확대
        const scale = Math.max(ew / vw, eh / vh);
        // 컨테이너에 보이는 source 영역의 좌상단 (source 좌표)
        const visibleW = ew / scale;
        const visibleH = eh / scale;
        const visibleX = (vw - visibleW) / 2;
        const visibleY = (vh - visibleH) / 2;

        const gRect = guide.getBoundingClientRect();
        const relX = gRect.left - elRect.left;
        const relY = gRect.top - elRect.top;

        const x = visibleX + relX / scale;
        const y = visibleY + relY / scale;
        const w = gRect.width / scale;
        const h = gRect.height / scale;

        return {
            x, y, w, h,
            cx: x + w / 2,
            cy: y + h / 2,
            r: Math.min(w, h) / 2,
        };
    };

    /** 캡처 — 2단계 방식:
     *   1) 영상을 화면 크기 캔버스에 object-fit:cover 동일하게 렌더링
     *   2) 가이드의 화면 좌표 그대로 사용해서 잘라내기
     *   source 좌표계 변환을 거치지 않아 살짝의 좌표 어긋남이 없음.
     */
    const capture = () => {
        const video = videoRef.current;
        const guide = guideRef.current;
        if (!video || !guide || !video.videoWidth) return;

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const cv = video.getBoundingClientRect();
        const gr = guide.getBoundingClientRect();

        // 1단계: 화면 크기 캔버스에 object-fit:cover 동일하게 영상 렌더
        const screenCanvas = document.createElement("canvas");
        screenCanvas.width = Math.round(cv.width);
        screenCanvas.height = Math.round(cv.height);
        const sctx = screenCanvas.getContext("2d");
        if (!sctx) return;

        const scale = Math.max(cv.width / vw, cv.height / vh);
        const drawW = vw * scale;
        const drawH = vh * scale;
        const drawX = (cv.width - drawW) / 2;
        const drawY = (cv.height - drawH) / 2;
        sctx.drawImage(video, drawX, drawY, drawW, drawH);

        // 2단계: 가이드 영역만 잘라서 최종 캔버스로 (화면 좌표 그대로)
        const relX = gr.left - cv.left;
        const relY = gr.top - cv.top;
        const W = Math.round(gr.width);
        const H = Math.round(gr.height);

        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const isCircle = cfg.cameraClass === "face";

        if (isCircle) {
            // 얼굴 — 검정 배경 + 원형 clip
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, W, H);
            ctx.save();
            ctx.beginPath();
            ctx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(screenCanvas, relX, relY, W, H, 0, 0, W, H);
            ctx.restore();
        } else {
            // 측면 / 정면 — 사각 그대로
            ctx.drawImage(screenCanvas, relX, relY, W, H, 0, 0, W, H);
        }

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const next = [...photos];
        next[step] = dataUrl;
        setPhotos(next);
        stopCamera();
    };

    /** 슬롯(또는 촬영하기/업로드) 클릭 → 모드별 동작 */
    const handleStartCapture = () => {
        if (inputMode === "camera") {
            startCamera();
        } else {
            fileInputRef.current?.click();
        }
    };

    /** 파일 input change — 곧장 저장하지 않고 조정 모드로 진입 */
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setEditingImage(ev.target?.result as string);
            setTransform({ x: 0, y: 0, scale: 1 });   // 초기 transform 리셋
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    /** 드래그 시작 — pointer capture 로 stage 밖으로 나가도 추적 유지 */
    const handleDragStart = (e: React.PointerEvent<HTMLImageElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragStartRef.current = {
            px: e.clientX, py: e.clientY,
            tx: transform.x, ty: transform.y,
        };
    };
    const handleDragMove = (e: React.PointerEvent<HTMLImageElement>) => {
        const start = dragStartRef.current;
        if (!start) return;
        const dx = e.clientX - start.px;
        const dy = e.clientY - start.py;
        setTransform((t) => ({ ...t, x: start.tx + dx, y: start.ty + dy }));
    };
    const handleDragEnd = (e: React.PointerEvent<HTMLImageElement>) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        dragStartRef.current = null;
    };

    /** 마우스 휠 줌 (데스크탑) */
    const handleWheelZoom = (e: React.WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        setTransform((t) => ({ ...t, scale: clamp(t.scale * factor, 0.3, 5) }));
    };

    /** 조정 완료 — 캔버스 크기 = 가이드 영역.
     *  ⚠️ img 가 object-contain 으로 표시되면 <img> bbox 안에 letterbox 가 생김.
     *     drawImage 는 CSS object-fit 을 무시하고 원본을 destination 박스에 강제 fill 하므로
     *     letterbox 보정 없이 그리면 비율 깨짐(세로 사진이 가로 가이드에 늘어남).
     *     → 실제 이미지 콘텐츠 영역(visibleW/H)을 계산해서 그 영역에만 그려야 함. */
    const applyAdjust = () => {
        const img = editImgRef.current;
        const guide = cropGuideRef.current;
        if (!img || !guide || !img.naturalWidth) return;

        const imgRect = img.getBoundingClientRect();
        const guideRect = guide.getBoundingClientRect();
        const SCALE = 2;
        const W = Math.round(guideRect.width * SCALE);
        const H = Math.round(guideRect.height * SCALE);

        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const isCircle = cfg.cameraClass === "face";

        // face — 검정 배경 + 원형 clip
        if (isCircle) {
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, W, H);
            ctx.save();
            ctx.beginPath();
            ctx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2);
            ctx.clip();
        }

        // object-contain letterbox 보정 — 실제 이미지가 차지하는 영역을 계산
        const natAspect = img.naturalWidth / img.naturalHeight;
        const elemAspect = imgRect.width / imgRect.height;
        let visibleW: number, visibleH: number, visibleLeft: number, visibleTop: number;
        if (natAspect > elemAspect) {
            // 이미지가 더 가로형 → 폭에 맞고 위아래 letterbox
            visibleW = imgRect.width;
            visibleH = imgRect.width / natAspect;
            visibleLeft = imgRect.left;
            visibleTop = imgRect.top + (imgRect.height - visibleH) / 2;
        } else {
            // 이미지가 더 세로형(또는 같음) → 높이에 맞고 좌우 letterbox
            visibleH = imgRect.height;
            visibleW = imgRect.height * natAspect;
            visibleLeft = imgRect.left + (imgRect.width - visibleW) / 2;
            visibleTop = imgRect.top;
        }

        // 가이드 기준 상대 위치로 변환 후 canvas 좌표로 (×SCALE)
        const ix = (visibleLeft - guideRect.left) * SCALE;
        const iy = (visibleTop - guideRect.top) * SCALE;
        const iw = visibleW * SCALE;
        const ih = visibleH * SCALE;
        ctx.drawImage(img, ix, iy, iw, ih);

        if (isCircle) ctx.restore();

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const next = [...photos];
        next[step] = dataUrl;
        setPhotos(next);
        setEditingImage(null);
        setTransform({ x: 0, y: 0, scale: 1 });
    };

    /** 조정 취소 */
    const cancelAdjust = () => {
        setEditingImage(null);
        setTransform({ x: 0, y: 0, scale: 1 });
    };

    /** 다시 찍기 — 현재 단계 사진 초기화 */
    const retake = () => {
        const next = [...photos];
        next[step] = null;
        setPhotos(next);
    };

    /** 다음 단계 → (마지막이면 분석 시작) */
    const goNext = () => {
        if (step < 2) {
            setStep((s) => (s + 1) as PetlensSlot);
        } else {
            onAnalyze();
        }
    };

    /** 이전 단계 */
    const goPrev = () => {
        if (step > 0) {
            setStep((s) => (s - 1) as PetlensSlot);
        }
    };

    // 언마운트 시 카메라 끄기
    useEffect(() => () => stopCamera(), []);

    const cfg = SLOT_CONFIG[step];
    const photoForStep = photos[step];
    const isLastStep = step === 2;

    /** 슬롯 자체의 sizing — 항상 정사각 컨테이너 안에서 가이드 비율로 가운데 정렬
     *  face(1:1) 는 컨테이너를 가득 채우고, side/front 는 컨테이너 안 일부만 차지 */
    const slotSizingClass =
        cfg.cameraClass === "face"  ? "w-full h-full"          : // 1:1 — 컨테이너 가득
        cfg.cameraClass === "side"  ? "w-full aspect-[16/10]"  : // 가로형 — 가로 가득, 세로 좁음
                                       "h-full aspect-[3/4]";   // 세로형 — 세로 가득, 가로 좁음

    return (
        <>
            {/* 단계 진행 바 — 3분할 */}
            <div className="flex items-center gap-1.5 mb-4">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full transition-colors ${
                            i < step
                                ? "bg-aurora-indigo"
                                : i === step
                                    ? "bg-gradient-to-r from-aurora-blue to-aurora-indigo"
                                    : "bg-neutral-200"
                        }`}
                    />
                ))}
            </div>
            <p className="text-[11px] font-extrabold text-aurora-indigo tracking-[0.15em] mb-1">
                STEP {step + 1} / 3 · {STEP_LABELS[step]}
            </p>
            <h3 className="text-lg font-extrabold mb-1.5">
                {inputMode === "camera"
                    ? `📷 ${cfg.label} 촬영`
                    : `🖼️ ${cfg.label} 사진 선택`}
            </h3>
            <p className="text-xs text-neutral-500 mb-4">{cfg.hint} · {cfg.cameraHint}</p>

            {cameraError && (
                <div className="mb-4 p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs leading-relaxed">
                    <strong className="font-extrabold block mb-1">📷 카메라 사용 불가</strong>
                    카메라 권한이 거부됐거나 HTTPS 환경이 아니에요.<br />
                    <span className="text-neutral-500">모바일에서 LAN IP 로 접속하면 카메라가 차단돼요. &ldquo;불러오기&rdquo;로 진행해주세요.</span>
                </div>
            )}

            {/* 현재 단계 슬롯 — 항상 정사각형 컨테이너(280x280) 안에 가이드 비율로 가운데 정렬.
                단계가 바뀌어도 컨테이너 크기는 동일 → 모달 높이 일정. */}
            <div className="mb-5">
                {editingImage ? (
                    /* 조정 모드 — 드래그·휠 줌·슬라이더로 가이드 영역에 맞춘 후 적용 */
                    <div className="space-y-3">
                        <div className="aspect-square w-full max-w-[280px] mx-auto flex items-center justify-center">
                        <div
                            ref={stageRef}
                            className={`relative ${slotSizingClass} rounded-2xl overflow-hidden bg-black select-none`}
                            onWheel={handleWheelZoom}
                        >
                            {/* 조정 중 이미지 — pointer 드래그 + transform */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                ref={editImgRef}
                                src={editingImage}
                                alt="조정 중"
                                draggable={false}
                                onPointerDown={handleDragStart}
                                onPointerMove={handleDragMove}
                                onPointerUp={handleDragEnd}
                                onPointerCancel={handleDragEnd}
                                className="absolute inset-0 w-full h-full object-contain cursor-move touch-none"
                                style={{
                                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                                    transformOrigin: "center center",
                                }}
                            />
                            {/* 가이드 오버레이 — 박스 그림자 트릭으로 바깥 어둡게 */}
                            <div
                                ref={cropGuideRef}
                                className={`${styles.cropGuide} ${styles[cfg.cameraClass]}`}
                            />
                            {/* 안내 라벨 */}
                            <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-black/65 text-white text-[10px] font-extrabold backdrop-blur-sm pointer-events-none">
                                드래그·핀치(줌)로 가이드 안에 맞춰주세요
                            </div>
                        </div>
                        </div>

                        {/* 줌 슬라이더 */}
                        <div className="flex items-center gap-3 px-1">
                            <button
                                type="button"
                                onClick={() => setTransform((t) => ({ ...t, scale: clamp(t.scale - 0.15, 0.3, 5) }))}
                                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
                                aria-label="축소"
                            >
                                <i className="fa-solid fa-magnifying-glass-minus text-xs text-neutral-600" />
                            </button>
                            <input
                                type="range"
                                min={0.3}
                                max={5}
                                step={0.05}
                                value={transform.scale}
                                onChange={(e) => setTransform((t) => ({ ...t, scale: parseFloat(e.target.value) }))}
                                className="flex-1 accent-aurora-indigo"
                            />
                            <button
                                type="button"
                                onClick={() => setTransform((t) => ({ ...t, scale: clamp(t.scale + 0.15, 0.3, 5) }))}
                                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
                                aria-label="확대"
                            >
                                <i className="fa-solid fa-magnifying-glass-plus text-xs text-neutral-600" />
                            </button>
                        </div>

                        {/* 조정 액션 — 취소 / 맞춤 완료 */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={cancelAdjust}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs font-bold hover:bg-neutral-50"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={applyAdjust}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-xs font-extrabold hover:opacity-90"
                            >
                                <i className="fa-solid fa-check mr-1.5" />
                                맞춤 완료
                            </button>
                        </div>
                    </div>
                ) : photoForStep ? (
                    /* 촬영/적용 후 미리보기 — 정사각 컨테이너 안에 가이드 비율로 */
                    <div className="aspect-square w-full max-w-[280px] mx-auto flex items-center justify-center">
                    <div className={`relative ${slotSizingClass} rounded-2xl overflow-hidden border-2 border-aurora-indigo bg-aurora-indigo/5`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={photoForStep}
                            alt={cfg.label}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-success text-white text-[10px] font-extrabold flex items-center gap-1">
                            <i className="fa-solid fa-circle-check" />
                            {cfg.label} {inputMode === "camera" ? "촬영 완료" : "선택 완료"}
                        </span>
                    </div>
                    </div>
                ) : (
                    /* 빈 슬롯 — 정사각 컨테이너 안에 가이드 비율로 배치 */
                    <div className="aspect-square w-full max-w-[280px] mx-auto flex items-center justify-center">
                    <div
                        onClick={handleStartCapture}
                        className={`relative ${slotSizingClass} rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 hover:border-aurora-indigo hover:bg-aurora-indigo/[0.04] cursor-pointer overflow-hidden transition-all flex items-center justify-center`}
                    >
                        <div className={`${styles.ratioBox} ${styles[cfg.ratioKey]}`}>
                            <div className="flex flex-col items-center justify-center text-center px-2">
                                <i className={`fa-solid ${inputMode === "camera" ? "fa-camera" : "fa-image"} text-xl md:text-2xl mb-1`} />
                                <div className="text-xs md:text-sm font-extrabold leading-tight">
                                    {cfg.label} {inputMode === "camera" ? "찍기" : "선택"}
                                </div>
                                <div className="text-[9px] md:text-[10px] opacity-70 mt-0.5 leading-tight">
                                    {cfg.ratioLabel}
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFile}
            />

            {/* 액션 — 조정 모드 시 숨김 (조정 모드는 자체 취소/적용 버튼 사용) */}
            {!editingImage && (
                <>
                    {photoForStep ? (
                        /* 촬영/적용 후: 다시 찍기 + 다음/분석 시작 */
                        <div className="flex gap-2 mb-2">
                            <button
                                type="button"
                                onClick={retake}
                                className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 bg-white text-xs font-bold hover:bg-neutral-50"
                            >
                                <i className="fa-solid fa-rotate-left mr-1.5" />
                                다시 {inputMode === "camera" ? "찍기" : "선택"}
                            </button>
                            <button
                                type="button"
                                onClick={goNext}
                                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold hover:opacity-90"
                            >
                                {isLastStep ? (
                                    <>분석 시작 <i className="fa-solid fa-wand-magic-sparkles ml-1.5" /></>
                                ) : (
                                    <>다음 <i className="fa-solid fa-arrow-right ml-1.5" /></>
                                )}
                            </button>
                        </div>
                    ) : (
                        /* 촬영 전: 촬영하기 한 버튼 (또는 업로드) */
                        <button
                            type="button"
                            onClick={handleStartCapture}
                            className="w-full mb-2 px-4 py-3 rounded-xl bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold hover:opacity-90"
                        >
                            <i className={`fa-solid ${inputMode === "camera" ? "fa-camera" : "fa-upload"} mr-1.5`} />
                            {cfg.label} {inputMode === "camera" ? "촬영하기" : "사진 선택"}
                        </button>
                    )}

                    {/* 하단 보조 — 이전 / 입력 방식 변경 */}
                    <div className="flex items-center justify-between mt-1">
                        <button
                            type="button"
                            onClick={goPrev}
                            disabled={step === 0}
                            className="text-[11px] font-bold text-neutral-500 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1"
                        >
                            <i className="fa-solid fa-chevron-left mr-1 text-[10px]" />
                            이전 단계
                        </button>
                        <button
                            type="button"
                            onClick={onChangeMode}
                            className="text-[11px] font-bold text-neutral-500 hover:text-foreground px-2 py-1"
                        >
                            <i className="fa-solid fa-rotate-left mr-1 text-[10px]" />
                            입력 방식 변경
                        </button>
                    </div>
                </>
            )}

            {/* 풀스크린 카메라 라이브뷰 (활성 시) */}
            {cameraOpen && (
                <div className={`${styles.cameraView} ${styles.active}`}>
                    <video ref={videoRef} autoPlay playsInline muted />
                    <div className="absolute top-4 left-4 z-[2] px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-bold backdrop-blur-md">
                        {cfg.label} 촬영 중
                    </div>
                    <div
                        ref={guideRef}
                        className={`${styles.guideFrame} ${styles[cfg.cameraClass]}`}
                    >
                        <span className={`${styles.corner} ${styles.tl}`} />
                        <span className={`${styles.corner} ${styles.tr}`} />
                        <span className={`${styles.corner} ${styles.bl}`} />
                        <span className={`${styles.corner} ${styles.br}`} />
                        <div className={styles.guideHint}>{cfg.cameraHint}</div>
                    </div>
                    <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-4 z-[2]">
                        <button
                            type="button"
                            onClick={stopCamera}
                            className="px-5 py-3 rounded-full bg-white/95 text-neutral-900 font-bold text-sm"
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            onClick={capture}
                            className="w-16 h-16 rounded-full bg-danger border-4 border-white shadow-2xl hover:scale-105 transition"
                            aria-label="촬영"
                        />
                    </div>
                </div>
            )}
        </>
    );
}

