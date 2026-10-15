// Keep original IDs stable for QA links. Clips 1 and 6 give the retriever
// four lower legs plus two arms; clip 3 grows an extra arm when waving.
// Only visually reviewed clips may enter the random pool or QA override.
export const INTRO_VIDEOS = [
    { id: 2, src: "/videos/intro-random-2-clean-v1.mp4?v=20260811" },
    { id: 4, src: "/videos/intro-random-4-clean-v1.mp4?v=20260811" },
    { id: 5, src: "/videos/intro-random-5-clean-v1.mp4?v=20260811" },
] as const;

export function pickIntroVideo(requestedId: string | null): string {
    const requested = INTRO_VIDEOS.find((video) => String(video.id) === requestedId);
    return (requested ?? INTRO_VIDEOS[Math.floor(Math.random() * INTRO_VIDEOS.length)]).src;
}
