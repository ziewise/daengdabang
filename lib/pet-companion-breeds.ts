export type PetBreedFamily =
    | "toy"
    | "spaniel"
    | "hound"
    | "sighthound"
    | "terrier"
    | "retriever"
    | "herding"
    | "mountain"
    | "spitz"
    | "bully"
    | "poodle"
    | "corgi"
    | "primitive";

export type PetBreedRigId =
    | "R01" | "R02" | "R03" | "R04" | "R05" | "R06" | "R07"
    | "R08" | "R09" | "R10" | "R11" | "R12" | "R13" | "R14";

/** Legacy style lineages retained for source/reference auditing. Runtime
 * rendering uses one breed-specific core atlas per catalog ID. */
export const PET_BREED_RIG_IDS = [
    "R01", "R02", "R03", "R04", "R05", "R06", "R07",
    "R08", "R09", "R10", "R11", "R12", "R13", "R14",
] as const satisfies readonly PetBreedRigId[];

export type PetEarShape = "point" | "bat" | "button" | "rose" | "drop" | "long";
export type PetTailShape = "curl" | "plume" | "sickle" | "long" | "docked" | "bob";
export type PetMuzzleShape = "tiny" | "short" | "medium" | "long" | "square";
export type PetCoatStyle = "smooth" | "double" | "fluffy" | "long" | "curly" | "wire";
export type PetMarkingStyle = "solid" | "blaze" | "mask" | "points" | "saddle" | "patches" | "tuxedo";

export type PetBreedVisual = {
    id: string;
    en: string;
    ko: string;
    aliases: string[];
    family: PetBreedFamily;
    rigId: PetBreedRigId;
    ear: PetEarShape;
    tail: PetTailShape;
    muzzle: PetMuzzleShape;
    coat: PetCoatStyle;
    marking: PetMarkingStyle;
    primary: string;
    secondary: string;
    accent: string;
    headScale: number;
    bodyScale: number;
    bodyLength: number;
};

export type PetBreedRenderTokens = {
    primary: string;
    secondary: string;
    accent: string;
    /** A restrained colour correction that preserves the plush atlas shading. */
    filter: string;
    /** Kept deliberately subtle so walk-cycle feet stay grounded. */
    scaleX: number;
    scaleY: number;
};

type VisualSeed = Omit<PetBreedVisual, "id" | "en" | "ko" | "aliases" | "family" | "rigId">;
type BreedDefinition = [
    id: string,
    en: string,
    ko: string,
    family: PetBreedFamily,
    aliases?: string[],
    overrides?: Partial<VisualSeed>,
];

export const PET_BREED_FAMILY_LABELS: Record<PetBreedFamily, string> = {
    toy: "토이·컴패니언",
    spaniel: "스패니얼",
    hound: "하운드",
    sighthound: "사이트하운드",
    terrier: "테리어",
    retriever: "리트리버·포인터",
    herding: "목양견",
    mountain: "마운틴·대형견",
    spitz: "스피츠·설상견",
    bully: "불리·마스티프",
    poodle: "푸들·컬리",
    corgi: "로우독·코기",
    primitive: "원시견·희귀견",
};

const FAMILY_VISUALS: Record<PetBreedFamily, VisualSeed> = {
    toy: {
        ear: "drop", tail: "plume", muzzle: "tiny", coat: "fluffy", marking: "solid",
        primary: "#e9c692", secondary: "#fff0d2", accent: "#9a623c",
        headScale: 1.16, bodyScale: .78, bodyLength: .86,
    },
    spaniel: {
        ear: "long", tail: "plume", muzzle: "medium", coat: "long", marking: "patches",
        primary: "#b96e3c", secondary: "#f4dfbd", accent: "#74412b",
        headScale: 1.1, bodyScale: .88, bodyLength: .98,
    },
    hound: {
        ear: "long", tail: "long", muzzle: "long", coat: "smooth", marking: "saddle",
        primary: "#aa6940", secondary: "#f1d2a0", accent: "#4f3329",
        headScale: 1.03, bodyScale: .94, bodyLength: 1.12,
    },
    sighthound: {
        ear: "rose", tail: "long", muzzle: "long", coat: "smooth", marking: "solid",
        primary: "#cfa775", secondary: "#f5dfbd", accent: "#6e4b35",
        headScale: .98, bodyScale: .9, bodyLength: 1.18,
    },
    terrier: {
        ear: "button", tail: "docked", muzzle: "square", coat: "wire", marking: "points",
        primary: "#a8784e", secondary: "#e8d2ae", accent: "#53433a",
        headScale: 1.08, bodyScale: .85, bodyLength: .92,
    },
    retriever: {
        ear: "drop", tail: "plume", muzzle: "medium", coat: "double", marking: "solid",
        primary: "#d8a355", secondary: "#f6dfac", accent: "#765033",
        headScale: 1.05, bodyScale: 1, bodyLength: 1.08,
    },
    herding: {
        ear: "point", tail: "plume", muzzle: "medium", coat: "double", marking: "blaze",
        primary: "#81563f", secondary: "#f1e2c4", accent: "#3f3735",
        headScale: 1.05, bodyScale: .96, bodyLength: 1.02,
    },
    mountain: {
        ear: "drop", tail: "plume", muzzle: "square", coat: "fluffy", marking: "tuxedo",
        primary: "#51453f", secondary: "#f2e8d8", accent: "#b76d3d",
        headScale: 1.08, bodyScale: 1.08, bodyLength: 1.08,
    },
    spitz: {
        ear: "point", tail: "curl", muzzle: "medium", coat: "fluffy", marking: "solid",
        primary: "#f0e2c5", secondary: "#fff8e8", accent: "#9a6e46",
        headScale: 1.08, bodyScale: .94, bodyLength: .96,
    },
    bully: {
        ear: "rose", tail: "docked", muzzle: "short", coat: "smooth", marking: "blaze",
        primary: "#c99b6d", secondary: "#f2dfc1", accent: "#5d4538",
        headScale: 1.18, bodyScale: 1.02, bodyLength: .88,
    },
    poodle: {
        ear: "drop", tail: "bob", muzzle: "medium", coat: "curly", marking: "solid",
        primary: "#d89a5a", secondary: "#f3c987", accent: "#8b5535",
        headScale: 1.15, bodyScale: .86, bodyLength: .9,
    },
    corgi: {
        ear: "point", tail: "bob", muzzle: "medium", coat: "double", marking: "blaze",
        primary: "#d7853c", secondary: "#fff1d2", accent: "#7c492f",
        headScale: 1.13, bodyScale: .78, bodyLength: 1.12,
    },
    primitive: {
        ear: "point", tail: "sickle", muzzle: "medium", coat: "smooth", marking: "mask",
        primary: "#b37b4d", secondary: "#ead1aa", accent: "#4f3a30",
        headScale: 1.04, bodyScale: .94, bodyLength: 1.02,
    },
};

