# 메인 페이지 복원 작업 내역 (restore/mainpage)

> **작성일**: 2026-06-16
> **브랜치**: `restore/mainpage`
> **기준(base)**: `origin/main` (운영 사이트 최신 운영 버전, commit `cc786f0`)
> **상태**: 미리보기 검토 단계 (⚠ 아직 main 머지 안 함 — 운영 영향 0)

---

## 1. 작업 목적

운영 사이트가 API·RPA·LLM·장바구니·결제 등 **기능을 대폭 추가**하면서 메인 페이지의
구성(섹션 배치·상단 메뉴·배경)이 변경되었다. 이 작업은:

> **"운영 사이트가 만든 기능은 하나도 건드리지 않고(유지),
>  메인 페이지에서 보이는 것(섹션·메뉴·푸터·배경)만 원래 초기 구성으로 되돌린다."**

한 문장 비유: **자동차 엔진(운영 사이트 기능)은 그대로 두고, 차체 외관·대시보드(초기 UI)만 교체.**

### 유지한 것 (운영 사이트 — 손대지 않음)
- 동적 히어로 (날씨/시간대/계절 반응 — Open-Meteo API)
- 상품 데이터·CDN 영상·이미지
- 상품 상세 페이지
- 장바구니(`/cart`)·결제(`/checkout`)·번들(`/bundle`)
- 펫렌즈(`/pet-lens`)·챗봇(`/chat` + 우하단 위젯)·LLM(`lib/daengdabang-llm.ts`)
- 소셜 로그인(`/auth/login`)·고객 API
- 전역 스토어(`lib/store.tsx`)

### 교체한 것 (초기 UI)
- 메인 페이지 섹션 구성
- 상단 메뉴(메가메뉴) + 푸터
- 크레파스 배경 + 디자인 토큰 + 폰트
- AI 메뉴 신설 (펫렌즈/챗봇 진입점)

---

## 2. 안전 장치 (작업 전 구축)

| 장치 | 내용 | 복구 방법 |
|------|------|-----------|
| **backup tag** | `backup/before-mainpage-restore` (운영 시점 `cc786f0` 박제) | `git reset --hard backup/before-mainpage-restore` |
| **별도 브랜치** | `restore/mainpage` — main 안 건드림 | 브랜치 폐기하면 운영 영향 0 |
| **미리보기** | Cloudflare Pages 가 브랜치별 자동 미리보기 URL 발급 | 운영(daengdabang.com)과 별개 URL |
| **이중 저장소** | ziewise + ziewisemin 양쪽에 push | 한쪽 문제 시 다른 쪽에서 복구 |

> **머지 전까지 운영 사이트는 100% 그대로다.** 미리보기 URL 에서만 새 구성이 보인다.

---

## 3. Phase 0 — 사전 충돌 분석 (코드 변경 없음)

작업 전, 운영 사이트 코드와 초기 코드가 충돌하는지 분석했다. 결과:

### 호환되는 것 (좋은 소식)
- `lib/catalog` 모듈: 운영 사이트가 **초기에 분리한 구조를 그대로 이어받음**.
  export 함수·타입(byCategory, byBrand, byPromo, bySubcategory, getBestProducts,
  formatKRW, CategorySlug, SubcategorySlug 등)이 **100% 동일**.
  → 초기 메인 섹션이 운영 사이트 데이터를 그대로 사용 가능.
- 카테고리/서브카테고리/기획전 슬러그 체계 동일 (outdoor, harness, active 등).
- `lib/menu-data.ts` (메뉴 구조): 운영 사이트가 **안 건드림** → 초기 메뉴 그대로 보존.
- 초기 헤더(`components/header/`)·푸터(`components/footer/`): 운영 사이트 버전에도 남아있음.
- ProductCard props (product, rank, showNewBadge, rankStyle, sizeClass) 동일.

### 차이가 있어 작업이 필요했던 것
- 메인 페이지 entry 가 다름: 초기 `app/(shop)/main/page.tsx` vs 운영 사이트 `app/page.tsx`.
- 초기 메인 섹션 `.tsx` 8개를 운영 사이트가 **삭제**함 (CSS 모듈만 남김) → 복원 필요.
- 레이아웃이 운영 사이트 헤더/푸터(`components/site/`)를 마운트 → 초기 것으로 교체 필요.
- `globals.css` 를 운영 사이트가 대폭 변경 → 크레파스 배경 병합 필요.

