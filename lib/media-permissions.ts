import { Capacitor, registerPlugin, type PermissionState } from "@capacitor/core";
import { NativeSettings as AppSettings } from "@/lib/native-settings";

export type MediaPermission = "camera" | "microphone";
export type MediaAccessFailure = { message: string; permission: boolean };
type MediaPermissionStatus = Record<MediaPermission, PermissionState>;

const MediaPermissions = registerPlugin<{
    checkPermissions(): Promise<MediaPermissionStatus>;
    requestPermissions(options: { permissions: MediaPermission[] }): Promise<MediaPermissionStatus>;
}>("MediaPermissions");

function hasNativePermissions() {
    return Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("MediaPermissions");
}

export class MediaPermissionError extends Error {
    constructor(readonly blocked: boolean) {
        super("Media permission is required");
        this.name = "NotAllowedError";
    }
}

// Called only by a customer's capture/preview action, never at startup.
export async function requestMediaStream(
    constraints: MediaStreamConstraints,
    isCurrent: () => boolean = () => true,
): Promise<MediaStream> {
    const assertCurrent = () => {
        if (!isCurrent()) throw new DOMException("Capture was closed", "AbortError");
    };
    assertCurrent();
    if (hasNativePermissions()) {
        const required: MediaPermission[] = [];
        if (constraints.video) required.push("camera");
        if (constraints.audio) required.push("microphone");
        let status = await MediaPermissions.checkPermissions();
        assertCurrent();
        const missing = required.filter(permission => status[permission] !== "granted");
        if (missing.some(permission => status[permission] === "denied")) throw new MediaPermissionError(true);
        if (missing.length) {
            status = await MediaPermissions.requestPermissions({ permissions: missing });
            assertCurrent();
            if (!required.every(permission => status[permission] === "granted")) {
                throw new MediaPermissionError(required.some(permission => status[permission] === "denied"));
            }
        }
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("Media capture is unavailable", "NotSupportedError");
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (!isCurrent()) {
        stream.getTracks().forEach(track => track.stop());
        assertCurrent();
    }
    return stream;
}

export function mediaAccessFailure(error: unknown, permissions: readonly MediaPermission[]): MediaAccessFailure {
    const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
    const label = permissions.includes("camera") && permissions.includes("microphone")
        ? "카메라와 마이크" : permissions.includes("camera") ? "카메라" : "마이크";
    if (name === "NotAllowedError" || name === "SecurityError") {
        const setting = Capacitor.isNativePlatform() ? "휴대폰 설정의 댕다방 앱 권한" : "브라우저의 사이트 권한";
        return {
            permission: true,
            message: `${label} 권한을 허용해 주세요. 허용창이 다시 뜨지 않으면 ${setting}에서 허용한 뒤 다시 시도해 주세요.`,
        };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        return { permission: false, message: `사용할 수 있는 ${label}를 찾지 못했습니다. 기기 연결을 확인해 주세요.` };
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
        return { permission: false, message: `${label}를 켤 수 없습니다. 다른 촬영 앱을 닫고 휴대폰의 카메라·마이크 접근 설정을 확인한 뒤 다시 시도해 주세요.` };
    }
    return { permission: false, message: `${label}를 연결하지 못했습니다. 다시 시도하거나 촬영한 파일을 선택해 주세요.` };
}

export function canOpenMediaSettings() {
    return hasNativePermissions() && Capacitor.isPluginAvailable("LocationSettings");
}

export async function openMediaSettings(permissions: readonly MediaPermission[]): Promise<boolean> {
    if (!canOpenMediaSettings()) return false;
    await AppSettings.open({ target: "app" });
    const status = await MediaPermissions.checkPermissions();
    return permissions.every(permission => status[permission] === "granted");
}
