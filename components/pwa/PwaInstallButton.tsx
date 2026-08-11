"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { usePwaInstall } from "./PwaInstallProvider";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
    children: ReactNode;
    onBeforeInstall?: () => void;
};

export default function PwaInstallButton({ children, onBeforeInstall, ...props }: Props) {
    const { isReady, isStandalone, requestInstall } = usePwaInstall();

    if (!isReady || isStandalone) return null;

    return (
        <button
            type="button"
            {...props}
            onClick={() => {
                onBeforeInstall?.();
                void requestInstall();
            }}
        >
            {children}
        </button>
    );
}
