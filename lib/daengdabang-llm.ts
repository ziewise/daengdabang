import { CATALOG, applySort, searchCatalog, type CatalogProduct } from "@/lib/catalog";
import { ddbApiBase } from "@/lib/customer-api";
import type { PetProfile } from "@/lib/store";

type PetLensInput = {
    name: string;
    size: PetProfile["size"];
    age: string;
    coat: PetProfile["coat"];
    activity: PetProfile["activity"];
    concerns: string[];
    imageName?: string;
    photoDataUrl?: string;
};

type ShopQuestionContext = {
    pet?: Pick<PetProfile, "name" | "size" | "coat" | "activity" | "concerns"> | null;
};

export type ShopChatSource = {
    name: string;
    url: string;
};

export type ShopChatMedical = {
    mode?: boolean;
    triage?: string;
    topic?: string;
    topicLabel?: string;
    followUpQuestions?: string[];
    followUpSlots?: Array<{ key: string; label: string; prompt: string; required?: boolean }>;
    choiceGroups?: ShopChatChoiceGroup[];
    redFlags?: string[];
    firstSteps?: string[];
    careWindow?: string;
    knowledgeLevel?: string;
    confidence?: string;
    disclaimer?: string;
};

export type ShopChatAction = {
    label: string;
    status?: "running" | "done" | "warn" | "error" | string;
    detail?: string;
};

export type ShopChatResearch = {
    mode?: string;
    sourceCount?: number;
    domains?: string[];
};

export type ShopChatChoiceGroup = {
    title: string;
    choices: Array<{ label: string; prompt: string; description?: string }>;
};

export type ShopChatCta = {
    kind: "geo_vet_search" | "external_link" | "prompt";
    label: string;
    url?: string;
    query?: string;
    prompt?: string;
    helperText?: string;
    icon?: string;
};

export type ShopChatAnswer = {
    answer: string;
    products: CatalogProduct[];
    medical?: ShopChatMedical;
    sources?: ShopChatSource[];
    actions?: ShopChatAction[];
    ctas?: ShopChatCta[];
    research?: ShopChatResearch;
};

const HEALTH_SOURCE_FALLBACK: ShopChatSource[] = [
    { name: "AVMA pet first aid", url: "https://www.avma.org/resources-tools/pet-owners/emergencycare/first-aid-tips-pet-owners" },
    { name: "Merck Veterinary Manual pet emergencies", url: "https://www.merckvetmanual.com/special-pet-topics/emergencies/what-to-do-in-a-dog-or-cat-emergency" },
];

const HEARTWORM_SOURCE_FALLBACK: ShopChatSource[] = [
    { name: "American Heartworm Society", url: "https://www.heartwormsociety.org/pet-owner-resources/heartworm-basics" },
    { name: "AHS preventives", url: "https://www.heartwormsociety.org/preventives" },
    { name: "AVMA heartworm disease", url: "https://www.avma.org/resources-tools/pet-owners/petcare/heartworm-disease" },
    { name: "FDA heartworm facts", url: "https://www.fda.gov/animal-veterinary/animal-health-literacy/keep-worms-out-your-pets-heart-facts-about-heartworm-disease" },
];

const GENERAL_DOG_SOURCE_FALLBACK: ShopChatSource[] = [
    { name: "AVMA pet care", url: "https://www.avma.org/resources-tools/pet-owners/petcare" },
    { name: "AKC dog owner resources", url: "https://www.akc.org/expert-advice/" },
];

function unique(products: CatalogProduct[]) {
    const seen = new Set<string>();
    return products.filter((product) => {
        if (seen.has(product.id)) return false;
        seen.add(product.id);
        return true;
    });
}

function apiBase() {
    return ddbApiBase();
}

function productFromApi(item: { id?: string; folder?: string; no?: number; name?: string }) {
    return CATALOG.find((product) =>
        product.id === item.id ||
        product.folder === item.folder ||
        product.no === item.no ||
        product.name === item.name
    );
}

function petContextText(context?: ShopQuestionContext) {
    const pet = context?.pet;
    if (!pet) return "";
    const size = sizeLabel(pet.size);
    const activity = pet.activity === "high" ? "활동량 높음" : pet.activity === "low" ? "활동량 낮음" : "활동량 보통";
    const coat = pet.coat === "long" ? "장모" : pet.coat === "short" ? "단모" : "보통 모질";
    const concerns = pet.concerns?.length ? pet.concerns.join(", ") : "특이사항 없음";
    return `반려견 프로필: 이름 ${pet.name || "우리 아이"}, 크기 ${size}, 모질 ${coat}, ${activity}, 관심사 ${concerns}`;
}

function sizeLabel(size: PetProfile["size"]) {
    if (size === "small") return "소형";
    if (size === "large") return "대형";
    return "중형";
}

function completedActions(topic: string, detail = "상품 추천 없이 답변") {
    return [
        { label: "질문 의도 분류", status: "done", detail: topic },
        { label: "안전 확인", status: "done", detail: "무관한 상품 추천 차단" },
        { label: "답변 정리", status: "done", detail },
    ];
}

