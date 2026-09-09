type ListingProduct = {
    folder?: string;
    supplierCatalogHistorical?: boolean;
};

/** Keep one card per detail route; complete records remain available for ID lookups. */
export function visibleCatalogProducts<T extends ListingProduct>(products: readonly T[]): T[] {
    const folders = new Set<string>();
    return products.filter((product) => {
        if (product.supplierCatalogHistorical === true) return false;
        if (!product.folder) return true;
        if (folders.has(product.folder)) return false;
        folders.add(product.folder);
        return true;
    });
}