### 운영 사이트가 변경한 규모 (참고)
- 코드 파일 119개 + 이미지·영상 포함 2,764개 파일.
- 라우트 평면화: `app/(shop)/main` → `app/main`, `app/(shop)/best` → `app/best` 등.
- 신규 기능: cart, checkout, bundle, chat, social, campaign, pet-lens 등.

---

## 4. Phase 1 — 브랜치 + 백업 (commit 없음, git 작업)

```bash
# 1) 운영 시점 박제
git tag backup/before-mainpage-restore origin/main
git push origin backup/before-mainpage-restore

# 2) 운영 사이트 최신(origin/main) 기준으로 작업 브랜치 생성
git checkout -b restore/mainpage origin/main
```

- **반드시 `origin/main` 기준으로 브랜치를 떴다.** 그래야 운영 사이트 기능이 전부 포함된
  상태에서 그 위에 초기 UI만 얹는다. (초기 로컬 기준으로 뜨면 운영 사이트 작업이 날아간다.)

---

## 5. Phase 2 — 메인 페이지 섹션 (commit `05d0636`)

메인 페이지의 entry 파일(`app/page.tsx`)을 초기 구성으로 재작성하고, 운영 사이트가
삭제했던 초기 섹션 컴포넌트 7개를 되살려 연결했다.

### 5-1. `app/page.tsx` — 메인 페이지 골격 재작성

운영 사이트 버전은 `IntroSplash → HeroSection → 카테고리타일 → SpecialBundles →
인기상품 → 펫렌즈CTA → 신상품 → 카테고리바로가기` 였다.
이것을 아래처럼 **히어로(운영 사이트 동적) + 초기 7개 섹션**으로 다시 짰다.

```tsx
const heroProducts = getBestProducts(4);   // 운영 사이트 히어로에 넘길 추천 4개

<IntroSplash />          ← [운영 사이트 유지] 인트로 스플래시 애니메이션
<HeroSection            ← [운영 사이트 유지] 날씨/시간/계절 반응 동적 히어로
   featuredProducts={heroProducts} />        featuredProducts 로 베스트 4개 전달
<RecommendSection />     ← [초기] 로그인 회원 맞춤 추천
<BestSection />          ← [초기] 베스트 4탭 × 4상품
<BrandSlider />          ← [초기] 대표 브랜드 슬라이더
<PromoSection />         ← [초기] 기획전
<NewArrivalsSection />   ← [초기] 신상품 캐러셀
<ReviewSection />        ← [초기] 리뷰 갤러리
<InstaSection />         ← [초기] 인스타그램 그리드
```

> 히어로만 운영 사이트 것을 그대로 두어 **날씨/시간/계절 동적 기능을 보존**했고,
> 그 아래 7개 섹션을 초기 구성으로 바꿨다.

### 5-2. 각 섹션이 무엇을·어떻게 (히어로 아래 순서대로)

각 섹션은 운영 사이트가 삭제했던 파일이라 초기 마지막 버전(`ziewisemin/main`)에서
`git checkout ziewisemin/main -- <파일>` 으로 되살렸다. 데이터는 모두 운영 사이트
`lib/catalog` 에서 가져온다 (외부 리뷰·CDN 영상 통합된 버전).

#### ① RecommendSection — 로그인 회원 맞춤 추천
- **파일**: `components/main/RecommendSection.tsx`
- **표시 조건**: 로그인 + 등록된 펫이 있을 때만 노출. **비로그인 시 섹션 자체가 안 보임**
  (`if (!hydrated || !isLoggedIn) return null`).
- **내용**: 펫렌즈 분석 기반 추천 상품 6개를 카드로 미리보기.
- **데이터**: `topRecommendations()` (`lib/recommendations`), 로그인/펫 상태는
  `useAuth`·`usePets` 훅, 없으면 `petsOrMock` 으로 데모 fallback.
