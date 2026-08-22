"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ddbApiBase } from "@/lib/customer-api";
import type {
    ShopChatCta,
    ShopChatGeneration,
    ShopChatMedical,
    ShopChatResearch,
    ShopChatSource,
} from "@/lib/daengdabang-llm";
import type { ShopChatReferenceInput } from "@/lib/generation-reference-assets";
import {
    CareTalkGenerationError,
    loadCareTalkGenerationAsset,
    loadCareTalkGenerationJob,
    startCareTalkGeneration,
    type CareTalkGenerationJob,
} from "@/lib/caretalk-generation";

type ChatResponseExtrasProps = {
    medical?: ShopChatMedical;
    generation?: ShopChatGeneration;
    generationRequest?: { message: string; references: ShopChatReferenceInput[] };
    accessToken?: string;
    sources?: ShopChatSource[];
    research?: ShopChatResearch;
    ctas?: ShopChatCta[];
    onAsk: (prompt: string) => boolean | Promise<boolean>;
    compact?: boolean;
    followUpsEnabled?: boolean;
    onInternalNavigate?: () => void;
    questionContext?: string;
};

function CareTalkGenerationExecution({
    generation,
    request,
    accessToken,
}: {
    generation: ShopChatGeneration;
    request?: { message: string; references: ShopChatReferenceInput[] };
    accessToken?: string;
}) {
    const [job, setJob] = useState<CareTalkGenerationJob | null>(null);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [asset, setAsset] = useState<{ objectUrl: string; mimeType: string } | null>(null);
    const alive = useRef(true);

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
            if (asset?.objectUrl) URL.revokeObjectURL(asset.objectUrl);
        };
    }, [asset?.objectUrl]);

    const run = async () => {
        if (!request || !accessToken || pending) return;
        setPending(true);
        setError("");
        setAsset(null);
        try {
            let current = await startCareTalkGeneration(request.message, request.references, accessToken);
            if (!alive.current) return;
            setJob(current);
            for (let attempt = 0; attempt < 40 && ["submitting", "queued", "running"].includes(current.status); attempt += 1) {
                await new Promise((resolve) => window.setTimeout(resolve, 3000));
                if (!alive.current) return;
                current = await loadCareTalkGenerationJob(current.jobId, accessToken);
                setJob(current);
            }
            if (current.status === "ready") {
                const loaded = await loadCareTalkGenerationAsset(current.jobId, accessToken);
                if (alive.current) setAsset(loaded);
            } else if (current.status === "failed") {
                setError("생성 노드에서 작업을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.");
            } else {
                setError("작업이 계속 진행 중이에요. 잠시 후 다시 시도하면 상태를 새로 확인합니다.");
            }
        } catch (caught) {
            setError(caught instanceof CareTalkGenerationError
                ? caught.message
                : "생성 작업을 시작하지 못했습니다.");
        } finally {
            if (alive.current) setPending(false);
        }
    };

    if (!generation.canSubmitToGenerator) return null;
    return (
        <div className="mt-3 border-t border-violet-200 pt-3">
            {asset ? (
                asset.mimeType.startsWith("video/") ? (
                    <video src={asset.objectUrl} controls playsInline className="w-full rounded-lg" aria-label="케어톡 생성 영상" />
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- authenticated blob URL cannot use the static image optimizer.
                    <img src={asset.objectUrl} alt="케어톡 생성 결과" className="w-full rounded-lg" />
                )
            ) : (
                <button
                    type="button"
                    disabled={pending || !request || !accessToken}
                    onClick={() => void run()}
                    className="min-h-10 rounded-lg bg-violet-700 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                    <i className={`fa-solid ${pending ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"} mr-2`} aria-hidden="true" />
                    {!accessToken ? "로그인 후 실제 제작" : pending ? `제작 중${job?.progressPercent != null ? ` · ${job.progressPercent}%` : "…"}` : "실제 제작 시작"}
                </button>
            )}
            {error && <p className="mt-2 text-[11px] font-bold leading-4 text-amber-800" role="alert">{error}</p>}
        </div>
    );
}

type ChoiceViewGroup = {
    title: string;
    choices: Array<{ label: string; prompt: string; description?: string }>;
    answerInput?: boolean;
};

type FollowUpSlot = NonNullable<ShopChatMedical["followUpSlots"]>[number];

export const CHAT_FOLLOW_UP_BUNDLE_PREFIX = "추가로 알려드릴 내용입니다.";

export function isFollowUpBundlePrompt(value: string) {
    return value.trimStart().startsWith(CHAT_FOLLOW_UP_BUNDLE_PREFIX);
}

type LocalCareCategory = "veterinary" | "grooming" | "hotel" | "daycare";

type LocalCarePlace = {
    id: string;
    name: string;
    address: string;
    phone?: string;
    openingHours?: string;
    distanceMeters: number;
    lat: number;
    lon: number;
    mapUrl: string;
    source?: "naver" | "openstreetmap";
    mapProvider: "naver";
};

type LocalCareSearchState =
    | { status: "idle" }
    | { status: "loading"; category: LocalCareCategory; label: string; message: string; fallbackUrl: string }
    | { status: "done"; category: LocalCareCategory; label: string; places: LocalCarePlace[]; fallbackUrl: string }
    | { status: "error"; category: LocalCareCategory; label: string; message: string; fallbackUrl: string };

function buildNaverMapUrl(...parts: Array<string | undefined>) {
    const searchText = parts
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .join(" ")
        .slice(0, 240) || "동물병원";
    return `https://map.naver.com/p/search/${encodeURIComponent(searchText)}`;
}

function openExternal(url?: string) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
}

