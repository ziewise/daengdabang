# 앱 스티커북 시안·서버 이전 (2026-10-15)

> 파일 이름은 서버 인계 규칙 `HANDOFF_YYYYMMDD_<주제>_<상태>.md`를 따른다(상태: CURRENT = 현재 최신 상태).
> 사용자(smlee)의 로컬 PC에서 진행한 **앱 UI 시안**을 서버로 옮겨 이어서 작업하기 위한 인계다. 새 창은 **이 문서를 처음부터 끝까지 읽고** 시작한다.

## 사용자 요청과 배경

- 앱(네이티브 앱 · 설치 앱)에서 보이는 화면을 **스티커북 다이어리 콘셉트**로 새로 입힌다. 웹 화면은 바꾸지 않는다.
- 협업자와 **아직 협의 전**이라, 사용자가 시안을 만들어 보여 주기 위한 작업이다. 커밋은 로컬 전용 브랜치에만 하고 푸시·배포하지 않는다.
- 2026-10-15 사용자가 서버에 Claude Desktop을 설치해 서버에서 이어서 작업하기로 했다.

---

## 0. 절대 규칙 (가장 먼저)

### 0-1. UI만 작업한다 — 그 밖은 절대 건드리지 않는다
이 작업은 **이미 있는 기능에 UI(화면 모양)만 입히는 일**이다.

- **수정 금지**
  - 백엔드 서버(`api.daengdabang.com`, 서버의 `C:\DaengDaBang\apps\api`, `tools`, 워커 등)
  - API 동작·응답, 데이터베이스
  - 로그인·회원가입·결제·주문·인증 로직
  - 추천·분석 엔진(`lib/recommendation`, 펫렌즈 분석 등)
  - 배포·빌드 설정(GitHub Actions, Cloudflare, Capacitor·안드로이드·iOS 설정, `next.config.*`)
- **데이터 쓰는 법**: 협업자가 만든 함수(`lib/*`)를 **읽어서 쓰기만** 한다. 운영 서버에는 **조회만** 한다. 시연 동작(응원·팔로우·신고·올리기 등)은 서버로 보내지 않는다.
- **협업자 파일 수정**: UI 연결에 꼭 필요한 최소한(목록 내보내기, 모양용 prop 추가)만 하고, 아래 6장 목록에 기록한다.
- **기능을 바꿔야 할 것 같으면** 직접 고치지 말고 **먼저 사용자에게 알린다.**

### 0-2. 푸시·배포 금지
- 시안은 협업자와 **아직 협의 전**이다. 시안 브랜치(`local/sticker-mockup`)와 이름표(`시안-*`)는 **절대 푸시하지 않는다.** `git push --tags`도 금지다.
- GitHub `ziewise/daengdabang`의 **main에 푸시하면 운영 사이트에 바로 배포된다.** 시안이 섞이면 운영 사고가 된다.
- 푸시는 사용자가 협의를 마치고 **직접 지시할 때만** 한다. 그때도 2-4의 막아 둔 푸시 설정을 사용자 확인 후에 푼다.

### 0-3. 협업자 작업 공간을 건드리지 않는다
- 서버 `C:\DaengDaBang\.codex\…`, `.codex-worktrees\…`, `artifacts\…\storefront` 등은 **협업자(와 협업자의 AI 도구 Codex)의 작업 폴더**다. 커밋하지 않은 수정이 남은 곳이 많다. 열어 보기는 해도 **수정·삭제·체크아웃 변경을 하지 않는다.**
- 서버 루트에는 API 키·토큰·`.env`·`secrets` 같은 **비밀 정보 파일**이 많다. **열지 않는다.**
- 시안은 **시안 전용 새 폴더**(아래 2장)에서만 작업한다.

---

## 구현 및 소스 — 1. 지금까지 한 일 요약
- 앱 모드(네이티브 앱 · 설치 앱 · `/app/` 진입)에서만 보이는 **스티커북(다이어리) 콘셉트 UI**를 만들었다. **웹 화면은 그대로**다.
- 커밋: 로컬 브랜치 `local/sticker-mockup` (기준 GitHub main `91b9e4ab3`) 위 16개 이상 커밋, 첫 체크포인트 이름표 `시안-1015`.
- 미리보기: `npm run dev`(포트 4000) → `http://localhost:4000/app/home-1/`