- **링크**: "전체 보기" → `/recommendations`
- → 사용자가 강조한 *"로그인하면 등록한 펫에 따라 자동 추가되는 섹션"* 이 바로 이것.

#### ② BestSection — 베스트 (4탭 × 4상품)
- **파일**: `components/main/BestSection.tsx`
- **내용**: 실시간/일간/주간/월간 4개 탭, 각 탭마다 상품 4개. 탭 클릭 시 전환.
- **데이터**: `getBestProducts(period)` (`lib/catalog`).
  현재는 영상 있는 상품 우선 노출(`.filter(p => p.video)`), 4개 미만이면 일반 베스트로 채움.
- **카드**: 공용 `ProductCard` — 영상 호버·BEST 배지·순위(1~4) 자동.
- **링크**: "베스트 상품 보기" → `/best`
- **호환 수정**: 초기 코드는 `getBestProducts()` 가 `rank` 포함 배열을 반환한다고
  가정했으나, 운영 사이트 버전은 `rank` 없는 `CatalogProduct[]` 반환 →
  `rank={p.rank}` 를 `map((p, index) => rank={index + 1})` 로 변경(섹션 내 1~4위 부여).

#### ③ BrandSlider — 대표 브랜드 슬라이더
- **파일**: `components/main/BrandSlider.tsx`
- **내용**: Ruffwear / Rex Specs 4개 슬라이드(브랜드당 2장), **4.5초마다 자동 전환**.
  브랜드명·태그라인·"브랜드 둘러보기" 버튼이 슬라이드에 동기화. dot 클릭 시 자동전환
  일시정지 후 5초 뒤 재개.
- **링크**: "브랜드 둘러보기" → `/brand/ruffwear`, `/brand/rex-specs`
- (버튼 글자색 가독성 이슈는 Phase 6 에서 별도 수정 — 섹션 6-5 참고)

#### ④ PromoSection — 기획전 (1 featured + 4 small)
- **파일**: `components/main/PromoSection.tsx`
- **내용**: 큰 카드 1개 + 작은 카드 4개. 각 카드 배경 미디어 3종 지원 —
  `video`(mp4 자동재생), `images`(3초 간격 cross-fade), `image`(단일 정적).
  위에 다크 그라데이션 + 타이틀·설명·CTA 오버레이.
- **링크**: 각 기획전 → `/promo/active`, `/promo/rainy`, `/promo/eye`, `/promo/food`, `/promo/seasonal`

#### ⑤ NewArrivalsSection — 신상품 무한 캐러셀
- **파일**: `components/main/NewArrivalsSection.tsx`
- **내용**: 신상품 17~18개를 가로 캐러셀로. 카드 3세트(앞 클론+실제+뒤 클론) 렌더 후
  양 끝에서 silent jump 로 **무한 스크롤 느낌**. 자동 2.8초 간격(hover 시에도 안 멈춤),
  prev/next 버튼은 2.5초 일시정지 후 재개.
- **데이터**: `getNewProducts()` (`lib/catalog`)
- **카드**: 공용 `ProductCard` (영상 호버 자동)
- **링크**: "신상품 더보기" → `/new`

#### ⑥ ReviewSection — 리뷰 갤러리
- **파일**: `components/main/ReviewSection.tsx`
- **내용**: 상단 통계(평점·총 리뷰·추천율) + 포토 리뷰 4개(이미지+텍스트, 큰 카드) +
  간단 리뷰 4개(텍스트만). 텍스트 길면 "더보기" 토글.
- **데이터**: `PHOTO_REVIEWS`, `SIMPLE_REVIEWS`, `REVIEW_STATS` (`lib/reviews`)
- **링크**: "전체 리뷰 보기" → `/reviews`

#### ⑦ InstaSection — 인스타그램 그리드
- **파일**: `components/main/InstaSection.tsx`
- **내용**: 정사각 타일 8장 그리드(모바일 2열 / sm 3열 / lg 4열). hover 시 좋아요·댓글
  카운트 오버레이.

### 5-3. 검증
- 위 섹션들이 의존하는 것(`useAuth`, `usePets`, `lib/recommendations`,
  `lib/reviews`, `ProductCard` props)이 전부 운영 사이트 버전에 존재·호환됨을 확인.
