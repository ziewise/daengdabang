import assert from 'node:assert/strict';
import test from 'node:test';
import { applyLiveInventory, parseLiveInventory } from '../lib/catalog/live-inventory-state.ts';
import { optionPurchaseState } from '../lib/catalog/inventory.ts';

const now = Date.parse('2026-09-19T01:00:00Z');
const product = { folder:'exact-product', raw:{supplierCatalogSource:'jsk_approved_account'}, availability:'available',
    colors:[{name:'Blue'}], sizes:[{name:'S'},{name:'M'}] };
const response = { schema:'ddb.public-product-inventory.v1', products:{'exact-product':{
    availability:'available',observedAt:new Date(now).toISOString(),options:[
        {color:'Blue',size:'S',availability:'available',fulfillment:'supplier_request'},
        {color:'Blue',size:'M',availability:'sold_out',fulfillment:null},
    ]}}};

test('live supplier stock changes exact options without changing product identity',()=>{
    const snapshot = parseLiveInventory(response, now);
    const current = applyLiveInventory(product,snapshot,now);
    assert.equal(current.folder,product.folder);
    assert.equal(optionPurchaseState(current,'Blue','S').purchasable,true);
    assert.equal(optionPurchaseState(current,'Blue','M').state,'sold_out');
    assert.equal(optionPurchaseState(current,'Blue','L/XL').state,'unknown');
    assert.equal(product.inventory,undefined);
});

test('missing, failed and stale observations cannot reuse available static stock',()=>{
    const snapshot = parseLiveInventory(response,now);
    for(const current of [
        applyLiveInventory(product,null,now),
        applyLiveInventory(product,{...snapshot,failed:true},now),
        applyLiveInventory(product,snapshot,now+121_000),
        applyLiveInventory(product,{...snapshot,receivedAt:now+901_000},now+901_000),
    ]) assert.equal(optionPurchaseState(current,'Blue','S').purchasable,false);
    assert.equal(optionPurchaseState(applyLiveInventory(product,{...snapshot,failed:true},now),'Blue','M').state,'sold_out');
});

test('operator holds stay closed and a verified restock may clear prior supplier soldout',()=>{
    const snapshot = parseLiveInventory(response,now);
    assert.equal(optionPurchaseState(applyLiveInventory({...product,availability:'sold_out'},snapshot,now),'Blue','S').purchasable,true);
    snapshot.products['exact-product'].availability='paused';
    assert.equal(optionPurchaseState(applyLiveInventory(product,snapshot,now),'Blue','S').state,'paused');
    assert.equal(optionPurchaseState(applyLiveInventory({...product,supplierCatalogHistorical:true},parseLiveInventory(response,now),now),'Blue','S').state,'paused');
});

test('invalid contracts and non-supplier products do not get invented inventory',()=>{
    assert.throws(()=>parseLiveInventory({products:{}}));
    const ordinary={...product,raw:{}};
    assert.equal(applyLiveInventory(ordinary,null,now),ordinary);
    const broken=structuredClone(response);
    broken.products['exact-product'].options[0].fulfillment='unverified';
    const current=applyLiveInventory(product,parseLiveInventory(broken,now),now);
    assert.equal(optionPurchaseState(current,'Blue','S').purchasable,false);
});