function scopeGuardFallback(message: string): ShopChatAnswer | null {
    const text = message.toLowerCase();
    const hasDogContext = /(강아지|반려견|댕댕|멍멍|퍼피|노견|노령견|시니어견|우리\s*개|dog|puppy|canine)/i.test(message);
    const vetLocator = /(동물\s*병원|응급\s*병원|24시\s*병원|수의사|animal hospital|vet|veterinary)/i.test(message)
        && /(근처|주변|가까운|인근|찾|알려|어디|위치|지도|검색|24시|응급|near)/i.test(message);
    if (vetLocator) {
        const searchText = encodeURIComponent(message.replace(/알려줘|알려주세요|찾아줘|찾아주세요|어디|있나|있나요|\?/g, " ").trim() || "동물병원");
        return {
            answer: "동물병원을 찾는 질문으로 이해했어요. 아래 버튼을 누르면 현재 위치 기준으로 가까운 동물병원 후보를 먼저 보여드릴게요. 실시간 영업 여부와 야간/응급 진료 여부는 지도 결과가 바뀔 수 있으니, 이동 전 전화로 먼저 확인하는 흐름이 가장 안전합니다. 응급 상황이라면 평점 비교보다 지금 통화 가능한 24시 병원을 우선하세요.",
            products: [],
            medical: { mode: false, triage: "vet_locator", topic: "nearby_vet", disclaimer: "지도 검색 보조이며 진료 품질, 대기 시간, 영업 여부를 보증하지 않습니다." },
            sources: [
                { name: "카카오맵 검색", url: `https://map.kakao.com/link/search/${searchText}` },
                { name: "네이버지도 검색", url: `https://map.naver.com/p/search/${searchText}` },
                { name: "Google Maps 검색", url: `https://www.google.com/maps/search/${searchText}` },
            ],
            ctas: [
                {
                    kind: "geo_vet_search",
                    label: "현재 위치로 동물병원 찾기",
                    query: "동물병원",
                    helperText: "브라우저 위치 권한을 허용하면 가까운 후보를 챗봇 안에 보여줍니다.",
                    icon: "fa-location-crosshairs",
                },
                {
                    kind: "external_link",
                    label: "지도 검색 열기",
                    url: `https://map.kakao.com/link/search/${searchText}`,
                    helperText: "위치 권한이 불편하면 일반 지도 검색을 먼저 열어도 됩니다.",
                    icon: "fa-map-location-dot",
                },
            ],
            actions: completedActions("동물병원 위치 찾기", "지도 검색 링크 제공"),
            research: { mode: "map-search", sourceCount: 3 },
        };
    }
    if (/(사주|운세|타로|로또|복권)/i.test(message)) {
        return {
            answer: "이 질문은 강아지 건강, 생활 케어, 훈련, 산책, 급여, 상품 비교 범위를 벗어난 요청으로 보여요. 댕다방 케어톡은 근거를 확인하기 어려운 내용으로 답을 꾸미지 않고, 강아지에게 실제로 도움이 되는 정보가 있을 때만 정리하겠습니다.",
            products: [],
            medical: { mode: false, triage: "needs_clarification", topic: "unsupported_fun_request", disclaimer: "" },
            sources: [],
            actions: completedActions("범위 밖 요청"),
            research: { mode: "scope-guard", sourceCount: 0 },
        };
    }
    if (/(앵무새|고양이|냥이|토끼|햄스터|기니피그|거북이|물고기|페럿|parrot|cat|rabbit|hamster|bird|fish)/i.test(message) && !hasDogContext) {
        return {
            answer: "이 질문은 강아지가 아닌 다른 반려동물에 대한 내용으로 보여요. 댕다방 케어톡은 강아지 건강/생활/상품 기준으로 제한되어 있어서 다른 동물에게 강아지 기준 답변이나 상품을 억지로 붙이지 않겠습니다. 해당 종을 진료하는 동물병원이나 종별 전문 자료를 확인하는 편이 안전합니다.",
            products: [],
            medical: { mode: false, triage: "unsupported_pet", topic: "non_dog_pet", disclaimer: "DaengDaBang chatbot is dog-focused." },
            sources: [],
            actions: completedActions("강아지 외 반려동물 질문"),
            research: { mode: "scope-guard", sourceCount: 0 },
        };
    }
    if (!hasDogContext && /(전세|월세|계약|특약|부동산|법률|소송|주식|코딩|숙제|레시피|김치찌개|human|contract|legal)/i.test(text)) {
        return {
            answer: "질문을 상품 추천으로 연결하지 않았어요. 댕다방 케어톡은 강아지 건강, 생활, 훈련, 산책, 급여, 상품 비교를 돕는 범위로 제한되어 있습니다. 강아지 질문이라면 품종, 나이, 체중, 증상이나 상황을 다시 적어 주세요.",
            products: [],
            medical: { mode: false, triage: "needs_clarification", topic: "out_of_scope", disclaimer: "" },
            sources: [],
            actions: completedActions("강아지 범위 밖 질문"),
            research: { mode: "scope-guard", sourceCount: 0 },
        };
    }
    return null;
}

function healthRuleAnswer(
    answer: string,
    topic: string,
    topicLabel: string,
    options: {
        triage?: "general_health" | "emergency";
        followUpQuestions: string[];
        redFlags: string[];
        firstSteps: string[];
        careWindow?: string;
    }
): ShopChatAnswer {
    const triage = options.triage || "general_health";
    const followUpSlots = options.followUpQuestions.map((question, index) => ({
        key: `${topic}_${index + 1}`,
        label: index === 0 ? "상황" : index === 1 ? "증상" : "추가 확인",
        prompt: question,
        required: index < 2,
    }));
    return {
        answer,
        products: [],
        medical: {
            mode: true,
            triage,
            topic,
            topicLabel,
            followUpQuestions: options.followUpQuestions,
            followUpSlots,
            choiceGroups: [
                {
                    title: "바로 확인할 내용",
                    choices: followUpSlots.map((slot, index) => ({
                        label: slot.label,
                        prompt: slot.prompt,
                        description: options.followUpQuestions[index],
                    })),
                },
            ],
            redFlags: options.redFlags,
            firstSteps: options.firstSteps,
            careWindow: options.careWindow || (triage === "emergency" ? "지금 즉시 동물병원에 연락해야 하는 단계입니다." : "위험 신호가 있으면 즉시, 없더라도 지속되거나 악화되면 병원 상담이 우선입니다."),
            knowledgeLevel: "client-rare-health-rules",
            disclaimer: "general information only; contact a veterinarian for diagnosis or treatment",
        },
        sources: HEALTH_SOURCE_FALLBACK,
        actions: completedActions("강아지 건강/안전 질문", "제품 추천 없이 건강 안내"),
        research: { mode: "client-rare-rules", sourceCount: HEALTH_SOURCE_FALLBACK.length },
    };
}

