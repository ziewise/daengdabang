/**
 * InstaSection — 인스타그램 8장 그리드
 * ---------------------------------------------------------------------
 * 8장 정사각 타일. hover 시 좋아요·댓글 카운트 오버레이.
 * 모바일 2열, sm 3열, lg 4열.
 */
import Image from "next/image";

interface InstaPost {
    src: string;
    likes: string;
    comments: number;
}

const INSTA_POSTS: InstaPost[] = [
    { src: "/images/instagram/i1.jpg", likes: "1.2k", comments: 42 },
    { src: "/images/instagram/i2.jpg", likes: "892",  comments: 28 },
    { src: "/images/instagram/i3.jpg", likes: "1.5k", comments: 61 },
    { src: "/images/instagram/i4.jpg", likes: "734",  comments: 19 },
    { src: "/images/instagram/i5.jpg", likes: "2.1k", comments: 87 },
    { src: "/images/instagram/i6.jpg", likes: "967",  comments: 33 },
    { src: "/images/instagram/i7.jpg", likes: "1.1k", comments: 47 },
    { src: "/images/instagram/i8.jpg", likes: "823",  comments: 24 },
];

const INSTA_URL = "https://instagram.com/daengdabang";

export default function InstaSection() {
    return (
        <section id="insta" className="py-12 md:py-20">
            <div className="max-w-[1400px] mx-auto px-6">
                {/* 헤드 */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 md:mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5 inline-flex items-center gap-2">
                            <i className="fa-brands fa-instagram bg-gradient-to-br from-pink-500 via-purple-500 to-yellow-400 bg-clip-text text-transparent" />
                            <span>@daengdabang</span>
                        </h2>
                        <p className="text-sm text-neutral-500">
                            댕다방의 일상을 인스타에서 만나보세요
                        </p>
                    </div>
                    <a
                        href={INSTA_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs md:text-sm font-bold hover:opacity-90 transition self-start sm:self-auto"
                    >
                        팔로우 하러가기
                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                    </a>
                </div>

                {/* 8장 그리드 — 모바일 2 / sm 3 / lg 4 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                    {INSTA_POSTS.map((post, i) => (
                        <a
                            key={i}
                            href={INSTA_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative block aspect-square rounded-xl md:rounded-2xl overflow-hidden bg-neutral-100"
                        >
                            <Image
                                src={post.src}
                                alt={`@daengdabang post ${i + 1}`}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            {/* hover 오버레이 */}
                            <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-5 text-white text-sm font-bold">
                                <span className="inline-flex items-center gap-1.5">
                                    <i className="fa-solid fa-heart" /> {post.likes}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <i className="fa-solid fa-comment" /> {post.comments}
                                </span>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}