### 화면(라우트)
| 주소 | 화면 | 탭 |
|---|---|---|
| `/app/home-1/` | 홈(인사 · 출근 스티커 · 오늘의 스티커 · 바로가기) | 홈 |
| `/app/sticker/daily/` | 매일 댕생활(이번 주 · 혜택 · 안내) | 홈 |
| `/app/sticker/care/` | 동네 돌봄 찾기 | 홈 |
| `/app/sticker/lab/` | 연구소(우리 아이 · 기록) | 연구소 |
| `/app/sticker/report/` | 건강 변화 리포트(마이펫 주간 리포트와 같은 정보) | 연구소 |
| `/app/sticker/shop/` | **쇼핑 첫 화면**(1단계 완료) | 쇼핑 |
| `/app/sticker/show/` | 댕다방(댕자랑 실제 피드 · 굿즈 공모전) | 댕다방 |
| `/app/sticker/my/` | 마이(시안) | 마이 |
| `/app/sticker/login/`, `/app/sticker/signup/` | 앱 전용 로그인 · 회원가입(로직은 웹과 동일) | — |
| `/app/sticker/buttons/` | 버튼 시안 모음(참고용) | — |

탭바 순서: **홈 · 연구소 · 쇼핑(가운데 강조) · 댕다방 · 마이**

### 주요 파일
- 앱 틀: `components/app-shell/AppShell.tsx`(상단바·탭바·케어톡 서랍·링크 가로채기·산책 친구), `appTabs.ts`(탭·경로 규칙), `CareTalkDrawer.tsx`, `useAppMode.ts`
- 시안 화면: `components/pwa/home-concepts/` (`pages/Sticker*.tsx`, `shop/ShopHero.tsx`, `shop/ShopProductCard.tsx`, `show-parts.tsx`, `show-feed.ts`, `sticker-kit.tsx`, `sticker-parts.tsx`, `kit.tsx`, `shared.tsx`, `page-data.ts`)
- 라우트: `app/app/home-1`, `app/app/sticker/*`
- 이미지: `public/images/ui/stickers/*.webp`(앱용), 원본 PNG는 `public/images/*.png`(사용자가 만든 3D 클레이 그림)
- 글꼴: `public/fonts/`(Cafe24 써라운드 · 나눔스퀘어라운드, 라이선스 `README.md`)
- 설계 문서: `docs/06-…`, `docs/07-…`, `docs/08-…`
- 이미지 변환 스크립트: `tools/sticker-assets/`

---

## 2. 서버에서 시작하는 법

