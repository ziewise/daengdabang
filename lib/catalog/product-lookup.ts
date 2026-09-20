type LookupProduct = { id: string; folder?: string; raw?: { legacyProductIds?: readonly string[] } };

/** Direct current IDs win; an old ID must resolve to exactly one reviewed product. */
export function findCatalogProduct<T extends LookupProduct>(products: readonly T[], id: string): T | undefined {
    const direct = products.find(product => product.id === id || product.folder === id);
    if (direct) return direct;
    if (!/^p_\d+$/.test(id)) return undefined;
    const aliases = products.filter(product => product.raw?.legacyProductIds?.includes(id));
    return aliases.length === 1 ? aliases[0] : undefined;
}
