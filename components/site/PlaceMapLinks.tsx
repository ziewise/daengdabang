import { placeAddress, placeMapLinks, type MapPlace } from "@/lib/place-map-links";

export function PlaceAddressLink({ place }: { place: MapPlace }) {
    return <a href={placeMapLinks(place).kakao} target="_blank" rel="noopener noreferrer" className="break-words text-indigo-700 underline decoration-indigo-200 underline-offset-2" aria-label={`${place.name} 주소와 장소 검색`}>
        {placeAddress(place) || "주소·상세 정보 찾기"}
    </a>;
}

export default function PlaceMapLinks({ place }: { place: MapPlace }) {
    const links = placeMapLinks(place);
    return <div className="flex flex-wrap gap-1.5" data-place-map-links>
        {([
            ["카카오맵", links.kakao], ["네이버지도", links.naver], ["Google 지도", links.google],
            ...(links.position ? [["위치 보기", links.position]] : []),
        ]).map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${place.name} ${label}${label === "위치 보기" ? "" : "에서 검색"}`} className="inline-flex min-h-9 items-center rounded-full border border-indigo-200 bg-white px-3 py-1 text-[11px] font-black text-indigo-800 hover:bg-indigo-50">{label}</a>)}
    </div>;
}
