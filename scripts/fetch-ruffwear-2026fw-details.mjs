import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_ASSETS = path.join(ROOT, "public", "images", "products", "catalog");

const products = [
    {
        folder: "rw_backtrak_evac_kit",
        handle: "backtrak-evac-kit",
        images: [1, 2, 5, 7, 8],
        title: "BackTrak™ 도그 응급 대피 키트",
        tagline: "예상치 못한 상황에서 반려견의 안전한 이동을 돕는 비상 키트",
        bullets: [
            "경량 응급용 입마개와 반려견 운반 슬링이 내장된 휴먼 베스트 구성",
            "반려견과 사람 체형에 맞추는 다중 조절 포인트와 색상 구분 스트랩",
            "상황에 따라 반려견을 몸의 앞쪽 또는 뒤쪽으로 운반 가능",
        ],
        specs: [
            "반려견 가슴둘레를 기준으로 사이즈 선택",
            "휴먼 베스트 가슴 스트랩 최대 170cm · 허리 스트랩 최대 200cm",
        ],
    },
    {
        folder: "rw_doubletrack_coupler",
        handle: "double-track-coupler",
        images: [1, 2],
        title: "Double Track™ 커플러",
        tagline: "하나의 리드줄로 두 마리를 편안하게 연결하는 2견용 어댑터",
        bullets: [
            "Wavelength™ 신축 웨빙이 갑작스러운 당김과 충격을 흡수",
            "회전형 잠금 Crux Clip™이 연결을 단단히 유지하고 줄 꼬임을 완화",
            "탄성 수명을 개선한 최신 Wavelength™ 웨빙 적용",
        ],
        specs: ["한쪽 길이 30~48cm"],
    },
    {
        folder: "rw_knotahitch",
        handle: "knot-a-hitch",
        images: [1, 2, 5, 6, 7],
        title: "Knot-a-Hitch™ 캠핑 테더 시스템",
        tagline: "클라이밍 장비에서 영감을 얻은 캠핑용 반려견 연결 시스템",
        bullets: [
            "두 나무 사이 또는 하나의 고정 지점에 설치하는 커맨틀 로프",
            "러프웨어 전용 하드웨어와 간편한 장력 조절 구조",
            "캠핑장에서 리드줄을 유지하면서 반려견에게 활동 범위를 제공",
        ],
        specs: [
            "로프 길이 8.7m · 수납 가방 16 × 18.5 × 5cm · 무게 14.4oz",
            "안전을 위해 목줄이 아닌 하네스에만 연결",
        ],
    },
    {
        folder: "rw_trailrunner_vest",
        handle: "trail-runner-vest",
        images: [3, 4, 5, 6, 8],
        title: "Trail Runner™ 도그 러닝 베스트",
        tagline: "반려견이 러닝 중 필요한 물을 균형 있게 휴대하는 하이드레이션 베스트",
        bullets: [
            "통기성과 균형을 고려해 흔들림을 줄인 러닝 전용 설계",
            "동봉된 Hydrapak® 소프트 플라스크 2개를 넣는 측면 지퍼 포켓",
            "상단 수납 포켓과 리드를 연결할 수 있는 후면 강화 웨빙 루프",
        ],
        specs: ["용량 XS 0.8L · S 1.1L · M 1.2L · L/XL 1.3L"],
    },
    {
        folder: "rw_gourdo_small",
        handle: "gourdo-rubber-throw-toy",
        images: [2, 3, 4, 10, 11],
        title: "Gourdo™ 고무 토이 S",
        tagline: "당기기와 던지기 놀이를 함께 즐기는 천연 라텍스 고무 장난감",
        bullets: [
            "물고 당기는 놀이와 리트리빙에 적합한 내구성 있는 천연 라텍스 고무",
            "던지고 집기 쉬운 커맨틀 로프 손잡이",
            "더 즐거운 촉감을 위해 고무 벽 두께를 개선한 최신 사양",
        ],
        specs: ["보호자와 함께하는 상호작용용 장난감 · 놀이 중 감독 권장"],
    },
    {
        folder: "rw_gourdo_large",
        handle: "gourdo-rubber-throw-toy",
        images: [2, 3, 4, 10, 11],
        title: "Gourdo™ 고무 토이 L",
        tagline: "당기기와 던지기 놀이를 함께 즐기는 천연 라텍스 고무 장난감",
        bullets: [
            "물고 당기는 놀이와 리트리빙에 적합한 내구성 있는 천연 라텍스 고무",
            "던지고 집기 쉬운 커맨틀 로프 손잡이",
            "더 즐거운 촉감을 위해 고무 벽 두께를 개선한 최신 사양",
        ],
        specs: ["보호자와 함께하는 상호작용용 장난감 · 놀이 중 감독 권장"],
    },
    {
        folder: "rw_pacificring_toy",
        handle: "pacific-ring-rope-dog-toy",
        images: [3, 4, 5, 6],
        title: "Pacific Ring™ 로프 토이",
        tagline: "터그와 리트리빙, 비행 놀이를 모두 즐길 수 있는 유연한 링 토이",
        bullets: [
            "강도가 높은 로프 소재로 만든 탄탄한 터그 구조",
            "던져서 물어오는 놀이에 적합한 유연하고 비행하기 쉬운 형태",
            "보호자와 반려견의 상호작용을 위해 설계",
        ],
        specs: ["지름 27cm · 놀이 중 감독 권장"],
    },
    {
        folder: "rw_powderhound_waterproof_jacket_26fw",
        handle: "powder-hound-jacket",
        images: [2, 3, 5, 16, 17],
        title: "Powder Hound™ 방수 보온 재킷",
        tagline: "비와 눈, 바람이 부는 추운 환경에서 체온을 지켜주는 액티브 재킷",
        bullets: [
            "방수·방풍 쉘과 등·복부의 하이로프트 충전재로 중심 체온 유지",
            "전장 지퍼와 관절형 StormSleeves™로 보온성과 움직임을 함께 확보",
            "가슴·등 리드 포털, 반사 포인트, Beacon™ 라이트 연결 루프",
        ],
        specs: ["활동적인 겨울 산책과 아웃도어 환경을 위한 전신 커버형 재킷"],
    },
    {
        folder: "rw_powderhound_coverall_26fw",
        handle: "powder-hound-coverall",
        images: [1, 2, 3, 4, 11],
        title: "Powder Hound™ 방수 보온 커버올",
        tagline: "젖고 춥고 바람 부는 겨울에 몸 전체를 폭넓게 보호하는 커버올",
        bullets: [
            "방수·방풍 쉘과 하이로프트 재생 폴리에스터 충전재",
            "관절형 스트레치 StormSleeves™와 가슴 지퍼로 자연스러운 움직임 지원",
            "목·꼬리 조절 스트링, 하네스용 리드 포털, 반사 포인트와 라이트 루프",
        ],
        specs: ["높은 보온성과 전신 커버가 필요한 겨울 활동용"],
    },
    {
        folder: "rw_timberline_fuse_vest_26fw",
        handle: "timberline-fuse-fleece-vest",
        images: [2, 3, 4, 11, 12, 18, 19],
        title: "Timberline Fuse™ 플리스 베스트",
        tagline: "포근한 플리스와 하네스를 하나로 결합한 간편한 보온 베스트",
        bullets: [
            "선선하거나 추운 날씨에 적합한 부드러운 미디엄 파일 폴리에스터 플리스",
            "측면 버클로 빠르게 착용하고 두 개의 리드 연결 지점으로 견고하게 연결",
            "움직임을 방해하지 않는 스트레치 레그 루프와 반사 포인트",
        ],
        specs: ["가슴과 등에 Beacon™ 라이트 연결 루프 2개"],
    },
    {
        folder: "rw_mt_hoodie_gaiter_26fw",
        handle: "mt-hoodie-warming-neck-gaiter",
        images: [1, 2, 3, 5, 17, 18],
        title: "Mt. Hoodie™ 보온 넥 게이터",
        tagline: "목과 귀 주변에 보온층을 더하는 양면형 넥 게이터",
        bullets: [
            "한쪽은 부드러운 재생 플리스, 반대쪽은 바람을 막는 경량 폴리에스터",
            "조절 스트링으로 찬 공기를 막고 귀를 덮는 후드 형태로 전환",
            "단독 착용 또는 기존 의류 위 레이어링이 가능한 모듈형 설계",
        ],
        specs: ["어두운 환경에서 시인성을 높이는 반사 포인트"],
    },
    {
        folder: "rw_lumenglow_jacket_26fw",
        handle: "lumenglow-high-vis-vest",
        images: [1, 2, 3, 6, 9, 12],
        title: "Lumenglow™ 하이비스 베스트",
        tagline: "낮과 밤 모두에서 눈에 잘 띄도록 설계한 고시인성 보호 베스트",
        bullets: [
            "고대비 컬러 블로킹과 넓은 반사 포인트, Beacon™ 라이트 루프 2개",
            "덤불과 마찰, 날씨 변화에 견디는 내후성·내마모성 쉘",
            "측면 버클과 등 리드 포털로 대부분의 하네스 위에 빠르게 착용",
        ],
        specs: ["24시간 시인성과 가벼운 외부 보호가 필요한 산책용"],
    },
    {
        folder: "rw_polartrex_boots_26fw",
        handle: "polar-trex-winter-dog-boots",
        images: [1, 2, 3, 4],
        title: "Polar Trex™ 윈터 도그 부츠",
        tagline: "눈과 얼음, 추위와 제설제로부터 발을 보호하는 겨울 전용 부츠",
        bullets: [
            "방수·방풍 소프트쉘 어퍼와 눈 유입을 줄이는 스트레치 게이터",
            "유리섬유 러그를 적용한 겨울 전용 아웃솔로 빙판과 눈길 접지력 강화",
            "후크앤루프 잠금과 반사 트림으로 착용 안정성과 시인성 확보",
        ],
        specs: [
            "2개 1세트 · 앞발과 뒷발 크기가 다르면 각각 맞는 사이즈 선택",
            "유리섬유 러그 특성상 실외 활동용으로 사용",
        ],
    },
    {
        folder: "rw_rogue_longline_26fw",
        handle: "rogue-long-line-leash",
        images: [1, 2, 3],
        title: "Rogue™ 롱라인 리드줄",
        tagline: "훈련과 필드 활동에서 반려견의 활동 범위를 넓혀주는 20피트 롱라인",
        bullets: [
            "리콜 훈련, 느슨한 리드 워킹, 필드워크를 위한 넉넉한 길이",
            "가벼운 Tubelok™ 웨빙과 잠금형 카라비너로 안정적인 연결",
            "걸리거나 엉킬 수 있는 손잡이가 없는 드래그 라인 구조",
        ],
        specs: ["길이 6.1m · 폭 20mm"],
    },
    {
        folder: "rw_remix_cactus_tug_26fw",
        handle: "webbing-remix-cactus-tug-toy",
        images: [1, 2],
        title: "Remix™ Cactus 터그 토이",
        tagline: "평면 웨빙을 입체적인 선인장 형태로 재구성한 터그·리트리빙 토이",
        bullets: [
            "눈사태 구조팀의 피드백을 반영해 물고 당기기 쉬운 형태로 설계",
            "터그, 던지기, 리트리빙 놀이에 적합한 로프 코어 구조",
            "생산 잔여 원사를 재활용해 제품마다 색상 조합이 달라지는 Surprise 컬러",
        ],
        specs: ["부드러운 씹기 성향용 · 놀이 중 감독 권장"],
    },
    {
        folder: "rw_remix_soft_disc_26fw",
        handle: "webbing-remix-soft-flying-disc",
        images: [1, 2],
        title: "Remix™ 소프트 플라잉 디스크",
        tagline: "잇몸과 치아에 부담을 줄인 가볍고 유연한 리트리빙 디스크",
        bullets: [
            "육상 리트리빙 놀이를 위한 가볍고 유연한 플라잉 디스크",
            "부드러운 구조로 디스크 놀이를 처음 배우는 반려견에게도 적합",
            "생산 잔여 웨빙과 소재를 활용해 제품마다 색상이 달라지는 Surprise 컬러",
        ],
        specs: ["지름 22cm · 부드러운 씹기 성향용 · 놀이 중 감독 권장"],
    },
];

