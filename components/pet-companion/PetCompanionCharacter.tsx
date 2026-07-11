"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
    getPetBreedVisual,
    getPetBreedRenderTokens,
    legacyCharacterBreedId,
} from "@/lib/pet-companion-breeds";
import type {
    CompanionAccessoryId,
    CompanionCharacterId,
    CompanionToneId,
} from "@/lib/pet-companion";
import PetCompanionSpriteCanvas, {
    type PetCompanionSpriteMotion,
    type PetCompanionTravelDirection,
} from "./PetCompanionSpriteCanvas";
import styles from "./PetCompanionCharacter.module.css";

export type PetCompanionMotion = "idle" | "walk" | "run" | "sniff" | "curious" | "point" | "recommend";
export type { PetCompanionTravelDirection } from "./PetCompanionSpriteCanvas";

type Props = {
    breedId?: string;
    characterId: CompanionCharacterId;
    toneId: CompanionToneId;
    accessoryId: CompanionAccessoryId;
    motion?: PetCompanionMotion;
    facing?: "left" | "right";
    travelDirection?: PetCompanionTravelDirection;
    forceMotion?: boolean;
    variant?: "live" | "preview" | "card";
    className?: string;
};

const BREED_MOTION_ASSET_ROOT = "/images/pet-companion/cute-v4-breeds";
const BREED_MOTION_ASSET_VERSION = "20260712-2";
type TurnPhase = "rest" | "out" | "in";

export default function PetCompanionCharacter({
    breedId,
    characterId,
    toneId,
    accessoryId,
    motion = "idle",
    facing = "right",
    travelDirection = "side",
    forceMotion = false,
    variant = "live",
    className = "",
}: Props) {
    const [displayFacing, setDisplayFacing] = useState(facing);
    const [turnPhase, setTurnPhase] = useState<TurnPhase>("rest");
    const displayFacingRef = useRef(facing);

    useEffect(() => {
        if (facing === displayFacingRef.current) {
            // A rapid left-right correction can cancel a pending turn.
            const resetTimer = window.setTimeout(() => setTurnPhase("rest"), 0);
            return () => window.clearTimeout(resetTimer);
        }
        if (!forceMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const reducedTimer = window.setTimeout(() => {
                displayFacingRef.current = facing;
                setDisplayFacing(facing);
                setTurnPhase("rest");
            }, 0);
            return () => window.clearTimeout(reducedTimer);
        }

        // Keep the old side visible while the plush body turns away. Scroll
        // headings intentionally bypass this delay so the very first moving
        // frame already faces up or down instead of exposing the side run.
        const startTimer = window.setTimeout(() => setTurnPhase("out"), 0);
        const swapTimer = window.setTimeout(() => {
            displayFacingRef.current = facing;
            setDisplayFacing(facing);
            setTurnPhase("in");
        }, 96);
        const settleTimer = window.setTimeout(() => setTurnPhase("rest"), 260);
        return () => {
            window.clearTimeout(startTimer);
            window.clearTimeout(swapTimer);
            window.clearTimeout(settleTimer);
        };
    }, [facing, forceMotion]);

    const breed = getPetBreedVisual(breedId || legacyCharacterBreedId(characterId));
    const renderTokens = getPetBreedRenderTokens(breed);
    const breedCoreSrc = `${BREED_MOTION_ASSET_ROOT}/${breed.id}-core.webp?v=${BREED_MOTION_ASSET_VERSION}`;
    const breedPosterSrc = `${BREED_MOTION_ASSET_ROOT}/${breed.id}-poster.webp?v=${BREED_MOTION_ASSET_VERSION}`;
    const breedVerticalSrc = `${BREED_MOTION_ASSET_ROOT}/${breed.id}-vertical.webp?v=${BREED_MOTION_ASSET_VERSION}`;
    const characterStyle = {
        "--pet-breed-scale-x": String(renderTokens.scaleX),
        "--pet-breed-scale-y": String(renderTokens.scaleY),
        "--pet-poster-image": `url("${breedPosterSrc}")`,
    } as CSSProperties;
    const coreMotion: PetCompanionSpriteMotion = motion === "walk"
        || motion === "run"
        || motion === "sniff"
        ? motion
        : "idle";
    const useCoreSprite = variant !== "card";
    const idleFallback = (
        <span className={`${styles.sprite} ${styles.posterFrame} ${styles.idleSprite}`} />
    );

    return (
        <span
            aria-hidden="true"
            className={`${styles.character} ${styles[variant]} ${className}`}
            style={characterStyle}
            data-breed={breed.id}
            data-family={breed.family}
            data-rig={breed.rigId}
            data-ear={breed.ear}
            data-tail={breed.tail}
            data-muzzle={breed.muzzle}
            data-coat={breed.coat}
            data-marking={breed.marking}
            data-breed-visual="breed-core-v4"
            data-breed-style="oversized-head-plush-chibi"
            data-breed-asset={breedCoreSrc}
            data-breed-poster={breedPosterSrc}
            data-breed-vertical-asset={breedVerticalSrc}
            data-motion={motion}
            data-facing={displayFacing}
            data-travel-direction={travelDirection}
            data-turn-phase={turnPhase}
            data-force-motion={forceMotion ? "true" : "false"}
            data-tone={toneId}
            data-accessory={accessoryId}
        >
            <span className={styles.groundShadow} />
            <span className={styles.spriteMotion} data-pet-part="dog">
                <span className={styles.travelHeading} data-pet-part="heading">
                    <span className={styles.breedMorph}>
                        <span className={styles.spriteMirror}>
                            {useCoreSprite ? (
                                <PetCompanionSpriteCanvas
                                    key={breed.id}
                                    src={breedCoreSrc}
                                    verticalSrc={breedVerticalSrc}
                                    motion={coreMotion}
                                    travelDirection={travelDirection}
                                    fallback={idleFallback}
                                    className={styles.spriteStack}
                                    canvasClassName={styles.spriteCanvas}
                                    paused={motion === "point" || motion === "recommend"}
                                />
                            ) : idleFallback}
                            <span className={styles.recommendPose} data-part="thumb-paw">
                                <span className={`${styles.sprite} ${styles.posterFrame}`} />
                            </span>
                            <span className={styles.accessory} />
                        </span>
                    </span>
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
