import generatedDetailContent from "./product-detail-content.generated.json" with { type: "json" };

export interface ProductDetailContent {
    summary: string;
    features: readonly string[];
    specs?: readonly string[];
    specifications?: readonly string[];
    composition?: readonly string[];
    usage?: readonly string[];
    care?: string | readonly string[];
    cautions?: readonly string[];
    safety?: string;
    sourceUrl: string;
    sourceTitle?: string;
    sourceLabel?: string;
}

const GENERATED_DETAIL_CONTENT = generatedDetailContent as Readonly<Record<string, ProductDetailContent>>;

const RUFFWEAR_2026_DETAIL_CONTENT: Readonly<Record<string, ProductDetailContent>> = {
    rw_backtrak_evac_kit: {
        summary: "응급 상황에서 다치거나 아픈 반려견을 보호자가 앞이나 뒤로 옮길 수 있도록 설계된 대피 키트입니다. 응급용 입마개와 반려견 운반 슬링이 결합된 보호자용 베스트가 한 세트로 구성됩니다.",
        features: ["앞·뒤 두 방향 운반", "직관적인 색상 구분 조절 스트랩", "전면 메시 포켓에 접어 보관"],
        specs: ["반려견 가슴둘레 기준 S 56–69cm, M 69–81cm, L 81–91cm", "보호자 가슴 스트랩 최대 170cm, 허리 스트랩 최대 200cm"],
        care: "중성세제로 손세탁한 뒤 자연 건조하세요.",
        sourceUrl: "https://ruffwear.com/products/backtrak-evac-kit",
    },
    rw_doubletrack_coupler: {
        summary: "하나의 리드줄을 두 마리 산책용으로 바꿔 주는 커플러입니다. 신축성 있는 웨빙이 충격을 흡수하고, 회전·잠금식 Crux Clip™이 줄 꼬임을 줄여 줍니다.",
        features: ["두 마리 동시 산책 연결", "충격을 흡수하는 Wavelength™ 웨빙", "회전·잠금식 알루미늄 클립"],
        specs: ["한쪽 길이 30–48cm"],
        care: "중성세제로 손세탁한 뒤 자연 건조하세요.",
        sourceUrl: "https://ruffwear.com/products/double-track-coupler",
    },
    rw_knotahitch: {
        summary: "캠핑 중 반려견이 리드줄에 연결된 상태로 주변을 움직일 수 있게 하는 히칭 시스템입니다. 두 나무 사이 또는 하나의 기둥에 설치할 수 있습니다.",
        features: ["클라이밍 방식의 간편한 장력 조절", "줄 꼬임을 줄이는 회전 카라비너", "반사 로프와 일체형 보관 가방"],
        specs: ["로프 길이 8.7m", "보관 가방 16 × 18.5 × 5cm"],
        safety: "목줄이 아닌 하네스에만 연결해 사용하세요.",
        sourceUrl: "https://ruffwear.com/products/knot-a-hitch",
    },
    rw_trailrunner_vest: {
        summary: "러닝 중 반려견이 물과 필수품을 안정적으로 나를 수 있는 경량 러닝 베스트입니다. 통기성과 균형을 고려한 구조로 흔들림을 줄였습니다.",
        features: ["양쪽 지퍼 포켓과 소프트 플라스크 2개 포함", "상단 소형 지퍼 포켓", "후면 강화 웨빙 리드 연결점"],
        specs: ["용량 XS 0.8L, S 1.1L, M 1.2L, L/XL 1.3L"],
        care: "중성세제로 손세탁한 뒤 자연 건조하세요.",
        sourceUrl: "https://ruffwear.com/products/trail-runner-vest",
    },
    rw_gourdo_small: {
        summary: "천연 라텍스 고무와 로프 손잡이를 결합한 인터랙티브 장난감입니다. 당기기와 던지기 놀이에 쓰기 좋고, 표면 질감은 잇몸 자극을 고려했습니다.",
        features: ["멀리 던지고 당기기 쉬운 로프 손잡이", "천연 라텍스 고무", "잇몸을 고려한 질감 표면"],
        specs: ["Small 4 × 13cm"],
        care: "중성세제로 손세탁한 뒤 자연 건조하세요.",
        safety: "보호자가 지켜보는 동안 사용하고, 일부가 느슨해지거나 떨어지면 즉시 폐기하세요.",
        sourceUrl: "https://ruffwear.com/products/gourdo-rubber-throw-toy",
    },
    rw_gourdo_large: {
        summary: "천연 라텍스 고무와 로프 손잡이를 결합한 인터랙티브 장난감입니다. 당기기와 던지기 놀이에 쓰기 좋고, 표면 질감은 잇몸 자극을 고려했습니다.",
        features: ["멀리 던지고 당기기 쉬운 로프 손잡이", "천연 라텍스 고무", "잇몸을 고려한 질감 표면"],
        specs: ["Large 6 × 20cm"],
        care: "중성세제로 손세탁한 뒤 자연 건조하세요.",
        safety: "보호자가 지켜보는 동안 사용하고, 일부가 느슨해지거나 떨어지면 즉시 폐기하세요.",
        sourceUrl: "https://ruffwear.com/products/gourdo-rubber-throw-toy",
    },
    rw_pacificring_toy: {
        summary: "던지기·물어오기·당기기 놀이를 함께 할 수 있는 링 형태의 인터랙티브 장난감입니다. 고강도 로프와 접을 수 있는 유연한 형태로 만들었습니다.",
        features: ["플라잉·페치·터그 다목적 설계", "Dual Shield™ 고강도 로프", "접어서 휴대하기 쉬운 구조"],
        specs: ["지름 27cm"],
        care: "중성세제로 손세탁한 뒤 자연 건조하세요.",
        safety: "보호자가 지켜보는 동안 사용하고, 일부가 느슨해지거나 떨어지면 즉시 폐기하세요.",
        sourceUrl: "https://ruffwear.com/products/pacific-ring-rope-dog-toy",
    },
    rw_powderhound_waterproof_jacket_26fw: {
        summary: "비·눈·바람이 부는 추운 날씨를 위한 방수·방풍 인슐레이티드 재킷입니다. 등과 배의 고로프트 충전재가 체온을 지키고, 관절형 StormSleeves™가 움직임을 방해하지 않도록 설계됐습니다.",
        features: ["10,000mm 방수 립스톱 외피", "재활용 폴리에스터 250g 충전재", "가슴·등 하네스 리드 포털과 반사 디테일"],
        specs: ["가슴둘레 기준 XXS 33–43cm부터 XL 91–107cm"],
        care: "찬물 약코스로 세탁하고 걸어서 건조하세요. 표백·다림질·드라이클리닝은 피하세요.",
        sourceUrl: "https://ruffwear.com/products/powder-hound-jacket",
    },
    rw_powderhound_coverall_26fw: {
        summary: "가슴과 앞·뒷다리까지 넓게 덮는 방수·방풍 인슐레이티드 커버올입니다. 신축성 있는 관절형 소매와 가슴 지퍼가 보온성과 자연스러운 움직임을 함께 고려합니다.",
        features: ["앞·뒷다리를 포함한 풀 커버 실루엣", "10,000mm 방수 외피와 250g 재활용 충전재", "목·꼬리 쪽 미세조절 조임 장치"],
        specs: ["가슴둘레 기준 XXS 33–43cm부터 XL 91–107cm"],
        care: "찬물 약코스로 세탁하고 걸어서 건조하세요. 표백·다림질·드라이클리닝은 피하세요.",
        sourceUrl: "https://ruffwear.com/products/powder-hound-coverall",
    },
    rw_timberline_fuse_vest_26fw: {
        summary: "중간 두께 플리스 보온 베스트와 하네스를 하나로 결합한 제품입니다. 측면 버클로 입고 벗기 쉽고, 앞·뒤 두 곳의 리드 연결점과 신축성 있는 다리 고리가 안정적인 착용을 돕습니다.",
        features: ["내장형 하네스와 두 개의 리드 연결점", "중간 파일 폴리에스터 플리스", "앞·뒤 안전등 루프와 반사 디테일"],
        specs: ["가슴둘레 기준 XXS 33–43cm부터 XL 91–107cm"],
        care: "찬물 약코스로 세탁하고 걸어서 건조하세요. 표백·다림질·드라이클리닝은 피하세요.",
        sourceUrl: "https://ruffwear.com/products/timberline-fuse-fleece-vest",
    },
    rw_mt_hoodie_gaiter_26fw: {
        summary: "플리스 면과 가벼운 폴리에스터 면을 뒤집어 쓸 수 있는 넥 게이터입니다. 조임 장치로 목 둘레를 맞추거나 귀까지 덮는 후드로 바꿀 수 있습니다.",
        features: ["보온 플리스·방풍 폴리에스터 양면 구조", "게이터에서 후드로 바꾸는 조임 장치", "저조도 반사 디테일"],
        specs: ["목둘레 XXS/XS 28–38cm, S/M 38–51cm, L/XL 51–69cm"],
        care: "찬물 약코스로 세탁하고 걸어서 건조하세요. 표백·다림질·드라이클리닝은 피하세요.",
        sourceUrl: "https://ruffwear.com/products/mt-hoodie-warming-neck-gaiter",
    },
    rw_lumenglow_jacket_26fw: {
        summary: "낮과 밤의 시인성을 높이기 위한 고대비 컬러와 반사 디테일을 적용한 베스트입니다. 날씨와 마찰에 강한 외피가 수풀과 나뭇가지 환경에서 몸통을 보호합니다.",
        features: ["고시인성·고대비 컬러 블로킹", "내후·내마모 600D 폴리에스터 외피", "앞·뒤 안전등 루프와 하네스 리드 포털"],
        specs: ["가슴둘레 기준 XXS 33–43cm부터 XL 91–107cm"],
        care: "찬물 약코스로 세탁하고 걸어서 건조하세요. 표백·다림질·드라이클리닝은 피하세요.",
        sourceUrl: "https://ruffwear.com/products/lumenglow-high-vis-vest",
    },
    rw_polartrex_boots_26fw: {
        summary: "눈·얼음·추위와 제설제 환경에서 발을 보호하는 겨울용 부츠입니다. 방수·방풍 소프트셸 갑피와 유리섬유 러그가 들어간 겨울 전용 밑창이 미끄러운 노면의 접지력을 돕습니다.",
        features: ["눈 유입을 줄이는 신축 게이터", "방수·방풍 소프트셸 갑피", "유리섬유 마이크로 클리트 효과의 겨울용 밑창"],
        specs: ["2개 1세트", "체중을 실은 발의 가장 넓은 폭을 재고 앞·뒤 발을 각각 확인"],
        care: "중성세제로 손세탁한 뒤 자연 건조하세요.",
        safety: "겨울 전용 유리섬유 러그가 있는 제품이므로 실외에서 사용하세요.",
        sourceUrl: "https://ruffwear.com/products/polar-trex-winter-dog-boots",
    },
    rw_rogue_longline_26fw: {
        summary: "리콜 훈련과 필드워크, 느슨한 줄 산책을 위한 6.1m 롱 라인입니다. 손잡이가 없어 지면에서 걸림을 줄이고, 잠금식 카라비너로 안정적인 연결을 제공합니다.",
        features: ["가볍고 내구성 있는 Tubelok™ 웨빙", "잠금식 6061-T6 알루미늄 카라비너", "걸림을 줄인 핸들리스 디자인"],
        specs: ["길이 6.1m, 폭 20mm"],
        care: "중성세제로 손세탁한 뒤 자연 건조하세요.",
        sourceUrl: "https://ruffwear.com/products/rogue-long-line-leash",
    },
    rw_remix_cactus_tug_26fw: {
        summary: "평평한 웨빙을 입체적인 선인장 형태로 구성한 터그·토스 장난감입니다. 생산 후 남은 원사와 웨빙을 재활용해 만들며, 입고 시 색상 조합은 달라질 수 있습니다.",
        features: ["물고 당기기 좋은 입체 오리가미 구조", "터그와 페치용 로프 손잡이", "100% 재활용 폐기 원사 웨빙"],
        care: "중성세제로 손세탁한 뒤 자연 건조하세요.",
        safety: "부드럽게 무는 반려견용입니다. 보호자가 지켜보는 동안 사용하고 손상되면 즉시 폐기하세요.",
        sourceUrl: "https://ruffwear.com/products/webbing-remix-cactus-tug-toy",
    },
    rw_remix_soft_disc_26fw: {
        summary: "육상 페치 놀이를 위한 가볍고 유연한 소프트 플라잉 디스크입니다. 잇몸과 치아에 부담을 덜 주는 부드러운 구조이며, 남은 소재와 웨빙을 재활용해 색상 조합이 달라질 수 있습니다.",
        features: ["치아와 잇몸을 고려한 부드러운 구조", "중거리 비행과 간편한 접이식 휴대", "100% 재활용 잉여 폴리에스터 소재"],
        specs: ["지름 22cm"],
        care: "중성세제로 손세탁한 뒤 자연 건조하세요.",
        safety: "부드럽게 무는 반려견용입니다. 보호자가 지켜보는 동안 사용하고 손상되면 즉시 폐기하세요.",
        sourceUrl: "https://ruffwear.com/products/webbing-remix-soft-flying-disc",
    },
};

export const RUFFWEAR_2026_DETAIL_FOLDERS = Object.freeze(Object.keys(RUFFWEAR_2026_DETAIL_CONTENT));

export function getProductDetailContent(folder?: string): ProductDetailContent | undefined {
    if (!folder) return undefined;
    return GENERATED_DETAIL_CONTENT[folder] ?? RUFFWEAR_2026_DETAIL_CONTENT[folder];
}
