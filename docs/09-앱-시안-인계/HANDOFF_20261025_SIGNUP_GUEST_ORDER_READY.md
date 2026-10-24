# 회원가입 · 개인정보 · 비회원 주문 — 프론트 완료, 서버 연동 인계 (2026-10-25)

> 협업자(서버 · 결제 · 인증사 담당)에게 전달하는 문서. 웹 화면은 다 만들어 두었고, 서버가 없는 기능은 **스위치가 꺼져 있어 화면에 "준비 중"으로만 나오거나 숨겨져 있음**(가짜 성공 없음).
> 앞 문서 `HANDOFF_20261024_WEB_SIGNUP_FLOW_READY.md`의 내용을 이 문서가 포함 · 갱신함.

## 0. 한눈에

| 영역 | 화면(웹) | 지금 동작 | 서버에서 할 일 |
|---|---|---|---|
| 회원가입(이메일) | 가입 방법 → 약관 → (본인인증) → 계정 정보 → 우리 아이 → 완료 | 기존 가입 API로 실제 가입 · 로그인 · 반려견 저장까지 동작 | 본인인증 · 이메일 중복 확인 · 마케팅 동의 저장(스위치 3개) |
| 간편가입(카카오 · 네이버 · 구글) | 약관 + 보안 확인 → 공급자 → 정보 확인 → 우리 아이 → 완료 | 기존 간편가입 API로 동작 | 돌아올 때 결과 값(signup_status · error) 붙이기 |
| 개인정보 확인/수정 | 한 번 더 확인 → 내 카드 · 탭(내 정보 · 로그인 보안 · 알림 수신) | 이름 · 비밀번호 변경 · 이메일 인증 상태 · 이메일 소식 받기 모두 기존 API | 전용 재인증 · 휴대폰 등록 · 소식 수신 거부 API(선택) |
| 비회원 주문 | 주문 로그인 → 주문서 비회원 칸 → 결제 → 비회원 주문 완료 | 화면 · 입력 검사까지. **결제는 지금처럼 로그인해야 열림** | 비회원 주문 만들기 · 결제 확인 API |
| 비회원 주문 조회 | /order-lookup — 조회 → 진행 상황 · 상품 · 결제 · 배송 · 취소 · 교환 · 반품 · 문의 | 화면만. "준비 중" 안내 + 1:1 문의 | 조회 · 취소 API |

스위치(빌드 환경 변수, 모두 기본 꺼짐):

```
NEXT_PUBLIC_SIGNUP_IDENTITY=1     # 휴대폰 본인인증 단계
NEXT_PUBLIC_SIGNUP_EMAIL_CHECK=1  # 이메일 중복 확인 단추
NEXT_PUBLIC_SIGNUP_MARKETING=1    # 마케팅 수신 동의 칸 + 저장
NEXT_PUBLIC_GUEST_ORDER=1         # 비회원 결제 · 조회 · 취소
```

## 1. 회원가입

### 화면 · 갈림길
- 위 머리 판 + 가로 단계 줄 + 단계 카드(기존 웹 파스텔 결). 앱은 기존 한 장 화면 그대로.
- 이메일 가입 갈림길: 약관 미동의 · 본인인증(취소 · 실패 · 시간 초과 · 이미 가입(CI) · 만 14세 미만 · 재가입 제한) · 이메일 형식 · 중복(단추 또는 가입 때 409) · 가입 불가 이메일(`signup_email_domain_not_allowed`) · 비밀번호 8자/72바이트/확인 · 우리 아이 지금/나중 · 반려동물 선택 동의 · 보안 확인 만료 · 완료(이메일 인증 20C 안내 · 마케팅 수신 결과).
- 간편가입 갈림길: 동의 취소 · 같은 이메일로 이미 가입 · 이미 가입된 간편 계정 · 이메일 못 받음.

### 연동 자리 — `lib/signup-flow.ts`
1. **본인인증** `startIdentityVerification()`
   - `POST /api/v1/auth/identity-verifications` → `{ verification_id, auth_url }`
   - 프론트가 `auth_url` 새 창을 열고 `GET /api/v1/auth/identity-verifications/{id}`를 2초마다 확인(10분 시간 초과, 창 닫으면 취소)
   - 결과: `{ status, name, birth_date, masked_phone, carrier, over_14, existing_account: { masked_account, provider } | null, rejoin_blocked_until, message }`
   - **할 일**: 가입 요청(`signupCustomer`)에 `verification_id`를 받아 서버에서 강제(같은 CI 중복 · 만 14세 미만 · 재가입 제한). 지금 프론트는 결과를 화면에만 씀.
   - 입력(이름 · 생년월일 · 휴대폰 · 문자/PASS)은 **인증기관 표준창**에서 함. 댕다방은 주민등록번호를 받지 않음.
