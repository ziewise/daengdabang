# 댕다방 (Daengdabang)

> 강아지 큐레이션 쇼핑몰 — AI 펫렌즈로 견종·체형을 분석해 우리 댕댕이에게 맞춤 추천.

- **운영 URL**: https://www.daengdabang.com
- **저장소**: https://github.com/ziewise/daengdabang
- **기술 스택**: Next.js 16 (정적 export) + TypeScript + Tailwind v4 + GitHub Pages

---

## 목차

1. [한눈에 보기](#1-한눈에-보기)
2. [빠른 시작 (협업자용)](#2-빠른-시작-협업자용)
3. [전체 폴더 구조](#3-전체-폴더-구조)
4. [폴더별 상세](#4-폴더별-상세)
5. [핵심 파일 가이드](#5-핵심-파일-가이드)
6. [작업 가이드](#6-작업-가이드)
7. [스크립트 (npm 명령어)](#7-스크립트-npm-명령어)
8. [배포·운영](#8-배포운영)
9. [FAQ](#9-faq)

---

## 1. 한눈에 보기

```
[사용자] → https://www.daengdabang.com
              ↓
         Cloudflare CDN (proxy + DNS + SSL)
              ↓
         GitHub Pages (정적 호스팅)
              ↑
         GitHub Actions (자동 빌드)
              ↑
         ziewise/daengdabang (main 브랜치)
              ↑
         git push (협업자 작업물)
```

### 주요 기능

| 영역 | URL | 설명 |
|---|---|---|
| 메인 | `/`, `/main` | 히어로 + 베스트 + 신상품 + 추천 + 기획전 |
| 전체 상품 | `/products` | 333개 상품 + 정렬 + 검색 |
| 베스트 | `/best` | 30개 베스트 (실시간/일간/주간/월간) |
| 신상품 | `/new` | 2026 신상품 18개 |
| 카테고리 | `/category/[slug]` | 5개 그룹 + 서브 필터 |
| 브랜드 | `/brand/[slug]` | 32개 브랜드별 |
| 기타 브랜드 | `/brands` | 12개 기타 브랜드 한 페이지 |
| 기획전 | `/promo/[slug]` | 5개 기획전 |
| **상품 상세** | `/product/[folder]` | 갤러리·정보·상세·리뷰·Q&A |
| 마이페이지 | `/mypage/*` | 펫 프로필·주문·찜·리뷰 등 |
| 펫렌즈 | `/petlens` | AI 견종 분석 (모달) |

### 데이터 흐름 (단순화)

```
data/product_list.xlsx       ← 사람이 보는 사양 (333개 상품 + 12 cats + 가이드)
                              ↓
public/images/products/catalog/{folder}/  ← 이미지 자산
                              ↓
              npm run sync-images (자동)
                              ↓
              lib/catalog.json    ← 모든 페이지의 단일 데이터 출처
                              ↓
              모든 컴포넌트가 여기서 데이터 가져옴
```

---

## 2. 빠른 시작 (협업자용)

### 필요한 도구 (PC 한 번만)

| 도구 | 다운로드 |
|---|---|
| **Git** | https://git-scm.com |
| **Node.js 20+** | https://nodejs.org |
| (선택) **GitHub Desktop** | https://desktop.github.com — 마우스 기반 git |
| (선택) **VS Code** | https://code.visualstudio.com |

### 처음 받기

```bash
# 1. 저장소 복제
git clone https://github.com/ziewise/daengdabang.git Daengdabang_Shop
cd Daengdabang_Shop

# 2. 의존성 설치 (한 번만)
npm install

# 3. 개발 서버 실행
npm run dev
```

→ 약 1~2분 후 http://localhost:4000 에서 사이트 확인 가능.

### 매번 작업 흐름

```bash
git pull              # 최신 받기 (작업 시작 전 항상)
# ... 파일 작업 ...
git status            # 변경 확인
git add .             # 변경 추가
git commit -m "..."   # 커밋 (변경 내용 한 줄)
git push              # GitHub에 올리기 (1~2분 후 사이트 반영)
```

---

## 3. 전체 폴더 구조

```
Daengdabang_Shop/
├── app/                         ← Next.js 라우트 (각 페이지)
│   ├── (auth)/                  ← 인증 그룹 — 로그인·회원가입·비밀번호
│   ├── (shop)/                  ← 쇼핑 그룹 — 헤더·푸터 자동 포함
│   │   ├── main/                메인 페이지
│   │   ├── products/            전체 상품
│   │   ├── best/, new/          베스트·신상품
│   │   ├── category/[slug]/     카테고리 동적 라우트
│   │   ├── brand/[slug]/        브랜드 동적 라우트
│   │   ├── brands/              기타 브랜드 통합
│   │   ├── promo/[slug]/        기획전
│   │   ├── product/[slug]/      ★ 상품 상세 페이지
│   │   ├── recommendations/     AI 맞춤 추천
│   │   ├── petlens/             펫렌즈 페이지
│   │   └── mypage/              마이페이지 하위 페이지들
│   ├── globals.css              ← 전역 스타일 (크레파스 테마, Tailwind)
│   ├── layout.tsx               ← 최상위 layout (폰트, html)
│   ├── page.tsx                 ← 인트로 페이지 (`/`)
│   ├── robots.ts                검색 크롤러 정책
│   └── sitemap.ts               sitemap.xml 자동 생성
│
├── components/                  ← 재사용 컴포넌트
│   ├── auth/                    로그인 모달 등
│   ├── chatbot/                 우하단 챗봇 FAB
│   ├── footer/                  Footer
│   ├── header/                  Header, 검색 모달, 모바일 패널
│   ├── layout/                  SidePetDock (PC 좌측 펫 카드)
│   ├── main/                    메인 페이지 섹션들 (Best, NewArrivals, ...)
│   ├── mypage/                  마이페이지 전용
│   ├── petlens/                 펫렌즈 모달 + 분석 단계
│   └── products/                ★ 공용 상품 컴포넌트
│       ├── ProductCard.tsx       카드 (모든 페이지 공통, 영상 호버 지원)
│       ├── ProductListing.tsx    그리드 + 정렬 + 페이지네이션
│       ├── Pagination.tsx
│       ├── PerPageSelector.tsx
│       ├── SortSelector.tsx
│       └── detail/              ★ 상품 상세 전용
│           ├── ProductGallery.tsx     메인 + 썸네일 슬라이더
│           ├── ProductInfo.tsx        가격·옵션·구매 버튼
│           ├── ProductTabs.tsx        상세·리뷰·Q&A 점프 탭
│           └── RelatedProducts.tsx    관련 상품 추천
│
├── lib/                         ← 데이터 + 비즈니스 로직
│   ├── catalog.json             ★ 단일 진실원 (333 상품)
│   ├── catalog.ts               ★ 카탈로그 헬퍼 + 베스트/신상품 함수
│   ├── menu-data.ts             헤더 메가메뉴 데이터
│   ├── recommendations.ts       AI 추천 상품 mock
│   ├── reviews.ts               리뷰 mock
│   ├── grades.ts                회원 등급 시스템
│   ├── mypage-data.ts           마이페이지 mock
│   ├── storage.ts               localStorage 안전 래퍼
│   ├── types.ts                 공통 타입
│   ├── image-compress.ts        이미지 업로드 압축 (펫 사진용)
│   └── petlens-recs.ts          펫렌즈 결과 기반 추천
│
├── hooks/                       ← React hooks
│   ├── useAuth.ts               로그인 상태 (localStorage 기반)
│   └── usePets.ts               펫 프로필 목록
│
├── public/                      ← 정적 자산 (그대로 서빙됨)
│   ├── CNAME                    Custom domain (www.daengdabang.com)
│   ├── fonts/                   Wanted Sans 한글 폰트
│   ├── videos/                  히어로 영상 등
│   └── images/                  ★ 상품 이미지·기타
│       ├── products/catalog/    ★★ 카탈로그 상품 자산 (제품별 폴더)
│       │   └── {folder}/        예: rw_notarock/
│       │       ├── {folder}.png       메인
│       │       ├── 2.png, 3.png...    갤러리
│       │       ├── size.png           사이즈
│       │       ├── video.mp4          영상
│       │       └── details/           상세 본문
│       │           ├── 1.png
│       │           └── 2.png
│       ├── products/best/       (구 메인 페이지 베스트 이미지)
│       ├── products/new/        (구 신상품 이미지)
│       ├── brands/              브랜드 로고
│       ├── promo/               기획전 배너
│       ├── reviews/             리뷰 샘플
│       └── instagram/           Instagram 섹션
│
├── data/                        ← 소스 데이터 (사람이 편집)
│   └── product_list.xlsx        ★ 333 상품 + 12 cats + 작업 가이드 (3 시트)
│
├── scripts/                     ← 자동화 스크립트
│   ├── sync-images.mjs          ★ catalog 자산 폴더 스캔 → catalog.json 자동 갱신
│   ├── generate-product-list.py product_list.xlsx 재생성
│   ├── parse-catalog.py         원본 Excel → catalog.json (초기 셋업용)
│   ├── folder_list.json         파싱된 폴더-상품 매핑 (참조용)
│   └── (...이전 마이그레이션 스크립트들)
│
├── docs/                        ← 의사결정 기록 (역사 추적)
│   ├── 01-카탈로그-분석.md
│   ├── 02-메뉴-구조-검토.md
│   ├── 03-제외-보류-항목.md
│   └── 04-기획전-구성.md
│
├── .github/workflows/           ← GitHub Actions
│   └── deploy.yml               main push → 자동 빌드 → Pages 배포
│
├── next.config.ts               ← Next.js 설정 (output: 'export')
├── tsconfig.json                ← TypeScript 설정
├── package.json                 ← npm scripts + 의존성
├── eslint.config.mjs            ← ESLint
└── README.md                    ← 이 파일
```

---

## 4. 폴더별 상세

### `app/` — 라우트 (각 페이지)

Next.js 16 App Router. **폴더 = URL 경로**.

| 폴더 | URL | 비고 |
|---|---|---|
| `(auth)/login/` | `/login` | 괄호 그룹 — URL 에 포함 X, 로그인 페이지 |
| `(shop)/main/` | `/main` | 메인 페이지, (shop) 그룹은 헤더/푸터 자동 |
| `(shop)/products/` | `/products` | 전체 상품 + ProductsClient 컴포넌트 |
| `(shop)/category/[slug]/` | `/category/outdoor` | 동적 라우트, slug = outdoor/food/life/toy/care |
| `(shop)/product/[slug]/` | `/product/rw_notarock` | 상품 상세, slug = catalog folder |

**파일 규칙:**
- `page.tsx` — 페이지 진입 (서버 컴포넌트)
- `XxxClient.tsx` — 클라이언트 인터랙션
- `layout.tsx` — 해당 그룹/페이지 공통 layout

### `components/` — 재사용 컴포넌트

- **`products/`** — 모든 상품 페이지에서 공통 사용 (카드, 그리드, 정렬, 페이지네이션)
- **`products/detail/`** — 상품 상세 페이지 전용 (갤러리, 정보, 탭, 관련상품)
- **`main/`** — 메인 페이지 섹션 (Best, NewArrivals, Promo, Recommend, ...)
- **`header/, footer/`** — 글로벌 헤더/푸터
- **`petlens/`** — 펫렌즈 AI 분석 모달
- **`chatbot/`** — 우하단 챗봇 FAB

### `lib/` — 데이터 + 헬퍼

**가장 중요한 파일들:**

| 파일 | 역할 |
|---|---|
| **`catalog.json`** | 333개 상품의 raw 데이터. **모든 페이지의 데이터 출처** |
| **`catalog.ts`** | catalog.json 을 가공해서 컴포넌트가 쓸 형태로 제공 + 헬퍼 함수 |
| `menu-data.ts` | 헤더 메가메뉴 (카테고리/브랜드/기획전 링크) |
| `recommendations.ts` | AI 맞춤 추천 mock |
| `storage.ts` | localStorage 안전 래퍼 (펫·로그인 상태) |

### `public/images/products/catalog/` — 상품 이미지

```
public/images/products/catalog/
├── rw_notarock/                  ← 폴더 = folder_name
│   ├── rw_notarock.png           ← 메인 (folder_name + .png)
│   ├── 2.png, 3.png, ...         ← 갤러리
│   ├── size.png                  ← 사이즈 차트 (옵션)
│   ├── video.mp4                 ← 영상 (옵션)
│   └── details/
│       ├── 1.png, 2.png, ...     ← 상세 본문 (긴 세로 이미지)
├── nd_feelgood_c/
│   └── ...
└── (각 제품마다 폴더)
```

**작업자는 이 폴더만 만지면 됩니다.** sync-images 가 catalog.json 알아서 채워줌.

---

## 5. 핵심 파일 가이드

### `lib/catalog.json` (단일 진실원)

333개 상품 raw 데이터. **수동 편집 주의 — image/gallery/details/sizeImage/video 필드는 sync-images가 자동 갱신.**

각 상품 항목:
```json
{
    "no": 12,
    "brandKo": "러프웨어",
    "brandEn": "Ruffwear",
    "name": "러프웨어 리드줄 크래그 강아지 23",
    "priceText": "44,000원",
    "priceNum": 44000,
    "useMain": "산책/외출",
    "useSub": "리드줄",
    "season": "야간/안전",
    "folder": "rw_leash_crag_23",
    "image": "/images/products/catalog/rw_leash_crag_23/rw_leash_crag_23.png",
    "gallery": ["/images/.../2.png", "/images/.../3.png"],
    "details": ["/images/.../details/1.png", "/images/.../details/2.png"],
    "video": "https://..."
}
```

**필드 설명:**
- `no` — 1~333 일련번호
- `folder` — 영문 폴더명 (URL 슬러그 + 이미지 키 통합)
- `image, gallery, details, sizeImage, video` — sync-images 가 자동 채움

### `lib/catalog.ts` (헬퍼)

컴포넌트가 호출하는 함수들:

```ts
// 베스트 상품 (실시간/일간/주간/월간)
getBestProducts(period: "realtime" | "daily" | "weekly" | "monthly"): Product[]

// 신상품
getNewProducts(): Product[]

// 카테고리별
byCategory(slug: CategorySlug): Product[]
bySubcategory(slug: SubcategorySlug): Product[]

// 브랜드별
byBrand(slug: string): Product[]
listBrands(): Brand[]

// 기획전별
byPromo(slug: PromoSlug): Product[]

// 검색
searchCatalog(query: string): Product[]

// 정렬
applySort(list: Product[], key: SortKey): Product[]

// 배지 자동 판단
getBestRank(product): number | null
isNewProduct(product): boolean
```

### `data/product_list.xlsx` (작업자 매뉴얼)

3개 시트:

| 시트 | 행 | 컬럼 | 용도 |
|---|---|---|---|
| **products** | 333 | no, product_name, folder_name, main_image, detail_path, detail_url | 메인 작업 대상 |
| **cats** | 12 | original_no, brand, product_name, folder_name, note | 고양이 (보류) |
| **guide** | 50줄 | 안내 텍스트 | 폴더 구조 + 파일명 규칙 + FAQ |

**클릭 한 번으로 작업 시작 가능** — folder_name 보고, 폴더 열고, 파일 넣기.

### `next.config.ts`

```ts
{
    output: "export",              // 정적 HTML 생성 (GitHub Pages용)
    images: { unoptimized: true }, // next/image 자동 최적화 OFF
    trailingSlash: true,           // URL 끝 / (Pages 호환)
}
```

이 설정으로 `npm run build` 가 `out/` 폴더에 정적 산출. GitHub Actions 가 이걸 Pages 에 배포.

---

## 6. 작업 가이드

### 🎨 작업 1: 상품 이미지 추가/변경

가장 자주 하는 작업입니다.

```
1. product_list.xlsx 의 products 시트에서 folder_name 확인
   예: rw_notarock

2. 폴더 열기:
   public/images/products/catalog/rw_notarock/

3. 파일 추가/교체:
   - 메인 이미지: rw_notarock.png
   - 갤러리:     2.png, 3.png, 4.png, ...
   - 상세 본문:  details/1.png, details/2.png, ...
   - 사이즈:     size.png (옵션)
   - 영상:       video.mp4 (옵션)

4. 확인:
   npm run dev
   → sync-images 자동 실행
   → http://localhost:4000/product/rw_notarock 에서 확인

5. GitHub에 올리기:
   git add .
   git commit -m "feat: rw_notarock 상세 이미지 5장 추가"
   git push

6. 1~2분 후 https://www.daengdabang.com/product/rw_notarock 반영
```

### 💰 작업 2: 가격 변경

**옵션 A: 수동 (한두 개)**
1. `lib/catalog.json` 열기
2. 해당 `no` 항목 찾기
3. `priceNum` (숫자) 수정
4. `priceText` ("44,000원" 형태) 같이 수정
5. commit + push

**옵션 B: 일괄 변경 (RPA/스크립트로)**
- scripts 폴더에 가격 업데이트 스크립트 추가
- 외부 데이터 → catalog.json 자동 반영

### 🆕 작업 3: 신규 상품 등록

1. **lib/catalog.json** 에 새 항목 추가 (no=334 부터)
2. **product_list.xlsx** 의 products 시트에 행 추가
3. **이미지 폴더 생성**: `public/images/products/catalog/{새folder}/`
4. `npm run dev` → 자동 반영

또는 대량 등록:
```bash
python scripts/generate-product-list.py   # Excel 재생성
```

### 🏆 작업 4: 베스트 순위 변경

`lib/catalog.ts` 의 `BEST_RANKS` 배열 편집:

```ts
const BEST_RANKS = [
    { rank: 1,  no: 31  },  // 새 1위로 바꿀 상품의 no
    { rank: 2,  no: 32  },
    ...
];
```

→ 메인 페이지 + /best 페이지 동시 반영.

### 🆕 작업 5: 신상품 큐레이션 변경

`lib/catalog.ts` 의 `NEW_PRODUCT_NOS` 배열 편집:

```ts
const NEW_PRODUCT_NOS = [23, 1, 2, 24, 25, ...];  // catalog no 순서
```

### 📁 작업 6: 카테고리 메뉴 변경

`lib/menu-data.ts` 의 `CATEGORY_GROUPS` 편집.

### 🎨 작업 7: 디자인 색상 변경

`app/globals.css` 의 `:root` CSS 변수:

```css
:root {
    --aurora-blue:   #4F8FF6;
    --aurora-indigo: #7679EE;
    --aurora-pink:   #F058A6;
    ...
}
```

→ 사이트 전체 컬러 일관 변경.

---

## 7. 스크립트 (npm 명령어)

### 일상 명령어

```bash
npm run dev          # 개발 서버 (http://localhost:4000)
                     # predev 훅 → sync-images 자동 실행
npm run build        # 프로덕션 빌드 (out/ 폴더)
                     # prebuild 훅 → sync-images 자동 실행
npm run sync-images  # 자산 폴더 → catalog.json 수동 동기화
```

### 데이터 셋업 명령어 (드물게 사용)

```bash
# product_list.xlsx 재생성 (catalog.json 기준)
python scripts/generate-product-list.py

# 원본 Excel → catalog.json 재생성 (대규모 변경 시)
python scripts/parse-catalog.py
```

### sync-images.mjs 가 하는 일

```
public/images/products/catalog/{folder}/ 스캔
  ↓
파일 발견 시 catalog.json 자동 갱신:
  - {folder}.png      → image
  - 2.png, 3.png, ... → gallery[]
  - size.png          → sizeImage
  - video.mp4         → video (외부 URL 있으면 보존)
  - details/1.png ... → details[]
```

**작업자는 의식할 필요 없음** — npm run dev/build 시 자동 실행.

---

## 8. 배포·운영

### 자동 배포 흐름

```
git push origin main
   ↓
GitHub Actions (.github/workflows/deploy.yml)
   ↓ (1~2분)
npm ci                         # 의존성 설치
npm run build                  # prebuild → sync-images → build
   ↓
out/ 폴더를 GitHub Pages 에 업로드
   ↓
ziewise.github.io/daengdabang  (또는 www.daengdabang.com)
   ↓
Cloudflare CDN 통해 사용자에게 응답
```

### DNS 구조 (Cloudflare)

```
Cloudflare DNS:
- www.daengdabang.com → CNAME → ziewise.github.io (proxied)
- daengdabang.com → A 4개 → 185.199.108~111.153 (GitHub Pages IP, proxied)
- admin.daengdabang.com → CNAME → daengdabang-console.pages.dev (별도 관리자)
```

### 운영 모니터링

| 항목 | 위치 |
|---|---|
| 빌드 로그 | https://github.com/ziewise/daengdabang/actions |
| 배포 상태 | https://github.com/ziewise/daengdabang/deployments |
| Pages 설정 | https://github.com/ziewise/daengdabang/settings/pages |
| Cloudflare DNS | https://dash.cloudflare.com → daengdabang.com |

---

## 9. FAQ

### Q. 협업자가 새로 들어오면?

1. GitHub `ziewise` org 또는 저장소에 멤버로 초대
2. 협업자가 `git clone` 후 `npm install`
3. README 안내 따라 작업

### Q. 작업 시 충돌 방지는?

**항상 `git pull` 먼저, 그다음 `git push`.** 다른 사람과 같은 파일 수정하면 충돌 알림 → 협의 후 해결.

### Q. catalog.json 직접 수정해도 되나?

- 이름·가격·브랜드·카테고리 등 메타데이터: 수동 편집 OK
- image/gallery/details/sizeImage/video 필드: sync-images 가 자동 덮어쓰니 수동 편집 의미 없음. 이미지 파일을 폴더에 넣으면 자동 갱신.

### Q. 이미지 추가했는데 사이트에 안 보임

체크리스트:
1. 파일명 맞나? (folder_name 정확히, 대소문자, 확장자)
2. `npm run sync-images` 실행됐나? (catalog.json 갱신됐는지)
3. git push 했나?
4. GitHub Actions 빌드 성공했나? (Actions 탭)
5. 1~2분 기다렸나?
6. 브라우저 캐시? (Ctrl+F5)

### Q. 사이트 로컬에서만 잘 보이고 GitHub Pages 에서 안 보임

`npm run build` 가 로컬에서 성공하는지 확인. 실패하면 GitHub Actions 도 실패함.

### Q. 이미지 파일 크기는?

**1MB 이하 권장**. 너무 크면 사이트 느려짐. PNG 압축 도구 추천:
- TinyPNG: https://tinypng.com
- Squoosh: https://squoosh.app

### Q. 영상 호버 효과 추가하려면?

해당 상품 폴더에 `video.mp4` 넣기. 사이트 모든 카드에서 호버 시 자동 재생. mp4 + h.264 권장 (모바일 호환).

### Q. 백엔드/DB 는?

현재 없음 (정적 사이트). 향후 도입 시 옵션:
- Cloudflare Workers + D1
- Supabase
- Firebase
- Next.js API routes (정적 export 해제 필요)

### Q. 결제/회원가입 같은 동적 기능은?

현재 데모용 mock. 실 운영 시 백엔드 + 결제 PG사 (토스페이먼츠 등) 연동 필요.

### Q. 펫렌즈 AI 는 실제 동작하나?

현재 데모용 (사진 업로드 → 결과 mock). 실 운영 시 외부 AI API (Roboflow / OpenAI Vision / Google Cloud Vision 등) 연동 필요.

---

## 의사결정 기록

세부 결정 이력은 `docs/` 폴더 참조:

- `docs/01-카탈로그-분석.md` — Excel 333 상품 분석
- `docs/02-메뉴-구조-검토.md` — 카테고리 5그룹 확정 과정
- `docs/03-제외-보류-항목.md` — 고양이 12개 제외 결정
- `docs/04-기획전-구성.md` — 5개 기획전 테마 매핑

---

## 문의·이슈

저장소 이슈: https://github.com/ziewise/daengdabang/issues