function distanceMeters(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
    const radius = 6371000;
    const toRad = (value: number) => value * Math.PI / 180;
    const dLat = toRad(to.latitude - from.latitude);
    const dLon = toRad(to.longitude - from.longitude);
    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDistance(meters: number) {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)}km`;
}

const EVIDENCE_SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const NON_EVIDENCE_RESEARCH_MODES = new Set([
    "none",
    "scope-guard",
    "map-search",
    "location-permission-required",
]);

const LOCAL_PET_CARE_SERVICE_RE = /(동물\s*(?:병원|변원)|24시\s*(?:동물\s*)?병원|응급\s*(?:동물\s*)?병원|반려견\s*미용|강아지\s*미용|애견\s*미용|펫\s*미용|미용실|반려견\s*호텔|강아지\s*호텔|애견\s*호텔|펫\s*호텔|데이\s*케어|데이케이|반려견\s*유치원|강아지\s*유치원|애견\s*유치원)/i;
const LOCAL_PET_CARE_LOCATION_RE = /(현재\s*위치|가까운|근처|주변|인근|동네|지역|찾아?\s*줘|찾아?\s*주세요|어디|위치|지도|후보)/i;
const LOCAL_CARE_FALLBACK_ANSWER_RE = /(확인\s*가능한\s*웹\s*출처|근거\s*부족|제한\s*시간\s*안에[\s\S]{0,80}확인하지\s*못|위치와\s*운영\s*여부를\s*확인하지\s*못|지역과[\s\S]{0,60}다시\s*(?:적어|알려))/i;
const LOCAL_CARE_SAFETY_ANSWER_RE = /(?:지금\s*바로|즉시)[\s\S]{0,50}(?:병원|연락|이동)/i;
const LOCAL_CARE_INTERNAL_FALLBACK_PATTERNS = [
    /(?:확인\s*가능한\s*웹\s*출처(?:가)?\s*(?:없습니다|없어요|없음)?|근거\s*부족)[.!?]?/gi,
    /제한\s*시간\s*안에[^.!?\n]{0,140}(?:확인하지\s*못(?:했어요|했습니다)|확인할\s*수\s*없(?:어요|습니다))[.!?]?/gi,
    /(?:진료기관의\s*)?위치와\s*운영\s*여부를[^.!?\n]{0,100}(?:확인하지\s*못|확인할\s*수\s*없)[^.!?\n]*[.!?]?/gi,
    /지역과[^.!?\n]{0,100}다시\s*(?:적어|알려)[^.!?\n]*(?:주세요|주십시오)?[.!?]?/gi,
] as const;

function withoutInternalLocalCareFallback(answer: string) {
    return LOCAL_CARE_INTERNAL_FALLBACK_PATTERNS
        .reduce((visible, pattern) => visible.replace(pattern, ""), answer)
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/ {2,}/g, " ")
        .trim();
}

export function isLocalPetCarePrompt(value?: string) {
    const text = String(value || "").trim();
    return Boolean(text && LOCAL_PET_CARE_SERVICE_RE.test(text) && LOCAL_PET_CARE_LOCATION_RE.test(text));
}

export function customerFriendlyLocalCareAnswer(question: string | undefined, answer: string, triage?: string) {
    if (
        triage === "emergency"
        || LOCAL_CARE_SAFETY_ANSWER_RE.test(answer)
        || !isLocalPetCarePrompt(question)
        || !LOCAL_CARE_FALLBACK_ANSWER_RE.test(answer)
    ) return answer;
    const visibleAnswer = withoutInternalLocalCareFallback(answer);
    const locationGuide = "현재 위치에서 찾기 쉬운 병원·미용·호텔·데이케어 바로가기를 아래에 준비했어요. 위치 권한을 허용하면 가까운 후보를 이 화면에서 확인할 수 있어요.";
    return visibleAnswer ? `${visibleAnswer}\n\n${locationGuide}` : locationGuide;
}

function formatEvidenceDate(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    const seoul = new Date(date.getTime() + EVIDENCE_SEOUL_OFFSET_MS);
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${seoul.getUTCFullYear()}. ${pad(seoul.getUTCMonth() + 1)}. ${pad(seoul.getUTCDate())}. ${pad(seoul.getUTCHours())}:${pad(seoul.getUTCMinutes())}`;
}

function researchFreshnessLabel(status?: string, hasSources = true) {
    if (!hasSources || status === "insufficient" || status === "unavailable") return "일반 안내";
    if (status === "stale") return "오래된 자료";
    if (status === "live_verified") return "최신 정보 확인";
    if (status === "verified") return "출처 확인";
    return "웹 근거";
}

