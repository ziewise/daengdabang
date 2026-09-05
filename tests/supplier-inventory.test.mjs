import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import * as inventory from '../lib/catalog/inventory.ts';
import { isLegacyRecommendationOperationallyEligible, recommendationProductPolicyIssues } from '../lib/recommendation/engine.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = path => JSON.parse(read(path));
function product(options = {}) {
    return {
        id:'p_1', folder:'fixture', name:'Fixture', price:10000,
        colors:[{name:'Blue', image:'blue.webp', chip:'blue-chip.webp'}, {name:'Red', image:'red.webp', chip:'red-chip.webp'}],
        sizes:[{name:'S',delta:0},{name:'M',delta:1000}],
        inventory:{sourceDate:'2026-08-29',options:[
            {color:'Blue',size:'S',availability:'available',fulfillment:'supplier_request'},
            {color:'Blue',size:'M',availability:'sold_out',fulfillment:null},
            {color:'Red',size:'S',availability:'available',fulfillment:'standard'},
            {color:'Red',size:'M',availability:'unknown',fulfillment:null},
        ]}, ...options,
    };
}
function loadModule(path, mocks = {}, append = '') {
    const compiled = ts.transpileModule(read(path), {fileName:path, compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    const module={exports:{}};
    vm.runInNewContext(compiled+append,{module,exports:module.exports,console,require:(id)=>{
        if(id.includes('catalog/inventory'))return inventory;
        if(Object.hasOwn(mocks,id))return mocks[id];
        if(id==='react'||id==='react/jsx-runtime')return require(id);
        throw new Error(`Unexpected test import: ${id}`);
    }});
    return module.exports;
}
const nodes = value => {
    if(!value || typeof value!=='object')return [];
    if(Array.isArray(value))return value.flatMap(nodes);
    return [value,...nodes(value.props?.children)];
};
function optionSheet(p, draft = [0,0,3,[]], mode='cart') {
    const added=[], routes=[], commits=[], changes=[];
    let index=0;
    const React={...require('react'),useEffect:()=>{},useRef:()=>({current:null}),useState:()=>{
        const current=draft[index++];return [current,next=>changes.push(typeof next==='function'?next(current):next)];
    }};
    const mod=loadModule('components/products/detail/OptionSheet.tsx',{
        react:React,'next/image':()=>null,'next/navigation':{useRouter:()=>({push:url=>routes.push(url)})},
        '@/lib/store':{useAuth:()=>({user:{}}),useCart:()=>({addToCart:(...args)=>added.push(args)})},
        '@/lib/i18n':{useI18n:()=>({locale:'ko',t:x=>x,formatPrice:String,productName:p=>p.name})},
        '@/lib/daenglab-rewards':{daengLabCoinsForLine:()=>0,daengLabCoinsForLines:()=>0},
        '@/components/petlens/DaengLabCoinMark':()=>null,'@/components/shop/SimplePayButtons':()=>null,
        '@/lib/payment-methods':{checkoutHref:()=>'/checkout'},
    });
    const tree=mod.default({product:p,open:true,mode,onClose:()=>{},onCommitted:()=>commits.push(true)});
    return {elements:nodes(tree),added,routes,commits,changes};
}

test('numeric-zero public contract permits purchase without a stock quantity cap',()=>{
    const value=inventory.optionPurchaseState(product(),'Blue','S');
    assert.equal(value.purchasable,true);assert.equal(value.supplierRequest,true);
    assert.equal(inventory.purchaseStateLabel(value),'본사 요청 배송');
});
test('textual sold out, undefined combinations and unknown options remain distinct',()=>{
    const p=product();
    assert.equal(inventory.optionPurchaseState(p,'Blue','M').state,'sold_out');
    assert.equal(inventory.optionPurchaseState(p,'Red','M').state,'unknown');
    assert.equal(inventory.optionPurchaseState(p,'Blue','L/XL').state,'unknown');
    assert.equal(inventory.optionPurchaseState(p,undefined,'S').purchasable,false);
    assert.equal(inventory.purchaseStateLabel(inventory.optionPurchaseState(p,'Red','M')),'재고 확인 필요');
});
test('global product pause and held model override an available supplier option',()=>{
    for(const availability of ['sold_out','discontinued','paused','suspended','sale_stopped','OUT_OF_STOCK','판매 중지','단종','품절'])assert.equal(inventory.optionPurchaseState(product({availability}),'Blue','S').purchasable,false);
    const p=product();p.inventory.status='unverified';
    assert.equal(inventory.productPurchaseState(p).state,'unknown');
    assert.equal(inventory.optionPurchaseState(p,'Blue','S').purchasable,false);
});
test('no fuzzy year/color/size alias or duplicate option grants access',()=>{
    const p=product();p.inventory.options.push({...p.inventory.options[0]});
    assert.equal(inventory.optionPurchaseState(p,'Blue','S').purchasable,false);
    assert.equal(inventory.optionPurchaseState(product(),'blue','S').purchasable,false);
    assert.equal(inventory.optionPurchaseState(product(),'Blue','S(20cm)').purchasable,false);
});
test('aggregate badge considers only visible options and does not call a partial hold sold out',()=>{
    const p=product();p.inventory.options=p.inventory.options.filter(row=>row.availability!=='available');
    assert.equal(inventory.productPurchaseState(p).state,'unknown');
    p.inventory.options.push({color:'UNLISTED',size:'S',availability:'available',fulfillment:'standard'});
    assert.equal(inventory.productPurchaseState(p).purchasable,false);
    p.inventory.options=p.colors.flatMap(c=>p.sizes.map(s=>({color:c.name,size:s.name,availability:'sold_out',fulfillment:null})));
    assert.equal(inventory.productPurchaseState(p).state,'sold_out');
});
test('uncovered catalog products retain legacy behavior without a stock verification claim',()=>{
    const p=product({inventory:undefined});
    assert.equal(inventory.optionPurchaseState(p,'Blue','S').state,'untracked');
    assert.equal(inventory.productPurchaseState(p).tracked,false);
    assert.equal(inventory.purchaseStateLabel(inventory.productPurchaseState(p)),'');
    assert.equal(inventory.inventoryForProduct({schemaVersion:1,sourceDate:'2026-08-29',products:{}},'not-covered'),undefined);
});
test('public loader strips private metadata and malformed covered contracts fail closed',()=>{
    const document={schemaVersion:1,sourceDate:'2026-08-29',products:{fixture:{...product().inventory,sourceWorkbook:'PRIVATE',internalStock:123,reason:'PRIVATE',options:product().inventory.options.map(row=>({...row,sourceMarker:'PRIVATE'}))}}};
    assert.doesNotMatch(JSON.stringify(inventory.inventoryForProduct(document,'fixture')),/PRIVATE|internalStock|sourceMarker|reason/);
    for(const mutation of [{schemaVersion:2},{sourceDate:'2026-02-30'},{products:null}])assert.equal(inventory.inventoryForProduct({...document,...mutation},'fixture').status,'unverified');
    document.products.fixture.options[0].fulfillment=null;
    assert.equal(inventory.inventoryForProduct(document,'fixture').options[0].availability,'unknown');
});
test('inventory never promotes unreviewed recommendations and blocks held legacy recommendations',()=>{
    const p=product();
    assert.ok(recommendationProductPolicyIssues(p).includes('not_recommendable'));
    assert.ok(recommendationProductPolicyIssues(p).includes('not_reviewed'));
    p.inventory.status='unverified';
    assert.equal(isLegacyRecommendationOperationallyEligible(p),false);
    assert.equal(isLegacyRecommendationOperationallyEligible(product()),true);
});
test('OptionSheet permits multiple zero-stock units, retains price and announces supplier request',()=>{
    const result=optionSheet(product(),[0,0,12,[]]);
    const confirm=result.elements.find(n=>n.props?.['data-confirm-options']);
    assert.equal(confirm.props.disabled,false);confirm.props.onClick();
    assert.deepEqual(result.added,[['p_1',12,'Blue','S']]);
    assert.equal(result.commits.length,1);
    assert.ok(result.elements.some(n=>n.props?.['data-inventory-state']==='available'));
});
test('OptionSheet prevents sold-out current selections and mixed accumulated picks from committing',()=>{
    for(const draft of [[0,1,1,[]],[0,0,1,[{colorIdx:0,sizeIdx:0,qty:1},{colorIdx:0,sizeIdx:1,qty:1}]]]) {
        const result=optionSheet(product(),draft,'buy');
        const confirm=result.elements.find(n=>n.props?.['data-confirm-options']);
        assert.equal(confirm.props.disabled,true);confirm.props.onClick();
        assert.equal(result.added.length,0);assert.equal(result.routes.length,0);assert.equal(result.commits.length,0);
    }
});
test('OptionSheet disables exact sold-out and unknown sizes while retaining zero-stock size',()=>{
    const result=optionSheet(product(),[0,null,1,[]]);
    const optionRows=result.elements.filter(n=>n.type==='option'&&n.props.value!=='');
    assert.equal(optionRows.find(n=>n.props.value===0).props.disabled,false);
    assert.equal(optionRows.find(n=>n.props.value===1).props.disabled,true);
    const add=result.elements.find(n=>n.props?.['data-add-option']);assert.equal(add.props.disabled,true);add.props.onClick();assert.equal(result.changes.length,0);
});
test('cart display revalidates restored lines without deleting data or silently checking out a subset',()=>{
    const p=product();const mod=loadModule('lib/shop.ts',{'@/lib/catalog':{CATALOG:[p],CATEGORY_LABEL:{}}});
    const input=[{productId:p.id,qty:7,color:'Blue',size:'S'},{productId:p.id,qty:2,color:'Blue',size:'M'}];
    const rows=mod.cartProducts(input);
    assert.equal(rows.length,2);assert.equal(rows[0].subtotal,70000);assert.equal(rows[0].selected,true);
    assert.equal(rows[1].selected,false);assert.equal(rows[1].selectionBlocked,true);assert.equal(rows[1].purchaseState.state,'sold_out');
    assert.equal(input[1].qty,2);
    const excluded=mod.cartProducts([{...input[1],selected:false}])[0];
    assert.equal(excluded.selectionBlocked,false);assert.equal(excluded.qty,2);assert.equal(excluded.selected,false);
});
test('cart reducer rejects unavailable direct additions and increases but permits removal',()=>{
    const p=product();const mocks={'@/lib/catalog':{findById:id=>id===p.id?p:undefined},'@/lib/storage':{},'@/lib/customer-api':{},'@/lib/cart-payment-reconciliation':{removePaidLineQuantities:()=>[]}};
    const {auditReducer}=loadModule('lib/store.tsx',mocks,'\nexports.auditReducer = reducer;');
    const initial={cart:[],wishlist:[],orders:[],user:null};
    const added=auditReducer(initial,{type:'ADD_TO_CART',productId:p.id,qty:9,color:'Blue',size:'S'});
    assert.equal(added.cart[0].qty,9);
    assert.equal(auditReducer(initial,{type:'ADD_TO_CART',productId:p.id,qty:1,color:'Blue',size:'M'}),initial);
    const restored={...initial,cart:[{productId:p.id,qty:2,color:'Blue',size:'M'}]};
    assert.equal(auditReducer(restored,{type:'SET_QTY',productId:p.id,qty:3,color:'Blue',size:'M'}),restored);
    assert.equal(auditReducer(restored,{type:'SET_QTY',productId:p.id,qty:1,color:'Blue',size:'M'}).cart[0].qty,1);
});
test('checkout checks inventory block before order submission; UI holds do not claim sold out',()=>{
    const checkout=read('app/checkout/page.tsx');
    assert.match(checkout,/if \(lines.length === 0 \|\| submitting \|\| inventoryBlocked\) return/);
    assert.ok(checkout.indexOf('if (inventoryBlocked)')<checkout.indexOf('data-payment-mode="test"'));
    assert.match(read('app/cart/page.tsx'),/purchaseStateLabel\(purchaseState, locale\)/);
    assert.match(read('components/products/ProductCard.tsx'),/!purchaseState.purchasable/);
});
test('generated contract covers only public metadata and resolver mirrors every current option',()=>{
    const document=json('lib/catalog/inventory.generated.json'), colors=json('lib/catalog/colors.json'),sizes=json('lib/catalog/sizes.json');
    assert.equal(document.schemaVersion,1);
    const observed={available:0,sold_out:0,unknown:0,supplier_request:0};
    for(const [folder,entry] of Object.entries(document.products)) {
        const p={colors:colors[folder]||[],sizes:sizes[folder]||[],inventory:inventory.inventoryForProduct(document,folder)};
        for(const option of entry.options) {
            const actual=inventory.optionPurchaseState(p,option.color,option.size);
            assert.equal(actual.state,entry.status==='unverified'?'unknown':option.availability,`${folder}/${option.color}/${option.size}`);
            observed[actual.state]++;if(actual.supplierRequest)observed.supplier_request++;
        }
    }
    assert.equal(Object.keys(document.products).length,67);
    assert.deepEqual(observed,{available:477,sold_out:52,unknown:234,supplier_request:290});
    assert.doesNotMatch(JSON.stringify(document),/sourceWorkbook|sourceMarker|internalStock|costPrice|[A-Z]:\\/);
});
