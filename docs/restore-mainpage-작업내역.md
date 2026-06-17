# 메인 페이지 복원 작업 내역 (restore/mainpage)

> **작성일**: 2026-06-16
> **브랜치**: `restore/mainpage`
> **기준(base)**: `origin/main` (협업자 최신 운영 버전, commit `cc786f0`)
> **상태**: 미리보기 검토 단계 (⚠ 아직 main 머지 안 함 — 운영 영향 0)

---

## 1. 작업 목적

협업자가 API·RPA·LLM·장바구니·결제 등 **기능을 대폭 추가**하면서 메인 페이지의
구성(섹션 배치·상단 메뉴·배경)이 변경되었다. 이 작업은:

> **"협업자가 만든 기능은 하나도 건드리지 않고(유지),
>  메인 페이지에서 보이는 것(섹션·메뉴·푸터·배경)만 원래 우리 구성으로 되돌린다."**

한 문장 비유: **자동차 엔진(협업자 기능)은 그대로 두고, 차체 외관·대시보드(우리 UI)만 교체.**

### 유지한 것 (협업자 — 손대지 않음)
- 동적 히어로 (날씨/시간대/계절 반응 — Open-Meteo API)
- 상품 데이터·CDN 영상·이미지
- 상품 상세 페이지
- 장바구니(`/cart`)·결제(`/checkout`)·번들(`/bundle`)
- 펫렌즈(`/pet-lens`)·챗봇(`/chat` + 우하단 위젯)·LLM(`lib/daengdabang-llm.ts`)
- 소셜 로그인(`/auth/login`)·고객 API
- 전역 스토어(`lib/store.tsx`)

### 교체한 것 (우리 UI)
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

작업 전, 협업자 코드와 우리 코드가 충돌하는지 분석했다. 결과:

### 호환되는 것 (좋은 소식)
- `lib/catalog` 모듈: 협업자가 **우리가 분리한 구조를 그대로 이어받음**.
  export 함수·타입(byCategory, byBrand, byPromo, bySubcategory, getBestProducts,
  formatKRW, CategorySlug, SubcategorySlug 등)이 **100% 동일**.
  → 우리 메인 섹션이 협업자 데이터를 그대로 사용 가능.
- 카테고리/서브카테고리/기획전 슬러그 체계 동일 (outdoor, harness, active 등).
- `lib/menu-data.ts` (메뉴 구조): 협업자가 **안 건드림** → 우리 메뉴 그대로 보존.
- 우리 헤더(`components/header/`)·푸터(`components/footer/`): 협업자 버전에도 남아있음.
- ProductCard props (product, rank, showNewBadge, rankStyle, sizeClass) 동일.

### 차이가 있어 작업이 필요했던 것
- 메인 페이지 entry 가 다름: 우리 `app/(shop)/main/page.tsx` vs 협업자 `app/page.tsx`.
- 우리 메인 섹션 `.tsx` 8개를 협업자가 **삭제**함 (CSS 모듈만 남김) → 복원 필요.
- 레이아웃이 협업자 헤더/푸터(`components/site/`)를 마운트 → 우리 것으로 교체 필요.
- `globals.css` 를 협업자가 대폭 변경 → 크레파스 배경 병합 필요.

### 협업자가 변경한 규모 (참고)
- 코드 파일 119개 + 이미지·영상 포함 2,764개 파일.
- 라우트 평면화: `app/(shop)/main` → `app/main`, `app/(shop)/best` → `app/best` 등.
- 신규 기능: cart, checkout, bundle, chat, social, campaign, pet-lens 등.

---

## 4. Phase 1 — 브랜치 + 백업 (commit 없음, git 작업)

```bash
# 1) 운영 시점 박제
git tag backup/before-mainpage-restore origin/main
git push origin backup/before-mainpage-restore

# 2) 협업자 최신(origin/main) 기준으로 작업 브랜치 생성
git checkout -b restore/mainpage origin/main
```

- **반드시 `origin/main` 기준으로 브랜치를 떴다.** 그래야 협업자 기능이 전부 포함된
  상태에서 그 위에 우리 UI만 얹는다. (우리 옛 로컬 기준으로 뜨면 협업자 작업이 날아간다.)

---

## 5. Phase 2 — 메인 페이지 섹션 (commit `05d0636`)

### 변경 파일
| 파일 | 작업 |
|------|------|
| `app/page.tsx` | 재작성 — 메인 구성을 우리 섹션으로 |
| `components/main/RecommendSection.tsx` | 복원 (ziewisemin/main 에서) |
| `components/main/BestSection.tsx` | 복원 + 호환 수정 |
| `components/main/BrandSlider.tsx` | 복원 |
| `components/main/PromoSection.tsx` | 복원 |
| `components/main/NewArrivalsSection.tsx` | 복원 |
| `components/main/ReviewSection.tsx` | 복원 |
| `components/main/InstaSection.tsx` | 복원 |

