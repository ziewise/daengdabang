/**
 * InstaSection — 인스타그램 8장 그리드
 * ---------------------------------------------------------------------
 * 8장 정사각 타일. hover 및 키보드 focus 시 실제 프로필 이동 안내.
 * 모바일 2열, sm 3열, lg 4열.
 */
import Image from "next/image";
import { PUBLIC_SOCIAL_CHANNELS } from "@/lib/social-channels";

interface InstaPost {
    src: string;
}

const INSTA_POSTS: InstaPost[] = [
    { src: "/images/instagram/i1.jpg" },
    { src: "/images/instagram/i2.jpg" },
    { src: "/images/instagram/i3.jpg" },
    { src: "/images/instagram/i4.jpg" },
    { src: "/images/instagram/i5.jpg" },
    { src: "/images/instagram/i6.jpg" },
    { src: "/images/instagram/i7.jpg" },
    { src: "/images/instagram/i8.jpg" },
];

const INSTAGRAM_CHANNEL = PUBLIC_SOCIAL_CHANNELS.find((channel) => channel.key === "instagram");
const INSTA_URL = INSTAGRAM_CHANNEL?.href || "https://www.instagram.com/daengdabang/";
const INSTA_HANDLE = INSTAGRAM_CHANNEL?.handle || "@daengdabang";

export default function InstaSection() {
    return (
        <section id="insta" className="py-8 md:py-12">
            <div className="max-w-[1400px] mx-auto px-6">
                {/* 헤드 */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 md:mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5 inline-flex items-center gap-2">
                            <i aria-hidden="true" className="fa-brands fa-instagram bg-gradient-to-br from-pink-500 via-purple-500 to-yellow-400 bg-clip-text text-transparent" />
                            <span>{INSTA_HANDLE}</span>
                        </h2>
                        <p className="text-sm text-neutral-500">
                            댕다방의 일상을 인스타에서 만나보세요
                        </p>
                    </div>
                    <a
                        href={INSTA_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${INSTA_HANDLE} 인스타그램 프로필 열기 (새 창)`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs md:text-sm font-bold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-600 transition motion-reduce:transition-none self-start sm:self-auto"
                    >
                        팔로우 하러가기
                        <i aria-hidden="true" className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                    </a>
                </div>

                {/* 8장 그리드 — 모바일 2 / sm 3 / lg 4 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                    {INSTA_POSTS.map((post, i) => (
                        <a
                            key={post.src}
                            href={INSTA_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${INSTA_HANDLE} 인스타그램 프로필 열기 (새 창), 갤러리 ${i + 1}`}
                            className="group relative block aspect-square rounded-xl md:rounded-2xl overflow-hidden bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-600"
                        >
                            <Image
                                src={post.src}
                                alt=""
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                            />
                            {/* 포인터와 키보드 모두 프로필 이동 안내 표시 */}
                            <div aria-hidden="true" className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity motion-reduce:transition-none flex items-center justify-center text-white text-sm font-bold">
                                <span className="inline-flex items-center gap-1.5 px-3 text-center">
                                    <i className="fa-brands fa-instagram" /> 인스타그램에서 만나기
                                </span>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}
