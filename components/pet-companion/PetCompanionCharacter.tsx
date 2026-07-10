import Image from "next/image";
import {
    getPetBreedVisual,
    legacyCharacterBreedId,
} from "@/lib/pet-companion-breeds";
import type {
    CompanionAccessoryId,
    CompanionCharacterId,
    CompanionToneId,
} from "@/lib/pet-companion";
import PetCompanionSpriteCanvas, {
    type PetCompanionSpriteMotion,
} from "./PetCompanionSpriteCanvas";
import styles from "./PetCompanionCharacter.module.css";

export type PetCompanionMotion = "idle" | "walk" | "run" | "sniff" | "point" | "recommend";

type Props = {
    breedId?: string;
    characterId: CompanionCharacterId;
    toneId: CompanionToneId;
    accessoryId: CompanionAccessoryId;
    motion?: PetCompanionMotion;
    facing?: "left" | "right";
    variant?: "live" | "preview" | "card";
    className?: string;
};

const ASSET_ROOT = "/images/pet-companion/cute-v2";
const MOTION_ASSET_ROOT = "/images/pet-companion/cute-v3-motion";
const MOTION_RIGS = new Set(Array.from({ length: 14 }, (_, index) => `r${String(index + 1).padStart(2, "0")}`));

export default function PetCompanionCharacter({
    breedId,
    characterId,
    toneId,
    accessoryId,
    motion = "idle",
    facing = "right",
    variant = "live",
    className = "",
}: Props) {
    const breed = getPetBreedVisual(breedId || legacyCharacterBreedId(characterId));
    const rigAsset = breed.rigId.toLowerCase();
    const coreMotion: PetCompanionSpriteMotion = motion === "walk"
        || motion === "run"
        || motion === "sniff"
        ? motion
        : "idle";
    const useCoreSprite = variant !== "card" && MOTION_RIGS.has(rigAsset);
    const idleFallback = (
        <Image
            src={`${ASSET_ROOT}/${rigAsset}-idle.webp`}
            alt=""
            width={384}
            height={384}
            draggable={false}
            className={`${styles.sprite} ${styles.idleSprite}`}
            loading={variant === "live" ? "eager" : "lazy"}
            unoptimized
        />
    );

    return (
        <span
            aria-hidden="true"
            className={`${styles.character} ${styles[variant]} ${className}`}
            data-breed={breed.id}
            data-family={breed.family}
            data-rig={breed.rigId}
            data-motion={motion}
            data-facing={facing}
            data-tone={toneId}
            data-accessory={accessoryId}
        >
            <span className={styles.groundShadow} />
            <span className={styles.spriteMotion} data-pet-part="dog">
                <span className={styles.spriteMirror}>
                    {useCoreSprite ? (
                        <PetCompanionSpriteCanvas
                            src={`${MOTION_ASSET_ROOT}/${rigAsset}-core.webp`}
                            motion={coreMotion}
                            fallback={idleFallback}
                            className={styles.spriteStack}
                            canvasClassName={styles.spriteCanvas}
                            paused={motion === "point" || motion === "recommend"}
                        />
                    ) : idleFallback}
                    <span className={styles.recommendPose} data-part="thumb-paw">
                        <Image
                            src={`${ASSET_ROOT}/${rigAsset}-recommend.webp`}
                            alt=""
                            width={384}
                            height={384}
                            draggable={false}
                            className={styles.sprite}
                            loading="lazy"
                            unoptimized
                        />
                    </span>
                    <span className={styles.accessory} />
                </span>
            </span>
            <span className={styles.recommendFx} data-part="recommend-fx">
                <span className={`${styles.sparkle} ${styles.sparkleA}`}>✦</span>
                <span className={`${styles.sparkle} ${styles.sparkleB}`}>✦</span>
                <span className={styles.pickBadge}><span>🐾</span>댕픽!</span>
            </span>
        </span>
    );
}
