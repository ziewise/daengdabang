# 웹 속도 — 협업자 쪽(상품 자료 · 상담 기능) 할 일 (2026-10-25, READY)

> 웹 화면 쪽에서 할 수 있는 속도 개선은 우리가 끝냈다(아래 "이미 한 것").
> 남은 큰 덩어리는 **상품 자료 만드는 과정**과 **AI 상담 코드** 안에 있어서, 기능 · 자료 담당인 협업자가 고쳐야 한다.
> 측정: 배포용 빌드(`npm run build` → `out/`)를 압축해서 내보내는 서버로 띄우고, 휴대폰 조건(390폭 · 느린 4G · CPU 4배 느림)으로 처음 방문했을 때를 쟀다.

---

## 이미 한 것 (우리 · 로컬 브랜치 `local/sticker-mockup`)

| 항목 | 바꾼 곳 | 효과 |
|---|---|---|
| 헤더 로고 · 글자 로고를 원본 PNG(1254px · 1.7MB) 대신 같은 그림을 줄인 webp로 | `components/header/BrandLogo.tsx` 외 3곳, 새 파일 `public/images/brand/logo-black-poodle-v2-240.webp` · `wordmark-360.webp` (원본 PNG는 그대로 둠, 앱 묶음 폴더 `images/brand` 안이라 앱도 기기 안에서 읽음) | 모든 페이지 −1.6MB |
| 헤더 검색창을 처음 열 때 불러오기 | `components/header/Header.tsx` (`next/dynamic`, 앱 AppShell 과 같은 방식) | 검색창이 끌고 오던 상품 자료가 첫 화면에서 빠짐 |
| 상담 창(ChatWidget)을 페이지가 다 열린 뒤 한가할 때 붙이기 · "상담 열기" 요청이 오면 즉시 | `components/site/FloatingDock.tsx` (상담 창 안 코드는 손대지 않음) | 상품 자료(압축 후 약 1MB · 해석 2~3초)가 첫 화면 뒤로 밀림 |
| 모바일 메뉴 본문(3D 그림 20여 장)을 처음 열 때 그리기 | `components/header/MobilePanel.tsx` | 닫힌 메뉴 그림을 미리 받지 않음 |
| 본문 글꼴(원티드 산스 1.26MB)을 기본 · 자주 쓰는 한글 2,350자 · 나머지 한글 세 조각으로 | `app/globals.css` @font-face "Wanted Sans DDB", `public/fonts/wanted/*` (원본 그대로 둠) | 보통 페이지 약 360KB만 받음(−0.9MB) |

---

## 협업자 할 일

### 1. 상품 자료 덩어리(화면 코드 6.5MB)를 화면에 필요한 값만으로 줄이기 — 가장 큼

- **지금**: 상품을 보여 주는 페이지(메인 · 쇼핑 · 상품 상세 등 545곳)는 `lib/catalog` 를 불러오면서 아래 파일이 **전부 화면 코드에 들어간다**.

  | 파일 | 크기 | 들어오는 길 |
  |---|---|---|
  | `lib/catalog/reviewed-ziewcraft-delegated-videos.json` | 4.3MB | `lib/pet-tryon-eligibility.ts` → `lib/catalog/data.ts` |
  | `lib/catalog/raw.json` | 1.5MB | `data.ts` (상세 이미지 목록 · 공급사 상세 글 · 외부 후기 원문까지 포함) |
  | `lib/catalog/reviewed-hover-overrides.json` | 1.1MB | `reviewed-hover-overrides.ts` → `data.ts` |
  | `lib/catalog/inventory.generated.json` | 424KB | `data.ts` |
  | `lib/catalog/reviewed-flow-videos.json` | 364KB | `pet-tryon-eligibility.ts` |
  | `lib/catalog/colors.json` | 271KB | `data.ts` |

  → 압축해도 약 950KB, 휴대폰에서 해석만 2~3초.
- **제안**: 빌드 전에 스크립트로 "화면용 가벼운 상품 자료"를 미리 만들어 쓰기.
  - 영상 검수 기록은 **결과(이 상품 영상을 보여도 되는지 · 주소 · 자르기 값)만** 남기고 검수 과정 기록은 빼기
  - 목록 · 카드에는 필요 없는 큰 값(`details` · `supplierDetailImages` · `supplierDetailText` · `detailImageLabels` · `externalReviewSnippets`)은 **상품 상세에서만** 따로 불러오기
  - 예상: 6.5MB → 1MB 안팎

### 2. 색상 칩이 원본 상세 사진을 그대로 씀 — 상품 상세에서 큼

- **지금**: `lib/catalog/colors.json` 에서 공급사 상품 **144개 · 칩 524개**가 `chip` 과 `file` 이 같은 원본 상세 사진(장당 약 250KB, 500×500 이상)이다.
  지름 40px 칩을 그리려고 색상 9개 상품이면 칩에만 약 2MB를 받는다.
- **제안**: `scripts/build-colors.py` 처럼 칩용 작은 webp(예: 120px · 표시 크기 ×3)를 만들어 `chip` 에 넣기. 큰 사진(`file`)은 칩을 눌렀을 때만 쓰이므로 그대로 두어도 됨.

### 3. AI 상담 코드가 상품 자료 전체를 바로 불러옴

- **지금**: `components/site/ChatWidget.tsx` → `lib/daengdabang-llm.ts` (2번째 줄 `import { CATALOG, applySort, getBestProducts, searchCatalog } from "@/lib/catalog"`).
  상담 창을 띄우기만 해도 상품 자료 전체가 따라온다. 우리는 겉틀(FloatingDock)에서 붙이는 때만 늦췄다.
- **제안**: `daengdabang-llm.ts` 안에서 상품을 찾는 순간에 `await import("@/lib/catalog")` 로 불러오기(질문을 보낼 때만).
  상담 관련 테스트가 `ChatWidget.tsx` 글자를 직접 확인하므로(`answerShopQuestionSmart(questionForAnswer` 등) 테스트도 같이 손봐야 한다.

---

## 확인 방법

```bash
npm run build
```
- `out/_next/static/chunks/` 에서 가장 큰 `.js` 크기, 그리고 그 파일을 쓰는 페이지 수: `out` 안에서 `grep -rl <파일이름> --include=index.html . | wc -l`
- 상품 상세 한 곳을 열고 개발자 도구 Network → Img 로 칩 그림 크기 확인
