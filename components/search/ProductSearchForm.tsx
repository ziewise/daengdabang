"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Keep IME composition local; only a submitted query changes the product grid. */
export default function ProductSearchForm({ value, onSearch, label, placeholder, className = "", children }: {
    value: string; onSearch: (value: string) => void; label: string; placeholder: string;
    className?: string; children?: ReactNode;
}) {
    const [draft, setDraft] = useState(value);
    const composing = useRef(false);
    const input = useRef<HTMLInputElement>(null);
    useEffect(() => {
        // External navigation (including Back) is the only source of a new value.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(value);
    }, [value]);
    return (
        <form role="search" data-products-search className={className} onSubmit={(event) => {
            event.preventDefault();
            if (composing.current) return;
            onSearch((input.current?.value ?? draft).trim());
            input.current?.blur();
        }}>
            {children}
            <input ref={input} type="search" className="input" value={draft} aria-label={label}
                placeholder={placeholder} enterKeyHint="search" autoComplete="off"
                onChange={(event) => setDraft(event.target.value)}
                onCompositionStart={() => { composing.current = true; }}
                onCompositionEnd={() => { composing.current = false; }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && (composing.current || event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
                }} />
            <button type="submit" data-search-submit>{label}</button>
        </form>
    );
}
