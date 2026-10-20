/**
 * lib/upload-image.ts — 올리기 전 사진 맞추기(어떤 휴대폰 사진이든 올라가게, 2026-10-20 사용자 요청)
 * ---------------------------------------------------------------------
 * 문제: 사진 올리기 검사가 휴대폰이 붙여 주는 "파일 종류 이름표"(file.type)만 봤다.
 *  - 진짜 JPEG 인데 이름표가 비어 있거나("") 표준이 아닌 이름(image/jpg · image/pjpeg)으로 오는 휴대폰 · 갤러리 앱이 있어
 *    "JPG, PNG, WebP 사진만 올릴 수 있어요"가 떴다(특히 앱에서 갤러리로 고를 때).
 *  - 아이폰 기본(HEIC) · 삼성 "고효율 사진"(HEIF) 처럼 다른 형식으로 저장된 사진도 있다.
 *  - 요즘 휴대폰 원본 사진은 8~15MB 라 용량 제한(8MB · 10MB)에 걸리기도 한다.
 * 해결(서버 · 검사 규칙은 그대로, 보내기 전에 휴대폰에서만):
 *  1) 사진 파일 맨 앞 몇 글자로 실제 형식을 읽음 — JPEG · PNG · WebP 면 이름표만 바로잡아 그대로(화질 그대로)
 *  2) 그 밖의 사진(HEIC · HEIF · AVIF · GIF · BMP 등)은 휴대폰 브라우저로 열어 JPEG 로 바꿈.
 *     안드로이드처럼 HEIC 를 못 여는 브라우저는 heic2any(MIT)로 바꿈 — 그런 사진이 들어올 때만 불러옴(평소엔 받지 않음)
 *  3) 용량 제한보다 크면 긴 변 4096px 안에서 JPEG 로 줄임(화질 0.9 부터 차례로)
 *  4) 끝내 열 수 없는 파일이면 원래 파일 그대로 돌려줌 → 기존 검사가 기존 안내 문구를 보여 줌
 * 쓰는 곳: 댕자랑 올리기(웹 ShowcaseComposer · 앱 show-parts), 케어톡 참고사진(GenerationReferenceComposer),
 *          펫렌즈 · 주간 사진 비교(preparePetLensPhotoCapture), 반려견 등록 사진(PetRegisterModal)
 */

export const UPLOAD_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type UploadImageType = (typeof UPLOAD_IMAGE_TYPES)[number];

/** 줄일 때 긴 변 최대 픽셀 — 분석 · 게시에 충분하고 휴대폰 메모리에 무리 없는 크기 */
const MAX_SIDE = 4096;

type SniffedKind = UploadImageType | "heic" | "other-image" | "unknown";

/** 파일 맨 앞 32바이트로 실제 형식 알아내기 */
async function sniffImageKind(file: Blob): Promise<SniffedKind> {
    let head: Uint8Array;
    try {
        head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    } catch {
        return "unknown";
    }
    const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
    // JPEG: FF D8 FF
    if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (head[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
    // WebP: "RIFF" .... "WEBP"
    if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
    // HEIC · HEIF · AVIF: ....ftyp + 종류(brand)
    if (ascii(4, 8) === "ftyp") {
        const brand = ascii(8, 12);
        if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1", "heif"].includes(brand)) return "heic";
        return "other-image"; // avif 등 — 브라우저로 열어 봄
    }
    // GIF · BMP · TIFF
    if (ascii(0, 3) === "GIF" || ascii(0, 2) === "BM" || ascii(0, 2) === "II" || ascii(0, 2) === "MM") return "other-image";
    return "unknown";
}

/** 같은 내용 · 바로잡은 이름표(필요하면 확장자도)로 다시 싼 파일 */
function relabel(file: Blob, name: string, type: UploadImageType): File {
    const ext = type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
    const base = name.replace(/\.[^./\\]+$/, "") || "photo";
    const fixedName = new RegExp(`\\.(${ext}|jpeg)$`, "i").test(name) ? name : `${base}.${ext}`;
    return new File([file], fixedName, { type, lastModified: file instanceof File ? file.lastModified : Date.now() });
}

/** 브라우저로 사진 열기(사진 방향 정보 반영). 못 열면 null */
async function decode(blob: Blob): Promise<ImageBitmap | HTMLImageElement | null> {
    if (typeof createImageBitmap === "function") {
        try {
            return await createImageBitmap(blob, { imageOrientation: "from-image" });
        } catch {
            // 아래 <img> 로 한 번 더
        }
    }
    const url = URL.createObjectURL(blob);
    try {
        return await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("decode failed"));
            img.src = url;
        });
    } catch {
        return null;
    } finally {
        // 다 그린 뒤 바로 지우면 일부 브라우저에서 그림이 비므로 다음 틈에
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }
}

