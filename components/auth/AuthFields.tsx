/**
 * AuthFields — 인증 페이지 공용 입력 컴포넌트
 */
import React from "react";

export function AuthField({
    label, children, hint, error,
}: {
    label: string;
    children: React.ReactNode;
    hint?: string;
    error?: string;
}) {
    return (
        <label className="block">
            <span className="block text-xs font-extrabold mb-1.5 text-foreground">{label}</span>
            {children}
            {hint && !error && <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>}
            {error && <p className="mt-1 text-[11px] text-danger font-bold">{error}</p>}
        </label>
    );
}

export const inputClass =
    "w-full px-3.5 py-3 rounded-xl border-2 border-neutral-200 focus:border-aurora-indigo focus:outline-none focus:shadow-card text-sm transition disabled:bg-neutral-50";

export function AuthMockBox({ children }: { children: React.ReactNode }) {
    return (
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs leading-relaxed text-amber-900">
            {children}
        </div>
    );
}

export function PrimaryButton({
    children, disabled, type = "submit", onClick,
}: {
    children: React.ReactNode;
    disabled?: boolean;
    type?: "submit" | "button";
    onClick?: () => void;
}) {
    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
            {children}
        </button>
    );
}

export function GhostButton({
    children, onClick, type = "button",
}: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: "submit" | "button";
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            className="w-full py-3 rounded-xl bg-white border-2 border-neutral-200 hover:border-aurora-indigo text-foreground text-sm font-extrabold transition"
        >
            {children}
        </button>
    );
}
