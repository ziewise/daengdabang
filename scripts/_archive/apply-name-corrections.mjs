// scripts/apply-name-corrections.mjs
// 사용자 확인: catalog 의 20개 매칭 실패 항목을 Excel 정답 표기로 정정.
// 정정 후 link-product-images.mjs 를 다시 돌리면 자동으로 이미지가 붙는다.
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, "..", "lib", "catalog.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));

const corrections = [
    { no: 9,   newName: "러프웨어 베드 베이스캠프 강아지",                                                                          newBrand: undefined },
    { no: 44,  newName: "팩트(PACKT) 1.5m 엔데버 올테란 방수리드줄",                                                              newBrand: undefined },
    { no: 115, newName: "러프웨어 방수 방풍 보온 버트 재킷 강아지",                                                                  newBrand: undefined },
    { no: 120, newName: "러프웨어 오버코트 퓨즈 하네스 콤보 재킷 강아지",                                                            newBrand: undefined },
    { no: 211, newName: "원티그리스 앞섬방지 하네스 대형견 진돗개 가슴줄 앞고리 골리앗 K9",                                          newBrand: undefined },
    { no: 230, newName: "펌블펫솝_강아지 산책미스트 바이벅비비스프레이 벌레가 싫어하는 아로마오일 150ml",                            newBrand: undefined },
    { no: 236, newName: "원티그리스 파이어워쳐K9 하네스",                                                                            newBrand: undefined },
    { no: 251, newName: "이비야야 스너글러 펫누크방석 FB2011 2컬러 복숭아 더스티블루",                                              newBrand: undefined },
    { no: 254, newName: "와우 신나라슈즈 일회용신발 소형 중형 80매(20일세트)",                                                       newBrand: undefined },
    { no: 255, newName: "와우 신나라슈즈 일회용신발 소형 중형 20매(5일세트)",                                                        newBrand: undefined },
    { no: 259, newName: "이비야야 데님펀백팩2.0 FC2131",                                                                              newBrand: undefined },
    { no: 266, newName: "이비야야 젠틀펫왜건 FS1880 2컬러 더티피치 아미그린",                                                         newBrand: undefined },
    { no: 286, newName: "펫드림하우스 리킹매트 PAD 급체방지 스트레스 해소",                                                          newBrand: "펫드림하우스" },
    { no: 287, newName: "펫드림하우스 스핀 플라잉 디스크 Lick Pad 슬로우식기 리킹매트 급체방지 스트레스해소",                       newBrand: "펫드림하우스" },
    { no: 319, newName: "인더스트리펫 트로비즈 플라잉스틱 볼런쳐",                                                                   newBrand: undefined },
    { no: 328, newName: "미티본 베지믹스 475g",                                                                                       newBrand: "미티본/미티븐" },
    { no: 329, newName: "조아루 반려동물 수제향수 - 캐시미어 인 러브 향",                                                             newBrand: undefined },
    { no: 330, newName: "조아루 반려동물 수제향수 - 아쿠아 라일락 향",                                                                newBrand: undefined },
    { no: 331, newName: "조아루 반려동물 수제향수 - 소프트 코튼 향",                                                                  newBrand: undefined },
    { no: 332, newName: "조아루 반려동물 수제향수 - 리프 프롬 데이지 향",                                                             newBrand: undefined },
];

const map = new Map(corrections.map((c) => [c.no, c]));
let updateCount = 0;

const updatedCatalog = catalog.map((c) => {
    const fix = map.get(c.no);
    if (!fix) return c;
    updateCount++;
    return {
        ...c,
        name: fix.newName,
        brandKo: fix.newBrand ?? c.brandKo,
    };
});

writeFileSync(catalogPath, JSON.stringify(updatedCatalog, null, 2), "utf-8");
console.log(`✅ ${updateCount}건 정정 완료 (catalog.json 갱신)`);
console.log();
console.log("정정 내역:");
corrections.forEach((c) => {
    console.log(`  no=${c.no}: ${c.newName.slice(0, 60)}`);
});