function rareHealthFallback(message: string): ShopChatAnswer | null {
    if (/(송충|곤충|벌에\s*쏘|벌\s*쏘|두꺼비|개구리|caterpillar|bee sting|insect)/i.test(message) && /(핥|먹|씹|물|닿|쏘)/i.test(message)) {
        return healthRuleAnswer(
            "송충이, 벌, 일부 곤충이나 두꺼비 접촉은 입안 자극, 침 흘림, 구토, 얼굴 부기, 피부 염증을 만들 수 있어요. 핥았거나 씹은 상황이면 제품보다 먼저 입 주변·호흡·부기·구토 여부를 확인해 주세요. 얼굴이나 입술이 붓거나 숨이 불편해 보이면 바로 동물병원에 연락하는 게 안전합니다.",
            "insect_or_caterpillar_contact",
            "곤충, 송충이 또는 벌 접촉",
            {
                followUpQuestions: ["정확히 무엇을 핥거나 먹었고, 몇 분 또는 몇 시간이 지났나요?", "침 흘림, 구토, 얼굴/눈 주변 부기, 호흡 이상이 있나요?", "가능하면 접촉한 곤충이나 물체 사진이 있나요?"],
                redFlags: ["얼굴, 눈 주변, 입술이 빠르게 붓거나 두드러기가 퍼짐", "호흡이 힘들어 보임, 침을 많이 흘림, 반복 구토", "비틀거림, 무기력, 의식 저하"],
                firstSteps: ["입 주변과 발, 피부에 남은 이물질을 부드럽게 확인하세요.", "입안을 깊게 만지거나 임의로 토하게 하지 마세요.", "부기, 호흡 이상, 반복 구토가 있으면 즉시 병원에 연락하세요."],
            }
        );
    }
    if (/(제설제|염화칼슘|road salt|ice melt)/i.test(message)) {
        return healthRuleAnswer(
            "제설제나 염화칼슘은 발바닥을 따갑게 만들고, 핥아 먹으면 입안 자극이나 위장 불편을 일으킬 수 있어요. 먼저 미지근한 물로 발바닥과 발가락 사이를 충분히 헹구고 잘 말린 뒤 더 핥지 못하게 관찰해 주세요. 반복 구토, 심한 침 흘림, 비틀거림, 발바닥 통증이 있으면 병원에 연락해야 합니다.",
            "deicing_salt_or_chemical_paw",
            "제설제, 염화칼슘 또는 발바닥 화학 자극",
            {
                triage: /구토|비틀|못\s*서|침을\s*많이|딛지\s*못/i.test(message) ? "emergency" : "general_health",
                followUpQuestions: ["발에 묻은 것을 바로 씻겼나요, 얼마나 오래 핥았나요?", "구토, 침 흘림, 입 주변 통증, 발바닥 붉어짐이나 절뚝거림이 있나요?", "제설제 종류나 포장 정보를 알 수 있나요?"],
                redFlags: ["반복 구토, 심한 침 흘림, 비틀거림, 무기력", "발바닥이 심하게 붉거나 벗겨짐, 통증 때문에 딛지 못함", "먹은 양이 많거나 제설제 성분을 알 수 없음"],
                firstSteps: ["미지근한 물로 발바닥과 발가락 사이를 충분히 헹구고 잘 말려 주세요.", "더 핥지 못하게 잠시 관찰하고 사람 약이나 임의 처치는 피하세요.", "구토, 심한 침 흘림, 통증, 비틀거림이 있으면 병원에 연락하세요."],
            }
        );
    }
    if (/(눈.*(뿌예|뿌옇|파랗|흐려|하얗)|뿌예.*눈|cloudy eye)/i.test(message)) {
        return healthRuleAnswer(
            "눈이 갑자기 뿌옇거나 파랗게 보이면 각막 손상, 염증, 안압 문제처럼 빠른 확인이 필요한 원인이 있을 수 있어요. 눈은 악화가 빠를 수 있어서 사람용 안약이나 남은 안약을 임의로 넣지 말고, 비비지 못하게 하면서 오늘 안에 동물병원에 연락하는 쪽이 안전합니다.",
            "acute_eye_cloudiness",
            "갑작스러운 눈 혼탁 또는 색 변화",
            {
                triage: /갑자기|눈을\s*못|외상|부딪/i.test(message) ? "emergency" : "general_health",
                followUpQuestions: ["한쪽 눈인가요, 양쪽 눈인가요? 언제부터 갑자기 보였나요?", "눈을 못 뜨거나 비비기, 눈물, 눈곱, 통증 반응이 있나요?", "최근 산책 중 풀/먼지/충돌, 목욕, 샴푸, 외상이 있었나요?"],
                redFlags: ["눈을 못 뜸, 심하게 비빔, 통증 반응", "갑작스러운 혼탁, 파란빛/하얀빛 변화, 시야 이상 의심", "외상 뒤 시작됐거나 눈물/분비물이 급격히 늘어남"],
                firstSteps: ["눈을 비비지 못하게 하고 사람용 안약이나 남은 안약을 임의로 넣지 마세요.", "빛이 강한 곳과 먼지를 피하고 변화가 보이는 사진을 찍어 두세요.", "갑작스러운 혼탁이나 통증이 있으면 오늘 안에 동물병원에 연락하세요."],
                careWindow: "갑작스러운 눈 색 변화나 통증이 있으면 오늘 안에 동물병원 상담을 잡는 것이 좋습니다.",
            }
        );
    }
    if (/강아지.*고양이\s*사료|고양이\s*사료.*강아지/i.test(message)) {
        return healthRuleAnswer(
            "강아지가 고양이 사료를 조금 먹은 정도라면 바로 큰일로 단정하진 않지만, 고양이 사료는 지방과 단백질 비율이 달라 배탈을 만들 수 있어요. 제품 추천보다 먼저 먹은 양, 구토/설사, 복통, 췌장염 병력 여부를 봐 주세요. 반복 구토, 심한 설사, 배 통증, 무기력이 있으면 병원에 문의하세요.",
            "dog_ate_cat_food",
            "고양이 사료 섭취",
            {
                followUpQuestions: ["얼마나 먹었고 언제 먹었나요?", "구토, 설사, 복통, 무기력, 식욕 저하가 있나요?", "췌장염, 알레르기, 위장 질환 병력이 있나요?"],
                redFlags: ["반복 구토 또는 심한 설사", "배를 만지면 아파함, 웅크림, 무기력", "췌장염 병력이나 기존 질환이 있음"],
                firstSteps: ["추가로 먹지 못하게 치우고 물은 평소처럼 마시게 하세요.", "증상과 배변 상태를 24시간 정도 관찰하세요.", "반복 구토, 통증, 무기력이 있으면 병원에 연락하세요."],
            }
        );
    }
    return null;
}