- `npm run build` 성공 (421 페이지 정적 생성).

---

## 6. Phase 3 — 헤더·푸터·배경·폰트·로그인·AI 메뉴

### 6-1. 헤더·푸터·크레파스 배경 (commit `066b0d6`)

| 파일 | 작업 |
|------|------|
| `app/layout.tsx` | 헤더/푸터를 초기 것으로 교체 + 크레파스 배경 div 추가 |
| `app/globals.css` | 초기 디자인 토큰 + 크레파스 배경(.global-aurora) + glass 유틸 병합 (252줄 추가) |

**layout.tsx 변경:**
```
Header: components/site/Header  → components/header/Header  (초기 메가메뉴)
Footer: components/site/Footer  → components/footer/Footer  (초기 푸터)
children 을 <main pt-[var(--header-height)]> 로 감쌈 (fixed 헤더 대응)
<div className="global-aurora" /> 추가 (크레파스 배경 레이어)

유지: StoreProvider(장바구니 스토어), ChatWidget(운영 사이트 챗봇 위젯)
```

**globals.css 병합 방식:**
- 운영 사이트 스타일(surface/btn 등 1263줄)은 **보존** (운영 사이트 페이지가 사용).
- 초기 호환 레이어(디자인 토큰 + 크레파스 배경 + glass)를 **파일 끝에 추가**.
- CSS 캐스케이드상 뒤에 온 초기 정의가 우선 → 초기 톤·배경이 적용.

### 6-2. 폰트 복원 + 로그인/장바구니 연결 (commit `acfd104`)

| 파일 | 작업 |
|------|------|
| `app/layout.tsx` | 초기 글로벌 폰트(Geist, Wanted Sans, Gaegu) 복원 |
| `components/header/Header.tsx` | 로그인 `/login`→`/auth/login`, 장바구니 `#cart`→`/cart` |
| `components/header/MobilePanel.tsx` | 동일 (로그인·장바구니 운영 사이트 라우트로) |

- **폰트 문제**: 운영 사이트 layout 은 `next/font` 미사용(Arial 폴백) → 초기 헤더/로고 폰트 깨짐.
  → 초기 폰트 설정(Geist/Wanted Sans/Gaegu)을 layout 에 추가, html className 에 `--font-*` 변수 주입.
- **로그인**: 초기 옛 `/login` 대신 운영 사이트 소셜 로그인 `/auth/login` 으로 연결.
- **장바구니**: 운영 사이트 `/cart` 페이지로 연결.

### 6-3. 메뉴 폰트 통일 — 근본 해결 (commit `60b8473`, `fc7f11a`)

- **증상**: "베스트·신상품"(a 태그)과 "카테고리·브랜드·기획전·고객센터"(button 태그)의 폰트가 다름.
- **진단**: 로컬 dev 서버 + preview inspect 로 실제 computed 값 측정:
  ```
  베스트(a):    14px / weight 700  (text-sm font-bold 정상)
  카테고리(button): 16px / weight 400  (Tailwind utility 무시됨!)
  ```
- **근본 원인**: 운영 사이트 `globals.css` 의 `button { font: inherit }` shorthand 가
  `font-size`·`font-weight`까지 inherit 로 묶어 Tailwind utility(`text-sm`/`font-bold`)를 무력화.
  (a 태그는 이 규칙 영향 없어 정상)
- **해결**: `font: inherit` → `font-family: inherit` (패밀리만 상속, size/weight 는 Tailwind 제어).
  → 실측 재확인: 베스트·카테고리 모두 14px/700 동일 ✅

> 💡 추측으로 두 번 헛다리(button reset 추가 등) 짚었으나, **preview inspect 로 실제 값을 측정**해 정확히 해결.

### 6-4. AI 메뉴 추가 (commit `f292ef4`)

| 파일 | 작업 |
|------|------|
| `lib/menu-data.ts` | `AI_LINKS` 추가 (펫렌즈 `/pet-lens`, 챗봇 `/chat`) |
| `components/header/Header.tsx` | 기획전·고객센터 사이에 "AI" 메가메뉴 드롭다운 (그라데이션 아이콘) |
| `components/header/MobilePanel.tsx` | 모바일 패널에도 AI 그룹 |

