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

**⑧ 좁은 폰 화면 맞춤 · 와펜 버튼 · 헤더 메뉴 · 굿즈 안내 (2026-10-18 오후)**
- **좁은 폰 화면 맞춤** (`app/layout.tsx` — `<head>` 안 인라인 스크립트 `ddb-app-viewport-fit`): 설치한 앱(PWA standalone · APK `DDBNative`) · 앱 전용 화면(`/app/home-1` · `/app/sticker/…`)에서 **세로 폭 380px 미만**(아이폰 디스플레이 확대 320 · 갤럭시 폴드 접은 화면 344 · 작은 갤럭시 360)이면 viewport 를 `width=390` 으로 바꿔 기준 폭으로 그린 뒤 브라우저가 화면에 맞게 통째로 축소(320→82%). 배치 · 위치 그대로, `zoom` 과 달리 전체 화면 높이(dvh) · 고정 위치 · 터치 좌표가 맞음. Next 가 하이드레이션 뒤 viewport meta 를 하나 더 넣어 MutationObserver 로 같은 값 유지, 회전 · 접기 · 화면 이동 때 다시 계산. 380px 이상 · 가로 · 태블릿 · 펼친 폴드 · 일반 웹은 그대로. (개발 서버 앱 모드 저장값도 앱으로 봄 — 운영에선 쓰이지 않음)
  - 원인: 아이폰 "디스플레이 확대(더 큰 텍스트)"에서 앱 폭이 320 이 되어 와펜 버튼 글자가 두 줄로 넘침(사용자 지인 아이폰 16).
  - 점검: 앱 화면 21개 × 크기 8가지(280 플립 바깥 · 320 · 344 · 390 · 412 · 430 · 690 폴드 펼침 · 768) 168가지 + 창(검색 · 케어톡 · 옵션 · 혜택 · 굿즈 · 로그인 안내) + 로그인 후 화면 14개(390 · 412 · 320) — 넘침 · 잘림 · 겹침 · 화면 밖 0건(헤드리스 크롬). 아이폰 사파리 실기기 확인은 배포 후.
- **와펜 버튼** (`components/pwa/home-concepts/sticker-kit.tsx`): 높이 고정 → 최소 높이(글자에 맞춰 늘어남).
- **PC 헤더 메뉴 글자 14px → 16px** (`components/header/Header.tsx`, `desktopNavItem` 두 곳 `text-sm` → `text-base`). 1280px 에서 한 줄 · 겹침 없음 확인.
- **굿즈 공모전(앱)** — 협업자 `9bee8285`(가격 조정)에 맞춤: 앱 댕다방 굿즈 탭 가격표에 기준 단위(`priceUnit` · 1개/1세트) · 웹과 같은 "소량 제작 예상 펀딩가 안내" 문구를 노란 메모로(`StickerShow.tsx`).

**⑨ 상품 상세 버튼 글자 · 회원가입 링크 · APK 시작을 새 앱 홈에서 바로 (2026-10-18 저녁, 사용자 결정)**
- **상품 상세 "장바구니 담기" · "오픈 준비 중"** (`components/app-shell/appShopSkin.ts`, 앱 스킨만): 갤럭시 384 등에서 두 줄로 꺾이고 아이폰에서도 바느질선에 붙던 것 → 앱에서만 글자 13px · 한 줄 · 장바구니 자수 그림 27→20px. 버튼 크기 · 위치 · 협업자 `ProductInfo.tsx` 그대로.
- **회원가입 동의 링크** (`StickerSignup.tsx`, 우리 파일): "처리방침 보기" 가 좁은 폰에서 "처리방침 / 보기" 로 갈라지던 것 → 한 덩어리로 줄바꿈. 앱 화면 21개 × 폭 6가지(320 · 360 · 384 · 390 · 412 · 430) + 옵션 창 132곳 버튼 글자 점검(두 줄 · 넘침 · 바느질선 붙음)에서 이것 하나만 나옴.
- **APK 실행 확인(Native package validation) 절반 실패 조사**: 실패한 #416 결과물(APK · 로그)을 받아 확인 — 앱은 정상으로 앱 틀까지 불렀고(스킨 · 앱 로고 요청 기록), 확인 도중 앱과의 연결이 끊김(`fetch failed`, 앱 프로세스가 사라짐). 같은 APK 를 로컬 에뮬레이터에서 17번 켜서 1번 같은 증상 재현. 검사용 에뮬레이터가 매우 느린 상태(103프레임 건너뜀 · 메모리 정리 3초)에서 **APK 가 `/app/index.html` → 새 앱 홈으로 두 번 불러오는 부담**이 겹친 것으로 판단. 7a091a1 부터 7번 중 4번 실패(작성자 무관).
- **근본 수정 — APK 를 새 앱 홈에서 바로 시작** (협업자 영역, 사용자 허락):
  - `capacitor.config.ts` `appStartPath`: `/app/index.html` → **`/app/home-1/index.html`**.
  - `scripts/prepare-native-web.mjs`: 네이티브 시작 문서(`native/www/index.html`, 다시 불러오기 · 확장자 없는 주소가 오는 곳)도 `location.replace('/app/home-1/index.html')`, 빌드에 `app/home-1/index.html` 이 있는지 확인 한 줄 추가.
  - `scripts/verify-android-webview.mjs`: 주소 비교 때 끝의 `index.html` 을 떼고 비교(`expectedPath = "/app/home-1/"` 그대로).
  - `tests/pwa-installation.test.mjs`: 위 두 값 확인 두 줄 맞춤.
