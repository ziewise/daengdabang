# 웹 예전 디자인 페이지 · 창 개편 인계 (2026-10-25)

> 상태: READY (로컬 브랜치 `local/sticker-mockup` 커밋, 푸시 · 배포 전)
> 범위: **웹 겉모양만**. 버튼 기능 · 서버 요청 · 결제 · 값은 하나도 바꾸지 않았고, 앱 화면(`html.ddb-app-mode`)은 그대로입니다(페이지마다 390px 전후 비교).

## 0. 한눈에

조사에서 "예전 디자인이 남은" 것으로 나온 페이지 · 창을 웹 파스텔 쿠션 결(주아 제목 + 세 색 밑줄 · 영문 손글씨 꼬리표 · 3D 그림 · 분홍/흰 알약 · 점선 없음)로 바꿨습니다.

| 화면 | 주소 | 방식 | 꾸밈 파일 |
| --- | --- | --- | --- |
| 비밀번호 찾기 | `/forgot-password` | 웹 전용 새 화면(회원가입과 같은 틀) | `components/auth/forgot-web/ForgotWebView.tsx` · `app/forgot-web.css` |
| 결제 완료 · 확인 중 · 실패 | `/checkout/toss/success` · `/fail` | 웹 전용 새 화면(비회원 완료와 같은 가족) | `components/checkout/PaymentResultWeb.tsx` · `app/payment-web.css` |
| 전체상품 · 제품군 | `/products` · `/category/*` | 머리 판 · 카테고리 칸 · 세부 알약 추가 | `components/products/ShopListHero.tsx` · `app/shop-list-web.css` |
| 약관 · 방침 · 법적고지 · 사업자 · 구매안전 | `/terms` `/privacy` `/legal` `/legal/business` `/legal/escrow` | 머리 판 · 한눈에 보기 · 따라오는 목차 · 조항 카드(법률 문구 그대로) | `components/legal/*` · `app/legal-web.css` |
| 맞춤 추천 | `/recommendations` | 웹 전용 새 화면 | `components/recommendation/RecommendationsWeb.tsx` · `app/recommend-web.css` |
| 외부 후기 | `/reviews` | 머리 판 · 자주 나온 이야기 · 후기 한마디 | `components/reviews/ReviewsWebHero.tsx` · `app/reviews-web.css` |
| 브랜드 상세 · 기획전 | `/brand/*` · `/promo/*` | 머리 판 · 구성 알약 · 다른 묶음 | `components/products/CollectionWebHero.tsx` · `app/collection-web.css` |
| 세트 상세 | `/bundle/*` | CSS 만(사진 위 글자 → 왼쪽 글 · 오른쪽 사진 틀) | `app/bundle-web.css` |
| 입점·제휴 · 대량 구매 · 시작하기 | `/partner` · `/bulk-order` · `/campaign/sns-launch` | CSS + 웹 전용 3D 그림 | `app/biz-web.css` |
| 외부 판매처 이동 | `/outbound` | CSS 만 | `app/outbound-web.css` |
| 브랜드 스토리 | `/brand-story` | CSS 만 | `app/brand-story-web.css` |
| 매일댕생활 옛 주소 | `/growth` · `/challenge` | 꾸밈 파일 누락으로 큰 검은 발자국이 보이던 것 고침 | `app/daily-web.css` 불러오기 |
| 페이지를 찾을 수 없음(404) | 없는 주소 | 웹 전용 조각(3D 그림 · 안내 · 바로가기 네 칸) + CSS | `app/not-found.tsx` · `app/notfound-web.css` |
| 반품/교환 안내 창 · 국가·언어 창 · 구매 참고 정보 카드/창 · 입혀보기 창 | 푸터 · 헤더 · 상품 상세 | 이름표 + CSS | `app/modal-web.css` |

## 1. 고친 문제(겉모양 버그)

- 추천 카드: 상품 카드가 칸 높이를 다 차지해 "추천 이유" 칸이 카드 밖으로 밀려나 보이지 않던 것(메인 추천 칸 포함, `app/globals.css`).
- `/recommendations`: 화면이 내용 폭으로 좁게 줄어들던 것.
- 반품/교환 안내 창: 푸터 꾸밈 때문에 창이 푸터 칸 안에 갇혀 보이던 것 → 웹에서는 body 에 붙임.
- `/growth` · `/challenge`: 꾸밈 파일이 빠져 SVG 그림이 화면 가득 검게 보이던 것.

## 2. 그대로 둔 것 · 협업자 확인 필요

- **리뷰 쓰기 화면**: 서버 기능(작성 · 사진 · 구매 확인)이 없어 화면만 만들면 가짜 버튼이 되므로 만들지 않았습니다. 서버 연동이 준비되면 같은 결로 만들 수 있습니다.
- **공지 상세 · 이벤트 페이지**: 공지는 목록에서 본문까지 다 보이고, 사이트 안에 없는 페이지로 가는 링크는 없었습니다(주요 26개 화면 링크 244개 확인, 깨진 링크 0).
- **PasswordChangeModal**: 웹 개인정보 화면은 화면 안 수정으로 바뀌어 웹에서는 더 쓰이지 않습니다(앱용으로 그대로 둠).
- 쓰이지 않는 옛 창(LoginModal · ChatbotModal · PetlensModal · PetRegisterModal)은 손대지 않았습니다.

## 3. 개발 미리보기(배포 빌드에는 없음, `NODE_ENV=development` 전용)

- 비밀번호 찾기 단계: `/forgot-password/?fxpreview=code|password|done`
- 결제 결과: `/checkout/toss/success/?pwpreview=done|checking|login|pending|failed|invalid`
- 추천 상품 예시: `/recommendations/?rcpreview=1`
- 가짜 서버(`.claude/preview-mock/mock-server.mjs`, 8010)에 비밀번호 찾기 세 요청 · 상품 구매 참고 정보 예시 응답을 더했습니다(로컬 미리보기 전용, 저장소 밖).

## 4. 검증

- 바뀐 화면마다 PC 1374 · 모바일 390 촬영으로 확인.
- 앱 화면(390) 전후 비교: 차이 없음(영상 재생 · 채팅 단추 깜박임처럼 저절로 움직이는 부분만 차이).
- `npm test` 930 통과 · 타입 검사 통과 · 바뀐 파일 린트(기존 경고 외 새 오류 없음).
