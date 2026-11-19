"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const officialAuthorId = "dsa_Lm7eefJcyG8hQoYcvf7rkpN8";
const officialMarker = "[댕다방 운영팀 공식 게시물]";
type CaptionIndex = Readonly<Record<string, string>>;
let savedCaptions: CaptionIndex | null = null;
let loadingCaptions: Promise<CaptionIndex | null> | null = null;

function fetchCaptions() {
    if (savedCaptions) return Promise.resolve(savedCaptions);
    if (!loadingCaptions) {
        loadingCaptions = fetch("/data/showcase-official-captions.en.json")
            .then(async (response) => {
                if (!response.ok) return null;
                const data: CaptionIndex = await response.json();
                savedCaptions = data;
                return data;
            })
            .catch(() => null)
            .finally(() => { loadingCaptions = null; });
    }
    return loadingCaptions;
}

type Props = { authorId: string; text: string; fullPost?: boolean };

export default function ShowcaseCaption({ authorId, text, fullPost = false }: Props) {
    const { locale } = useI18n();
    const [original, setOriginal] = useState<string | null>(null);
    const officialEnglish = locale === "en" && authorId === officialAuthorId && text.startsWith(officialMarker);
    const [captions, setCaptions] = useState<CaptionIndex | null>(savedCaptions);
    useEffect(() => {
        if (!officialEnglish || captions) return;
        let active = true;
        void fetchCaptions().then((index) => { if (active) setCaptions(index ?? {}); });
        return () => { active = false; };
    }, [officialEnglish, captions]);
    if (!officialEnglish) return <>{text}</>;

    const body = text.slice(officialMarker.length).trim();
    const english = captions?.[body] || (!/[가-힣]/.test(body) ? body : "");
    if (!english && !captions) return <>Loading post…</>;
    if (english) return <>{`[Official post by 댕다방]\n${english}`}</>;
    if (!fullPost) return <>Official post by 댕다방 · Open the post to read the Korean original.</>;

    return <>
        <button type="button" className="underline" aria-expanded={original === text}
            onClick={() => setOriginal(original === text ? null : text)}>
            {original === text ? "Hide original post" : "Read original post (Korean)"}
        </button>
        {original === text && <span lang="ko">{`\n${body}`}</span>}
    </>;
}