// Exact Stanford Dogs/PetLens 120-class catalog. Every ID resolves to its own
// breed-specific core atlas; rig lineage remains only as generation provenance.
const BREED_DEFINITIONS: BreedDefinition[] = [
    // R01 · toy/drop/silky
    ["japanese-spaniel", "Japanese Spaniel", "재패니즈 스패니얼", "toy", ["재패니즈 친", "japanese chin"], { ear: "long", coat: "long", marking: "patches", primary: "#3f3a39", secondary: "#fff5e5", accent: "#bd6c52" }],
    ["maltese-dog", "Maltese Dog", "말티즈", "toy", ["maltese"], { ear: "drop", coat: "long", marking: "solid", primary: "#f3eee3", secondary: "#fffdf5", accent: "#c7bba8" }],
    ["blenheim-spaniel", "Blenheim Spaniel", "블레넘 스패니얼", "spaniel", ["킹 찰스 스패니얼", "king charles spaniel", "cavalier king charles spaniel"], { ear: "long", coat: "long", marking: "patches", primary: "#b76738", secondary: "#fff2dc", accent: "#703a29" }],
    ["lhasa", "Lhasa", "라사압소", "toy", ["lhasa apso"], { ear: "long", coat: "long", primary: "#d3ad78", secondary: "#f6e4bf", accent: "#74533c" }],

    // R02 · toy/prick/fluffy
    ["chihuahua", "Chihuahua", "치와와", "toy", [], { ear: "point", tail: "sickle", coat: "smooth", muzzle: "tiny", primary: "#d8a26c", secondary: "#f8dfb5", accent: "#6f4934", headScale: 1.23 }],
    ["papillon", "Papillon", "파피용", "toy", ["빠삐용"], { ear: "bat", tail: "plume", coat: "long", marking: "patches", primary: "#4d403c", secondary: "#fff1d7", accent: "#bd6e47" }],
    ["toy-terrier", "Toy Terrier", "토이 테리어", "toy", [], { ear: "point", tail: "docked", coat: "smooth", marking: "points", primary: "#3d3634", secondary: "#c07a49", accent: "#211e1d" }],
    ["yorkshire-terrier", "Yorkshire Terrier", "요크셔 테리어", "toy", ["요키", "yorkie"], { ear: "point", tail: "docked", coat: "long", marking: "saddle", primary: "#b98a58", secondary: "#d9b87d", accent: "#535154" }],
    ["silky-terrier", "Silky Terrier", "실키 테리어", "toy", [], { ear: "point", tail: "docked", coat: "long", marking: "saddle", primary: "#b89360", secondary: "#d9bc86", accent: "#565961" }],
    ["miniature-pinscher", "Miniature Pinscher", "미니어처 핀셔", "toy", ["미니핀"], { ear: "point", tail: "docked", coat: "smooth", marking: "points", primary: "#3c302c", secondary: "#c47d4a", accent: "#1f1c1b" }],
    ["pomeranian", "Pomeranian", "포메라니안", "spitz", ["포메"], { ear: "point", tail: "curl", coat: "fluffy", muzzle: "tiny", primary: "#df9b4f", secondary: "#f7cf88", accent: "#8f5731", headScale: 1.2, bodyScale: .78 }],

    // R03 · flat/compact
    ["pekinese", "Pekinese", "페키니즈", "bully", ["pekingese"], { ear: "drop", tail: "plume", coat: "long", marking: "mask", primary: "#d1a36d", secondary: "#f1d2a5", accent: "#4f3830", headScale: 1.22, bodyScale: .76 }],
    ["shih-tzu", "Shih-Tzu", "시츄", "bully", ["시추", "shih tzu"], { ear: "long", tail: "plume", coat: "long", marking: "patches", primary: "#8a5b3e", secondary: "#f3e1c1", accent: "#413630", headScale: 1.2, bodyScale: .76 }],
    ["boston-bull", "Boston Bull", "보스턴 테리어", "bully", ["boston terrier"], { ear: "bat", tail: "bob", marking: "tuxedo", primary: "#3c3939", secondary: "#f5eee0", accent: "#222020", bodyScale: .83 }],
    ["french-bulldog", "French Bulldog", "프렌치 불독", "bully", ["불독", "불도그", "bulldog", "frenchie"], { ear: "bat", tail: "bob", marking: "mask", primary: "#d0a274", secondary: "#f1d2ad", accent: "#4b3831", headScale: 1.23, bodyScale: .86 }],
    ["affenpinscher", "Affenpinscher", "아펜핀셔", "bully", [], { ear: "point", tail: "docked", coat: "wire", marking: "solid", primary: "#494543", secondary: "#6e6762", accent: "#282524", bodyScale: .78 }],
    ["pug", "Pug", "퍼그", "bully", [], { ear: "button", tail: "curl", marking: "mask", primary: "#d7b786", secondary: "#f1d5a7", accent: "#463933", headScale: 1.24, bodyScale: .88 }],
    ["brabancon-griffon", "Brabancon Griffon", "프티 브라방송", "bully", ["브뤼셀 그리펀", "petit brabancon", "brussels griffon"], { ear: "button", tail: "docked", coat: "wire", marking: "mask", primary: "#b9754c", secondary: "#dba170", accent: "#46352e", bodyScale: .78 }],

    // R04 · sighthound/runner
    ["rhodesian-ridgeback", "Rhodesian Ridgeback", "로디지안 리지백", "sighthound", [], { ear: "drop", primary: "#bd7542", secondary: "#e0aa72", accent: "#693e2c", headScale: 1.01 }],
    ["afghan-hound", "Afghan Hound", "아프간 하운드", "sighthound", [], { ear: "long", tail: "curl", coat: "long", primary: "#c9aa7d", secondary: "#ead3a9", accent: "#6e5542" }],
    ["borzoi", "Borzoi", "보르조이", "sighthound", [], { ear: "rose", coat: "long", marking: "patches", primary: "#9a765d", secondary: "#f4e7d0", accent: "#55453b" }],
    ["irish-wolfhound", "Irish Wolfhound", "아이리시 울프하운드", "sighthound", [], { ear: "rose", coat: "wire", primary: "#85817b", secondary: "#aaa298", accent: "#4d4945", bodyScale: 1.02 }],
    ["italian-greyhound", "Italian Greyhound", "이탈리안 그레이하운드", "sighthound", ["이탈리안 그레이"], { ear: "rose", coat: "smooth", primary: "#8b8e96", secondary: "#bbbcc1", accent: "#4b4c52", bodyScale: .76, headScale: 1.07 }],
    ["whippet", "Whippet", "휘핏", "sighthound", [], { ear: "rose", coat: "smooth", marking: "blaze", primary: "#bd8f68", secondary: "#f2dfc0", accent: "#6e4f3c" }],
    ["ibizan-hound", "Ibizan Hound", "이비전 하운드", "sighthound", [], { ear: "bat", coat: "smooth", marking: "patches", primary: "#c87545", secondary: "#f7e9d1", accent: "#6c3e2e", headScale: 1.04 }],
    ["saluki", "Saluki", "살루키", "sighthound", [], { ear: "long", tail: "plume", coat: "long", primary: "#d5bd91", secondary: "#f2e3c4", accent: "#755f47" }],
    ["scottish-deerhound", "Scottish Deerhound", "스코티시 디어하운드", "sighthound", [], { ear: "rose", coat: "wire", primary: "#777b7e", secondary: "#a6a7a3", accent: "#44474a", bodyScale: 1.02 }],

    // R05 · long/low
    ["basset", "Basset", "바셋 하운드", "corgi", ["basset hound"], { ear: "long", tail: "long", coat: "smooth", marking: "patches", primary: "#a65d37", secondary: "#f2e3c6", accent: "#413732", headScale: 1.13, bodyLength: 1.22 }],
    ["sealyham-terrier", "Sealyham Terrier", "실리엄 테리어", "corgi", [], { ear: "button", tail: "docked", coat: "wire", primary: "#eee9dc", secondary: "#fffaf0", accent: "#a69c8c" }],
    ["dandie-dinmont", "Dandie Dinmont", "댄디 딘몬트 테리어", "corgi", [], { ear: "drop", tail: "long", coat: "wire", primary: "#8e7b69", secondary: "#d9c7a7", accent: "#51463e" }],
    ["scotch-terrier", "Scotch Terrier", "스코티시 테리어", "corgi", ["scottish terrier", "스코티"], { ear: "point", tail: "docked", coat: "wire", primary: "#403f40", secondary: "#676467", accent: "#242324" }],
    ["pembroke", "Pembroke", "웰시 코기 펨브로크", "corgi", ["펨브로크 웰시코기", "웰시코기", "코기", "pembroke welsh corgi", "welsh corgi", "corgi"], { ear: "point", tail: "bob", marking: "blaze", primary: "#d9863f", secondary: "#fff0d1", accent: "#7d4a2f" }],
    ["cardigan", "Cardigan", "웰시 코기 카디건", "corgi", ["카디건 웰시코기"], { ear: "point", tail: "long", marking: "blaze", primary: "#77716a", secondary: "#f5e5ca", accent: "#3f3b39" }],

    // R06 · scent hounds
    ["beagle", "Beagle", "비글", "hound", [], { ear: "long", tail: "sickle", marking: "saddle", primary: "#ad673d", secondary: "#f4e1bf", accent: "#403832", headScale: 1.1 }],
    ["bloodhound", "Bloodhound", "블러드하운드", "hound", [], { ear: "long", marking: "points", primary: "#8b4f32", secondary: "#c47b4b", accent: "#352b28", headScale: 1.1, bodyScale: 1.04 }],
    ["bluetick", "Bluetick", "블루틱 쿤하운드", "hound", [], { ear: "long", marking: "patches", primary: "#5b5e64", secondary: "#ddd8cd", accent: "#2d2f34" }],
    ["black-and-tan-coonhound", "Black-and-Tan Coonhound", "블랙 앤 탄 쿤하운드", "hound", [], { ear: "long", marking: "points", primary: "#383331", secondary: "#b96d3f", accent: "#1f1d1c" }],
    ["walker-hound", "Walker Hound", "워커 하운드", "hound", ["트리잉 워커 쿤하운드", "treeing walker coonhound"], { ear: "long", marking: "patches", primary: "#514b47", secondary: "#f1e4cd", accent: "#a6613b" }],
    ["english-foxhound", "English Foxhound", "잉글리시 폭스하운드", "hound", [], { ear: "drop", marking: "patches", primary: "#a65f39", secondary: "#f3e2c5", accent: "#443a34" }],
    ["redbone", "Redbone", "레드본 쿤하운드", "hound", [], { ear: "long", marking: "solid", primary: "#a84f32", secondary: "#d27850", accent: "#623022" }],
    ["otterhound", "Otterhound", "오터하운드", "hound", [], { ear: "long", coat: "wire", primary: "#8d7258", secondary: "#b89a72", accent: "#51453a", bodyScale: 1.02 }],

    // R07 · wire terriers
    ["border-terrier", "Border Terrier", "보더 테리어", "terrier", [], { ear: "button", primary: "#a87750", secondary: "#d2aa77", accent: "#554438" }],
    ["irish-terrier", "Irish Terrier", "아이리시 테리어", "terrier", [], { ear: "button", primary: "#b7653c", secondary: "#d99965", accent: "#6b3929" }],
    ["norfolk-terrier", "Norfolk Terrier", "노퍽 테리어", "terrier", [], { ear: "drop", primary: "#b77b4f", secondary: "#d8ad7a", accent: "#624736" }],
    ["norwich-terrier", "Norwich Terrier", "노리치 테리어", "terrier", [], { ear: "point", primary: "#bd7d4c", secondary: "#dfa975", accent: "#6d4733" }],
    ["wire-haired-fox-terrier", "Wire-Haired Fox Terrier", "와이어헤어드 폭스 테리어", "terrier", ["wire fox terrier"], { ear: "button", marking: "patches", primary: "#9b6c4e", secondary: "#f2e4cc", accent: "#4d4038" }],
    ["lakeland-terrier", "Lakeland Terrier", "레이크랜드 테리어", "terrier", [], { ear: "button", primary: "#b57c4d", secondary: "#d8a871", accent: "#654735" }],
    ["airedale", "Airedale", "에어데일 테리어", "terrier", [], { ear: "button", marking: "saddle", primary: "#b37b4b", secondary: "#daa66b", accent: "#47423e", bodyScale: .96 }],
    ["cairn", "Cairn", "케언 테리어", "terrier", [], { ear: "point", primary: "#9f866b", secondary: "#c8ae87", accent: "#574d43" }],
    ["australian-terrier", "Australian Terrier", "오스트레일리안 테리어", "terrier", [], { ear: "point", marking: "saddle", primary: "#a5794d", secondary: "#d3ab76", accent: "#4f5255" }],
    ["miniature-schnauzer", "Miniature Schnauzer", "미니어처 슈나우저", "terrier", ["미니 슈나우저"], { ear: "button", marking: "points", primary: "#777573", secondary: "#d4cfc3", accent: "#444342", bodyScale: .8 }],
    ["giant-schnauzer", "Giant Schnauzer", "자이언트 슈나우저", "terrier", [], { ear: "button", marking: "solid", primary: "#454342", secondary: "#696665", accent: "#262525", bodyScale: 1.06 }],
    ["standard-schnauzer", "Standard Schnauzer", "스탠더드 슈나우저", "terrier", [], { ear: "button", marking: "points", primary: "#6c6a68", secondary: "#beb8aa", accent: "#3c3b3b" }],
    ["west-highland-white-terrier", "West Highland White Terrier", "웨스트 하이랜드 화이트 테리어", "terrier", ["웨스티", "westie"], { ear: "point", primary: "#eeeadd", secondary: "#fffaf0", accent: "#aaa396", bodyScale: .8 }],

    // R08 · sporting/gundog
    ["weimaraner", "Weimaraner", "와이마라너", "retriever", [], { ear: "drop", coat: "smooth", tail: "docked", primary: "#92918e", secondary: "#c1bbb0", accent: "#555553" }],
    ["flat-coated-retriever", "Flat-Coated Retriever", "플랫 코티드 리트리버", "retriever", [], { ear: "drop", coat: "long", primary: "#403c3b", secondary: "#625d5a", accent: "#242222" }],
    ["golden-retriever", "Golden Retriever", "골든 리트리버", "retriever", ["골든", "golden", "retriever"], { coat: "long", primary: "#d7a151", secondary: "#f2d58c", accent: "#84562f" }],
    ["labrador-retriever", "Labrador Retriever", "래브라도 리트리버", "retriever", ["래브라도", "라브라도", "lab"], { coat: "smooth", primary: "#d4b477", secondary: "#ecd29a", accent: "#795e3e" }],
    ["chesapeake-bay-retriever", "Chesapeake Bay Retriever", "체서피크 베이 리트리버", "retriever", [], { coat: "curly", primary: "#8f6747", secondary: "#b88a5d", accent: "#543d31" }],
    ["german-short-haired-pointer", "German Short-Haired Pointer", "저먼 쇼트헤어드 포인터", "retriever", [], { coat: "smooth", tail: "docked", marking: "patches", primary: "#6e4a3b", secondary: "#e3d0b3", accent: "#3f302b" }],
    ["vizsla", "Vizsla", "비즐라", "retriever", [], { coat: "smooth", primary: "#b9683e", secondary: "#d99062", accent: "#6b3b2b" }],
    ["english-setter", "English Setter", "잉글리시 세터", "retriever", [], { ear: "long", coat: "long", marking: "patches", primary: "#6f665f", secondary: "#f1e7d5", accent: "#3e3936" }],
    ["irish-setter", "Irish Setter", "아이리시 세터", "retriever", [], { ear: "long", coat: "long", primary: "#a84d31", secondary: "#ca724c", accent: "#623024" }],
    ["gordon-setter", "Gordon Setter", "고든 세터", "retriever", [], { ear: "long", coat: "long", marking: "points", primary: "#3e3734", secondary: "#b9693d", accent: "#211f1e" }],
    ["brittany-spaniel", "Brittany Spaniel", "브리타니 스패니얼", "spaniel", [], { ear: "drop", tail: "bob", marking: "patches", primary: "#bb6c3e", secondary: "#f3e3ca", accent: "#6c3e2d" }],
    ["clumber", "Clumber", "클럼버 스패니얼", "spaniel", [], { ear: "drop", tail: "long", marking: "patches", primary: "#b36a3d", secondary: "#f5ead8", accent: "#6d4331", bodyScale: 1.02 }],
    ["english-springer", "English Springer", "잉글리시 스프링어 스패니얼", "spaniel", [], { ear: "long", coat: "long", marking: "patches", primary: "#604238", secondary: "#f3e4ca", accent: "#352c28" }],
    ["welsh-springer-spaniel", "Welsh Springer Spaniel", "웰시 스프링어 스패니얼", "spaniel", [], { ear: "long", coat: "long", marking: "patches", primary: "#a84e34", secondary: "#f5e5cb", accent: "#603127" }],
    ["cocker-spaniel", "Cocker Spaniel", "코커 스패니얼", "spaniel", [], { ear: "long", coat: "long", tail: "docked", primary: "#b96a3d", secondary: "#df9e69", accent: "#683c2d", headScale: 1.15 }],
    ["sussex-spaniel", "Sussex Spaniel", "서식스 스패니얼", "spaniel", [], { ear: "long", coat: "long", primary: "#9b5634", secondary: "#c67a4a", accent: "#593124", bodyScale: .86 }],

    // R09 · curly/wavy
    ["bedlington-terrier", "Bedlington Terrier", "베들링턴 테리어", "poodle", [], { ear: "drop", tail: "long", coat: "curly", muzzle: "long", primary: "#d7d3c8", secondary: "#f1eee5", accent: "#89857e", headScale: 1.07 }],
    ["kerry-blue-terrier", "Kerry Blue Terrier", "케리 블루 테리어", "poodle", [], { ear: "button", tail: "docked", coat: "curly", primary: "#656b70", secondary: "#9ca2a4", accent: "#3b4145" }],
    ["soft-coated-wheaten-terrier", "Soft-Coated Wheaten Terrier", "소프트 코티드 휘튼 테리어", "poodle", [], { ear: "drop", tail: "docked", coat: "curly", primary: "#d2ad74", secondary: "#eed39b", accent: "#826343" }],
    ["curly-coated-retriever", "Curly-Coated Retriever", "컬리 코티드 리트리버", "poodle", [], { ear: "drop", tail: "long", coat: "curly", primary: "#423d3b", secondary: "#655e5b", accent: "#242221", bodyScale: 1.04, bodyLength: 1.08 }],
    ["irish-water-spaniel", "Irish Water Spaniel", "아이리시 워터 스패니얼", "poodle", [], { ear: "long", tail: "long", coat: "curly", primary: "#724333", secondary: "#9e6347", accent: "#412c26" }],
    ["toy-poodle", "Toy Poodle", "토이 푸들", "poodle", ["푸들", "poodle"], { tail: "bob", primary: "#d49252", secondary: "#f0bf79", accent: "#85502f", bodyScale: .76, headScale: 1.22 }],
    ["miniature-poodle", "Miniature Poodle", "미니어처 푸들", "poodle", ["미니 푸들"], { tail: "bob", primary: "#cf8c4f", secondary: "#edba74", accent: "#7b492d", bodyScale: .84, headScale: 1.18 }],
    ["standard-poodle", "Standard Poodle", "스탠더드 푸들", "poodle", [], { tail: "bob", primary: "#c9874d", secondary: "#e9b16c", accent: "#75452c", bodyScale: 1.02, bodyLength: 1.04 }],

    // R10 · athletic/prick
    ["groenendael", "Groenendael", "그로넨달", "herding", ["벨지안 셰퍼드"], { ear: "point", coat: "long", marking: "solid", primary: "#3e3a39", secondary: "#5f5a58", accent: "#232120" }],
    ["malinois", "Malinois", "말리노이즈", "herding", ["벨지안 말리노이즈"], { ear: "point", coat: "smooth", marking: "mask", primary: "#c4935e", secondary: "#e0ba82", accent: "#40332e" }],
    ["kelpie", "Kelpie", "오스트레일리안 켈피", "herding", [], { ear: "point", coat: "smooth", marking: "points", primary: "#5e4035", secondary: "#bb7246", accent: "#302724" }],
    ["shetland-sheepdog", "Shetland Sheepdog", "셔틀랜드 쉽도그", "herding", ["셸티", "sheltie"], { ear: "button", coat: "long", marking: "blaze", primary: "#ad683d", secondary: "#f1e0c2", accent: "#4b3931", bodyScale: .78 }],
    ["collie", "Collie", "콜리", "herding", ["러프 콜리", "rough collie"], { ear: "button", coat: "long", marking: "blaze", primary: "#a96b42", secondary: "#f1dfbf", accent: "#4c3b32" }],
    ["border-collie", "Border Collie", "보더 콜리", "herding", [], { ear: "button", coat: "long", marking: "tuxedo", primary: "#3e3938", secondary: "#f1e7d6", accent: "#222020" }],
    ["german-shepherd", "German Shepherd", "저먼 셰퍼드", "herding", ["저먼 셰퍼드 독", "셰퍼드"], { ear: "point", coat: "double", marking: "saddle", primary: "#ad784c", secondary: "#d0a169", accent: "#3a322e", bodyScale: 1.04 }],
    ["doberman", "Doberman", "도베르만", "herding", [], { ear: "point", tail: "docked", coat: "smooth", marking: "points", primary: "#3b3130", secondary: "#b7623c", accent: "#1e1b1b", bodyScale: 1.04 }],
    ["basenji", "Basenji", "바센지", "primitive", [], { ear: "point", tail: "curl", coat: "smooth", marking: "blaze", primary: "#b45e38", secondary: "#f1dfc3", accent: "#633829" }],
    ["mexican-hairless", "Mexican Hairless", "멕시칸 헤어리스", "primitive", ["숄로이츠퀸틀리", "xoloitzcuintli", "xolo"], { ear: "bat", tail: "long", coat: "smooth", marking: "solid", primary: "#66605d", secondary: "#918985", accent: "#3d3937" }],
    ["dingo", "Dingo", "딩고", "primitive", [], { ear: "point", tail: "sickle", coat: "smooth", primary: "#cc8045", secondary: "#e9b573", accent: "#74432d" }],
    ["dhole", "Dhole", "승냥이", "primitive", ["돌"], { ear: "point", tail: "plume", coat: "double", primary: "#b95835", secondary: "#dc8656", accent: "#5f3328" }],
    ["african-hunting-dog", "African Hunting Dog", "아프리카들개", "primitive", ["리카온", "african wild dog"], { ear: "bat", tail: "plume", coat: "smooth", marking: "patches", primary: "#9a6c43", secondary: "#d4bb83", accent: "#3c3633" }],

    // R11 · shaggy herders
    ["tibetan-terrier", "Tibetan Terrier", "티베탄 테리어", "herding", [], { ear: "drop", coat: "long", marking: "patches", primary: "#7e6652", secondary: "#e9dcc4", accent: "#433b35", bodyScale: .86 }],
    ["briard", "Briard", "브리아드", "herding", [], { ear: "drop", coat: "long", primary: "#876b50", secondary: "#b2946e", accent: "#4d4036", bodyScale: 1.06 }],
    ["komondor", "Komondor", "코몬도르", "herding", [], { ear: "drop", coat: "long", primary: "#e7e2d6", secondary: "#fffaf0", accent: "#aca79e", bodyScale: 1.08 }],
    ["old-english-sheepdog", "Old English Sheepdog", "올드 잉글리시 쉽도그", "herding", [], { ear: "drop", coat: "long", marking: "tuxedo", primary: "#797b7d", secondary: "#f0ebe0", accent: "#444648", bodyScale: 1.08 }],
    ["bouvier-des-flandres", "Bouvier des Flandres", "부비에 데 플랑드르", "herding", [], { ear: "drop", tail: "docked", coat: "wire", primary: "#5b5755", secondary: "#827d78", accent: "#34312f", bodyScale: 1.08 }],

    // R12 · spitz/nordic
    ["norwegian-elkhound", "Norwegian Elkhound", "노르웨이언 엘크하운드", "spitz", [], { ear: "point", tail: "curl", marking: "mask", primary: "#858482", secondary: "#c5c1b8", accent: "#474747" }],
    ["schipperke", "Schipperke", "스키퍼키", "spitz", [], { ear: "point", tail: "bob", primary: "#41403f", secondary: "#62605e", accent: "#242323", bodyScale: .78 }],
    ["eskimo-dog", "Eskimo Dog", "에스키모 도그", "spitz", ["american eskimo dog"], { ear: "point", tail: "curl", primary: "#eee9dd", secondary: "#fffaf0", accent: "#b5ada0" }],
    ["malamute", "Malamute", "알래스칸 말라뮤트", "spitz", ["말라뮤트"], { ear: "point", tail: "curl", marking: "mask", primary: "#6c6f73", secondary: "#eee4d4", accent: "#3b3d40", bodyScale: 1.06 }],
    ["siberian-husky", "Siberian Husky", "시베리안 허스키", "spitz", ["허스키"], { ear: "point", tail: "sickle", marking: "mask", primary: "#737982", secondary: "#f3eadb", accent: "#3d4248" }],
    ["samoyed", "Samoyed", "사모예드", "spitz", [], { ear: "point", tail: "curl", primary: "#f1ede2", secondary: "#fffdf5", accent: "#b9b2a6", headScale: 1.12 }],
    ["chow", "Chow", "차우차우", "spitz", ["chow chow"], { ear: "point", tail: "curl", muzzle: "short", primary: "#a85b36", secondary: "#d58654", accent: "#583126", headScale: 1.2, bodyScale: 1.04 }],
    ["keeshond", "Keeshond", "키스혼드", "spitz", [], { ear: "point", tail: "curl", marking: "mask", primary: "#777474", secondary: "#d0c8b9", accent: "#3d3b3c" }],

    // R13 · mountain/giant
    ["kuvasz", "Kuvasz", "쿠바스", "mountain", [], { ear: "drop", marking: "solid", primary: "#eee9dc", secondary: "#fffaf0", accent: "#b2aa9d" }],
    ["greater-swiss-mountain-dog", "Greater Swiss Mountain Dog", "그레이터 스위스 마운틴 도그", "mountain", [], { ear: "drop", coat: "smooth", marking: "tuxedo", primary: "#403a38", secondary: "#f3e3ca", accent: "#a75e39" }],
    ["bernese-mountain-dog", "Bernese Mountain Dog", "버니즈 마운틴 도그", "mountain", ["버니즈"], { ear: "drop", coat: "long", marking: "tuxedo", primary: "#3e3937", secondary: "#f2e1c5", accent: "#a9613c" }],
    ["appenzeller", "Appenzeller", "아펜첼러 제넨훈트", "mountain", [], { ear: "drop", tail: "curl", coat: "smooth", marking: "tuxedo", primary: "#413a37", secondary: "#f2e0c2", accent: "#aa613a", bodyScale: .94 }],
    ["entlebucher", "EntleBucher", "엔틀레부허 마운틴 도그", "mountain", [], { ear: "drop", tail: "long", coat: "smooth", marking: "tuxedo", primary: "#3f3937", secondary: "#f2e0c2", accent: "#a85f39", bodyScale: .94 }],
    ["great-dane", "Great Dane", "그레이트 데인", "mountain", [], { ear: "drop", tail: "long", coat: "smooth", marking: "patches", primary: "#67676b", secondary: "#d9d5cc", accent: "#38383b", bodyLength: 1.15, bodyScale: 1.08 }],
    ["saint-bernard", "Saint Bernard", "세인트 버나드", "mountain", ["세인트버나드"], { ear: "drop", coat: "long", marking: "patches", primary: "#a95e39", secondary: "#f1e0c4", accent: "#4b3730", headScale: 1.16, bodyScale: 1.12 }],
    ["leonberg", "Leonberg", "레온베르거", "mountain", [], { ear: "drop", coat: "long", marking: "mask", primary: "#b57b4a", secondary: "#d8a56b", accent: "#45342e", bodyScale: 1.1 }],
    ["newfoundland", "Newfoundland", "뉴펀들랜드", "mountain", [], { ear: "drop", coat: "long", marking: "solid", primary: "#403b39", secondary: "#625b58", accent: "#242221", bodyScale: 1.14 }],
    ["great-pyrenees", "Great Pyrenees", "그레이트 피레니즈", "mountain", [], { ear: "drop", coat: "long", marking: "solid", primary: "#eeeadd", secondary: "#fffaf0", accent: "#b1aa9d", bodyScale: 1.12 }],

    // R14 · bully/molossian
    ["staffordshire-bullterrier", "Staffordshire Bullterrier", "스태퍼드셔 불테리어", "bully", [], { ear: "rose", tail: "long", coat: "smooth", marking: "blaze", primary: "#8d654e", secondary: "#f0d9b9", accent: "#4e3e36", bodyScale: .94 }],
    ["american-staffordshire-terrier", "American Staffordshire Terrier", "아메리칸 스태퍼드셔 테리어", "bully", ["아메리칸 스태피"], { ear: "rose", tail: "long", coat: "smooth", marking: "blaze", primary: "#7c6356", secondary: "#efe0c7", accent: "#433a35", bodyScale: 1.02 }],
    ["rottweiler", "Rottweiler", "로트와일러", "bully", [], { ear: "drop", tail: "docked", coat: "smooth", marking: "points", primary: "#3b3330", secondary: "#b8693d", accent: "#201d1c", bodyScale: 1.08 }],
    ["boxer", "Boxer", "복서", "bully", [], { ear: "drop", tail: "docked", coat: "smooth", marking: "mask", primary: "#c6814f", secondary: "#e6b175", accent: "#43342e", bodyScale: 1.02 }],
    ["bull-mastiff", "Bull Mastiff", "불마스티프", "bully", [], { ear: "drop", tail: "long", coat: "smooth", marking: "mask", primary: "#bd8255", secondary: "#dca777", accent: "#48362f", bodyScale: 1.14, headScale: 1.2 }],
    ["tibetan-mastiff", "Tibetan Mastiff", "티베탄 마스티프", "bully", [], { ear: "drop", tail: "curl", coat: "long", marking: "points", primary: "#584137", secondary: "#a56a43", accent: "#2e2825", bodyScale: 1.16, headScale: 1.2 }],
];

