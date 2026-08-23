"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    PET_OBSERVATION_MAX_DURATION_SECONDS,
    PET_OBSERVATION_MAX_FILE_BYTES,
    PET_OBSERVATION_MAX_FILE_MB,
    PET_OBSERVATION_MIN_DURATION_SECONDS,
    PET_OBSERVATION_RECORDING_SECONDS,
} from "@/lib/petlens-observation-limits";
import {
    buildPetLensOnDeviceScanReport,
    PETLENS_ON_DEVICE_SCAN_MIN_FRAMES,
    petLensOnDeviceScanCanRecord,
    type PetLensOnDeviceFrameSample,
    type PetLensOnDeviceScanReport,
    type PetLensOnDeviceScanStatus,
} from "@/lib/petlens-on-device-scan";


const RECORDING_SECONDS = PET_OBSERVATION_RECORDING_SECONDS;
const MAX_FILE_BYTES = PET_OBSERVATION_MAX_FILE_BYTES;
const LIVE_VIDEO_BITS_PER_SECOND = 600_000;
const LIVE_AUDIO_BITS_PER_SECOND = 48_000;
const ON_DEVICE_SAMPLE_INTERVAL_MS = 300;
const ON_DEVICE_SAMPLE_WIDTH = 160;
const ON_DEVICE_SAMPLE_HEIGHT = 120;

export type PetLensCapturePhase = "idle" | "requesting" | "preview" | "recording" | "recorded" | "error";
export type PetLensCameraFacing = "environment" | "user";
export type PetLensCaptureOrientation = "portrait" | "landscape";
export type PetLensCaptureOrientationStatus = "unknown" | "matched" | "preview_only";
export type PetLensCaptureSource = "live_camera" | "uploaded_video" | null;
export type PetLensMediaDeviceOption = {
    deviceId: string;
    label: string;
};

type PetLensCameraStartOptions = {
    videoDeviceId?: string;
    audioDeviceId?: string;
    facingMode?: PetLensCameraFacing;
    orientation?: PetLensCaptureOrientation;
};

export function currentPetLensOrientation(): PetLensCaptureOrientation {
    const touchFirstDevice = window.matchMedia("(pointer: coarse)").matches
        || navigator.maxTouchPoints > 0;
    const screenType = window.screen?.orientation?.type || "";
    const legacyAngle = (window as Window & { orientation?: number }).orientation;
    if (touchFirstDevice) {
        if (screenType.startsWith("portrait")) return "portrait";
        if (screenType.startsWith("landscape")) return "landscape";
        if (typeof legacyAngle === "number") {
            return Math.abs(legacyAngle) === 90 ? "landscape" : "portrait";
        }
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width > 0 && height > 0 && width !== height) {
        return width > height ? "landscape" : "portrait";
    }
    if (screenType.startsWith("portrait")) return "portrait";
    if (screenType.startsWith("landscape")) return "landscape";
    if (typeof legacyAngle === "number") {
        return Math.abs(legacyAngle) === 90 ? "landscape" : "portrait";
    }
    const viewport = window.visualViewport;
    return (viewport?.width || 0) > (viewport?.height || 0) ? "landscape" : "portrait";
}

function cameraShapeConstraints(orientation: PetLensCaptureOrientation): MediaTrackConstraints {
    const portrait = orientation === "portrait";
    return {
        width: { ideal: portrait ? 720 : 1280 },
        height: { ideal: portrait ? 960 : 720 },
        aspectRatio: { ideal: portrait ? 3 / 4 : 16 / 9 },
        resizeMode: { ideal: "crop-and-scale" },
    } as MediaTrackConstraints;
}

function detectedStreamOrientation(
    track: MediaStreamTrack,
    video?: HTMLVideoElement | null,
): PetLensCaptureOrientation | null {
    const width = video?.videoWidth || Number(track.getSettings?.().width || 0);
    const height = video?.videoHeight || Number(track.getSettings?.().height || 0);
    if (width <= 0 || height <= 0 || width === height) return null;
    return width > height ? "landscape" : "portrait";
}

function mediaDeviceOptions(devices: MediaDeviceInfo[], kind: MediaDeviceKind, fallbackLabel: string) {
    return devices
        .filter((device) => device.kind === kind && Boolean(device.deviceId))
        .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label.trim() || `${fallbackLabel} ${index + 1}`,
        }));
}

