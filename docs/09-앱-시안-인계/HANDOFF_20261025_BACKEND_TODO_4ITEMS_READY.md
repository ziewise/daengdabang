# 협업자 백엔드 작업 4가지 — 한 장 정리 (2026-10-25)

> 웹 화면 작업을 하며 생긴 **서버 · 기능 작업**만 모았습니다.
> 화면은 다 만들어져 있고, 서버가 없는 부분은 **스위치가 꺼져 있거나 "준비 중"으로만 보입니다(가짜 성공 없음).**
> 서버 주소 · 응답 모양은 프론트가 아래처럼 "약속"해 둔 것입니다. 이름 · 모양을 바꿔도 되고, 바꾸면 적어 둔 **프론트 파일 한 곳**만 고치면 됩니다.

| # | 작업 | 프론트 스위치 | 크기 |
|---|---|---|---|
| 1 | 회원가입 · 인증(본인인증 · 이메일 중복 확인 · 마케팅 동의 · 간편가입 결과 값) | `NEXT_PUBLIC_SIGNUP_IDENTITY` · `NEXT_PUBLIC_SIGNUP_EMAIL_CHECK` · `NEXT_PUBLIC_SIGNUP_MARKETING` | 중 (본인인증은 인증사 계약 필요) |
| 2 | 개인정보 확인 · 수정(소식 그만 받기 · 휴대폰 등록 · 재인증) | 없음(화면에 "준비 중") | 소 |
| 3 | 비회원 주문(주문 · 결제 확인 · 조회 · 취소) | `NEXT_PUBLIC_GUEST_ORDER` | 중~대 |
| 4 | 자사몰 상품 후기(작성 · 사진 · 구매자 확인 · 적립 · 관리) | (화면은 서버 준비 후 우리가 만듦) | 대 |

---

## 0. 공통 — 위치 · 규칙

### 0-1. 프론트(이 저장소)
- 저장소: `D:\Daengdabang\Daengdabang_Shop` (Next.js 16, 정적 내보내기 → Cloudflare)
- 서버 주소 고르기: `lib/ddb-api-base.ts` — 웹 · 앱 모두 `https://api.daengdabang.com`
- 기존 서버 호출 모음: `lib/customer-api.ts` (`apiJson()` 공용 함수 · 토큰은 `Authorization: Bearer`)
- **스위치 켜는 곳**: `.github/workflows/deploy.yml` 의 빌드 `env:` (31행 근처) — 다른 스위치처럼
  `NEXT_PUBLIC_SIGNUP_IDENTITY: ${{ vars.NEXT_PUBLIC_SIGNUP_IDENTITY || '' }}` 형태로 넣고 GitHub 저장소 변수(vars)에서 `1` 로 켬.
  `NEXT_PUBLIC_*` 는 **빌드할 때 굳어짐** → 바꾸면 다시 배포해야 반영.
- 로컬 확인: `.env.development.local` 에 같은 값을 넣고 `npm run dev`.
- 테스트: `npm test` (930개) — 아래 파일들의 주소 · 문구 일부를 테스트가 확인함. 주소를 바꾸면 `tests/` 에서 해당 문자열도 같이 고칠 것.

### 0-2. 서버(협업자 저장소)
- 기존 문서 기준 FastAPI 소스: `C:\DaengDaBang\apps\api` (예: 프로필 `app\routers\pet_profiles.py` · 스키마 `app\schemas\pet_profile.py` · 서비스 `app\services\storefront_analytics.py`)
- 아래 "서버 제안 위치"는 이 구조(routers · schemas · services)를 따른 **제안**입니다. 실제 파일 이름은 기존 규칙대로 정하면 됩니다.
- 응답 키는 **snake_case**(프론트가 그렇게 읽음).

---

## 1. 회원가입 · 인증

### 1-1. 지금 상태
- 이메일 가입 · 간편가입(카카오 · 네이버 · 구글)은 **기존 API로 이미 동작**(가입 → 로그인 → 반려견 저장 → 완료).
- 아래 4가지는 화면만 있고 스위치가 꺼져 있음.

