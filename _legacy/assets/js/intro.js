/* =====================================================================
 * intro.js
 * ---------------------------------------------------------------------
 * 인트로 페이지(index.html)의 비디오 스플래시 → 메인 인트로 섹션 전환 로직.
 *
 *   1. 페이지 로드 시 splash 영상을 자동 재생 (autoplay muted)
 *   2. 영상이 끝나거나 사용자가 화면을 클릭하면 skipVideo() 호출
 *   3. skipVideo() 는 splash 를 페이드 아웃하고 오로라 글래스 인트로 섹션을 노출
 *
 * index.html 의 #video-splash, #splash-video, #intro-main 요소에 의존한다.
 * ===================================================================== */

// DOM 참조
const splashContainer = document.getElementById('video-splash');   // 스플래시 컨테이너
const videoEl         = document.getElementById('splash-video');   // 실제 <video> 요소
const introSection    = document.getElementById('intro-main');     // 영상 종료 후 노출될 인트로 섹션
let skipTimeout;                                                   // 페이드 아웃 후 표시 전환을 위한 타이머

/**
 * 스플래시 영상을 종료하고 메인 인트로 섹션으로 전환.
 * - splash 의 opacity 를 0 으로 만들어 1초 페이드 아웃
 * - 페이드 끝나면 splash 를 display:none 으로 숨기고 영상 일시정지
 * - 인트로 섹션에 .active 클래스를 부여 + opacity 1 로 페이드 인
 */
function skipVideo() {
    splashContainer.style.opacity = '0';
    skipTimeout = setTimeout(() => {
        splashContainer.style.display = 'none';
        videoEl.pause();
        introSection.classList.add('active');
        // setTimeout 50ms 는 display 변경 후 transition 이 작동하도록 한 틱 기다림
        setTimeout(() => { introSection.style.opacity = '1'; }, 50);
    }, 1000);
}

// 페이지 로드 시 영상 자동 재생 시작
window.onload = () => {
    videoEl.src = 'assets/videos/intro.mp4';
    videoEl.load();
    const playPromise = videoEl.play();
    // 일부 브라우저(특히 모바일)에서 autoplay 가 차단되어도 에러를 무시 — 사용자가 클릭으로 스킵 가능
    if (playPromise !== undefined) playPromise.catch(() => {});
    // 영상이 자연 종료되면 자동으로 skipVideo 호출
    videoEl.onended = () => skipVideo();
};