- **안전장치 — 그리기 전 시작 화면 바로잡기** (`app/layout.tsx` `<head>` 맨 앞 인라인 스크립트 `ddb-app-start-route`, 우리 쪽):
  - 설치한 앱(PWA standalone · 아이폰 `navigator.standalone` · APK `DDBNative`)이 예전 시작 주소(`/app/` · `/app/index.html`)로 열리면 **화면을 그리기 전에** 새 앱 홈으로 `location.replace`(PWA 는 `?source=…` 유지, APK 는 `/app/home-1/index.html`). 예전에 홈 화면에 추가한 아이폰은 저장된 `/app/` 로 열려 웹 설치 안내가 잠깐 보이던 것. **브라우저로 `/app/` 에 온 사람은 그대로 설치 안내.**
  - APK 에서 주소 끝이 `/index.html` 이면 화면 코드가 주소를 읽기 전에 `history.replaceState` 로 `/…/` 로 정리 — 탭 · 첫 화면 판별(`appTabs.ts isTabRoot` 등)이 웹앱과 같은 주소로 맞음.
  - 기존 `AppShell` 의 "`/app/` → 앱 홈" 규칙은 그대로 둠(이중 안전장치).
- **확인**: 로컬에서 APK 직접 빌드(`native:sync` 와 같은 순서 + `gradlew assembleDebug`) → 에뮬레이터(API 36.1)에서 6번 냉시작 모두 새 앱 홈 바로 도착(주소 `/app/home-1/` · 앱 틀 · 웹 헤더 없음 · 홈 탭 켜짐), 쇼핑 탭 ↔ 홈 탭 · 뒤로 · 다시 불러오기(→ 앱 홈) 정상, **실제 `scripts/verify-android-apk-startup.sh` 로컬 실행 통과**. 헤드리스 크롬: 브라우저 `/app/` 은 설치 안내 그대로, 홈 화면 앱(아이폰 방식)으로 `/app/?source=pwa` 를 열면 새 앱 홈. 테스트 907/907 · 타입 · 빌드 · 이미지 예산 · 펫 프레임 · 묶음 36.79MB 통과. iOS 는 로컬 실행 불가 — GitHub iOS 시뮬레이터 빌드로 확인.
- 이미 설치한 APK 는 새 APK 를 설치해야 바뀜(홈 화면 앱은 자동).
- **실행 확인 스크립트 — 우리 앱 통로만 고르기** (`scripts/verify-android-apk-startup.sh`, 협업자 영역 · 사용자 허락): `9cbb8956` 의 #417 이 `Last state: undefined. No debuggable Android WebView page was found.` 로 실패(앱은 화면 맨 앞에 정상으로 떠 있었음). 스크립트가 `/proc/net/unix` 에서 **처음 보이는** `webview_devtools_remote` 통로를 골라, 에뮬레이터의 다른 앱(구글 앱 등) WebView 통로에 붙으면 우리 화면을 못 찾는 구조였음 → **`webview_devtools_remote_$app_pid`(우리 앱 프로세스 번호) 통로만** 고르고, 늦게 생길 수 있어 최대 30초 기다림. adb 출력의 `\r` 은 비교 전에 지움. 앱 · 사용자 화면에는 영향 없음(검사 전용). **되돌리지 말아 주세요.** 로컬 에뮬레이터에서 이 스크립트 3번 실행 모두 통과(새 앱 홈 확인).