function normalizeBreedText(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "").trim();
}

const RIG_END_INDEXES: Array<[PetBreedRigId, number]> = [
    ["R01", 4], ["R02", 11], ["R03", 18], ["R04", 27], ["R05", 33],
    ["R06", 41], ["R07", 54], ["R08", 70], ["R09", 78], ["R10", 91],
    ["R11", 96], ["R12", 104], ["R13", 114], ["R14", 120],
];

function rigIdForIndex(index: number): PetBreedRigId {
    return RIG_END_INDEXES.find(([, end]) => index < end)?.[0] || "R14";
}

export const PET_BREEDS: PetBreedVisual[] = BREED_DEFINITIONS.map(([
    id,
    en,
    ko,
    family,
    aliases = [],
    overrides = {},
], index) => ({
    id,
    en,
    ko,
    aliases,
    family,
    rigId: rigIdForIndex(index),
    ...FAMILY_VISUALS[family],
    ...overrides,
}));

const UNIQUE_BREED_IDS = new Set(PET_BREEDS.map((breed) => breed.id));
if (PET_BREEDS.length !== 120 || UNIQUE_BREED_IDS.size !== 120) {
    throw new Error(`Pet companion breed catalog must contain 120 unique breeds; received ${PET_BREEDS.length}/${UNIQUE_BREED_IDS.size}.`);
}

