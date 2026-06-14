import Image from "next/image";
import Link from "next/link";
import { CATALOG, formatKRW, type CatalogProduct } from "@/lib/catalog";
import { versionProductImage } from "@/lib/shop";

type Bundle = {
    slug: string;
    title: string;
    subtitle: string;
    mood: "walk" | "night" | "rain" | "snack" | "care" | "play" | "travel" | "summer";
    folders: string[];
    href: string;
};

const BUNDLES: Bundle[] = [
    {
        slug: "summer-hydration",
        title: "여름 산책 수분충전 세트",
        subtitle: "정수기, 쿨링웨어, 휴대 식기로 더운 날 산책 준비",
        mood: "summer",
        folders: ["heyrex_taurus_2l", "heyrex_taurus_filter_5p", "rw_swampcooler_vest", "rw_trailrunnerbowl"],
        href: "/products?q=쿨링",
    },
    {
        slug: "night-safety",
        title: "밤 산책 안전 세트",
        subtitle: "라이트, 리드줄, 하네스로 어두운 길을 또렷하게",
        mood: "night",
        folders: ["rw_beacon_light", "rw_audiblebeacon_light", "rw_leash_crag_23", "rw_hiandlight_harness_26"],
        href: "/products?q=야간산책",
    },
    {
        slug: "rain-walk",
        title: "비 오는 날 산책 세트",
        subtitle: "레인 재킷과 방수 산책템으로 젖는 날도 가볍게",
        mood: "rain",
        folders: ["rw_sunshower_jacket", "rw_sunshower_coverall_25fw", "rw_leash_flagline_24", "rw_beacon_light"],
        href: "/products?q=레인",
    },
    {
        slug: "crunch-snack",
        title: "아그작 간식 세트",
        subtitle: "동결건조 트릿과 덴탈 간식으로 씹는 재미를 묶었어요",
        mood: "snack",
        folders: ["id_treat_chicken", "id_treat_duck", "soopa_dental_appleblueberry", "yora_reward_treat"],
        href: "/products?category=food",
    },
    {
        slug: "paw-care",
        title: "산책 후 발바닥 케어 세트",
        subtitle: "발세정, 발비누, 샴푸, 미스트까지 귀가 루틴 완성",
        mood: "care",
        folders: ["fumble_footcleanser_200ml", "fumble_footsoap_calamine_2", "fumble_shampoo_laurel", "perity_aloe_essence"],
        href: "/products?category=care",
    },
    {
        slug: "brain-play",
        title: "심심풀이 노즈워크 세트",
        subtitle: "느린 급식과 움직이는 장난감으로 에너지 풀기",
        mood: "play",
        folders: ["ip_slowdog", "ip_trovbiz_puppy", "ip_trovbiz_nightday", "ip_trovbiz_adventure"],
        href: "/products?category=toy",
    },
    {
        slug: "car-travel",
        title: "차량 이동 안심 세트",
        subtitle: "카시트, 안전 하네스, 캐리어로 이동 스트레스 줄이기",
        mood: "travel",
        folders: ["rw_loadup_harness_24", "aff_carseat_donutkit_l", "aff_carseat_sugarwing", "rw_hitchhiker_carrier"],
        href: "/products?q=카시트",
    },
    {
        slug: "goggle-outdoor",
        title: "눈 보호 아웃도어 세트",
        subtitle: "강한 햇빛과 바람이 있는 날을 위한 보호 조합",
        mood: "walk",
        folders: ["rs_v2_black", "rs_lens_v2", "rw_hiandlight_harness_26", "rw_leash_hiandlight_24"],
        href: "/products?q=눈 보호",
    },
];

function byFolder(folder: string) {
    return CATALOG.find((product) => product.folder === folder);
}

function bundleProducts(bundle: Bundle) {
    return bundle.folders.map(byFolder).filter(Boolean) as CatalogProduct[];
}

function bundlePrice(products: CatalogProduct[]) {
    return products.reduce((sum, product) => sum + product.price, 0);
}

export default function SpecialBundles() {
    return (
        <section id="special-bundles" className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <header className="mb-5 flex items-end justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-indigo-700">기획전</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-950">댕다방 묶음 추천</h2>
                </div>
                <Link href="/products?sort=popular" className="text-sm font-black text-indigo-700 hover:text-indigo-900">
                    전체 구성 보기
                </Link>
            </header>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {BUNDLES.map((bundle) => {
                    const products = bundleProducts(bundle);
                    const total = bundlePrice(products);
                    const displayPrice = Math.round(total * 0.94 / 100) * 100;
                    return (
                        <Link key={bundle.slug} href={bundle.href} className={`bundle-card bundle-card-${bundle.mood}`}>
                            <div className="bundle-media">
                                {products.slice(0, 4).map((product, index) => (
                                    <span key={product.id} className={`bundle-image bundle-image-${index + 1}`}>
                                        {product.image && (
                                            <Image
                                                src={versionProductImage(product.image)}
                                                alt=""
                                                fill
                                                sizes="120px"
                                                className="object-cover"
                                            />
                                        )}
                                    </span>
                                ))}
                                {bundle.mood === "snack" && <span className="bundle-crunch">아그작</span>}
                            </div>
                            <div className="p-4">
                                <span className="inline-flex rounded-full bg-neutral-950 px-2.5 py-1 text-[11px] font-black text-white">
                                    {products.length}종 묶음
                                </span>
                                <h3 className="mt-3 text-lg font-black leading-6 text-neutral-950">{bundle.title}</h3>
                                <p className="mt-2 min-h-10 text-sm font-bold leading-5 text-neutral-600">{bundle.subtitle}</p>
                                <div className="mt-4 flex items-end justify-between gap-3">
                                    <span className="text-xs font-black text-rose-600">세트가</span>
                                    <span className="text-xl font-black text-neutral-950">{formatKRW(displayPrice)}원~</span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
