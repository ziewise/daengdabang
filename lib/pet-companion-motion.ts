export type CompanionMotionPoint = {
    x: number;
    y: number;
};

const LANDING_START = 0.88;

function clampUnit(value: number) {
    return Math.min(Math.max(value, 0), 1);
}

/**
 * Keep most of a walk at one steady cadence, then use the final 12% for a
 * short landing. This avoids the repeated slow-fast pulses caused by easing a
 * newly retargeted CSS transition while still preventing an abrupt stop.
 */
export function resolveCompanionMotionProgress(elapsedMs: number, durationMs: number) {
    if (!Number.isFinite(durationMs) || durationMs <= 0) return 1;
    const time = clampUnit(elapsedMs / durationMs);
    if (time >= 1) return 1;

    const steadyVelocity = 2 / (1 + LANDING_START);
    if (time <= LANDING_START) return steadyVelocity * time;

    const landingLength = 1 - LANDING_START;
    const landingTime = (time - LANDING_START) / landingLength;
    const landingStartProgress = steadyVelocity * LANDING_START;
    return landingStartProgress
        + steadyVelocity * landingLength * (landingTime - landingTime * landingTime / 2);
}

export function sampleCompanionMotion(
    start: CompanionMotionPoint,
    target: CompanionMotionPoint,
    elapsedMs: number,
    durationMs: number,
): CompanionMotionPoint {
    const progress = resolveCompanionMotionProgress(elapsedMs, durationMs);
    return {
        x: start.x + (target.x - start.x) * progress,
        y: start.y + (target.y - start.y) * progress,
    };
}
