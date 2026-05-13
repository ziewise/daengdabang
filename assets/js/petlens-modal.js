/* =====================================================================
 * petlens-modal.js
 * ---------------------------------------------------------------------
 * 메인 페이지의 펫렌즈 FAB + 모달 로직.
 *
 *   1. FAB 클릭 → 모달 열림 (첫 화면: 입력 방식 선택)
 *   2. "촬영하기" 또는 "불러오기" 선택 → 슬롯 3개 노출
 *   3. 슬롯 클릭 시 선택한 방식으로 즉시 동작 (옵션 시트 없음)
 *      - 촬영 모드: 카메라 라이브 뷰 + 부위별 가이드 실루엣
 *      - 파일 모드: 파일 선택 다이얼로그
 *   4. 분석 시작 → 가짜 단계별 진행 → 결과 요약
 *   5. "입력 방식 변경" 으로 모드 다시 선택 가능
 *
 * 부위별 가이드:
 *   - 슬롯 0: 얼굴 (정면 클로즈업) — 얼굴 정면 SVG 가이드
 *   - 슬롯 1: 측면 (옆) — 측면 실루엣 SVG 가이드
 *   - 슬롯 2: 정면 (전체) — 정면 전신 SVG 가이드
 *
 * 카메라 권한·HTTPS 주의:
 *   - getUserMedia 는 HTTPS / localhost 에서만 작동
 *   - LAN IP HTTP 환경에서 거부 시 안내 메시지 표시
 * ===================================================================== */

