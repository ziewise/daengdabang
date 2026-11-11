# Android APK 배포

PWA는 웹 배포를 받아오지만 설치된 APK의 `assets/public`은 APK를 다시 설치하기 전까지 바뀌지 않는다. GitHub Actions의 debug APK 생성만으로 공개 Releases의 다운로드 파일이 갱신되지는 않는다.

## 새 버전 배포

1. `android/app/build.gradle`의 `versionCode`를 이전 배포보다 높이고 `versionName`을 정한다.
2. 최신 main을 포함한 커밋에서 **Native package validation**을 수동 실행하고 `release`를 켠다.
3. Android 서명·정렬·에뮬레이터 홈 실행·동일 서명 재설치 검사가 성공했는지 확인한다. 수동 Android 배포에서는 iOS 빌드를 생략하며, main push 검사는 두 플랫폼을 계속 확인한다.
4. `daengdabang-android-signed-release` 결과의 `app-release.apk`를 사용한다. `app-debug.apk`는 배포하지 않는다.
5. APK 안 `assets/public/native-build.json`의 소스 커밋과 버전, 서명 SHA-256을 확인한다.
6. `android-v{versionName}-build{versionCode}` GitHub Release에 버전이 포함된 APK와 SHA-256 체크섬을 올린다. 공개 다운로드를 다시 받아 해시를 대조한다.

## 서명 보관

배포 키는 소스 저장소에 넣지 않는다. GitHub Actions의 `DDB_ANDROID_KEYSTORE_BASE64`, `DDB_ANDROID_KEYSTORE_PASSWORD`, `DDB_ANDROID_KEY_ALIAS`, `DDB_ANDROID_CERT_SHA256` 비밀값을 사용한다. CI는 임시 파일로 복원하고 빌드 직후 삭제한다. 키 원본의 별도 비공개 백업도 유지해야 한다.

2026-11-11부터 고정 배포 서명을 사용한다. 예전 공개 1.0.1(build 2)은 임시 debug 서명으로 배포됐으며 해당 개인 키가 보관되지 않았다. 따라서 고정 서명의 새 APK로 덮어쓸 수 없다. 기존 사용자에게 재설치와 기기 내 임시 데이터 보존 문제를 안내한다. 로그인 계정의 서버 저장 데이터와 기기에만 있는 미전송 자료를 혼동하지 않는다.

`native-build.json`은 APK에 실제로 포함된 버전·소스 커밋을 확인하기 위한 기록이다. 웹이나 서버 배포를 APK 업데이트로 취급하지 않는다.
