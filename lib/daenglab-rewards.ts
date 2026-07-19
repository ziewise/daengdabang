export const DAENGLAB_ANALYSIS_COST_COINS = 10;
export const DAENGLAB_POINTS_CONVERSION_UNIT = 1_000;
export const DAENGLAB_COINS_PER_CONVERSION_UNIT = 10;

/**
 * 구매확정 시 지급될 상품 1개당 댕랩코인.
 * 할인 전 가격이 아닌 옵션 추가금까지 반영된 최종 판매 단가를 기준으로 한다.
 */
export function daengLabCoinsForUnitPrice(finalUnitPrice: number): number {
    if (!Number.isFinite(finalUnitPrice) || finalUnitPrice < 1) return 0;
    if (finalUnitPrice < 30_000) return 1;
    if (finalUnitPrice < 60_000) return 3;
    if (finalUnitPrice < 100_000) return 6;
    if (finalUnitPrice < 150_000) return 10;
    if (finalUnitPrice < 250_000) return 15;
    return 20;
}

/** 상품 수량을 반영한 구매확정 예정 코인. */
export function daengLabCoinsForLine(finalUnitPrice: number, quantity = 1): number {
    const safeQuantity = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
    return daengLabCoinsForUnitPrice(finalUnitPrice) * safeQuantity;
}

/** 장바구니/주문 라인들의 구매확정 예정 코인 합계. */
export function daengLabCoinsForLines(
    lines: ReadonlyArray<{ unitPrice: number; qty: number }>,
): number {
    return lines.reduce(
        (sum, line) => sum + daengLabCoinsForLine(line.unitPrice, line.qty),
        0,
    );
}

/** 1,000P 단위로만 가능한 단방향 전환의 최대 코인 수. */
export function daengLabCoinsForRewardPoints(points: number): number {
    if (!Number.isFinite(points) || points < DAENGLAB_POINTS_CONVERSION_UNIT) return 0;
    return (
        Math.floor(points / DAENGLAB_POINTS_CONVERSION_UNIT)
        * DAENGLAB_COINS_PER_CONVERSION_UNIT
    );
}

export function daengLabAnalysisCount(coins: number): number {
    if (!Number.isFinite(coins) || coins < DAENGLAB_ANALYSIS_COST_COINS) return 0;
    return Math.floor(coins / DAENGLAB_ANALYSIS_COST_COINS);
}