### 1-2. 프론트 파일
| 무엇 | 파일 |
|---|---|
| 연동 함수 · 주소 약속 · 스위치 | **`lib/signup-flow.ts`** (이 파일 하나에 다 있음) |
| 가입 화면(이메일) | `components/auth/signup-web/SignupWebFlow.tsx` (본인인증 521행 · 이메일 확인 555행 · 동의 저장 202행 근처) |
| 간편가입 마무리 화면 | `components/auth/signup-web/SocialSignupWebFinish.tsx` |
| 간편가입 돌아오는 주소 | `app/auth/social-callback/page.tsx` (78행 `readSocialReturnKind`) |
| 실제 가입 요청 | `lib/customer-api.ts` 760행 `signupCustomer()` → `POST /api/v1/auth/signup` |
| 미리보기(개발 서버만) | localStorage `ddb.signup.preview` = `{"identity":"ok","email":"taken","social":"existing"}` 등, 또는 `/auth/signup/?sxpreview` |

### 1-3. 할 일
**① 휴대폰 본인인증** (스위치 `NEXT_PUBLIC_SIGNUP_IDENTITY=1`)
- 인증사 계약: NICE · KCB · PASS 중 택1
- `POST /api/v1/auth/identity-verifications` (몸통 `{}`) → `{ "verification_id": "...", "auth_url": "https://인증사창" }`
- `GET /api/v1/auth/identity-verifications/{verification_id}` → 프론트가 **2초마다** 물음(10분 넘으면 만료, 창 닫으면 취소)
  ```json
  { "status": "pending|verified|cancelled|expired|failed",
    "name": "김댕댕", "birth_date": "1995-03-14", "masked_phone": "010-****-5678", "carrier": "SKT",
    "over_14": true,
    "existing_account": { "masked_account": "ki****@gmail.com", "provider": "email|kakao|naver|google" },
    "rejoin_blocked_until": "2026-11-20",
    "message": "실패 사유(선택)" }
  ```
- **서버가 강제할 것**: `POST /api/v1/auth/signup` 에서 `verification_id` 를 받아 확인
  - 같은 사람(CI) 중복 가입 막기 · 만 14세 미만 막기 · 탈퇴 후 재가입 제한 기간
  - 프론트 수정 지점: `lib/customer-api.ts` `signupCustomer()` 몸통에 `verification_id` 추가 + `SignupWebFlow.tsx` 에서 넘기기(지금은 결과를 화면에만 씀)
- 서버 제안 위치: `app\routers\auth_identity.py` · `app\schemas\identity_verification.py` · `app\services\identity_provider.py`(인증사 연결) · 테이블 `identity_verifications`(id · status · ci_hash · birth_date · created_at · expires_at)

**② 이메일 중복 확인** (스위치 `NEXT_PUBLIC_SIGNUP_EMAIL_CHECK=1`)
- `POST /api/v1/auth/email-availability` `{ "email": "a@b.com" }` → `{ "available": true }`
  - 주소창에 이메일이 남지 않게 POST. 너무 자주 묻지 못하게 횟수 제한 권장.

**③ 마케팅 수신 동의 저장** (스위치 `NEXT_PUBLIC_SIGNUP_MARKETING=1`)
- 가입 직후(토큰 있음) `PUT /api/v1/me/marketing-consent` `{ "email": true, "sms": false }` → `{ "processed_at": "2026-10-25T10:00:00+09:00" }`
- 완료 화면에 정보통신망법 수신 동의 결과(처리 날짜) 안내로 씀. 기존 `growth/outbound-preferences` 와 같은 저장소로 묶어도 됨.

**④ 간편가입 돌아올 때 결과 값** (스위치 없음 — 값이 오면 바로 화면이 갈림)
- 서버가 `/auth/social-callback/` 으로 돌려보낼 때 주소에 붙이기
  - 성공: `signup_status=new`(새 가입) 또는 `signup_status=existing`(이미 가입된 간편 계정 — "다시 만나서 반가워요")
  - 실패: `error=cancelled` | `access_denied` | `email_exists`(같은 이메일로 이메일 가입이 이미 있음) | …
