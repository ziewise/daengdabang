export type ChatMedicalSafety = "general_health" | "emergency" | null;

const PROTECTED_MEDICAL_FALLBACK_TOPICS = new Set([
    "acute_eye_cloudiness",
    "deicing_salt_or_chemical_paw",
    "dog_ate_cat_food",
    "insect_or_caterpillar_contact",
    "wildlife_bite_rabies_exposure",
]);

const TOXIN = "(?:초콜릿|자일리톨|포도|건포도|양파|마늘|타이레놀|아세트아미노펜|이부프로펜|사람\\s*약|진통제|쥐약|살서제|부동액|chocolate|xylitol|grape|raisin|onion|garlic|acetaminophen|ibuprofen|rat\\s*poison|antifreeze)";
const ACTUAL_TOXIN_EXPOSURE = new RegExp(
    `(?:${TOXIN}.{0,16}(?:먹었|먹은|먹어\\s*버|삼켰|삼킨|핥았|섭취했|주워\\s*먹|입에\\s*넣)|(?:먹었|먹은|삼켰|삼킨|핥았|섭취했|주워\\s*먹).{0,16}${TOXIN})`,
    "i",
);
const TOXIN_SAFETY_QUESTION = new RegExp(
    `(?:${TOXIN}.{0,16}(?:먹어도|줘도|위험|독성|안전|괜찮)|(?:먹어도|줘도|위험|독성|안전|괜찮).{0,16}${TOXIN})`,
    "i",
);

