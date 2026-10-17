# 앱 화면(스티커북) 운영 반영 안내 — 협업자용 (2026-10-18)

> 10-17 첫 반영(1~7장) + 10-18 추가 변경(8장)을 함께 정리. 운영 main 기준 `818f8752`.

설치한 앱(네이티브 APK · 홈 화면에 추가한 PWA)에서만 보이는 **앱 전용 화면(스티커북 디자인)**을 운영 main 에 올렸습니다.
**UI(화면 보여 주기)만 바꿨고, 기능 · API · DB · 결제 · 배포 설정은 바꾸지 않았습니다.** 일반 브라우저(PC · 모바일)로 보는 웹은 전과 같습니다.

- 기준: GitHub main `a19a732f`(10-15, 마지막 협업자 커밋) 위에 덧붙이기(fast-forward)로 반영. 강제 푸시 없음.
- 버튼은 웹과 같은 협업자 함수를 그대로 부릅니다(버튼별 대조: `버튼대조표_20261017.md`, 웹과 다름 0).

---

## 1. 앱 모양이 켜지는 조건

| 보는 곳 | 화면 |
|---|---|
| 네이티브 앱(Capacitor) · 홈 화면에 추가한 PWA(standalone) | 앱 상단바 · 탭바 5칸 · 스티커북 화면 |
| 일반 브라우저(PC · 모바일) — 어느 주소든 | **웹 그대로** |

- 개발 서버에서만 쓰는 시안 확인 장치(`?app=1`, `/app/` 주소로 앱 모양 켜기)는 `process.env.NODE_ENV` 로 **운영 빌드에서 꺼집니다**(운영 빌드 결과물로 확인).
- 앱 전용 CSS 는 전부 `html.ddb-app-mode` 아래에서만 적용됩니다(`components/app-shell/appShopSkin.ts`).

## 2. 새로 추가된 것(협업자 파일 아님)

- 앱 화면: `app/app/home-1`, `app/app/sticker/{shop, lab, report, daily, care, show, my, login, signup}`
- 화면 본체: `components/pwa/home-concepts/*`, `components/daily-life/*`
- 앱 틀: `components/app-shell/*` (`AppShell` · 탭 · 앱 전용 CSS)
- 그림 · 글꼴: `public/images/ui/stickers/*.webp`, `public/images/*.png`(원본), `public/fonts/`(카페24 써라운드 · 나눔스퀘어라운드)
- 도구 · 문서: `tools/sticker-assets/*`(그림 변환 스크립트), `docs/06~09`

**바꾸지 않은 것**: `lib` · `hooks` · API 경로 · `scripts` · `next.config.*` · `package.json` · `.github` · `capacitor.config` · `android` · `ios` · Cloudflare 설정.

## 3. 협업자 파일 16개 (UI 연결용 최소 수정)

네 가지 성격뿐입니다.

**① 앱에서만 보이는 틀 추가(7개)** — 앱 전용 버튼은 `hidden`, 감싸는 틀은 `display:contents` 라 웹 화면 · 순서 그대로. 앱 CSS 에서만 보이고 접힙니다. JSX 순서는 그대로라 순서 테스트 통과.

| 파일 | 추가한 것 |
|---|---|
| `components/petlens/PetLensObservationExperience.tsx` | `AppFold`(파일 맨 아래): 소개 안내 · 최근 분석 기록 · 보호자 답변 메모를 앱에서 접기 |
| `components/petlens/PetLensObservationResult.tsx` | `AppResultFold`(파일 맨 아래): "시간별 그래프 보기" · "관찰 근거 자세히 보기" 접기, 카드에 `data-petlens-observation-*` 표시 |
| `components/petlens/PetLensAnalysisSummary.tsx` | 카드에 `data-petlens-result-*` · `data-status` 표시, 견종 후보 · 확인할 점 카드를 앱에서 "자세히 보기"로 접기(`data-app-more`) |
| `app/pet-lens/PetLensClient.tsx` | `AppPetInfoFold`(파일 맨 아래): 반려견 정보 입력칸을 앱에서 한 줄 요약으로 접기 |
| `components/products/detail/ProductTabs.tsx` | `AppDetailFold`: 상세 내용 **바깥**을 감싸 앱에서 "상세정보 더보기" 접기(상세 내용 구조는 그대로) |
| `app/products/ProductsClient.tsx` | 검색 묶음에 `data-products-filter` + 앱 전용 `AppProductFilter`(필터 버튼 · 속지 → 같은 `setSort` · `setCategory` 호출) |
| `app/mypage/profile/page.tsx` | 맨 아래 "회원 탈퇴" 작은 링크(기존 `/mypage/withdrawal`, 앱에서만 보임) |

