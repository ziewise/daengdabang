import Image from "next/image";
import Link from "next/link";
import { formatKRW } from "@/lib/catalog";
import { bundleHref, bundleImageCandidates, type Bundle } from "@/lib/bundles";

type Props = {
    bundle: Bundle;
    priority?: boolean;
};

export default function BundleCard({ bundle, priority }: Props) {
    const candidates = bundleImageCandidates(bundle).slice(0, 4);
    const videoReady = bundle.assetStatus === "ready" && Boolean(bundle.video);

    return (
        <article className="group overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Link href={bundleHref(bundle)} className="relative block aspect-[16/10] overflow-hidden bg-[#f7f2e8]">
                {candidates[0] ? (
                    <Image
                        src={candidates[0]}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 360px"
                        className={`object-cover transition duration-300 group-hover:scale-[1.03] ${videoReady ? "group-hover:opacity-0" : ""}`}
                        priority={priority}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-neutral-300">
                        <i className="fa-solid fa-gift" />
                    </div>
                )}
                {!bundle.poster && candidates.length > 1 && (
                    <div className="absolute inset-0 grid grid-cols-2 gap-1 bg-white p-1">
                        {candidates.map((src, index) => (
                            <div key={`${src}-${index}`} className="relative overflow-hidden rounded-md bg-[#f7f2e8]">
                                <Image src={src} alt="" fill sizes="160px" className="object-cover" />
                            </div>
                        ))}
                    </div>
                )}
                {videoReady && (
                    <video
                        src={bundle.video}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-300 group-hover:opacity-100"
                    />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-950/82 via-neutral-950/24 to-transparent p-3 text-white">
                    <div className="flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-neutral-950">{bundle.badge}</span>
                        <span className="rounded-full bg-neutral-950/45 px-2 py-0.5 text-[10px] font-black text-white ring-1 ring-white/20">
                            {bundle.products.length}종 세트
                        </span>
                    </div>
                </div>
            </Link>
            <div className="p-4">
                <Link href={bundleHref(bundle)} className="block">
                    <p className="text-[11px] font-black uppercase text-indigo-600">
                        {bundle.source === "ai" ? "AI SMART SET" : "CURATED SET"}
                    </p>
                    <h3 className="mt-1 min-h-[2.5rem] text-base font-black leading-5 text-neutral-950 line-clamp-2">{bundle.title}</h3>
                    <p className="mt-2 min-h-[2.5rem] text-xs font-bold leading-5 text-neutral-500 line-clamp-2">{bundle.subtitle}</p>
                </Link>
                <div className="mt-3 flex items-end justify-between gap-2">
                    <div className="text-xs font-black text-rose-600">{bundle.discountRate}% 세트가</div>
                    <div className="text-right">
                        <p className="text-[11px] text-neutral-400 line-through">{formatKRW(bundle.basePrice)}원</p>
                        <p className="text-lg font-black text-neutral-950">{formatKRW(bundle.salePrice)}원</p>
                    </div>
                </div>
            </div>
        </article>
    );
}
