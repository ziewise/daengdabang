"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    PET_OBSERVATION_MAX_DURATION_SECONDS,
    PET_OBSERVATION_MAX_FILE_BYTES,
    PET_OBSERVATION_MAX_FILE_MB,
    PET_OBSERVATION_MIN_DURATION_SECONDS,
    PET_OBSERVATION_RECORDING_SECONDS,
} from "@/lib/petlens-observation-limits";


const RECORDING_SECONDS = PET_OBSERVATION_RECORDING_SECONDS;
const MAX_FILE_BYTES = PET_OBSERVATION_MAX_FILE_BYTES;

export type PetLensCapturePhase = "idle" | "requesting" | "preview" | "recording" | "recorded" | "error";
export type PetLensCameraFacing = "environment" | "user";
export type PetLensMediaDeviceOption = {
    deviceId: string;
    label: string;
};

type PetLensCameraStartOptions = {
    videoDeviceId?: string;
    audioDeviceId?: string;
    facingMode?: PetLensCameraFacing;
};

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

    const clearTimers = useCallback(() => {
        if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
        if (tickTimerRef.current !== null) window.clearInterval(tickTimerRef.current);
        stopTimerRef.current = null;
        tickTimerRef.current = null;
    }, []);

    const stopTracks = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

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
        chunksRef.current = [];
        if (mountedRef.current) {
            setPhase(message ? "error" : "idle");
            setError(message);
            setSecondsLeft(RECORDING_SECONDS);
        }
    }, [clearTimers, stopTracks]);

    const reset = useCallback(() => {
        cancelCapture();
        revokeClipUrl();
        setClip(null);
        setDurationSeconds(0);
        setError("");
        setPhase("idle");
    }, [cancelCapture, revokeClipUrl]);

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
        setError("");
        setClip(null);
        setDurationSeconds(0);
        revokeClipUrl();
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
                const portrait = window.matchMedia("(orientation: portrait)").matches;
                return navigator.mediaDevices.getUserMedia({
                    video: {
                        ...(videoDeviceId
                            ? { deviceId: { exact: videoDeviceId } }
                            : { facingMode: { ideal: requestedFacingMode } }),
                        width: { ideal: portrait ? 720 : 1280 },
                        height: { ideal: portrait ? 1280 : 720 },
                        aspectRatio: { ideal: portrait ? 3 / 4 : 16 / 9 },
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
            setPhase("error");
            setError(message);
        }
    }, [facingMode, refreshDevices, revokeClipUrl, selectedAudioDeviceId, selectedVideoDeviceId, stopTracks]);

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
        setError("");
        discardRef.current = false;
        chunksRef.current = [];
        const mimeType = preferredRecorderMime();
        try {
            let recorder: MediaRecorder;
            try {
                recorder = new MediaRecorder(stream, {
                    ...(mimeType ? { mimeType } : {}),
                    videoBitsPerSecond: 800_000,
                    audioBitsPerSecond: 64_000,
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
                stopTracks();
                if (discardRef.current || !mountedRef.current) {
                    chunksRef.current = [];
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
    }, [cancelCapture, clearTimers, phase, revokeClipUrl, stopTracks]);

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
        let frameId = 0;
        const syncPreviewOrientation = () => {
            window.cancelAnimationFrame(frameId);
            frameId = window.requestAnimationFrame(() => {
                const track = streamRef.current?.getVideoTracks()[0];
                if (!track || track.readyState !== "live") return;
                const portrait = window.matchMedia("(orientation: portrait)").matches;
                void track.applyConstraints({
                    width: { ideal: portrait ? 720 : 1280 },
                    height: { ideal: portrait ? 1280 : 720 },
                    aspectRatio: { ideal: portrait ? 3 / 4 : 16 / 9 },
                }).catch(() => {
                    // 일부 모바일 브라우저는 회전 메타데이터만 갱신합니다.
                });
            });
        };
        window.addEventListener("resize", syncPreviewOrientation);
        window.addEventListener("orientationchange", syncPreviewOrientation);
        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener("resize", syncPreviewOrientation);
            window.removeEventListener("orientationchange", syncPreviewOrientation);
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
        startCamera,
        switchCamera,
        startRecording,
        selectFile,
        reset,
        cancelCapture,
    };
}
