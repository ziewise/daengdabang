# 웹 새 회원가입 흐름 — 프론트 완료, 연동 자리 인계 (2026-10-24)

## 1. 사용자 요청과 배경

- 사용자: "우리 회원가입이 너무 허술하고 단순해 … 일반 회원과 간편 가입이 있고 각 가입 방식마다 거치는 단계들 … 본인 인증, 휴대폰 인증, 카카오 간편가입은 카카오 쪽 인증 방식 등"
- 사용자: "프론트 구현해 놓으면 거기에 맞춰서 인증사와 계약 및 기능 구현해서 연동할거야."
- 사용자: "이메일 등록은 회원 가입할 때 진행하지 않아도 괜찮아" → 이메일 인증(20C 혜택)은 가입 단계에서 빼고, 마이페이지 코인 탭에서 받는다.
- 범위: **웹 화면만**. 앱(`html.ddb-app-mode`)은 기존 한 장짜리 가입 화면 그대로. 가입 · 로그인 · 사진 분석 · 반려견 저장 함수는 기존 것을 그대로 부름(새 서버 주소를 부르는 곳은 아래 "스위치"가 켜질 때만).

## 2. 화면 흐름

### 이메일 가입
가입 방법 → ① 약관 동의 → (② 휴대폰 본인인증 — 스위치 켜지면) → ③ 계정 정보 → ④ 우리 아이(지금/나중) + 가입 보안 확인 → 완료

### 간편 가입(카카오 · 네이버 · 구글)
가입 방법 → ① 약관 동의 + 가입 보안 확인(Turnstile) → ② 공급자 로그인 · 동의(공급자 화면) → ③ 정보 확인 → ④ 우리 아이 → 완료
- ①은 지금 서버가 간편가입 시작 때 `bot_token` · `terms_version` · `privacy_version` 을 요구하기 때문에 공급자로 가기 **전에** 받음(기존과 같음).
- ③부터는 `/auth/social-callback` 에서 웹일 때만 새 화면(`SocialSignupWebFinish`).
- ④는 마이페이지와 같은 반려견 등록 창(`MemberPetProfileCreateForm`)을 그대로 씀.

### 갈림길(모두 화면 있음)
| 갈림길 | 지금 동작 | 연동 후 |
|---|---|---|
| 회원가입 준비 중(API 없음) | 안내 + 단추 꺼짐 | — |
| 간편가입 공급자 준비 중 · 연결 확인 실패 | 공급자 단추에 "준비 중" · 다시 확인 | — |
| 약관 보기(만 14세 · 이용약관 · 개인정보 · 마케팅 · 반려동물) | 창으로 요약 · 표 · 전문 링크 | — |
| 필수 동의 안 함 | 다음 단추 누르면 안내 | — |
| 본인인증 취소 · 시간 초과 · 실패 | — | 안내 + 다시 하기 |
| 본인인증: 이미 가입한 사람(CI) | — | 가린 계정 · 가입 방식 + 로그인/비밀번호 찾기 |
| 본인인증: 만 14세 미만 | — | 가입 막음 안내 |
| 본인인증: 탈퇴 후 재가입 제한 | — | 다시 가입 가능한 날짜 + 1:1 문의 |
| 이메일 형식 · 비밀번호 8자 · 72바이트 · 확인 불일치 | 칸 아래 안내, 다음 단추 막음 | — |
| 이메일 중복 | 가입하기 때 409 → "이미 가입된 이메일" 카드(로그인 · 비밀번호 찾기 · 다른 이메일로) | 계정 정보 단계에서 "중복 확인" 단추 |
| 가입 불가 이메일(`signup_email_domain_not_allowed`) | 카드 + 이메일 바꾸기 | — |
| 우리 아이 정보 + 선택 동의 없음 | 기존 검사 문구 그대로 | — |
| 보안 확인 만료 · 실패 | 기존 위젯 · 기존 문구 | — |
| 서버가 이메일 확인 후 계정 열기(activation) 방식 | 기존 확인 화면 그대로(웹도) | — |
| 간편가입 동의 취소 | `error=cancelled/access_denied/…` 오면 카드 | 서버가 값 붙여야 함 |
| 간편가입: 같은 이메일로 이미 가입 | `error=email_exists` 오면 카드(로그인 · 비밀번호 찾기) | 서버가 값 붙여야 함 |
| 간편가입: 이미 가입된 간편 계정 | `signup_status=existing` 오면 "다시 만나서 반가워요" | 서버가 값 붙여야 함 |
| 간편가입: 이메일을 못 받음(카카오 등) | 안내 + 완료 화면 "이메일 등록하고 +20C" | — |
| 완료: 마케팅 수신 동의 결과 안내(정보통신망법) | — | 저장 후 처리 날짜 · 채널 표시 |

