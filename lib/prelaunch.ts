export const PRELAUNCH_NOTICE_EVENT = "ddb:prelaunch-notice";

export function openPrelaunchNotice() {
    window.dispatchEvent(new Event(PRELAUNCH_NOTICE_EVENT));
}
