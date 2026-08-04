export type CollisionRect = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

export type CollisionBounds = {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};

type ResolveCompanionCollisionOptions = {
    x: number;
    y: number;
    width: number;
    height: number;
    bounds: CollisionBounds;
    obstacles: CollisionRect[];
    gap?: number;
};

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function companionRect(x: number, y: number, width: number, height: number): CollisionRect {
    return {
        left: x,
        top: y,
        right: x + width,
        bottom: y + height,
    };
}

function overlapArea(rect: CollisionRect, obstacle: CollisionRect, gap: number) {
    const width = Math.max(
        0,
        Math.min(rect.right, obstacle.right + gap) - Math.max(rect.left, obstacle.left - gap),
    );
    const height = Math.max(
        0,
        Math.min(rect.bottom, obstacle.bottom + gap) - Math.max(rect.top, obstacle.top - gap),
    );
    return width * height;
}

export function companionOverlapsObstacle(
    rect: CollisionRect,
    obstacle: CollisionRect,
    gap = 0,
) {
    return rect.left < obstacle.right + gap
        && rect.right > obstacle.left - gap
        && rect.top < obstacle.bottom + gap
        && rect.bottom > obstacle.top - gap;
}

/**
 * Finds the nearest in-viewport position that keeps the companion clear of
 * every visible floating control. Candidate axes are built from every edge,
 * so stacked controls (chat, settings and home) are handled as one safe zone.
 */
export function resolveCompanionCollision({
    x,
    y,
    width,
    height,
    bounds,
    obstacles,
    gap = 12,
}: ResolveCompanionCollisionOptions) {
    const requested = {
        x: clamp(x, bounds.minX, bounds.maxX),
        y: clamp(y, bounds.minY, bounds.maxY),
    };
    const validObstacles = obstacles.filter((obstacle) => (
        Number.isFinite(obstacle.left)
        && Number.isFinite(obstacle.top)
        && Number.isFinite(obstacle.right)
        && Number.isFinite(obstacle.bottom)
        && obstacle.right > obstacle.left
        && obstacle.bottom > obstacle.top
    ));
    const requestedRect = companionRect(requested.x, requested.y, width, height);
    if (!validObstacles.some((obstacle) => companionOverlapsObstacle(requestedRect, obstacle, gap))) {
        return requested;
    }

    const xAxes = [requested.x, bounds.minX, bounds.maxX];
    const yAxes = [requested.y, bounds.minY, bounds.maxY];
    for (const obstacle of validObstacles) {
        xAxes.push(obstacle.left - gap - width, obstacle.right + gap);
        yAxes.push(obstacle.top - gap - height, obstacle.bottom + gap);
    }

    const candidates = new Map<string, { x: number; y: number }>();
    for (const candidateX of xAxes) {
        for (const candidateY of yAxes) {
            const candidate = {
                x: clamp(candidateX, bounds.minX, bounds.maxX),
                y: clamp(candidateY, bounds.minY, bounds.maxY),
            };
            candidates.set(`${candidate.x}:${candidate.y}`, candidate);
        }
    }

    const scoreDistance = (candidate: { x: number; y: number }) => (
        (candidate.x - requested.x) ** 2 + (candidate.y - requested.y) ** 2
    );
    const ranked = Array.from(candidates.values()).sort((left, right) => (
        scoreDistance(left) - scoreDistance(right)
    ));
    const safe = ranked.find((candidate) => {
        const rect = companionRect(candidate.x, candidate.y, width, height);
        return validObstacles.every((obstacle) => !companionOverlapsObstacle(rect, obstacle, gap));
    });
    if (safe) return safe;

    // Extremely small viewports may not contain a fully clear position. Keep
    // the least-obstructed candidate deterministic instead of oscillating.
    return ranked.sort((left, right) => {
        const leftRect = companionRect(left.x, left.y, width, height);
        const rightRect = companionRect(right.x, right.y, width, height);
        const leftOverlap = validObstacles.reduce(
            (total, obstacle) => total + overlapArea(leftRect, obstacle, gap),
            0,
        );
        const rightOverlap = validObstacles.reduce(
            (total, obstacle) => total + overlapArea(rightRect, obstacle, gap),
            0,
        );
        return leftOverlap - rightOverlap || scoreDistance(left) - scoreDistance(right);
    })[0] || requested;
}
