import { resizePetPhoto } from "@/lib/pet-photo";

export const PETLENS_PHOTO_VIEWS = [
    { id: "front", label: "정면", helper: "얼굴·가슴" },
    { id: "left", label: "왼쪽", helper: "옆선·다리" },
    { id: "right", label: "오른쪽", helper: "반대 옆선" },
    { id: "back", label: "뒷면", helper: "등선·꼬리" },
] as const;

export type PetLensPhotoViewId = typeof PETLENS_PHOTO_VIEWS[number]["id"];

export type PetLensPhotoCapture = {
    dataUrl: string;
    imageName: string;
    file?: File;
    restored?: boolean;
};

export type PetLensPhotoCaptures = Partial<Record<PetLensPhotoViewId, PetLensPhotoCapture>>;

export const PETLENS_PHOTO_VIEW_LABELS = PETLENS_PHOTO_VIEWS.reduce((acc, view) => {
    acc[view.id] = view.label;
    return acc;
}, {} as Record<PetLensPhotoViewId, string>);

function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") resolve(reader.result);
            else reject(new Error("PetLens photo could not be read."));
        };
        reader.onerror = () => reject(new Error("PetLens photo could not be read."));
        reader.readAsDataURL(file);
    });
}

export async function preparePetLensPhotoCapture(file: File): Promise<PetLensPhotoCapture> {
    let dataUrl: string;
    try {
        dataUrl = await resizePetPhoto(file);
    } catch {
        dataUrl = await fileToDataUrl(file);
    }
    return {
        dataUrl,
        imageName: file.name,
        file,
    };
}

export function petLensPhotoViewEntries(views: PetLensPhotoCaptures): Array<[PetLensPhotoViewId, PetLensPhotoCapture]> {
    return PETLENS_PHOTO_VIEWS
        .map((view): [PetLensPhotoViewId, PetLensPhotoCapture | undefined] => [view.id, views[view.id]])
        .filter((entry): entry is [PetLensPhotoViewId, PetLensPhotoCapture] => Boolean(entry[1]));
}

export function petLensPhotoViewCount(views: PetLensPhotoCaptures) {
    return petLensPhotoViewEntries(views).length;
}

export function primaryPetLensPhotoEntry(views: PetLensPhotoCaptures): [PetLensPhotoViewId, PetLensPhotoCapture] | undefined {
    if (views.front) return ["front", views.front];
    return petLensPhotoViewEntries(views)[0];
}

export function petLensPhotoViewMetadata(views: PetLensPhotoCaptures) {
    return petLensPhotoViewEntries(views).map(([viewId, photo]) => ({
        viewId,
        label: PETLENS_PHOTO_VIEW_LABELS[viewId],
        imageName: photo.imageName,
        usedForPetLensAnalysis: true,
    }));
}

function loadPetLensImage(dataUrl: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("PetLens image could not be loaded."));
        image.src = dataUrl;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("PetLens contact sheet could not be generated."));
        }, type, quality);
    });
}

export async function buildPetLensAnalysisImage(views: PetLensPhotoCaptures) {
    const entries = petLensPhotoViewEntries(views);
    if (entries.length === 0) return undefined;
    if (entries.length === 1 && entries[0][1].file) {
        const [viewId, photo] = entries[0];
        return {
            file: photo.file,
            imageName: `${PETLENS_PHOTO_VIEW_LABELS[viewId]}_${photo.imageName}`,
        };
    }

    const cellSize = 480;
    const labelHeight = 48;
    const padding = 18;
    const canvas = document.createElement("canvas");
    canvas.width = cellSize * 2;
    canvas.height = cellSize * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("PetLens contact sheet is not supported.");
    ctx.fillStyle = "#fffaf3";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#e8ddd2";
    ctx.lineWidth = 3;
    ctx.font = "700 28px sans-serif";
    ctx.textBaseline = "middle";

    await Promise.all(entries.map(async ([viewId, photo], index) => {
        const image = await loadPetLensImage(photo.dataUrl);
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = column * cellSize;
        const y = row * cellSize;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + 6, y + 6, cellSize - 12, cellSize - 12);
        ctx.strokeRect(x + 6, y + 6, cellSize - 12, cellSize - 12);
        ctx.fillStyle = "#2f2926";
        ctx.fillText(PETLENS_PHOTO_VIEW_LABELS[viewId], x + padding, y + labelHeight / 2);

        const drawX = x + padding;
        const drawY = y + labelHeight;
        const drawWidth = cellSize - padding * 2;
        const drawHeight = cellSize - labelHeight - padding;
        const scale = Math.min(drawWidth / image.width, drawHeight / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        const offsetX = drawX + (drawWidth - width) / 2;
        const offsetY = drawY + (drawHeight - height) / 2;
        ctx.drawImage(image, offsetX, offsetY, width, height);
    }));

    const blob = await canvasToBlob(canvas, "image/jpeg", 0.88);
    return {
        file: new File([blob], "daengdabang-petlens-four-view.jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
        }),
        imageName: "정면-좌-우-뒷면 PetLens 분석 시트.jpg",
    };
}