const DEGREE_ADVERB = "(?:(?:갑자기|너무|몹시|매우|아주|정말|계속|심하게|많이|점점|더|갈수록|도무지|전혀|제대로|거의|쉴\\s*때마다)\\s*)*";
const RESPIRATORY_SUBJECT = "(?:숨(?:\\s*쉬(?:기|는\\s*(?:게|것이|내내)))?|호흡(?:\\s*(?:하(?:기|는\\s*(?:게|것이))|할\\s*때마다))?)";
const RESPIRATORY_DISTRESS = "(?:힘들|힘겨|어렵|어려|버겁|버거|가쁘|가빠|빠르|빨라|거칠|차(?:오르)?|막히|곤란|못\\s*쉬|안\\s*쉬|쉬어지지|쉬어지질\\s*않|쉬어지지\\s*않|헐떡[^.!?\\n]{0,12}괴로|괴로[^.!?\\n]{0,12}헐떡)";
const FOREIGN_OBJECT = "(?:(?:플라스틱|유리|금속|쇠|나무|고무|리튬|알루미늄|장난감|바느질)\\s*(?:못|나사|바늘|실\\s*뭉치|바퀴|막대|꼬치|병?\\s*뚜껑|단추\\s*전지|부품|조각)|레고(?:\\s*조각)?|나무\\s*꼬치|꼬치\\s*막대|금속\\s*나사|비닐\\s*봉지|플라스틱\\s*뚜껑|알루미늄\\s*병\\s*뚜껑|병\\s*뚜껑|쿠션\\s*솜|천\\s*조각|고무\\s*공|이어폰\\s*고무|낚싯\\s*바늘|옥수수\\s*심|봉제인형\\s*눈알\\s*부품|눈알\\s*부품|리본\\s*끈|실\\s*뭉치|유리\\s*조각|복숭아\\s*씨|쇠\\s*못|나무\\s*막대|단추\\s*전지|돌멩이|장난감|양말|닭\\s*뼈|생닭\\s*뼈|뼈|이물질?|플라스틱|비닐|배터리|건전지|바늘|자석|동전|뚜껑|고무|솜|공|끈|실|돌|천|금속|꼬치|나사)";
const POSITIVE_PRODUCT_COMFORT = new RegExp(
    `(?:(?:숨|호흡)(?:\\s*(?:쉬기|하기))?(?:가|이|은|는|을|를|도)?\\s*(?:편한|편안한|편하게|편안하게|편하도록|좋은|좋게)|숨(?:이|을|를)?\\s*편(?:안)?하게\\s*쉬어지는|(?:숨|호흡)(?:이|을|를)?\\s*(?:잘\\s*통하는|방해하지\\s*않는)|가슴\\s*압박(?:이|은|는)?\\s*(?:없|적)|기관지(?:에|가|는)?\\s*부담(?:이|은|는)?\\s*(?:없|적)|(?:통기성|통풍)(?:이|가|은|는)?\\s*(?:좋아|좋은|높은|편한|잘\\s*되는|잘되는))(?=[^.!?\\n]{0,24}(?:하네스|가슴줄|목줄|산책줄|옷|조끼|쿠션|방석|침대|매트|가방|이동가방|이동장|카시트|제품|용품))`,
    "gi",
);
const CLEAR_ACTUAL_RED_FLAG = /(?:못\s*쉬|쉬어지지|호흡곤란|헐떡[^.!?\n]{0,12}괴로|희게\s*질|파랗|창백|청색|자주색|쓰러|의식\s*(?:없|저하)|발작(?!적)|경련)/i;
const BREATHING_EMERGENCY = new RegExp(
    `(?:${RESPIRATORY_SUBJECT}(?:가|이|은|는|을|를|도)?\\s*${DEGREE_ADVERB}${RESPIRATORY_DISTRESS}|(?:숨길|숨(?:소리)?|호흡|공기)[^.!?\\n]{0,48}(?:들이마시지\\s*못|못\\s*(?:들이)?마시|내쉬지\\s*못|호흡하지\\s*못|하지\\s*못|못\\s*쉬|막히|컥컥|고통|힘겨|버겁|괴로|거칠|가쁘|가빠|빨라|빠르|몰아쉬|입만\\s*벌|축\\s*늘어)|(?:들이마시지\\s*못|못\\s*(?:들이)?마시|못\\s*쉬|막히|컥컥|입만\\s*벌)[^.!?\\n]{0,32}(?:숨길|숨|호흡|공기))`,
    "i",
);
const CYANOSIS_EMERGENCY = new RegExp(
    `(?:(?:혀(?:\\s*전체)?|혓바닥|잇몸|입안|입속|구강(?:\\s*안쪽)?)(?:\\s*점막)?|점막)[^.!?\\n]{0,18}${DEGREE_ADVERB}(?:희게\\s*질|하얗게\\s*질|파랗|파래|파르스름|하얗|창백|잿빛|회백색|회색|파란\\s*기운|푸른\\s*빛|푸르스름|푸르|청보라|청색|보랏\\s*빛|보라|자주(?:색|빛))`,
    "i",
);
const ALTERED_CONSCIOUSNESS = /(?:의식\s*불명(?=$|[.!?\n]|\s*(?:이|상태|됐|되|입니다|이에요|이야))|의식\s*저하|의식(?:이|을)?\s*(?:없|잃|흐|희미)|정신(?:이|을)\s*(?:없|잃|흐|희미)|정신\s+(?:없|불명|저하|흐|희미)|혼절(?=$|[.!?\n]|\s*(?:했|해|하|됐|되))|혼수(?=$|[.!?\n]|\s*(?:상태|에\s*빠|야|입니다|예요)))/i;
const GDV_EMERGENCY = new RegExp(
    `(?:배(?:가|는|도)?\\s*${DEGREE_ADVERB}(?:(?:북|공)처럼\\s*)?(?:빵빵|부풀|팽팽|단단).{0,24}(?:토하려|헛구역|구역질)|(?:토하려|헛구역|구역질).{0,24}배(?:가|는|도)?\\s*${DEGREE_ADVERB}(?:(?:북|공)처럼\\s*)?(?:빵빵|부풀|팽팽|단단))`,
    "i",
);
const VEHICLE_TRAUMA = /(?:(?:차|차체|차량|자동차|승용차|승합차|화물차|주차\s*차량|택시|오토바이|트럭|버스|차도|도로|바퀴)[^.!?\n]{0,32}(?:치였|치여|치인|치이|받혀|받혔|받힘|부딪혔|부딪혀|부딪힌|부딪히|부딪친|충돌했|충돌한|충돌해서|깔렸|깔린|깔림|끼였|끼임|끼어|눌렸|눌린|눌림|눌려|충격(?:을|이)?\s*(?:받|입)|사고(?:가\s*났|를\s*당|로\s*다쳤))|교통\s*사고(?:를|가|로)?\s*(?:당했|당한|났|난))/i;
const FOREIGN_BODY_INGESTION = new RegExp(
    `${FOREIGN_OBJECT}\\s*(?:(?:(?:하나|둘|셋)|(?:한|두|세)\\s*(?:개|짝)|\\d+\\s*개|조각|일부)(?:을|를)?\\s*)?(?:을|를)?(?:\\s*(?:과|와|이랑|및)\\s*${FOREIGN_OBJECT})?\\s*(?:(?:씹(?:다|다가|던)|입에\\s*넣(?:고|어))\\s*)?(?:(?:통째로|꿀꺽)\\s*)?(?:삼켰|삼킨|삼킴|삼키는|삼키고|삼키다가|삼켜|넘겼|넘긴|넘김|넘기는|넘겨|먹어\\s*버|먹어치|먹었|먹음|먹고|먹는|집어\\s*먹)`,
    "i",
);
const VOMIT_EVENT = "(?:구토(?:물)?|토사물|게워(?:냅|낸|내는|내고|냈|냄|내)|토(?:할(?:\\s*때마다)?|했|해|한|하는|하면서|하고|했는데|한뒤|한\\s*뒤|함|를|가|에|에서|물))";
const BLOOD_CONTEXT = "(?:(?:피\\s*섞인|생피)|(?:새빨간\\s*)?(?:피|혈액|선혈|핏덩이|피\\s*덩어리|혈흔|혈액성)(?:가|이|을|를|도|성)?(?:\\s*(?:섞|보이|보여|보였|나오|나왔|묻))?|검은\\s*갈색\\s*찌꺼기|커피\\s*찌꺼기|검붉|붉|선홍\\s*색|커피\\s*색)";
const BLOOD_IN_VOMIT = new RegExp(
    `(?:${VOMIT_EVENT}[^.!?\\n]{0,48}${BLOOD_CONTEXT}|${BLOOD_CONTEXT}[^.!?\\n]{0,48}${VOMIT_EVENT})`,
    "i",
);
const EYE_CLOUDINESS_SYMPTOM = /(?:(?:눈(?!에\s*띄|\s*(?:모양|디자인|무늬|패턴))|눈동자|동공|각막|안구)[^.!?\n]{0,30}(?:하얀\s*(?:막(?!대)|빛|점|부분)|흰\s*(?:막(?!대)|빛|점|부분|필름)|백색|회백색|우윳빛|뿌연|뿌예|뿌옇|흐려|혼탁|탁해|파랗|푸르스름|안개\s*낀|반투명\s*막(?!대)|막(?:이|가)?\s*(?:보|끼|올라|덮|생기|생겼|생겨|나타나)|필름|하얗(?:게|고|어))|(?:하얀\s*막(?!대)|흰\s*막(?!대)|우윳빛|뿌연|혼탁|반투명\s*막(?!대))[^.!?\n]{0,24}(?:눈|눈동자|동공|각막|안구))/i;
const EYE_INJURY_SYMPTOM = /(?:(?:눈|안구)[^.!?\n]{0,24}(?:찔|다쳤|외상|부딪|튀어나|피가|출혈)|(?:찔|다쳤|외상|부딪)[^.!?\n]{0,24}(?:눈|안구))/i;