function heartwormPreventionFallback(message: string): ShopChatAnswer | null {
    if (!/(심장\s*사상충|하트웜|heart\s*worm|heartworm)/i.test(message)) return null;

    const asksLargeDog = /(대형견|큰\s*개|대형\s*강아지|large)/i.test(message);
    const asksTiming = /(언제|몇\s*개월|시작|먹이|먹여|복용|투약|주기|매달|한\s*달|놓쳤|빠뜨|검사)/i.test(message);
    const opening = asksLargeDog
        ? "대형견도 심장사상충 예방약을 먹이는 '시기와 주기' 자체는 소형견과 크게 다르지 않고, 차이는 현재 체중에 맞는 용량 구간입니다."
        : "심장사상충 예방약은 치료제가 아니라 예방약에 가깝고, 모기로 감염된 유충이 성충으로 자리 잡기 전에 차단하는 목적입니다.";
    const timing = asksTiming
        ? "보통 먹는 예방약은 매월 같은 날짜에 꾸준히 쓰는 방식이 많고, 주사형 예방은 병원에서 정한 6개월 또는 12개월 주기를 따릅니다."
        : "예방은 계절에만 잠깐 하기보다 수의사와 상의해 연중 지속하는 쪽이 권장됩니다.";

    return {
        answer: `${opening}\n\n${timing} 대형견은 체중이 빠르게 변하거나 용량 경계에 걸릴 수 있으니 최근 체중을 재고 제품의 체중 구간을 맞춰야 합니다. 임의로 쪼개 먹이거나 작은 용량을 여러 개 조합하는 방식은 피하고, 제품 설명서와 병원 지시를 따르는 게 안전합니다.\n\n처음 시작하거나 오래 쉬었다가 다시 시작하는 경우에는 검사가 중요합니다. 특히 7개월령 이상이거나 예방을 놓친 기간이 길다면, 예방약을 바로 먹이기 전에 심장사상충 검사를 먼저 상담하세요. 이미 감염된 상태에서 예방약만 먹이면 성충은 해결되지 않고, 일부 상황에서는 부작용 위험이 커질 수 있습니다.\n\n기침, 쉽게 지침, 운동을 싫어함, 호흡 곤란, 실신, 배가 부어 보임 같은 증상이 있으면 예방 일정 질문보다 병원 검사가 먼저입니다.`,
        products: [],
        medical: {
            mode: true,
            triage: "preventive_care",
            topic: "heartworm_prevention",
            topicLabel: "심장사상충 예방",
            followUpQuestions: [
                "대형견 체중 구간에 맞춰 어떤 기준으로 고르면 되나요?",
                "한 달 이상 심장사상충약을 놓쳤을 때는 어떻게 해야 하나요?",
                "처음 시작하기 전에 검사가 꼭 필요한가요?",
            ],
            followUpSlots: [
                { key: "large_dog_weight", label: "대형견 용량", prompt: "대형견 심장사상충약은 체중 구간을 어떻게 맞춰야 하나요?", required: false },
                { key: "start_age", label: "시작 시기", prompt: "강아지는 심장사상충 예방을 언제부터 시작하나요?", required: false },
                { key: "missed_dose", label: "놓쳤을 때", prompt: "심장사상충약을 한 달 이상 놓쳤으면 어떻게 해야 하나요?", required: false },
                { key: "testing", label: "검사 필요", prompt: "심장사상충 예방약 시작 전에 검사가 필요한 경우를 알려줘", required: false },
            ],
            choiceGroups: [
                {
                    title: "어느 상황에 가까워요?",
                    choices: [
                        { label: "대형견 용량이 궁금해요", prompt: "대형견 심장사상충약은 체중 구간을 어떻게 맞춰야 하나요?", description: "체중 경계와 용량 선택" },
                        { label: "처음 시작하려고 해요", prompt: "강아지는 심장사상충 예방을 언제부터 시작하나요?", description: "개월 수와 사전 검사" },
                        { label: "약을 놓쳤어요", prompt: "심장사상충약을 한 달 이상 놓쳤으면 어떻게 해야 하나요?", description: "재시작 전 확인" },
                        { label: "증상이 있어 보여요", prompt: "강아지가 기침하고 쉽게 지치는데 심장사상충일 수 있나요?", description: "병원 검사 우선 신호" },
                    ],
                },
            ],
            redFlags: ["기침, 호흡 곤란, 쉽게 지침", "실신, 심한 무기력, 운동 거부", "배가 부어 보이거나 체중 감소가 동반됨"],
            firstSteps: ["최근 체중을 재고 제품의 체중 구간을 확인하세요.", "7개월령 이상이거나 예방을 오래 쉬었다면 시작 전 검사를 상담하세요.", "놓친 약을 한 번에 두 배로 먹이지 말고 병원에 재시작 기준을 물어보세요."],
            careWindow: "증상이 없더라도 예방은 정기 관리 영역입니다. 처음 시작, 재시작, 체중 구간 변경은 병원이나 수의사와 확인하는 편이 안전합니다.",
            knowledgeLevel: "AHS/AVMA/FDA 기준 예방 안내",
            disclaimer: "general information only; contact a veterinarian for diagnosis or treatment",
        },
        sources: HEARTWORM_SOURCE_FALLBACK,
        actions: completedActions("심장사상충 예방 질문", "제품 추천 없이 예방/검사 기준 안내"),
        ctas: [
            { kind: "prompt", label: "대형견 기준 더 보기", prompt: "대형견 심장사상충약은 체중 구간을 어떻게 맞춰야 하나요?", icon: "fa-dog" },
            { kind: "prompt", label: "놓쳤을 때 기준", prompt: "심장사상충약을 한 달 이상 놓쳤으면 어떻게 해야 하나요?", icon: "fa-calendar-check" },
        ],
        research: { mode: "client-heartworm-rules", sourceCount: HEARTWORM_SOURCE_FALLBACK.length },
    };
}

