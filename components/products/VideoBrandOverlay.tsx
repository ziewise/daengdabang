import { videoBrandingMode } from "@/lib/catalog/video-branding";

export default function VideoBrandOverlay({ src, forceOverlay = false }: { src: string | undefined; forceOverlay?: boolean }) {
    if (!forceOverlay && videoBrandingMode(src) === "baked") return null;
    return (
        <div className="ddb-watermark-cover" aria-hidden="true">
            <div className="ddb-watermark-logo">
                <img src="/images/brand/logo-black-poodle-v2-240.webp" alt="" className="ddb-watermark-symbol" />
                <img src="/images/brand/wordmark-360.webp" alt="" className="ddb-watermark-wordmark" />
            </div>
            <div className="ddb-watermark-strip" />
        </div>
    );
}
