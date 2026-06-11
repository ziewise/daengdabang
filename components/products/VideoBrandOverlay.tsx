export default function VideoBrandOverlay() {
    return (
        <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1.5 rounded-full bg-black/72 px-2.5 py-1.5 text-white shadow-card backdrop-blur-md ring-1 ring-white/15 md:bottom-3 md:right-3 md:px-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[9px] font-black tracking-tight text-foreground">
                Z
            </span>
            <span className="leading-none">
                <span className="block text-[9px] font-black uppercase tracking-wider text-white/70">
                    Ziewise
                </span>
                <span className="block text-[11px] font-black tracking-normal text-white md:text-xs">
                    댕다방
                </span>
            </span>
        </div>
    );
}