const MEDICAL_SIGNAL_PATTERNS = [
    EYE_CLOUDINESS_SYMPTOM,
    EYE_INJURY_SYMPTOM,
    /(?:아파|아픈|아픔|아프다|아프대|아프다고|아프니까|아프면|아프네|아프지)/i,
    /(?:이상해|이상한|이상\s*증상|무기력|기운(?:이|도)?\s*(?:없|떨어|처))/i,
    /(?:밥을\s*안|안\s*먹|못\s*먹|식욕\s*(?:저하|없))/i,
    /(?:다쳤|다쳐|상처|물렸|물린|교상|할퀴|절룩|낑낑|깨갱)/i,
    /(?:토해|토했|구토|설사|혈변|경련|발작(?!적)|기침|출혈|헐떡)/i,
    /(?:통증(?:이|을|으로|때문|있|심|느껴|보여)|중독\s*(?:이|됐|되었|된|의심|증상))/i,
    /(?:호흡(?:이|을)?\s*(?:곤란|힘들|이상|빠르|가쁘)|호흡곤란|숨(?:을|이)?\s*(?:못|안\s*쉬|쉬기\s*힘|가빠|가쁘|차|막히|빠르|이상|거칠))/i,
    /(?:열이\s*(?:나|있|오르)|발열|고열|체온(?:이)?\s*(?:높|오르))/i,
    /(?:피(?:가|를)\s*(?:나|흘|섞|토|보)|피\s*섞|혈변|출혈)/i,
    /(?:사람\s*약|약(?:을|이)?\s*(?:먹|복용|삼키)|복용|투약|용량|처방|질병|질환|진단|치료|수술)/i,
    /(?:백내장|녹내장)/i,
    /(?:(?:알러지|알레르기)(?:가|로|때문|반응|증상|의심|있|심))/i,
    /(?:vomit|diarrhea|seizure|breath(?:ing)?|pain|poison|medicine|dose|bitten|bite wound)/i,
];

