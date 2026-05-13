# 댕다방 (Daengdabang)

> 우리 댕댕이의 매일을 더 특별하게 — 큐레이션 펫 쇼핑몰

오로라 글래스 디자인의 정적 HTML/CSS/JS 펫 쇼핑몰. AI 기반 펫렌즈(사진 3장 → 견종·체형 추정 → 맞춤 상품 추천)가 핵심 차별 기능입니다.

## 페이지 구성

| 파일 | 설명 |
|---|---|
| `index.html` | 인트로 (영상 + 진입 버튼) |
| `main.html` | 메인 쇼핑 페이지 (히어로·베스트·브랜드·기획전·신상품·리뷰·인스타) |
| `login.html` / `signup.html` / `forgot-password.html` | 인증 페이지 (mock) |
| `mypage.html` | 마이페이지 (대시보드·펫프로필·펫렌즈기록·주문·등급 등 풀 메뉴) |
| `petlens.html` | 펫렌즈 상세 분석 페이지 |

## 핵심 기능

- **펫렌즈 모달** — FAB 클릭 → 사진 3장(얼굴·측면·정면) → AI 분석 → 견종/체형/추천
- **회원 등급제** — 5단계 (🌱 댕린이 · 🐾 댕친구 · 🦴 댕단짝 · 💎 댕가족 · 👑 댕마스터)
- **다견 가구 지원** — 한 계정에 여러 펫 프로필
- **펫렌즈 분석 기록** — 시간순 타임라인으로 모든 분석 이력 보존
- **다크모드 헤더** — 글래스 모피즘 + 메가메뉴 + 모바일 슬라이드 패널

## 폴더 구조

```
Daengdabang_Shop/
├── index.html, main.html, ...        # 페이지
├── assets/
│   ├── css/                          # common, header, main, footer, petlens, mypage
│   ├── js/                           # header, main, auth, petlens-modal, petlens, mypage
│   ├── images/                       # 로고·제품·리뷰·기획전
│   └── videos/                       # hero.mp4, intro.mp4
├── docs/                             # 기획·카탈로그·메뉴 구조 분석
└── README.md
```

## 로컬 실행

순수 정적 사이트라 빌드 도구 없이 동작합니다.

### A. VS Code Live Server (권장)
1. Live Server 확장 설치
2. `index.html` 우클릭 → "Open with Live Server"

### B. Python 간이 서버
```bash
python -m http.server 8000
```

### C. Node http-server
```bash
npx http-server -p 8000
```

## 배포

[Vercel](https://vercel.com) 정적 호스팅을 사용합니다.
- Framework Preset: Other
- Build Command: 비워둠
- Output Directory: `./`
- 진입점: `index.html`

## 데이터 저장

현재 단계는 백엔드 없이 **localStorage** 만 사용합니다.

| 키 | 용도 |
|---|---|
| `daengdabang_logged_in` | 로그인 상태 (provider, ts) |
| `daengdabang_pets` | 회원의 펫/분석 목록 (배열) |
| `daengdabang_pet_pending` | 비회원 펫렌즈 분석 임시 보관 → 로그인 시 자동 이관 |
| `daengdabang_search_recent` | 검색 최근 검색어 |

## 향후 작업

- 실제 백엔드 API 연동 (인증·주문·상품·펫렌즈 AI)
- 회원 등급 산정 로직 서버화
- 결제·배송 모듈
- 외부 쇼핑몰 상품 정보 큐레이션 (사용자가 직접 URL 제공)
