"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
    PETLENS_PHOTO_VIEWS,
    petLensPhotoViewCount,
    preparePetLensPhotoCapture,
    type PetLensPhotoCaptures,
    type PetLensPhotoViewId,
} from "@/lib/petlens-multiview";

type Props = {
    value: PetLensPhotoCaptures;
    disabled?: boolean;
    onChange: (views: PetLensPhotoCaptures) => void;
    onBusyChange?: (busy: boolean) => void;
    onError?: (message: string) => void;
};

export default function PetLensPhotoViewFields({
    value,
    disabled = false,
    onChange,
    onBusyChange,
    onError,
}: Props) {
    const captureInFlightRef = useRef(false);
    const [busy, setBusy] = useState(false);

    const handleFile = async (viewId: PetLensPhotoViewId, file?: File) => {
        if (!file || disabled || captureInFlightRef.current) return;
        captureInFlightRef.current = true;
        setBusy(true);
        onBusyChange?.(true);
        onError?.("");
        try {
            const capture = await preparePetLensPhotoCapture(file);
            onChange({
                ...value,
                [viewId]: capture,
            });
        } catch {
            onError?.("사진을 불러오지 못했습니다. JPG·PNG·WebP 사진으로 다시 시도해 주세요.");
        } finally {
            captureInFlightRef.current = false;
            setBusy(false);
            onBusyChange?.(false);
        }
    };

    return (
        <section
            className="rounded-xl border border-indigo-100 bg-indigo-50/45 p-3"
            data-member-pet-multiview-upload
        >
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black text-neutral-700">앞·뒤·좌·우 사진</p>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-neutral-500">
                        PC에서는 사진 파일을 선택하고, 모바일에서는 카메라나 앨범을 사용할 수 있어요.
                    </p>
                </div>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-indigo-700 shadow-sm">
                    {petLensPhotoViewCount(value)} / 4
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PETLENS_PHOTO_VIEWS.map((view) => {
                    const photo = value[view.id];
                    return (
                        <label key={view.id} className="block" data-petlens-photo-view={view.id}>
                            <span className="mb-1 block text-center text-[10px] font-black text-neutral-600">
                                {view.label}
                            </span>
                            <span className="relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-indigo-200 bg-white text-neutral-400 transition hover:border-indigo-400">
                                {photo ? (
                                    <>
                                        <Image
                                            src={photo.dataUrl}
                                            alt={`${view.label} 반려견 사진`}
                                            fill
                                            sizes="(max-width: 639px) 40vw, 120px"
                                            className="object-cover"
                                            unoptimized
                                        />
                                        <span className="absolute inset-x-1 bottom-1 rounded-md bg-black/60 px-1.5 py-1 text-center text-[9px] font-black text-white">
                                            사진 바꾸기
                                        </span>
                                    </>
                                ) : (
                                    <span className="grid place-items-center gap-1 px-2 text-center">
                                        <i className="fa-solid fa-camera text-lg" />
                                        <span className="text-[9px] font-bold leading-3">{view.helper}</span>
                                    </span>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    data-petlens-mobile-camera-capture
                                    disabled={disabled || busy}
                                    className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                                    aria-label={`${view.label} 반려견 사진 선택`}
                                    onChange={(event) => {
                                        void handleFile(view.id, event.target.files?.[0]);
                                        event.currentTarget.value = "";
                                    }}
                                />
                            </span>
                        </label>
                    );
                })}
            </div>
        </section>
    );
}
