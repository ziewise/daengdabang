export type SocialChannel = {
    key: string;
    label: string;
    handle: string;
    href: string;
    iconClassName: string;
};

export const SOCIAL_PROFILE_LANDING = "/campaign/sns-launch";

export const PUBLIC_SOCIAL_CHANNELS: SocialChannel[] = [
    {
        key: "naver",
        label: "Naver",
        handle: "daengdabang",
        href: "https://blog.naver.com/daengdabang",
        iconClassName: "fa-solid fa-blog",
    },
    {
        key: "youtube",
        label: "YouTube",
        handle: "@daengdabang",
        href: "https://www.youtube.com/@daengdabang",
        iconClassName: "fa-brands fa-youtube",
    },
    {
        key: "instagram",
        label: "Instagram",
        handle: "@daengdabang",
        href: "https://www.instagram.com/daengdabang/",
        iconClassName: "fa-brands fa-instagram",
    },
    {
        key: "threads",
        label: "Threads",
        handle: "@daengdabang",
        href: "https://www.threads.net/@daengdabang",
        iconClassName: "fa-brands fa-threads",
    },
    {
        key: "tiktok",
        label: "TikTok",
        handle: "@daengdabang",
        href: "https://www.tiktok.com/@daengdabang",
        iconClassName: "fa-brands fa-tiktok",
    },
];