function escapeXml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function wrapText(value, maxLength) {
    const words = value.trim().split(/\s+/);
    const lines = [];
    let current = "";
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maxLength && current) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) lines.push(current);
    return lines;
}

function renderIntroCard(product) {
    const titleLines = wrapText(product.title, 24);
    const taglineLines = wrapText(product.tagline, 34);
    const bulletLines = product.bullets.map((bullet) => wrapText(bullet, 37));
    const specLines = product.specs.map((spec) => wrapText(spec, 42));

    const titleHeight = titleLines.length * 72;
    const taglineHeight = taglineLines.length * 48;
    const bulletHeight = bulletLines.reduce((total, lines) => total + lines.length * 44 + 28, 0);
    const specHeight = specLines.reduce((total, lines) => total + lines.length * 40 + 18, 0);
    const height = 185 + titleHeight + taglineHeight + 95 + bulletHeight + 80 + specHeight + 165;

    const elements = [];
    elements.push(`<rect width="1200" height="${height}" fill="#f6f4ef"/>`);
    elements.push('<rect x="0" y="0" width="1200" height="18" fill="#e0523e"/>');
    elements.push('<text x="88" y="100" font-family="Arial, Malgun Gothic, sans-serif" font-size="26" font-weight="800" letter-spacing="4" fill="#e0523e">RUFFWEAR · PRODUCT GUIDE</text>');

    let y = 180;
    for (const line of titleLines) {
        elements.push(`<text x="88" y="${y}" font-family="Malgun Gothic, Arial, sans-serif" font-size="58" font-weight="900" fill="#171717">${escapeXml(line)}</text>`);
        y += 72;
    }
    y += 14;
    for (const line of taglineLines) {
        elements.push(`<text x="88" y="${y}" font-family="Malgun Gothic, Arial, sans-serif" font-size="31" font-weight="700" fill="#55534f">${escapeXml(line)}</text>`);
        y += 48;
    }

    y += 62;
    elements.push(`<text x="88" y="${y}" font-family="Arial, Malgun Gothic, sans-serif" font-size="23" font-weight="900" letter-spacing="3" fill="#77736c">KEY FEATURES</text>`);
    y += 58;
    for (const lines of bulletLines) {
        elements.push(`<circle cx="101" cy="${y - 10}" r="7" fill="#e0523e"/>`);
        for (const line of lines) {
            elements.push(`<text x="132" y="${y}" font-family="Malgun Gothic, Arial, sans-serif" font-size="29" font-weight="700" fill="#282725">${escapeXml(line)}</text>`);
            y += 44;
        }
        y += 28;
    }

    y += 18;
    const boxTop = y;
    const boxHeight = 64 + specHeight;
    elements.push(`<rect x="72" y="${boxTop}" width="1056" height="${boxHeight}" rx="28" fill="#e9e5dc"/>`);
    y += 50;
    elements.push(`<text x="112" y="${y}" font-family="Malgun Gothic, Arial, sans-serif" font-size="24" font-weight="900" fill="#4e4b45">제품 정보</text>`);
    y += 48;
    for (const lines of specLines) {
        for (const line of lines) {
            elements.push(`<text x="112" y="${y}" font-family="Malgun Gothic, Arial, sans-serif" font-size="27" font-weight="700" fill="#282725">· ${escapeXml(line)}</text>`);
            y += 40;
        }
        y += 18;
    }

    elements.push(`<text x="88" y="${height - 74}" font-family="Malgun Gothic, Arial, sans-serif" font-size="21" font-weight="600" fill="#77736c">출처: Ruffwear 공식 상품 정보 · 국내 판매 옵션: 2026FW 공급사 자료</text>`);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}">${elements.join("")}</svg>`;
}

