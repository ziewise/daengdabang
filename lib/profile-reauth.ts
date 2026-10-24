/**
 * profile-reauth.ts — 개인정보 화면 "한 번 더 확인"(재인증) 기억 · 2026-10-25
 * ---------------------------------------------------------------------
 * 쇼핑몰처럼 개인정보 확인/수정에 들어갈 때 비밀번호(간편가입은 공급자 다시 로그인)를 한 번 더 확인함.
 *  - 확인은 서버가 함: 이메일 회원은 기존 로그인 확인(loginCustomer), 간편가입 회원은 공급자 로그인(startSocialLogin)을 다시 거침.
 *  - 이 파일은 "확인했다"는 표시를 이 탭(sessionStorage)에 10분 동안 기억하는 일만 함 — 탭을 닫으면 사라짐.
 *  - 화면 잠금일 뿐 서버 권한이 아님: 비밀번호 변경은 서버가 현재 비밀번호를 다시 검사함.
 *    (협업자 메모: 전용 재인증 주소가 생기면 여기서 그 주소를 부르도록 바꾸면 됨)
 * 비밀번호 자체는 어디에도 저장하지 않음.
 */
"use client";

import { useSyncExternalStore } from "react";

const KEY = "ddb.profile.reauth.v1";
const PENDING_KEY = "ddb.profile.reauth.pending.v1";
const EVENT = "ddb-profile-reauth";
/** 확인 유지 시간 */
export const REAUTH_TTL_MS = 10 * 60 * 1000;
/** 간편가입 다시 로그인 — 다녀오는 데 허용하는 시간 */
const PENDING_TTL_MS = 10 * 60 * 1000;

type Saved = { account: string; at: number; token?: string };

/** 로그인 토큰 끝 몇 글자(같은 로그인인지 비교만 함 — 토큰 자체는 저장하지 않음) */
const tokenMark = (token?: string) => (token ? token.slice(-10) : "");

function readSaved(raw: string | null): Saved | null {
    if (!raw) return null;
    try {
        const value = JSON.parse(raw) as Saved;
        return typeof value?.account === "string" && typeof value?.at === "number" ? value : null;
    } catch {
        return null;
    }
}

function storage() {
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

function subscribe(onChange: () => void) {
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
}

/** 이 계정의 확인 시각(없으면 null) — 화면이 다시 그려지도록 구독 */
export function useReauthAt(account: string): number | null {
    const raw = useSyncExternalStore(subscribe, () => storage()?.getItem(KEY) ?? null, () => null);
    const saved = readSaved(raw);
    return saved && saved.account === account ? saved.at : null;
}

/** 확인 완료 기억 */
export function saveReauth(account: string) {
    storage()?.setItem(KEY, JSON.stringify({ account, at: Date.now() } satisfies Saved));
    window.dispatchEvent(new Event(EVENT));
}

/** 잠그기 · 로그아웃 때 지움 */
export function clearReauth() {
    storage()?.removeItem(KEY);
    storage()?.removeItem(PENDING_KEY);
    window.dispatchEvent(new Event(EVENT));
}

/** 간편가입 회원 — 공급자로 다시 로그인하러 가기 전에 표시 */
export function markSocialReauthPending(account: string, currentToken?: string) {
    storage()?.setItem(PENDING_KEY, JSON.stringify({ account, at: Date.now(), token: tokenMark(currentToken) } satisfies Saved));
}

/**
 * 공급자에서 돌아왔을 때(주소에 reauth=1) — 보낸 표시가 있고 같은 계정이면 확인 완료로 바꿈.
 * 돌아오는 길에 기존 간편로그인 처리(소셜 콜백)가 새 로그인 토큰을 받아 오므로, 떠나기 전 토큰과 다를 때만 통과(주소만 바꿔서는 통과 못 함).
 */
export function consumeSocialReauth(account: string, currentToken?: string): boolean {
    const pending = readSaved(storage()?.getItem(PENDING_KEY) ?? null);
    storage()?.removeItem(PENDING_KEY);
    const fresh = Boolean(currentToken) && tokenMark(currentToken) !== (pending?.token || "");
    if (!pending || !fresh) return false;
    if (pending.account !== account || Date.now() - pending.at > PENDING_TTL_MS) return false;
    saveReauth(account);
    return true;
}
