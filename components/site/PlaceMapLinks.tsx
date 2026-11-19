"use client";

import { useI18n } from "@/lib/i18n";
import { useCareTalkCopy } from "@/hooks/useCareTalkCopy";
import { placeDisplayAddress, placeDisplayName } from "@/lib/place-labels";
import { placeAddress, placeMapLinks, type MapPlace } from "@/lib/place-map-links";

export function PlaceAddressLink({ place }: { place: MapPlace }) {
    const { locale } = useI18n();
    const copy = useCareTalkCopy();
    return <a href={placeMapLinks(place).kakao} target="_blank" rel="noopener noreferrer" className="break-words text-indigo-700 underline decoration-indigo-200 underline-offset-2" aria-label={locale === "en" ? `Find ${placeDisplayName(place.name, locale)} on the map` : `${place.name} 주소와 장소 검색`}>
        {placeDisplayAddress(placeAddress(place), locale) || copy("주소·상세 정보 찾기")}
    </a>;
}

export default function PlaceMapLinks({ place }: { place: MapPlace }) {
    const { locale } = useI18n();
    const copy = useCareTalkCopy();
    const links = placeMapLinks(place);
    return <div className="flex flex-wrap gap-1.5" data-place-map-links>
        {([
            ["카카오맵", links.kakao], ["네이버지도", links.naver], ["Google 지도", links.google],
            ...(links.position ? [["위치 보기", links.position]] : []),
        ]).map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={locale === "en" ? `${copy(label)} · ${placeDisplayName(place.name, locale)}` : `${place.name} ${label}${label === "위치 보기" ? "" : "에서 검색"}`} className="inline-flex min-h-9 items-center rounded-full border border-indigo-200 bg-white px-3 py-1 text-[11px] font-black text-indigo-800 hover:bg-indigo-50">{copy(label)}</a>)}
    </div>;
}
