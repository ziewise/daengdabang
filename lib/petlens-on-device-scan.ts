export const PETLENS_ON_DEVICE_SCAN_VERSION = "ddb-live-preflight-v1";
export const PETLENS_ON_DEVICE_SCAN_MIN_FRAMES = 4;
export const PETLENS_ON_DEVICE_SCAN_MIN_ELAPSED_MS = 1_200;

export type PetLensOnDeviceScanStatus =
    | "idle"
    | "scanning"
    | "ready"
    | "attention"
    | "blocked"
    | "unavailable";

export type PetLensOnDeviceFrameSample = {
    luminance: number;
    contrast: number;
    motion: number | null;
    audioRms: number | null;
    audioPeak: number | null;
};

export type PetLensOnDeviceScanReport = {
    version: typeof PETLENS_ON_DEVICE_SCAN_VERSION;
    source: "live_camera";
    status: "scanning" | "ready" | "attention" | "blocked";
    sampledFrames: number;
    elapsedMs: number;
    meanLuminance: number;
    meanContrast: number;
    meanMotion: number;
    audioRms: number;
    audioPeak: number;
    warnings: string[];
    blockingReason: string;
};

function average(values: number[]) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function fixed(value: number, digits = 3) {
    return Number(value.toFixed(digits));
}

export function buildPetLensOnDeviceScanReport(
    samples: PetLensOnDeviceFrameSample[],
    elapsedMs: number,
): PetLensOnDeviceScanReport {
    const meanLuminance = average(samples.map((sample) => sample.luminance));
    const meanContrast = average(samples.map((sample) => sample.contrast));
    const motionSamples = samples.flatMap((sample) => sample.motion === null ? [] : [sample.motion]);
    const audioRmsSamples = samples.flatMap((sample) => sample.audioRms === null ? [] : [sample.audioRms]);
    const audioPeakSamples = samples.flatMap((sample) => sample.audioPeak === null ? [] : [sample.audioPeak]);
    const meanMotion = average(motionSamples);
    const audioRms = average(audioRmsSamples);
    const audioPeak = audioPeakSamples.length ? Math.max(...audioPeakSamples) : 0;
    const hasEnoughSamples = samples.length >= PETLENS_ON_DEVICE_SCAN_MIN_FRAMES
        && elapsedMs >= PETLENS_ON_DEVICE_SCAN_MIN_ELAPSED_MS;
    let blockingReason = "";

    if (hasEnoughSamples && meanLuminance < 8) {
        blockingReason = "화면이 거의 보이지 않습니다. 조명을 켜고 카메라 가림을 확인해 주세요.";
    } else if (hasEnoughSamples && meanLuminance > 248 && meanContrast < 4) {
        blockingReason = "화면이 하얗게 날아갔습니다. 강한 빛을 피하고 다시 맞춰 주세요.";
    } else if (hasEnoughSamples && meanContrast < 1.5) {
        blockingReason = "영상 윤곽을 확인할 수 없습니다. 렌즈 가림이나 초점을 확인해 주세요.";
    }

    const warnings: string[] = [];
    if (hasEnoughSamples && !blockingReason) {
        if (meanLuminance < 42) warnings.push("화면이 어두워요. 강아지 얼굴과 몸통에 빛이 닿게 해주세요.");
        if (meanLuminance > 224) warnings.push("화면이 너무 밝아요. 역광이나 강한 조명을 피해주세요.");
        if (meanContrast < 10) warnings.push("윤곽이 흐려요. 렌즈를 닦고 강아지에게 초점을 맞춰주세요.");
        if (motionSamples.length >= 3 && meanMotion < 0.75) {
            warnings.push("움직임 신호가 작아요. 전신과 가슴 움직임이 보이도록 잡아주세요.");
        }
        if (audioPeakSamples.length && audioPeak < 0.003) {
            warnings.push("마이크 신호가 매우 작아요. 마이크 가림과 입력 장치를 확인해 주세요.");
        }
    }

    return {
        version: PETLENS_ON_DEVICE_SCAN_VERSION,
        source: "live_camera",
        status: !hasEnoughSamples
            ? "scanning"
            : blockingReason ? "blocked" : warnings.length ? "attention" : "ready",
        sampledFrames: samples.length,
        elapsedMs: Math.max(0, Math.round(elapsedMs)),
        meanLuminance: fixed(meanLuminance, 1),
        meanContrast: fixed(meanContrast, 1),
        meanMotion: fixed(meanMotion, 2),
        audioRms: fixed(audioRms),
        audioPeak: fixed(audioPeak),
        warnings,
        blockingReason,
    };
}

export function petLensOnDeviceScanCanRecord(status: PetLensOnDeviceScanStatus) {
    return status === "ready" || status === "attention" || status === "unavailable";
}
