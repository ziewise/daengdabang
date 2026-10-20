import { prepareUploadImage } from "@/lib/upload-image";

export async function resizePetPhoto(picked: File): Promise<string> {
    // 어떤 휴대폰 사진이든(이름표가 비었거나 다른 JPEG · HEIC 등 · 너무 큰 사진) 열 수 있게 맞춤 — lib/upload-image(2026-10-20)
    const file = await prepareUploadImage(picked, { maxBytes: 20 * 1024 * 1024 });
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new window.Image();
        image.onload = () => {
            try {
                const maxSide = 1200;
                const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
                const width = Math.max(1, Math.round(image.width * ratio));
                const height = Math.max(1, Math.round(image.height * ratio));
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) throw new Error("canvas context unavailable");
                ctx.drawImage(image, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.82));
            } catch (error) {
                reject(error);
            } finally {
                URL.revokeObjectURL(url);
            }
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("image load failed"));
        };
        image.src = url;
    });
}