**② 목록 · 함수 내보내기(5개)** — 앱 화면에서 같이 쓰려고 `export` 만 붙임, 내용 그대로.

| 파일 | 내보낸 것 |
|---|---|
| `components/growth/LocalCareFinder.tsx` | 종류 · 장소 타입, 목록 · 지도 링크 함수 |
| `components/growth/GrowthHub.tsx` | `GUEST_STEPS` · `hasShareableAiRecord` |
| `components/growth/GrowthPolicySummary.tsx` | `POLICIES` |
| `components/growth/GrowthShareCard.tsx` | `copyText` |
| `components/growth/CommerceCommunityExpansion.tsx` | `EXPANSION_CARDS` |

**③ 앱일 때만 다른 화면(3개)** — 웹에서는 전과 같음.

| 파일 | 앱일 때 |
|---|---|
| `components/site/ConditionalChrome.tsx` | 웹 상단바 · 푸터 대신 `AppShell` |
| `app/treasure-mine/page.tsx` | 앱 화면(`components/daily-life/DailyLifeSwitch`), 웹은 기존 `GrowthHub` |
| `components/home/IntroSplash.tsx` | 인트로 영상 없이 바로 시작 |

**④ 선택 prop 추가(1개)**

| 파일 | 추가한 것 |
|---|---|
| `components/site/ChatWidget.tsx` | 선택 prop `empty`(대화가 비었을 때 첫 화면). 넘기지 않으면(웹) 전과 같음. 예시 질문은 기존 `ask` 를 그대로 호출 |

참고: 앱 안에서의 화면 이동(웹 로그인 주소 → 앱 로그인, 결과가 나오면 결과로 스크롤 등)은 협업자 파일이 아니라 `components/app-shell/AppShell.tsx` 에 있고, 앱 모드에서만 동작합니다.

## 4. 검증 (2026-10-17)

- 협업자 테스트 **902/902 통과**, TypeScript · ESLint 통과.
- 운영 빌드 통과(정적 페이지 592개, 빌드 전 확인 스크립트 통과, 경고 없음).
- 운영 빌드 결과물을 일반 브라우저로 열어 확인: 앱 모드 꺼짐(앱 상단바 · 탭바 없음), 앱 전용 버튼 · 틀 숨김.
- 웹 화면(`?app=0`)에서 펫렌즈 · 상품 목록 · 상세 · 마이페이지의 앱 전용 버튼이 숨겨지고 원래 순서 · 내용 그대로인지 화면마다 확인.
- 확인할 때 서버에 쓰는 요청(분석 · 결제 · 올리기 등)은 보내지 않았습니다(결과 화면은 로컬 가짜 응답으로 확인).

## 5. 함께 정할 것

1. **코인 테스트 지급** — 시험 계정에 행동·소리 분석용 코인을 넣어 줄지, 얼마나 넣을지.
2. **회원 등급** — 앱 마이 화면에 "댕린이" 같은 등급 이름이 보입니다(지금은 표시만). 실제 등급 기준 · 이름을 정할지.

## 6. 참고 — 웹 쪽에서 본 것(앱 작업 중 발견, 웹 코드는 손대지 않음)

- 댕자랑 "자유 주제로 올리기" 버튼이 웹에서 동작하지 않는 것으로 보입니다.
- 행동·소리 녹화가 끝나면 웹에서는 화면이 "분석하기" 버튼 쪽으로 내려가 녹화 영상이 가려집니다(앱은 앱 틀에서 영상 칸으로 스크롤해 해결).
- 행동·소리 지난 기록을 `/pet-lens/?observation=…` 주소로 열 때 실제 서버 응답은 아직 확인 못 했습니다(화면 쪽은 확인).
- 앱 화면 주소(`/app/home-1`, `/app/sticker/…`)를 브라우저에 직접 입력하면 웹 상단바 아래에 앱 화면 본문이 보입니다. 웹 어디에도 이 주소로 가는 링크가 없고 사이트맵에도 없습니다.

## 7. 부탁

