/**
 * PetlensUpload — Step 2: 슬롯 3개 + 카메라 라이브뷰 / 파일 선택
 * ---------------------------------------------------------------------
 * 모드별 동작:
 *   camera → 슬롯 클릭 시 풀스크린 카메라 + 가이드 프레임 + 캡처
 *   file   → 슬롯 클릭 시 파일 다이얼로그
 *
 * 슬롯 3개 모두 채워지면 "분석 시작" 버튼 활성.
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

export default function PetlensUpload({
    inputMode, photos, setPhotos, onChangeMode, onAnalyze,
}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeSlot, setActiveSlot] = useState<PetlensSlot>(0);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    /** 카메라 정지 — 리소스 해제 */
    const stopCamera = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setCameraOpen(false);
    };

    /** 카메라 시작 */
    const startCamera = async (slot: PetlensSlot) => {
        setActiveSlot(slot);
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

    /** 캡처 — video 프레임을 canvas 로 → dataURL → 슬롯 저장 */
    const capture = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const next = [...photos];
        next[activeSlot] = dataUrl;
        setPhotos(next);
        stopCamera();
    };

    /** 슬롯 클릭 — 모드별 동작 */
    const handleSlotClick = (slot: PetlensSlot) => {
        if (photos[slot]) return;   // 이미 채워졌으면 무시 (삭제 후 다시)
        setActiveSlot(slot);
        if (inputMode === "camera") {
            startCamera(slot);
        } else {
            fileInputRef.current?.click();
        }
    };

    /** 파일 input change */
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const next = [...photos];
            next[activeSlot] = ev.target?.result as string;
            setPhotos(next);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    /** 슬롯 사진 제거 */
    const removeSlot = (slot: PetlensSlot, e: React.MouseEvent) => {
        e.stopPropagation();
        const next = [...photos];
        next[slot] = null;
        setPhotos(next);
    };

    // 언마운트 시 카메라 끄기
    useEffect(() => () => stopCamera(), []);

    const allFilled = photos.every((p) => !!p);
    const slotIndices: PetlensSlot[] = [0, 1, 2];
    const activeConfig = SLOT_CONFIG[activeSlot];

    return (
        <>
            <h3 className="text-lg font-extrabold mb-1.5">
                {inputMode === "camera"
                    ? "📷 촬영 모드 — 슬롯을 누르면 바로 카메라가 켜져요"
                    : "🖼️ 사진 불러오기 — 슬롯을 누르면 사진 선택창이 열려요"}
            </h3>
            <p className="text-xs text-neutral-500 mb-5">
                {inputMode === "camera"
                    ? "각 부위에 맞춰 가이드 안에 댕댕이를 맞춰 찍어주세요"
                    : "각 부위에 맞는 사진을 선택해주세요"}
            </p>

            {cameraError && (
                <div className="mb-4 p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs leading-relaxed">
                    <strong className="font-extrabold block mb-1">📷 카메라 사용 불가</strong>
                    카메라 권한이 거부됐거나 HTTPS 환경이 아니에요.<br />
                    <span className="text-neutral-500">모바일에서 LAN IP 로 접속하면 카메라가 차단돼요. &ldquo;불러오기&rdquo;로 진행해주세요.</span>
                </div>
            )}

            {/* 슬롯 3개 */}
            <div className="space-y-3 mb-5">
                {slotIndices.map((slot) => {
                    const cfg = SLOT_CONFIG[slot];
                    const filled = !!photos[slot];
                    return (
                        <div
                            key={slot}
                            onClick={() => handleSlotClick(slot)}
                            className={`relative aspect-[5/3] rounded-2xl border-2 cursor-pointer overflow-hidden transition-all
                                ${filled
                                    ? "border-aurora-indigo bg-aurora-indigo/5"
                                    : "border-dashed border-neutral-300 bg-neutral-50 hover:border-aurora-indigo"
                                }`}
                        >
                            {filled ? (
                                <>
                                    <img
                                        src={photos[slot] as string}
                                        alt={cfg.label}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => removeSlot(slot, e)}
                                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-neutral-700 flex items-center justify-center"
                                        aria-label="삭제"
                                    >
                                        <i className="fa-solid fa-xmark" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className={`${styles.ratioBox} ${styles[cfg.ratioKey]}`}>
                                        {cfg.ratioLabel}
                                    </div>
                                    <div className="absolute bottom-3 left-0 right-0 text-center">
                                        <div className="text-sm font-extrabold text-foreground">{cfg.label}</div>
                                        <div className="text-[10px] text-neutral-500">{cfg.hint}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFile}
            />

            {/* 액션 */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onChangeMode}
                    className="px-4 py-3 rounded-xl border border-neutral-200 bg-white text-xs font-bold hover:bg-neutral-50"
                >
                    <i className="fa-solid fa-rotate-left mr-1.5" />
                    입력 방식 변경
                </button>
                <button
                    type="button"
                    onClick={onAnalyze}
                    disabled={!allFilled}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                >
                    분석 시작 <i className="fa-solid fa-wand-magic-sparkles ml-1.5" />
                </button>
            </div>

            {/* 풀스크린 카메라 라이브뷰 (활성 시) */}
            {cameraOpen && (
                <div className={`${styles.cameraView} ${styles.active}`}>
                    <video ref={videoRef} autoPlay playsInline muted />
                    <div className="absolute top-4 left-4 z-[2] px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-bold backdrop-blur-md">
                        {activeConfig.label} 촬영 중
                    </div>
                    <div className={`${styles.guideFrame} ${styles[activeConfig.cameraClass]}`}>
                        <span className={`${styles.corner} ${styles.tl}`} />
                        <span className={`${styles.corner} ${styles.tr}`} />
                        <span className={`${styles.corner} ${styles.bl}`} />
                        <span className={`${styles.corner} ${styles.br}`} />
                        <div className={styles.guideHint}>{activeConfig.cameraHint}</div>
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
