const MIB = 1024 * 1024;

export function onDeviceCacheBudget() {
    const device = typeof navigator === "undefined" ? null : navigator as Navigator & {
        deviceMemory?: number; connection?: { saveData?: boolean };
    };
    const low = Boolean(device?.connection?.saveData)
        || Boolean(device?.deviceMemory && device.deviceMemory <= 4)
        || Boolean(device?.hardwareConcurrency && device.hardwareConcurrency <= 2);
    return {
        memoryBytes: (low ? 8 : 16) * MIB,
        storageBytes: (low ? 16 : 32) * MIB,
        singleEntryBytes: (low ? 4 : 8) * MIB,
        colorEdge: low ? 768 : 1280,
    };
}

// Conservative retained-size estimate without allocating another large JSON string.
export function cacheEntryBytes(value: unknown, stopAt = 8 * MIB): number {
    const seen = new WeakSet<object>();
    let bytes = 0;
    let nodes = 0;
    function visit(item: unknown) {
        if (bytes > stopAt) return;
        if (++nodes > 4096) { bytes = Infinity; return; }
        if (typeof item === "string") bytes += item.length * 2;
        else if (typeof item === "number" || typeof item === "boolean") bytes += 8;
        else if (item && typeof item === "object") {
            if (seen.has(item)) { bytes = Infinity; return; }
            seen.add(item);
            for (const [key, child] of Object.entries(item)) {
                bytes += key.length * 2 + 16;
                visit(child);
                if (bytes > stopAt) break;
            }
        }
    }
    visit(value);
    return bytes + 128;
}

export function cacheEvictions(
    rows: Array<{ key: string; updatedAt: number; bytes: number }>,
    budget: number, maximum: number, now: number, ttl: number,
) {
    let used = 0;
    let kept = 0;
    const removed: string[] = [];
    for (const row of rows.slice().sort((a, b) => b.updatedAt - a.updatedAt)) {
        if (!Number.isFinite(row.bytes) || row.bytes <= 0 || !Number.isFinite(row.updatedAt)
            || row.updatedAt > now || now - row.updatedAt > ttl
            || kept >= maximum || used + row.bytes > budget) removed.push(row.key);
        else { used += row.bytes; kept += 1; }
    }
    return removed;
}