**⑩ 앱 속도 최적화 — 상품 데이터 필요할 때만 · 앱 산책 친구 끔 · 영상 보일 때만 재생 (2026-10-18 밤, 사용자 결정)**
- **원인(측정)**: 모든 화면이 공통 묶음에 상품 데이터 약 6.2MB(상품 목록 · 영상 검수 JSON · 옵션 · 상세 이미지 목록)를 담은 자바스크립트 8MB(압축 1.4MB)를 받음. 폰 흉내(CPU 4배 · 6배 느리게, 4G)에서 앱을 열면 스크립트만 1.8초 / 3.6초, 화면 멈춤 합 1.3초 / 3.6초. 경로: `app/layout` → `lib/store.tsx`(장바구니 담기 검사 `findById`) → `lib/catalog`, 그리고 앱 틀 검색창(`SearchModal`) · 케어톡(`ChatWidget` → `lib/daengdabang-llm`, `lib/shop`) · 입혀보기 백그라운드(`lib/pet-tryon-background` → `lib/shop`) · 웹 헤더 · 떠 있는 상담 버튼(`ConditionalChrome` 의 정적 import).
- **바꾼 것(동작은 그대로, 불러오는 때만)**:
  - 새 파일 `lib/catalog-lookup.ts`: `findById` 를 `import("@/lib/catalog")` 로 필요할 때 불러옴. `lib/store.tsx` 는 이 파일만 import, `addToCart` · `setQty`(늘릴 때)는 불러온 뒤 **같은 검사(살 수 없는 옵션 막기)** 를 거쳐 반영, 줄이기 · 빼기는 바로. 리듀서 그대로. `tests/supplier-inventory.test.mjs` 의 장바구니 리듀서 테스트 가짜 모듈 이름만 `@/lib/catalog-lookup` 으로.
  - `lib/pet-tryon-background.tsx`: 상품 주소는 `lib/shop productHref` 와 같은 규칙(`/product/{folder || id}`)을 여기서 만들고, `findProduct` 는 "다시 시도" 때 `await import("@/lib/shop")`(테스트가 확인하는 줄 그대로).
  - `components/app-shell/AppShell.tsx`: 검색창 · 케어톡 창을 `next/dynamic` 으로 **처음 열 때** 붙임. 케어톡은 협업자 `lib/chat-widget-events` 의 `pendingOpen`(창이 뜨기 전 열기 요청 기억) 덕분에 동작 그대로. **앱에서는 산책 친구(PetCompanionGate)를 쓰지 않음**(사용자 결정 — 계속 도는 애니메이션 · 화면 전체 감시가 탭 반응을 늦춤). 웹은 그대로.
  - `components/site/ConditionalChrome.tsx`: 웹 부품(Header · Footer · FloatingDock · PetCompanionGate · PrelaunchNotice)을 `next/dynamic`(ssr 기본 true)으로 — 웹 화면은 미리 만든 HTML 에 그대로 들어가 모양 · 동작 같고(빌드 결과 HTML 에 헤더 · 푸터 확인), 앱 화면은 이 코드를 받지 않음.
  - 영상: 새 부품 `components/pwa/home-concepts/InViewVideo.tsx` — 15% 이상 보일 때만 재생 · 화면 밖 · 다른 앱으로 나가면 멈춤, 미리 받기 `metadata`. 쇼핑 상단 영상 · 견종 배지(`ShopHero.tsx`), 쇼핑 프로모 칸(`StickerShop.tsx`), 굿즈 영상(`StickerShow.tsx`). 상품 카드 영상은 협업자 `lib/product-video-viewport.ts` 가 이미 같은 방식이라 그대로.
  - 앱 스킨 `.global-aurora` 를 `opacity:0` → `display:none`(안 보이는 웹 배경 그림을 메모리에 풀지 않게).
