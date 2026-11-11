/**
 * SavedAddressPickerModal — 주문/결제 "저장된 배송지 불러오기" 고르기 창(2026-11-11 사용자)
 * ---------------------------------------------------------------------
 * 마이페이지 배송지 관리에 저장한 주소를 카드로 보여 주고, "이 주소로"를 누르면 주문서 배송지 칸을 채움.
 * 채우기는 주문/결제 화면의 기존 함수(applySavedAddress)를 그대로 부르고, 목록도 기존 불러오기(loadCustomerAddresses) 결과를 받음.
 * 모양은 마이페이지 주소 검색 창과 같은 결(.ddb-petform .ddb-addrsearch 창 · .ddb-addr-picked 하늘 카드 · .ddb-as-hint 안내 · 분홍 알약).
 * 상태: 불러오는 중 · 목록 · 저장된 배송지 없음(배송지 관리로 가기) · 못 불러옴(다시 불러오기).
 */
"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { CustomerAddress } from "@/lib/customer-api";
// 창 · 카드 꾸밈(.ddb-addr* · .ddb-as-* · .ddb-sa-*) — 주문/결제 화면에서도 같은 모양
import "@/app/mypage-web.css";

export type SavedAddressLoadState = "loading" | "ready" | "failed";

type Props = {
    addresses: CustomerAddress[];
    state: SavedAddressLoadState;
    selectedId: string;
    onPick: (addressId: string) => void;
    onRetry: () => void;
    onClose: () => void;
};

export default function SavedAddressPickerModal({ addresses, state, selectedId, onPick, onRetry, onClose }: Props) {
    const titleId = useId();
    const closeRef = useRef<HTMLButtonElement>(null);

    // 열려 있는 동안 뒤 화면 스크롤 잠금 · 닫기 단추에 초점 · Esc 로 닫기
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = "hidden";
        closeRef.current?.focus();
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => {
            root.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [onClose]);

    // 기본 배송지를 맨 위로(나머지는 받은 순서 그대로)
    const ordered = [...addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

    return createPortal(
        <div className="ddb-petform ddb-addrsearch ddb-sa" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="ddb-pf-backdrop" onClick={onClose} aria-hidden="true" />
            <div className="ddb-pf-card">
                <header className="ddb-pf-head">
                    <span className="ddb-pf-avatar" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                        <img src="/images/ui/stickers/my-address.webp" alt="" />
                    </span>
                    <div className="ddb-pf-titles">
                        <p className="ddb-pf-kicker">MY ADDRESS</p>
                        <h2 id={titleId}><span className="ddb-pf-name">저장된 배송지</span></h2>
                        <p className="ddb-pf-sub">배송지 관리에 저장한 주소를 고르면 받는 분 · 연락처 · 주소가 바로 채워져요.</p>
                    </div>
                    <button ref={closeRef} type="button" className="ddb-pf-close" onClick={onClose} aria-label="저장된 배송지 창 닫기">
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </header>

                <div className="ddb-as-body ddb-sa-body" aria-live="polite">
                    {state === "loading" && addresses.length === 0 ? (
                        <p className="ddb-as-hint"><i className="fa-solid fa-paw fa-bounce" aria-hidden="true" />저장된 배송지를 불러오고 있어요.</p>
                    ) : state === "failed" && addresses.length === 0 ? (
                        <div className="ddb-sa-empty">
                            <p className="ddb-as-hint"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />저장된 배송지를 불러오지 못했어요. 잠시 뒤 다시 불러와 주세요.</p>
                            <button type="button" className="ddb-pf-cancel" onClick={onRetry}>
                                <i className="fa-solid fa-rotate-right" aria-hidden="true" />다시 불러오기
                            </button>
                        </div>
                    ) : ordered.length === 0 ? (
                        <div className="ddb-sa-empty">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                            <img src="/images/ui/pet-home-96.webp" alt="" aria-hidden="true" />
                            <strong>아직 저장된 배송지가 없어요</strong>
                            <span>배송지 관리에서 주소 검색으로 한 번 저장해 두면, 다음 주문부터 바로 불러와요.</span>
                        </div>
                    ) : (
                        <ul className="ddb-sa-list">
                            {ordered.map((address) => (
                                <li key={address.id} className="ddb-addr-picked" data-current={address.id === selectedId || undefined}>
                                    <span className="ddb-addr-zip"><em>{address.label}</em>{address.postalCode}</span>
                                    <strong>{address.addressLine1}{address.addressLine2 ? ` ${address.addressLine2}` : ""}</strong>
                                    <small>
                                        {address.recipientName} · {address.phone}
                                        {address.isDefault && <b className="ddb-sa-badge">기본 배송지</b>}
                                    </small>
                                    <button type="button" onClick={() => onPick(address.id)}>
                                        <i className="fa-solid fa-check" aria-hidden="true" />
                                        {address.id === selectedId ? "지금 채운 주소" : "이 주소로"}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <footer className="ddb-as-foot">
                    <div className="ddb-as-actions">
                        {/* 배송지 추가 · 수정은 마이페이지 배송지 관리에서(기존 화면) */}
                        <Link href="/mypage/address/" className="ddb-pf-cancel ddb-sa-manage">
                            <i className="fa-solid fa-gear" aria-hidden="true" />배송지 관리
                        </Link>
                        <button type="button" className="ddb-pf-cancel" onClick={onClose}>닫기</button>
                    </div>
                </footer>
            </div>
        </div>,
        document.body,
    );
}
