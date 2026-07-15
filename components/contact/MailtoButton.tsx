"use client";

import type { ReactNode } from "react";

export default function MailtoButton({
    email,
    subject,
    className,
    children,
}: {
    email: string;
    subject: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            className={className}
            onClick={() => {
                window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
            }}
        >
            {children}
        </button>
    );
}
