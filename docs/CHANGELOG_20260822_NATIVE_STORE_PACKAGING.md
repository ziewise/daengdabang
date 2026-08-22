# 2026-08-22 댕다방 네이티브 스토어 패키징

## 요청

- 현재 웹앱은 PWA 설치 기능을 유지한다.
- Google Play와 Apple App Store용 네이티브 앱에서는 설치 버튼·배너·안내를 제거한다.
- AI 분석 중심 앱으로 패키징하고 쇼핑은 공식 자사몰로 자연스럽게 연결한다.

## 반영

- Capacitor 8 Android/iOS 프로젝트와 `com.daengdabang.app` 식별자를 생성했다.
- 네이티브 시작 경로를 `/app/`으로 고정했다.
- 플랫폼 판별을 PWA Provider에 통합해 네이티브에서 설치 UI와 서비스워커 등록을 비활성화했다.
- 웹/PWA에서는 기존 설치 프롬프트와 iOS 설치 안내를 유지했다.
- AI 핵심 경로만 포함하는 40MB 상한의 네이티브 웹 번들 생성기를 추가했다.
- 쇼핑 및 번들 밖 경로는 `https://www.daengdabang.com`으로 연결한다.
- 네이티브 네트워크 상태, Android 뒤로가기, 커스텀 딥링크, 상태바, 햅틱을 추가했다.
- Android API 36, 카메라·마이크 권한과 선택 하드웨어 선언을 반영했다.
- iOS 카메라·마이크·사진 권한 설명과 `daengdabang://` URL scheme을 반영했다.
- 승인된 검은 푸들 마스터 아이콘으로 앱 아이콘, 스플래시, 스토어 그래픽을 생성했다.
- 운영 API 소스에 `https://localhost`, `capacitor://localhost` 정확한 CORS 출처를 추가했다.
- Next.js를 16.3.2, Sharp를 0.35.3으로 올리고 런타임 의존성 감사 결과를 0건으로 정리했다.

## 검증

- 웹 회귀 테스트: 457/457 통과
- 네이티브 CORS 단위 테스트: 1/1 통과
- 변경 파일 대상 ESLint: 통과
- Next.js 16.3.2 프로덕션 정적 빌드: 통과, 450페이지
- Capacitor Android/iOS sync: 통과, 플러그인 6개씩 확인
- 네이티브 번들: 34.26MB, 40MB 상한 통과
- `npm audit --omit=dev`: 알려진 취약점 0건
- 스토어 이미지 크기·브랜드 외관: 육안 확인

## 남은 외부 단계

- 현재 Windows 장비에는 JDK/Android SDK가 없어 서명 AAB를 생성하지 않았다.
- iOS Archive/IPA는 macOS, Xcode 26, Apple Developer 서명이 필요하다.
- 키·인증서·비밀번호 없이 생성한 네이티브 프로젝트까지 완료했으며, 최종 서명 절차는 `native/STORE_SUBMISSION.md`에 정리했다.
- API CORS 소스는 수정했지만 운영 프로세스 재시작은 이 패키징 작업에서 수행하지 않았다.