2. **이메일 중복 확인** `checkSignupEmail(email)` — `POST /api/v1/auth/email-availability { email }` → `{ available }`
3. **마케팅 수신 동의 저장** `saveMarketingConsent(token, { email, sms })` — `PUT /api/v1/me/marketing-consent` → `{ processed_at }`(완료 화면에 정보통신망법 수신 동의 결과 안내로 씀)
4. **간편가입 돌아옴 값** `readSocialReturnKind(params)` — 콜백 주소에 `signup_status=new|existing`, 실패 시 토큰 없이 `error=cancelled|access_denied|email_exists|…`

### 서버 설정 · 정책
- 가입 단계에서 이메일 인증을 받지 않으려면 가입 응답이 **보너스 방식**(`email_verification_required: false`)이어야 함. activation 방식이면 웹도 기존 "이메일 확인 후 계정 열기" 화면이 나옴.
- 가입 직후 인증번호 자동 발송 여부 확인 — 이제 마이페이지 코인 탭에서 사용자가 "인증번호 받기"를 누를 때 보내는 쪽이 자연스러움.
- 카카오 이메일 · 전화번호는 비즈 앱 검수 필요. 카카오싱크를 쓰면 약관 단계를 줄일 수 있음.
- 간편가입에도 본인인증을 받을지(한 사람 한 계정) 결정 필요.
- 반려동물 사진이 해외 AI로 간다면 국외 이전 고지 문구를 법무 확인(프론트에 임의 문구 없음).

## 2. 개인정보 확인/수정(`/mypage/profile`, 웹)

- **한 번 더 확인**: 이메일 회원은 기존 `POST /api/v1/auth/login`으로 비밀번호를 서버에서 검사(새 토큰은 쓰지 않음), 간편가입은 공급자 로그인을 다시 거침(`?reauth=1`로 돌아오면 떠나기 전 토큰과 달라야 통과). 확인 표시는 이 탭(sessionStorage)에 10분. 비밀번호는 저장하지 않음. — `lib/profile-reauth.ts`
  - **권장**: 전용 재인증 주소(`POST /api/v1/auth/reauth` → 짧은 재인증 토큰)를 만들고, 민감한 변경 API가 그 토큰을 요구하도록. 지금은 화면 잠금(비밀번호 변경은 서버가 현재 비밀번호를 다시 검사함).
- 내 정보: 이름(`PATCH /api/v1/auth/me`) · 이메일 인증 상태(`GET /api/v1/auth/me` 의 `email_verified_at`) · 이메일/계정 변경(1:1 문의 창) · 휴대폰(준비 중 — 본인인증 연동 후 등록 · 변경 API 필요).
- 로그인 · 보안: 비밀번호 변경(`POST /api/v1/auth/change-password`, 성공 시 로그아웃 → 로그인 화면).
- 알림 수신: 이메일 소식 상태 · 받기(`/api/v1/growth/outbound-preferences`). **그만 받기 API가 없어 1:1 문의로 안내 중** → `POST /api/v1/growth/outbound-preferences/email/withdraw` 같은 철회 API 필요. 문자(SMS) 소식은 준비 중.

## 3. 비회원 주문

### 화면 흐름(웹)
1. 장바구니 → 결제하기(비로그인) → `/auth/login?redirect=/checkout` 이 **주문 로그인** 화면으로 바뀜(웹만): 회원으로 주문(로그인 · 간편로그인) / 비회원으로 주문 / 회원가입(20C) / 비회원 주문 조회.
2. 비회원으로 주문 → 이 탭에 "비회원 주문 중" 표시 → 주문서 왼쪽 맨 위 **주문하는 분(비회원)**: 이름 · 휴대폰 · 이메일 · 주문 조회 비밀번호(영문 · 숫자 6~20자 + 확인) · [필수] 비회원 주문 개인정보 수집 · 이용 동의(내용 펼침) · "받는 분도 같아요"(배송지 채움).
   - 로그인 안 한 채 주문서에 바로 오면 "회원으로 주문 / 비회원으로 계속" 고르기 카드.
3. 결제(스위치 켜졌을 때만) → 토스 결제창 → `/checkout/toss/success`에서 비회원 결제 확인 → **비회원 주문 완료**(주문번호 · 복사 · 조회 방법 · 회원가입 안내).
4. `/order-lookup` **비회원 주문 조회**: 주문번호 + 조회 비밀번호 → 진행 4단계 · 송장 · 상품 · 결제 · 배송 정보 · 배송 조회 · 주문 취소(준비 전까지) · 교환 · 반품 · 1:1 문의(주문번호가 붙은 문의 창).
   - 링크: 주문 로그인 · 일반 로그인(웹) · 마이페이지 로그인 안내(웹) · 비회원 주문 완료.
5. 1:1 문의는 지금도 로그인 없이 가능(`/api/v1/customer-support/inquiries`).

### 연동 자리 — `lib/guest-order.ts`
1. 주문 만들기 `createGuestTossOrder(payload, buyer)`
   - `POST /api/v1/payments/toss/guest-orders` `{ lines, paymentMethod, delivery, buyer: { name, phone, email }, lookup_password }`
   - → 회원 주문과 같은 `TossTestOrder` 모양 + `guest_token`(이 주문만 다루는 짧은 토큰)
   - 조회 비밀번호는 **해시 저장**, 시도 횟수 제한.
