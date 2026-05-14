/**
 * SidePetDock — PC 좌측 여백에 등록 펫 카드 고정 노출
 * ---------------------------------------------------------------------
 * 콘텐츠 영역(max-w-[1400px])이 viewport 보다 작아 양 옆 여백이 생기는
 * PC 환경에서만 노출. 좌측 여백에 등록된 반려견들의 사진·이름을 카드로 표시.
 *
 * 노출 조건:
 *   - 화면 width 1500px+ (양 옆 여백 50px+ 확보)
 *   - 로그인 상태
 *   - 등록된 펫 1마리+ (없으면 데모용 MOCK 펫 fallback)
 *
 * 위치: 헤더 아래, 좌측 16px, 세로 중앙
 */
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePets } from "@/hooks/usePets";
import { MOCK_PETS } from "@/lib/mypage-data";

export default function SidePetDock() {
    const pathname = usePathname();
    const { isLoggedIn, hydrated } = useAuth();
    const { pets: allPets } = usePets();
    /** 히어로가 viewport 에서 벗어났는지. true 면 dock 표시 */
    const [pastHero, setPastHero] = useState(false);

    /** 페이지별 dock 표시 정책
     *  - /mypage*, /recommendations* : 항상 숨김 (자체 펫 선택 UI 가 있어 중복)
     *  - 히어로(#hero) 있는 페이지: 히어로 벗어난 후에만 표시
     *  - 그 외 페이지: 즉시 표시 */
    useEffect(() => {
        // 마이페이지·추천 페이지에서는 dock 자체 비활성
        if (pathname.startsWith("/mypage") || pathname.startsWith("/recommendations")) {
            setPastHero(false);
            return;
        }

        let observer: IntersectionObserver | null = null;
        let retry: ReturnType<typeof setTimeout> | null = null;

        const attach = () => {
            const hero = document.getElementById("hero");
            if (!hero) return false;
            observer = new IntersectionObserver(
                ([entry]) => setPastHero(!entry.isIntersecting),
            );
            observer.observe(hero);
            return true;
        };

        // 페이지 첫 진입 시: 히어로 있는 페이지 가정으로 일단 dock 숨김
        setPastHero(false);
        const found = attach();
        if (!found) {
            // 히어로가 아직 DOM 에 없거나 페이지에 히어로가 없음 → 잠시 후 재시도
            retry = setTimeout(() => {
                const foundLater = attach();
                if (!foundLater) {
                    // 히어로 없는 페이지 → dock 즉시 표시
                    setPastHero(true);
                }
            }, 150);
        }

        return () => {
            observer?.disconnect();
            if (retry) clearTimeout(retry);
        };
    }, [pathname]);

    if (!hydrated || !isLoggedIn) return null;
    if (!pastHero) return null;

    // 등록된 펫 (없으면 데모용 MOCK_PETS fallback)
    const realRegistered = allPets.filter((p) => p.source === "registered");
    const pets = realRegistered.length > 0 ? realRegistered : MOCK_PETS;
    if (pets.length === 0) return null;

    return (
        <aside
            /* 위치/크기 모두 viewport 에 자동 적응:
               - right = calc(50% + 716px) → dock 오른쪽 끝이 콘텐츠 왼쪽에서 16px 떨어진 곳
               - width = clamp(95px, 사용 가능 여백 - 16px, 160px) → 좌측 여백에 맞춰 자동 스케일
               - breakpoint 1620px+ : 최소 dock(95px) 이 들어갈 여백이 확보되는 시점부터 노출 */
            className="
                hidden
                fixed z-30
                right-[calc(50%+716px)]
                top-[calc(var(--header-height)+24px)]
                max-h-[calc(100vh-var(--header-height)-48px)]
                overflow-y-auto
                space-y-2.5
                [@media(min-width:1620px)]:block
            "
            style={{
                width: "clamp(95px, calc((100vw - 1400px) / 2 - 16px), 160px)",
            }}
            aria-label="등록된 댕댕이"
        >
            <p className="text-[10px] font-extrabold text-aurora-indigo tracking-[0.25em] uppercase text-center mb-2">
                <i className="fa-solid fa-paw mr-1" />
                My Dogs
            </p>
            {pets.map((p) => (
                <div
                    key={p.id}
                    className="group p-2.5 rounded-2xl bg-white/85 backdrop-blur-md border border-white/60 shadow-card hover:shadow-hover hover:-translate-y-0.5 transition-all"
                >
                    <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-aurora-blue to-aurora-indigo overflow-hidden flex items-center justify-center text-white text-3xl mb-2">
                        {p.avatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                            <i className="fa-solid fa-dog" />
                        )}
                    </div>
                    <p className="text-sm font-extrabold text-foreground text-center truncate">
                        {p.name || "이름 없음"}
                    </p>
                    <p className="text-[11px] text-neutral-500 text-center truncate mt-0.5">
                        {p.breed}
                    </p>
                </div>
            ))}
        </aside>
    );
}