/** 연 사진을 긴 변 maxSide 안에서 JPEG 로(용량 제한 안에 들 때까지 화질 · 크기 차례로 낮춤). 못 하면 null */
async function encodeJpeg(image: ImageBitmap | HTMLImageElement, maxBytes: number): Promise<Blob | null> {
    const width = "naturalWidth" in image ? image.naturalWidth : image.width;
    const height = "naturalHeight" in image ? image.naturalHeight : image.height;
    if (!width || !height) return null;
    let scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    const qualities = [0.9, 0.82, 0.74];
    for (let round = 0; round < 6; round += 1) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        // JPEG 는 투명이 없어 흰 바탕(투명 PNG · GIF 대비)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        for (const quality of qualities) {
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
            if (blob && blob.size <= maxBytes) return blob;
        }
        scale *= 0.8; // 그래도 크면 크기를 줄여 다시
    }
    return null;
}

/**
 * 올리기 전에 사진을 맞춤 — 받을 수 있는 형식(JPEG · PNG · WebP) · 용량 제한 안의 파일로.
 * 맞출 수 없으면 원래 파일을 그대로 돌려줌(기존 검사 · 안내 문구가 그대로 처리).
 */
export async function prepareUploadImage(file: File, options: { maxBytes: number }): Promise<File> {
    if (typeof window === "undefined" || !file || file.size <= 0) return file;
    const kind = await sniffImageKind(file);

    // 1) 이미 받을 수 있는 형식 — 이름표만 바로잡고, 용량 안이면 원본 그대로(화질 손실 없음)
    if (kind === "image/jpeg" || kind === "image/png" || kind === "image/webp") {
        const labeled = file.type === kind ? file : relabel(file, file.name, kind);
        if (labeled.size <= options.maxBytes) return labeled;
        const image = await decode(labeled);
        const blob = image ? await encodeJpeg(image, options.maxBytes) : null;
        if (image && "close" in image) image.close();
        return blob ? relabel(blob, file.name, "image/jpeg") : labeled;
    }
    if (kind === "unknown" && !file.type.startsWith("image/")) return file;

    // 2) 다른 사진 형식 — 브라우저로 열어 JPEG 로
    let image = await decode(file);
    // 3) 브라우저가 HEIC 를 못 열면(안드로이드 등) 변환 도구로 JPEG 를 만든 뒤 다시 엶 — 이때만 도구를 불러옴
    if (!image && kind === "heic") {
        try {
            const { default: heic2any } = await import("heic2any");
            const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
            const jpeg = Array.isArray(converted) ? converted[0] : converted;
            if (jpeg && jpeg.size <= options.maxBytes) return relabel(jpeg, file.name, "image/jpeg");
            image = jpeg ? await decode(jpeg) : null;
        } catch {
            image = null;
        }
    }
    if (!image) return file;
    const blob = await encodeJpeg(image, options.maxBytes);
    if ("close" in image) image.close();
    return blob ? relabel(blob, file.name, "image/jpeg") : file;
}