- **결과**: 앱 홈 · 연구소 · 마이 · 댕다방 자바스크립트 8MB → **1.2MB**(압축 1.4MB → 0.35MB). 쇼핑 · 웹 상품 화면은 상품 데이터가 필요해 그대로. CPU 4배 느리게: 스크립트 1.8초 → **0.3초**, 탭 누름 반응 0.04~0.07초. CPU 6배: 스크립트 3.6초 → **0.6초**, 쇼핑 탭 전환 4.7초 → 1.7~3.2초. 남은 첫 화면 멈춤(0.9초)은 스크립트가 아니라 화면 배치 계산 0.7초 · 한글 글꼴 모양 잡기 0.3초 — 다음 단계(앱 스킨 CSS 가볍게)에서.
- **확인**: 테스트 907/907 · 타입 · 빌드 · 펫 프레임 · 이미지 예산 · APK 묶음 36.81MB. 헤드리스 크롬으로 앱 상품 상세에서 옵션 고르기 → 담기 → 장바구니 0 → 1줄, 앱 검색창 열림, 케어톡 첫 누름에 열림, 쇼핑 영상 맨 위 재생 → 아래로 내리면 멈춤 → 돌아오면 재생, 굿즈 영상 재생.
- **남은 제안(협업자 영역)**: 영상 검수 JSON(4.4MB) · 상품 목록 조립(`buildCatalog`, 행마다 전체를 다시 훑고 `new URL` 수십만 번)을 빌드 때 미리 계산해 두면 쇼핑 · 상품 화면도 가벼워짐. 장바구니 · 찜 바뀔 때 앱 전체가 다시 그려지는 하나짜리 store 컨텍스트 나누기.

**⑪ 앱 속도 1단계 — 화면 느낌 그대로, 꾸밈 계산 가볍게 (2026-10-18 밤, 사용자 결정 · 모두 우리 파일)**
- `components/app-shell/AppShell.tsx`: 앱 겉모양 표시(html `ddb-app-mode` · `ddb-app-subrow` · `ddb-app-shop-web` · `ddb-app-my-web` · `ddb-app-lab-web` · `data-app-page`)를 effect 6개가 **그린 뒤** 떼었다 붙이던 것 → `useLayoutEffect` 하나가 **그리기 전에** 바뀐 값만 맞춤(앱 틀이 사라질 때만 지움). 화면 전환 때 꾸밈 다시 계산(CPU 4배 느린 폰 흉내): 쇼핑 1.3초 → **0.28초**, 연구소 0.65 → 0.34초, 홈 0.8 → 0.47초.
- 상단바 · 탭바: 뒤를 흐리게 비치는 `backdrop-filter: blur` → 같은 색 불투명 바탕(`#faf7f4` · `#fffdf8`, 원래 86~90% 불투명이라 보기엔 같음). 다크 모드 색 규칙은 그대로.
- 계속 도는 그림자 애니메이션 → 같은 모양을 조각의 크기 · 투명도로: 케어톡 초록 점 고리(`.app-care-dot::after`), 오늘 도장 칸 숨쉬기 분홍 고리(`kit.tsx` `ah-wait` · `.st-slot.is-today`). 움직임 줄이기 설정이면 멈춤 그대로.
- 홈 카드 펼침(`gestures.tsx useExpandNav`): 누르는 순간 `router.prefetch` — 0.43초 펼침이 끝나 이동할 때 다음 화면이 준비돼 있음(이동 시점은 그대로).
- 결과(CPU 4배): 탭 전환 연구소 · 마이 0.3초, 홈 · 댕다방 0.4초, 쇼핑 0.7~1.0초, 누름 반응 0.02~0.05초. 전후 화면 비교 `docs/09-앱-시안-인계/앱화면크기시안_20261018/앱속도_1단계_전후.png`(차이는 쇼핑의 산책 친구 집 버튼이 없어진 것뿐 — ⑩ 결정).
- 남은 것: 첫 화면 배치 계산 0.7초 · 한글 글꼴 모양 잡기 0.3초, 화면마다 넣는 큰 `<style>`(KIT_CSS 등)을 정적 파일로, 앱 스킨 CSS 를 버전 표시용으로 JS 에도 넣는 것(빌드 설정 필요해 보류), 카드 그림자 필터를 그림에 미리 굽기.