- 상단 메뉴: `베스트 · 신상품 · 카테고리 · 브랜드 · 기획전 · AI · 고객센터`
- AI 드롭다운 하위: **펫렌즈 AI 분석** → `/pet-lens`, **댕다방 챗봇** → `/chat`
- **펫렌즈·챗봇 기능은 운영 사이트 것 그대로 사용** (페이지 링크로 연결).
- 우하단 운영 사이트 챗봇 위젯(ChatWidget)도 상시 노출 유지.

### 6-5. 대표 브랜드 버튼 글자색 가독성 (commit `5c99a9c`, `d848e3e`)

| 파일 | 작업 |
|------|------|
| `components/main/BrandSlider.tsx` | "브랜드 둘러보기" 버튼 글자색 강제 |

- **증상**: 대표 브랜드 슬라이더의 "브랜드 둘러보기" 버튼이 **흰 배경 + 흰 글자**라 내용이 안 보임.
- **1차 시도**(`5c99a9c`): `text-foreground` → `text-neutral-900` 으로 변경. **실패** —
  여전히 흰 글자.
- **진단**(preview inspect 실측): 버튼 `color: rgb(255,255,255)`. `text-neutral-900` 이 적용 안 됨.
- **근본 원인**: 운영 사이트 `globals.css` 의 `a { color: inherit }` (unlayered 규칙)가
  Tailwind `text-neutral-900`(@layer utilities)을 무력화 → a 태그가 부모(`text-white`)
  색을 상속해 흰 글자.
- **해결**(`d848e3e`): `text-neutral-900` → `text-neutral-900!` (Tailwind v4 `!important`).
  `!important` 가 unlayered a 규칙을 이김. + `bg-white` + `shadow-md` 로 대비 강화.
  → 실측 재확인: `color: lab(7.78...)` = neutral-900 검정 ✅

> ⚠ **이것은 6-3(메뉴 폰트)과 동일한 메커니즘이다.**
> 운영 사이트가 `a { color: inherit }`·`button { font: inherit }` 같은 reset 을
> **unlayered(레이어 밖) 로 선언**해서, Tailwind utility(@layer utilities)보다
> 우선순위가 높아진다. 그래서 어두운 배경 위 a/button 의 색·폰트 utility 가 무력화된다.
>
> **향후 같은 증상**(이미지·어두운 배경 위 글자 안 보임)이 또 나오면:
> - 임시: 해당 클래스에 `!` 붙여 강제 (예: `text-neutral-900!`)
> - 근본: `globals.css` 호환 레이어에서 `a { color: inherit }` 를 `@layer base` 로
>   감싸 Tailwind utility 가 정상적으로 이기도록 조정 (전역 1회 수정).

---

## 7. Phase 4 — 라우트·서브카테고리 검증 (코드 변경 없음)

운영 사이트 라우트와 초기 메뉴 링크가 호환되는지 검증. **이미 호환되어 작업 불필요.**

### 검증 결과
- 초기 메뉴 링크 전부 운영 사이트 라우트에 존재:
  `/best /new /products /brands /category /brand /promo /reviews /pet-lens /chat`
- 운영 사이트 페이지가 초기 catalog 함수 그대로 사용:
  - 카테고리: `ProductsClient` 가 `params.get("sub")` 로 서브카테고리 필터 + `bySubcategory`
  - 브랜드: `byBrand(slug)` (초기 brandSlug: ruffwear, rex-specs)
  - 기획전: `byPromo(slug)` (초기 PromoSlug: active, rainy, ...)

### 실측 증명 (preview inspect)
```
/category/outdoor?sub=harness  →  하네스 상품 32개만 정확히 표시
   · 러프웨어 로드 업 차량용 안전 하네스
   · 러프웨어 프런트 레인지 플렉스 하네스(2026)
   · 러프웨어 하네스 플레그라인 경량
```
→ **"상단 메뉴에 맞춘 상품 리스트"가 그대로 동작.** 운영 사이트가 초기 catalog 모듈을
   이어받아서 메뉴-상품 연결이 자동으로 됨.

---

## 7-B. 푸터 사업자 정보 + 고객센터 페이지 (미리보기 검토 중 추가)

