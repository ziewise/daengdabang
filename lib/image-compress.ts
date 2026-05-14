/**
 * lib/image-compress.ts — dataURL 이미지 압축 유틸
 * ---------------------------------------------------------------------
 * localStorage 용량 절약 — 펫 아바타/사진은 보통 1~3MB dataURL
 * → 512px max + JPEG 0.8 quality 로 압축하면 50~150KB 수준으로 감소.
 *
 * 사용처: PetRegisterModal(아바타 업로드), PetlensUpload(촬영/업로드)
 */

/** dataURL 의 대략 바이트 수 추정 (base64 헤더 제외) */
export function dataUrlBytes(dataUrl: string): number {
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return dataUrl.length;
    const b64 = dataUrl.slice(comma + 1);
    // base64 → 바이트: length * 3/4 (padding 빼면 약간 줄어듦)
    return Math.floor((b64.length * 3) / 4);
}

interface CompressOptions {
    /** 가로/세로 중 긴 쪽 최대 픽셀 (default 640) */
    maxSize?: number;
    /** JPEG quality 0~1 (default 0.8) */
    quality?: number;
    /** 결과 MIME (default "image/jpeg") */
    mime?: "image/jpeg" | "image/webp";
}

/**
 * dataURL 을 받아 리사이즈+압축된 dataURL 반환.
 * - 이미 작으면(maxSize 이하) JPEG 재인코딩만 → 용량 감소
 * - 실패 시 원본 그대로 반환 (안전)
 */
export async function compressDataUrl(
    dataUrl: string,
    opts: CompressOptions = {}
): Promise<string> {
    const { maxSize = 640, quality = 0.8, mime = "image/jpeg" } = opts;

    if (typeof window === "undefined") return dataUrl;

    try {
        // 1) dataURL → HTMLImageElement
        const img = await loadImage(dataUrl);

        // 2) 리사이즈 비율 계산 (긴 쪽 기준)
        const longSide = Math.max(img.naturalWidth, img.naturalHeight);
        const scale = longSide > maxSize ? maxSize / longSide : 1;
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);

        // 3) canvas 에 그리고 JPEG 로 재인코딩
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return dataUrl;
        // JPEG 는 알파 없으므로 흰 배경 깔기 (투명 PNG 변환 대비)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        const out = canvas.toDataURL(mime, quality);
        // 압축 후 더 커진 경우(이미 잘 압축된 입력) 원본 유지
        return out.length < dataUrl.length ? out : dataUrl;
    } catch {
        return dataUrl;
    }
}

/** dataURL → HTMLImageElement (Promise) */
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
    });
}