- 작업 전에 `git fetch` 로 main 최신을 받아 주세요(이번 반영으로 main 이 앞으로 나갔습니다).
- 다음에 GitHub 코드로 APK 를 만들면 앱 화면(스티커북)이 들어갑니다(`npm run native:sync`).
- 문제가 있으면: Cloudflare 대시보드에서 이전 배포로 되돌리기가 가장 빠릅니다. GitHub main 을 강제로 되돌리는 건 서로 상의 후에 해 주세요.

## 8. 추가 변경 (2026-10-18)

운영 반영: ①의 사진 수정 · ② · ③ · ⑤ 는 10-18 `1951212e`, ①의 크기 · ④ · ⑥ 은 `818f8752`, ⑦ 은 그다음 반영분.

**① APK 묶음 검사(Native package validation) 실패 — 두 원인 모두 수정**
- 10-17 반영 뒤 Android · iOS 패키지 검사가 `npm run native:sync`(`scripts/prepare-native-web.mjs`)에서 실패했습니다. 웹 배포(Cloudflare)는 정상입니다.
- 수정한 것: 앱 쇼핑 화면 HTML 에 앱 묶음 밖 사진 주소(브랜드 · 기획전 · 상품 · 히어로 영상)가 들어가 "없는 파일" 오류. → 우리 파일만 고침(`components/pwa/home-concepts/shop/useShopMedia.ts`): 화면이 시작된 뒤에만 사진 주소를 넣고, 네이티브 앱에서는 `https://www.daengdabang.com` 의 같은 파일을 씁니다. 웹 · PWA 는 그대로.
- 묶음 크기 43.3MB(한도 40MB 초과) → **35.7MB** 로 해결(사용자 결정, 한도 숫자 · `prepare-native-web.mjs` 는 그대로):
  - `public/images/ui` 의 1.4~1.8MB PNG 원본 5개를 묶음 밖 `tools/sticker-assets/originals/` 로 옮김(지우지 않고 보관). 3개(`pet-video.png` · `pet-lens.png` · `lang-globe.png`)는 코드에서 쓰는 곳이 없었습니다.
  - 나머지 2개는 코드가 큰 PNG 를 작은 아이콘에 그대로 쓰고 있어 128px webp 로 바꿈(웹에서도 가벼워짐): `components/petlens/PetLensModalLauncher.tsx`(펫렌즈 창 사진 분석 아이콘) `pet-photo.png` → `pet-photo-128.webp`, `components/products/detail/ProductInfo.tsx`(상품 상세 입혀보기 아이콘) `pet-clothes.png` → `pet-clothes-128.webp`. 각각 그림 주소 한 줄만(ProductInfo 는 원래 줄바꿈 CRLF 그대로 저장).
  - 로컬에서 같은 묶음 검사(없는 파일 · 크기) 통과.
- 참고: 10-18 반영 때 새 펫렌즈 · 지구본 그림을 192px 로 넣어 `tools/verify_goods_image_budget.py`(헤더 아이콘 128px 이하)가 실패 → GitHub `build` 실패 · `deploy` 건너뜀(Cloudflare 운영 반영은 정상). 128px 로 다시 만들어 통과 확인.

**② `/app/` 을 "앱 설치 안내" 페이지로 바꿈 (협업자 파일 `components/pwa/MobileAppHome.tsx`, 17번째)**
- 이유: `/app/` 은 원래 설치한 앱의 첫 화면(PWA start_url · APK 시작 경로)이라 모든 서비스 · 로그인 · AI 케어 요약을 모아 두었는데, 지금은 설치한 앱이 `/app/` 을 열면 앱 틀(`AppShell`)이 새 앱 홈(`/app/home-1`)으로 보냅니다. 그래서 이 페이지는 **설치 안 한 모바일 브라우저 방문자만** 봅니다(스토어 제출 문서의 "일반 모바일 웹 `/app/` 에서는 설치 안내 유지"와 같은 방향).
- 화면: 앱 소개 · 실제 앱 화면 미리보기 · 설치 버튼(기존 `requestInstall()` 그대로) → 기기별 설치 순서(기존 `PwaInstallProvider` 의 platform · 인앱 브라우저 판별 그대로) → 앱에서 좋은 점. 부품은 새 파일 `components/pwa/install-guide/AppInstallGuide.tsx`.
- **뺀 것**: 로그인 안내 · AI 케어 요약(`<AppAiCareOverview />`) · 서비스 링크(매일 댕생활 · 댕자랑 · 연구소) · 내 메뉴(우리 아이 · AI 상담 · 마이페이지 · 쇼핑). 비회원도 설치할 수 있고, 웹 방문자는 메뉴 · 헤더 · 첫 화면 · 푸터에서 같은 기능으로 갑니다. `AppAiCareOverview.tsx` 파일은 그대로 남겨 두었습니다(지금은 쓰는 곳 없음).
- **점검표 수정**: `tests/pwa-installation.test.mjs` 의 "mobile app home links members to all requested services and preserves login return" → "mobile app route keeps the install guide while the AI care overview keeps its safety checks". `/app/` 페이지에 링크 · 로그인 · AI 요약이 있어야 한다는 줄만 빼고 설치 기능(`usePwaInstall()` · `requestInstall()`) 확인으로 바꿨습니다. 나머지(주소 · 사이트맵 · 앱 틀 · AI 케어 요약 부품의 안전 검사)는 그대로입니다. 테스트 902/902 통과.
- 함께 정할 것: 우리 앱에 "AI 케어 한눈에(사진 · 주간 비교 · 행동·소리 기록)" 화면을 어디에 둘지 — `AppAiCareOverview` 를 다시 쓸지, 지울지.