미리보기 검토 단계에서 **푸터의 약관·사업자 정보 연결**과 **고객센터 페이지 생성**을 진행했다.

### 7-B-1. 푸터 약관·개인정보 링크 연결 (`lib/menu-data.ts`)
- 초기 푸터의 `FOOTER_LEGAL_LINKS` 가 `#terms`·`#privacy` 앵커(placeholder)였음.
- 운영 사이트가 만든 실제 페이지로 연결: `#terms → /terms`, `#privacy → /privacy`.
- 환불·반품/분쟁해결은 운영 사이트 페이지 미존재 → 앵커 유지.

### 7-B-2. 푸터 사업자 정보 — 단일 출처화 (`components/footer/Footer.tsx`)
- **발견**: 운영 사이트가 `lib/legal.ts` 의 `BUSINESS_INFO`(환경변수 기반)에 회사 정보를
  이미 정의해 둠 (상호 주식회사 포엔치, 대표 박주연, 사업자번호 873-81-03438,
  통신판매업 제2026-성남수정-0227호, 주소, 고객센터 1800-2162, 호스팅 GitHub Pages).
- 초기 푸터는 placeholder(홍길동/000-00-00000 등)를 **하드코딩**하고 있었음.
- **조치**: 하드코딩 제거 → `BUSINESS_INFO` 와 `COPYRIGHT_NOTICE` 를 import 해서 참조.
  - 사업자 정보 8항목·고객센터 전화·카피라이트 모두 단일 출처로 통일.
  - 환경변수(`NEXT_PUBLIC_DDB_*`)만 바꾸면 약관 페이지·푸터가 동시에 갱신됨.

### 7-B-3. 고객센터 메뉴 정리 (`lib/menu-data.ts` — `CS_LINKS`)
- "배송 조회" 메뉴를 고객센터에서 **제거** (배송 조회는 `/mypage` 주문 내역에서만 제공).
- 나머지 4개 메뉴를 실제 페이지로 연결 + 1:1 문의 아이콘을 메일(`fa-envelope`)로 변경.

| 메뉴 | 이전 | 이후 |
|------|------|------|
| 공지사항 | `#notice` | `/notice` |
| 자주 묻는 질문 | `#faq` | `/faq` |
| 1:1 문의 | `#inquiry` | `/inquiry` |
| 교환·반품 안내 | `#return` | `/return` |

### 7-B-4. 고객센터 페이지 4개 신규 생성
약관 페이지(`app/terms`)와 동일한 레이아웃 톤(max-w-960, 라벨+h1, 카드/섹션)으로,
초기 디자인 토큰(aurora·glass·크레파스 배경)에 맞춰 작성.

| 파일 | 페이지 | 내용 |
|------|--------|------|
| `app/notice/page.tsx` | 공지사항 | 공지 카드 목록 (태그·날짜·본문, 현재 mock 3건) |
| `app/faq/page.tsx` + `app/faq/FaqClient.tsx` | 자주 묻는 질문 | 카테고리별 Q&A 아코디언 (client, 한 번에 하나 열림, 7문항) |
| `app/inquiry/page.tsx` | 1:1 문의 | 이메일(mailto)·전화 2카드 + FAQ/마이페이지/교환반품 안내. **백엔드 폼이 아닌 mailto 방식** (정적 사이트) |
| `app/return/page.tsx` | 교환·반품 안내 | 전자상거래법 기준 정책 5개 섹션 (신청기간·가능/제한·배송비·환불) |

> **1:1 문의**: 운영(운영 사이트)에 문의 폼·메일 발송 백엔드가 없어, 클릭 시 메일 앱이 열리는
> `mailto:` 방식으로 구현. 받는 메일은 `BUSINESS_INFO.customerServiceEmail`(미설정 시
> `help@daengdabang.com`).

### 7-B-5. 검증 (preview 실측)
- `/notice` `/faq` `/inquiry` `/return` 모두 200 + h1 정상 렌더.
- 푸터: 상호·대표자·사업자번호·전화·카피라이트 = BUSINESS_INFO 값 표시 확인.
- 고객센터 메뉴에서 "배송 조회" 제거 확인.
- `npm run build` 성공 (425 페이지, 신규 4페이지 포함).

