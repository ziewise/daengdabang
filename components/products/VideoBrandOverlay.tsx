export default function VideoBrandOverlay() {
    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-950/45 to-transparent p-3">
            <span className="inline-flex rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-neutral-950 shadow-sm">
                DDB PREVIEW
            </span>
        </div>
    );
}