const UNIQUE_VISUAL_PROFILES = new Set(PET_BREEDS.map((breed) => [
    breed.rigId,
    breed.ear,
    breed.tail,
    breed.muzzle,
    breed.coat,
    breed.marking,
    breed.primary,
    breed.secondary,
    breed.accent,
    breed.headScale,
    breed.bodyScale,
    breed.bodyLength,
].join("|")));
if (UNIQUE_VISUAL_PROFILES.size !== 120) {
    throw new Error(`Pet companion needs 120 distinct visual profiles; received ${UNIQUE_VISUAL_PROFILES.size}.`);
}

const VALID_RIG_IDS = new Set<string>(PET_BREED_RIG_IDS);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const invalidBreedVisual = PET_BREEDS.find((breed) => (
    !VALID_RIG_IDS.has(breed.rigId)
    || !HEX_COLOR.test(breed.primary)
    || !HEX_COLOR.test(breed.secondary)
    || !HEX_COLOR.test(breed.accent)
    || !Number.isFinite(breed.headScale)
    || !Number.isFinite(breed.bodyScale)
    || !Number.isFinite(breed.bodyLength)
));
if (invalidBreedVisual) {
    throw new Error(`Pet companion visual profile is incomplete for ${invalidBreedVisual.id}.`);
}

