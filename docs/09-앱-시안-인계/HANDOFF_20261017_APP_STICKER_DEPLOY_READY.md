# 앱 화면(스티커북) 운영 반영 안내 — 협업자용 (2026-10-17)

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
