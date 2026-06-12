export default function VideoBrandOverlay() {
    return (
        <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-20 flex items-center gap-2 rounded-full bg-white/92 px-2.5 py-1.5 shadow-card backdrop-blur-md ring-1 ring-black/10 md:bottom-3 md:right-3 md:px-3">
            <img
                src="/images/logo.png"
                alt=""
                className="h-7 w-7 rounded-full object-cover"
            />
            <img
                src="/images/wordmark.png"
                alt="댕다방"
                className="h-6 w-auto max-w-[104px] object-contain"
            />
        </div>
    );
}
