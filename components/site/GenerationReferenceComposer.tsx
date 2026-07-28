"use client";

import Link from "next/link";
import {
    ChangeEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    deleteGenerationReferenceAsset,
    GENERATION_REFERENCE_KINDS,
    GENERATION_REFERENCE_MAX_COUNT,
    type GenerationReferenceAsset,
    type GenerationReferenceKind,
    type ShopChatReferenceInput,
    uploadGenerationReferenceAsset,
    validateGenerationReferenceFile,
} from "@/lib/generation-reference-assets";

type ReferenceUploadStatus = "uploading" | "ready" | "error";

type ReferenceUploadItem = {
    localId: string;
    file: File;
    previewUrl: string;
    kind: GenerationReferenceKind;
    status: ReferenceUploadStatus;
    progress: number;
    asset?: GenerationReferenceAsset;
    error?: string;
};

type UploadRequest = ReturnType<typeof uploadGenerationReferenceAsset>;

const KIND_LABELS: Record<GenerationReferenceKind, string> = {
    subject: "반려동물",
    product: "상품",
    background: "배경",
    pose: "포즈",
    lighting: "조명",
    style: "스타일",
};

let nextLocalReferenceId = 0;

function localReferenceId() {
    nextLocalReferenceId += 1;
    return `generation-reference-${nextLocalReferenceId}`;
}

function customerUploadError(reason: unknown) {
    if (reason instanceof Error && reason.message) return reason.message;
    return "사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function defaultReferenceKind(usedKinds: Set<GenerationReferenceKind>) {
    if (!usedKinds.has("subject")) return "subject";
    if (!usedKinds.has("product")) return "product";
    return "background";
}

export type GenerationReferenceController = {
    accessToken?: string;
    items: ReferenceUploadItem[];
    readyReferences: ShopChatReferenceInput[];
    notice: string;
    loginRequired: boolean;
    atCapacity: boolean;
    isUploading: boolean;
    hasUploadErrors: boolean;
    preparePicker: () => boolean;
    addFiles: (files: File[]) => void;
    changeKind: (localId: string, kind: GenerationReferenceKind) => void;
    retry: (localId: string) => void;
    remove: (localId: string) => void;
    showNotice: (message: string) => void;
    showLoginNotice: (message: string) => void;
    clear: () => void;
};

type UseGenerationReferencesOptions = {
    accessToken?: string;
    onReferencesChange?: (references: ShopChatReferenceInput[]) => void;
};

