/**
 * EmptyPane — 마이페이지 빈 상태 공용 컴포넌트
 */
import Link from "next/link";

interface Props {
    icon: string;
    title: string;
    desc: string;
    actionLabel?: string;
    actionHref?: string;
}

export default function EmptyPane({ icon, title, desc, actionLabel, actionHref }: Props) {
    return (
        <div className="text-center py-12 md:py-16">
            <i className={`fa-solid ${icon} text-4xl md:text-5xl text-neutral-300 mb-4`} />
            <h3 className="text-base md:text-lg font-extrabold mb-1.5">{title}</h3>
            <p className="text-sm text-neutral-500 mb-5">{desc}</p>
            {actionLabel && actionHref && (
                <Link
                    href={actionHref}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-white text-sm font-extrabold hover:bg-neutral-800 transition"
                >
                    {actionLabel}
                </Link>
            )}
        </div>
    );
}