- 값이 없으면 지금처럼 "새 가입"으로 봄.

### 1-4. 정책 결정(서버 설정)
- 가입 때 이메일 인증 필수 여부: 가입 응답 `email_verification_required: false` 면 바로 로그인 → 완료. `true` 면 기존 "이메일 확인 후 계정 열기" 화면.
- 카카오 이메일 · 전화번호 받기 = 비즈 앱 검수 필요(카카오싱크로 약관 단계 줄이기 가능)
- 간편가입에도 본인인증을 받을지(한 사람 한 계정)
- 반려동물 사진을 해외 AI로 보낸다면 국외 이전 고지 필요 여부(법무)

---

## 2. 개인정보 확인 · 수정

### 2-1. 지금 상태
- 이름 변경 · 비밀번호 변경 · 이메일 인증 상태 · 이메일 소식 **받기**는 기존 API로 동작.
- 아래는 화면에 "준비 중" 또는 1:1 문의로 안내 중.

### 2-2. 프론트 파일
| 무엇 | 파일 |
|---|---|
| 개인정보 화면(웹) | `components/mypage/ProfileWebView.tsx` — 휴대폰 513행 근처 "준비 중", 소식 그만 받기 720행 근처(지금 1:1 문의 창), 문자 소식 755행 근처 "준비 중" |
| 한 번 더 확인(재인증) | `lib/profile-reauth.ts` (지금은 화면 잠금 — 이메일 회원은 기존 로그인 확인, 간편가입은 공급자 다시 로그인) |
| 기존 소식 API 함수 | `lib/customer-api.ts` 1027행 `loadOutboundEmailPreference()` · 1039행 `consentOutboundEmailPreference()` |

### 2-3. 할 일
**① 이메일 소식 그만 받기** (가장 시급 — 받기는 있는데 그만 받기가 없음)
- 제안: `POST /api/v1/growth/outbound-preferences/email/withdraw` → 받기와 같은 모양의 응답(`channel: "email"` …)
- 프론트 수정 지점: `lib/customer-api.ts` 에 `withdrawOutboundEmailPreference()` 추가 → `ProfileWebView.tsx` "그만 받기" 단추를 1:1 문의 대신 이 함수로
- 서버: 기존 `outbound-preferences` 라우터 옆에 추가

**② 휴대폰 번호 등록 · 변경** (본인인증 연동 후)
- 제안: `PUT /api/v1/me/phone` `{ "verification_id": "..." }` → `{ "masked_phone": "010-****-5678" }` (본인인증 결과로만 등록)
- 프론트 수정 지점: `ProfileWebView.tsx` 휴대폰 줄 단추

**③ 문자(SMS) 소식 받기 · 그만 받기**
- 이메일과 같은 모양으로 `.../outbound-preferences/sms/consent` · `.../sms/withdraw` (휴대폰 등록 후)

**④ (권장) 전용 재인증**
- `POST /api/v1/auth/reauth` (비밀번호 또는 간편가입 재로그인) → 짧은 재인증 토큰(예: 10분)
- 민감한 변경 API(휴대폰 · 이메일 · 탈퇴)가 이 토큰을 요구하도록
- 프론트 수정 지점: `lib/profile-reauth.ts` 한 곳

---

## 3. 비회원 주문

### 3-1. 지금 상태
- 화면 · 입력 검사 · 개인정보 동의까지 완료. **결제는 지금처럼 로그인해야 열림**(스위치 꺼짐).
- 비회원 주문 조회(`/order-lookup`)는 "준비 중" 안내 + 1:1 문의.
- 1:1 문의는 지금도 로그인 없이 가능(`POST /api/v1/customer-support/inquiries`).