function medicalSafetyFallback(message: string): ShopChatAnswer | null {
    const text = message.toLowerCase();
    const medical = /(아파|아프|아픈|아픔|아픈가|아픈지|아픈\s*것|이상해|이상한|이상\s*증상|기운|무기력|밥을\s*안|안\s*먹|못\s*먹|다쳤|다쳐|상처|절룩|낑낑|깨갱|토해|토했|변이|구토|설사|경련|발작|호흡|숨|기침|열|통증|피|혈변|중독|초콜릿|자일리톨|포도|건포도|약|용량|처방|질병|질환|진단|치료|수술|알러지|알레르기|vomit|diarrhea|seizure|breath|pain|poison|xylitol|grape|medicine|dose)/i.test(text);
    if (!medical) return null;
    const emergency = /(호흡|숨|잇몸.*파|쓰러|의식|발작|경련|중독|자일리톨|초콜릿|포도|건포도|출혈|피가.*멈추|골절|열사병|breath|collapse|seizure|poison|xylitol|grape|bloat)/i.test(text);
    if (emergency) {
        return {
            answer: "응급 가능성이 있습니다. 상품 추천보다 먼저 가까운 동물병원 또는 24시 응급병원에 즉시 연락하세요. 증상 시작 시간, 먹은 것, 복용한 약, 사진/영상을 준비해 병원에 전달하는 것이 좋습니다.",
            products: [],
            medical: {
                mode: true,
                triage: "emergency",
                followUpQuestions: ["지금 이동 가능한 24시 병원이 있나요?", "언제부터 증상이 시작됐나요?", "먹은 물질이나 사고 가능성이 있나요?"],
                followUpSlots: [
                    { key: "nearest_er", label: "응급 병원", prompt: "지금 이동 가능한 24시 병원이 있나요?", required: true },
                    { key: "duration", label: "기간", prompt: "언제부터 증상이 시작됐나요?", required: true },
                    { key: "core_symptoms", label: "핵심 증상", prompt: "호흡, 의식, 발작, 구토, 통증 중 무엇이 있나요?", required: true },
                ],
                choiceGroups: [
                    {
                        title: "지금 무엇이 보여요?",
                        choices: [
                            { label: "호흡이 이상해요", prompt: "강아지가 호흡이 힘들어 보이거나 숨을 이상하게 쉬어요", description: "숨참, 잇몸색 변화" },
                            { label: "발작/의식 저하", prompt: "강아지가 발작했거나 의식이 처져 보여요", description: "즉시 병원 신호" },
                            { label: "중독 의심", prompt: "강아지가 자일리톨, 초콜릿, 포도, 사람 약을 먹었을 수 있어요", description: "먹은 것 확인" },
                            { label: "출혈/골절 의심", prompt: "강아지가 다쳤고 출혈이나 골절이 의심돼요", description: "이동 전 확인" },
                        ],
                    },
                ],
                redFlags: ["호흡 곤란, 의식 저하, 발작", "중독 의심, 피 섞인 구토/설사", "심한 통증, 걷지 못함, 멈추지 않는 출혈"],
                firstSteps: ["가까운 24시 병원에 먼저 연락하세요.", "먹은 것, 시간, 체중, 사진/영상을 정리하세요.", "사람 약이나 임의 처치는 피하세요."],
                careWindow: "지금 즉시 24시 응급병원 또는 가까운 동물병원에 연락해야 하는 단계입니다.",
                knowledgeLevel: "canine-health-triage-v2.1",
                disclaimer: "general information only; contact a veterinarian for diagnosis or treatment",
            },
            sources: HEALTH_SOURCE_FALLBACK,
        };
    }
    return {
        answer: "걱정되시겠어요. 지금은 상품 추천보다 증상 확인이 먼저입니다. 언제부터 아픈지, 구토/설사 여부, 호흡 상태, 식욕과 물 섭취, 기력 변화, 통증을 보이는 부위, 최근 먹은 것이나 삼킨 물건이 있는지 확인해 주세요. 호흡이 힘들거나 의식이 처지고, 반복 발작·중독 의심·피가 섞인 구토/설사·심한 통증·걷지 못함이 있으면 바로 동물병원 또는 24시 응급병원에 연락해야 합니다. 증상이 가볍더라도 계속되거나 악화되면 수의사 진료가 우선입니다.",
        products: [],
        medical: {
            mode: true,
            triage: "general_health",
            followUpQuestions: ["언제부터 어떤 모습이 달라졌나요?", "구토, 설사, 기침, 통증, 무기력, 식욕 변화 중 무엇이 있나요?", "나이, 체중, 기존 질환이나 복용약이 있나요?"],
            followUpSlots: [
                { key: "digestive", label: "구토/설사", prompt: "구토나 설사가 있어요. 언제부터 몇 번 했고 피가 섞였나요?", required: true },
                { key: "breathing", label: "호흡/기침", prompt: "기침이나 호흡 이상이 있어요. 숨쉬기 힘들어 보이나요?", required: true },
                { key: "pain_limping", label: "통증/절뚝임", prompt: "만지면 아파하거나 절뚝거려요. 어느 부위이고 외상이 있었나요?", required: true },
                { key: "appetite_energy", label: "식욕/기력 저하", prompt: "밥을 안 먹거나 기운이 없어요. 언제부터이고 물은 마시나요?", required: true },
                { key: "ate_something", label: "먹은 것 의심", prompt: "먹으면 안 되는 것을 먹었을 수 있어요. 무엇을 언제 얼마나 먹었나요?", required: true },
            ],
            choiceGroups: [
                {
                    title: "가장 가까운 증상을 골라주세요",
                    choices: [
                        { label: "구토/설사", prompt: "구토나 설사가 있어요. 언제부터 몇 번 했고 피가 섞였나요?", description: "배탈, 혈변, 반복 여부" },
                        { label: "호흡/기침", prompt: "기침이나 호흡 이상이 있어요. 숨쉬기 힘들어 보이나요?", description: "숨참, 기침, 잇몸색" },
                        { label: "통증/절뚝임", prompt: "만지면 아파하거나 절뚝거려요. 어느 부위이고 외상이 있었나요?", description: "다리, 허리, 발바닥" },
                        { label: "식욕/기력 저하", prompt: "밥을 안 먹거나 기운이 없어요. 언제부터이고 물은 마시나요?", description: "무기력, 발열 의심" },
                        { label: "먹은 것 의심", prompt: "먹으면 안 되는 것을 먹었을 수 있어요. 무엇을 언제 얼마나 먹었나요?", description: "초콜릿, 약, 포도 등" },
                    ],
                },
            ],
            redFlags: ["호흡 곤란, 의식 저하, 발작", "피 섞인 구토/설사 또는 중독 의심", "심한 통증, 걷지 못함, 멈추지 않는 출혈"],
            firstSteps: ["증상 시작 시간과 동반 증상을 기록하세요.", "사람 약을 임의로 먹이지 마세요.", "위험 신호가 있으면 바로 병원에 연락하세요."],
            careWindow: "위험 신호가 있으면 즉시, 없더라도 지속되거나 악화되면 병원 상담이 우선입니다.",
            knowledgeLevel: "canine-health-triage-v2.1",
            disclaimer: "general information only; contact a veterinarian for diagnosis or treatment",
        },
        sources: HEALTH_SOURCE_FALLBACK,
    };
}

