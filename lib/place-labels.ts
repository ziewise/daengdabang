import { romanize } from "koroman";

const regions: Record<string, string> = {
    서울특별시: "Seoul", 서울: "Seoul", 부산광역시: "Busan", 대구광역시: "Daegu", 인천광역시: "Incheon",
    광주광역시: "Gwangju", 대전광역시: "Daejeon", 울산광역시: "Ulsan", 세종특별자치시: "Sejong",
    경기도: "Gyeonggi-do", 강원도: "Gangwon-do", 강원특별자치도: "Gangwon-do", 충청북도: "Chungcheongbuk-do",
    충청남도: "Chungcheongnam-do", 전라북도: "Jeollabuk-do", 전북특별자치도: "Jeonbuk-do", 전라남도: "Jeollanam-do",
    경상북도: "Gyeongsangbuk-do", 경상남도: "Gyeongsangnam-do", 제주특별자치도: "Jeju-do", 대한민국: "South Korea",
};
const services: Record<string, string> = {
    동물의료센터: "Animal Medical Center", 동물치과병원: "Veterinary Dental Hospital", 동물병원: "Animal Hospital",
    반려견유치원: "Dog Daycare", 강아지유치원: "Dog Daycare", 애견유치원: "Dog Daycare", 유치원: "Daycare",
    애견호텔: "Dog Hotel", 애견미용: "Dog Grooming", 그루밍: "Grooming", 스튜디오: "Studio", 호텔: "Hotel",
};
const servicePattern = new RegExp(Object.keys(services).join("|"), "g");
const suffixes: Record<string, string> = { 대로: "daero", 로: "ro", 길: "gil", 시: "si", 군: "gun", 구: "gu", 읍: "eup", 면: "myeon", 동: "dong", 리: "ri", 도: "do" };

function latin(text: string): string {
    return text.replace(/[가-힣]+/g, word => word === "댕다방" ? word : romanize(word, { casingOption: "capitalize-word" }));
}

export function placeDisplayName(name: string, locale: "ko" | "en"): string {
    if (locale === "ko" || !/[가-힣]/.test(name)) return name;
    return latin(name.replace(servicePattern, term => " " + services[term] + " ")).replace(/\s+/g, " ").trim();
}

function addressPart(part: string): string {
    if (regions[part]) return regions[part];
    const street = /^(.+?)(대로|로)(\d+)(번)?길$/.exec(part);
    if (street) return latin(street[1]) + "-" + suffixes[street[2]] + " " + street[3] + (street[4] ? "beon-gil" : "-gil");
    const unit = /^(.+?)(대로|로|길|시|군|구|읍|면|동|리|도)$/.exec(part);
    return unit ? latin(unit[1]) + "-" + suffixes[unit[2]] : latin(part);
}

export function placeDisplayAddress(address: string, locale: "ko" | "en"): string {
    if (locale === "ko" || !/[가-힣]/.test(address)) return address;
    const parts = address.trim().split(/[\s,]+/).filter(Boolean);
    const house = parts.findIndex((part, i) => i > 0 && /^\d+(?:-\d+)?$/.test(part) && /(?:로|길)$/.test(parts[i - 1]));
    if (house >= 1) {
        const street = parts[house] + ", " + addressPart(parts[house - 1]);
        const detail = parts.slice(house + 1).map(addressPart).join(" ");
        return [detail, street, ...parts.slice(0, house - 1).reverse().map(addressPart)].filter(Boolean).join(", ");
    }
    return parts.map(addressPart).join(" ");
}