function safeResearchUrl(value: string) {
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) return null;
        return {
            href: parsed.toString(),
            hostname: parsed.hostname.toLowerCase().replace(/^www\./, ""),
        };
    } catch {
        return null;
    }
}

function ResearchEvidence({
    sources,
    research,
    compact,
}: Pick<ChatResponseExtrasProps, "sources" | "research" | "compact">) {
    const visibleSources = (sources ?? []).reduce<Array<{
        source: ShopChatSource;
        citationNumber: number;
        href: string;
        hostname: string;
    }>>((items, source, index) => {
        const safeUrl = safeResearchUrl(source.url);
        if (safeUrl && items.length < 6) {
            items.push({ source, citationNumber: index + 1, ...safeUrl });
        }
        return items;
    }, []);
    const researchMode = research?.mode?.trim().toLowerCase();
    if (researchMode && NON_EVIDENCE_RESEARCH_MODES.has(researchMode) && visibleSources.length === 0) return null;
    const hasResearchAttempt = Boolean(research && (
        researchMode
        || research.freshnessStatus
        || research.searchedAt
        || research.freshAsOf
        || (research.sourceCount ?? 0) > 0
        || (research.domains?.length ?? 0) > 0
    ));
    if (!visibleSources.length && !hasResearchAttempt) return null;

    const searchedAt = formatEvidenceDate(research?.searchedAt);
    const freshAsOf = formatEvidenceDate(research?.freshAsOf);
    const isInsufficient = !visibleSources.length
        || research?.freshnessStatus === "insufficient"
        || research?.freshnessStatus === "unavailable";

    return (
        <details
            data-chat-research-evidence
            open={!visibleSources.length}
            className={`group mt-2 ${compact ? "max-w-[86%]" : "max-w-[82%]"} rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2 text-left shadow-sm`}
        >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-black text-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
                <span className="flex min-w-0 items-center gap-1.5">
                    <i className="fa-solid fa-link text-sky-600" aria-hidden="true" />
                    <span>
                        {visibleSources.length
                            ? `${isInsufficient ? "참고한 자료" : "확인한 출처"} ${visibleSources.length}개`
                            : "출처 링크 없는 일반 안내"}
                    </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-extrabold text-sky-700">
                    {researchFreshnessLabel(research?.freshnessStatus, Boolean(visibleSources.length))}
                    <i
                        className="fa-solid fa-chevron-down text-[9px] transition-transform group-open:rotate-180"
                        aria-hidden="true"
                    />
                </span>
            </summary>
            {visibleSources.length ? (
                <ol className="mt-2 space-y-1.5 border-t border-sky-100 pt-2" aria-label="답변에 인용된 웹 출처">
                {visibleSources.map(({ source, citationNumber, href, hostname }) => {
                    const sourceDate = formatEvidenceDate(source.publishedAt || source.retrievedAt);
                    return (
                        <li key={`${href}-${citationNumber}`} className="text-[11px] leading-4 text-neutral-700">
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-extrabold text-sky-900 underline decoration-sky-300 underline-offset-2 hover:text-sky-700"
                            >
                                [{citationNumber}] {source.name}
                                <span className="sr-only"> 새 창에서 열기</span>
                            </a>
                            <span className="ml-1.5 text-[10px] font-bold text-neutral-500">
                                {hostname}
                                {sourceDate ? ` · ${source.publishedAt ? "게시" : "확인"} ${sourceDate}` : ""}
                            </span>
                        </li>
                    );
                })}
                </ol>
            ) : null}
            {searchedAt || freshAsOf ? (
                <p className="mt-2 text-[10px] font-bold text-neutral-500">
                    {searchedAt ? `웹 확인 시각 ${searchedAt}` : ""}
                    {searchedAt && freshAsOf ? " · " : ""}
                    {freshAsOf ? `근거 기준 ${freshAsOf}` : ""}
                </p>
            ) : null}
        </details>
    );
}

function safeNaverMapFallback(value: string | undefined, query: string) {
    const fallbackUrl = buildNaverMapUrl(query);
    if (!value) return fallbackUrl;
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== "https:" || parsed.hostname !== "map.naver.com" || !parsed.pathname.startsWith("/p/search/")) {
            return fallbackUrl;
        }
        return parsed.toString();
    } catch {
        return fallbackUrl;
    }
}

async function fetchNearbyLocalCarePlaces(
    latitude: number,
    longitude: number,
    category: LocalCareCategory,
    label: string,
    query: string,
) {
    const result = await fetchDaengDaBangLocalCarePlaces(latitude, longitude, category, label, query);
    if (result?.places.length) return result;
    throw new Error(result?.message || `현재 확인 가능한 ${label} 후보가 없습니다.`);
}