function preferredRecorderMime() {
    if (typeof MediaRecorder === "undefined") return "";
    return [
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4;codecs=h264,aac",
        "video/mp4",
    ].find((mime) => MediaRecorder.isTypeSupported(mime)) || "";
}

function durationOf(file: File) {
    return new Promise<number>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        let settled = false;
        const finish = (callback: () => void) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeoutId);
            video.removeAttribute("src");
            video.load();
            URL.revokeObjectURL(url);
            callback();
        };
        const timeoutId = window.setTimeout(() => finish(() => reject(new Error("영상 길이를 확인하지 못했습니다."))), 8000);
        video.preload = "metadata";
        video.onloadedmetadata = () => {
            const duration = video.duration;
            finish(() => {
                if (!Number.isFinite(duration) || duration <= 0) reject(new Error("영상 길이를 확인하지 못했습니다."));
                else resolve(duration);
            });
        };
        video.onerror = () => finish(() => reject(new Error("영상을 재생할 수 없습니다.")));
        video.src = url;
    });
}

export function usePetLensMediaCapture() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startedAtRef = useRef(0);
    const stopTimerRef = useRef<number | null>(null);
    const tickTimerRef = useRef<number | null>(null);
    const clipUrlRef = useRef("");
    const discardRef = useRef(false);
    const mountedRef = useRef(true);
    const cameraRequestRef = useRef(0);
    const onDeviceScanTimerRef = useRef<number | null>(null);
    const onDeviceAudioContextRef = useRef<AudioContext | null>(null);
    const onDeviceAnalyserRef = useRef<AnalyserNode | null>(null);
    const onDeviceAudioBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
    const onDeviceScanSamplesRef = useRef<PetLensOnDeviceFrameSample[]>([]);
    const onDeviceScanStartedAtRef = useRef(0);
    const onDevicePreviousFrameRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
    const onDeviceScanReportRef = useRef<PetLensOnDeviceScanReport | null>(null);

    const [phase, setPhase] = useState<PetLensCapturePhase>("idle");
    const [supported, setSupported] = useState<boolean | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(RECORDING_SECONDS);
    const [clip, setClip] = useState<File | null>(null);
    const [clipUrl, setClipUrl] = useState("");
    const [durationSeconds, setDurationSeconds] = useState(0);
    const [error, setError] = useState("");
    const [videoDevices, setVideoDevices] = useState<PetLensMediaDeviceOption[]>([]);
    const [audioDevices, setAudioDevices] = useState<PetLensMediaDeviceOption[]>([]);
    const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
    const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("");
    const [facingMode, setFacingMode] = useState<PetLensCameraFacing>("environment");
    const [captureOrientationStatus, setCaptureOrientationStatus] = useState<PetLensCaptureOrientationStatus>("unknown");
    const [captureSource, setCaptureSource] = useState<PetLensCaptureSource>(null);
    const [onDeviceScanStatus, setOnDeviceScanStatus] = useState<PetLensOnDeviceScanStatus>("idle");
    const [onDeviceScanReport, setOnDeviceScanReport] = useState<PetLensOnDeviceScanReport | null>(null);

    const clearTimers = useCallback(() => {
        if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
        if (tickTimerRef.current !== null) window.clearInterval(tickTimerRef.current);
        stopTimerRef.current = null;
        tickTimerRef.current = null;
    }, []);

    const stopOnDeviceScan = useCallback(() => {
        if (onDeviceScanTimerRef.current !== null) {
            window.clearInterval(onDeviceScanTimerRef.current);
            onDeviceScanTimerRef.current = null;
        }
        const audioContext = onDeviceAudioContextRef.current;
        onDeviceAudioContextRef.current = null;
        onDeviceAnalyserRef.current = null;
        onDeviceAudioBufferRef.current = null;
        if (audioContext && audioContext.state !== "closed") {
            void audioContext.close().catch(() => undefined);
        }
        onDevicePreviousFrameRef.current = null;
    }, []);

    const resetOnDeviceScan = useCallback(() => {
        stopOnDeviceScan();
        onDeviceScanSamplesRef.current = [];
        onDeviceScanReportRef.current = null;
        if (mountedRef.current) {
            setOnDeviceScanReport(null);
            setOnDeviceScanStatus("idle");
        }
    }, [stopOnDeviceScan]);

    const startOnDeviceScan = useCallback((stream: MediaStream) => {
        stopOnDeviceScan();
        onDeviceScanSamplesRef.current = [];
        onDeviceScanReportRef.current = null;
        onDeviceScanStartedAtRef.current = performance.now();
        onDevicePreviousFrameRef.current = null;
        setOnDeviceScanReport(null);
        setOnDeviceScanStatus("scanning");

        const canvas = document.createElement("canvas");
        canvas.width = ON_DEVICE_SAMPLE_WIDTH;
        canvas.height = ON_DEVICE_SAMPLE_HEIGHT;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
            setOnDeviceScanStatus("unavailable");
            return;
        }

        try {
            const AudioContextConstructor = window.AudioContext
                || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (AudioContextConstructor) {
                const audioContext = new AudioContextConstructor();
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 1_024;
                analyser.smoothingTimeConstant = 0.35;
                audioContext.createMediaStreamSource(stream).connect(analyser);
                onDeviceAudioContextRef.current = audioContext;
                onDeviceAnalyserRef.current = analyser;
                onDeviceAudioBufferRef.current = new Float32Array(analyser.fftSize);
                void audioContext.resume().catch(() => undefined);
            }
        } catch {
            // Video preflight still works when Web Audio is unavailable.
        }

        const sampleFrame = () => {
            const video = videoRef.current;
            if (
                !mountedRef.current
                || !video
                || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
                || video.videoWidth <= 0
                || video.videoHeight <= 0
            ) return;
            try {
                context.drawImage(video, 0, 0, ON_DEVICE_SAMPLE_WIDTH, ON_DEVICE_SAMPLE_HEIGHT);
                const rgba = context.getImageData(0, 0, ON_DEVICE_SAMPLE_WIDTH, ON_DEVICE_SAMPLE_HEIGHT).data;
                const pixelCount = rgba.length / 4;
                const grayscale = new Uint8Array(pixelCount);
                let luminanceSum = 0;
                let luminanceSquareSum = 0;
                let motionSum = 0;
                const previous = onDevicePreviousFrameRef.current;
                for (let pixel = 0, offset = 0; pixel < pixelCount; pixel += 1, offset += 4) {
                    const luminance = Math.round(
                        (rgba[offset] * 0.299) + (rgba[offset + 1] * 0.587) + (rgba[offset + 2] * 0.114),
                    );
                    grayscale[pixel] = luminance;
                    luminanceSum += luminance;
                    luminanceSquareSum += luminance * luminance;
                    if (previous) motionSum += Math.abs(luminance - previous[pixel]);
                }
                onDevicePreviousFrameRef.current = grayscale;
                const luminance = luminanceSum / pixelCount;
                const variance = Math.max(0, (luminanceSquareSum / pixelCount) - (luminance * luminance));
                const analyser = onDeviceAnalyserRef.current;
                const audioBuffer = onDeviceAudioBufferRef.current;
                let audioRms: number | null = null;
                let audioPeak: number | null = null;
                if (analyser && audioBuffer) {
                    analyser.getFloatTimeDomainData(audioBuffer);
                    let audioSquareSum = 0;
                    let peak = 0;
                    for (const value of audioBuffer) {
                        audioSquareSum += value * value;
                        peak = Math.max(peak, Math.abs(value));
                    }
                    audioRms = Math.sqrt(audioSquareSum / audioBuffer.length);
                    audioPeak = peak;
                }
                const samples = onDeviceScanSamplesRef.current;
                samples.push({
                    luminance,
                    contrast: Math.sqrt(variance),
                    motion: previous ? motionSum / pixelCount : null,
                    audioRms,
                    audioPeak,
                });
                if (samples.length > 20) samples.shift();
                const report = buildPetLensOnDeviceScanReport(
                    samples,
                    performance.now() - onDeviceScanStartedAtRef.current,
                );
                onDeviceScanReportRef.current = report;
                setOnDeviceScanReport(report);
                setOnDeviceScanStatus(report.status);
            } catch {
                if (onDeviceScanSamplesRef.current.length < PETLENS_ON_DEVICE_SCAN_MIN_FRAMES) {
                    setOnDeviceScanStatus("unavailable");
                }
            }
        };
        sampleFrame();
        onDeviceScanTimerRef.current = window.setInterval(sampleFrame, ON_DEVICE_SAMPLE_INTERVAL_MS);
    }, [stopOnDeviceScan]);

    const stopTracks = useCallback(() => {
        stopOnDeviceScan();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (mountedRef.current) setCaptureOrientationStatus("unknown");
        if (videoRef.current) videoRef.current.srcObject = null;
    }, [stopOnDeviceScan]);

    const revokeClipUrl = useCallback(() => {
        if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
        clipUrlRef.current = "";
        if (mountedRef.current) setClipUrl("");
    }, []);

    const cancelCapture = useCallback((message = "") => {
        cameraRequestRef.current += 1;
        discardRef.current = true;
        clearTimers();
        const recorder = recorderRef.current;
        recorderRef.current = null;
        if (recorder?.state === "recording") {
            recorder.ondataavailable = null;
            recorder.onstop = null;
            recorder.stop();
        }
        stopTracks();
        onDeviceScanSamplesRef.current = [];
        onDeviceScanReportRef.current = null;
        chunksRef.current = [];
        if (mountedRef.current) {
            setPhase(message ? "error" : "idle");
            setError(message);
            setSecondsLeft(RECORDING_SECONDS);
            setCaptureSource(null);
            setOnDeviceScanReport(null);
            setOnDeviceScanStatus("idle");
        }
    }, [clearTimers, stopTracks]);

    const reset = useCallback(() => {
        cancelCapture();
        revokeClipUrl();
        setClip(null);
        setDurationSeconds(0);
        setError("");
        setPhase("idle");
        setCaptureSource(null);
        resetOnDeviceScan();
    }, [cancelCapture, resetOnDeviceScan, revokeClipUrl]);

    const refreshDevices = useCallback(async () => {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            if (!mountedRef.current) return;
            setVideoDevices(mediaDeviceOptions(devices, "videoinput", "카메라"));
            setAudioDevices(mediaDeviceOptions(devices, "audioinput", "마이크"));
        } catch {
            // Device labels and enumeration are optional. Live capture can still use browser defaults.
        }
    }, []);

    const startCamera = useCallback(async (options: PetLensCameraStartOptions = {}) => {
        const requestId = cameraRequestRef.current + 1;
        cameraRequestRef.current = requestId;
        const requestedVideoDeviceId = options.videoDeviceId === undefined
            ? selectedVideoDeviceId
            : options.videoDeviceId;
        const requestedAudioDeviceId = options.audioDeviceId === undefined
            ? selectedAudioDeviceId
            : options.audioDeviceId;
        const requestedFacingMode = options.facingMode || facingMode;
        const requestedOrientation = options.orientation || currentPetLensOrientation();
        setError("");
        setClip(null);
        setDurationSeconds(0);
        revokeClipUrl();
        resetOnDeviceScan();
        stopTracks();
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
            setSupported(false);
            setPhase("error");
            setError("이 브라우저에서는 실시간 촬영을 지원하지 않습니다. 아래에서 촬영한 영상을 선택해 주세요.");
            return;
        }
        setPhase("requesting");
        try {
            const requestStream = (videoDeviceId: string, audioDeviceId: string) => {
                return navigator.mediaDevices.getUserMedia({
                    video: {
                        ...(videoDeviceId
                            ? { deviceId: { exact: videoDeviceId } }
                            : { facingMode: { ideal: requestedFacingMode } }),
                        ...cameraShapeConstraints(requestedOrientation),
                    },
                    audio: {
                        ...(audioDeviceId ? { deviceId: { exact: audioDeviceId } } : {}),
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                    },
                });
            };
            let stream: MediaStream;
            let effectiveVideoDeviceId = requestedVideoDeviceId;
            let effectiveAudioDeviceId = requestedAudioDeviceId;
            try {
                stream = await requestStream(requestedVideoDeviceId, requestedAudioDeviceId);
            } catch (reason) {
                if (!mountedRef.current || cameraRequestRef.current !== requestId) return;
                const name = reason instanceof DOMException ? reason.name : "";
                const selectedDeviceUnavailable = Boolean(requestedVideoDeviceId || requestedAudioDeviceId)
                    && (name === "OverconstrainedError" || name === "NotFoundError" || name === "DevicesNotFoundError");
                if (!selectedDeviceUnavailable) throw reason;
                setSelectedVideoDeviceId("");
                setSelectedAudioDeviceId("");
                effectiveVideoDeviceId = "";
                effectiveAudioDeviceId = "";
                stream = await requestStream("", "");
            }
            if (!mountedRef.current || cameraRequestRef.current !== requestId) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            if (!stream.getVideoTracks().length || !stream.getAudioTracks().length) {
                stream.getTracks().forEach((track) => track.stop());
                throw new Error("카메라와 마이크를 모두 연결해야 합니다.");
            }
            streamRef.current = stream;
            const videoSettings = stream.getVideoTracks()[0].getSettings?.() || {};
            const audioSettings = stream.getAudioTracks()[0].getSettings?.() || {};
            const actualFacingMode = videoSettings.facingMode === "user" || videoSettings.facingMode === "environment"
                ? videoSettings.facingMode
                : requestedFacingMode;
            setFacingMode(actualFacingMode);
            setSelectedVideoDeviceId(videoSettings.deviceId || effectiveVideoDeviceId);
            setSelectedAudioDeviceId(audioSettings.deviceId || effectiveAudioDeviceId);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.muted = true;
                await videoRef.current.play().catch(() => undefined);
            }
            setCaptureSource("live_camera");
            startOnDeviceScan(stream);
            const detectedOrientation = detectedStreamOrientation(stream.getVideoTracks()[0], videoRef.current);
            setCaptureOrientationStatus(
                detectedOrientation === null
                    ? "unknown"
                    : detectedOrientation === requestedOrientation ? "matched" : "preview_only",
            );
            await refreshDevices();
            setPhase("preview");
        } catch (reason) {
            if (!mountedRef.current || cameraRequestRef.current !== requestId) return;
            const name = reason instanceof DOMException ? reason.name : "";
            const message = name === "NotAllowedError" || name === "SecurityError"
                ? "카메라와 마이크 권한이 필요합니다. 브라우저 주소창의 권한 설정을 확인해 주세요."
                : name === "NotFoundError" || name === "DevicesNotFoundError"
                    ? "사용할 수 있는 카메라 또는 마이크를 찾지 못했습니다."
                    : reason instanceof Error ? reason.message : "카메라와 마이크를 연결하지 못했습니다.";
            stopTracks();
            resetOnDeviceScan();
            setCaptureSource(null);
            setPhase("error");
            setError(message);
        }
    }, [
        facingMode,
        refreshDevices,
        resetOnDeviceScan,
        revokeClipUrl,
        selectedAudioDeviceId,
        selectedVideoDeviceId,
        startOnDeviceScan,
        stopTracks,
    ]);

    const switchCamera = useCallback(async () => {
        if (videoDevices.length > 1) {
            const currentIndex = videoDevices.findIndex((device) => device.deviceId === selectedVideoDeviceId);
            const nextDevice = videoDevices[(currentIndex + 1 + videoDevices.length) % videoDevices.length];
            await startCamera({ videoDeviceId: nextDevice.deviceId });
            return;
        }
        await startCamera({
            videoDeviceId: "",
            facingMode: facingMode === "environment" ? "user" : "environment",
        });
    }, [facingMode, selectedVideoDeviceId, startCamera, videoDevices]);

    const startRecording = useCallback(() => {
        const stream = streamRef.current;
        if (!stream || phase !== "preview") return;
        const currentScanStatus = onDeviceScanReportRef.current?.status || onDeviceScanStatus;
        if (!petLensOnDeviceScanCanRecord(currentScanStatus)) {
            setError(
                onDeviceScanReportRef.current?.blockingReason
                || "기기에서 촬영 환경을 확인하고 있습니다. 잠시 후 다시 눌러 주세요.",
            );
            return;
        }
        setError("");
        discardRef.current = false;
        chunksRef.current = [];
        const mimeType = preferredRecorderMime();
        try {
            let recorder: MediaRecorder;
            try {
                recorder = new MediaRecorder(stream, {
                    ...(mimeType ? { mimeType } : {}),
                    videoBitsPerSecond: LIVE_VIDEO_BITS_PER_SECOND,
                    audioBitsPerSecond: LIVE_AUDIO_BITS_PER_SECOND,
                });
            } catch {
                recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            }
            recorderRef.current = recorder;
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data);
            };
            recorder.onstop = () => {
                clearTimers();
                recorderRef.current = null;
                const finalOnDeviceScan = onDeviceScanReportRef.current;
                stopTracks();
                if (discardRef.current || !mountedRef.current) {
                    chunksRef.current = [];
                    return;
                }
                if (finalOnDeviceScan?.status === "blocked") {
                    chunksRef.current = [];
                    setPhase("error");
                    setError(finalOnDeviceScan.blockingReason || "촬영 화면을 확인할 수 없습니다. 다시 촬영해 주세요.");
                    return;
                }
                const actualType = recorder.mimeType || mimeType || "video/webm";
                const blob = new Blob(chunksRef.current, { type: actualType });
                chunksRef.current = [];
                if (!blob.size) {
                    setPhase("error");
                    setError("촬영된 영상이 비어 있습니다. 다시 촬영해 주세요.");
                    return;
                }
                if (blob.size > MAX_FILE_BYTES) {
                    setPhase("error");
                    setError(`촬영된 영상 용량이 ${PET_OBSERVATION_MAX_FILE_MB}MB를 넘었습니다. 다시 촬영해 주세요.`);
                    return;
                }
                const elapsed = Math.min(
                    RECORDING_SECONDS,
                    (performance.now() - startedAtRef.current) / 1000,
                );
                if (elapsed < PET_OBSERVATION_MIN_DURATION_SECONDS) {
                    setPhase("error");
                    setError(`촬영이 너무 일찍 끝났습니다. ${PET_OBSERVATION_MIN_DURATION_SECONDS}초 이상 다시 촬영해 주세요.`);
                    return;
                }
                const extension = actualType.toLowerCase().includes("mp4") ? "mp4" : "webm";
                const file = new File([blob], `pet-observation.${extension}`, { type: actualType });
                const url = URL.createObjectURL(file);
                revokeClipUrl();
                clipUrlRef.current = url;
                setClipUrl(url);
                setClip(file);
                setDurationSeconds(elapsed);
                setPhase("recorded");
                setSecondsLeft(0);
            };
            recorder.onerror = () => {
                cancelCapture("촬영을 완료하지 못했습니다. 다시 시도해 주세요.");
            };
            startedAtRef.current = performance.now();
            setSecondsLeft(RECORDING_SECONDS);
            setPhase("recording");
            recorder.start(500);
            tickTimerRef.current = window.setInterval(() => {
                const elapsed = (performance.now() - startedAtRef.current) / 1000;
                setSecondsLeft(Math.max(0, Math.ceil(RECORDING_SECONDS - elapsed)));
            }, 200);
            stopTimerRef.current = window.setTimeout(() => {
                if (recorder.state === "recording") recorder.stop();
            }, RECORDING_SECONDS * 1000);
        } catch {
            cancelCapture("이 브라우저에서 영상 녹화를 시작하지 못했습니다. 아래에서 촬영한 영상을 선택해 주세요.");
        }
    }, [cancelCapture, clearTimers, onDeviceScanStatus, phase, revokeClipUrl, stopTracks]);

    const selectFile = useCallback(async (file?: File) => {
        if (!file) return;
        setError("");
        cancelCapture();
        const requestId = cameraRequestRef.current + 1;
        cameraRequestRef.current = requestId;
        revokeClipUrl();
        setClip(null);
        setDurationSeconds(0);
        const lowerName = file.name.toLowerCase();
        const normalizedType = file.type.split(";", 1)[0].toLowerCase();
        const allowedTypes = new Set(["video/webm", "video/mp4", "video/quicktime", "video/mov"]);
        const allowed = allowedTypes.has(normalizedType)
            || (!normalizedType && [".webm", ".mp4", ".mov"].some((extension) => lowerName.endsWith(extension)));
        if (!allowed) {
            setPhase("error");
            setError("WebM, MP4 또는 MOV 영상만 선택할 수 있습니다.");
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            setPhase("error");
            setError(`영상 용량이 너무 큽니다. 최대 ${PET_OBSERVATION_MAX_FILE_MB}MB 영상을 선택해 주세요.`);
            return;
        }
        try {
            const duration = await durationOf(file);
            if (!mountedRef.current || cameraRequestRef.current !== requestId) return;
            if (
                duration < PET_OBSERVATION_MIN_DURATION_SECONDS
                || duration > PET_OBSERVATION_MAX_DURATION_SECONDS
            ) {
                throw new Error(
                    `${PET_OBSERVATION_MIN_DURATION_SECONDS}초 이상 ${PET_OBSERVATION_MAX_DURATION_SECONDS}초 이내의 영상을 선택해 주세요.`,
                );
            }
            const inferredType = normalizedType || (lowerName.endsWith(".mov")
                ? "video/quicktime"
                : lowerName.endsWith(".mp4") ? "video/mp4" : "video/webm");
            const normalizedFile = file.type ? file : new File([file], file.name, { type: inferredType });
            const url = URL.createObjectURL(normalizedFile);
            clipUrlRef.current = url;
            setClipUrl(url);
            setClip(normalizedFile);
            setDurationSeconds(duration);
            setCaptureSource("uploaded_video");
            setPhase("recorded");
        } catch (reason) {
            if (!mountedRef.current || cameraRequestRef.current !== requestId) return;
            setPhase("error");
            setError(reason instanceof Error ? reason.message : "영상을 불러오지 못했습니다.");
        }
    }, [cancelCapture, revokeClipUrl]);

    useEffect(() => {
        mountedRef.current = true;
        const supportFrame = window.requestAnimationFrame(() => {
            setSupported(Boolean(navigator.mediaDevices && typeof MediaRecorder !== "undefined"));
            void refreshDevices();
        });
        const handlePageHide = () => cancelCapture();
        const handleDeviceChange = () => void refreshDevices();
        window.addEventListener("pagehide", handlePageHide);
        navigator.mediaDevices?.addEventListener?.("devicechange", handleDeviceChange);
        return () => {
            mountedRef.current = false;
            window.cancelAnimationFrame(supportFrame);
            window.removeEventListener("pagehide", handlePageHide);
            navigator.mediaDevices?.removeEventListener?.("devicechange", handleDeviceChange);
            cancelCapture();
            revokeClipUrl();
        };
    }, [cancelCapture, refreshDevices, revokeClipUrl]);

    useEffect(() => {
        if (phase !== "preview") return;
        let syncTimer = 0;
        let lastAppliedOrientation: PetLensCaptureOrientation | "" = "";
        const syncPreviewOrientation = () => {
            window.clearTimeout(syncTimer);
            syncTimer = window.setTimeout(() => {
                const track = streamRef.current?.getVideoTracks()[0];
                if (!track || track.readyState !== "live") return;
                const nextOrientation = currentPetLensOrientation();
                if (nextOrientation === lastAppliedOrientation) return;
                lastAppliedOrientation = nextOrientation;
                void track.applyConstraints(cameraShapeConstraints(nextOrientation))
                    .then(() => {
                        if (!mountedRef.current) return;
                        const detectedOrientation = detectedStreamOrientation(track, videoRef.current);
                        setCaptureOrientationStatus(
                            detectedOrientation === null
                                ? "unknown"
                                : detectedOrientation === nextOrientation ? "matched" : "preview_only",
                        );
                    })
                    .catch(() => {
                        if (mountedRef.current) setCaptureOrientationStatus("preview_only");
                    });
            }, 180);
        };
        syncPreviewOrientation();
        window.addEventListener("resize", syncPreviewOrientation);
        window.addEventListener("orientationchange", syncPreviewOrientation);
        window.visualViewport?.addEventListener("resize", syncPreviewOrientation);
        window.screen.orientation?.addEventListener("change", syncPreviewOrientation);
        return () => {
            window.clearTimeout(syncTimer);
            window.removeEventListener("resize", syncPreviewOrientation);
            window.removeEventListener("orientationchange", syncPreviewOrientation);
            window.visualViewport?.removeEventListener("resize", syncPreviewOrientation);
            window.screen.orientation?.removeEventListener("change", syncPreviewOrientation);
        };
    }, [phase]);

    return {
        videoRef,
        phase,
        supported,
        secondsLeft,
        clip,
        clipUrl,
        durationSeconds,
        error,
        videoDevices,
        audioDevices,
        selectedVideoDeviceId,
        selectedAudioDeviceId,
        facingMode,
        captureOrientationStatus,
        captureSource,
        onDeviceScanStatus,
        onDeviceScanReport,
        canStartRecording: petLensOnDeviceScanCanRecord(onDeviceScanStatus),
        startCamera,
        switchCamera,
        startRecording,
        selectFile,
        reset,
        cancelCapture,
    };
}
