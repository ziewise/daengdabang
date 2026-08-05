export type ShopChatPetProfile = {
    name: string;
    breed?: string;
    size: "small" | "medium" | "large";
    age?: string;
    birthMonth?: string;
    weightKg?: number;
    sex?: "male" | "female" | "unknown";
    coatColor?: string;
    coat: "short" | "medium" | "long";
    activity: "low" | "normal" | "high";
    concerns: string[];
    allergies?: string[];
    neutered?: "yes" | "no" | "unknown";
    lifeStage?: "puppy" | "adult" | "senior" | "unknown";
};

const PET_SIZE_VALUES = new Set<ShopChatPetProfile["size"]>(["small", "medium", "large"]);
const PET_COAT_VALUES = new Set<ShopChatPetProfile["coat"]>(["short", "medium", "long"]);
const PET_ACTIVITY_VALUES = new Set<ShopChatPetProfile["activity"]>(["low", "normal", "high"]);
const PET_SEX_VALUES = new Set<NonNullable<ShopChatPetProfile["sex"]>>(["male", "female", "unknown"]);
const PET_NEUTER_VALUES = new Set<NonNullable<ShopChatPetProfile["neutered"]>>(["yes", "no", "unknown"]);
const PET_LIFE_STAGE_VALUES = new Set<NonNullable<ShopChatPetProfile["lifeStage"]>>(["puppy", "adult", "senior", "unknown"]);

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function compactText(value: unknown, limit: number) {
    if (typeof value !== "string") return "";
    return value
        .normalize("NFKC")
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, limit);
}

/**
 * Projects a rich member pet object onto the only fields the public chat API may receive.
 * This is an explicit runtime allowlist: photos, raw analysis, profile IDs and future fields
 * are dropped even when a caller passes a full PetProfile object through structural typing.
 */
export function projectShopChatPetProfile(value: unknown): ShopChatPetProfile | null {
    const record = asRecord(value);
    if (!record) return null;

    const name = compactText(record.name, 40);
    const size = record.size;
    const coat = record.coat;
    const activity = record.activity;
    if (
        !name
        || typeof size !== "string"
        || !PET_SIZE_VALUES.has(size as ShopChatPetProfile["size"])
        || typeof coat !== "string"
        || !PET_COAT_VALUES.has(coat as ShopChatPetProfile["coat"])
        || typeof activity !== "string"
        || !PET_ACTIVITY_VALUES.has(activity as ShopChatPetProfile["activity"])
    ) return null;

    const concerns = Array.isArray(record.concerns)
        ? Array.from(new Set(
            record.concerns
                .slice(0, 12)
                .map((item) => compactText(item, 60))
                .filter(Boolean),
        )).slice(0, 8)
        : [];

    const breed = compactText(record.breed, 100) || undefined;
    const age = compactText(record.age, 40) || undefined;
    const birthMonth = compactText(record.birthMonth, 16) || undefined;
    const coatColor = compactText(record.coatColor, 80) || undefined;
    const weightKg = typeof record.weightKg === "number"
        && Number.isFinite(record.weightKg)
        && record.weightKg > 0
        && record.weightKg <= 200
        ? record.weightKg
        : undefined;
    const sex = typeof record.sex === "string" && PET_SEX_VALUES.has(record.sex as NonNullable<ShopChatPetProfile["sex"]>)
        ? record.sex as NonNullable<ShopChatPetProfile["sex"]>
        : undefined;
    const neutered = typeof record.neutered === "string" && PET_NEUTER_VALUES.has(record.neutered as NonNullable<ShopChatPetProfile["neutered"]>)
        ? record.neutered as NonNullable<ShopChatPetProfile["neutered"]>
        : undefined;
    const lifeStage = typeof record.lifeStage === "string" && PET_LIFE_STAGE_VALUES.has(record.lifeStage as NonNullable<ShopChatPetProfile["lifeStage"]>)
        ? record.lifeStage as NonNullable<ShopChatPetProfile["lifeStage"]>
        : undefined;
    const allergies = Array.isArray(record.allergies)
        ? Array.from(new Set(
            record.allergies
                .slice(0, 12)
                .map((item) => compactText(item, 80))
                .filter(Boolean),
        )).slice(0, 12)
        : [];

    return {
        name,
        ...(breed ? { breed } : {}),
        size: size as ShopChatPetProfile["size"],
        ...(age ? { age } : {}),
        ...(birthMonth ? { birthMonth } : {}),
        ...(weightKg ? { weightKg } : {}),
        ...(sex ? { sex } : {}),
        ...(coatColor ? { coatColor } : {}),
        coat: coat as ShopChatPetProfile["coat"],
        activity: activity as ShopChatPetProfile["activity"],
        concerns,
        ...(allergies.length ? { allergies } : {}),
        ...(neutered ? { neutered } : {}),
        ...(lifeStage ? { lifeStage } : {}),
    };
}