async function fetchDaengDaBangLocalCarePlaces(
    latitude: number,
    longitude: number,
    category: LocalCareCategory,
    label: string,
    query: string,
) {
    const base = ddbApiBase();
    if (!base) return null;

    const params = new URLSearchParams({
        category,
        lat: String(latitude),
        lon: String(longitude),
        limit: "5",
    });
    const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/local/pet-care?${params}`, {
        headers: { "Accept": "application/json" },
    });
    if (!response.ok) return null;
    const data = await response.json() as {
        configured?: boolean;
        status?: "ready" | "degraded" | "unavailable";
        error?: string;
        fallbackMapUrl?: string;
        places?: Array<{
            id?: string;
            name?: string;
            address?: string;
            phone?: string;
            lat?: number | null;
            lon?: number | null;
            distanceMeters?: number | null;
            mapUrl?: string;
            source?: string;
            mapProvider?: string;
            openingHours?: string;
        }>;
    };
    if (!Array.isArray(data.places)) return null;

    const places = data.places.flatMap((place, index): LocalCarePlace[] => {
        if (place.lat == null || place.lon == null) return [];
        const lat = Number(place.lat);
        const lon = Number(place.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat === 0 || lon === 0) return [];
        const name = String(place.name || `이름 미확인 ${label}`).trim();
        return [{
            id: place.id || `naver-${index}-${name}`,
            name,
            address: String(place.address || "").trim(),
            phone: place.phone ? String(place.phone) : undefined,
            openingHours: place.openingHours ? String(place.openingHours) : undefined,
            lat,
            lon,
            distanceMeters: typeof place.distanceMeters === "number"
                ? place.distanceMeters
                : distanceMeters({ latitude, longitude }, { latitude: lat, longitude: lon }),
            // Candidate data may come from a bounded public-data fallback, but
            // every customer-facing map destination is intentionally NAVER Map.
            mapUrl: buildNaverMapUrl(name, String(place.address || "").trim()),
            source: place.source === "naver" ? "naver" : "openstreetmap",
            mapProvider: "naver",
        }];
    });

    const message = data.status === "unavailable"
        ? `${label} 검색 서비스에 연결하지 못했습니다. 네이버지도에서 직접 확인해 주세요.`
        : data.status === "degraded" || data.error
            ? "일부 검색 공급자가 불안정해 확인된 후보만 표시합니다."
            : "";
    return {
        fallbackUrl: safeNaverMapFallback(data.fallbackMapUrl, query),
        places,
        message,
    };
}

function FollowUpBundleForm({
    slots,
    onAsk,
    compact,
    enabled,
}: {
    slots: FollowUpSlot[];
    onAsk: ChatResponseExtrasProps["onAsk"];
    compact?: boolean;
    enabled: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submittedCount, setSubmittedCount] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const formId = useId();
    const toggleRef = useRef<HTMLButtonElement>(null);
    const firstInputRef = useRef<HTMLTextAreaElement>(null);
    const returnFocusRef = useRef(false);
    const answeredEntries = slots.flatMap((slot) => {
        const answer = answers[slot.key]?.trim();
        return answer ? [{ label: slot.label, answer }] : [];
    });

    useEffect(() => {
        if (expanded && enabled) {
            firstInputRef.current?.focus();
            return;
        }
        if (!expanded && returnFocusRef.current) {
            returnFocusRef.current = false;
            toggleRef.current?.focus();
        }
    }, [enabled, expanded]);

    if (!enabled) {
        return submittedCount > 0 ? (
            <div className="mt-2 rounded-md border border-dashed border-emerald-300 bg-emerald-50/80 px-3 py-2 text-[13px] font-extrabold leading-[1.45] text-emerald-900">
                <i className="fa-solid fa-check mr-1.5" aria-hidden="true" />
                추가 정보 {submittedCount}개를 한 번에 전달했어요.
            </div>
        ) : null;
    }

    const submitBundle = async (event: FormEvent) => {
        event.preventDefault();
        if (!answeredEntries.length || submitting) return;
        const prompt = [
            CHAT_FOLLOW_UP_BUNDLE_PREFIX,
            ...answeredEntries.map(({ label, answer }) => `- ${label}: ${answer}`),
        ].join("\n");
        setSubmitting(true);
        const accepted = await onAsk(prompt);
        if (accepted) {
            setSubmittedCount(answeredEntries.length);
            setExpanded(false);
        }
        setSubmitting(false);
    };

    return (
        <div className="mt-2 rounded-lg border border-dashed border-sky-300 bg-sky-50/75 p-2.5 text-left">
            {!expanded ? (
                <button
                    ref={toggleRef}
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="w-full rounded-md border border-sky-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-sky-400 hover:bg-sky-50"
                    aria-expanded="false"
                    aria-controls={formId}
                >
                    <span className="block text-[14px] font-extrabold leading-[1.35] text-sky-950">
                        <i className="fa-solid fa-pencil mr-1.5 text-sky-600" aria-hidden="true" />
                        추가정보 한 번에 입력
                    </span>
                    <span className="mt-1 block text-[13px] font-semibold leading-[1.45] text-sky-700">
                        아는 내용만 적고 한 번에 보내세요.
                    </span>
                </button>
            ) : (
                <form id={formId} onSubmit={submitBundle} className="rounded-md border border-sky-200 bg-white p-2.5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[14px] font-extrabold leading-[1.35] text-sky-950">추가정보 모아 보내기</p>
                            <p className="mt-1 text-[13px] font-semibold leading-[1.45] text-neutral-600">모르는 항목은 비워도 괜찮아요.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                returnFocusRef.current = true;
                                setExpanded(false);
                            }}
                            className="shrink-0 rounded-full px-2 py-1 text-[12px] font-extrabold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                        >
                            접기
                        </button>
                    </div>
                    <div className={`mt-3 grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
                        {slots.map((slot, index) => (
                            <label key={slot.key} className="block rounded-md border border-sky-100 bg-sky-50/60 p-2">
                                <span className="block text-[13px] font-extrabold leading-[1.45] text-sky-950">{slot.label}</span>
                                <textarea
                                    ref={index === 0 ? firstInputRef : undefined}
                                    value={answers[slot.key] ?? ""}
                                    onChange={(event) => setAnswers((current) => ({
                                        ...current,
                                        [slot.key]: event.target.value,
                                    }))}
                                    rows={slot.prompt.length > 34 ? 2 : 1}
                                    disabled={submitting}
                                    className="mt-1 min-h-10 w-full resize-y rounded-md border border-sky-200 bg-white px-2.5 py-2 text-[16px] font-semibold leading-[1.4] text-neutral-900 outline-none placeholder:text-[13px] placeholder:font-semibold placeholder:text-neutral-600 focus:border-sky-500 disabled:opacity-60"
                                    placeholder={slot.prompt}
                                    aria-label={`${slot.label} 추가 정보 입력`}
                                />
                            </label>
                        ))}
                    </div>
                    <button
                        type="submit"
                        className="mt-3 w-full rounded-md bg-sky-700 px-3 py-2.5 text-[13px] font-extrabold leading-[1.35] text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-45"
                        disabled={!answeredEntries.length || submitting}
                    >
                        {submitting ? "답변을 확인하고 있어요…" : "입력한 내용 한 번에 보내기"}
                    </button>
                </form>
            )}
        </div>
    );
}