const EMERGENCY_SIGNAL_PATTERNS = [
    /호흡곤란/i,
    BREATHING_EMERGENCY,
    CYANOSIS_EMERGENCY,
    ALTERED_CONSCIOUSNESS,
    /(?:(?:잇몸|혀).{0,10}(?:파랗|파래|하얗|창백|회색)|쓰러|기절|실신|의식\s*(?:저하|없)|반응이\s*없|발작(?!적)|경련)/i,
    GDV_EMERGENCY,
    VEHICLE_TRAUMA,
    /(?:추락|골절|열사병|물렸|물린|교상|할퀴)/i,
    FOREIGN_BODY_INGESTION,
    BLOOD_IN_VOMIT,
    /(?:피(?:를|가)?\s*토|피\s*섞인\s*구토|출혈이?\s*멈추지|피가\s*멈추지)/i,
    /(?:collapse|unconscious|seizure|poison|bloat|bitten|bite wound)/i,
];

const PRODUCT_NOUN = /(?:하네스|가슴줄|목줄|리드줄|산책줄|안전벨트|반려견\s*벨트|카시트|부스터\s*시트|시트\s*커버|차량용|이동장|이동가방|이동\s*케이지|케이지|가방|입마개|고글|보안경|칫솔|브러시|장난감|옷|우비|티셔츠|조끼|방석|쿠션|침대|매트|샴푸|사료|간식|영양제|보충제|서플리먼트|제품|상품)/i;
const SHOPPING_INTENT = /(?:추천|찾아|찾아줘|보여|구매|사고\s*싶|주문|골라|비교|살까|상품|제품|쇼핑|recommend|find|show|buy|order)/i;
const PRODUCT_MERCHANDISING_DESCRIPTOR = /(?:차\s*안에서\s*쓰|예방용?|방지|반사|편하게|편안|누르지\s*않|부담\s*덜|숨구멍|잘\s*쉬어지는|통기|건강용?|마사지|얼룩|순한|색(?:상)?|빛깔|브라운|모양|여행용|보호용|어울리는|문구|레드|메쉬|보온)/i;
const MEDICAL_TREATMENT_PRODUCT_CLAIM = /(?:치료|치유|완치|낫게|고쳐|약효|백내장|녹내장|질환|질병)/i;
const ACTUAL_SYMPTOM_PATTERNS = [
    EYE_CLOUDINESS_SYMPTOM,
    EYE_INJURY_SYMPTOM,
    /(?:아파|아프|통증(?:이|을)\s*(?:있|심|보)|다쳤|상처(?:가|를)|절뚝|무기력|축\s*늘어)/i,
    /(?:토했|토해|구토(?:했|해|를\s*반복)|설사(?:했|해)|기침(?:했|해)|열이\s*(?:나|오르))/i,
    /(?:쓰러|기절|실신|혼절|혼수|반응(?:이|도)?\s*(?:없|둔)|발작(?!적)|경련)/i,
    ALTERED_CONSCIOUSNESS,
    /(?:피(?:가|를)\s*(?:나|흘|토)|출혈(?:이|을)\s*(?:있|멈추지))/i,
];

