export type PaidCartLine = {
    productId: string;
    qty: number;
    color?: string;
    size?: string;
};

function lineKey(line: Pick<PaidCartLine, "productId" | "color" | "size">) {
    return JSON.stringify([line.productId, line.color ?? "", line.size ?? ""]);
}

function quantityMap(lines: PaidCartLine[]) {
    const quantities = new Map<string, number>();
    for (const line of lines) {
        if (!Number.isInteger(line.qty) || line.qty <= 0) continue;
        const key = lineKey(line);
        quantities.set(key, (quantities.get(key) ?? 0) + line.qty);
    }
    return quantities;
}

export function haveSamePaidLineQuantities(left: PaidCartLine[], right: PaidCartLine[]): boolean {
    const leftQuantities = quantityMap(left);
    const rightQuantities = quantityMap(right);
    if (leftQuantities.size !== rightQuantities.size) return false;
    for (const [key, quantity] of leftQuantities) {
        if (rightQuantities.get(key) !== quantity) return false;
    }
    return true;
}

export function removePaidLineQuantities<T extends PaidCartLine>(cart: T[], paidLines: PaidCartLine[]): T[] {
    const remainingPaidByLine = quantityMap(paidLines);

    const next: T[] = [];
    for (const cartLine of cart) {
        const key = lineKey(cartLine);
        const remainingPaid = remainingPaidByLine.get(key) ?? 0;
        if (remainingPaid <= 0) {
            next.push(cartLine);
            continue;
        }

        const consumed = Math.min(cartLine.qty, remainingPaid);
        remainingPaidByLine.set(key, remainingPaid - consumed);
        const remainingQuantity = cartLine.qty - consumed;
        if (remainingQuantity > 0) next.push({ ...cartLine, qty: remainingQuantity });
    }
    return next;
}