**⑫ 앱 연구소 행동 분석 촬영 화면 오른쪽 잘림 (2026-10-18 아이폰 제보 · 앱 스킨만)**
- 증상: 카메라 연결 뒤 전체 화면 촬영 창에서 윗줄 닫기(×) · 아래 "15초 관찰 시작" · "연결 끊기" 버튼 오른쪽이 화면 밖으로 잘림.
- 원인: 앱 스킨이 세로 카메라 칸을 `height:100%; width:auto; aspect-ratio:3/4` 로 키우는데, 협업자 촬영 틀(`data-petlens-capture-stage`, grid)의 열 폭이 내용에 맞춰져 카메라 칸 폭(393×852 화면에서 453px)만큼 틀 전체가 넓어짐. 같은 구조를 떼어 낸 재현에서 버튼 끝 461px(화면 393px).
- 수정: `appShopSkin.ts` 에 `[data-petlens-capture-viewport] [data-petlens-capture-stage] { grid-template-columns: minmax(0, 1fr); }` — 틀 폭은 화면 폭까지. 재현에서 버튼 끝 385px. 영상은 협업자 `object-contain` 그대로 다 보이고 남는 틈은 종이색, 콕 찍기 위치는 협업자 코드(`handleTargetAnchorPointer`)가 칸 크기 · 영상 비율로 계산해 그대로 맞음.

**⑬ 보류 — 펫렌즈 사진 · 외형 분석(/pet-lens) 사진 칸 (2026-10-18 사용자 확인, 아직 손대지 않음)**
- 지금 구성(협업자 `app/pet-lens/PetLensClient.tsx` · `lib/petlens-multiview.ts`): 사진 칸 4개(정면 얼굴·가슴 / 왼쪽 옆선·다리 / 오른쪽 반대 옆선 / 뒷면 등선·꼬리)를 **하나씩 누르면 휴대폰 카메라가 바로 열림**(`capture="environment"` · `data-petlens-mobile-camera-capture`). 최소 1장(정면 권장)이면 분석 가능, 4장이면 더 꼼꼼히 비교. 협업자 테스트 3곳(`petlens-multiview-main` · `member-profile-navigation-mobile-ux` · `petlens-signup-draft`)이 카메라로 열리는 것을 확인 — 카메라 우선은 협업자 의도로 보임.
- 사용자 피드백 1(겉모양): 점선 상자 + 작은 카메라 아이콘이라 **사진이 이미 등록된 칸 · 올리는 칸처럼 보여 "눌러서 찍는 곳"인 줄 몰랐음.** 개선안(우리 앱 스킨만, 동작 그대로): 칸마다 순서 번호 ①~④ · 큰 카메라 스티커 · "눌러서 찍기" 문구, 위에 "📷 정면부터 찍어 주세요" 와펜(아직 안 찍은 첫 칸을 여는 기존 동작), 찍은 칸 "✓ 찍음" · 진행 2/4 표시, 다음 칸 은은하게 반짝임.
- 사용자 피드백 2(기능): 휴대폰에서는 **찍기만 되고 앨범 사진 첨부가 안 됨**(PC 는 파일 창). 헤더 펫렌즈 창(`PetlensUpload`)은 찍기 / 사진 선택 둘 다 있어 화면마다 다름. 안: 카메라 칸은 그대로 두고 "앨범에서 고르기" 버튼을 더해 같은 `handleFile` 로 연결(협업자 테스트 그대로 통과). **카메라만 쓰게 한 협업자 의도와 맞는지 함께 정할 것.**
- 상태: 사용자 결정으로 보류(기록만). 진행 시 시안 먼저.