(() => {

    // ============ DOM 참조 ============
    const fab = document.getElementById('petlens-fab');
    const modal = document.getElementById('petlens-modal');
    const overlay = document.getElementById('petlens-modal-overlay');
    const closeBtn = modal?.querySelector('.petlens-modal-close');
    const cameraView = document.getElementById('camera-view');
    const cameraVideo = document.getElementById('camera-video');
    const cameraError = document.getElementById('camera-error');
    const cameraTargetLabel = document.getElementById('camera-target-slot');
    const cameraGuideFrame = document.getElementById('camera-guide-frame');
    const cameraGuideHint = document.getElementById('camera-guide-hint');
    const captureBtn = document.getElementById('btn-capture');
    const cancelCameraBtn = document.getElementById('btn-cancel-camera');
    const fileInput = document.getElementById('modal-file-input');
    const analyzeBtn = document.getElementById('btn-analyze-modal');
    const retryBtn = document.getElementById('btn-modal-retry');
    const modeSwitchBtn = document.getElementById('btn-mode-switch');

    if (!fab || !modal) return;

    // ============ 상태 ============
    /** 'camera' | 'file' | null — 현재 입력 방식 */
    let inputMode = null;
    /** 사진 슬롯 데이터 (3개, dataURL) */
    const uploadedPhotos = [null, null, null];
    /** 카메라 활성 시 어떤 슬롯에 저장할지 */
    let activeSlotIndex = 0;
    /** MediaStream */
    let stream = null;

    // ============ 모달 열기·닫기 ============
    function openModal() {
        modal.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        // 항상 모드 선택부터 시작
        goToModalStep('mode-select');
        inputMode = null;
        cameraError.classList.remove('show');
    }
    function closeModal() {
        modal.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
        stopCamera();
    }
    fab.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });

    function goToModalStep(stepName) {
        modal.querySelectorAll('.modal-step').forEach((s) => {
            s.classList.toggle('active', s.dataset.modalStep === stepName);
        });
    }

    // ============ 1. 입력 방식 선택 ============
    modal.querySelectorAll('[data-input-mode]').forEach((card) => {
        card.addEventListener('click', () => {
            inputMode = card.dataset.inputMode;   // 'camera' or 'file'
            updateUploadModeUI();
            goToModalStep('upload');
        });
    });

    /** 업로드 화면의 제목·설명을 모드에 맞춰 갱신 */
    function updateUploadModeUI() {
        const title = document.getElementById('upload-mode-title');
        const desc = document.getElementById('upload-mode-desc');
        if (inputMode === 'camera') {
            title.textContent = '📷 촬영 모드 — 슬롯을 누르면 바로 카메라가 켜져요';
            desc.textContent = '각 부위에 맞춰 가이드 안에 댕댕이를 맞춰 찍어주세요';
        } else if (inputMode === 'file') {
            title.textContent = '🖼️ 사진 불러오기 — 슬롯을 누르면 사진 선택창이 열려요';
            desc.textContent = '각 부위에 맞는 사진을 선택해주세요';
        }
    }

    // 모드 변경 버튼 — 모드 선택 화면으로 복귀
    modeSwitchBtn?.addEventListener('click', () => {
        stopCamera();
        goToModalStep('mode-select');
    });

    // ============ 2. 슬롯 클릭 — 모드에 따라 즉시 동작 ============
    const slots = modal.querySelectorAll('.modal-slot');

    slots.forEach((slot) => {
        const slotIndex = parseInt(slot.dataset.slot, 10);
        const removeBtn = slot.querySelector('.modal-slot-remove');

        slot.addEventListener('click', (e) => {
            // 삭제 버튼이면 통과
            if (e.target.closest('.modal-slot-remove')) return;
            // 이미 채워져있으면 무시 (삭제 후 다시 시도하도록)
            if (slot.classList.contains('filled')) return;

            activeSlotIndex = slotIndex;
            if (inputMode === 'camera') {
                startCamera(slot);
            } else if (inputMode === 'file') {
                fileInput.click();
            }
        });

        removeBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadedPhotos[slotIndex] = null;
            slot.querySelector('img')?.remove();
            slot.classList.remove('filled');
        });
    });

    // ============ 3. 파일 선택 ============
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            uploadedPhotos[activeSlotIndex] = ev.target.result;
            renderSlotImage(activeSlotIndex, ev.target.result);
        };
        reader.readAsDataURL(file);
        fileInput.value = '';
    });

    function renderSlotImage(slotIndex, dataUrl) {
        const slot = slots[slotIndex];
        if (!slot) return;
        slot.querySelector('img')?.remove();
        const img = document.createElement('img');
        img.src = dataUrl;
        slot.insertBefore(img, slot.firstChild);
        slot.classList.add('filled');
    }

    // ============ 4. 카메라 캡처 (가이드 프레임 포함) ============

    /** 부위별 가이드 프레임 설정 (CSS 클래스 + 안내 텍스트) */
    const guideConfig = {
        0: { className: 'face',  hint: '얼굴을 원 안에 맞춰주세요' },
        1: { className: 'side',  hint: '강아지 옆모습이 프레임에 들어오게 맞춰주세요' },
        2: { className: 'front', hint: '강아지 전체가 프레임에 들어오게 맞춰주세요' },
    };

    /** 카메라 시작 — 권한 요청 + 라이브 뷰 + 부위별 가이드 프레임 */
    async function startCamera(slot) {
        cameraError.classList.remove('show');
        const label = slot.dataset.label;
        const config = guideConfig[activeSlotIndex];
        if (cameraTargetLabel) cameraTargetLabel.textContent = `${label} 촬영 중`;
        // 가이드 프레임 부위별 클래스 적용
        if (cameraGuideFrame) {
            cameraGuideFrame.classList.remove('face', 'side', 'front');
            cameraGuideFrame.classList.add(config.className);
        }
        if (cameraGuideHint) cameraGuideHint.textContent = config.hint;

        try {
            // TODO: 백엔드 연동 시 사진 압축·전송
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });
            cameraVideo.srcObject = stream;
            cameraView.classList.add('active');
        } catch (err) {
            console.warn('Camera access failed:', err);
            cameraError.classList.add('show');
        }
    }

    function stopCamera() {
        stream?.getTracks().forEach((t) => t.stop());
        stream = null;
        cameraView.classList.remove('active');
    }

    captureBtn?.addEventListener('click', () => {
        if (!stream || !cameraVideo.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = cameraVideo.videoWidth;
        canvas.height = cameraVideo.videoHeight;
        canvas.getContext('2d').drawImage(cameraVideo, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        uploadedPhotos[activeSlotIndex] = dataUrl;
        renderSlotImage(activeSlotIndex, dataUrl);
        stopCamera();
    });

    cancelCameraBtn?.addEventListener('click', stopCamera);

    // ============ 5. Mock 분석 ============
    const mockResult = {
        breed: { primary: '골든리트리버', confidence: 92 },
        body: {
            size: '중대형',
            weight: '25~30kg',
            coat: '장모·이중모',
            activity: '활동량 높음',
        },
    };

    const analysisSteps = [
        { text: '강아지 영역 인식 중...', progress: 25 },
        { text: '견종 판독 중...', progress: 55 },
        { text: '체형 분석 중...', progress: 80 },
        { text: '맞춤 상품 검색 중...', progress: 100 },
    ];

    analyzeBtn?.addEventListener('click', () => {
        goToModalStep('analyzing');
        runMockAnalysis();
    });

    function runMockAnalysis() {
        const stepText = document.getElementById('modal-step-text');
        const progressFill = document.getElementById('modal-progress-fill');
        let idx = 0;
        const tick = () => {
            const step = analysisSteps[idx];
            if (stepText) {
                stepText.style.opacity = '0';
                setTimeout(() => {
                    stepText.textContent = step.text;
                    stepText.style.opacity = '1';
                }, 200);
            }
            if (progressFill) progressFill.style.width = step.progress + '%';
            idx++;
            if (idx < analysisSteps.length) {
                setTimeout(tick, 600);
            } else {
                setTimeout(() => {
                    renderModalResult();
                    goToModalStep('result');
                }, 500);
            }
        };
        tick();
    }

    // ============ 6. 저장 — 로그인 사용자 / 비회원 분기 ============
    /**
     * 로그인 여부 판단 (header.js 와 같은 LOGIN_KEY 사용)
     * @returns {boolean}
     */
    function isLoggedIn() {
        try { return !!JSON.parse(localStorage.getItem('daengdabang_logged_in')); }
        catch { return false; }
    }

    /**
     * 마지막으로 분석된 펫 객체 (이름 input 입력 시 갱신용).
     * 결과 화면이 보이는 동안에만 의미 있음.
     */
    let lastProfile = null;

    /**
     * 회원 펫 목록에 추가. id 가 같으면 덮어쓰기 (이름 갱신용).
     * @param {object} profile
     */
    function savePetToAccount(profile) {
        const list = JSON.parse(localStorage.getItem('daengdabang_pets') || '[]');
        const idx = list.findIndex((p) => p.id === profile.id);
        if (idx >= 0) list[idx] = profile;
        else list.push(profile);
        localStorage.setItem('daengdabang_pets', JSON.stringify(list));
    }

    /**
     * 비회원 임시 저장 — 로그인 시 auth.js 가 회원 목록으로 옮겨준다.
     * 단일 슬롯 (덮어쓰기).
     */
    function savePetToPending(profile) {
        localStorage.setItem('daengdabang_pet_pending', JSON.stringify(profile));
    }

    /**
     * 저장 상태 안내 박스 렌더링.
     * 로그인: 초록색 "저장됐어요" / 비로그인: 노란색 "로그인하면 저장돼요"
     */
    function renderSaveStatus() {
        const box = document.getElementById('modal-save-status');
        if (!box) return;
        if (isLoggedIn()) {
            box.className = 'modal-save-status logged-in';
            box.innerHTML = `
                <i class="fa-solid fa-circle-check"></i>
                <div>
                    <strong>마이페이지에 저장됐어요</strong>
                    <span>분석 결과는 언제든 마이페이지 → 펫 프로필에서 다시 볼 수 있어요.</span>
                </div>
            `;
        } else {
            box.className = 'modal-save-status guest';
            box.innerHTML = `
                <i class="fa-solid fa-lightbulb"></i>
                <div>
                    <strong>로그인하면 결과가 자동 저장돼요</strong>
                    <span>마이페이지에 펫 프로필로 기록되고, 추천도 점점 정교해져요.</span>
                </div>
                <a href="login.html" class="btn-save-login">로그인</a>
            `;
        }
    }

    function renderModalResult() {
        document.getElementById('modal-result-breed').textContent = mockResult.breed.primary;
        document.getElementById('modal-result-confidence').textContent = `유사도 ${mockResult.breed.confidence}%`;
        const avatar = document.getElementById('modal-result-avatar');
        if (avatar && uploadedPhotos[0]) {
            avatar.innerHTML = `<img src="${uploadedPhotos[0]}" alt="댕댕이">`;
        }
        const quick = document.getElementById('modal-result-quick');
        if (quick) {
            quick.innerHTML = `
                <div><strong>${mockResult.body.size}</strong><span>분류</span></div>
                <div><strong>${mockResult.body.weight}</strong><span>추정 체중</span></div>
                <div><strong>${mockResult.body.coat}</strong><span>모질</span></div>
                <div><strong>${mockResult.body.activity}</strong><span>운동량</span></div>
            `;
        }

        // 펫 객체 생성 — 이름은 비워두고, 사용자가 입력하거나 자동 부여
        lastProfile = {
            id: 'pet_' + Date.now(),
            name: '',                // 아래 input change 시 채움
            breed: mockResult.breed.primary,
            confidence: mockResult.breed.confidence,
            body: mockResult.body,
            avatar: uploadedPhotos[0] || null,
            photos: uploadedPhotos.filter(Boolean),
            analyzedAt: Date.now(),
        };

        // 이름 input 초기화
        const nameInput = document.getElementById('modal-pet-name-input');
        if (nameInput) nameInput.value = '';

        // 회원/비회원 분기 저장
        if (isLoggedIn()) {
            savePetToAccount(lastProfile);
        } else {
            savePetToPending(lastProfile);
        }

        renderSaveStatus();
    }

    // 이름 input — 입력될 때마다 저장된 펫 객체 갱신 (debounce 200ms)
    let nameSaveTimer = null;
    document.getElementById('modal-pet-name-input')?.addEventListener('input', (e) => {
        if (!lastProfile) return;
        clearTimeout(nameSaveTimer);
        nameSaveTimer = setTimeout(() => {
            lastProfile.name = e.target.value.trim();
            if (isLoggedIn()) savePetToAccount(lastProfile);
            else savePetToPending(lastProfile);
        }, 200);
    });

    // 다시 분석 — 사진 초기화 + 모드 선택 화면으로
    retryBtn?.addEventListener('click', () => {
        uploadedPhotos.fill(null);
        slots.forEach((s) => {
            s.querySelector('img')?.remove();
            s.classList.remove('filled');
        });
        inputMode = null;
        lastProfile = null;
        goToModalStep('mode-select');
    });

})();
