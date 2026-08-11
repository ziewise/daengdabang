export default function VideoBrandOverlay() {
    return (
        <div className="ddb-watermark-cover" aria-hidden="true">
            <div className="ddb-watermark-logo">
                <img src="/images/logo-black-poodle-v2.png" alt="" className="ddb-watermark-symbol" />
                <img src="/images/wordmark.png" alt="" className="ddb-watermark-wordmark" />
            </div>
            <div className="ddb-watermark-strip" />
        </div>
    );
}