**⑭ 앱 케어톡 · 검색창 · 화면 이동 · 아이콘 (2026-10-20 사용자 결정 · 앱만, 웹 동작 그대로)**
- **케어톡 글꼴 고정**: 앱은 정자체(앱에서 나눔스퀘어라운드) 하나로, 글꼴 전환 버튼(가|가) 없음. 협업자 `components/site/ChatWidget.tsx` 에 선택 속성 `fixedFontMode?: "readable"` 추가 — 넘기면 저장된 글꼴 값 대신 그 값을 쓰고 전환 버튼을 그리지 않음. 안 넘기면(웹) 기존과 같음.
- **케어톡 열 때 키보드**: 앱은 창을 열어도 입력칸에 커서를 두지 않음(휴대폰 키보드가 바로 안 올라옴, 입력칸을 누르면 올라옴). `ChatWidget` 선택 속성 `focusInputOnOpen?: boolean`(기본 true) — false 면 입력칸 대신 창(`section`, `tabIndex=-1`)에 초점(화면 읽기도 창 안에서 시작). 협업자 테스트가 보는 줄 `if (open) inputRef.current?.focus()` · `else triggerRef.current?.focus()` 는 그대로 남김.
- **입력 중 탭바 숨김**: 키보드가 올라오면 화면 높이가 줄어 아래 탭바까지 키보드 위로 따라 올라왔음. `AppShell.tsx` 가 글자 입력칸에 초점이 있는 동안 `html.ddb-app-typing` 을 붙이고, 그동안 탭바 · 케어톡 버튼 숨김 · 케어톡 창 아래를 탭바 자리까지 내림 → 키보드가 창만 밀어 올림. 앱의 모든 입력칸에 같은 규칙.
- **케어톡 버튼 위치**: 상단바 버튼을 빼고 오른쪽 아래 떠 있는 동그란 버튼(52px, 사용자 그림 `public/images/ui/stickers/caretalk-fab.webp`). 탭바 위 · 상품 상세는 구매 바 위, 창 · 검색창 · 다른 창이 열려 있으면 숨김. 누르면 기존 `openChatWidget()`.
- **화면 이동은 맨 위부터**: 버튼 · 링크로 들어간 화면(상품 · 기획전 · 공지 · FAQ · 문의 · 약관 등)이 약 112px 내려간 채 열려 제목 줄이 가려졌음(Next 가 새 화면의 본문 첫 줄만 화면 안으로 옮김). `AppShell.tsx` 가 주소가 바뀌면 맨 위로(스르륵 없이). 뒤로 · 앞으로 가기(popstate)는 보던 자리 그대로, 주소에 `#` 이 있으면 그대로. 측정: 고치기 전 y=56~112 → 후 y=0, 뒤로 가기 y=500 → 500.
- **휴지통 · 닫기 아이콘**: 앱 어디서나 글꼴 아이콘 `fa-xmark` · `fa-trash-can` · `fa-trash` 를 사용자 그림(`icon-close.webp` · `icon-trash.webp`)으로 바꿔 끼움(앱 스킨 CSS, 버튼 · 동작 그대로). 아이콘만 있는 버튼은 뒤 흰 동그라미 · 테두리를 뺌. 결제 실패 화면의 큰 `fa-circle-xmark` 는 표시용이라 그대로.
- **검색창(앱)**: 협업자 `components/header/SearchModal.tsx` 에 선택 속성 `placeholder?: string` 추가 — 앱은 "어떤 상품을 찾으세요?" 만(웹 문구는 좁은 칸에서 괄호 뒤가 잘림). 닫기 버튼은 앱 스킨에서 입력칸 오른쪽 바깥으로(칸 안의 X 는 "글자 지우기"로 읽혀 헷갈림), 검색창 위 테이프 제거.
- **케어톡 제목 테이프**: 제목 칸이 줄 폭(210px)만큼 늘어나 분홍 바탕이 길게 이어지던 것 → 글자 폭만큼.
- 확인: 테스트 907/907 · 타입 · 빌드 · 펫 프레임 · 이미지 예산 · APK 묶음. 헤드리스 크롬(안드로이드 휴대폰 흉내)으로 위 동작 확인. 실제 키보드가 올라올 때 모양은 휴대폰에서 확인 필요.

