export default function VideoBrandOverlay() {
    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-end">
            <div className="flex w-[48%] min-w-[138px] max-w-[220px] flex-col items-end">
                <div className="mr-2 mb-1 inline-flex h-8 items-center gap-1.5 rounded-full border border-white/35 bg-white/92 px-2.5 text-neutral-950 shadow-lg backdrop-blur">
                    <img src="/images/logo.png?v=20260614-tight" alt="" className="h-5 w-5 object-contain" />
                    <strong className="text-[12px] font-black leading-none">댕다방</strong>
                </div>
                <div className="h-6 w-full rounded-tl-md bg-neutral-950/96 shadow-[0_-6px_18px_rgba(0,0,0,0.28)]" />
            </div>
        </div>
    );
}
