# Android APK 배포

PWA는 웹 배포를 받아오지만 설치된 APK의 `assets/public`은 APK를 다시 설치하기 전까지 바뀌지 않는다. GitHub Actions의 debug APK 생성만으로 공개 Releases의 다운로드 파일이 갱신되지는 않는다.

## 자동 배포

main에 코드를 반영하면 웹 배포와 함께 **Native package validation**이 APK를 빌드하고 검증한 뒤 자동 공개한다. 별도 수동 업로드는 필요 없다. 빌드 중에는 마지막 검증 완료 버전을 제공한다. 실패한 빌드는 공개하지 않으며 Actions에서 실패를 확인할 수 있다.

1. 이전 Android Release와 예약된 draft 버전보다 높은 versionCode를 자동 할당한다. 기본 버전은 `android/version.json`, CI 버전은 환경 변수로 Gradle과 `native-build.json`에 동일하게 전달한다.
2. 회귀 검사와 native sync 후 고정 키로 release APK를 서명한다. 이전 공개 APK도 내려받아 체크섬과 서명이 같은지 확인한다.
3. 폐기 가능한 Android 에뮬레이터에 이전 공개 버전을 설치한다. 앱 전용 파일을 만든 뒤 **삭제 없이 `adb install -r`**로 새 APK를 설치하고 버전 증가·데이터 보존·홈 실행을 검증한다.
4. 검증이 성공한 main 빌드만 공개한다. 업로드 전후 main이 변경됐으면 구 커밋을 최신 릴리스로 승격하지 않는다. 직렬 실행되는 다음 main 빌드가 최신 코드를 배포한다.
5. APK·체크섬·build-info를 draft에 모두 업로드한 후 공개한다. 공개 파일을 다시 받아 해시와 latest 태그를 확인한다.

홈페이지 `/app/`의 Android 버튼은 항상 `https://github.com/ziewise/daengdabang/releases/latest/download/DaengDaBang-Android.apk`를 가리킨다. 버전별 URL을 화면에 하드코딩하지 않는다. iPhone의 홈 화면 추가(PWA)는 기존대로 웹 변경을 받는다.

필요하면 main에서 수동 실행하며 `release`를 켜서 재검증·배포할 수 있다. 다른 브랜치의 수동 release 빌드는 검증용 artifact만 만들고 운영 릴리스를 바꾸지 않는다. 운영에는 debug APK를 배포하지 않는다.

## 서명 보관

배포 키는 소스 저장소에 넣지 않는다. GitHub Actions의 `DDB_ANDROID_KEYSTORE_BASE64`, `DDB_ANDROID_KEYSTORE_PASSWORD`, `DDB_ANDROID_KEY_ALIAS`, `DDB_ANDROID_CERT_SHA256` 비밀값을 사용한다. CI는 임시 파일로 복원하고 빌드 직후 삭제한다. 키 원본의 별도 비공개 백업도 유지해야 한다.

2026-11-11부터 고정 배포 서명을 사용한다. 예전 공개 1.0.1(build 2)은 임시 debug 서명으로 배포됐으며 해당 개인 키가 보관되지 않았다. 따라서 고정 서명의 새 APK로 덮어쓸 수 없다. 기존 사용자에게 재설치와 기기 내 임시 데이터 보존 문제를 안내한다. 로그인 계정의 서버 저장 데이터와 기기에만 있는 미전송 자료를 혼동하지 않는다.

**1.0.2(build 3)부터는 같은 applicationId와 서명으로 업데이트 설치한다.** 사용자는 홈페이지 앱 설치·업데이트에서 받은 파일을 열고 Android의 업데이트 확인을 누른다. APK 공개가 휴대폰에 이미 설치된 파일을 자동 교체하는 것은 아니다.

`native-build.json`은 APK에 실제로 포함된 버전·소스 커밋을 확인하기 위한 기록이다. 웹이나 서버 배포를 APK 업데이트로 취급하지 않는다.