function isCanineKnowledgeQuestion(message: string) {
    return /(강아지|반려견|댕댕이|멍멍이|퍼피|puppy|dog|산책|훈련|짖|물어|무는|사회화|분리불안|배변|목욕|양치|치아|털갈이|빗질|발톱|귀청소|수면|스트레스|더위|추위|급여|사료|물|체중|예방접종|중성화|심장사상충|진드기|벼룩|노령견)/i.test(message);
}

function isShoppingIntent(message: string) {
    if (/(추천\s*말고|상품\s*말고|제품\s*말고|구매\s*말고|사지\s*말고)/i.test(message)) return false;
    return /(추천|상품|제품|구매|가격|최저가|비교|골라|사도|살만|브랜드|사이즈|배송|주문|할인)/i.test(message);
}

function canineKnowledgeFallback(message: string): ShopChatAnswer | null {
    if (!isCanineKnowledgeQuestion(message) || isShoppingIntent(message)) return null;
    return {
        answer: "이 질문은 상품 추천보다 강아지 생활/행동 정보에 가까워서 제품은 붙이지 않았어요. 지금 API 검색 연결이 불안정하면 우선 검증된 반려견 자료 기준으로 답변드릴게요. 나이, 체중, 품종, 언제부터 그랬는지, 식욕/활력 변화가 있으면 더 정확히 정리할 수 있습니다. 통증, 호흡 이상, 반복 구토/설사, 의식 저하, 중독 가능성이 있으면 생활 팁보다 동물병원 상담이 먼저입니다.",
        products: [],
        medical: {
            mode: false,
            triage: "canine_knowledge",
            topic: "canine_general",
            disclaimer: "general information only; contact a veterinarian for diagnosis or treatment",
        },
        sources: GENERAL_DOG_SOURCE_FALLBACK,
        actions: [
            { label: "질문 의도 분류", status: "done", detail: "강아지 지식 질문" },
            { label: "인터넷 자료 검색", status: "warn", detail: "API 연결 실패로 기본 검증 출처 표시" },
            { label: "답변 정리", status: "done", detail: "상품 추천 차단" },
        ],
        research: { mode: "client-fallback", sourceCount: GENERAL_DOG_SOURCE_FALLBACK.length },
    };
}

function normalizeActions(value: unknown): ShopChatAction[] {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 8).flatMap((item) => {
        if (typeof item === "string") return [{ label: item, status: "done" }];
        if (!item || typeof item !== "object") return [];
        const record = item as Record<string, unknown>;
        const label = typeof record.label === "string" ? record.label : "";
        if (!label) return [];
        return [{
            label,
            status: typeof record.status === "string" ? record.status : "done",
            detail: typeof record.detail === "string" ? record.detail : "",
        }];
    });
}

function normalizeResearch(value: unknown): ShopChatResearch | undefined {
    if (!value || typeof value !== "object") return undefined;
    const record = value as Record<string, unknown>;
    return {
        mode: typeof record.mode === "string" ? record.mode : "",
        sourceCount: typeof record.sourceCount === "number" ? record.sourceCount : undefined,
        domains: Array.isArray(record.domains) ? record.domains.filter((item): item is string => typeof item === "string").slice(0, 6) : undefined,
    };
}