export function useGenerationReferenceAttachments({
    accessToken,
    onReferencesChange,
}: UseGenerationReferencesOptions = {}): GenerationReferenceController {
    const [items, setItems] = useState<ReferenceUploadItem[]>([]);
    const [notice, setNotice] = useState("");
    const [loginRequired, setLoginRequired] = useState(false);
    const itemsRef = useRef<ReferenceUploadItem[]>([]);
    const tokenRef = useRef(accessToken);
    const previousTokenRef = useRef(accessToken);
    const changeListenerRef = useRef(onReferencesChange);
    const activeIdsRef = useRef(new Set<string>());
    const requestsRef = useRef(new Map<string, UploadRequest>());
    const versionsRef = useRef(new Map<string, number>());

    useEffect(() => {
        tokenRef.current = accessToken;
    }, [accessToken]);

    useEffect(() => {
        changeListenerRef.current = onReferencesChange;
    }, [onReferencesChange]);

    const readyReferences = useMemo(() => items.flatMap((item) => (
        item.status === "ready" && item.asset
            ? [{ kind: item.kind, assetId: item.asset.assetId }]
            : []
    )), [items]);

    useEffect(() => {
        itemsRef.current = items;
        changeListenerRef.current?.(readyReferences);
    }, [items, readyReferences]);

    const retireAsset = useCallback((assetId: string | undefined, token: string | undefined) => {
        if (!assetId || !token) return;
        void deleteGenerationReferenceAsset(assetId, token).catch(() => undefined);
    }, []);

    const startUpload = useCallback((localId: string, file: File, kind: GenerationReferenceKind) => {
        const token = tokenRef.current;
        if (!token) {
            setItems((current) => current.map((item) => item.localId === localId
                ? { ...item, status: "error", progress: 0, error: "로그인 후 사진을 다시 올려 주세요." }
                : item));
            return;
        }
        requestsRef.current.get(localId)?.abort();
        const version = (versionsRef.current.get(localId) ?? 0) + 1;
        versionsRef.current.set(localId, version);
        setItems((current) => current.map((item) => item.localId === localId
            ? { ...item, kind, status: "uploading", progress: 1, asset: undefined, error: undefined }
            : item));

        const request = uploadGenerationReferenceAsset(file, kind, token, (progress) => {
            if (versionsRef.current.get(localId) !== version || !activeIdsRef.current.has(localId)) return;
            setItems((current) => current.map((item) => item.localId === localId
                ? { ...item, progress }
                : item));
        });
        requestsRef.current.set(localId, request);
        void request.promise.then((asset) => {
            if (versionsRef.current.get(localId) !== version || !activeIdsRef.current.has(localId)) {
                retireAsset(asset.assetId, token);
                return;
            }
            requestsRef.current.delete(localId);
            setItems((current) => current.map((item) => item.localId === localId
                ? { ...item, kind, status: "ready", progress: 100, asset, error: undefined }
                : item));
        }).catch((reason: unknown) => {
            if (versionsRef.current.get(localId) !== version || !activeIdsRef.current.has(localId)) return;
            requestsRef.current.delete(localId);
            setItems((current) => current.map((item) => item.localId === localId
                ? { ...item, status: "error", progress: 0, asset: undefined, error: customerUploadError(reason) }
                : item));
        });
    }, [retireAsset]);

    const clearWithToken = useCallback((token: string | undefined) => {
        const staleItems = itemsRef.current;
        itemsRef.current = [];
        activeIdsRef.current.clear();
        for (const request of requestsRef.current.values()) request.abort();
        requestsRef.current.clear();
        versionsRef.current.clear();
        for (const item of staleItems) {
            URL.revokeObjectURL(item.previewUrl);
            retireAsset(item.asset?.assetId, token);
        }
        setItems([]);
        setNotice("");
        setLoginRequired(false);
        changeListenerRef.current?.([]);
    }, [retireAsset]);

    useEffect(() => {
        const previousToken = previousTokenRef.current;
        previousTokenRef.current = accessToken;
        if (previousToken === accessToken) return;
        clearWithToken(previousToken);
    }, [accessToken, clearWithToken]);

    useEffect(() => () => {
        const staleItems = itemsRef.current;
        activeIdsRef.current.clear();
        for (const request of requestsRef.current.values()) request.abort();
        for (const item of staleItems) {
            URL.revokeObjectURL(item.previewUrl);
            retireAsset(item.asset?.assetId, tokenRef.current);
        }
    }, [retireAsset]);

    const preparePicker = useCallback(() => {
        if (!tokenRef.current) {
            setLoginRequired(true);
            setNotice("참고사진 첨부는 로그인이 필요해요.");
            return false;
        }
        if (itemsRef.current.length >= GENERATION_REFERENCE_MAX_COUNT) {
            setLoginRequired(false);
            setNotice("참고사진은 최대 2장까지 첨부할 수 있어요.");
            return false;
        }
        setLoginRequired(false);
        setNotice("");
        return true;
    }, []);

    const addFiles = useCallback((selectedFiles: File[]) => {
        const available = Math.max(0, GENERATION_REFERENCE_MAX_COUNT - itemsRef.current.length);
        if (available === 0) {
            setNotice("참고사진은 최대 2장까지 첨부할 수 있어요.");
            return;
        }
        const accepted: Array<{ item: ReferenceUploadItem; kind: GenerationReferenceKind }> = [];
        const usedKinds = new Set(itemsRef.current.map((item) => item.kind));
        let validationMessage = "";
        for (const file of selectedFiles) {
            if (accepted.length >= available) break;
            const validationError = validateGenerationReferenceFile(file);
            if (validationError) {
                validationMessage = validationError;
                continue;
            }
            const kind = defaultReferenceKind(usedKinds);
            usedKinds.add(kind);
            const localId = localReferenceId();
            accepted.push({
                kind,
                item: {
                    localId,
                    file,
                    previewUrl: URL.createObjectURL(file),
                    kind,
                    status: "uploading",
                    progress: 1,
                },
            });
            activeIdsRef.current.add(localId);
        }
        if (selectedFiles.length > available) validationMessage = "참고사진은 최대 2장까지 첨부할 수 있어요.";
        setNotice(validationMessage);
        setLoginRequired(false);
        if (!accepted.length) return;
        const nextItems = [...itemsRef.current, ...accepted.map(({ item }) => item)];
        itemsRef.current = nextItems;
        setItems(nextItems);
        for (const { item, kind } of accepted) startUpload(item.localId, item.file, kind);
    }, [startUpload]);

    const remove = useCallback((localId: string) => {
        const item = itemsRef.current.find((candidate) => candidate.localId === localId);
        if (!item) return;
        activeIdsRef.current.delete(localId);
        versionsRef.current.set(localId, (versionsRef.current.get(localId) ?? 0) + 1);
        requestsRef.current.get(localId)?.abort();
        requestsRef.current.delete(localId);
        URL.revokeObjectURL(item.previewUrl);
        retireAsset(item.asset?.assetId, tokenRef.current);
        const nextItems = itemsRef.current.filter((candidate) => candidate.localId !== localId);
        itemsRef.current = nextItems;
        setItems(nextItems);
        setNotice("");
    }, [retireAsset]);

    const retry = useCallback((localId: string) => {
        const item = itemsRef.current.find((candidate) => candidate.localId === localId);
        if (!item) return;
        setNotice("");
        startUpload(item.localId, item.file, item.kind);
    }, [startUpload]);

    const changeKind = useCallback((localId: string, kind: GenerationReferenceKind) => {
        const item = itemsRef.current.find((candidate) => candidate.localId === localId);
        if (!item || item.kind === kind) return;
        requestsRef.current.get(localId)?.abort();
        retireAsset(item.asset?.assetId, tokenRef.current);
        const nextItems = itemsRef.current.map((candidate) => candidate.localId === localId
            ? { ...candidate, kind, status: "uploading" as const, progress: 1, asset: undefined, error: undefined }
            : candidate);
        itemsRef.current = nextItems;
        setItems(nextItems);
        startUpload(localId, item.file, kind);
    }, [retireAsset, startUpload]);

    const showNotice = useCallback((message: string) => {
        setLoginRequired(false);
        setNotice(message);
    }, []);

    const showLoginNotice = useCallback((message: string) => {
        setLoginRequired(true);
        setNotice(message);
    }, []);

    const clear = useCallback(() => clearWithToken(tokenRef.current), [clearWithToken]);
    return {
        accessToken,
        items,
        readyReferences,
        notice,
        loginRequired,
        atCapacity: items.length >= GENERATION_REFERENCE_MAX_COUNT,
        isUploading: items.some((item) => item.status === "uploading"),
        hasUploadErrors: items.some((item) => item.status === "error"),
        preparePicker,
        addFiles,
        changeKind,
        retry,
        remove,
        showNotice,
        showLoginNotice,
        clear,
    };
}

