/* =====================================================================
 * mypage.js — 마이페이지 (mypage.html) 전용 로직
 * ---------------------------------------------------------------------
 *   1. 비회원 차단 — daengdabang_logged_in 없으면 .mypage-body 숨김
 *   2. 사이드바 탭 전환 — data-tab ↔ data-pane 매칭
 *      URL 해시 (#pets, #orders ...) 로 직접 진입 가능
 *   3. 펫 프로필 렌더링 — daengdabang_pets 배열을 카드 그리드로
 *      - 빈 상태 / 카드 목록 / 추가 카드 분기
 *      - 삭제 / 재분석(메인 펫렌즈 모달 트리거) 버튼
 *   4. 헬로 카드 통계 — 펫 수 / 주문 수 / 포인트
 *   5. 회원정보 / 주소 / 찜 / 리뷰 / 적립금 — 모두 mock
 *
 * 의존:
 *   - header.js 가 동일 LOGIN_KEY 사용 (마이페이지 메뉴 표시)
 *   - petlens-modal.js 의 #petlens-fab 클릭 트리거로 재분석 (모달 재사용)
 * ===================================================================== */

(() => {
    const LOGIN_KEY = 'daengdabang_logged_in';
    const PETS_KEY = 'daengdabang_pets';

    // ============ Mock 데이터 — 주문 / 찜 / 리뷰 / 적립금 ============
    // (initialTab='pets' 로 진입 시 첫 activateTab → updateHelloStats 가 mockOrders 를 참조하므로
    //  IIFE 최상단에서 미리 선언해 TDZ 회피)
    const mockOrders = [
        { id: 'ORD-2026-0512-001', date: '2026.05.12', name: 'Ruffwear Front Range 하네스 (M)', amount: 78000, status: 'shipped', icon: 'fa-shirt' },
        { id: 'ORD-2026-0508-002', date: '2026.05.08', name: 'Rex Specs V2 강아지 고글 (M)', amount: 145000, status: 'shipping', icon: 'fa-glasses' },
        { id: 'ORD-2026-0501-003', date: '2026.05.01', name: '댕다방 데일리 산책 가방 베이지', amount: 32000, status: 'preparing', icon: 'fa-bag-shopping' },
    ];
    const statusLabel = {
        shipped: '배송완료',
        shipping: '배송중',
        preparing: '상품준비중',
    };

    /* ============ 회원 등급 정의 ============
     * 댕다방 시그니처 5단계 ("댕" 시리즈)
     *
     *   requireSpend  : 연간 누적 결제액 (원) — 둘 중 하나만 충족해도 승급
     *   requirePoints : 활동 점수 (구매·리뷰·사진 공유 등 누적)
     *   pointsRate    : 적립률 (%)
     *   discount      : 추가 할인율 (%)
     *   freeShipMin   : 무료배송 최소 결제액 (null=혜택 없음, 0=모든 주문 무료)
     *   perks         : 그 외 특별 혜택 라벨 리스트
     *
     * 작명 변경하려면 name·emoji·color 만 수정하면 끝 (다른 파일은 건드릴 필요 없음)
     */
    const GRADES = [
        { id: 1, name: '댕린이',  emoji: '🌱', color: '#10b981',
          requireSpend:       0, requirePoints:    0,
          pointsRate: 1, discount: 0, freeShipMin: null,
          perks: ['가입축하 5,000P'] },
        { id: 2, name: '댕친구',  emoji: '🐾', color: '#3b82f6',
          requireSpend:  100000, requirePoints:  100,
          pointsRate: 2, discount: 1, freeShipMin: 50000,
          perks: ['월 1회 무료배송 쿠폰'] },
        { id: 3, name: '댕단짝',  emoji: '🦴', color: '#a855f7',
          requireSpend:  300000, requirePoints:  300,
          pointsRate: 3, discount: 2, freeShipMin: 30000,
          perks: ['생일 10% 할인 쿠폰', '리뷰 작성 2배 적립'] },
        { id: 4, name: '댕가족',  emoji: '💎', color: '#ec4899',
          requireSpend:  800000, requirePoints:  700,
          pointsRate: 4, discount: 3, freeShipMin: 0,
          perks: ['생일 15% 할인 쿠폰', '신상품 우선 안내', '모든 주문 무료배송'] },
        { id: 5, name: '댕마스터', emoji: '👑', color: '#f59e0b',
          requireSpend: 2000000, requirePoints: 1500,
          pointsRate: 5, discount: 5, freeShipMin: 0,
          perks: ['전담 큐레이션 추천', 'VIP 이벤트 초대', '생일 20% + 기념일 쿠폰', '모든 주문 무료배송'] },
    ];

    /**
     * 현재 회원의 연간 결제액 / 활동 점수로 등급 결정.
     * 두 조건 중 하나만 충족해도 승급 (구매로 키워도, 활동으로 키워도 OK).
     */
    function computeGrade(spend, points) {
        let current = GRADES[0];
        for (const g of GRADES) {
            if (spend >= g.requireSpend || points >= g.requirePoints) current = g;
        }
        return current;
    }

    /** Mock — 사용자 활동 데이터 (실제론 백엔드에서 받아야 함) */
    const mockUserStats = {
        annualSpend: mockOrders.reduce((s, o) => s + o.amount, 0),   // 255,000원
        activityPoints: 240,                                          // 리뷰·사진공유 등
    };

    // ============ 1. 비회원 차단 ============
    function isLoggedIn() {
        try { return !!JSON.parse(localStorage.getItem(LOGIN_KEY)); }
        catch { return false; }
    }
    const gate = document.getElementById('mypage-guest-gate');
    const body = document.getElementById('mypage-body');
    if (!isLoggedIn()) {
        gate.hidden = false;
        body.hidden = true;
        return;   // 이하 회원 전용 로직 모두 skip
    }
    gate.hidden = true;
    body.hidden = false;

    // ============ 2. 사이드바 탭 전환 ============
    const tabs = document.querySelectorAll('.mypage-sidebar [data-tab]');
    const panes = document.querySelectorAll('.mypage-content [data-pane]');

    /**
     * 탭 활성화 — 사이드바 버튼 + 콘텐츠 동시 전환
     * @param {string} name dashboard | pets | orders | address | wishlist | reviews | points | profile
     */
    function activateTab(name) {
        tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
        panes.forEach((p) => p.classList.toggle('active', p.dataset.pane === name));
        // URL 해시 갱신 (뒤로가기 가능)
        if (location.hash !== '#' + name) {
            history.replaceState(null, '', '#' + name);
        }
        // 펫 탭 진입 시 매번 새로 그리기 (다른 페이지에서 분석 후 돌아왔을 수도)
        if (name === 'pets') renderPets();
        // 등급 탭은 매번 새로 (현재 값 반영)
        if (name === 'grade') renderGrade();
        // 펫렌즈 기록 탭도 매번 새로 (최근 분석 즉시 반영)
        if (name === 'petlens-log') renderPetlensLog();
    }

    tabs.forEach((t) => {
        t.addEventListener('click', () => activateTab(t.dataset.tab));
    });

    // 대시보드 카드의 "자세히 보기" 링크 → 해당 탭으로 전환
    document.querySelectorAll('[data-tab-link]').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            activateTab(link.dataset.tabLink);
        });
    });

    // URL 해시로 직접 진입 (예: mypage.html#pets)
    // 해시에 해당하는 pane 이 있으면 그걸로, 없으면 dashboard 로 진입
    const initialTab = (location.hash || '#dashboard').slice(1);
    const hasPane = !!document.querySelector(`.mypage-content [data-pane="${initialTab}"]`);
    activateTab(hasPane ? initialTab : 'dashboard');

    // ============ 3. 펫 프로필 렌더링 ============

    /** localStorage 에서 펫 목록 읽기 (없으면 빈 배열) */
    function getPets() {
        try { return JSON.parse(localStorage.getItem(PETS_KEY)) || []; }
        catch { return []; }
    }
    function savePets(list) {
        localStorage.setItem(PETS_KEY, JSON.stringify(list));
    }

    /** 펫 목록을 .pets-grid 에 렌더링 */
    function renderPets() {
        const container = document.getElementById('pets-container');
        if (!container) return;
        const pets = getPets();

        if (pets.length === 0) {
            container.innerHTML = `
                <div class="pets-empty">
                    <div class="empty-icon"><i class="fa-solid fa-paw"></i></div>
                    <h3>아직 등록된 댕댕이가 없어요</h3>
                    <p>펫렌즈로 분석하면 자동으로 여기에 저장돼요.</p>
                    <button type="button" data-petlens-trigger>
                        <i class="fa-solid fa-wand-magic-sparkles"></i> 첫 댕댕이 분석하기
                    </button>
                </div>
            `;
            updateHelloStats();
            return;
        }

        // 카드 + 추가 카드
        const cards = pets.map((pet, idx) => {
            const name = pet.name && pet.name.trim()
                ? pet.name
                : `<span class="empty">댕댕이 ${idx + 1}</span>`;
            const avatar = pet.avatar
                ? `<img src="${pet.avatar}" alt="${pet.name || '댕댕이'}">`
                : `<i class="fa-solid fa-dog"></i>`;
            const date = new Date(pet.analyzedAt).toLocaleDateString('ko-KR');
            return `
                <div class="pet-card" data-pet-id="${pet.id}">
                    <div class="pet-avatar">${avatar}</div>
                    <h3 class="pet-name">${name}</h3>
                    <p class="pet-breed">${pet.breed} · 유사도 ${pet.confidence}%</p>
                    <div class="pet-stats">
                        <div><strong>${pet.body.size}</strong><span>분류</span></div>
                        <div><strong>${pet.body.weight}</strong><span>체중</span></div>
                        <div><strong>${pet.body.coat}</strong><span>모질</span></div>
                        <div><strong>${pet.body.activity}</strong><span>활동량</span></div>
                    </div>
                    <p class="pet-meta">분석일 ${date}</p>
                    <div class="pet-actions">
                        <button type="button" class="btn-pet-rename" data-pet-action="rename">
                            <i class="fa-solid fa-pen"></i> 이름변경
                        </button>
                        <button type="button" class="btn-pet-delete" data-pet-action="delete">
                            <i class="fa-solid fa-trash"></i> 삭제
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        const addCard = `
            <button type="button" class="pet-card-add" data-petlens-trigger>
                <i class="fa-solid fa-plus"></i>
                <strong>다른 댕댕이 추가 분석</strong>
                <span>펫렌즈로 분석하면 여기에 추가돼요</span>
            </button>
        `;

        container.innerHTML = cards + addCard;
        updateHelloStats();
    }

    /** 카드 액션 (이름 변경, 삭제) — 이벤트 위임 */
    document.getElementById('pets-container')?.addEventListener('click', (e) => {
        const action = e.target.closest('[data-pet-action]')?.dataset.petAction;
        const card = e.target.closest('.pet-card');
        if (!action || !card) return;
        const id = card.dataset.petId;
        const pets = getPets();
        const idx = pets.findIndex((p) => p.id === id);
        if (idx < 0) return;

        if (action === 'delete') {
            if (!confirm(`"${pets[idx].name || '이 댕댕이'}" 프로필을 삭제할까요?`)) return;
            pets.splice(idx, 1);
            savePets(pets);
            renderPets();
        } else if (action === 'rename') {
            const newName = prompt('새 이름을 입력해주세요', pets[idx].name || '');
            if (newName === null) return;
            pets[idx].name = newName.trim();
            savePets(pets);
            renderPets();
        }
    });

    // 펫렌즈 트리거 — 추가 카드 / 빈 상태 버튼
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-petlens-trigger]')) {
            const fab = document.getElementById('petlens-fab');
            if (fab) fab.click();
        }
    });

    // ============ 4. 헬로 카드 통계 + 사용자 정보 ============
    function updateHelloStats() {
        const pets = getPets();
        const petCount = document.getElementById('stat-pets');
        if (petCount) petCount.textContent = pets.length;
        // 대시보드의 펫 카운트도 동기화
        const dashPet = document.getElementById('dash-pet-count');
        if (dashPet) dashPet.textContent = pets.length;
        // 대시보드의 펫렌즈 분석 횟수 (현재 1펫=1분석 모델이라 동일하지만,
        // 향후 같은 펫 재분석 누적 시 별개 값이 됨)
        const dashLog = document.getElementById('dash-log-count');
        if (dashLog) dashLog.textContent = pets.length;
        // 주문/포인트는 추후 백엔드 연동 — 일단 mock 값
        const orderCount = document.getElementById('stat-orders');
        if (orderCount) orderCount.textContent = mockOrders.length;
        const points = document.getElementById('stat-points');
        if (points) points.textContent = '1,200';

        // 헬로 카드의 등급 배지 — emoji + 이름 + 색상
        const grade = computeGrade(mockUserStats.annualSpend, mockUserStats.activityPoints);
        const badge = document.getElementById('grade-badge');
        if (badge) {
            badge.innerHTML = `<span class="grade-emoji">${grade.emoji}</span><span>${grade.name}</span>`;
            badge.style.background = grade.color;
        }
        const dashGrade = document.getElementById('dash-grade-name');
        if (dashGrade) dashGrade.textContent = `${grade.emoji} ${grade.name}`;
    }

    /** 로그인 정보에서 표시용 데이터 추출 (mock) */
    function loadUserInfo() {
        let info = {};
        try { info = JSON.parse(localStorage.getItem(LOGIN_KEY)) || {}; }
        catch {}
        const nameEl = document.getElementById('user-name');
        const emailEl = document.getElementById('user-email');
        const sinceEl = document.getElementById('user-since');
        // 실제 회원 데이터 없으므로 mock — provider 별 라벨
        const providerLabel = ({
            google: 'Google 회원', kakao: '카카오 회원',
            naver: '네이버 회원', email: '이메일 회원', demo: '데모 회원',
        })[info.provider] || '댕다방 회원';
        if (nameEl) nameEl.textContent = '댕댕이 가족';
        if (emailEl) emailEl.textContent = providerLabel;
        if (sinceEl && info.ts) {
            const d = new Date(info.ts);
            sinceEl.textContent = d.toLocaleDateString('ko-KR');
        }
    }
    loadUserInfo();

    /* ============ 등급 탭 렌더링 ============
     * 현재 등급 강조 + 다음 등급까지 진행률 + 5개 등급 비교 카드 */
    function renderGrade() {
        const root = document.getElementById('grade-pane-content');
        if (!root) return;
        const spend = mockUserStats.annualSpend;
        const points = mockUserStats.activityPoints;
        const current = computeGrade(spend, points);
        const nextIdx = GRADES.findIndex((g) => g.id === current.id) + 1;
        const next = GRADES[nextIdx] || null;

        // 다음 등급까지 진행률 — 두 조건 중 더 빠른 쪽을 보여줌
        let nextHtml = '';
        if (next) {
            const spendLeft = Math.max(0, next.requireSpend - spend);
            const pointsLeft = Math.max(0, next.requirePoints - points);
            const spendPct = Math.min(100, (spend / next.requireSpend) * 100);
            const pointsPct = Math.min(100, (points / next.requirePoints) * 100);
            nextHtml = `
                <div class="grade-progress-block">
                    <p class="grade-progress-title">
                        <strong>${next.emoji} ${next.name}</strong> 까지
                    </p>
                    <div class="grade-progress-row">
                        <span class="label">구매 누적</span>
                        <div class="bar"><div class="fill" style="width:${spendPct}%;background:${next.color}"></div></div>
                        <span class="left">${spendLeft.toLocaleString()}원 남음</span>
                    </div>
                    <div class="grade-progress-row">
                        <span class="label">활동 점수</span>
                        <div class="bar"><div class="fill" style="width:${pointsPct}%;background:${next.color}"></div></div>
                        <span class="left">${pointsLeft.toLocaleString()}점 남음</span>
                    </div>
                    <p class="grade-progress-hint">둘 중 하나만 채워도 승급 — 구매하거나 리뷰·사진 공유로 활동 점수를 모아주세요</p>
                </div>
            `;
        } else {
            nextHtml = `
                <div class="grade-progress-block top">
                    <p class="grade-progress-title">🎉 최고 등급에 도달했어요</p>
                    <p class="grade-progress-hint">계속 함께해 주셔서 감사해요. 댕다방의 모든 혜택을 누려보세요.</p>
                </div>
            `;
        }

        // 5개 등급 카드 — 현재 등급에 .current 클래스
        const cards = GRADES.map((g) => {
            const isCurrent = g.id === current.id;
            const shipText = g.freeShipMin === null ? '—'
                : g.freeShipMin === 0 ? '모든 주문'
                : `${(g.freeShipMin / 10000).toFixed(0)}만원↑`;
            return `
                <div class="grade-card ${isCurrent ? 'current' : ''}" style="--g:${g.color}">
                    ${isCurrent ? '<span class="grade-current-badge">현재 등급</span>' : ''}
                    <div class="grade-card-head">
                        <span class="emoji">${g.emoji}</span>
                        <strong>${g.name}</strong>
                    </div>
                    <p class="grade-require">
                        연 ${(g.requireSpend / 10000).toLocaleString()}만원 또는<br>
                        활동 ${g.requirePoints}점 이상
                    </p>
                    <ul class="grade-benefits">
                        <li><i class="fa-solid fa-coins"></i> 적립률 <strong>${g.pointsRate}%</strong></li>
                        <li><i class="fa-solid fa-tag"></i> 추가할인 <strong>${g.discount}%</strong></li>
                        <li><i class="fa-solid fa-truck"></i> 무료배송 <strong>${shipText}</strong></li>
                        ${g.perks.map((p) => `<li><i class="fa-solid fa-gift"></i> ${p}</li>`).join('')}
                    </ul>
                </div>
            `;
        }).join('');

        root.innerHTML = `
            <div class="grade-summary">
                <div class="grade-current" style="background:${current.color}">
                    <span class="grade-current-emoji">${current.emoji}</span>
                    <div>
                        <p class="eyebrow">현재 등급</p>
                        <h3>${current.name}</h3>
                    </div>
                </div>
                <div class="grade-current-stats">
                    <div><strong>${spend.toLocaleString()}원</strong><span>연간 누적 구매</span></div>
                    <div><strong>${points}점</strong><span>활동 점수</span></div>
                </div>
            </div>
            ${nextHtml}
            <h3 class="grade-section-title">전체 등급별 혜택</h3>
            <div class="grade-cards-grid">${cards}</div>
        `;
    }

    /* ============ 펫렌즈 기록 (분석 이력 타임라인) ============
     * daengdabang_pets 를 분석일자 역순으로 정렬 → 세로 타임라인.
     * 각 행: 날짜·도트 / 썸네일·이름·견종 / 컴팩트 체형 / 상세 토글
     * "펫 프로필" 탭은 대표 카드 그리드,
     * 여기는 매 분석을 누적 기록한 로그 — 같은 펫을 재분석해도 별개 행.
     */
    function renderPetlensLog() {
        const root = document.getElementById('petlens-log-content');
        if (!root) return;
        const list = getPets().slice().sort((a, b) => b.analyzedAt - a.analyzedAt);

        if (list.length === 0) {
            root.innerHTML = `
                <div class="pane-empty">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    <h3>아직 분석 기록이 없어요</h3>
                    <p>펫렌즈로 분석할 때마다 여기에 시간순으로 쌓여요.</p>
                </div>
            `;
            return;
        }

        const rows = list.map((p) => {
            const d = new Date(p.analyzedAt);
            const dateStr = d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            const name = (p.name && p.name.trim()) || '이름 없음';
            const thumb = p.avatar
                ? `<img src="${p.avatar}" alt="${name}">`
                : `<i class="fa-solid fa-dog"></i>`;
            return `
                <li class="petlens-log-row" data-pet-id="${p.id}">
                    <div class="log-time">
                        <span class="log-date">${dateStr}</span>
                        <span class="log-hour">${timeStr}</span>
                    </div>
                    <div class="log-dot"></div>
                    <div class="log-card">
                        <div class="log-card-head">
                            <div class="log-thumb">${thumb}</div>
                            <div class="log-summary">
                                <h4>${name} <span class="log-breed">${p.breed}</span></h4>
                                <p>유사도 ${p.confidence}% · ${p.body.size} · ${p.body.weight} · ${p.body.coat} · ${p.body.activity}</p>
                            </div>
                            <button type="button" class="log-toggle" data-log-toggle aria-expanded="false">
                                <i class="fa-solid fa-chevron-down"></i>
                            </button>
                        </div>
                        <div class="log-detail" hidden>
                            <div class="log-detail-stats">
                                <div><strong>${p.body.size}</strong><span>분류</span></div>
                                <div><strong>${p.body.weight}</strong><span>추정 체중</span></div>
                                <div><strong>${p.body.coat}</strong><span>모질</span></div>
                                <div><strong>${p.body.activity}</strong><span>활동량</span></div>
                            </div>
                            <div class="log-actions">
                                <button type="button" class="btn-log-delete" data-log-delete>
                                    <i class="fa-solid fa-trash"></i> 이 기록 삭제
                                </button>
                            </div>
                        </div>
                    </div>
                </li>
            `;
        }).join('');

        root.innerHTML = `
            <p class="petlens-log-count">총 <strong>${list.length}</strong>개의 분석 기록</p>
            <ul class="petlens-log-list">${rows}</ul>
        `;
    }

    // 타임라인 행 토글 + 삭제 이벤트 위임 (renderPetlensLog 가 매번 innerHTML 갱신하므로 위임으로)
    document.addEventListener('click', (e) => {
        // 상세 토글
        const toggle = e.target.closest('[data-log-toggle]');
        if (toggle) {
            const card = toggle.closest('.log-card');
            const detail = card?.querySelector('.log-detail');
            if (!detail) return;
            const isOpen = !detail.hidden;
            detail.hidden = isOpen;
            toggle.setAttribute('aria-expanded', String(!isOpen));
            toggle.classList.toggle('open', !isOpen);
            return;
        }
        // 삭제
        const del = e.target.closest('[data-log-delete]');
        if (del) {
            const row = del.closest('.petlens-log-row');
            const id = row?.dataset.petId;
            if (!id) return;
            if (!confirm('이 분석 기록을 삭제할까요? (펫 프로필도 함께 삭제됩니다)')) return;
            const pets = getPets().filter((p) => p.id !== id);
            savePets(pets);
            renderPetlensLog();
            renderPets();
            updateHelloStats();
        }
    });

    function renderOrders() {
        const list = document.getElementById('orders-list');
        if (!list) return;
        list.innerHTML = mockOrders.map((o) => `
            <div class="order-card">
                <div class="order-thumb"><i class="fa-solid ${o.icon}"></i></div>
                <div class="order-info">
                    <div class="order-date">${o.date} · ${o.id}</div>
                    <h4 class="order-name">${o.name}</h4>
                    <span class="order-status ${o.status}">${statusLabel[o.status]}</span>
                </div>
                <div class="order-amount">
                    <strong>${o.amount.toLocaleString()}원</strong>
                    <span>결제완료</span>
                </div>
            </div>
        `).join('');
    }

    // ============ 6. 첫 렌더 ============
    renderPets();
    renderOrders();
    renderGrade();
    renderPetlensLog();
    updateHelloStats();

    // 다른 페이지(메인의 펫렌즈 모달)에서 펫 추가됐을 때 자동 반영
    window.addEventListener('storage', (e) => {
        if (e.key === PETS_KEY) {
            renderPets();
            renderPetlensLog();
            updateHelloStats();
        }
    });
})();
