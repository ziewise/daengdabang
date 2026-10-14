"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from "react";
import { clampChatWindow, defaultChatWindow, type ChatWindowRect } from "@/lib/chat-window-geometry";

const viewport = () => ({ width: document.documentElement.clientWidth || window.innerWidth, height: window.innerHeight });

export function useChatWindow(open: boolean) {
    const [desktop, setDesktop] = useState(false);
    const [rect, setRect] = useState<ChatWindowRect | null>(null);
    const gesture = useRef<{ id: number; mode: "move" | "resize"; x: number; y: number; rect: ChatWindowRect } | null>(null);

    useEffect(() => {
        const update = () => {
            const enabled = window.innerWidth > 680;
            setDesktop(enabled);
            gesture.current = null;
            if (enabled) setRect(current => clampChatWindow(current ?? defaultChatWindow(viewport()), viewport()));
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    useEffect(() => { if (!open) gesture.current = null; }, [open]);

    const start = (event: PointerEvent<HTMLElement>, mode: "move" | "resize") => {
        if (!desktop || !rect || event.button !== 0) return;
        if (mode === "move" && (event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
        event.preventDefault();
        gesture.current = { id: event.pointerId, mode, x: event.clientX, y: event.clientY, rect };
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent<HTMLElement>) => {
        const active = gesture.current;
        if (!active || active.id !== event.pointerId) return;
        const dx = event.clientX - active.x;
        const dy = event.clientY - active.y;
        setRect(clampChatWindow(active.mode === "move"
            ? { ...active.rect, x: active.rect.x + dx, y: active.rect.y + dy }
            : { ...active.rect, width: Math.min(active.rect.width + dx, viewport().width - active.rect.x - 12), height: Math.min(active.rect.height + dy, viewport().height - active.rect.y - 12) }, viewport()));
    };
    const end = (event: PointerEvent<HTMLElement>) => {
        if (gesture.current?.id !== event.pointerId) return;
        gesture.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };
    const resize = (delta: number) => setRect(current => current ? clampChatWindow({ ...current, width: current.width + delta, height: current.height + delta }, viewport()) : current);
    const keyboardResize = (event: KeyboardEvent<HTMLElement>) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const delta = event.shiftKey ? 64 : 24;
        setRect(current => current ? clampChatWindow({ ...current,
            width: current.width + (event.key === "ArrowRight" ? delta : event.key === "ArrowLeft" ? -delta : 0),
            height: current.height + (event.key === "ArrowDown" ? delta : event.key === "ArrowUp" ? -delta : 0),
        }, viewport()) : current);
    };
    const pointerHandlers = { onPointerMove: move, onPointerUp: end, onPointerCancel: end, onLostPointerCapture: () => { gesture.current = null; } };
    const style: CSSProperties | undefined = desktop && rect ? { position: "fixed", left: rect.x, top: rect.y, right: "auto", bottom: "auto", width: rect.width, height: rect.height } : undefined;
    return { desktop, style, resize, reset: () => setRect(defaultChatWindow(viewport())),
        dragHandlers: { ...pointerHandlers, onPointerDown: (event: PointerEvent<HTMLElement>) => start(event, "move") },
        resizeHandlers: { ...pointerHandlers, onPointerDown: (event: PointerEvent<HTMLElement>) => start(event, "resize"), onKeyDown: keyboardResize },
    };
}