## 3. 소스

- `app/auth/signup/page.tsx` — 웹이면 `SignupWebFlow`, 앱이면 기존 화면. 바뀐 점: `submit(event, { skipPet })`(웹 "나중에" 고르면 반려견 저장 안 함), 409 · 가입 불가 이메일을 갈림길로 알려 주는 `errorKind`, 견종 고르기를 `selectBreed` 로 꺼냄(동작 같음), 사진 방향 · 관심 케어 목록을 새 화면에 넘겨줌.
- `components/auth/signup-web/SignupWebFlow.tsx` — 단계 화면 본체.
- `components/auth/signup-web/SignupWebParts.tsx` — 머리 · 단계 줄 · 약관 판 · 약관 창 · 본인인증 판 · 완료 화면.
- `components/auth/signup-web/SocialSignupWebFinish.tsx` — 간편가입 돌아옴 화면 · 갈림길 카드.
- `components/auth/signup-web/SignupPetFields.tsx` — "우리 아이" 입력(우리 아이 카드 · 사진 팁 · 사진 후보 카드 · 자주 고르는 견종 · 아이콘 알약 · 털 색).
- 화면 틀: 위 머리 + 가로 단계 줄 + 가운데 카드 하나(사용자 요청으로 왼쪽 안내판 대신).
- `app/auth/social-callback/page.tsx` — 웹이면 위 화면. 로그인 · 토큰 · 가입 기록 동작 그대로.
- `components/auth/SocialAuthButtons.tsx` — 공급자 상태 확인 · 시작 동작을 `useSocialProviderStatus` · `beginSocialAuth` 로 꺼냄(동작 같음).
- `lib/signup-flow.ts` — **연동 자리**(아래).
- `hooks/useWebScreen.ts` — 웹 화면인지.
- `app/signup-web.css` — 꾸밈.

## 4. 연동 자리 — `lib/signup-flow.ts`

빌드 환경 변수 스위치(기본 꺼짐 → 그 단계 · 칸이 화면에 안 나옴):

| 스위치 | 켜면 | 협업자가 만들 것 |
|---|---|---|
| `NEXT_PUBLIC_SIGNUP_IDENTITY=1` | 이메일 가입 ② 본인인증 단계 + 간편가입 ③에 본인인증 칸 | 인증사 계약(NICE · KCB · PASS 등) · 아래 주소 둘 · 가입 요청에 `verification_id` 받기 · 같은 CI 중복 막기 · 만 14세 미만 막기 · 재가입 제한 |
| `NEXT_PUBLIC_SIGNUP_EMAIL_CHECK=1` | 계정 정보 "중복 확인" 단추 | 아래 주소 하나 |
| `NEXT_PUBLIC_SIGNUP_MARKETING=1` | 약관에 마케팅 수신 동의(이메일 · 문자) + 완료 화면 처리 결과 | 아래 주소 하나 · 회원 정보에 동의 여부 · 날짜 저장 · 마이페이지에서 바꾸기 |

함수와 약속한 주소(이름 · 모양은 협업자가 바꿔도 됨 — 바꾸면 이 파일만 고치면 됨):