function hasActualMedicalEvent(text: string, toxinExposure: boolean): boolean {
    return toxinExposure
        || EMERGENCY_SIGNAL_PATTERNS.some((pattern) => pattern.test(text))
        || ACTUAL_SYMPTOM_PATTERNS.some((pattern) => pattern.test(text));
}

function isExplicitNonmedicalProductRequest(text: string, actualMedicalEvent: boolean): boolean {
    return PRODUCT_NOUN.test(text)
        && (SHOPPING_INTENT.test(text) || PRODUCT_MERCHANDISING_DESCRIPTOR.test(text))
        && !MEDICAL_TREATMENT_PRODUCT_CLAIM.test(text)
        && !actualMedicalEvent;
}

export function classifyChatMedicalSafety(message: string): ChatMedicalSafety {
    const rawText = message.trim().toLowerCase();
    const rawToxinExposure = ACTUAL_TOXIN_EXPOSURE.test(rawText);
    const actualMedicalEvent = hasActualMedicalEvent(rawText, rawToxinExposure);
    if (isExplicitNonmedicalProductRequest(rawText, actualMedicalEvent)) return null;

    const text = actualMedicalEvent || CLEAR_ACTUAL_RED_FLAG.test(rawText)
        ? rawText
        : rawText.replace(POSITIVE_PRODUCT_COMFORT, " ");
    if (!text) return null;

    const toxinExposure = rawToxinExposure || ACTUAL_TOXIN_EXPOSURE.test(text);
    const emergency = toxinExposure || EMERGENCY_SIGNAL_PATTERNS.some((pattern) => pattern.test(text));
    if (emergency) return "emergency";

    const medical = toxinExposure
        || TOXIN_SAFETY_QUESTION.test(text)
        || MEDICAL_SIGNAL_PATTERNS.some((pattern) => pattern.test(text));
    if (!medical) return null;
    return "general_health";
}

/**
 * A successful API response is authoritative for its medical state. A client
 * fallback is intentionally ignored here so a local false positive can never
 * append an emergency card to a normal server answer.
 */
export function resolveSuccessfulApiMedical<T extends object>(
    apiMedical: unknown,
    _clientFallback?: T,
): T | undefined {
    void _clientFallback;
    if (!apiMedical || typeof apiMedical !== "object" || Array.isArray(apiMedical)) return undefined;
    return { ...(apiMedical as object) } as T;
}

/**
 * Keep a narrowly audited rare-symptom answer when an older API omits medical
 * metadata or routes it to a different, generic topic. Only topics in the
 * protected allowlist qualify, so generic client false positives can never
 * turn shopping copy into an emergency card.
 */
export function shouldPreferProtectedMedicalFallback(
    apiMedical: unknown,
    fallbackMedical: unknown,
): boolean {
    if (!fallbackMedical || typeof fallbackMedical !== "object" || Array.isArray(fallbackMedical)) return false;

    const fallback = fallbackMedical as { mode?: unknown; topic?: unknown };
    if (fallback.mode !== true || typeof fallback.topic !== "string") return false;
    if (!PROTECTED_MEDICAL_FALLBACK_TOPICS.has(fallback.topic)) return false;

    if (!apiMedical || typeof apiMedical !== "object" || Array.isArray(apiMedical)) return true;
    const api = apiMedical as { topic?: unknown };
    return api.topic !== fallback.topic;
}
