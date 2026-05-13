/* =====================================================================
 * petlens.js
 * ---------------------------------------------------------------------
 * 펫렌즈 (AI 반려견 분석) 페이지 인터랙션 + Mock 분석.
 *
 *   1. 단계 전환 (Step 1 → 2 → 3 → 4)
 *   2. 사진 업로드 (드래그·드롭, 미리보기, 삭제)
 *   3. 분석 중 진행 표시 (setTimeout 으로 가짜 단계 진행)
 *   4. 결과 렌더링 (mockResult 객체에서 데이터 가져옴)
 *   5. localStorage 에 펫 프로필 저장
 *
 * 백엔드 연동 시 변경 지점 (TODO 주석 표시):
 *   - 업로드 → 서버 스토리지 업로드 API
 *   - 분석 → AI 모델 호출
 *   - 결과 데이터 → API 응답으로 교체
 *
 * IIFE 로 감싸 전역 오염 방지.
 * ===================================================================== */

(() => {

    // ============ 1. Mock 분석 결과 데이터 ============
    /**
     * 실제 AI 분석 결과 자리에 들어갈 가짜 데이터.
     * 추후 API 응답 스키마로 그대로 매핑되도록 구조 설계.
     */
    const mockResult = {
        breed: {
            primary: '골든리트리버',
            confidence: 92,
            secondary: [
                { name: '래브라도 리트리버', percent: 5 },
                { name: '노바스코샤 덕톨링 리트리버', percent: 3 },
            ],
        },
        body: {
            size: '중대형',
            weight: '25~30kg',
            coat: '장모·이중모',
            activity: '활동량 높음',
        },
        // 취약 질환 (severity: 1~3, 별 개수)
        healthRisks: [
            { name: '고관절 형성부전', severity: 3 },
            { name: '알러지 피부염', severity: 2 },
            { name: '외이염', severity: 2 },
            { name: '비만 (활동량 부족 시)', severity: 1 },
        ],
        // 자체 카탈로그 추천 (Excel 분석 기반)
        internalRecommendations: [
            { brand: 'RUFFWEAR', name: '프론트 레인지 데이 팩 하네스 (2026)', price: 92000, ph: 1, icon: 'fa-solid fa-medal' },
            { brand: '댕다방',     name: '관절 케어 영양제 (대형견)',          price: 68000, ph: 5, icon: 'fa-solid fa-flask' },
            { brand: 'RUFFWEAR', name: '플로트 코트 구명 조끼',                price: 174000, ph: 2, icon: 'fa-solid fa-shield' },
            { brand: '페리티',    name: '알로에 수딩 케어 미스트',              price: 18000, ph: 3, icon: 'fa-solid fa-spray-can' },
        ],
        // 외부 쇼핑몰 추천 — placeholder URL.
        // ★ 사용자가 추후 실제 상품 페이지 URL 을 가져와 여기에 교체 ★
        externalRecommendations: [
            { name: 'Antinol Plus 관절 영양제', mall: 'Antinol 공식', url: 'https://antinol.co.kr/' },
            { name: 'Ruffwear Front Range 하네스', mall: 'Ruffwear 공식', url: 'https://ruffwear.com/products/front-range-day-pack' },
            { name: 'Yora 곤충사료 라지브리드', mall: 'Yora 공식', url: 'https://yorapets.com/' },
            { name: 'Canagan 그레인프리 사료', mall: 'Canagan 공식', url: 'https://canagan.com/' },
            { name: 'Now Foods 관절 영양제', mall: '아이허브', url: 'https://www.iherb.com/' },
        ],
        // 검색 키워드 (외부 검색 버튼 생성용)
        searchKeywords: ['골든리트리버 관절 영양제', '대형견 하네스', '장모견 케어'],
    };

    // ============ 2. 단계 전환 (Stepper) ============
    const screens = document.querySelectorAll('.petlens-screen');
    const dots = document.querySelectorAll('.petlens-stepper .dot');
    let currentStep = 1;

    function goToStep(n) {
        if (n < 1 || n > screens.length) return;
        currentStep = n;
        screens.forEach((s) => s.classList.toggle('active', parseInt(s.dataset.screen, 10) === n));
        dots.forEach((d) => d.classList.toggle('active', parseInt(d.dataset.step, 10) <= n));
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Step 3 진입 시 가짜 분석 시작
        if (n === 3) startMockAnalysis();
        // Step 4 진입 시 결과 렌더링
        if (n === 4) renderResult();
    }

    document.querySelectorAll('[data-go-step]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = parseInt(btn.dataset.goStep, 10);
            goToStep(target);
        });
    });

    // ============ 3. 사진 업로드 ============
    /** 업로드된 사진 데이터 URL 보관 (3개 슬롯) */
    const uploadedPhotos = [null, null, null];

    document.querySelectorAll('.upload-zone').forEach((zone) => {
        const slot = parseInt(zone.dataset.slot, 10);
        const input = zone.querySelector('input[type="file"]');
        const removeBtn = zone.querySelector('.upload-zone-remove');

        // 파일 선택 시 미리보기
        input?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                uploadedPhotos[slot] = ev.target.result;
                renderUploadedImage(zone, ev.target.result);
            };
            reader.readAsDataURL(file);
        });

        // 삭제 버튼
        removeBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadedPhotos[slot] = null;
            const img = zone.querySelector('img');
            img?.remove();
            zone.classList.remove('filled');
            input.value = '';
        });

        // 드래그·드롭
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            const file = e.dataTransfer?.files?.[0];
            if (!file || !file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                uploadedPhotos[slot] = ev.target.result;
                renderUploadedImage(zone, ev.target.result);
            };
            reader.readAsDataURL(file);
        });
    });

    /** 업로드 zone 안에 이미지 미리보기 삽입 */
    function renderUploadedImage(zone, dataUrl) {
        const existing = zone.querySelector('img');
        existing?.remove();
        const img = document.createElement('img');
        img.src = dataUrl;
        zone.insertBefore(img, zone.firstChild);
        zone.classList.add('filled');
    }

    // ============ 4. Mock 분석 진행 ============
    const stepText = document.getElementById('analyzing-step-text');
    const progressFill = document.getElementById('progress-fill');

    const analysisSteps = [
        { text: '강아지 영역 인식 중...', progress: 20 },
        { text: '견종 판독 중...', progress: 45 },
        { text: '체형·모질 분석 중...', progress: 65 },
        { text: '취약 질환 데이터 매칭 중...', progress: 85 },
        { text: '맞춤 상품 검색 중...', progress: 100 },
    ];

    function startMockAnalysis() {
        // TODO: 실제로는 여기서 사진을 서버에 업로드 + AI API 호출
        //       const formData = new FormData();
        //       uploadedPhotos.filter(Boolean).forEach((p, i) => formData.append(`photo_${i}`, p));
        //       const result = await fetch('/api/petlens/analyze', { method: 'POST', body: formData }).then(r => r.json());
        //       Object.assign(mockResult, result);

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
                setTimeout(tick, 700);
            } else {
                // 분석 완료 → 결과 화면으로
                setTimeout(() => goToStep(4), 600);
            }
        };
        tick();
    }

    // ============ 5. 결과 렌더링 ============
    function renderResult() {
        // 견종
        document.getElementById('result-breed').textContent = mockResult.breed.primary;
        document.getElementById('result-confidence').textContent = `유사도 ${mockResult.breed.confidence}%`;
        const secondaryText = mockResult.breed.secondary
            .map((s) => `${s.name} (${s.percent}%)`)
            .join(' · ');
        document.getElementById('result-secondary').textContent = `다음으로 유사한 견종: ${secondaryText}`;

        // 아바타 — 업로드된 첫 사진이 있으면 사용
        const avatar = document.getElementById('result-avatar');
        if (avatar && uploadedPhotos[0]) {
            avatar.innerHTML = `<img src="${uploadedPhotos[0]}" alt="댕댕이">`;
        }

        // 체형 통계
        const stats = document.getElementById('body-stats');
        if (stats) {
            stats.innerHTML = `
                <div class="body-stat"><strong>${mockResult.body.size}</strong><span>분류</span></div>
                <div class="body-stat"><strong>${mockResult.body.weight}</strong><span>추정 체중</span></div>
                <div class="body-stat"><strong>${mockResult.body.coat}</strong><span>모질</span></div>
                <div class="body-stat"><strong>${mockResult.body.activity}</strong><span>운동 필요</span></div>
            `;
        }

        // 취약 질환
        const healthList = document.getElementById('health-list');
        if (healthList) {
            healthList.innerHTML = mockResult.healthRisks.map((h) => {
                const stars = [1, 2, 3].map((i) => `<i class="fa-solid fa-circle ${i > h.severity ? 'empty' : ''}"></i>`).join('');
                return `
                    <div class="health-item">
                        <span class="health-item-name">${h.name}</span>
                        <span class="health-item-severity">${stars}</span>
                    </div>
                `;
            }).join('');
        }

        // 자체 추천 (베스트 카드와 유사한 미니 버전)
        const internalGrid = document.getElementById('rec-internal-grid');
        if (internalGrid) {
            internalGrid.innerHTML = mockResult.internalRecommendations.map((p, i) => `
                <a href="#internal-${i}" class="rec-card">
                    <div class="rec-card-img c-${p.ph}"><i class="${p.icon}"></i></div>
                    <div class="rec-card-info">
                        <p class="rec-card-brand">${p.brand}</p>
                        <p class="rec-card-name">${p.name}</p>
                        <div class="rec-card-price">${p.price.toLocaleString('ko-KR')}원</div>
                    </div>
                </a>
            `).join('');
        }

        // 외부 추천 (placeholder URL 자리)
        const externalList = document.getElementById('rec-external-list');
        if (externalList) {
            externalList.innerHTML = mockResult.externalRecommendations.map((r) => `
                <a href="${r.url}" target="_blank" rel="noopener" class="rec-external-item">
                    <span class="ext-name">${r.name}</span>
                    <span class="ext-mall">${r.mall}</span>
                    <i class="fa-solid fa-arrow-up-right-from-square ext-arrow"></i>
                </a>
            `).join('');
        }

        // 더 찾아보기 — 검색 URL 자동 생성
        const searchButtons = document.getElementById('rec-search-buttons');
        if (searchButtons) {
            const malls = [
                { name: '네이버', url: (q) => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}` },
                { name: '쿠팡',   url: (q) => `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}` },
                { name: '11번가',  url: (q) => `https://search.11st.co.kr/Search.tmall?kwd=${encodeURIComponent(q)}` },
                { name: '다나와',  url: (q) => `https://search.danawa.com/dsearch.php?query=${encodeURIComponent(q)}` },
            ];
            const buttons = [];
            mockResult.searchKeywords.forEach((kw) => {
                malls.forEach((m) => {
                    buttons.push(`<a href="${m.url(kw)}" target="_blank" rel="noopener" class="rec-search-btn">${m.name} "${kw}" →</a>`);
                });
            });
            // 키워드별 그룹화는 길어지니, 첫 키워드만 4개 쇼핑몰 노출 + 더 보기 옵션
            const firstKw = mockResult.searchKeywords[0];
            searchButtons.innerHTML = malls.map((m) =>
                `<a href="${m.url(firstKw)}" target="_blank" rel="noopener" class="rec-search-btn">
                    <i class="fa-solid fa-magnifying-glass" style="margin-right: 6px;"></i>${m.name} 검색
                </a>`
            ).join('');
        }
    }

    // ============ 6. 결과 저장 (localStorage) ============
    document.getElementById('btn-save-pet')?.addEventListener('click', () => {
        // TODO: 실제로는 API 로 사용자 프로필에 저장
        //       fetch('/api/me/pet-profile', { method: 'POST', body: JSON.stringify(profile) });
        const profile = {
            breed: mockResult.breed.primary,
            body: mockResult.body,
            healthRisks: mockResult.healthRisks,
            avatar: uploadedPhotos[0] || null,
            analyzedAt: Date.now(),
        };
        localStorage.setItem('daengdabang_pet_profile', JSON.stringify(profile));
        // 저장 후 메인으로 이동
        window.location.href = 'main.html?petlens=saved';
    });

})();