**⑮ 앱 화면 맨 위 · 떠 있는 버튼 겹침 · 사진 올리기 (2026-10-20 사용자 결정)**
- **다른 화면으로 가는 `#` 주소도 맨 위부터(앱)**: ⑭ 에서 `#` 주소는 그 위치로 두었더니 마이 "반려견 관리"(`/mypage/#pet-profiles`)가 중간부터 보였음. 이제 다른 화면으로 가면 `#` 이 있어도 맨 위부터(`AppShell.tsx`, Next 가 한 장면 늦게 옮기는 것까지 한 번 더). 같은 화면 안 `#` 이동 · 뒤로 가기는 그대로. 해당: `/mypage#pet-profiles` · `/mypage#daenglab-wallet` · `/my-pet#health-report` · `/privacy#overseas` · `/pet-lens#observation`. 측정: `/privacy/#overseas` 4980 → 0.
  - 예외(그대로 둠): 1:1 문의(`CustomerInquiryPanel`)는 문의 양식을 열고 그 자리로 직접 옮김(협업자 기능 — 바로 쓰게). 사용자 확인 중.
- **떠 있는 버튼 겹침(앱)**: 화면에 자기 떠 있는 버튼이 있으면(`data-app-fab`, 지금은 댕자랑 "오늘의 한 장 올리기") 케어톡 버튼이 자동으로 그 바로 위로(AppShell CSS `body:has([data-app-fab])`). 사진 올리기 버튼은 케어톡과 같은 52px · 같은 오른쪽 줄. 앱 안의 오른쪽 아래 떠 있는 버튼은 이 둘뿐(예전 `ChatbotFab` · `PetlensFab` 은 Provider 를 쓰는 곳이 없어 화면에 안 나옴).
- **사진 올리기 — 어떤 휴대폰 사진이든(앱 · 웹 공통, 협업자 파일 포함 · 사용자 허락)**:
  - 증상: 진짜 JPEG 인데 "JPG, PNG, WebP 사진만" 안내. 원인 = 검사가 휴대폰이 붙이는 `file.type` 만 봄 — 이름표가 비었거나(`""`) `image/jpg` 로 오는 휴대폰 · 갤러리 앱, 아이폰 HEIC · 삼성 고효율(HEIF), 8MB 넘는 원본.
  - 새 파일 `lib/upload-image.ts` `prepareUploadImage(file, { maxBytes })`: 파일 앞 바이트로 실제 형식 판별 → JPEG · PNG · WebP 면 이름표만 바로잡아 원본 그대로(화질 그대로), HEIC · HEIF · AVIF · GIF · BMP 는 JPEG 로(브라우저가 HEIC 를 못 열면 `heic2any`(MIT, 새 의존성 `package.json`) — **그런 사진이 들어올 때만 동적 import**, 1.3MB 별도 파일), 용량 넘으면 긴 변 4096px 안에서 JPEG 로 줄임, 못 열면 원래 파일(기존 검사 · 문구 그대로). 서버 · 검사 규칙(`validateShowcaseImage` · `validateGenerationReferenceFile`)은 그대로.
  - 연결한 곳: 댕자랑 웹 `ShowcaseComposer.selectPhoto` · 앱 `show-parts pickPhoto`, 케어톡 참고사진 `GenerationReferenceComposer`(input onChange 에서 맞춘 뒤 `addFiles`), 펫렌즈 · 주간 비교 `preparePetLensPhotoCapture`, 반려견 사진 `resizePetPhoto`(가입 웹 · 앱), `PetRegisterModal`, `PetlensUpload`. 협업자 테스트가 보는 줄(`await preparePetLensPhotoCapture(file)` · `await resizePetPhoto(file)`)은 그대로.
  - 고르기 칸 허용 목록에 `image/heic,image/heif` 추가(안드로이드 사진 고르기가 고효율 사진을 숨기지 않게) — `tests/chat-generation-reference-assets.test.mjs` 의 accept 확인 한 줄을 같이 고침.
  - 크롬 시험: 이름표 없는 JPEG → `IMG_0001.jpg image/jpeg` 원본 크기, `image/jpg` → `image/jpeg`, HEIC(이름표 있음 · 없음) → JPEG 0.1~0.2초, 13MB PNG → 3.7MB JPEG, GIF → JPEG, 글자 파일 → 그대로(기존 안내).
- 확인: 테스트 923/923 · 타입 · 빌드 · 펫 프레임 · 이미지 예산 · APK 묶음 38.45MB(40MB 안 — 여유가 줄었음).