function normalizeCtas(value: unknown): ShopChatCta[] {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 6).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const record = item as Record<string, unknown>;
        const kind = typeof record.kind === "string" ? record.kind : "";
        if (!["geo_vet_search", "external_link", "prompt"].includes(kind)) return [];
        const label = typeof record.label === "string" ? record.label.trim() : "";
        if (!label) return [];
        return [{
            kind: kind as ShopChatCta["kind"],
            label,
            url: typeof record.url === "string" ? record.url : undefined,
            query: typeof record.query === "string" ? record.query : undefined,
            prompt: typeof record.prompt === "string" ? record.prompt : undefined,
            helperText: typeof record.helperText === "string" ? record.helperText : undefined,
            icon: typeof record.icon === "string" ? record.icon : undefined,
        }];
    });
}

function normalizeChoiceGroups(value: unknown): ShopChatChoiceGroup[] {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 4).flatMap((group) => {
        if (!group || typeof group !== "object") return [];
        const record = group as Record<string, unknown>;
        const title = typeof record.title === "string" ? record.title.trim() : "";
        const choices = Array.isArray(record.choices)
            ? record.choices.slice(0, 8).flatMap((choice) => {
                if (!choice || typeof choice !== "object") return [];
                const choiceRecord = choice as Record<string, unknown>;
                const label = typeof choiceRecord.label === "string" ? choiceRecord.label.trim() : "";
                const prompt = typeof choiceRecord.prompt === "string" ? choiceRecord.prompt.trim() : "";
                if (!label || !prompt) return [];
                return [{
                    label,
                    prompt,
                    description: typeof choiceRecord.description === "string" ? choiceRecord.description : undefined,
                }];
            })
            : [];
        if (!title || choices.length === 0) return [];
        return [{ title, choices }];
    });
}

export function recommendForPet(profile: Pick<PetProfile, "size" | "coat" | "activity" | "concerns">) {
    const products: CatalogProduct[] = [];
    const concerns = profile.concerns.join(" ");

    if (profile.activity === "high") products.push(...CATALOG.filter((p) => p.category === "outdoor"));
    if (profile.activity === "low") products.push(...CATALOG.filter((p) => p.category === "life"));
    if (profile.coat === "long") products.push(...CATALOG.filter((p) => p.category === "care"));
    if (/눈|고글|자외선|보호/.test(concerns)) products.push(...CATALOG.filter((p) => p.subcategory === "goggles"));
    if (/피부|발바닥|털|목욕|케어/.test(concerns)) products.push(...CATALOG.filter((p) => p.category === "care"));
    if (/체중|식단|알러지|간식|사료/.test(concerns)) products.push(...CATALOG.filter((p) => p.category === "food"));
    if (/놀이|분리불안|에너지/.test(concerns)) products.push(...CATALOG.filter((p) => p.category === "toy"));
    if (profile.size === "small") products.push(...searchCatalog("소형"));
    if (profile.size === "large") products.push(...searchCatalog("대형"));

    products.push(...applySort(CATALOG, "popular").slice(0, 24));
    return unique(products).slice(0, 8);
}

export function analyzePetLens(input: PetLensInput) {
    const concerns = input.concerns.length ? input.concerns : ["일상 케어"];
    const profile: PetProfile = {
        name: input.name || "우리 아이",
        size: input.size,
        age: input.age || "성견",
        coat: input.coat,
        activity: input.activity,
        concerns,
        photoDataUrl: input.photoDataUrl,
        lastAnalyzedAt: new Date().toISOString(),
    };
    const products = recommendForPet(profile);
    const summary = [
        `${profile.name}은 ${sizeLabel(profile.size)}견 기준으로 추천을 구성했습니다.`,
        profile.activity === "high"
            ? "활동량이 높아 산책/아웃도어 제품과 안전 장비를 먼저 확인하는 편이 좋습니다."
            : "일상 케어와 편안한 사용감을 우선으로 추천했습니다.",
        `관심 포인트: ${concerns.join(", ")}`,
    ];

    if (input.imageName) summary.push(`업로드 이미지(${input.imageName})는 프로필 기록과 추천 문맥으로 사용했습니다.`);

    return { profile, products, summary };
}