### `app/page.tsx` 새 구성
```
<IntroSplash />          ← 협업자 (인트로 스플래시) 유지
<HeroSection />          ← 협업자 (동적 날씨/시간/계절) 유지, featuredProducts={getBestProducts(4)}
<RecommendSection />     ← 우리 (로그인+펫 기반 추천, 비로그인 시 미노출)
<BestSection />          ← 우리 (베스트 4탭 × 4상품)
<BrandSlider />          ← 우리 (대표 브랜드 자동 페이드)
<PromoSection />         ← 우리 (기획전)
<NewArrivalsSection />   ← 우리 (신상품 무한 캐러셀)
<ReviewSection />        ← 우리 (리뷰)
<InstaSection />         ← 우리 (인스타그램 그리드)
```

> **히어로만 협업자 것**(동적 기능 유지), 나머지 섹션은 우리 구성.

### 복원 방법
협업자가 우리 섹션 `.tsx` 를 삭제했으므로, 우리 마지막 버전(`ziewisemin/main`)에서 가져옴:
```bash
git checkout ziewisemin/main -- components/main/RecommendSection.tsx \
  components/main/BestSection.tsx components/main/BrandSlider.tsx ... (7개)
```

### 호환 수정 — BestSection
- 문제: 우리 BestSection 은 `getBestProducts(period)` 가 `rank` 포함 배열을 반환한다고 가정.
- 협업자 버전은 `rank` 없는 `CatalogProduct[]` 반환.
- 해결: `rank={p.rank}` → `map((p, index) => rank={index + 1})` 로 순위 부여.

### 검증
- 의존성(hooks/useAuth, usePets, lib/recommendations, lib/reviews, ProductCard) 전부 협업자 버전에 존재·호환 확인.
- `npm run build` 성공 (421 페이지).

---

## 6. Phase 3 — 헤더·푸터·배경·폰트·로그인·AI 메뉴

### 6-1. 헤더·푸터·크레파스 배경 (commit `066b0d6`)

| 파일 | 작업 |
|------|------|
| `app/layout.tsx` | 헤더/푸터를 우리 것으로 교체 + 크레파스 배경 div 추가 |
| `app/globals.css` | 우리 디자인 토큰 + 크레파스 배경(.global-aurora) + glass 유틸 병합 (252줄 추가) |

**layout.tsx 변경:**
```
Header: components/site/Header  → components/header/Header  (우리 메가메뉴)
Footer: components/site/Footer  → components/footer/Footer  (우리 푸터)
children 을 <main pt-[var(--header-height)]> 로 감쌈 (fixed 헤더 대응)
<div className="global-aurora" /> 추가 (크레파스 배경 레이어)

유지: StoreProvider(장바구니 스토어), ChatWidget(협업자 챗봇 위젯)
```

**globals.css 병합 방식:**
- 협업자 스타일(surface/btn 등 1263줄)은 **보존** (협업자 페이지가 사용).
- 우리 호환 레이어(디자인 토큰 + 크레파스 배경 + glass)를 **파일 끝에 추가**.
- CSS 캐스케이드상 뒤에 온 우리 정의가 우선 → 우리 톤·배경이 적용.

### 6-2. 폰트 복원 + 로그인/장바구니 연결 (commit `acfd104`)

| 파일 | 작업 |
|------|------|
| `app/layout.tsx` | 우리 글로벌 폰트(Geist, Wanted Sans, Gaegu) 복원 |
| `components/header/Header.tsx` | 로그인 `/login`→`/auth/login`, 장바구니 `#cart`→`/cart` |
| `components/header/MobilePanel.tsx` | 동일 (로그인·장바구니 협업자 라우트로) |

- **폰트 문제**: 협업자 layout 은 `next/font` 미사용(Arial 폴백) → 우리 헤더/로고 폰트 깨짐.
  → 우리 폰트 설정(Geist/Wanted Sans/Gaegu)을 layout 에 추가, html className 에 `--font-*` 변수 주입.
- **로그인**: 우리 옛 `/login` 대신 협업자 소셜 로그인 `/auth/login` 으로 연결.
- **장바구니**: 협업자 `/cart` 페이지로 연결.

### 6-3. 메뉴 폰트 통일 — 근본 해결 (commit `60b8473`, `fc7f11a`)

- **증상**: "베스트·신상품"(a 태그)과 "카테고리·브랜드·기획전·고객센터"(button 태그)의 폰트가 다름.
- **진단**: 로컬 dev 서버 + preview inspect 로 실제 computed 값 측정:
  ```
  베스트(a):    14px / weight 700  (text-sm font-bold 정상)
  카테고리(button): 16px / weight 400  (Tailwind utility 무시됨!)
  ```
- **근본 원인**: 협업자 `globals.css` 의 `button { font: inherit }` shorthand 가
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
- **펫렌즈·챗봇 기능은 협업자 것 그대로 사용** (페이지 링크로 연결).
- 우하단 협업자 챗봇 위젯(ChatWidget)도 상시 노출 유지.

---

## 7. Phase 4 — 라우트·서브카테고리 검증 (코드 변경 없음)

