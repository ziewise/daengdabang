import type { PetProfile as MypagePetProfile } from "@/lib/types";

type StorePetProfile = {
    name: string;
    size: "small" | "medium" | "large";
    age: string;
    coat: "short" | "medium" | "long";
    activity: "low" | "normal" | "high";
    concerns: string[];
    lastAnalyzedAt?: string;
};

export type CartPetAssignment = {
    petId: string;
    petKey: string;
    petName: string;
    cohortKey: string;
    label: string;
    shortLabel: string;
    profileSnapshot: Record<string, unknown>;
};

export type CartPetOption = {
    value: string;
    label: string;
    assignment: CartPetAssignment;
};

function cleanToken(value: unknown, fallback: string) {
    const text = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\w가-힣-]/g, "");
    return text || fallback;
}

function storeSizeLabel(size: StorePetProfile["size"]) {
    if (size === "small") return "소형";
    if (size === "large") return "대형";
    return "중형";
}

function sizeBucket(value: unknown) {
    const text = String(value || "").toLowerCase();
    if (/초소형|소형|small|toy|xs|3~4|4kg|5kg/.test(text)) return "small";
    if (/대형|중대형|large|xl|25|30|40/.test(text)) return "large";
    if (/중형|medium|m|10|12|15|20/.test(text)) return "medium";
    return "medium";
}

function ageStage(age: unknown) {
    const text = String(age || "").toLowerCase();
    if (/퍼피|자견|아기|개월|puppy/.test(text)) return "puppy";
    if (/시니어|노령|노견|senior|7살|8살|9살|10살|11살|12살|13살|14살|15살/.test(text)) return "senior";
    return "adult";
}

function allergyCodes(values: unknown[]) {
    const text = values.map((value) => String(value || "")).join(" ").toLowerCase();
    const codes = [
        [/닭|치킨|chicken/, "chicken"],
        [/소|비프|beef/, "beef"],
        [/밀|글루텐|wheat|gluten/, "wheat"],
        [/유제품|우유|dairy|milk/, "dairy"],
        [/연어|살몬|salmon/, "salmon"],
    ]
        .filter(([pattern]) => (pattern as RegExp).test(text))
        .map(([, code]) => code as string);
    return codes.length ? codes.sort().join("+") : "no_allergy";
}

function weightBucket(weight: unknown) {
    const text = String(weight || "").trim();
    if (!text || text === "미입력") return "all_weight";
    const match = text.match(/\d+(?:\.\d+)?/);
    if (!match) return cleanToken(text, "all_weight");
    const kg = Number(match[0]);
    if (!Number.isFinite(kg)) return "all_weight";
    if (kg < 4) return "under_4kg";
    if (kg < 7) return "4_6kg";
    if (kg < 11) return "7_10kg";
    if (kg < 20) return "11_19kg";
    return "20kg_plus";
}

function makeAssignment(input: {
    source: "store" | "mypage";
    id: string;
    name: string;
    breed?: string;
    size: string;
    sizeLabel: string;
    age?: string;
    weight?: string;
    coat?: string;
    activity?: string;
    concerns?: string[];
    stableKey?: string;
}): CartPetAssignment {
    const size = sizeBucket(input.size);
    const stage = ageStage(input.age);
    const weight = weightBucket(input.weight);
    const allergy = allergyCodes([input.breed, input.coat, input.activity, ...(input.concerns || [])]);
    const petName = input.name.trim() || "우리 아이";
    const petId = input.id || `${input.source}_${cleanToken(petName, "pet")}`;
    const petKey = `${input.source}:${cleanToken(input.stableKey || petId, cleanToken(petName, "pet"))}`;
    const cohortKey = `${size}|${stage}|${weight}|${allergy}`;
    const summary = [input.breed, input.sizeLabel, input.age, input.weight].filter(Boolean).join(" · ");

    return {
        petId,
        petKey,
        petName,
        cohortKey,
        shortLabel: petName,
        label: summary ? `${petName} · ${summary}` : petName,
        profileSnapshot: {
            source: input.source,
            name: petName,
            breed: input.breed || "",
            size,
            sizeLabel: input.sizeLabel,
            ageStage: stage,
            age: input.age || "",
            weight,
            weightText: input.weight || "",
            allergy,
            coat: input.coat || "",
            activity: input.activity || "",
            concerns: input.concerns || [],
        },
    };
}

function storePetOption(pet: StorePetProfile, index: number): CartPetOption {
    const assignment = makeAssignment({
        source: "store",
        id: `store_${index}_${pet.name}`,
        name: pet.name,
        size: pet.size,
        sizeLabel: storeSizeLabel(pet.size),
        age: pet.age,
        coat: pet.coat,
        activity: pet.activity,
        concerns: pet.concerns,
        stableKey: `${pet.name}_${pet.lastAnalyzedAt || index}`,
    });
    return { value: assignment.petKey, label: assignment.label, assignment };
}

function mypagePetOption(pet: MypagePetProfile): CartPetOption {
    const assignment = makeAssignment({
        source: "mypage",
        id: pet.id,
        name: pet.name,
        breed: pet.breed,
        size: pet.body.size,
        sizeLabel: pet.body.size,
        weight: pet.body.weight,
        coat: pet.body.coat,
        activity: pet.body.activity,
        stableKey: pet.id,
    });
    return { value: assignment.petKey, label: assignment.label, assignment };
}

export function cartPetOptions(storePets: StorePetProfile[] = [], mypagePets: MypagePetProfile[] = []) {
    const seen = new Set<string>();
    const options: CartPetOption[] = [];
    const add = (option: CartPetOption) => {
        const key = `${option.assignment.petName}|${option.assignment.profileSnapshot.sizeLabel || ""}`;
        if (seen.has(key)) return;
        seen.add(key);
        options.push(option);
    };

    storePets.forEach((pet, index) => add(storePetOption(pet, index)));
    mypagePets
        .filter((pet) => pet.name && pet.source !== "analyzed")
        .forEach((pet) => add(mypagePetOption(pet)));

    return options;
}