function ChoiceGroups({
    medical,
    onAsk,
    compact,
    followUpsEnabled = true,
}: Pick<ChatResponseExtrasProps, "medical" | "onAsk" | "compact" | "followUpsEnabled">) {
    const [customGroupTitle, setCustomGroupTitle] = useState<string | null>(null);
    const [customText, setCustomText] = useState("");
    const [answerSlot, setAnswerSlot] = useState<{ label: string; prompt: string } | null>(null);
    const groups: ChoiceViewGroup[] = medical?.choiceGroups?.filter((group) => group.choices.length > 0) ?? [];
    const followUpSlots = (medical?.followUpSlots ?? []).slice(0, 8);
    const bundleSlots = followUpSlots.some((slot) => slot.required) ? followUpSlots : [];

    if (bundleSlots.length) {
        return (
            <FollowUpBundleForm
                slots={bundleSlots}
                onAsk={onAsk}
                compact={compact}
                enabled={followUpsEnabled}
            />
        );
    }

    if (!followUpsEnabled) return null;

    const fallbackChoices: ChoiceViewGroup[] = !groups.length && medical?.followUpSlots?.length
        ? [{
            title: "추가로 알려주실 내용",
            choices: medical.followUpSlots.map((slot) => ({
                label: slot.label,
                prompt: slot.prompt,
                description: slot.prompt,
            })),
            answerInput: true,
        }]
        : [];
    const allGroups = groups.length ? groups : fallbackChoices;
    if (!allGroups.length) return null;

    const submitCustom = (event: FormEvent) => {
        event.preventDefault();
        const value = customText.trim();
        if (!value) return;
        setCustomText("");
        setCustomGroupTitle(null);
        setAnswerSlot(null);
        void onAsk(value);
    };

    return (
        <div className="mt-2 space-y-2">
            {allGroups.slice(0, 2).map((group) => (
                <div key={group.title} className="rounded-lg border border-sky-100 bg-sky-50/70 p-2.5 text-left">
                    <p className="text-[13px] font-extrabold leading-[1.45] text-sky-900">{group.title}</p>
                    <div className="mt-2 grid gap-1.5">
                        {group.choices.slice(0, compact ? 5 : 8).map((choice) => (
                            <button
                                key={`${group.title}-${choice.label}`}
                                type="button"
                                onClick={() => {
                                    if (group.answerInput) {
                                        setCustomGroupTitle(group.title);
                                        setAnswerSlot({ label: choice.label, prompt: choice.prompt });
                                        setCustomText("");
                                        return;
                                    }
                                    void onAsk(choice.prompt);
                                }}
                                className="rounded-md border border-sky-200 bg-white px-2.5 py-2 text-left text-[14px] font-extrabold leading-[1.35] text-sky-900 shadow-sm transition hover:border-sky-400 hover:bg-sky-100"
                            >
                                <span className="block">{choice.label}</span>
                                {choice.description ? (
                                    <span className="mt-1 block text-[13px] font-semibold leading-[1.45] text-sky-800">{choice.description}</span>
                                ) : null}
                            </button>
                        ))}
                    </div>
                    {!group.answerInput ? (
                        <button
                            type="button"
                            onClick={() => {
                                setAnswerSlot(null);
                                setCustomGroupTitle((current) => current === group.title ? null : group.title);
                            }}
                            className="mt-2 w-full rounded-md border border-dashed border-sky-300 bg-white/70 px-2.5 py-2 text-left text-[13px] font-extrabold leading-[1.45] text-sky-900 transition hover:bg-white"
                        >
                            답이 없어요. 직접 적을게요
                        </button>
                    ) : null}
                    {customGroupTitle === group.title ? (
                        <form onSubmit={submitCustom} className="mt-2 rounded-md border border-sky-200 bg-white p-2">
                            {answerSlot ? (
                                <label className="mb-1.5 block text-[13px] font-extrabold leading-[1.45] text-sky-900">{answerSlot.label} 답변</label>
                            ) : null}
                            <div className="flex gap-1.5">
                                <input
                                    value={customText}
                                    onChange={(event) => setCustomText(event.target.value)}
                                    className="min-w-0 flex-1 rounded-md border border-sky-200 bg-white px-2.5 py-2 text-[16px] font-semibold leading-[1.4] text-neutral-900 outline-none focus:border-sky-500"
                                    placeholder={answerSlot?.prompt || "상황을 직접 입력"}
                                    aria-label={answerSlot ? `${answerSlot.label} 답변 입력` : "객관식에 없는 답 직접 입력"}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    className="shrink-0 rounded-md bg-sky-700 px-2.5 py-2 text-[12px] font-extrabold leading-[1.35] text-white disabled:opacity-50"
                                    disabled={!customText.trim()}
                                >
                                    답변 보내기
                                </button>
                            </div>
                        </form>
                    ) : null}
                </div>
            ))}
        </div>
    );
}

