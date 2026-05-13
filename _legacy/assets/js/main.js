/* =====================================================================
 * main.js
 * ---------------------------------------------------------------------
 * 메인 쇼핑 페이지(main.html) 전용 인터랙션 로직.
 *
 *   1. 베스트 상품 섹션 — 실시간/일간/주간/월간 4탭 전환 + 페이드 애니메이션
 *   2. 베스트 상품 카드 동적 렌더링 (bestData 객체 기반)
 *   3. 찜 버튼 토글 (하트 아이콘 색 변환, 링크 이동 막음)
 *   4. 대표 브랜드 슬라이더 — Ruffwear / Rex Specs 각 2장 × 자동 전환
 *      - 같은 브랜드 슬라이드 간: 단순 크로스페이드
 *      - 브랜드 변경 시: 텍스트도 같이 페이드 교체
 *      - 페이지네이션 점 클릭, 브랜드 라벨 클릭으로 수동 전환
 *      - 호버 / 뷰포트 밖일 때 자동재생 일시정지
 *
 * IIFE 로 감싸 전역 오염 방지.
 * 추후 실제 상품·이미지 데이터로 교체할 부분은 'TODO' / '추후' 주석 표시.
 * ===================================================================== */

(() => {
    // ============ 1. 베스트 상품 데이터 ============
    // 4개 시점(realtime/daily/weekly/monthly) × 각 4개 상품 = 총 16개 더미.
    // 추후 실제 백엔드 API 응답으로 교체 가능 (구조 유지하면 바로 적용됨).
    //
    // 필드 설명:
    //   brand    — 브랜드명 (UPPER CASE 권장)
    //   name     — 상품명 (2줄까지 노출, 그 이상은 ellipsis)
    //   price    — 판매가 (할인된 최종 가격)
    //   original — 원가 (할인 전), 할인 없으면 null
    //   discount — 할인율 (%), 할인 없으면 null
    //   ph       — placeholder 컬러 변형 (1~6) — 추후 image 필드로 교체
    //   icon     — placeholder 안에 표시할 FontAwesome 클래스
    const bestData = {
        realtime: [
            { brand: 'RUFFWEAR',  name: 'Front Range 데이 하네스',         price: 78000,  original: 92000,  discount: 15, ph: 1, icon: 'fa-solid fa-medal' },
            { brand: 'REX SPECS', name: 'V2 강아지 고글 (Medium)',          price: 145000, original: null,   discount: null, ph: 2, icon: 'fa-solid fa-glasses' },
            { brand: '댕다방',     name: '데일리 산책 가방 베이지',           price: 32000,  original: 39000,  discount: 18, ph: 3, icon: 'fa-solid fa-bag-shopping' },
            { brand: '댕다방',     name: '방수 강아지 우비 옐로우',           price: 45000,  original: null,   discount: null, ph: 4, icon: 'fa-solid fa-cloud-rain' },
        ],
        daily: [
            { brand: '댕다방',     name: '프리미엄 그레인프리 사료 5kg',     price: 58000,  original: 68000,  discount: 14, ph: 5, icon: 'fa-solid fa-bone' },
            { brand: '댕다방',     name: '발바닥 케어 크림 50ml',           price: 18500,  original: null,   discount: null, ph: 6, icon: 'fa-solid fa-paw' },
            { brand: '댕다방',     name: '메모리폼 쿠션 침대 (M)',           price: 89000,  original: 110000, discount: 19, ph: 1, icon: 'fa-solid fa-bed' },
            { brand: '댕다방',     name: '훈련용 저칼로리 간식 모음',         price: 12800,  original: null,   discount: null, ph: 2, icon: 'fa-solid fa-cookie-bite' },
        ],
        weekly: [
            { brand: 'RUFFWEAR',  name: 'Roamer 자동조절 리드줄',          price: 52000,  original: 62000,  discount: 16, ph: 3, icon: 'fa-solid fa-link' },
            { brand: '댕다방',     name: '자동 급식기 5L 와이파이',          price: 124000, original: null,   discount: null, ph: 4, icon: 'fa-solid fa-utensils' },
            { brand: '댕다방',     name: '종합 영양제 패키지',                price: 68000,  original: 79000,  discount: 14, ph: 5, icon: 'fa-solid fa-flask' },
            { brand: '댕다방',     name: '노즈워크 매트 라지',                price: 35000,  original: null,   discount: null, ph: 6, icon: 'fa-solid fa-grip' },
        ],
        monthly: [
            { brand: '댕다방',     name: '산책 풀세트 (하네스+리드줄+가방)', price: 198000, original: 235000, discount: 16, ph: 1, icon: 'fa-solid fa-shoe-prints' },
            { brand: '댕다방',     name: '월간 위생용품 정기 패키지',         price: 89000,  original: null,   discount: null, ph: 2, icon: 'fa-solid fa-soap' },
            { brand: 'REX SPECS', name: 'Air 강아지 고글 (대형견)',          price: 168000, original: null,   discount: null, ph: 3, icon: 'fa-solid fa-glasses' },
            { brand: '댕다방',     name: '천연 라텍스 매트리스 침대',         price: 248000, original: 298000, discount: 17, ph: 4, icon: 'fa-solid fa-bed' },
        ],
    };

    // 가격 천단위 콤마 포맷 (78000 → 78,000)
    const formatPrice = (n) => n.toLocaleString('ko-KR');
    // 사용자 입력·데이터를 HTML 에 삽입하기 전에 XSS 방지용 이스케이프
    const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

    /**
     * 선택한 시점(period)의 상품 4개를 그리드에 렌더링.
     * 200ms 페이드 아웃 → innerHTML 교체 → 페이드 인 흐름으로 부드러운 탭 전환 효과.
     * @param {string} period - 'realtime' | 'daily' | 'weekly' | 'monthly'
     */
    function renderBest(period) {
        const grid = document.getElementById('best-grid');
        if (!grid) return;
        const items = bestData[period] || [];

        grid.classList.add('fade');
        setTimeout(() => {
            grid.innerHTML = items.map((p, i) => {
                const rank = i + 1;
                const rankClass = rank === 1 ? 'rank-badge top' : 'rank-badge';
                const priceHtml = p.original
                    ? `<span class="product-discount">${p.discount}%</span>
                       <span class="product-original">${formatPrice(p.original)}원</span>
                       <span class="product-price">${formatPrice(p.price)}원</span>`
                    : `<span class="product-price">${formatPrice(p.price)}원</span>`;
                return `
                    <a href="#product-${period}-${rank}" class="product-card">
                        <div class="product-image ph-${p.ph}">
                            <span class="${rankClass}">${rank}</span>
                            <button class="wish-btn" aria-label="찜하기" data-wish>
                                <i class="fa-regular fa-heart"></i>
                            </button>
                            <i class="${p.icon}"></i>
                        </div>
                        <div class="product-info">
                            <p class="product-brand">${escapeHtml(p.brand)}</p>
                            <p class="product-name">${escapeHtml(p.name)}</p>
                            <div class="product-price-row">${priceHtml}</div>
                        </div>
                    </a>
                `;
            }).join('');
            grid.classList.remove('fade');
        }, 200);
    }

    // ============ 2. 탭 전환 이벤트 ============
    // 탭 클릭 시 active 클래스 토글 + 해당 시점의 상품을 다시 렌더링.
    document.querySelectorAll('.best-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.best-tab').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            renderBest(btn.dataset.period);
        });
    });

    // ============ 3. 찜 버튼 토글 ============
    // 상품 카드 자체는 <a> 링크라 클릭 시 페이지 이동이 발생.
    // 찜 버튼은 그 안에 있으므로 preventDefault + stopPropagation 으로 이동 막고 토글만 수행.
    document.addEventListener('click', (e) => {
        const wish = e.target.closest('[data-wish]');
        if (wish) {
            e.preventDefault();
            e.stopPropagation();
            wish.classList.toggle('on');
        }
    });

    // 페이지 진입 시 기본 탭(실시간)으로 렌더
    renderBest('realtime');

    // ============ 5. 신상품 가로 스크롤 캐러셀 ============
    // Excel 카탈로그에서 (2026)/(2025FW) 표기된 신상 12개를 가로 스크롤로 노출.
    // 베스트 카드 디자인(.product-card)을 재사용하되, 순위 배지 대신 "NEW" 배지 사용.
    const newArrivals = [
        { brand: 'RUFFWEAR', name: '릿지라인 하네스 (2026)',              price: 270000, ph: 1, icon: 'fa-solid fa-medal' },
        { brand: 'RUFFWEAR', name: '팔리세이드 팩 반려견 배낭 (2026)',     price: 226000, ph: 2, icon: 'fa-solid fa-bag-shopping' },
        { brand: 'RUFFWEAR', name: '버트 커버올 스노우 슈트 (2025FW)',     price: 208000, ph: 3, icon: 'fa-solid fa-snowflake' },
        { brand: 'RUFFWEAR', name: '팔리세이드 슬립 판초 (2026)',          price: 168000, ph: 4, icon: 'fa-solid fa-cloud-rain' },
        { brand: 'RUFFWEAR', name: '선 샤워 커버올 레인 슈트 (2025FW)',    price: 164000, ph: 5, icon: 'fa-solid fa-umbrella' },
        { brand: 'RUFFWEAR', name: '릿지라인 리드줄 (2026)',                price: 106000, ph: 6, icon: 'fa-solid fa-link' },
        { brand: 'RUFFWEAR', name: '클라이메이트 체인저 재킷 (2025FW)',    price: 104000, ph: 1, icon: 'fa-solid fa-shirt' },
        { brand: 'RUFFWEAR', name: '히치 하이커 리드줄 (2026)',             price: 98000,  ph: 2, icon: 'fa-solid fa-link' },
        { brand: 'RUFFWEAR', name: '프론트 레인지 플렉스 하네스 (2026)',   price: 92000,  ph: 3, icon: 'fa-solid fa-medal' },
        { brand: 'RUFFWEAR', name: '클라이메이트 체인저 베스트 (2025FW)',  price: 89000,  ph: 4, icon: 'fa-solid fa-shirt' },
        { brand: 'RUFFWEAR', name: '릿지라인 반려견 슈즈 (2026)',           price: 89000,  ph: 5, icon: 'fa-solid fa-shoe-prints' },
        { brand: 'RUFFWEAR', name: '릿지라인 목줄 (2026)',                  price: 76000,  ph: 6, icon: 'fa-solid fa-circle-nodes' },
    ];

    /**
     * 신상품 카드 한 장의 HTML 을 생성. 클론 영역과 실제 영역 모두에서 사용.
     * @param {object} p - 상품 데이터
     * @param {number} i - 인덱스 (앵커용)
     */
    function newArrivalCardHTML(p, i) {
        return `
            <a href="#new-${i+1}" class="product-card">
                <div class="product-image ph-${p.ph}">
                    <span class="rank-badge top" style="background: linear-gradient(135deg, #6366f1, #ec4899); width: auto; padding: 0 8px; border-radius: 12px; font-size: 11px;">NEW</span>
                    <button class="wish-btn" aria-label="찜하기" data-wish>
                        <i class="fa-regular fa-heart"></i>
                    </button>
                    <i class="${p.icon}"></i>
                </div>
                <div class="product-info">
                    <p class="product-brand">${escapeHtml(p.brand)}</p>
                    <p class="product-name">${escapeHtml(p.name)}</p>
                    <div class="product-price-row">
                        <span class="product-price">${formatPrice(p.price)}원</span>
                    </div>
                </div>
            </a>
        `;
    }

    /**
     * 무한 루프 위한 카드 렌더링: 카드 데이터를 3세트로 렌더.
     * [앞 클론(N개)] [실제(N개)] [뒤 클론(N개)] = 3N개
     * 사용자에게는 중앙 "실제" 영역이 보이고, 양 끝 클론에 진입하면 silent jump 로 중앙으로 복귀.
     */
    function renderNewArrivals() {
        const track = document.getElementById('new-track');
        if (!track) return;
        const tripleSet = [...newArrivals, ...newArrivals, ...newArrivals];
        track.innerHTML = tripleSet.map((p, i) => newArrivalCardHTML(p, i % newArrivals.length)).join('');
    }
    renderNewArrivals();

    // ============ 신상품 캐러셀 컨트롤 (자동 + 호버 정지 + 양방향 무한) ============
    const newTrack = document.getElementById('new-track');
    const prevBtn = document.querySelector('[data-carousel-prev]');
    const nextBtn = document.querySelector('[data-carousel-next]');
    const newSection = document.querySelector('.new-section');

    const AUTO_INTERVAL = 2800;   // 자동 진행 간격 (ms) — 너무 짧으면 거슬리고 너무 길면 정적
    const MANUAL_PAUSE = 2500;    // 수동 조작 후 자동 재개까지 (ms)
    const RESUME_DELAY = 500;     // mouseleave / 초기 시작 시 첫 진행까지의 짧은 딜레이 (ms)

    let autoTimer = null;
    let manualPauseTimer = null;
    let isUserHovering = false;

    /** 카드 1장 + gap 의 너비 — 한 칸 스크롤 단위 */
    function getCardStep() {
        const card = newTrack?.querySelector('.product-card');
        if (!card) return 300;
        const cs = getComputedStyle(newTrack);
        return card.getBoundingClientRect().width + parseInt(cs.gap || '16', 10);
    }

    /** 1세트(N개 카드) 전체 너비 — 클론 jump 계산용 */
    function getOneSetWidth() {
        return getCardStep() * newArrivals.length;
    }

    /** 초기 스크롤 위치를 중앙(실제 영역의 시작점)으로 설정 */
    function initScrollPosition() {
        if (!newTrack) return;
        newTrack.style.scrollBehavior = 'auto';
        newTrack.scrollLeft = getOneSetWidth();
        // 다음 프레임에서 부드러운 스크롤 복원
        requestAnimationFrame(() => { newTrack.style.scrollBehavior = ''; });
    }

    /** 양 끝 클론 영역에 진입했는지 감지 → 중앙으로 silent jump */
    function checkInfiniteJump() {
        if (!newTrack) return;
        const oneSet = getOneSetWidth();
        const sl = newTrack.scrollLeft;
        // 앞쪽 클론에 진입 (실제 영역 시작 이전) → 실제 영역 시작점으로 점프
        if (sl < oneSet - 1) {
            newTrack.style.scrollBehavior = 'auto';
            newTrack.scrollLeft = sl + oneSet;
            requestAnimationFrame(() => { newTrack.style.scrollBehavior = ''; });
        }
        // 뒤쪽 클론에 진입 (실제 영역 끝 이후) → 실제 영역 끝점으로 점프
        else if (sl >= oneSet * 2) {
            newTrack.style.scrollBehavior = 'auto';
            newTrack.scrollLeft = sl - oneSet;
            requestAnimationFrame(() => { newTrack.style.scrollBehavior = ''; });
        }
    }

    /** 자동 한 칸 진행 — 호버 중이면 이중 안전 장치로 스킵 */
    function autoAdvance() {
        if (!newTrack || isUserHovering) return;
        newTrack.scrollBy({ left: getCardStep(), behavior: 'smooth' });
    }

    /**
     * 자동 재생 시작 — 호버 중일 때만 차단.
     * @param {boolean} immediate - true 면 RESUME_DELAY 후 즉시 한 칸 진행 (마우스 떼자마자 반응)
     */
    function startAuto(immediate = false) {
        stopAuto();
        if (isUserHovering) return;
        if (immediate) {
            // 짧은 딜레이 후 즉시 한 칸 — setInterval 첫 발화 기다림 제거
            setTimeout(() => { if (!isUserHovering) autoAdvance(); }, RESUME_DELAY);
        }
        autoTimer = setInterval(autoAdvance, AUTO_INTERVAL);
    }
    function stopAuto() {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }

    /** 수동 조작 후 일정 시간 자동 일시정지 */
    function pauseAutoTemporarily() {
        stopAuto();
        if (manualPauseTimer) clearTimeout(manualPauseTimer);
        manualPauseTimer = setTimeout(() => {
            manualPauseTimer = null;
            startAuto();
        }, MANUAL_PAUSE);
    }

    /** 수동 화살표 클릭 — 양방향, 끝 비활성화 없음(무한) */
    prevBtn?.addEventListener('click', () => {
        newTrack?.scrollBy({ left: -getCardStep(), behavior: 'smooth' });
        pauseAutoTemporarily();
    });
    nextBtn?.addEventListener('click', () => {
        newTrack?.scrollBy({ left: getCardStep(), behavior: 'smooth' });
        pauseAutoTemporarily();
    });

    // 스크롤 이벤트로 무한 점프 감지 (자동·수동·터치 모두 트리거)
    newTrack?.addEventListener('scroll', checkInfiniteJump, { passive: true });

    // 호버·터치 시 자동 정지
    // mouseover는 자식 element 진입에도 발화 → 더 robust. 단, 중복 발화는 가드로 무시.
    // mouseleave는 부모 element 완전 이탈 시에만 발화 → 자식 간 이동에 영향 X.
    newSection?.addEventListener('mouseover', () => {
        if (!isUserHovering) {
            isUserHovering = true;
            stopAuto();
        }
    });
    newSection?.addEventListener('mouseleave', () => {
        isUserHovering = false;
        startAuto(true);   // 마우스 떼자마자 즉시 진행
    });
    // 펜·터치 대비 pointer 이벤트도 추가
    newSection?.addEventListener('pointerleave', () => {
        if (isUserHovering) {
            isUserHovering = false;
            startAuto(true);
        }
    });
    newTrack?.addEventListener('touchstart', () => { isUserHovering = true; stopAuto(); }, { passive: true });
    newTrack?.addEventListener('touchend', () => {
        isUserHovering = false;
        pauseAutoTemporarily();
    }, { passive: true });

    // 화면 리사이즈 시 위치 재정렬 (카드 폭 변동 대응)
    window.addEventListener('resize', () => {
        // 현재 위치가 클론 영역이면 보정
        checkInfiniteJump();
    });

    // 초기화: 즉시 동기 호출 (백그라운드 탭의 requestAnimationFrame/setTimeout throttle 회피).
    // main.js 는 body 끝에서 로드되므로 DOM/CSS 는 준비된 상태.
    initScrollPosition();
    startAuto(true);   // 페이지 로드 후 짧은 딜레이 뒤 즉시 한 칸 진행 (긴 대기 회피)

    // 페이지 가시성 변화 — 백그라운드 탭에서 visible 로 전환 시 보강.
    // hidden 상태로 페이지가 시작됐을 때 initScrollPosition 이 throttle 됐을 수도 있으므로
    // scrollLeft 가 0 이면 다시 초기화.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAuto();
        } else {
            if (newTrack && newTrack.scrollLeft === 0) initScrollPosition();
            if (!isUserHovering) startAuto(true);
        }
    });

    // ============ 6. 리뷰 카드 "더보기" 토글 ============
    // 텍스트가 line-clamp 로 잘렸을 때만 "더보기" 버튼 활성화.
    // 클릭 시 .expanded 토글로 펼침/접힘.

    /**
     * 텍스트가 실제로 잘렸는지 확인 (스크롤 높이 > 클라이언트 높이)
     */
    function isTextTruncated(el) {
        // 펼쳐진 상태에선 항상 false (이미 다 보임)
        if (el.classList.contains('expanded')) return el.scrollHeight > el.clientHeight;
        return el.scrollHeight - el.clientHeight > 1;
    }

    /**
     * 모든 리뷰 카드 검사 — 잘리지 않은(짧은) 카드는 더보기 버튼 숨김
     */
    function updateReadMoreButtons() {
        document.querySelectorAll('.review-card').forEach((card) => {
            const text = card.querySelector('.review-text');
            const btn = card.querySelector('.read-more');
            if (!text || !btn) return;
            if (isTextTruncated(text)) {
                btn.classList.remove('hidden');
            } else if (!text.classList.contains('expanded')) {
                btn.classList.add('hidden');
            }
        });
    }
    // 초기 1회 + 리사이즈 시 갱신 (카드 폭 바뀌면 줄바꿈도 바뀜)
    updateReadMoreButtons();
    window.addEventListener('resize', updateReadMoreButtons);

    // 더보기 버튼 클릭 처리 — 이벤트 위임
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.read-more');
        if (!btn) return;
        e.preventDefault();
        const card = btn.closest('.review-card');
        const text = card?.querySelector('.review-text');
        if (!text) return;
        text.classList.toggle('expanded');
        btn.textContent = text.classList.contains('expanded') ? '접기' : '더보기';
    });

    // 디버깅: 콘솔에서 window.__newCarousel 로 상태 확인·수동 제어 가능
    window.__newCarousel = {
        get autoTimerActive() { return !!autoTimer; },
        get isUserHovering() { return isUserHovering; },
        get scrollLeft() { return newTrack?.scrollLeft; },
        get oneSetWidth() { return getOneSetWidth(); },
        get cardStep() { return getCardStep(); },
        startAuto, stopAuto, autoAdvance,
        forceNext: () => newTrack?.scrollBy({ left: getCardStep(), behavior: 'smooth' }),
    };

    // ============ 4. 대표 브랜드 슬라이더 ============
    // 슬라이더 DOM 이 존재할 때만 실행 (다른 페이지에서 main.js 를 공유해도 안전).
    const brandSection = document.querySelector('.brand-section');
    if (brandSection) {
        const slides = brandSection.querySelectorAll('.brand-slide');
        const groups = brandSection.querySelectorAll('.brand-pag-group');
        const dots = brandSection.querySelectorAll('.pag-dot');
        const info = brandSection.querySelector('.brand-info');
        const nameEl = brandSection.querySelector('#brand-name');
        const descEl = brandSection.querySelector('#brand-desc');
        const ctaEl = brandSection.querySelector('#brand-cta');

        const brandInfo = {
            ruffwear: { name: 'Ruffwear',  desc: '활동견을 위한 프리미엄 아웃도어 기어',     cta: '#brand-ruffwear' },
            rexspecs: { name: 'Rex Specs', desc: '강아지 눈 보호 전문 아이웨어 솔루션',     cta: '#brand-rexspecs' },
        };

        // 현재 활성 슬라이드 인덱스 (0=Ruffwear-1, 1=Ruffwear-2, 2=RexSpecs-1, 3=RexSpecs-2)
        let currentIndex = 0;
        // setInterval 핸들 — startAuto/stopAuto 로 관리
        let timer = null;

        /**
         * 지정한 인덱스의 슬라이드로 전환.
         * 이전 슬라이드의 active 제거 → 새 슬라이드 active 부여
         * 페이지네이션 점·브랜드 그룹 상태 갱신
         * 브랜드가 바뀌었다면 텍스트도 350ms 페이드 후 교체
         * @param {number} index - 0~3
         */
        function setActive(index) {
            const prevSlide = slides[currentIndex];
            const nextSlide = slides[index];
            const brand = nextSlide.dataset.brand;
            const prevBrand = prevSlide?.dataset.brand;

            slides.forEach((s) => s.classList.remove('active'));
            nextSlide.classList.add('active');

            dots.forEach((d, i) => d.classList.toggle('active', i === index));
            groups.forEach((g) => g.classList.toggle('active', g.dataset.brand === brand));

            // 브랜드 바뀔 때만 텍스트 페이드 교체
            if (prevBrand !== brand) {
                info.classList.add('fade');
                setTimeout(() => {
                    const d = brandInfo[brand];
                    if (d) {
                        nameEl.textContent = d.name;
                        descEl.textContent = d.desc;
                        ctaEl.setAttribute('href', d.cta);
                    }
                    info.classList.remove('fade');
                }, 350);
            }

            currentIndex = index;
        }

        // 다음 슬라이드로 진행 (마지막 슬라이드 다음엔 0번으로 루프)
        function advance() {
            setActive((currentIndex + 1) % slides.length);
        }

        // 4.5초 간격으로 자동 진행 — 같은 브랜드 두 슬라이드를 보여준 뒤 다음 브랜드로 넘어감
        function startAuto() {
            stopAuto();
            timer = setInterval(advance, 4500);
        }
        // 자동 진행 중지 (호버 / 뷰포트 밖 / 수동 클릭 후 리셋용)
        function stopAuto() {
            if (timer) { clearInterval(timer); timer = null; }
        }

        // 점 클릭 → 해당 슬라이드로 점프 + 자동 재생 타이머 리셋
        dots.forEach((d, i) => {
            d.addEventListener('click', () => {
                setActive(i);
                startAuto();
            });
        });
        // 브랜드 라벨 클릭 → 해당 브랜드의 첫 슬라이드로 점프
        groups.forEach((g) => {
            g.querySelector('.pag-label')?.addEventListener('click', () => {
                const targetIdx = [...slides].findIndex((s) => s.dataset.brand === g.dataset.brand);
                if (targetIdx !== -1) {
                    setActive(targetIdx);
                    startAuto();
                }
            });
        });

        // 호버 시 자동 재생 일시정지 (사용자가 천천히 보는 동안 슬라이드가 휙 넘어가지 않도록)
        brandSection.addEventListener('mouseenter', stopAuto);
        brandSection.addEventListener('mouseleave', startAuto);

        // 섹션이 뷰포트에 보일 때만 자동 재생 (성능 절약 + 불필요한 백그라운드 동작 방지)
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => e.isIntersecting ? startAuto() : stopAuto());
        }, { threshold: 0.25 });
        io.observe(brandSection);
    }
})();
