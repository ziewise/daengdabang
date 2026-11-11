import { ANDROID_APK_URL, ANDROID_RELEASE_URL } from "@/lib/android-release";

export default function AndroidApkInstall() {
    return (
        <div className="grid gap-3" data-android-install>
            <a className="aiw-install" href={ANDROID_APK_URL} data-android-apk-download>
                <i className="fa-brands fa-android" aria-hidden="true" />
                앱 설치·업데이트
            </a>
            <p className="text-sm leading-6 text-slate-600">
                최신 안드로이드 앱을 받아 파일을 열어 주세요. 이미 설치했다면 <b>업데이트</b>를 선택하세요.
            </p>
            <p className="text-xs leading-5 text-slate-500">
                1.0.2 이상은 앱을 삭제하지 않고 업데이트할 수 있어요.
                예전 1.0.1은 바로 업데이트할 수 없으니 기존 앱을 삭제하기 전에 <a className="font-bold underline" href={ANDROID_RELEASE_URL}>이전 버전 안내</a>를 확인해 주세요.
            </p>
        </div>
    );
}