### 3-2. 프론트 파일
| 무엇 | 파일 |
|---|---|
| 연동 함수 · 주소 약속 · 스위치 | **`lib/guest-order.ts`** (`NEXT_PUBLIC_GUEST_ORDER=1`) |
| 주문서 비회원 칸 · 주문 만들기 호출 | `app/checkout/page.tsx` (338행 근처 `createGuestTossOrder`) |
| 결제 성공 후 확인 | `app/checkout/toss/success/page.tsx` (100~103행 근처 `confirmGuestTossPayment`) |
| 주문 로그인(비회원 주문 선택) | `components/guest/CheckoutLoginWeb.tsx` |
| 비회원 주문 조회 · 취소 | `components/guest/GuestOrderLookup.tsx` (72행 조회 · 206행 취소) |
| 회원 주문 만들기(참고 — 같은 모양) | `lib/customer-api.ts` 700행 `createTossTestOrder()` → `POST /api/v1/payments/toss/orders` |
| 미리보기(개발 서버만) | localStorage `ddb.guest.preview` = `"1"` 후 `/order-lookup` — 비밀번호 `wrong…` 틀림 · `lock…` 잠김 · `…prep…` 상품 준비 중(취소 가능) |

### 3-3. 할 일
**① 비회원 주문 만들기**
- `POST /api/v1/payments/toss/guest-orders`
  ```json
  { "lines": [{ "productId": "rw_...", "qty": 1, "color": "블루", "size": "S" }],
    "paymentMethod": "card",
    "delivery": { "recipientName": "...", "phone": "...", "postalCode": "...", "addressLine1": "...", "addressLine2": "...", "deliveryZone": "mainland|jeju|island", "requestCode": "...", "requestNote": "..." },
    "buyer": { "name": "김댕댕", "phone": "010-1234-5678", "email": "a@b.com" },
    "lookup_password": "영문+숫자 6~20자" }
  ```
- `lines` · `paymentMethod` · `delivery` 는 회원 주문(`POST /api/v1/payments/toss/orders`)과 **같은 모양**(`lib/customer-api.ts` 422행 `TossDeliveryDetails`)
- 응답: 회원 주문과 같은 `TossTestOrder` 모양(`orderId` · `amount` · `orderName` · `clientKey` · `customerKey` · `lines` …) **+ `guest_token`**
- **가격은 서버가 다시 계산**(프론트 값을 믿지 않음) · `lookup_password` 는 해시로만 저장

**② 결제 확인**
- `POST /api/v1/payments/toss/guest-orders/confirm` (헤더 `X-Guest-Order-Token`) `{ paymentKey, orderId, amount }` → `{ "orderId": "...", "totalAmount": 78000, "status": "paid" }`

**③ 비회원 주문 조회**
- `POST /api/v1/guest-orders/lookup` `{ "order_number": "...", "lookup_password": "..." }` → `{ "guest_token": "...", "order": GuestOrder }`
  - 틀리면 **404**, 너무 많이 틀리면 **429**(잠김) — 프론트가 이 두 상태로 안내를 고름
  - `GuestOrder` 모양(`lib/guest-order.ts` 197행):
    `orderNumber · orderedAt · status(paid|preparing|shipping|delivered|cancel_requested|cancelled|returned) · buyerName · maskedPhone · email · lines[{name, option, qty, price, image}] · itemsTotal · shippingFee · totalPaid · paymentMethod · delivery{recipientName, maskedPhone, address, requestNote} · tracking{carrier, number, url}|null · cancellable`

**④ 취소 요청**
- `POST /api/v1/guest-orders/{order_number}/cancel` (헤더 `X-Guest-Order-Token`) → 200이면 성공

**⑤ (선택) 비회원 교환 · 반품 전용 API** — 지금은 1:1 문의(주문번호 붙임)로 받음

### 3-4. 서버 제안 위치
- `app\routers\guest_orders.py`(조회 · 취소) · 기존 토스 결제 라우터 옆에 `guest-orders` 두 개
- `app\schemas\guest_order.py` · `app\services\guest_order.py`(토큰 발급 · 비밀번호 해시 · 실패 횟수 잠금)
- 주문 테이블에 `is_guest` · `buyer_name` · `buyer_phone` · `buyer_email` · `lookup_password_hash` 칸

