import test from 'node:test';
import assert from 'node:assert/strict';
import { findCatalogProduct } from '../lib/catalog/product-lookup.ts';
test('a reviewed old product ID resolves to its canonical product without another row', () => {
    const product = { id:'p_299', folder:'soopa_healthybites_bananapumpkin', raw:{legacyProductIds:['p_300']} };
    for (const id of ['p_299','p_300',product.folder]) assert.equal(findCatalogProduct([product],id),product);
    assert.equal(findCatalogProduct([product],'p_301'),undefined);
});
test('current IDs cannot be shadowed, and ambiguous aliases fail closed', () => {
    const current = {id:'p_300'};
    const one = {id:'p_299',raw:{legacyProductIds:['p_300']}};
    const two = {id:'p_301',raw:{legacyProductIds:['p_300']}};
    assert.equal(findCatalogProduct([one,current],'p_300'),current);
    assert.equal(findCatalogProduct([one,two],'p_300'),undefined);
});
