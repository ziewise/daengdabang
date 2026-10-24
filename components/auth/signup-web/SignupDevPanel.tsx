/**
 * SignupDevPanel — 회원가입 "단계 바로 보기" 판(개발 서버 전용 · 2026-10-24 사용자 "내 브라우저에서 단계만 따로 보기")
 * ---------------------------------------------------------------------
 * npm run dev 에서만 그려짐(배포 빌드는 NODE_ENV=production 이라 부품 자체가 빠짐). 가입 기능 · 서버 요청은 건드리지 않음.
 *  - useSignupDevPreviewBoot: 주소에 ?sxpreview 가 있으면 미리보기용 가짜 서버(localhost:8010)와 미리보기 스위치를 켜고 한 번 새로고침
 *  - SignupDevPanel: 왼쪽 아래 떠 있는 판 — 단계 · 갈림길 단추를 누르면 그 화면으로 바로 바뀜(접고 펼 수 있음)
 */
"use client";

import { useEffect, useState } from "react";

/** 개발 서버인가(배포 빌드에서는 false 로 굳어 아래 코드가 모두 빠짐) */
export const SIGNUP_DEV = process.env.NODE_ENV === "development";

const MOCK_API = "http://localhost:8010";
const PREVIEW_VALUE = JSON.stringify({ identity: "ok" });

/** ?sxpreview 로 들어오면 가짜 서버 · 미리보기 스위치를 켜고 새로고침(이미 켜져 있으면 그대로) */
export function useSignupDevPreviewBoot() {
    useEffect(() => {
        if (!SIGNUP_DEV) return;
        const params = new URLSearchParams(window.location.search);
        if (!params.has("sxpreview")) return;
        const ready = window.localStorage.getItem("ddb.apiBase") === MOCK_API && Boolean(window.localStorage.getItem("ddb.signup.preview"));
        if (ready) return;
        window.localStorage.setItem("ddb.apiBase", MOCK_API);
        window.localStorage.setItem("ddb.signup.preview", PREVIEW_VALUE);
        window.location.reload();
    }, []);
}

export type DevJump = { label: string; onClick: () => void; active?: boolean };
export type DevJumpGroup = { title: string; items: DevJump[] };

export function SignupDevPanel({ groups }: { groups: DevJumpGroup[] }) {
    // 넓은 화면은 펼친 채, 좁은 화면(내용을 가림)은 접힌 채 시작 — 가입 화면은 브라우저에서만 그려져 window 를 바로 읽어도 됨
    const [open, setOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1100);
    if (!SIGNUP_DEV) return null;
    return (
        <aside className="sxw-dev" aria-label="단계 바로 보기(개발 전용)">
            <button type="button" className="sxw-dev-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
                <i className="fa-solid fa-layer-group" aria-hidden="true" />
                단계 바로 보기
                <em>개발 전용</em>
                <i className={open ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-up"} aria-hidden="true" />
            </button>
            {open && (
                <div className="sxw-dev-body">
                    {groups.map((group) => (
                        <div key={group.title} className="sxw-dev-group">
                            <p>{group.title}</p>
                            <span>
                                {group.items.map((item) => (
                                    <button key={item.label} type="button" className={item.active ? "is-on" : ""} onClick={item.onClick}>
                                        {item.label}
                                    </button>
                                ))}
                            </span>
                        </div>
                    ))}
                    <p className="sxw-dev-note">가짜 서버 · 테스트 보안 키로 동작해요. 실제 가입 · 서버 저장은 없어요.</p>
                </div>
            )}
        </aside>
    );
}

/** 간편가입 돌아옴 화면으로 이동(가짜 로그인 정보 · 미리보기 갈림길) */
export function goSocialPreview(kind: "new" | "existing" | "cancelled" | "email_exists" | "no_email", provider = "kakao") {
    window.localStorage.setItem("ddb.signup.preview", JSON.stringify({ identity: "ok", social: kind }));
    window.sessionStorage.setItem("ddb.signup.emailBonusResume.v1", JSON.stringify({ source: "social", returnTo: "/mypage" }));
    const name = encodeURIComponent("김댕댕");
    const hash = kind === "cancelled" || kind === "email_exists"
        ? `#provider=${provider}`
        : `#provider=${provider}&name=${name}&email=${kind === "no_email" ? "" : "daeng%40kakao.com"}&access_token=preview-token`;
    // 콜백 화면은 주소의 # 값을 처음 그릴 때 읽으므로 새로 불러옴
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- 개발 전용: 새로 불러와야 미리보기 값이 적용됨
    window.location.assign(`${window.location.origin}/auth/social-callback/${hash}`);
}