### 3-5. 정책 확인
- 개인정보 수집 · 보관 기간(화면 문구: `lib/guest-order.ts` `GUEST_PRIVACY_ROWS` — 거래 기록 5년)
- 비회원 주문 알림(주문 확인 메일 · 문자) 보낼지

---

## 4. 자사몰 상품 후기 (새 기능)

> 자세한 기획: `docs/09-앱-시안-인계/HANDOFF_20261025_REVIEW_FEATURE_SPEC_DRAFT.md`

### 4-1. 지금 상태
- 상품 상세 "후기" 탭은 **외부 판매처(네이버 등) 후기 + AI 요약만**(읽기 전용).
  - 화면: `components/products/detail/ProductTabs.tsx`(27행 탭 이름 · 414행) → `components/products/detail/ProductReviewPanel.tsx`
  - 불러오기: `GET /api/v1/product-reviews/{folder}` (외부 후기 새로고침)
- 고객이 쓰는 후기 · 저장 주소가 **없음**.
- 등급 혜택에 "리뷰 작성 2배 적립" 문구가 이미 있음: `lib/grades.ts` 28행.

### 4-2. 확정 결정
- **단계적**: 1단계 일반 · 포토(사진 5장) → 2단계 영상 1개(30초 이하 · 소리 지워서 저장)
- 작성 창 하나 + 탭(일반 = 글만 / 포토 = 사진 1장 이상 필수)
- **실제 구매자만** · **배송 완료일부터 90일** · 주문 상품마다 1개
- 적립: 일반 · 포토 같은 금액, 지금은 "2배 적립". **종류별 금액을 관리자가 바꿀 수 있게 설정값으로**
- 작성 즉시 **공개** · 이름 **일부 가림**(김\*댕)
- 상품 상세에서 **"댕다방 구매 후기" / "외부 판매처 후기" 분리**

### 4-3. 할 일(서버)
**① 데이터**
- `product_reviews`: id · product_id · **order_id · order_line_id** · user_id · type(text|photo|video) · rating(1~5) · body · fit_answer(분류별 짧은 평가) · pet_snapshot(견종 · 몸무게 · 고른 사이즈) · option_snapshot(색상 · 사이즈) · status(visible|hidden|deleted) · helpful_count · created_at · updated_at
- `product_review_media`: id · review_id · kind(image|video) · url · width · height · sort · (2단계 duration · poster_url)
- `product_review_reports` · `product_review_helpful`(user · review 하나씩) · `product_review_replies`(판매자 답글)
- 설정: `review_reward_settings`(text_amount · photo_amount · video_amount · multiplier)

**② 작성 자격** — 주문 내역 응답에 아래가 필요함
- 지금 주문 내역 줄(`lib/toss-order-history.ts` `TossOrderHistoryLine`)에는 **줄 id와 배송 완료일이 없음** → 추가 필요
  - `lineId` · `deliveredAt` · `review: { status: "writable|written|expired", reviewId?, deadline }`
- 서버 검사: 본인 주문 · 배송 완료 · 배송 완료일 + 90일 이내 · 그 줄에 후기 없음 · (교환 · 반품 · 환불 처리 — 미정)

**③ 주소 제안**
| 기능 | 주소 |
|---|---|
| 상품 후기 목록 | `GET /api/v1/products/{product_id}/reviews?sort=latest|rating_high|rating_low|helpful&type=photo&cursor=` → `{ items, next_cursor, summary: { average, count, distribution: {5:..,1:..}, photo_count } }` |
| 내가 쓸 수 있는 후기 | `GET /api/v1/me/reviewable-items` → 줄마다 상품 · 옵션 · 기한 |
| 내가 쓴 후기 | `GET /api/v1/me/reviews` |
| 사진 올리기 | `POST /api/v1/reviews/media` (multipart, 사진) → `{ media_id, url }` — 서버에서 크기 줄이기 · EXIF(위치) 지우기 |
| 작성 | `POST /api/v1/reviews` `{ order_line_id, type, rating, body, fit_answer, pet_snapshot, media_ids[] }` → 후기 + `reward: { amount }` |
| 수정 · 삭제 | `PATCH` · `DELETE /api/v1/reviews/{id}` |
| 도움돼요 | `POST /api/v1/reviews/{id}/helpful` (한 번만, 다시 누르면 취소) |
| 신고 | `POST /api/v1/reviews/{id}/report` `{ reason, detail }` |
| 목록 카드용 | 상품 목록 응답에 `review_average` · `review_count` |

