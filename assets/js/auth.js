/* =====================================================================
 * auth.js
 * ---------------------------------------------------------------------
 * 로그인·회원가입·비밀번호 찾기 페이지의 임시(Mock) 동작 처리.
 *
 *   - 로그인 폼: 입력 검증 없이 main.html 로 이동
 *   - 소셜 로그인 버튼: 짧은 로딩 → main.html 로 이동
 *   - 회원가입 stepper: 단계 전환, 검증 없이 모두 통과
 *   - 본인인증: "인증번호 받기" 클릭 시 화면에 코드 표시 (123456)
 *   - 전체 동의 체크박스: 자식 체크박스 토글
 *   - 비밀번호 찾기: submit 시 발송 완료 화면으로 전환
 *
 * 백엔드 연동 시 변경 지점 (TODO 주석으로 표시):
 *   - 로그인 form submit → 실제 API 호출
 *   - 소셜 로그인 → OAuth 리다이렉트
 *   - 본인인증 → NICE·KCB API
 *   - 이메일 중복확인 → API
 *   - 가입 완료 → 사용자 생성·세션 발급
 *
 * 페이지별로 일부 로직만 작동 (해당 DOM 없으면 자동 skip).
 * ===================================================================== */

(() => {
    // ============ 1. 로그인 페이지 (login.html) ============

    /** 로그인 상태를 localStorage 에 저장 (페이지 이동 시 유지) */
    const LOGIN_KEY = 'daengdabang_logged_in';
    function setLoggedIn(provider = 'email') {
        localStorage.setItem(LOGIN_KEY, JSON.stringify({ provider, ts: Date.now() }));
        // 비회원 상태에서 펫렌즈 분석한 결과가 있으면 → 회원 펫 목록으로 이관
        migratePendingPet();
    }

    /**
     * 비회원 → 회원 전환 시: daengdabang_pet_pending 에 보관된 분석 결과를
     * daengdabang_pets 회원 목록 끝에 추가하고 pending 키 삭제.
     * 펫 ID 중복 가능성이 거의 없지만 안전하게 findIndex 로 체크.
     */
    function migratePendingPet() {
        try {
            const pendingRaw = localStorage.getItem('daengdabang_pet_pending');
            if (!pendingRaw) return;
            const pending = JSON.parse(pendingRaw);
            const list = JSON.parse(localStorage.getItem('daengdabang_pets') || '[]');
            const exists = list.some((p) => p.id === pending.id);
            if (!exists) list.push(pending);
            localStorage.setItem('daengdabang_pets', JSON.stringify(list));
            localStorage.removeItem('daengdabang_pet_pending');
        } catch (e) {
            console.warn('Pet migration skipped:', e);
        }
    }

    /** 로그인 폼 submit — 임시: 검증 없이 로그인 처리 후 main 으로 이동 */
    const loginForm = document.getElementById('login-form');
    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        // TODO: 실제 로그인 API 호출 (POST /api/login)
        //       성공 시 main.html, 실패 시 에러 메시지
        setLoggedIn('email');
        window.location.href = 'main.html';
    });

    // ============ 2. 소셜 로그인 (로그인 페이지) ============

    /**
     * 소셜 로그인 버튼 클릭 — 임시: 로딩 표시 후 main 으로 이동
     * 실제 동작은 OAuth 리다이렉트 + 콜백에서 처리.
     */
    document.querySelectorAll('[data-social]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const provider = btn.dataset.social;   // google | kakao | naver
            const label = btn.querySelector('span');
            const icon = btn.querySelector('i');
            // 로딩 표시
            btn.classList.add('loading');
            label.textContent = `${provider === 'google' ? 'Google' : provider === 'kakao' ? '카카오' : '네이버'} 인증 중...`;
            icon.className = 'fa-solid fa-spinner';
            // TODO: 실제 OAuth 리다이렉트
            //   window.location.href = `/auth/${provider}`;
            // 임시: 800ms 후 main 으로
            setTimeout(() => {
                setLoggedIn(provider);
                window.location.href = 'main.html';
            }, 800);
        });
    });

    // ============ 3. 회원가입 stepper (signup.html) ============

    const stepper = document.getElementById('stepper');
    const steps = document.querySelectorAll('.signup-step');
    let currentStep = 1;
    const TOTAL_STEPS = steps.length || 5;

    /** 지정 단계로 이동 + Stepper UI 갱신 */
    function goToStep(n) {
        if (n < 1 || n > TOTAL_STEPS) return;
        currentStep = n;
        steps.forEach((s) => {
            s.classList.toggle('active', parseInt(s.dataset.step, 10) === n);
        });
        document.querySelectorAll('.step-dot').forEach((dot) => {
            const step = parseInt(dot.dataset.step, 10);
            dot.classList.toggle('active', step === n);
            dot.classList.toggle('done', step < n);
        });
        // 페이지 최상단 스크롤 (단계 전환 시 카드 위쪽 보이게)
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 다음/이전 버튼
    document.querySelectorAll('[data-next]').forEach((btn) => {
        btn.addEventListener('click', () => {
            // TODO: 현재 단계 검증 로직 추가
            //       Step 1: 필수 약관 체크 확인
            //       Step 2: 본인인증 완료 확인
            //       Step 3: 이메일 형식·비번 강도·일치 확인
            //       Step 4: 검증 없음 (선택 단계)
            goToStep(currentStep + 1);
        });
    });
    document.querySelectorAll('[data-prev]').forEach((btn) => {
        btn.addEventListener('click', () => goToStep(currentStep - 1));
    });

    // ============ 4. 약관 동의 — 전체 동의 / 개별 연동 ============

    const termsAll = document.getElementById('terms-all');
    const termItems = document.querySelectorAll('.term-item');

    /** 전체 동의 체크 → 모든 개별 항목 일괄 토글 */
    termsAll?.addEventListener('change', () => {
        termItems.forEach((c) => { c.checked = termsAll.checked; });
    });

    /** 개별 항목 변경 → 전체가 체크돼있으면 전체동의 자동 체크, 하나라도 빠지면 해제 */
    termItems.forEach((c) => {
        c.addEventListener('change', () => {
            const allChecked = [...termItems].every((x) => x.checked);
            if (termsAll) termsAll.checked = allChecked;
        });
    });

    // ============ 5. 본인인증 — 임시 코드 표시 ============

    const btnSendCode = document.getElementById('btn-send-code');
    const phoneCodeField = document.getElementById('phone-code-field');
    const mockCodeHint = document.getElementById('mock-code-hint');
    const btnVerifyCode = document.getElementById('btn-verify-code');

    btnSendCode?.addEventListener('click', () => {
        // TODO: 실제 SMS 발송 API 호출
        //       POST /api/auth/send-sms { phone }
        if (phoneCodeField) phoneCodeField.style.display = '';
        if (mockCodeHint) mockCodeHint.style.display = '';
        btnSendCode.textContent = '재발송';
    });

    btnVerifyCode?.addEventListener('click', () => {
        // TODO: 실제 인증번호 검증 API
        //       POST /api/auth/verify-sms { phone, code }
        //       임시: 어떤 값이든 통과
        btnVerifyCode.textContent = '✓ 인증 완료';
        btnVerifyCode.style.background = '#22c55e';
        btnVerifyCode.disabled = true;
        const codeInput = document.getElementById('phone-code');
        if (codeInput) codeInput.disabled = true;
    });

    // ============ 6. 이메일 중복확인 ============

    document.getElementById('btn-check-email')?.addEventListener('click', () => {
        // TODO: GET /api/auth/check-email?email=...
        //       이메일 형식 검증 + 중복 체크
        //       임시: 항상 사용 가능
        alert('사용 가능한 이메일입니다. (임시 모드)');
    });

    // ============ 7. 비밀번호 찾기 (forgot-password.html) ============

    const forgotForm = document.getElementById('forgot-form');
    const forgotFormStep = document.getElementById('forgot-form-step');
    const forgotSentStep = document.getElementById('forgot-sent-step');

    forgotForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        // TODO: 실제 비밀번호 재설정 메일 발송 API
        //       POST /api/auth/forgot-password { email }
        if (forgotFormStep) forgotFormStep.style.display = 'none';
        if (forgotSentStep) forgotSentStep.style.display = '';
    });

    document.getElementById('btn-resend')?.addEventListener('click', () => {
        // TODO: 재발송 API
        alert('재발송 완료. 이메일을 다시 확인해주세요. (임시 모드)');
    });

    // ============ 8. 회원가입 완료 후 자동 로그인 ============
    //   Step 5 의 "쇼핑 시작하기" 링크 클릭 시 localStorage 에 로그인 상태 저장
    //   (가입 = 즉시 로그인)
    document.querySelectorAll('.signup-step[data-step="5"] a[href="main.html"]').forEach((link) => {
        link.addEventListener('click', () => setLoggedIn('signup'));
    });

    // ============ 9. 펫 정보 라디오 — 클릭 영역 확장 ============
    // (auth-check 라벨 자체가 클릭 가능해 라디오까지 처리됨)

})();