**③ 헤더 아이콘 (모바일 웹)**
- 로고 옆 검은 "앱 홈" 알약 → 펫렌즈 버튼 **왼쪽** 동그라미 "앱 설치" 그림 아이콘(`components/pwa/InstalledAppHomeButton.tsx`, `components/header/Header.tsx` 는 자리만 옮김). 가는 곳은 전과 같은 `/app/`. 아이콘 아래로 말풍선 "댕다방, 앱에서 더 편하게 즐겨보세요 🐾"(3초 뒤 처음 · 20초마다, "오늘 안 보기" 버튼, 장바구니 · 결제 · 로그인 화면과 다른 창 — "정식 오픈 준비 중" 안내 · 메뉴 — 이 열려 있을 때는 건너뜀).
- `/app/` 탭 제목 "모바일 앱 홈" → "댕다방 앱 설치 안내"(`app/app/page.tsx`, 주소 그대로).
- 휴대폰 폭(md 미만)에서는 헤더의 지구본(언어)을 숨겼습니다(`Header.tsx` `max-md:hidden`) — 메뉴(☰) 맨 위에 같은 언어 버튼이 있습니다. 태블릿 · PC 는 그대로.
- 펫렌즈 · 지구본 아이콘은 그림 파일만 새 그림으로 교체(`public/images/ui/pet-lens-128.webp` · `lang-globe-128.webp`, 파일 이름 그대로) — 펫렌즈 창 · 홈 워터마크 배지 · 국가/언어 창도 같은 새 그림.
- 점검표: `tests/pwa-installation.test.mjs` 의 `<span>앱 홈</span>` 확인 한 줄을 `<span className="sr-only">앱 설치 안내</span>` 로.

**⑤ 설치 안내 창 스티커북 모양 (`components/pwa/PwaInstallProvider.tsx`)**
- 창 그리는 부분만 `components/pwa/install-guide/InstallHelpSheet.tsx` 로(창이 열릴 때만 `next/dynamic` 으로 불러옴). 여는 법 · 닫는 법(배경 · × · Esc) · 스크롤 잠금 · 인앱 브라우저 판별 · 앱 주소 복사 함수는 그대로입니다. 쓰지 않게 된 `InstallStep` 함수만 지웠습니다.

**④ APK 실행 확인 스크립트 · 앱 시작 화면 (수정함, 사용자 결정 2026-10-18)**
- 앱 쪽 문제: 네이티브 앱은 `/app/index.html` 로 시작하고 주소가 그대로 남는데(capacitor `appStartPath`), 앱 틀의 "시작 주소 → 새 앱 홈" 규칙이 `/app/` 만 알아봐서 **APK 가 새 앱 홈 대신 `/app/` 페이지(지금은 설치 안내)를 보여 줄 수 있었습니다.** → `components/app-shell/AppShell.tsx` 규칙이 `/app/index.html` · `/app/index` 도 시작 주소로 보게 고침.
- 검사 쪽: `scripts/verify-android-webview.mjs` 가 예전 앱 홈(주소 `/app/index.html` · 글자 "댕다방 앱 홈")을 기다림 → 기대값을 새 앱 홈으로: `expectedPath = "/app/home-1/"`, `expectedText = "댕다방에 오신 걸 환영해요"`(새 앱 홈의 비회원 인사 — 에뮬레이터는 로그인 전). 나머지(제목에 "댕다방" · 문서 로드 완료 · 20번 재시도)는 그대로. `tests/smart-fit-on-device-hybrid.test.mjs` 의 같은 두 줄도 맞춤.
- 확인 범위: 로컬에 안드로이드 에뮬레이터가 없어 **이 실행 확인 단계는 돌려 보지 못했습니다.** 운영 빌드 결과물의 `/app/home-1/index.html` 에 그 문구가 들어 있는 것만 확인. GitHub Native package validation 결과로 최종 확인 — 실패하면 알려 주세요.