- 응답 이름: 작성자 **가린 이름**만(원래 이름 · 이메일 안 보냄)

**④ 적립금**
- 작성 시 지급(종류별 설정 금액 × 배수) · 기존 적립 장부(`rewardPoints` 계열, `lib/customer-api.ts` 61~69행에서 읽는 값)에 기록
- 삭제 시 회수 여부 — **미정**

**⑤ 관리**
- 관리자: 후기 목록 · 검색 · 숨김/되살리기 · 신고 처리 · 판매자 답글 · 적립 설정
- 신고가 쌓이면 자동 숨김(기준 — 미정)

**⑥ 2단계(영상)**
- `POST /api/v1/reviews/media` 에 영상 허용: 30초 · 용량(예: 100MB) · mp4/mov → 서버에서 변환(웹 재생 형식) · **소리 제거** · 썸네일 생성
- 영상 신고 시 즉시 숨김

### 4-4. 서버 제안 위치
- `app\routers\reviews.py` · `app\routers\me_reviews.py`
- `app\schemas\review.py` · `app\services\reviews.py`(자격 검사 · 적립) · `app\services\review_media.py`(사진/영상 처리)
- 관리자 화면은 기존 관리자 구조에 "후기" 메뉴 추가

### 4-5. 프론트(우리)가 서버 준비 후 만들 것 — 참고
- `lib/reviews-api.ts`(새 파일 — 위 주소 함수)
- `components/reviews/ReviewWriteModal.tsx`(작성 창 · 탭 · 사진) · `components/reviews/ProductOwnReviews.tsx`(상품 상세 "댕다방 구매 후기")
- 연결: `components/products/detail/ProductTabs.tsx`(탭 분리) · 마이페이지 주문 내역(`app/mypage/orders/page.tsx`)의 "후기 쓰기" · 상품 카드 별점(`components/products/ProductCard.tsx`)

### 4-6. 아직 정할 것
기본 적립금(2배의 기준) · 교환/반품/환불 상품 후기 · 삭제 시 적립 회수 · 비회원 후기 · 다른 색상/사이즈 후기 묶기 · 글자 수 · 분류별 평가 질문 · 기본 정렬

### 4-7. 확인 필요(법)
- 적립금을 주는 후기의 표시 의무(공정위 추천 · 보증 심사지침)
- 부정적 후기 임의 숨김 · 삭제 금지 — 숨김은 신고 · 운영 기준에 따른 것만
- 사진 · 영상 속 개인정보

---

## 5. 순서 제안
1. **2-① 소식 그만 받기**(작음 · 법적으로 필요)
2. **1-② 이메일 중복 확인 · 1-③ 마케팅 동의 · 1-④ 간편가입 결과 값**(작음)
3. **4. 후기 1단계**(매출 · 신뢰에 직결)
4. **3. 비회원 주문**(결제 · 개인정보 검토 필요)
5. **1-① 본인인증 · 2-② 휴대폰**(인증사 계약 후)
6. **4. 후기 2단계(영상)**

## 6. 관련 문서
- `HANDOFF_20261024_WEB_SIGNUP_FLOW_READY.md` — 가입 화면 흐름 자세히
- `HANDOFF_20261025_SIGNUP_GUEST_ORDER_READY.md` — 가입 · 개인정보 · 비회원 주문 화면 자세히
- `HANDOFF_20261025_REVIEW_FEATURE_SPEC_DRAFT.md` — 후기 기획 자세히