const BREED_BY_ID = new Map(PET_BREEDS.map((breed) => [breed.id, breed]));
const BREED_SEARCH = PET_BREEDS.flatMap((breed) => [breed.id, breed.en, breed.ko, ...breed.aliases]
    .filter(Boolean)
    .map((alias) => ({ key: normalizeBreedText(alias), breed })))
    .sort((a, b) => b.key.length - a.key.length);

export function isPetBreedId(value: unknown): value is string {
    return typeof value === "string" && BREED_BY_ID.has(value);
}

export function getPetBreedVisual(breedId?: string | null): PetBreedVisual {
    const direct = breedId ? BREED_BY_ID.get(breedId) : undefined;
    const resolved = breedId ? BREED_BY_ID.get(resolvePetBreedId(breedId)) : undefined;
    return direct || resolved || BREED_BY_ID.get("toy-poodle") || PET_BREEDS[0];
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function hexToHsl(hex: string) {
    const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
    const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
    const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lightness = (max + min) / 2;
    const delta = max - min;
    if (delta === 0) return { hue: 0, saturation: 0, lightness };

    let hue = 0;
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue = (hue * 60 + 360) % 360;
    const saturation = delta / (1 - Math.abs(2 * lightness - 1));
    return { hue, saturation, lightness };
}

/** Converts canonical proportions and palette metadata into lightweight UI
 * tokens. Breed identity itself comes from the breed-specific core atlas. */
export function getPetBreedRenderTokens(
    breedOrId?: PetBreedVisual | string | null,
): PetBreedRenderTokens {
    const breed = typeof breedOrId === "object" && breedOrId
        ? breedOrId
        : getPetBreedVisual(breedOrId);
    const palette = hexToHsl(breed.primary);
    const hueShift = Math.round(((palette.hue - 32 + 540) % 360) - 180);
    const saturation = clamp(0.86 + palette.saturation * 0.52, 0.82, 1.34);
    const brightness = clamp(0.88 + palette.lightness * 0.28, 0.91, 1.06);
    const lowSaturation = palette.saturation < 0.18;

    return {
        primary: breed.primary,
        secondary: breed.secondary,
        accent: breed.accent,
        filter: lowSaturation
            ? `grayscale(${clamp(0.24 + (0.18 - palette.saturation) * 1.6, 0.24, 0.5).toFixed(3)}) saturate(${saturation.toFixed(3)}) brightness(${brightness.toFixed(3)})`
            : `sepia(.045) saturate(${saturation.toFixed(3)}) hue-rotate(${hueShift}deg) brightness(${brightness.toFixed(3)})`,
        scaleX: clamp(1 + (breed.bodyLength - 1) * 0.42, 0.92, 1.1),
        scaleY: clamp(1 + (breed.bodyScale - 1) * 0.34 + (breed.headScale - 1) * 0.12, 0.94, 1.1),
    };
}

export function resolvePetBreedId(text: string, fallback = "toy-poodle") {
    const normalized = normalizeBreedText(text);
    if (!normalized) return fallback;
    const exact = BREED_SEARCH.find((item) => item.key === normalized);
    if (exact) return exact.breed.id;
    const partial = BREED_SEARCH.find((item) => {
        const minimumLength = /[가-힣]/.test(item.key) ? 2 : 3;
        return item.key.length >= minimumLength && normalized.includes(item.key);
    });
    return partial?.breed.id || fallback;
}

export function legacyCharacterBreedId(characterId?: string | null) {
    if (characterId === "retriever") return "golden-retriever";
    if (characterId === "corgi") return "pembroke";
    if (characterId === "bulldog") return "french-bulldog";
    return "toy-poodle";
}
