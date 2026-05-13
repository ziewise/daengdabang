/* =====================================================================
 * header.js
 * ---------------------------------------------------------------------
 * 사이트 헤더(모든 페이지 상단)의 인터랙션 로직.
 *
 *   1. 스크롤 시 헤더 강화 (배경 진하게 + 그림자 강화)
 *   2. 데스크탑 드롭다운 — 호버 + 클릭으로 카테고리/브랜드/기획전 메뉴 열기
 *   3. 외부 클릭 / ESC 키로 드롭다운 닫기
 *   4. 모바일 슬라이드 패널 — 햄버거 버튼으로 우측에서 열림
 *   5. 모바일 아코디언 — 카테고리/브랜드/기획전 펼치기 (한 번에 하나만)
 *   6. 검색 모달 — 돋보기 클릭 / Ctrl+K / Cmd+K 로 열림
 *   7. 검색 모달의 최근 검색어 — localStorage 에 저장 (최대 6개)
 *   8. 인기 검색어 태그 클릭 시 인풋에 채워지고 기록
 *   9. 로그인 상태 토글 데모 — 비로그인=로그인 / 로그인=마이페이지 버튼 전환
 *
 * 이 스크립트는 IIFE 로 감싸 전역 오염을 막는다.
 * ===================================================================== */

