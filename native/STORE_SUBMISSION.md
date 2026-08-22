# 댕다방 Android · iOS 스토어 패키징 인계서

기준일: 2026-08-22

## 현재 패키지

| 항목 | Android | iOS |
|---|---|---|
| 프로젝트 | `android/` | `ios/App/` |
| 앱 식별자 | `com.daengdabang.app` | `com.daengdabang.app` |
| 표시 이름 | 댕다방 | 댕다방 |
| 버전 | 1.0 (`versionCode` 1) | 1.0 (`build` 1) |
| 최소 OS | Android 7.0 / API 24 | iOS 15.0 |
| 대상 SDK | Android 16 / API 36 | Xcode 26의 iOS 26 SDK로 최종 보관 필요 |
| 시작 경로 | `/app/` | `/app/` |
| 번들 웹 자산 | 약 34.3MB | 약 34.3MB |

전체 쇼핑몰 정적 산출물은 상품 이미지 때문에 약 1.5GB이므로 앱에 넣지 않는다. 앱에는 AI 돌봄 핵심 화면과 필수 자산만 번들하고, 쇼핑·대용량 콘텐츠는 댕다방 공식 웹으로 연결한다. 이 구조는 단순 웹 바로가기를 피하면서 카메라·마이크 분석, 오프라인 상태, 네이티브 뒤로가기, 딥링크, 햅틱을 앱 기능으로 제공한다.

## 재생성 명령

```powershell
npm ci
npm run native:sync
```

`native:sync`는 다음을 한 번에 수행한다.

1. 승인된 마스터 아이콘에서 Android/iOS 아이콘, 스플래시, 스토어 그래픽 생성
2. Next.js 프로덕션 정적 빌드
3. AI 핵심 경로와 필수 자산만 `native/www`에 복사하고 40MB 상한 검증
4. Android/iOS 네이티브 프로젝트에 Capacitor 플러그인과 웹 자산 동기화

## Android AAB 만들기

현재 Windows 장비에는 JDK와 Android SDK가 설치되어 있지 않아 이 작업에서 서명 AAB를 만들지 않았다. Android Studio 최신 안정판과 JDK 21을 설치한 뒤 다음 순서로 진행한다.

```powershell
npm run native:android
```

Android Studio에서 `Build > Generate Signed Bundle / APK > Android App Bundle`을 선택한다. 업로드 키와 비밀번호는 Android Studio/보안 저장소에서만 관리하고 저장소, 채팅, 문서에 기록하지 않는다. 생성물은 일반적으로 `android/app/release/app-release.aab`에 만들어진다.

Google Play의 현재 요구사항에 맞춰 `compileSdkVersion`과 `targetSdkVersion`은 36이다. 새 앱은 Play App Signing을 사용하고 먼저 내부 테스트 트랙에서 카메라, 마이크, 로그인, 분석, 외부 쇼핑 링크를 실기기 검증한다.

공식 참고:

- [Google Play 대상 API 요구사항](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Play Console 앱 생성 및 App Bundle 안내](https://support.google.com/googleplay/android-developer/answer/9859152)

## iOS Archive 만들기

iOS 최종 빌드·서명·업로드는 macOS와 Xcode 26, Apple Developer 계정이 필요하므로 Windows에서는 IPA를 만들지 않았다.

```bash
npm ci
npm run native:ios
```

Xcode에서 Team과 자동 서명을 선택하고 실제 기기에서 권한 문구와 분석 기능을 검증한 뒤 `Product > Archive`로 App Store Connect에 업로드한다. 번들 식별자 `com.daengdabang.app`을 Apple Developer 계정에 먼저 등록한다.

공식 참고:

- [Apple 제출용 빌드 요구사항](https://developer.apple.com/app-store/submitting/)
- [App Store Connect 빌드 업로드](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds)
- [App Review Guideline 4.2 최소 기능](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality)

## 운영 API 필수 반영

네이티브 번들 출처는 Android `https://localhost`, iOS `capacitor://localhost`다. 운영 API 소스 `C:\DaengDaBang\apps\api\app\main.py`에 두 정확한 출처만 CORS 허용하도록 추가했다. 운영 앱 테스트 전에 API 프로세스에 이 소스를 반영해 재시작하고 다음을 확인한다.

```text
OPTIONS https://api.daengdabang.com/api/v1/analyze-pet
Origin: https://localhost

OPTIONS https://api.daengdabang.com/api/v1/analyze-pet
Origin: capacitor://localhost
```

응답의 `Access-Control-Allow-Origin`은 요청한 정확한 출처여야 한다. 와일드카드 `*`는 사용하지 않는다.

## 제출 전 체크리스트

- [ ] 운영 API CORS 배포 후 Android/iOS 실기기 분석 요청 성공
- [ ] 앱 안에서 PWA ‘앱 설치’ 버튼·배너·안내가 전혀 보이지 않음
- [ ] 일반 모바일 웹 `https://www.daengdabang.com/app/`에서는 기존 설치 안내 유지
- [ ] 카메라 거부, 마이크 거부, 사진 접근 거부 후 복구 안내 확인
- [ ] 사진 분석, 행동·소리 분석, 주간 기록, CareTalk 성공·부분 장애 상태 확인
- [ ] 쇼핑·상품 링크가 공식 자사몰 브라우저 화면으로 열림
- [ ] 개인정보처리방침·약관·고객센터 링크 동작
- [ ] 화면 회전, 키보드, 안전 영역, Android 뒤로가기 확인
- [ ] 스토어 콘솔 데이터 보안/앱 개인정보 답변을 실제 운영과 최종 대조
- [ ] 심사용 계정은 콘솔 비공개 필드에만 입력
- [ ] Android 업로드 키와 Apple 서명 인증서는 저장소에 커밋하지 않음

## 스토어 자산

- `native/store-assets/google-play-icon-512.png`
- `native/store-assets/google-play-feature-1024x500.png`
- `native/store-assets/app-store-icon-1024.png`
- 한국어 등록 문안: `native/store-metadata/ko-KR.md`