협업자 라우트와 우리 메뉴 링크가 호환되는지 검증. **이미 호환되어 작업 불필요.**

### 검증 결과
- 우리 메뉴 링크 전부 협업자 라우트에 존재:
  `/best /new /products /brands /category /brand /promo /reviews /pet-lens /chat`
- 협업자 페이지가 우리 catalog 함수 그대로 사용:
  - 카테고리: `ProductsClient` 가 `params.get("sub")` 로 서브카테고리 필터 + `bySubcategory`
  - 브랜드: `byBrand(slug)` (우리 brandSlug: ruffwear, rex-specs)
  - 기획전: `byPromo(slug)` (우리 PromoSlug: active, rainy, ...)

### 실측 증명 (preview inspect)
```
/category/outdoor?sub=harness  →  하네스 상품 32개만 정확히 표시
   · 러프웨어 로드 업 차량용 안전 하네스
   · 러프웨어 프런트 레인지 플렉스 하네스(2026)
   · 러프웨어 하네스 플레그라인 경량
```
→ **"상단 메뉴에 맞춘 상품 리스트"가 그대로 동작.** 협업자가 우리 catalog 모듈을
   이어받아서 메뉴-상품 연결이 자동으로 됨.

---

## 8. 전체 변경 파일 목록 (한눈에)

| 파일 | Phase | 변경 내용 |
|------|-------|-----------|
| `app/page.tsx` | 2 | 메인 구성을 우리 섹션으로 재작성 |
| `components/main/RecommendSection.tsx` | 2 | 복원 (로그인+펫 추천) |
| `components/main/BestSection.tsx` | 2 | 복원 + rank 호환 수정 |
| `components/main/BrandSlider.tsx` | 2 | 복원 |
| `components/main/PromoSection.tsx` | 2 | 복원 |
| `components/main/NewArrivalsSection.tsx` | 2 | 복원 |
| `components/main/ReviewSection.tsx` | 2 | 복원 |
| `components/main/InstaSection.tsx` | 2 | 복원 |
| `app/layout.tsx` | 3 | 헤더/푸터 교체 + 폰트 복원 + 크레파스 배경 div |
| `app/globals.css` | 3 | 우리 토큰·배경·glass 병합 + button 폰트 근본 수정 |
| `components/header/Header.tsx` | 3 | 로그인/장바구니 라우트 + AI 메뉴 드롭다운 |
| `components/header/MobilePanel.tsx` | 3 | 로그인/장바구니 라우트 + AI 그룹 |
| `lib/menu-data.ts` | 3 | AI_LINKS 추가 |
| `.gitignore` | 3 | pnpm 파일 재생성 방지 |
| `.claude/launch.json` | 3 | preview 서버 npm 설정 |

> **협업자 파일(app/api, lib/store, lib/daengdabang-llm, components/site, app/cart 등)은
>  하나도 수정하지 않았다.**

---

## 9. 커밋 히스토리 (restore/mainpage)

```
f292ef4  feat(header): AI 메뉴 추가 — 펫렌즈/챗봇 (Phase 3b)
4c3369c  fix: pnpm 파일 재제거 + gitignore
fc7f11a  fix(globals): button font shorthand → font-family (메뉴 폰트 통일 근본 해결)
60b8473  fix(header): nav 메가메뉴 트리거 button 폰트 통일 (시도)
acfd104  fix(header): 폰트 복원 + 로그인/장바구니 협업자 라우트 연결 (Phase 3a-fix)
066b0d6  feat(layout): 헤더·푸터 우리 UI 로 교체 + 크레파스 배경 (Phase 3a)
05d0636  feat(main): 메인 페이지 섹션을 우리 구성으로 (Phase 2)
```

---

## 10. 협업자 검토 체크리스트

미리보기 URL 에서 **본인 기능이 정상인지** 확인 (Cloudflare → Pages → Deployments → restore/mainpage):

```
[메인 페이지 — 우리 구성 확인]
  □ 히어로 아래 우리 섹션들 (베스트/브랜드/기획전/신상품/리뷰/인스타)
  □ 상단 메뉴 = 메가메뉴 (카테고리/브랜드/기획전/AI/고객센터 드롭다운)
  □ 크레파스 배경
  □ 스크롤 시 헤더 고정
  □ 로그인 시 펫 기반 추천 섹션 노출

[협업자 기능 — 정상 동작 확인]
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

### 머지 (협업자 검토 OK 후)
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

- 우리 브랜드 메뉴는 대표 2개(러프웨어, 렉스스펙스)만 — 의도된 우리 구성.
- 고객센터 메뉴 링크는 `#notice` 등 앵커(placeholder) — 실제 페이지는 추후.
- IntroSplash(인트로 스플래시)는 협업자 것 유지 — 필요 시 조정 가능.
- 머지 시 `restore/mainpage` 의 7개 커밋이 main 에 들어감.

---

**문의**: 이 작업 관련 질문은 smlee@ziewise.com