const LOCAL_CARE_SHORTCUTS = [
    { category: "veterinary", label: "동물병원", query: "동물병원", icon: "fa-house-medical" },
    { category: "grooming", label: "반려견 미용", query: "반려견 미용", icon: "fa-scissors" },
    { category: "hotel", label: "반려견 호텔", query: "반려견 호텔", icon: "fa-bed" },
    { category: "daycare", label: "데이케어·유치원", query: "반려견 데이케어 유치원", icon: "fa-dog" },
] as const;

type LocalCareShortcut = (typeof LOCAL_CARE_SHORTCUTS)[number];

function LocalCareQuickActions({
    onFindLocalCare,
    loadingCategory,
}: {
    onFindLocalCare: (item: LocalCareShortcut) => void;
    loadingCategory?: LocalCareCategory;
}) {
    return (
        <div
            data-chat-local-care-actions
            className="rounded-xl border border-indigo-200 bg-[#fffaf0] p-3 text-left shadow-sm"
        >
            <div className="flex items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700" aria-hidden="true">
                    <i className="fa-solid fa-map-location-dot" />
                </span>
                <div>
                    <p className="text-sm font-black text-neutral-950">동네 돌봄을 한곳에서 찾아보세요</p>
                    <p className="mt-1 text-[11px] font-bold leading-4 text-neutral-600">
                        병원·미용·호텔·데이케어 모두 현재 위치에서 가까운 후보를 이 화면에 보여드려요.
                    </p>
                </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
                {LOCAL_CARE_SHORTCUTS.map((item) => (
                    <div key={item.category} className="overflow-hidden rounded-lg border border-indigo-100 bg-white">
                        <button
                            type="button"
                            onClick={() => onFindLocalCare(item)}
                            disabled={Boolean(loadingCategory)}
                            className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-neutral-900 transition hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-60"
                        >
                            <i
                                className={`fa-solid ${loadingCategory === item.category ? "fa-spinner fa-spin" : item.icon} w-4 text-center text-indigo-600`}
                                aria-hidden="true"
                            />
                            <span>
                                <span className="block">{item.label}</span>
                                <span className="mt-0.5 block text-[10px] font-bold text-neutral-500">가까운 후보 보기</span>
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => openExternal(buildNaverMapUrl(item.query))}
                            className="flex min-h-8 w-full items-center justify-center border-t border-indigo-50 bg-[#f8fff9] px-2 text-[10px] font-black text-[#087b39] hover:bg-[#ecfff0]"
                            aria-label={`${item.label} 네이버지도에서 바로 보기`}
                        >
                            <span aria-hidden="true" className="mr-1">N</span>
                            지도 바로 보기
                        </button>
                    </div>
                ))}
            </div>
            <p className="mt-2 text-[10px] font-bold leading-4 text-neutral-500">
                영업·진료·예약 가능 여부는 방문 전에 해당 업체에 확인해 주세요.
            </p>
        </div>
    );
}