2. 결제 확인 `confirmGuestTossPayment({ paymentKey, orderId, amount }, guestToken)`
   - `POST /api/v1/payments/toss/guest-orders/confirm` (헤더 `X-Guest-Order-Token`) → `{ orderId, totalAmount, status }`
   - 주문 완료 메일(주문번호 · 조회 방법)을 주문자 이메일로 발송.
3. 조회 `lookupGuestOrder(orderNumber, lookupPassword)`
   - `POST /api/v1/guest-orders/lookup { order_number, lookup_password }` → `{ guest_token, order }`
   - 틀리면 404, 너무 많이 틀리면 429. 주소창에 주문번호 · 비밀번호를 싣지 않으려고 POST.
   - `order` 모양: `{ orderNumber, orderedAt, status(paid|preparing|shipping|delivered|cancel_requested|cancelled|returned), buyerName, maskedPhone, email, lines[{name, option, qty, price, image}], itemsTotal, shippingFee, totalPaid, paymentMethod, delivery{recipientName, maskedPhone, address, requestNote}, tracking{carrier, number, url} | null, cancellable }` (연락처 · 주소는 가려서)
4. 취소 요청 `requestGuestOrderCancel(orderNumber, guestToken)` — `POST /api/v1/guest-orders/{order_number}/cancel` (헤더 `X-Guest-Order-Token`)
5. 교환 · 반품 · 문의는 기존 1:1 문의(주문번호 붙임). 비회원 교환 · 반품 전용 API가 생기면 조회 화면 단추를 그쪽으로.

### 정책 확인 필요
- 비회원 개인정보 수집 · 이용 동의 문구(`GUEST_PRIVACY_ROWS`) 법무 확인.
- 비회원 주문 조회 비밀번호 대신 휴대폰 인증으로 조회할지(본인인증 연동 후 선택 가능).
- 비회원은 코인 · 적립금 · 맞춤 추천 없음(화면에 그렇게 안내 중).
- 비회원 주문을 나중에 가입한 계정으로 옮길지(같은 이메일 · 휴대폰).

## 4. 소스

- 회원가입: `app/auth/signup/page.tsx`, `components/auth/signup-web/*`(SignupWebFlow · SignupWebParts · SignupPetFields · SocialSignupWebFinish · SignupDevPanel), `app/auth/social-callback/page.tsx`, `app/signup-web.css`, `lib/signup-flow.ts`, `hooks/useWebScreen.ts`
- 개인정보: `app/mypage/profile/page.tsx`, `components/mypage/ProfileWebView.tsx`, `lib/profile-reauth.ts`, `lib/member-name.ts`, `app/mypage-web.css`(개인정보 칸)
- 비회원: `lib/guest-order.ts`, `components/guest/*`(CheckoutLoginWeb · GuestCheckoutPanel · GuestOrderLookup · GuestOrderDone), `app/order-lookup/page.tsx`, `app/checkout/page.tsx`(비회원 칸 · 결제 분기), `app/checkout/toss/success/page.tsx`(비회원 확인), `app/auth/login/page.tsx`(주문 로그인 분기), `app/guest-web.css`

## 5. 개발 미리보기(배포 빌드에는 없음)

- 회원가입 단계 바로 보기: `http://localhost:4000/auth/signup/?sxpreview` (가짜 서버 localhost:8010 자동 연결, 왼쪽 아래 판)
- 비회원 조회 미리보기: 개발 서버에서 `localStorage["ddb.guest.preview"]="1"` 후 `/order-lookup` — 비밀번호 `wrong…` 틀림, `lock…` 잠김, `…prep…` 상품 준비 중(취소 가능)
- 비회원 주문 완료 미리보기: `/checkout/toss/success/?sxguestdone`
- 개발 서버 Turnstile: `.env.development.local`에 Cloudflare 공식 테스트 키(배포 빌드는 안 읽음)

## 6. 검증

- 가짜 서버로 이메일 가입 전체(가입 → 로그인 → 반려견 저장 → 완료) · 간편가입 돌아옴 화면 · 개인정보(틀린 비밀번호 · 이름 · 비밀번호 변경 · 소식 받기) · 비회원 주문 로그인 · 주문서 비회원 칸 · 조회(틀림 · 결과) · 완료 화면을 PC 1374 · 모바일 390으로 촬영.
- `npm test` 930개 통과 · 타입 검사 · 린트(바뀐 파일) 통과. 앱 화면(390) 가입 · 개인정보 · 주문서 · 로그인(일반 · 주문) · 마이페이지 로그인 안내 · 결제 완료는 바뀌지 않음(전후 픽셀 비교 차이 없음).
- 미검증: 실제 인증사 · 실제 소셜 왕복 · 실제 비회원 결제(서버 없음) · 운영 Turnstile 키.
