import Image from "next/image";

type Props = {
    size?: number;
    className?: string;
    priority?: boolean;
};

export default function DaengLabSymbol({ size = 64, className = "", priority = false }: Props) {
    return (
        <span
            className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-[#fffefa] ${className}`.trim()}
            style={{ width: size, height: size }}
            aria-hidden="true"
            data-daenglab-symbol
        >
            <Image
                src="/images/brand/daengdabang-research-lab-symbol-nav.webp"
                alt=""
                fill
                sizes={`${size}px`}
                priority={priority}
                className="object-contain"
            />
        </span>
    );
}
