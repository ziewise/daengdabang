export type PetCompanionFacing = "left" | "right";

export const PET_COMPANION_DIRECTION_DEADBAND = 5;

/**
 * Resolve the side a companion should face for a horizontal trip.
 * Tiny corrections keep the current side so collision and sub-pixel layout
 * adjustments cannot make the character flicker left and right.
 */
export function resolveHorizontalFacing(
    fromX: number,
    toX: number,
    currentFacing: PetCompanionFacing,
    deadband = PET_COMPANION_DIRECTION_DEADBAND,
): PetCompanionFacing {
    const horizontalTravel = toX - fromX;
    if (!Number.isFinite(horizontalTravel) || Math.abs(horizontalTravel) < deadband) {
        return currentFacing;
    }
    return horizontalTravel < 0 ? "left" : "right";
}