(() => {
    // 헤더 DOM 참조
    const header = document.querySelector('.site-header');
    // 드롭다운이 달린 메뉴 아이템들 (카테고리/브랜드/기획전)
    const navItems = document.querySelectorAll('.nav-item.has-dropdown');
    // 호버 종료 후 일정 시간 뒤 닫는 타이머 보관 (각 nav-item 별로 관리)
    const hoverCloseTimers = new WeakMap();

    // ============ 1. 스크롤 시 헤더 강화 ============
    const onScroll = () => {
        header?.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // ============ 2. 데스크탑 드롭다운 ============
    // 호버 진입 시 즉시 열고, 마우스가 떠난 후 180ms 지연 후 닫음 (실수로 빠진 경우 대비).
    // 키보드 접근성을 위해 nav-link 클릭으로도 토글 가능.
    navItems.forEach((item) => {
        const open = () => {
            clearTimeout(hoverCloseTimers.get(item));
            navItems.forEach((o) => { if (o !== item) o.classList.remove('open'); });
            item.classList.add('open');
        };
        const scheduleClose = () => {
            const t = setTimeout(() => item.classList.remove('open'), 180);
            hoverCloseTimers.set(item, t);
        };
        item.addEventListener('mouseenter', open);
        item.addEventListener('mouseleave', scheduleClose);

        // 클릭으로 토글 (접근성)
        const link = item.querySelector(':scope > .nav-link');
        link?.addEventListener('click', (e) => {
            e.preventDefault();
            const wasOpen = item.classList.contains('open');
            navItems.forEach((o) => o.classList.remove('open'));
            if (!wasOpen) item.classList.add('open');
        });
    });

    // ============ 3. 외부 클릭 / ESC 로 닫기 ============
    // 사용자가 드롭다운 밖을 클릭하면 모든 드롭다운을 닫는다.
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-item.has-dropdown')) {
            navItems.forEach((item) => item.classList.remove('open'));
        }
    });

    // ESC 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            navItems.forEach((item) => item.classList.remove('open'));
            closeMobilePanel();
            closeSearchModal();
        }
    });

    // ============ 4. 모바일 슬라이드 패널 ============
    // 햄버거 버튼 → 우측에서 패널 슬라이드 인 + 뒤 오버레이 표시.
    // 닫기 버튼 / 오버레이 클릭 / ESC 로 닫힘.
    const mobileToggle = document.querySelector('.mobile-toggle');
    const mobilePanel = document.querySelector('.mobile-panel');
    const mobileClose = document.querySelector('.mobile-panel-close');
    const mobileOverlay = document.querySelector('.mobile-overlay');

    const openMobilePanel = () => {
        mobilePanel?.classList.add('open');
        mobileOverlay?.classList.add('show');
        document.body.style.overflow = 'hidden';
    };
    function closeMobilePanel() {
        mobilePanel?.classList.remove('open');
        mobileOverlay?.classList.remove('show');
        document.body.style.overflow = '';
    }

    mobileToggle?.addEventListener('click', openMobilePanel);
    mobileClose?.addEventListener('click', closeMobilePanel);
    mobileOverlay?.addEventListener('click', closeMobilePanel);

    // ============ 5. 모바일 아코디언 ============
    // 카테고리/브랜드/기획전 항목 클릭 시 펼침/접힘.
    // UX 단순화를 위해 한 번에 한 그룹만 열리도록 (다른 그룹은 자동 닫힘).
    document.querySelectorAll('.mobile-menu-list .submenu-toggle').forEach((btn) => {
        btn.addEventListener('click', () => {
            const li = btn.closest('li');
            const wasOpen = li.classList.contains('expanded');
            li.parentElement.querySelectorAll(':scope > li.expanded').forEach((o) => o.classList.remove('expanded'));
            if (!wasOpen) li.classList.add('expanded');
        });
    });

    // ============ 6~8. 검색 모달 ============
    // 헤더 돋보기 아이콘 → 풀스크린 오버레이 + 중앙 글래스 모달.
    // 입력 + 인기 검색어 태그 + 최근 검색어(localStorage) + 빠른 이동 카드 포함.
    // Ctrl+K / ⌘K 단축키, ESC 닫기, 오버레이 클릭 닫기 지원.
    const searchTriggers = document.querySelectorAll('[data-search-trigger]');
    const searchModal = document.querySelector('.search-modal');
    const searchOverlay = document.querySelector('.search-modal-overlay');
    const searchCloseBtn = document.querySelector('.search-modal-close');
    const searchInput = document.querySelector('#search-modal-input');
    const recentSection = document.querySelector('.recent-section');
    const recentList = document.querySelector('.recent-list');
    const clearRecentBtn = document.querySelector('.clear-recent');

    const RECENT_KEY = 'daengdabang_recent_search';
    const MAX_RECENT = 6;

    const getRecent = () => {
        try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
        catch { return []; }
    };
    const saveRecent = (items) => localStorage.setItem(RECENT_KEY, JSON.stringify(items));
    const addRecent = (q) => {
        q = q.trim();
        if (!q) return;
        const items = getRecent().filter((x) => x !== q);
        items.unshift(q);
        saveRecent(items.slice(0, MAX_RECENT));
        renderRecent();
    };
    const removeRecent = (q) => {
        saveRecent(getRecent().filter((x) => x !== q));
        renderRecent();
    };
    const renderRecent = () => {
        if (!recentList || !recentSection) return;
        const items = getRecent();
        if (items.length === 0) { recentSection.hidden = true; return; }
        recentSection.hidden = false;
        recentList.innerHTML = items.map((q) => `
            <li>
                <a href="#search?q=${encodeURIComponent(q)}" data-recent-query="${q.replace(/"/g, '&quot;')}">
                    <i class="fa-regular fa-clock clock"></i>
                    <span>${q.replace(/</g, '&lt;')}</span>
                </a>
                <button class="remove" aria-label="삭제" data-remove="${q.replace(/"/g, '&quot;')}">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </li>
        `).join('');
    };
    renderRecent();

    let lastFocused = null;
    const openSearchModal = () => {
        lastFocused = document.activeElement;
        searchModal?.classList.add('show');
        searchOverlay?.classList.add('show');
        document.body.style.overflow = 'hidden';
        setTimeout(() => searchInput?.focus(), 60);
    };
    function closeSearchModal() {
        searchModal?.classList.remove('show');
        searchOverlay?.classList.remove('show');
        document.body.style.overflow = '';
        lastFocused?.focus?.();
    }

    searchTriggers.forEach((el) => el.addEventListener('click', (e) => {
        e.preventDefault();
        openSearchModal();
    }));
    searchCloseBtn?.addEventListener('click', closeSearchModal);
    searchOverlay?.addEventListener('click', closeSearchModal);

    // Cmd/Ctrl + K
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (searchModal?.classList.contains('show')) closeSearchModal();
            else openSearchModal();
        }
    });

    // Enter 검색
    searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const q = searchInput.value.trim();
            if (q) {
                addRecent(q);
                // TODO: 실제 검색 결과 페이지로 이동
                // window.location.href = `search.html?q=${encodeURIComponent(q)}`;
                console.log('[Search]', q);
            }
        }
    });

    // 최근 검색 클릭/삭제
    recentList?.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-remove]');
        if (removeBtn) {
            e.preventDefault();
            removeRecent(removeBtn.dataset.remove);
            return;
        }
        const link = e.target.closest('[data-recent-query]');
        if (link) {
            e.preventDefault();
            searchInput.value = link.dataset.recentQuery;
            addRecent(link.dataset.recentQuery);
        }
    });
    clearRecentBtn?.addEventListener('click', () => {
        saveRecent([]);
        renderRecent();
    });

    // 인기 검색어 태그 클릭
    document.querySelectorAll('[data-search-tag]').forEach((tag) => {
        tag.addEventListener('click', (e) => {
            e.preventDefault();
            const q = tag.dataset.searchTag;
            searchInput.value = q;
            addRecent(q);
            searchInput.focus();
        });
    });

    // ============ 9. 로그인 상태 표시 (페이지 간 유지) ============
    // localStorage 에 저장된 로그인 정보를 읽어 헤더 버튼을 동적 전환.
    //   비로그인 → "로그인" 버튼 (login.html 로 이동)
    //   로그인  → "마이페이지" 버튼 (클릭 시 작은 드롭다운: 마이페이지·주문내역·찜·로그아웃)
    //
    // 로그인 상태는 auth.js 의 setLoggedIn() 으로 저장됨.
    // 로그아웃은 이 드롭다운의 "로그아웃" 항목 클릭으로 처리.
    const LOGIN_KEY = 'daengdabang_logged_in';
    const authBtns = document.querySelectorAll('[data-auth-btn]');

    /** localStorage 에서 로그인 상태 읽기 */
    function isLoggedInNow() {
        try { return !!JSON.parse(localStorage.getItem(LOGIN_KEY)); }
        catch { return false; }
    }
    /** 로그아웃 — localStorage 클리어 + 헤더 다시 렌더 */
    function logout() {
        localStorage.removeItem(LOGIN_KEY);
        renderAuth();
        // 마이페이지 등 보호된 페이지에 있었다면 main 으로 이동시키는 게 좋음
        // 일단은 새로고침으로 상태 반영
        location.reload();
    }
    // 다른 페이지·다른 탭에서 로그인/로그아웃하면 storage 이벤트로 동기화
    window.addEventListener('storage', (e) => {
        if (e.key === LOGIN_KEY) renderAuth();
    });

    let isLoggedIn = isLoggedInNow();

    const renderAuth = () => {
        authBtns.forEach((btn) => {
            if (isLoggedIn) {
                btn.innerHTML = '<i class="fa-solid fa-user"></i><span>마이페이지</span>';
                btn.setAttribute('href', 'mypage.html');
            } else {
                btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>로그인</span>';
                btn.setAttribute('href', 'login.html');
            }
        });
    };
    renderAuth();

    // 로그아웃 클릭 처리 (이벤트 위임)
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-logout]')) {
            e.preventDefault();
            logout();
        }
    });

    // 데모 토글 — menu-preview.html 의 #demo-auth-toggle 버튼 (테스트용)
    const demoBtn = document.querySelector('#demo-auth-toggle');
    demoBtn?.addEventListener('click', () => {
        if (isLoggedIn) {
            localStorage.removeItem(LOGIN_KEY);
            isLoggedIn = false;
        } else {
            localStorage.setItem(LOGIN_KEY, JSON.stringify({ provider: 'demo', ts: Date.now() }));
            isLoggedIn = true;
        }
        renderAuth();
        demoBtn.textContent = isLoggedIn ? '로그아웃 시뮬레이트' : '로그인 시뮬레이트';
    });
})();