1. `startIdentityVerification()`
   - `POST /api/v1/auth/identity-verifications` → `{ verification_id, auth_url }`
   - 프론트가 `auth_url` 을 새 창으로 열고 `GET /api/v1/auth/identity-verifications/{id}` 를 2초마다 물음(10분 넘으면 시간 초과, 창 닫으면 취소)
   - 끝나면 `{ status: verified|cancelled|expired|failed, name, birth_date(YYYY-MM-DD), masked_phone, carrier, over_14, existing_account: { masked_account, provider } | null, rejoin_blocked_until | null, message }`
   - **할 일**: 가입 요청(`signupCustomer`)에 `verification_id` 를 함께 보내도록 `lib/customer-api.ts` 와 서버 가입 API 를 고쳐야 서버에서 강제됨(지금은 프론트가 결과만 화면에 씀).
2. `checkSignupEmail(email)` — `POST /api/v1/auth/email-availability` `{ email }` → `{ available: boolean }`(이메일을 주소창에 싣지 않으려고 POST)
3. `saveMarketingConsent(token, { email, sms })` — `PUT /api/v1/me/marketing-consent` → `{ processed_at }`
4. `readSocialReturnKind(params)` — 간편가입 돌아옴 주소에 서버가 붙일 값
   - 새 가입이면 `signup_status=new`, 이미 가입된 간편 계정이면 `signup_status=existing`
   - 실패면 토큰 없이 `error=cancelled|access_denied|email_exists|…`

## 5. 서버 설정 · 정책 확인 필요

- **가입 이메일 인증을 가입 단계에서 빼려면 서버가 "보너스 방식"이어야 함**: 가입 응답 `email_verification_required: false` → 바로 로그인 → 완료 화면. `true`(activation)면 웹도 기존 "이메일 확인 후 계정 열기" 화면이 나옴.
- 가입할 때 서버가 가입 이메일로 인증번호를 자동 발송하는지 확인 — 이제 가입 단계에서 번호를 넣지 않으므로, 마이페이지 코인 탭에서 사용자가 "인증번호 받기"를 누를 때 보내는 쪽이 자연스러움.
- 카카오: 이메일 · 전화번호를 받으려면 비즈 앱 전환 · 검수 필요. 카카오싱크(약관 동의를 카카오 화면에서 한 번에)를 쓰면 ① 약관 단계를 줄일 수 있음 — 지금 서버는 시작 때 동의 버전을 받으므로 그대로 둠.
- 네이버는 휴대폰 번호 제공 가능, 구글은 이름 · 이메일만.
- 간편가입 + 본인인증을 같이 받을지(한 사람 한 계정 정책) 결정 필요 — 스위치를 켜면 간편가입 ③에서도 본인인증을 요구함.
- 반려동물 사진을 해외 AI 서비스로 보낸다면 국외 이전 고지 문구가 필요한지 법무 확인(프론트에 임의 문구를 넣지 않았음).
- 이후 후보: 휴대폰 본인인증으로 계정 찾기, 간편 계정 ↔ 이메일 계정 연결.

## 6. 검증(2026-10-24, 개발 서버 + 미리보기용 가짜 서버)

- 이메일 가입 전체(약관 → 본인인증 미리보기 → 계정 정보 → 우리 아이 지금 등록 → 가입 → 로그인 → 반려견 저장 → 완료) PC 1374 · 모바일 390 촬영.
- 갈림길: 약관 미동의 · 본인인증 취소/실패/이미 가입/만 14세 미만/재가입 제한 · 이메일 중복(단추) · 비밀번호 짧음/불일치 · 간편가입 약관 + 보안 확인 · 간편가입 돌아옴(정보 확인 → 우리 아이 → 완료, 취소, 이미 이메일 가입) 촬영.
- 개발 미리보기: `npm run dev` 에서 `localStorage["ddb.signup.preview"] = '{"identity":"ok"}'` (값: `identity` ok/duplicate/under14/rejoin/cancelled/failed/expired, `email` ok/taken, `social` new/existing/email_exists/cancelled/no_email). **배포 빌드에서는 읽지 않음.**
- 개발 서버 보안 확인: `.env.development.local` 에 Cloudflare 공식 테스트 키(항상 통과) — 개발에서만 읽힘, 저장소에 안 올라감(.gitignore).
- 앱 화면 비교(390): 가입 화면 변화 없음 · `npm test` · 타입 검사 · 린트 통과(아래 커밋 참고).
- 미검증: 실제 인증사 · 실제 카카오/네이버/구글 왕복, 운영 Turnstile 키.