**⑥ 설치한 앱(PWA)을 열 때 설치 안내 · 웹 배경이 잠깐 보이던 것 → ⑦ 로 근본 수정**
- `818f8752` 에서는 설치 안내 페이지를 CSS 로 가리는 방식이었으나(그 뒤에도 웹 배경이 잠깐 보임), 가리는 방식은 ⑦ 에서 지웠습니다.

**⑦ 홈 화면 앱 시작을 앱 홈에서 바로 · 앱 화면은 처음부터 앱 틀 (사용자 결정 2026-10-18)**
- 원인 1: PWA 시작 주소(`start_url`)가 `/app/`(브라우저 설치 안내)라 켤 때마다 설치 안내 → 앱 틀 → 앱 홈으로 돌아 감. → `app/manifest.ts` `start_url` 을 `/app/home-1/?source=pwa&shell=4` 로. **앱 구분 `id: "/app/"` 는 그대로**(다른 앱으로 인식되지 않음). `?source=pwa&shell=4` 는 코드에서 읽는 곳 없음. `tests/pwa-installation.test.mjs` 의 start_url 확인 한 줄 맞춤.
  - 아이폰은 홈 화면에 추가하는 순간의 시작 주소를 저장하므로 **이미 설치한 앱은 한 번 지우고 다시 추가**해야 새 주소로 시작. 지우지 않아도 `/app/` → 앱 홈 이동 규칙이 남아 있어 계속 열림. 안드로이드 크롬은 자동 갱신.
  - 네이티브 APK 는 이 설정을 쓰지 않음(capacitor `appStartPath` 그대로) — 변경 없음.
- 원인 2: 미리 만든 HTML 은 앱인지 모르니 앱 전용 화면도 웹 헤더 · 웹 배경으로 그려졌다가 자바스크립트 뒤 앱 틀로 바뀜. → `components/site/ConditionalChrome.tsx` 에서 앱 전용 화면(`/app/home-1` · `/app/sticker/…`)은 앱 모드 판별 전부터 `AppShell`. 브라우저에서 이 주소를 직접 열어도 앱 틀(사용자 결정). `APP_SHELL_PATHS` · `/app/`(설치 안내)는 그대로.
  - 그 결과 앱 틀 안의 큰 스티커북 CSS(`appShopSkin.ts`, 약 36만 자)가 화면 HTML 마다 복사돼 APK 묶음이 39.6MB 가 되어 → 정적 파일 하나로: 새 파일 `app/app/skin.css/route.ts`(force-static 라우트, 내용은 `APP_SHOP_SKIN_CSS` 그대로) → `out/app/skin.css`(`/app` 폴더라 네이티브 묶음 포함), `AppShell.tsx` 는 `<link rel="stylesheet" href="/app/skin.css?v=…" precedence="default">`(React 19 가 `<head>` 로 올림, `?v=` 는 내용 해시). 앱 화면 HTML 478KB → 89KB, 묶음 36.24MB. sw.js 는 이 파일을 캐시하지 않음.
- 오프라인 화면(`app/offline/page.tsx`) "앱 홈 다시 열기" `/app/` → `/app/home-1/`.
- 확인: 테스트 902/902 · 타입 · 이미지 예산 · 펫 프레임 · 운영 빌드 · 묶음 검사 통과. 운영 빌드 결과물에서 앱 홈 HTML 에 웹 헤더 없음 · 앱 상단바 있음 · 스킨 링크가 `<head>` 안, 브라우저 `/products/` · `/app/` 은 웹 그대로(스킨 안 붙음), 앱 안 상품 목록은 스킨 적용(규칙 1,013개), 태블릿 · PC 폭은 가운데 앱 화면 · 넘침 없음.