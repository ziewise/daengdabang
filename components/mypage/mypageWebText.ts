/**
 * mypageWebText — 웹 마이페이지 오류 문구 고르기 · 2026-10-26
 * ---------------------------------------------------------------------
 * 앱(html.ddb-app-mode): 원래 문구(appText) 그대로 — 앱 글자는 하나도 바뀌지 않음.
 * 웹: 서버가 보낸 원문(영어 detail · 개발용 문구)을 그대로 보이지 않고, 상황마다 정해 둔 해요체 문장(webText)을 보여 줌.
 *   단, 입력을 고쳐 달라는 안내(400 · 409 · 422 + 한글 문구)는 사용자에게 필요한 말이라 그대로 둠.
 * 동작(요청 · 재시도 · 상태값)은 그대로, 보여 주는 글자만 고름.
 */

// 지금 웹 화면인가(앱 표시 ddb-app-mode 가 없으면 웹) — 이벤트 처리 중에 부르는 용도(화면 그리기 중에는 useWebScreen 사용)
export function isWebScreenNow(): boolean {
    return typeof document !== "undefined" && !document.documentElement.classList.contains("ddb-app-mode");
}

// 오류 객체에서 HTTP 상태 번호만 꺼냄(DdbApiError · TossOrderHistoryApiError 둘 다 status 를 가짐)
function errorStatus(caught: unknown): number | undefined {
    const status = (caught as { status?: unknown } | null)?.status;
    return typeof status === "number" ? status : undefined;
}

// 웹에 보여 줄 오류 문구 — appText: 앱에서 원래 보이던 문구, webText: 웹에서 보일 해요체 기본 문장
export function mypageErrorText(caught: unknown, appText: string, webText: string): string {
    if (!isWebScreenNow()) return appText;
    const status = errorStatus(caught);
    const message = caught instanceof Error ? caught.message.trim() : "";
    // 입력 확인 안내(한글로 온 400 · 409 · 422)는 고칠 내용을 알려 주는 말이라 그대로
    if (status !== undefined && [400, 409, 422].includes(status) && /[가-힣]/.test(message)) return message;
    // 로그인 만료 · 요청 많음은 상황이 분명해서 따로 안내
    if (status === 401) return "로그인이 만료되었어요. 다시 로그인해 주세요.";
    if (status === 429) return "요청이 많아 잠시 쉬고 있어요. 조금 뒤 다시 시도해 주세요.";
    return webText;
}