export function GenerationReferencePhotoButton({
    controller,
    disabled = false,
    compact = false,
}: {
    controller: GenerationReferenceController;
    disabled?: boolean;
    compact?: boolean;
}) {
    const unavailable = disabled || controller.isUploading;
    const inputRef = useRef<HTMLInputElement>(null);
    const openPicker = () => {
        if (controller.preparePicker()) inputRef.current?.click();
    };
    const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        controller.addFiles(files);
    };
    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                tabIndex={-1}
                onChange={onFileChange}
                data-generation-reference-input
            />
            <button
                type="button"
                onClick={openPicker}
                disabled={unavailable}
                className={`inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-indigo-300 bg-white text-indigo-700 transition hover:border-indigo-500 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-45 ${compact ? "h-10 w-10" : "h-12 w-12"}`}
                aria-label={controller.atCapacity ? "참고사진은 최대 2장까지 첨부됨" : "생성용 참고사진 첨부"}
                title={controller.atCapacity ? "참고사진은 최대 2장까지 첨부할 수 있어요" : "참고사진 첨부"}
                data-generation-reference-button
            >
                <i className="fa-solid fa-image text-sm" aria-hidden="true" />
            </button>
        </>
    );
}

export function GenerationReferenceTray({
    controller,
    compact = false,
}: {
    controller: GenerationReferenceController;
    compact?: boolean;
}) {
    return (
        <div className={`mb-2 space-y-2 ${compact ? "text-xs" : "text-[13px]"}`} data-generation-reference-tray>
            {controller.items.length ? (
                <div className="flex flex-wrap gap-2" aria-label="첨부한 생성용 참고사진">
                    {controller.items.map((item) => (
                        <div
                            key={item.localId}
                            className="relative flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-indigo-200 bg-white p-1.5 pr-2 shadow-sm"
                            data-reference-status={item.status}
                        >
                            {/* blob URL은 이 화면에서만 사용하고 저장하거나 전송하지 않습니다. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={item.previewUrl}
                                alt="첨부한 참고사진 미리보기"
                                className={`${compact ? "h-10 w-10" : "h-12 w-12"} shrink-0 rounded-lg object-cover`}
                            />
                            <div className="min-w-0">
                                <label className="block">
                                    <span className="sr-only">참고사진 용도</span>
                                    <select
                                        value={item.kind}
                                        onChange={(event) => controller.changeKind(item.localId, event.target.value as GenerationReferenceKind)}
                                        disabled={item.status === "uploading"}
                                        className="min-h-10 max-w-[112px] rounded-md border border-neutral-200 bg-white px-1.5 py-1 font-black text-neutral-800 outline-none focus:border-indigo-500"
                                        aria-label="참고사진 용도"
                                    >
                                        {GENERATION_REFERENCE_KINDS.map((kind) => (
                                            <option key={kind} value={kind}>{KIND_LABELS[kind]}</option>
                                        ))}
                                    </select>
                                </label>
                                {item.status === "uploading" ? (
                                    <div className="mt-1" aria-label={`업로드 ${item.progress}%`}>
                                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-200">
                                            <div className="h-full bg-indigo-500 transition-[width]" style={{ width: `${item.progress}%` }} />
                                        </div>
                                        <span className="mt-0.5 block font-bold text-neutral-500">올리는 중 {item.progress}%</span>
                                    </div>
                                ) : item.status === "error" ? (
                                    <div className="mt-1 max-w-[190px] text-rose-700">
                                        <p className="font-bold leading-4" role="alert">{item.error}</p>
                                        <button
                                            type="button"
                                            onClick={() => controller.retry(item.localId)}
                                            className="mt-0.5 inline-flex min-h-10 items-center font-black underline underline-offset-2"
                                        >
                                            다시 시도
                                        </button>
                                    </div>
                                ) : (
                                    <span className="mt-1 block font-black text-emerald-700">첨부 완료</span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => controller.remove(item.localId)}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-600"
                                aria-label={`${KIND_LABELS[item.kind]} 참고사진 삭제`}
                                title="참고사진 삭제"
                            >
                                <i className="fa-solid fa-xmark" aria-hidden="true" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}
            {controller.notice ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-2 font-bold leading-5 text-amber-900" role="status">
                    <span>{controller.notice}</span>
                    {controller.loginRequired ? (
                        <Link href="/auth/login?redirect=%2Fchat" className="font-black text-indigo-700 underline underline-offset-2">
                            로그인하기
                        </Link>
                    ) : null}
                </div>
            ) : null}
            <p className="px-0.5 text-[13px] font-bold leading-5 text-neutral-600" data-generation-reference-privacy-notice>
                첨부한 사진은 생성 요청 처리에만 사용되며, 24시간이 지나면 만료되고 정기적으로 삭제됩니다.
            </p>
        </div>
    );
}