### 2-1. 시안 전용 폴더 만들기
협업자 폴더를 쓰지 않고 새로 만든다. 예: `C:\DaengDaBang\mockup-sticker\`
```
git clone https://github.com/ziewise/daengdabang.git C:\DaengDaBang\mockup-sticker\daengdabang
```
(이미 서버에 있는 저장소에서 `git worktree add`로 만들어도 되지만, 협업자 저장소에 브랜치가 섞이므로 **별도 clone을 권장**한다.)

### 2-2. 번들에서 시안 브랜치 가져오기
번들 파일(`daengdabang-sticker-mockup.bundle`)을 서버로 복사한 뒤:
```
cd C:\DaengDaBang\mockup-sticker\daengdabang
git bundle verify <번들경로>
git fetch <번들경로> local/sticker-mockup:local/sticker-mockup
git fetch <번들경로> "refs/tags/*:refs/tags/*"
git switch local/sticker-mockup
```
번들은 GitHub main `91b9e4ab3` 이후 커밋만 담고 있다(이름표 `시안-1015`, `시안-1015-이전` 포함). clone 직후라면 그 커밋이 이미 있어서 그대로 들어온다.

### 2-3. 협업자 최신 코드 받기 (작업 전 매번)
```
git fetch origin
git merge origin/main
```
- 협업자가 main에 직접 푸시하므로 **작업 전 fetch 필수**.
- 충돌이 나면 시안 파일(`components/pwa/home-concepts`, `components/app-shell`, `app/app/*`)은 시안 쪽을, 협업자 파일은 협업자 쪽을 기준으로 하고 6장의 최소 수정만 다시 얹는다.
- `tests/smart-fit-*.test.mjs` 두 파일은 Windows에서 줄바꿈(CRLF)만 바뀐 것으로 보일 수 있다. **커밋하지 않는다.**

### 2-4. 실수 푸시 막기 + 커밋 작성자 (시안 폴더에서만, 사용자 확인 후)
```
git remote set-url --push origin NO_PUSH_UNTIL_AGREED
git config user.name "smlee"
git config user.email "smlee@ziewise.com"
```
- 첫 줄로 이 폴더에서는 `git push`가 실패한다. 나중에 사용자가 지시하면 원래 주소로 되돌린다(5장).
- 작성자 설정은 이 폴더에만 적용된다(`--global` 쓰지 않기). 협업자 설정은 건드리지 않는다.

### 2-5. 설치 · 미리보기
- Node **24.14 이상, 25 미만**(`package.json` engines).
- `npm install` → `npm run dev`
- **포트 주의**: `dev` 스크립트는 4000번이다. 서버에서 협업자 개발 서버가 3002·4001 등을 쓴 기록이 있다. 4000이 쓰이고 있으면 `npx next dev -p <빈 포트>`로 띄운다(설정 파일은 바꾸지 않는다).
- 로컬은 운영 서버에 로그인되지 않는다. `.env.local`로 운영 API를 연결하지 않는다(0-1).
- 화면 확인은 휴대폰 크기(375px 폭)로 한다.

---

## 3. 디자인 규칙 (사용자 확정)
- **콘셉트**: 스티커북 다이어리. 종이 · 마스킹테이프 · 메모지 · 폴라로이드 · 오려 붙인 스티커. 기울기는 ±1도 정도.
- **배경**: 점 무늬 다이어리 속지(`DiaryBody`) + 왼쪽 링 구멍. 색인 탭은 `DiaryTabs`.
- **종이에 줄(괘선·여백선) 금지.**
- **버튼**: 자수 와펜(`Patch`). 잉크 도장 버튼·Squishy 버튼은 쓰지 않는다.
- **아이콘**: 사용자가 만든 **3D 클레이 그림**을 우선 쓰고, 없으면 젤리 SVG를 쓴다. 작은 기능 아이콘(화살표·닫기·체크 등)은 글꼴 아이콘(Font Awesome 무료판) 그대로 둔다. `fa-sparkles` 등 **Pro 전용 아이콘은 무료판에 없어 빈칸**이 되니 쓰지 않는다.
- **글꼴**: 제목·버튼·라벨은 Cafe24 써라운드(`.ah-display`), 본문·설명·입력과 작은 글씨(칩·카테고리명 등)는 나눔스퀘어라운드 굵게(`.ah-light`). 글꼴 파일은 `public/fonts`에 직접 둔다.
- **영상 위 글자 금지**(사진 위도 마찬가지). 글자는 영상 위아래로. 살짝 침범하는 정도만 허용.
- **모바일 터치 모션만**: hover 금지. 누르기 · 길게 누르기 · 밀기 · 스크롤. 카드 하나를 조작할 때 화면 전체가 움직이면 안 된다.
- **간결하게**: 정보는 웹(협업자)과 같게 유지하되, 영문 꼬리표(COLLECTION · FEATURED 등)와 군더더기 설명은 뺀다. 예시 질문 칩에는 아이콘을 붙이지 않는다.
- **문구**: 협업자의 실제 문구를 그대로 쓴다. 새로 쓴 짧은 사용 안내는 최소한으로.
- **주석**: 모든 파일에 머리 주석 + 인라인 주석을 한국어로 단다.
- **로그인 요구 화면**은 모두 앱 로그인 화면(`/app/sticker/login/`)으로 통일한다.
- **상단바**: 늘 로고(하위 화면은 뒤로 가기 + 로고). 페이지 제목은 상단바 아래 마스킹테이프 라벨(아이콘 없음). 홈 · 쇼핑 첫 화면은 제목 테이프 없이 시작.

---

## 4. 확정된 결정 · 남은 일

### 쇼핑 탭
- 웹 첫 페이지를 그대로 보여주지 않고 **앱 전용 쇼핑 첫 화면**(`/app/sticker/shop/`)을 쓴다. 데이터·정보는 웹과 같다.
- 순서: 히어로 → 상품군 5개 → (회원) 맞춤 추천 → 추천 셀렉트·신상품(색인 탭) → 기획전 → 대표 브랜드 → 인스타 링크
  - 히어로: 브랜드 문구가 맨 위. 폴라로이드 영상(정사각, 아래쪽을 잘라 강아지가 가운데). 영상 아래 왼쪽은 지역 고르기, 오른쪽은 "지역 · 온도" + "계절 시간". "오늘의 산책 준비" 칩은 뺐다. 견종 얼굴 배지는 연구소로 간다.
  - 상품군: 웹 메뉴 이름 그대로(산책/아웃도어 · 먹거리 · 생활용품 · 장난감/놀이 · 케어), 3D 그림.
  - 맞춤 추천: 회원만. **비회원은 자리 없음**(웹과 같음). 출시 전이라 모든 상품이 "재고 확인 필요"여서 실제 추천은 비어 있고, 시연은 추천 셀렉트 상품으로 모양만 보여 준다.
  - 기획전·브랜드: 제목만(설명·버튼 문구 없음). 큰 카드 제목은 한 줄.
  - 빠진 것: 인트로, 앱 설치 띠, 보물광산 소개, 인스타 사진 벽.
- 상품 카드(2026-10-16 사용자 결정): 색상 미리보기 칩 · "n가지 색상"과 맞춤 추천 카드 아래 추천 이유 메모(왜 추천했나요 · 관심 없음)는 **앱 쇼핑 카드에서 뺌**(웹은 그대로). 대신 맞춤 추천 제목 아래 **"추천 기준" 버튼 → 속지**에 모았다: 반영 기준 문장, 사용한 정보(협업자 문구), 주의 문구, 상품별 추천 이유, 상품별 "관심 없음"(협업자 `hideProduct`), 숨긴 상품 다시 보기(`resetHidden`), 추천 데이터 관리 링크. 속지를 열면 보이는 상품마다 `trackReasonOpened` 기록(웹의 "왜 추천했나요" 펼침과 같은 기록) — 기록 방식이 웹과 다르므로 협업자 확인 필요.
- 상품 카드 그 밖의 정보는 웹 카드와 같음. 영상은 협업자 `useProductVideo` 그대로(휴대폰에서 보이면 사진→영상, 스크롤 중 멈춤).
- **상품 상세 · 장바구니 · 결제는 웹 화면 그대로 둔다.**
- **남은 일 — 2단계**: 상품 목록 화면들(상품군 `/category/*`, `/best`, `/new`, `/promo/*`, `/brands`, `/products`)을 같은 스크랩 카드 모양의 앱 전용 화면으로.

### 산책 친구(협업자 PetCompanion)
- **쇼핑 화면에서만** 보인다(엔진은 협업자 것 그대로, 모양만 앱에서 덮어씀).
- 발바닥(설정) 버튼은 앱에서 숨김. 설정은 강아지를 누르면 나오는 빠른 메뉴의 "설정하기"로 연다.
- 강아지 집은 탭바 위 오른쪽 아래의 3D 집 스티커다.
- 히어로 위로 오지 않고, 히어로가 화면에 크게 보이는 동안은 숨는다.
- **남은 일**: 빠른 메뉴(테이프 메모지 + 3D 아이콘)와 "산책 친구 설정" 창 꾸미기. 메뉴만 할지 설정 창까지 할지 사용자 답 대기.

### 그 밖의 남은 일
- 상단바 검색·장바구니 3D 아이콘(사용자 이미지 준비 후)
- 사진·외형 분석, 행동·소리 분석 화면 앱 전용으로(지금은 웹 펫렌즈 화면이 앱 틀 안에 열림)
- 섹션 제목 아이콘 등 3D 아이콘 교체 목록(대화에서 정리한 1·2순위)
- 마이 화면은 아직 비교 범위 밖

---

## 4-1. 배포 전 반드시 실제 기능에 연결할 "시연 동작" (2026-10-16 점검)

원칙(사용자): **껍데기만 바꾸고, 버튼을 누르면 무조건 기존 기능에 그대로 연결.** 아래는 지금 화면 안에서만 바뀌는 시연용 동작·예시 데이터다. 배포 전에 하나도 남기지 않고 협업자 함수에 연결한다(함수 동작은 수정하지 않음).

| 화면 | 시연 동작 · 예시 데이터 | 연결할 기존 기능 |
|---|---|---|
| 홈 · 매일 댕생활 | 출근 스티커 붙이기, 오늘 할 일(20분 산책·눈 상태 확인) 완료, 코인 · XP · 레벨 · 연속 출석 · 루틴 점수 표시 (`useTodayDemo`, `SAMPLE`) | 협업자 출근도장 · 할 일 완료 · 참여 현황 함수(`MemberAiDashboard`가 쓰는 `lib/customer-api` 함수 그대로) |
| 매일 댕생활 › 혜택 | 관심 등록 · 동의 | 협업자 성장 프로그램 관심 등록(`GrowthHub`/`GrowthPrograms`가 쓰는 함수) |
| 연구소 · 리포트 | 우리 아이 정보 · 사진 기록 · 행동·소리 기록 · 주간 리포트가 예시 데이터, "새 주간 분석 시작"은 안내 문구만 | 반려견 프로필 · 주간 사진 분석(`loadWeeklyPhotoAnalyses`) · 관찰 기록, 촬영은 `WeeklyPhotoComparison` |
| 댕다방 › 댕자랑 | 피드 읽기는 실제. 올리기 · 응원 · 팔로우 · 신고 · 삭제 · 작성자 프로필, 오늘의 주제 · 대표 댕자랑은 시연 | `lib/daeng-showcase`의 `createShowcasePost` · `setShowcaseBone` · `setShowcaseFollow` · `reportShowcasePost` · `deleteShowcasePost` · `loadShowcaseAuthorProfile` · `loadShowcaseTopic` |
| 댕다방 › 굿즈 공모전 | 굿즈 선택 · 취소, 비회원 이메일 인증, 참여 수 | 협업자 `GoodsContest`가 쓰는 선택 · 인증 함수와 집계 |
| 동네 돌봄 찾기 | 검색 결과가 예시(`CARE_SAMPLE`) | `LocalCareFinder`의 위치 검색 그대로 |
| 마이 | 회원 정보 · 주문 · 적립금 · 코인 바꾸기가 예시 | 협업자 마이페이지 함수 |
| 쇼핑 › 맞춤 추천 | 로그인 안 된 시연에서만 예시 상품(실제 회원은 협업자 추천 엔진) | 그대로 — 시연 분기만 제거 |
| 공통 | 페이지 위 "로그인 전 / 로그인 후(예시)" 토글, "(시연)" 버튼·문구 | 실제 로그인 상태(`useAuth`)로 바꾸고 토글 제거 |

이미 실제 기능에 연결된 것: 로그인 · 회원가입, 케어톡 대화, 쇼핑 상품 카드(찜 · 색상 · 상세 이동 · 영상), 매일 댕생활 안전 공유, 히어로 날씨 · 지역, 링크 이동 전부.

## 4-2. 푸시 전 확인 목록
1. **GitHub 최종본 확인**: `git fetch origin` 후 main 최신 커밋을 합치고, 협업자가 바꾼 파일과 우리 수정이 겹치는지 확인한다.
2. **협업자 인계 문서 확인**: 서버 `C:\DaengDaBang`(공유 `V:\`)에 새로 추가된 `HANDOFF_*` 파일과 `NEXT_WINDOW_START_HERE.md` 맨 위 항목을 읽고, 앱 · 케어톡 · 상단바 · 버튼 동작에 바뀐 점이 있는지 확인한다.
3. **버튼 대조표**: 앱 화면의 모든 동작 버튼이 GitHub 최종본의 같은 버튼과 같은 함수 · 같은 값 · 같은 목적지(4-1, 6장 예외만 허용)인지 한 줄씩 확인. 시연 동작 0개.
4. **운영 빌드**(`npm run build`, static export)와 린트 · 타입 검사 · 협업자 테스트(`npm test`) 통과.
5. **테스트 APK**를 만들어 탭 이동, 앱 안 화면 / 브라우저 창으로 열리는 화면, 케어톡 · 펫렌즈 창을 실제로 확인. 아이폰 설치 앱도 확인.
6. 협업자와 협의 완료 + 사용자 지시가 있을 때만 푸시.

## 5. GitHub 정보 (푸시는 0-2 규칙대로 금지)
- 운영 저장소: `ziewise/daengdabang`. **main에 푸시하면 운영 배포**(Cloudflare/GitHub Pages).
- 백업 저장소: `ziewisemin/daengdabang`
- 사용자 PC 설정: `origin`의 fetch는 ziewise, push는 ziewise와 ziewisemin 두 곳(백업 거부는 정상). SSH 별칭 `github-ziewise` → github.com, 키 `id_ed25519_ziewise`.
- 사용자 PC 배포 명령(참고): `git push origin feat/product-color-variant:main` — **시안 브랜치에는 쓰지 않는다.**
- 커밋 작성자: `smlee` / `smlee@ziewise.com`

### 서버용 SSH 키 (필요해질 때, 사용자와 함께)
사용자 PC의 키 파일은 옮기지 않는다. **서버용 키를 새로 만들어 저장소 전용 키(Deploy key)로 등록**한다.
1. 서버에서 새 키 만들기(기존 키·협업자 키는 건드리지 않음):
   `ssh-keygen -t ed25519 -C "ddb-server-mockup" -f %USERPROFILE%\.ssh\id_ed25519_ddb_server`
2. `%USERPROFILE%\.ssh\config`에 **추가만**:
   ```
   Host github-ddb-server
     HostName github.com
     User git
     IdentityFile ~/.ssh/id_ed25519_ddb_server
     IdentitiesOnly yes
   ```
3. **사용자가 직접** GitHub `ziewise/daengdabang` → Settings → Deploy keys에 공개 키(`.pub`)를 넣고 쓰기 권한을 체크한다. Claude는 공개 키 내용만 보여 준다. **비밀 키는 화면·문서에 절대 내지 않는다.**
4. 연결 시험만: `ssh -T git@github-ddb-server`
5. 푸시가 허락되면 시안 폴더의 push 주소를 `git@github-ddb-server:ziewise/daengdabang.git`로 바꾼다(사용자 지시 후).
- 서버에 있는 협업자 키·토큰 파일은 쓰지 않는다.

---

## 검증 (로컬, 2026-10-15)

- 각 단계마다 TypeScript(`tsc --noEmit`) · ESLint 통과, 휴대폰 폭(375px) 미리보기로 화면·동작 확인 후 로컬 브랜치에 커밋.
- 시안 브랜치를 GitHub main과 대조: 바뀐 협업자 파일은 6장의 9개뿐. `lib` · `hooks` · API 경로 · `scripts` · `capacitor.config` · `android` · `ios` · `next.config` · `package.json` · `.github` 변경 없음.
- 번들(`daengdabang-sticker-mockup.bundle`)을 임시 clone에 풀어 시안 브랜치·인계 문서·스크립트가 정상으로 들어오는 것 확인.
- 미검증: 서버 환경에서의 설치·실행, 실제 APK 안에서의 동작.

## 6. 협업자 파일을 고친 곳 (UI 연결용 최소 수정, 9개)
| 파일 | 고친 내용 |
|---|---|
| `components/site/ConditionalChrome.tsx` | 앱 모드(네이티브 앱 · 설치 앱)면 웹 상단바·푸터 대신 `AppShell`. 앱에서 웹 로그인 주소로 오면 앱 틀만(앱 로그인으로 보냄). 브라우저의 `/app`은 협업자 규칙(웹 상단바만) 그대로 |
| `components/site/ChatWidget.tsx` | 선택 prop `empty`(대화가 비어 있을 때 첫 화면) 자리만 추가. 넘기지 않으면(웹) 기존과 같음. 첫 화면의 예시 질문은 상담 창의 `ask`(같은 질문 보내기)를 그대로 부름 |
| `components/growth/LocalCareFinder.tsx` | 종류·장소 타입과 목록·지도 링크 함수 내보내기 |
| `components/growth/GrowthHub.tsx` | `GUEST_STEPS` · `hasShareableAiRecord` 내보내기 |
| `components/growth/GrowthPolicySummary.tsx` | `POLICIES` 내보내기 |
| `components/growth/GrowthShareCard.tsx` | `copyText` 내보내기 |
| `components/growth/CommerceCommunityExpansion.tsx` | `EXPANSION_CARDS` 내보내기 |
| `app/treasure-mine/page.tsx` | 앱에서는 새 앱 화면(`components/daily-life/DailyLifeSwitch`), 웹에서는 기존 `GrowthHub` 그대로 |
| `components/home/IntroSplash.tsx` | 앱 모드에서는 인트로 영상 없이 바로 시작 |

### 앱 모드 판별 범위 (협의 필요)
"앱으로 볼 때" = ① 네이티브 앱 ② 홈 화면 설치 웹앱 ③ **브라우저에서 `/app/` 주소에 한 번 들어온 뒤의 같은 탭**(sessionStorage). ③ 때문에 배포 후에는 운영 웹의 `/app/`(앱처럼 열기 안내)로 들어온 웹 방문자에게도 그 탭에서 앱 틀이 보인다. 기능 변경은 아니지만 협업자와 범위를 정해야 한다.

### 원칙 맞춤 (2026-10-16): 버튼은 GitHub와 같은 기능을 부른다
- **케어톡**: 앱 전용 서랍(`CareTalkDrawer` + 예전 `ChatPageClient`)을 없애고, 협업자 전역 상담 창 `ChatWidget`을 그대로 띄운다. 상단바 버튼은 웹 상단바와 같은 `openChatWidget()`, `/chat` 링크는 가로채지 않고 협업자 `/chat`(ChatLaunchClient)이 창을 연다. 앱은 창 자리(탭바 위)만 정한다. `ChatPageClient`는 GitHub 원본으로 되돌렸다. 겉모양은 `AppShell` CSS(`html.ddb-app-mode section[aria-label="댕다방 케어톡"] …`)로만 스티커북에 맞췄다(점 무늬 속지 · 케어톡 캐릭터 이름표 · 메모지 말풍선 · 분홍 보내기 스티커, 노트 줄 제거, 영문 꼬리표 숨김). 글꼴 전환 버튼 · 문구 · 대화 기능은 협업자 것 그대로. 크기는 상단바~탭바 사이 고정. 고도화: 왼쪽 링 구멍, 제목 마스킹테이프, 답변 옆 작은 캐릭터, 안내 상자 메모지색, 사진 첨부 스티커, 첫 화면(캐릭터 · 인사 · 예시 질문 4개 — `AppShell`의 `CareEmpty`).
- **쇼핑 히어로 견종 배지**: 연구소 탭으로 이동(사용자 결정). 경로만 넘기는 것이라 협업자 기능과 충돌 없음 — 연구소의 사진·외형 / 행동·소리 분석이 웹 펫렌즈 창과 같은 `/pet-lens` 화면으로 이어진다.
- **앱 모드 판별**: 배포에서는 네이티브 앱 · 설치 앱만. 브라우저 `/app`은 협업자 규칙 그대로. 개발 서버에서만 시안 확인용 규칙.
- 링크 목적지가 GitHub와 다른 곳은 사용자가 정한 "같은 기능의 앱 전용 화면"뿐이다: 앱 로그인 · 회원가입(같은 함수), 회원 전용 화면의 비회원 → 앱 로그인, 주간 리포트 → 앱 리포트 화면(데이터 연결은 4-1 목록), 히어로 견종 배지 → 연구소.

## 7. 운영 서버와 주고받는 곳 (모두 읽기 전용)
- 댕자랑 공개 피드 읽기(`components/pwa/home-concepts/show-feed.ts`, `GET /api/v1/showcase/posts`) — 쓰기·응원·신고는 서버로 보내지 않는다.
- 협업자 기능을 그대로 불러 쓰는 곳: 히어로 날씨(Open-Meteo), 상품 재고 조회, 추천 엔진(회원일 때), 로그인·회원가입(웹과 같은 함수).
- 그 밖에 서버에 무언가를 보내거나 바꾸는 코드는 없다. **새로 만들지 않는다.**

## 8. 이미지 넣는 법
사용자가 만든 투명 PNG(보통 1254px)를 `public/images/<이름>.png`에 둔다.
- 일반 스티커·카드 그림: `python tools/sticker-assets/sticker_icon_webp.py public/images public/images/ui/stickers <원본.png> <결과.webp>` → 384px webp(떨어진 잡티 제거)
- 탭바 아이콘: `tools/sticker-assets/tab_icon_webp.py`(192px, 파일 이름 매핑은 스크립트 안)
- 원본 PNG와 webp를 함께 커밋한다.

## 9. 운영 유지 및 이전 인계 — 서버 환경 메모 (읽기 전용으로 확인한 사실)
- 공유 `\\192.168.50.103\ddbcode` = 서버 `C:\DaengDaBang`(코드 작업 폴더), `\\192.168.50.103\ddb` = 데이터 폴더(생성물 · 상품 미디어 · API DB · 모델).
- 협업자 저장소 원본: `C:\DaengDaBang\.codex\storefront-remote-audit-20260827`. 작업마다 새 작업 공간(worktree)을 만들어 작업하고 main에 푸시한다(25개쯤 쌓여 있음).
- APK는 GitHub 코드로 빌드한다(`npm run native:sync` → `native/www` → Android). 앱 안에 넣지 않은 화면(쇼핑 등)은 앱에서 운영 사이트를 불러온다. 서버의 테스트 APK는 8월 말 것(`\\…\ddb\outputs\mobile_app_release`, `apk-test`).