---

## 8. 전체 변경 파일 목록 (한눈에)

| 파일 | Phase | 변경 내용 |
|------|-------|-----------|
| `app/page.tsx` | 2 | 메인 구성을 초기 섹션으로 재작성 |
| `components/main/RecommendSection.tsx` | 2 | 초기 섹션 되살림 — 로그인+펫 추천(topRecommendations), /recommendations |
| `components/main/BestSection.tsx` | 2 | 초기 섹션 되살림 — 베스트 4탭(getBestProducts), rank 호환 수정, /best |
| `components/main/BrandSlider.tsx` | 2,6 | 초기 섹션 되살림 — 브랜드 슬라이더 + 버튼 글자색 !important 수정 |
| `components/main/PromoSection.tsx` | 2 | 초기 섹션 되살림 — 기획전 1+4 카드, /promo/* |
| `components/main/NewArrivalsSection.tsx` | 2 | 초기 섹션 되살림 — 신상품 무한 캐러셀(getNewProducts), /new |
| `components/main/ReviewSection.tsx` | 2 | 초기 섹션 되살림 — 리뷰 갤러리(PHOTO/SIMPLE_REVIEWS), /reviews |
| `components/main/InstaSection.tsx` | 2 | 초기 섹션 되살림 — 인스타그램 8장 그리드 |
| `app/layout.tsx` | 3 | 헤더/푸터를 초기 것으로 교체 + 글로벌 폰트(Geist/WantedSans/Gaegu) 복원 + 크레파스 배경 div |
| `app/globals.css` | 3 | 초기 디자인 토큰·크레파스 배경·glass 유틸 병합(252줄) + button `font:inherit`→`font-family:inherit`(폰트 통일) |
| `components/header/Header.tsx` | 3 | 로그인 `/login`→`/auth/login`, 장바구니 `#cart`→`/cart` + AI 메가메뉴 드롭다운 추가 |
| `components/header/MobilePanel.tsx` | 3 | 모바일 로그인/장바구니 라우트 + AI 그룹 추가 |
| `lib/menu-data.ts` | 3 | `AI_LINKS` 추가 (펫렌즈 /pet-lens, 챗봇 /chat) |
| `.gitignore` | 3 | pnpm-lock.yaml/pnpm-workspace.yaml 재생성 방지 |
| `.claude/launch.json` | 3 | preview 서버 실행을 pnpm→npm 으로 |
| `lib/menu-data.ts` | 7-B | 푸터 약관/개인정보 링크 연결 + 고객센터 배송조회 제거 + 4메뉴 실제 경로 |
| `components/footer/Footer.tsx` | 7-B | 사업자 정보 하드코딩 → BUSINESS_INFO/COPYRIGHT_NOTICE 단일 출처 참조 |
| `app/notice/page.tsx` | 7-B | **신규** 공지사항 페이지 |
| `app/faq/page.tsx`, `app/faq/FaqClient.tsx` | 7-B | **신규** 자주 묻는 질문 (아코디언) |
| `app/inquiry/page.tsx` | 7-B | **신규** 1:1 문의 (메일/전화 mailto) |
| `app/return/page.tsx` | 7-B | **신규** 교환·반품 안내 |

> **운영 사이트 파일(app/api, lib/store, lib/daengdabang-llm, lib/customer-api, lib/legal,
>  components/site, app/cart, app/checkout, app/bundle, app/terms, app/privacy 등)은
>  하나도 수정하지 않았다.** (lib/legal 의 BUSINESS_INFO 는 참조만, 수정 X)

---

## 9. 커밋 히스토리 (restore/mainpage)

오래된 → 최신 순. 각 커밋이 무엇을 했는지:

```
05d0636  feat(main):  메인 페이지 app/page.tsx 재작성 + 초기 7개 섹션 되살림 (Phase 2)
066b0d6  feat(layout): 헤더·푸터를 초기 것으로 교체 + globals.css 에 크레파스 배경 병합 (Phase 3a)
acfd104  fix(header):  글로벌 폰트 복원(Arial 깨짐 해결) + 로그인/장바구니를 운영 사이트 라우트로 연결
60b8473  fix(header):  메뉴 폰트 통일 1차 시도 (button 폰트 명시) — 실패
fc7f11a  fix(globals): 메뉴 폰트 통일 근본 해결 — button `font:inherit`→`font-family:inherit`
4c3369c  fix:         preview 가 재생성한 pnpm 파일 제거 + gitignore (Cloudflare 빌드 오인 방지)
f292ef4  feat(header): AI 메뉴(펫렌즈/챗봇) 메가메뉴 + 모바일 그룹 추가 (Phase 3b)
592c6a1  docs:        이 작업 내역 문서 추가
5c99a9c  fix(brand):  브랜드 버튼 글자색 1차 시도 (text-foreground→text-neutral-900) — 실패
d848e3e  fix(brand):  브랜드 버튼 글자색 근본 해결 — text-neutral-900! (a color:inherit 무력화)
f6460b6  docs:        작업 내역 상세화 (각 섹션 동작/데이터/링크)
(예정)   feat:        푸터 사업자정보 BUSINESS_INFO 참조 + 고객센터 4페이지 신규 + 약관 링크 연결 (7-B)
```

> 폰트(`fc7f11a`)·색상(`d848e3e`) 두 번 모두 **1차 시도 실패 → preview 실측 →
> 근본 원인(unlayered reset 이 Tailwind utility 무력화) 발견 → !important/longhand 로 해결**
> 의 흐름을 거쳤다. 추측이 아니라 측정으로 해결했다는 점이 핵심.

---

## 10. 운영 사이트 검토 체크리스트

미리보기 URL 에서 **본인 기능이 정상인지** 확인 (Cloudflare → Pages → Deployments → restore/mainpage):

```
[메인 페이지 — 초기 구성 확인]
  □ 히어로 아래 초기 섹션들 (베스트/브랜드/기획전/신상품/리뷰/인스타)
  □ 상단 메뉴 = 메가메뉴 (카테고리/브랜드/기획전/AI/고객센터 드롭다운)
  □ 크레파스 배경
  □ 스크롤 시 헤더 고정
  □ 로그인 시 펫 기반 추천 섹션 노출

[운영 사이트 기능 — 정상 동작 확인]
  □ 히어로 동적 (날씨/시간대/계절)
  □ 장바구니(/cart)·결제(/checkout)
  □ 펫렌즈(/pet-lens) AI 분석
  □ 챗봇(/chat + 우하단 위젯) LLM
  □ 번들(/bundle, /bundles)
  □ 소셜 로그인(/auth/login)
  □ 상품 상세 (영상/이미지)
  □ RPA·API·외부 데이터 연동

[메뉴-상품 연결]
  □ 카테고리 클릭 → 해당 분류 상품 (서브필터 포함)
  □ 브랜드/기획전 클릭 → 해당 상품
```

---

## 11. 롤백 / 머지 방법

### 머지 전 문제 발견 → 브랜치 폐기 (운영 영향 0)
```bash
git push origin --delete restore/mainpage   # 미리보기만 사라짐, 운영 그대로
```

### 머지 (운영 사이트 검토 OK 후)
```bash
git checkout main
git merge restore/mainpage
git push origin main      # Cloudflare 자동 빌드 → 운영 반영
```

### 머지 후 문제 발견 → 즉시 복구 (3가지)
```bash
# 방법 A: git 으로 (1분)
git reset --hard backup/before-mainpage-restore
git push origin main --force-with-lease

# 방법 B: Cloudflare 대시보드에서 이전 배포로 Rollback (30초, 가장 빠름)
#   Pages → Deployments → 머지 전 배포 → "Rollback to this deployment"
```

---

## 12. 미해결 / 참고 사항

- 초기 브랜드 메뉴는 대표 2개(러프웨어, 렉스스펙스)만 — 의도된 초기 구성.
- 고객센터 메뉴 링크는 `#notice` 등 앵커(placeholder) — 실제 페이지는 추후.
- IntroSplash(인트로 스플래시)는 운영 사이트 것 유지 — 필요 시 조정 가능.
- 머지 시 `restore/mainpage` 의 7개 커밋이 main 에 들어감.

---