export async function analyzePetLensSmart(input: PetLensInput, imageFile?: File | null) {
    const base = apiBase();
    if (!base) throw new Error("PetLens API is not configured.");
    if (!imageFile) throw new Error("PetLens requires a dog photo.");

    try {
        const form = new FormData();
        form.append("file", imageFile);
        const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/analyze-pet`, {
            method: "POST",
            body: form,
        });
        if (!response.ok) throw new Error(`PetLens API ${response.status}`);
        const data = await response.json();
        const apiConcerns = Array.isArray(data.concerns) && data.concerns.length ? data.concerns : input.concerns;
        const apiCoat = ["short", "medium", "long"].includes(data.coat) ? data.coat : input.coat;
        const profile: PetProfile = {
            name: input.name || "우리 아이",
            size: input.size,
            age: input.age || "성견",
            coat: apiCoat,
            activity: input.activity,
            concerns: apiConcerns,
            photoDataUrl: input.photoDataUrl,
            rawAnalysis: data,
            lastAnalyzedAt: new Date().toISOString(),
        };
        const summary = [
            data.breed ? `사진 분석 결과 ${data.breed} 계열로 추정했습니다.` : `${profile.name}의 사진을 분석했습니다.`,
            data.summary || "사진 기반 해석을 바탕으로 추천을 구성했습니다.",
            `해석 엔진: ${data.interpreter || "fallback"}${data.interpreter_model ? ` · ${data.interpreter_model}` : ""}`,
        ];
        if (data.size_estimate && data.size_estimate !== "unknown") summary.push(`AI size estimate: ${data.size_estimate}`);
        if (Array.isArray(data.care_notes)) summary.push(...data.care_notes.slice(0, 3));
        if (Array.isArray(data.risk_flags) && data.risk_flags.length) summary.push(`Caution: ${data.risk_flags.slice(0, 3).join(", ")}`);
        if (data.image_stored) summary.push(`Photo stored: ${data.image_storage_key || "ok"}`);
        return { profile, products: recommendForPet(profile), summary };
    } catch (error) {
        throw error instanceof Error ? error : new Error("PetLens API analysis failed.");
    }
}

export function answerShopQuestion(message: string, context?: ShopQuestionContext): ShopChatAnswer {
    const text = message.trim();
    const lower = text.toLowerCase();
    let products: CatalogProduct[] = [];
    let answer = "댕다방 케어톡이 현재 등록된 333개 상품 기준으로 답변드릴게요.";
    const petContext = petContextText(context);

    if (!text) return { answer: "궁금한 점을 입력해 주세요.", products: [] };

    if (/하네스|목줄|리드|산책|외출|아웃도어|야간/.test(text)) {
        products = CATALOG.filter((p) => p.category === "outdoor");
        answer = "산책용품은 착용감, 조절 범위, 야간 안전성, 세탁 편의성을 함께 보면 좋습니다. 아래 상품부터 비교해 보세요.";
    } else if (/간식|사료|먹|푸드|트릿|영양|알러지|체중/.test(text)) {
        products = CATALOG.filter((p) => p.category === "food");
        answer = "먹거리는 알러지, 급여량, 기존 식단과의 충돌 여부를 먼저 확인해 주세요. 질환이나 처방식이 필요한 경우에는 수의사 상담이 우선입니다.";
    } else if (/장난감|노즈|터그|공|놀이|분리불안/.test(text)) {
        products = CATALOG.filter((p) => p.category === "toy");
        answer = "놀이 제품은 아이가 무는 힘과 삼킴 위험을 기준으로 고르는 것이 중요합니다. 처음에는 보호자가 보는 자리에서 사용해 주세요.";
    } else if (/피부|발|샴푸|케어|위생|배변|냄새|치약|칫솔/.test(text)) {
        products = CATALOG.filter((p) => p.category === "care");
        answer = "케어 제품은 작은 부위 테스트와 사용 빈도가 중요합니다. 상처나 염증이 있으면 제품보다 진료가 먼저입니다.";
    } else if (/배송|교환|반품|주문|결제/.test(text)) {
        return {
            answer: "현재 자사몰 주문 흐름은 데모 결제 상태로 저장됩니다. 실 결제/배송 연동 전까지는 주문 검수와 운영 정책 연결이 필요합니다.",
            products: [],
        };
    } else {
        products = searchCatalog(text);
        if (products.length === 0) {
            products = applySort(CATALOG, "popular").slice(0, 6);
            answer = "정확히 일치하는 상품명은 찾지 못했지만, 인기 상품 기준으로 비교 후보를 골랐습니다.";
        } else {
            answer = `"${text}" 기준으로 관련 상품을 찾았습니다.`;
        }
    }

    if (lower.includes("저렴") || lower.includes("낮은") || lower.includes("가격")) products = applySort(products, "priceAsc");
    else if (lower.includes("리뷰")) products = applySort(products, "reviewDesc");
    else products = applySort(products, "popular");

    if (petContext && products.length > 0) {
        answer = `${context?.pet?.name || "우리 아이"} 프로필까지 함께 보고 추천드리면, ${answer}`;
    }

    return { answer, products: unique(products).slice(0, 6) };
}

export async function answerShopQuestionSmart(message: string, context?: ShopQuestionContext): Promise<ShopChatAnswer> {
    const scopeFallback = scopeGuardFallback(message);
    const rareFallback = rareHealthFallback(message);
    const heartwormFallback = heartwormPreventionFallback(message);
    const medicalFallback = rareFallback || heartwormFallback || medicalSafetyFallback(message);
    const knowledgeFallback = canineKnowledgeFallback(message);
    const fallback = scopeFallback || medicalFallback || knowledgeFallback || answerShopQuestion(message, context);
    const base = apiBase();
    if (scopeFallback || medicalFallback) return fallback;
    if (!base) return fallback;
    const petContext = petContextText(context);
    const apiMessage = petContext ? `${message}\n\n${petContext}` : message;

    try {
        const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/shop-chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: apiMessage, limit: 6, petProfile: context?.pet ?? null }),
        });
        if (!response.ok) throw new Error(`shop-chat ${response.status}`);
        const data = await response.json();
        const apiProducts = Array.isArray(data.products)
            ? data.products.map(productFromApi).filter(Boolean) as CatalogProduct[]
            : [];
        const medicalMode = Boolean(data.medical && typeof data.medical === "object" && data.medical.mode);
        const apiSources = Array.isArray(data.sources)
            ? data.sources
                .filter((source: { name?: unknown; url?: unknown }) => typeof source?.name === "string" && typeof source?.url === "string")
                .map((source: { name: string; url: string }) => ({ name: source.name, url: source.url }))
            : [];
        const actions = normalizeActions(data.actions);
        const research = normalizeResearch(data.research);
        const ctas = normalizeCtas(data.ctas);
        const apiMedical = medicalMode ? data.medical as ShopChatMedical : fallback.medical;
        if (apiMedical && apiMedical.choiceGroups) {
            apiMedical.choiceGroups = normalizeChoiceGroups(apiMedical.choiceGroups);
        }
        return {
            answer: typeof data.answer === "string" && data.answer.trim() ? data.answer : fallback.answer,
            products: medicalMode ? unique(apiProducts).slice(0, 6) : (apiProducts.length ? unique(apiProducts).slice(0, 6) : fallback.products),
            medical: apiMedical,
            sources: apiSources.length ? apiSources : fallback.sources,
            actions: actions.length ? actions : fallback.actions,
            ctas: ctas.length ? ctas : fallback.ctas,
            research: research || fallback.research,
        };
    } catch {
        return scopeFallback || medicalFallback || knowledgeFallback || fallback;
    }
}