function LocalCareSearchResults({ state }: { state: LocalCareSearchState }) {
    if (state.status === "idle") return null;
    if (state.status === "loading") {
        return (
            <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-left text-xs font-black text-indigo-900">
                <i className="fa-solid fa-spinner fa-spin mr-1.5" />
                {state.message}
            </div>
        );
    }

    if (state.status === "error") {
        return (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
                <p className="text-xs font-black leading-5 text-amber-900">{state.message}</p>
                <button
                    type="button"
                    onClick={() => openExternal(state.fallbackUrl)}
                    className="mt-2 min-h-10 rounded-md bg-neutral-950 px-3 py-2 text-[11px] font-black text-white"
                >
                    네이버지도에서 직접 보기
                </button>
            </div>
        );
    }

    if (state.places.length === 0) {
        return (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
                <p className="text-xs font-black leading-5 text-amber-900">
                    가까운 {state.label} 후보를 찾지 못했어요. 네이버지도에서 주변 업체를 바로 확인해 주세요.
                </p>
                <button
                    type="button"
                    onClick={() => openExternal(state.fallbackUrl)}
                    className="mt-2 min-h-10 rounded-md bg-neutral-950 px-3 py-2 text-[11px] font-black text-white"
                >
                    네이버지도에서 직접 보기
                </button>
            </div>
        );
    }

    return (
        <div className="mt-2 space-y-2 rounded-lg border border-indigo-100 bg-white p-2.5 text-left shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
                <p className="text-[11px] font-black text-indigo-800">현재 위치 기준 가까운 {state.label} 후보</p>
                <span className="rounded-full bg-[#e9fff1] px-2 py-1 text-[10px] font-black text-[#087b39]">
                    지도: 네이버지도
                </span>
            </div>
            {state.places.map((place, index) => (
                <div key={place.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-2.5">
                    <div className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
                            {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black leading-5 text-neutral-950">{place.name}</p>
                            <p className="mt-0.5 text-[10px] font-black text-indigo-700">
                                {place.source === "naver" ? "네이버 지역검색 결과" : "공개 위치 데이터 결과"}
                            </p>
                            <p className="mt-0.5 text-[11px] font-bold leading-4 text-neutral-600">
                                {formatDistance(place.distanceMeters)}
                                {place.address ? ` · ${place.address}` : " · 주소는 지도에서 확인"}
                            </p>
                            {place.phone ? (
                                <a href={`tel:${place.phone}`} className="mt-1 inline-block text-[11px] font-black text-indigo-700">
                                    {place.phone}
                                </a>
                            ) : null}
                            {place.openingHours ? (
                                <p className="mt-1 text-[10px] font-bold leading-4 text-neutral-500">영업시간 데이터: {place.openingHours}</p>
                            ) : null}
                        </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={() => openExternal(place.mapUrl)}
                            aria-label={`${place.name} 네이버지도에서 보기`}
                            className="inline-flex min-h-9 items-center rounded-full border border-[#03a94f] bg-[#03c75a] px-2.5 py-1 text-[11px] font-black text-white hover:bg-[#02b351]"
                        >
                            <span aria-hidden="true" className="mr-1">N</span>
                            네이버지도에서 보기
                        </button>
                        {place.phone ? (
                            <a
                                href={`tel:${place.phone}`}
                                className="inline-flex min-h-9 items-center rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-black text-neutral-700"
                            >
                                전화하기
                            </a>
                        ) : null}
                    </div>
                </div>
            ))}
            <p className="text-[10px] font-bold leading-4 text-neutral-500">
                후보 정보는 네이버 지역검색을 우선하며, 모든 지도 버튼은 네이버지도로 열립니다. {state.category === "veterinary"
                    ? "실제 진료 가능 여부와 야간·응급 운영은 전화로 확인해 주세요."
                    : "실제 영업·예약 가능 여부와 반려견 이용 조건은 업체에 확인해 주세요."}
            </p>
        </div>
    );
}

export default function ChatResponseExtras({
    medical,
    generation,
    generationRequest,
    accessToken,
    sources,
    research,
    ctas,
    onAsk,
    compact = false,
    followUpsEnabled = true,
    onInternalNavigate,
    questionContext,
}: ChatResponseExtrasProps) {
    const [localCareSearch, setLocalCareSearch] = useState<LocalCareSearchState>({ status: "idle" });
    const widthClass = compact ? "max-w-[86%]" : "max-w-[82%]";
    const geoSearchCta = ctas?.find((cta) => cta.kind === "geo_vet_search");
    const localCareIntent = Boolean(geoSearchCta) || isLocalPetCarePrompt(questionContext);
    const visibleCtas = (ctas ?? []).filter((cta) => !localCareIntent || (
        cta.kind !== "geo_vet_search"
        && !(cta.kind === "external_link" && cta.url?.startsWith("https://map.naver.com/p/search/"))
    ));

    const runLocalCareSearch = async ({
        category,
        label,
        query,
    }: {
        category: LocalCareCategory;
        label: string;
        query: string;
    }) => {
        const fallbackUrl = buildNaverMapUrl(query);
        if (!("geolocation" in navigator)) {
            setLocalCareSearch({
                status: "error",
                category,
                label,
                message: "이 브라우저에서는 현재 위치를 읽을 수 없어요. 네이버지도에서 직접 확인해 주세요.",
                fallbackUrl,
            });
            return;
        }

        setLocalCareSearch({
            status: "loading",
            category,
            label,
            message: `현재 위치 기준으로 가까운 ${label} 후보를 찾고 있어요.`,
            fallbackUrl,
        });
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 7000,
                    maximumAge: 60000,
                });
            });
            const result = await fetchNearbyLocalCarePlaces(
                position.coords.latitude,
                position.coords.longitude,
                category,
                label,
                query,
            );
            setLocalCareSearch({
                status: "done",
                category,
                label,
                places: result.places,
                fallbackUrl: result.fallbackUrl,
            });
        } catch (error) {
            const geolocationCode = typeof error === "object" && error !== null && "code" in error
                ? Number((error as { code?: unknown }).code)
                : undefined;
            const message = geolocationCode === 1
                ? "위치 권한이 거절됐어요. 브라우저의 사이트 설정에서 위치를 허용하거나 네이버지도에서 직접 확인해 주세요."
                : `${label} 후보 검색이 잠시 불안정해요. 네이버지도에서 직접 확인해 주세요.`;
            setLocalCareSearch({
                status: "error",
                category,
                label,
                message,
                fallbackUrl,
            });
        }
    };

    const handleCta = async (cta: ShopChatCta) => {
        if (cta.kind === "prompt" && cta.prompt) {
            void onAsk(cta.prompt);
            return;
        }
        if (cta.kind === "external_link") {
            openExternal(cta.url);
            return;
        }
        if (cta.kind !== "geo_vet_search") return;
        await runLocalCareSearch({
            category: "veterinary",
            label: "동물병원",
            query: cta.query || "동물병원",
        });
    };

    return (
        <>
            {!localCareIntent ? (
                <ResearchEvidence sources={sources} research={research} compact={compact} />
            ) : null}

            {generation ? (
                <div
                    data-chat-generation-plan
                    className={`mt-2 ${widthClass} rounded-lg border border-violet-200 bg-violet-50/80 p-3 text-left shadow-sm`}
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-violet-800">
                            제작 요청
                        </span>
                        <span className="text-xs font-black text-neutral-700">
                            {generation.status === "ready_for_generation"
                                ? "제작 준비 완료"
                                : generation.status === "blocked"
                                    ? "요청 수정 필요"
                                    : generation.status === "needs_information"
                                        ? "추가 정보 필요"
                                        : generation.status === "temporarily_unavailable"
                                            ? "제작 연결 대기"
                                            : "상태 확인 중"}
                        </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-extrabold text-violet-900">
                        {generation.intent?.outputType ? <span>{generation.intent.outputType === "video" ? "영상" : "이미지"}</span> : null}
                        {generation.intent?.purpose ? <span>· {generation.intent.purpose}</span> : null}
                        {generation.intent?.subject ? <span>· {generation.intent.subject}</span> : null}
                        {generation.intent?.durationSeconds ? <span>· {generation.intent.durationSeconds}초</span> : null}
                        {generation.intent?.aspectRatio ? <span>· {generation.intent.aspectRatio}</span> : null}
                    </div>
                    {!generation.execution?.mediaGenerated ? (
                        <p className="mt-2 text-[11px] font-bold leading-4 text-neutral-600">
                            아직 이미지나 영상 결과가 생성된 상태는 아니에요.
                        </p>
                    ) : null}
                    <CareTalkGenerationExecution
                        generation={generation}
                        request={generationRequest}
                        accessToken={accessToken}
                    />
                </div>
            ) : null}

            {localCareIntent ? (
                <div className={`mt-2 ${widthClass}`}>
                    <LocalCareQuickActions
                        loadingCategory={localCareSearch.status === "loading" ? localCareSearch.category : undefined}
                        onFindLocalCare={(item) => void runLocalCareSearch(item)}
                    />
                    <LocalCareSearchResults state={localCareSearch} />
                </div>
            ) : null}

            {visibleCtas.length > 0 && (
                <div className={`mt-2 ${widthClass} space-y-1.5`}>
                    {visibleCtas.slice(0, 3).map((cta) => {
                        const content = (
                            <>
                                <i className={`fa-solid ${cta.icon || "fa-arrow-up-right-from-square"} text-indigo-600`} aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                    <span className="block">{cta.label}</span>
                                    {cta.helperText ? (
                                        <span className="mt-0.5 block text-[10px] font-bold leading-4 text-neutral-500">{cta.helperText}</span>
                                    ) : null}
                                </span>
                                {cta.kind === "internal_link" ? <i className="fa-solid fa-chevron-right text-[9px] text-indigo-500" aria-hidden="true" /> : null}
                            </>
                        );
                        const className = "flex min-h-11 w-full items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-left text-xs font-black text-neutral-900 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500";
                        if (cta.kind === "internal_link" && cta.url) {
                            if (cta.url.startsWith("/inquiry")) {
                                return (
                                    <a
                                        key={`${cta.kind}-${cta.label}`}
                                        href={cta.url}
                                        onClick={onInternalNavigate}
                                        className={className}
                                    >
                                        {content}
                                    </a>
                                );
                            }
                            return (
                                <Link
                                    key={`${cta.kind}-${cta.label}`}
                                    href={cta.url}
                                    onClick={onInternalNavigate}
                                    className={className}
                                >
                                    {content}
                                </Link>
                            );
                        }
                        return (
                            <button
                                key={`${cta.kind}-${cta.label}`}
                                type="button"
                                onClick={() => void handleCta(cta)}
                                disabled={cta.kind === "geo_vet_search" && localCareSearch.status === "loading"}
                                className={className}
                            >
                                {content}
                            </button>
                        );
                    })}
                </div>
            )}

            <ChoiceGroups medical={medical} onAsk={onAsk} compact={compact} followUpsEnabled={followUpsEnabled} />

        </>
    );
}
