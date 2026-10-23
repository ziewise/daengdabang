"use client";

/**
 * ProductsWebToolbar — 웹 상품 목록(전체상품 · 제품군 페이지) 머리 줄 (2026-10-22 사용자 결정)
 * ---------------------------------------------------------------------
 * 제목(카페24 + 세 색 크레파스 밑줄) · 상품 개수(크레파스 글씨)는 왼쪽, 같은 줄 오른쪽에
 * 흰 알약 세 개: 검색 · 카테고리(제품군 페이지는 세부 카테고리) · 정렬.
 *  - 카테고리 버튼: 안 골랐으면 "카테고리"(옅은 글씨), 고르면 고른 이름만("카테고리:" 같은 이름표 없음).
 *  - 정렬 버튼: "정렬" 글자 없이 고른 값만, 목록은 추천순 · 최신순 · 낮은 가격순 · 높은 가격순.
 *  - 펼친 목록은 버튼과 같은 흰 크레파스 종이, 글자 길이만큼만 넓음. 고른 항목은 세 색 크레파스 밑줄.
 * 웹 전용(웹 크레파스 컨셉 — 스티커 요소 없음). 앱은 기존 머리글 · 필터(앱 겉모양 CSS 가 쓰는 구조)를 그대로 쓰고
 * 이 줄은 CSS 로 숨김(globals.css "웹 상품 목록 머리 줄"). 값 · 바꾸는 함수는 ProductsClient 의 것을 그대로 받음.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

export type ToolbarOption = { value: string; label: string };

type SelectProps = {
    /** 화면 읽기용 이름(예: 카테고리 · 정렬) — 버튼에는 보이지 않음 */
    label: string;
    /** 지금 고른 값 */
    value: string;
    options: ToolbarOption[];
    /** 안 골랐을 때(value 가 이 값이면) 버튼에 옅게 보일 글자 — 없으면 고른 이름을 그대로 */
    placeholder?: { value: string; text: string };
    onChange: (value: string) => void;
    /** 펼친 목록을 버튼 오른쪽 끝에 맞춤(줄 끝 버튼이 화면 밖으로 나가지 않게) */
    alignRight?: boolean;
};

/** 흰 알약 버튼 + 펼친 목록(크레파스 종이). 바깥 누름 · Esc · 고르면 닫힘, 위아래 화살표로 항목 이동 — 검색 결과 페이지(/search)도 같이 씀 */
export function CrayonSelect({ label, value, options, placeholder, onChange, alignRight }: SelectProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const listId = useId();
    const isPlaceholder = Boolean(placeholder && value === placeholder.value);
    // 버튼 글자 — 안 골랐으면 안내 글자, 골랐으면 그 이름만(목록에 없는 예전 값이면 값 그대로)
    const current = options.find((option) => option.value === value);
    const buttonText = isPlaceholder ? placeholder!.text : current?.label ?? value;

    // 바깥을 누르거나 Esc 를 누르면 닫힘
    useEffect(() => {
        if (!open) return;
        const onPointer = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", onPointer);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointer);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    // 열리면 고른 항목(없으면 첫 항목)에 초점 — 키보드로 바로 고를 수 있게
    useEffect(() => {
        if (!open) return;
        const list = rootRef.current?.querySelector<HTMLElement>(`[role="listbox"]`);
        const target = list?.querySelector<HTMLElement>('[aria-selected="true"]') ?? list?.querySelector<HTMLElement>('[role="option"]');
        target?.focus();
    }, [open]);

    // 목록 안 위아래 화살표로 이동
    const onListKey = (event: ReactKeyboardEvent<HTMLUListElement>) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'));
        const index = items.indexOf(document.activeElement as HTMLElement);
        const next = event.key === "ArrowDown" ? Math.min(items.length - 1, index + 1) : Math.max(0, index - 1);
        items[next]?.focus();
    };

    return (
        <div ref={rootRef} className="ddb-pl-select">
            <button
                type="button"
                className={`ddb-pl-pill ${isPlaceholder ? "is-placeholder" : ""}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-label={`${label}: ${buttonText}`}
                onClick={() => setOpen((v) => !v)}
            >
                <span>{buttonText}</span>
                <i aria-hidden="true" className="fa-solid fa-chevron-down ddb-pl-caret" />
            </button>
            {open ? (
                <ul id={listId} role="listbox" aria-label={label} className={`ddb-pl-menu ${alignRight ? "is-right" : ""}`} onKeyDown={onListKey}>
                    {options.map((option) => (
                        <li key={option.value}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={option.value === value}
                                className="ddb-pl-option"
                                onClick={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                            >
                                <span>{option.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

type Props = {
    heading: string;
    countLabel: string;
    query: string;
    onQuery: (value: string) => void;
    searchPlaceholder: string;
    searchLabel: string;
    /** 카테고리(전체상품) 또는 세부 카테고리(제품군 페이지) 고르기 */
    filter: { label: string; value: string; options: ToolbarOption[]; placeholder: { value: string; text: string }; onChange: (value: string) => void };
    sort: { label: string; value: string; options: ToolbarOption[]; onChange: (value: string) => void };
};

export default function ProductsWebToolbar({ heading, countLabel, query, onQuery, searchPlaceholder, searchLabel, filter, sort }: Props) {
    return (
        <div className="ddb-pl-head" data-products-web-toolbar>
            {/* 왼쪽: 제목 + 상품 개수 */}
            <div className="ddb-pl-titlebox">
                <h1 className="ddb-pl-title">{heading}</h1>
                <span className="ddb-pl-count">{countLabel}</span>
            </div>
            {/* 오른쪽: 검색 · 카테고리 · 정렬 흰 알약(좁은 화면은 검색이 윗줄, 두 버튼이 아랫줄) */}
            <div className="ddb-pl-tools">
                <label className="ddb-pl-search">
                    {/* 헤더 검색과 같은 3D 돋보기 그림 */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/ui/header-search-128.webp" alt="" aria-hidden="true" width={30} height={30} />
                    <input
                        value={query}
                        onChange={(event) => onQuery(event.target.value)}
                        placeholder={searchPlaceholder}
                        aria-label={searchLabel}
                    />
                </label>
                <CrayonSelect label={filter.label} value={filter.value} options={filter.options} placeholder={filter.placeholder} onChange={filter.onChange} />
                <CrayonSelect label={sort.label} value={sort.value} options={sort.options} onChange={sort.onChange} alignRight />
            </div>
        </div>
    );
}