async function fetchProduct(handle) {
    const response = await fetch(`https://ruffwear.com/products/${handle}.js`);
    if (!response.ok) {
        throw new Error(`Ruffwear product feed failed (${response.status}): ${handle}`);
    }
    return response.json();
}

async function fetchImage(url) {
    const normalized = url.startsWith("//") ? `https:${url}` : url;
    const response = await fetch(normalized);
    if (!response.ok) {
        throw new Error(`Ruffwear image failed (${response.status}): ${normalized}`);
    }
    return Buffer.from(await response.arrayBuffer());
}

for (const product of products) {
    const destination = path.join(CATALOG_ASSETS, product.folder, "details");
    await mkdir(destination, { recursive: true });

    const intro = renderIntroCard(product);
    await sharp(Buffer.from(intro))
        .webp({ quality: 90, effort: 6 })
        .toFile(path.join(destination, "1.webp"));

    const official = await fetchProduct(product.handle);
    for (let index = 0; index < product.images.length; index += 1) {
        const sourceIndex = product.images[index];
        const sourceUrl = official.images[sourceIndex];
        if (!sourceUrl) {
            throw new Error(`Missing official image index ${sourceIndex}: ${product.handle}`);
        }
        const input = await fetchImage(sourceUrl);
        await sharp(input, { limitInputPixels: false })
            .resize({ width: 1400, height: 1800, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 84, effort: 5 })
            .toFile(path.join(destination, `${index + 2}.webp`));
    }
    console.log(`${product.folder}: ${product.images.length + 1} detail images`);
}
