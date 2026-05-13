/**
 * PromoSection — 상황별 기획전 (1 featured + 4 small)
 * ---------------------------------------------------------------------
 * 각 카드는 배경 이미지(public/images/promo) + 다크 그라데이션 + 텍스트.
 * 모바일에선 5개 모두 1열로 큰 카드.
 */
import Image from "next/image";
import Link from "next/link";

interface PromoTile {
    href: string;
    eyebrow?: string;
    title: string;
    desc: string;
    image: string;
    featured?: boolean;
}

const TILES: PromoTile[] = [
    {
        href: "#promo-active",
        eyebrow: "FEATURED COLLECTION",
        title: "활동견을 위한\n최고의 셀렉션",
        desc: "산책·하이킹·달리기까지 — 활동이 많은 댕댕이를 위한 큐레이션",
        image: "/images/promo/active.jpg",
        featured: true,
    },
    {
        href: "#promo-rainy",
        title: "장마·우천 필수템",
        desc: "방수 의류·우천 산책 가이드",
        image: "/images/promo/rainy.jpg",
    },
    {
        href: "#promo-eye",
        title: "눈·청력 보호",
        desc: "Rex Specs 전문 아이웨어",
        image: "/images/promo/eye-protection.jpg",
    },
    {
        href: "#promo-food",
        title: "프리미엄 푸드",
        desc: "엄선된 사료·간식 큐레이션",
        image: "/images/promo/premium-food.jpg",
    },
    {
        href: "#promo-seasonal",
        title: "댕스크림 컬렉션",
        desc: "한정 시즌 — 아이스크림·음료",
        image: "/images/promo/seasonal.jpg",
    },
];

export default function PromoSection() {
    return (
        <section id="promo" className="py-12 md:py-20">
            <div className="max-w-[1400px] mx-auto px-6">
                <div className="mb-6 md:mb-8">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5">
                        상황별 기획전
                    </h2>
                    <p className="text-sm text-neutral-500">
                        우리 댕댕이에게 딱 맞는 큐레이션
                    </p>
                </div>

                {/* 1 featured (큰 2x2) + 4 small (1x1) 그리드
                    모바일: 1열, 태블릿/데스크탑: 4열 그리드 안에 featured 가 2 열·2 행 차지 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 auto-rows-[minmax(180px,1fr)] md:auto-rows-[200px] lg:auto-rows-[220px]">
                    {TILES.map((t, i) => (
                        <PromoTileCard key={t.href} tile={t} priority={i === 0} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function PromoTileCard({ tile, priority }: { tile: PromoTile; priority: boolean }) {
    const isFeatured = !!tile.featured;
    return (
        <Link
            href={tile.href}
            className={`group relative block rounded-2xl overflow-hidden shadow-card hover:shadow-hover transition-all hover:-translate-y-1 ${
                isFeatured ? "md:col-span-2 md:row-span-2 min-h-[300px] md:min-h-0" : "min-h-[200px] md:min-h-0"
            }`}
        >
            {/* 배경 이미지 */}
            <Image
                src={tile.image}
                alt={tile.title}
                fill
                sizes={isFeatured ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 25vw"}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                priority={priority}
            />

            {/* 다크 그라데이션 (텍스트 가독성) */}
            <div
                className={`absolute inset-0 ${
                    isFeatured
                        ? "bg-gradient-to-br from-black/70 via-black/40 to-black/10"
                        : "bg-gradient-to-t from-black/75 via-black/30 to-transparent"
                }`}
            />

            {/* 텍스트 — featured 는 좌상단, 일반은 좌하단 */}
            <div
                className={`absolute z-10 left-5 right-5 text-white ${
                    isFeatured ? "top-6 md:top-8" : "bottom-5"
                }`}
            >
                {tile.eyebrow && (
                    <p className="text-[10px] md:text-xs font-extrabold tracking-[0.25em] text-white/85 mb-2 md:mb-3">
                        {tile.eyebrow}
                    </p>
                )}
                <h3
                    className={`font-black tracking-tight whitespace-pre-line drop-shadow-md mb-1.5 md:mb-2 ${
                        isFeatured
                            ? "text-2xl md:text-4xl leading-[1.15]"
                            : "text-lg md:text-xl"
                    }`}
                >
                    {tile.title}
                </h3>
                <p
                    className={`text-white/85 drop-shadow leading-snug ${
                        isFeatured ? "text-xs md:text-sm max-w-md" : "text-[11px] md:text-xs"
                    }`}
                >
                    {tile.desc}
                </p>
            </div>

            {/* featured 우하단 CTA */}
            {isFeatured && (
                <span className="absolute z-10 bottom-6 md:bottom-8 left-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 text-foreground text-xs md:text-sm font-extrabold group-hover:bg-white">
                    컬렉션 보기 <i className="fa-solid fa-arrow-right" />
                </span>
            )}

            {/* 작은 카드 우하단 화살표 */}
            {!isFeatured && (
                <span className="absolute z-10 right-4 bottom-4 w-9 h-9 rounded-full bg-white/90 text-foreground flex items-center justify-center group-hover:bg-white">
                    <i className="fa-solid fa-arrow-right text-xs" />
                </span>
            )}
        </Link>
    );
}
