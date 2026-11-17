import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { haptic, hapticsEnabled, setHapticsEnabled } from '../lib/haptics.ts';
import { trackKeyboardVisibility } from '../lib/keyboard-visibility.ts';
import { locationFailureMessage } from '../lib/location-feedback.ts';
import { safeCashReceiptUrl } from '../lib/toss-cash-receipt.ts';
import { nativePaymentLaunchUrl, parseNativePaymentRequest } from '../lib/toss-native-payment.ts';

test('Korean composition preserves the draft and submits once only after composition ends', () => {
    const require = createRequire(import.meta.url);
    const ts = require('typescript');
    const source = fs.readFileSync(new URL('../components/search/ProductSearchForm.tsx', import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    let draft = '', index = 0, blurs = 0;
    const refs = [{current:false}, {current:{value:'',blur:()=>{blurs++;}}}];
    const hooks = {useState:()=>[draft,value=>{draft=value;}],useRef:()=>refs[index++],useEffect:()=>{}};
    const mod = {exports:{}};
    vm.runInNewContext(compiled, {module:mod,exports:mod.exports,require:id=>id==='react'?hooks:require(id)});
    const searches = [];
    const render = () => { index=0; return mod.exports.default({value:'',onSearch:value=>searches.push(value),label:'검색',placeholder:'상품 검색'}); };
    let form=render(), input=form.props.children[1];
    input.props.onCompositionStart();
    input.props.onChange({target:{value:'사룟'}});
    let prevented=false;
    input.props.onKeyDown({key:'Enter',nativeEvent:{isComposing:true},preventDefault:()=>{prevented=true;}});
    form.props.onSubmit({preventDefault(){}});
    assert.equal(prevented,true); assert.deepEqual(searches,[]); assert.equal(blurs,0);
    input.props.onChange({target:{value:'사료'}});
    input.props.onCompositionEnd(); refs[1].current.value='사료';
    form=render(); assert.equal(form.props.children[1].props.value,'사료');
    form.props.onSubmit({preventDefault(){}});
    assert.deepEqual(searches,['사료']); assert.equal(blurs,1);
});

test('haptics preference survives reloads and also disables feedback when storage writes fail', () => {
    const previousWindow = globalThis.window;
    const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const storage = new Map();
    let vibrations = 0;
    globalThis.window = Object.assign(new EventTarget(), {localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}});
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{vibrate:()=>{vibrations++;}}});
    try {
        assert.equal(hapticsEnabled(),true); haptic(); assert.equal(vibrations,1);
        setHapticsEnabled(false); haptic(); assert.equal(vibrations,1);
        assert.equal(storage.get('ddb:haptics-enabled'),'false');
        setHapticsEnabled(true); haptic(); assert.equal(vibrations,2);
        window.localStorage.setItem=()=>{throw new Error('storage full');};
        setHapticsEnabled(false); haptic(); assert.equal(vibrations,2); assert.equal(hapticsEnabled(),false);
    } finally {
        globalThis.window=previousWindow;
        if(previousNavigator) Object.defineProperty(globalThis,'navigator',previousNavigator); else delete globalThis.navigator;
    }
});

test('floating menu returns when keyboard closes with focus retained or focused search is removed', () => {
    const names=['window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement'];
    const saved=Object.fromEntries(names.map(name=>[name,globalThis[name]]));
    class Element {isContentEditable=false;}
    class Input extends Element {type='search';}
    globalThis.HTMLElement=Element; globalThis.HTMLInputElement=Input; globalThis.HTMLTextAreaElement=class extends Element {};
    const classes=new Set(); const frames=new Map(); let next=0;
    const viewport=Object.assign(new EventTarget(),{height:800,scale:1});
    globalThis.window=Object.assign(new EventTarget(),{innerHeight:800,visualViewport:viewport,
        requestAnimationFrame:callback=>{frames.set(++next,callback);return next;},cancelAnimationFrame:id=>frames.delete(id)});
    globalThis.document=Object.assign(new EventTarget(),{activeElement:null,documentElement:{classList:{toggle:(key,on)=>on?classes.add(key):classes.delete(key),remove:key=>classes.delete(key)}}});
    const flush=()=>{for(const [key,fn] of frames){frames.delete(key);fn();}};
    const update=()=>{window.dispatchEvent(new Event('resize'));flush();};
    const stop=trackKeyboardVisibility();
    try {
        document.activeElement=new Input(); update(); assert.equal(classes.has('ddb-app-typing'),false);
        viewport.height=450; window.innerHeight=450; update(); assert.equal(classes.has('ddb-app-typing'),true);
        viewport.height=800; window.innerHeight=800; update(); assert.equal(classes.has('ddb-app-typing'),false);
        viewport.height=450; update(); assert.equal(classes.has('ddb-app-typing'),true);
        document.activeElement=null; window.dispatchEvent(new Event('ddb-keyboard-refresh'));flush();assert.equal(classes.has('ddb-app-typing'),false);
        document.activeElement=new Input(); viewport.scale=2;update();assert.equal(classes.has('ddb-app-typing'),false);
    } finally {stop(); for(const name of names) globalThis[name]=saved[name];}
});

test('receipt handoff carries only the selected purpose and receipt links are restricted to Toss', () => {
    const request={clientKey:'live_ck_example12345',customerKey:'customer_fixture',orderId:'LIVE-fixture',orderName:'test',amount:10000,paymentMethod:'transfer',cashReceiptType:'지출증빙'};
    assert.deepEqual(parseNativePaymentRequest(new URL(nativePaymentLaunchUrl(request)).hash),request);
    assert.equal(safeCashReceiptUrl('https://evil.test/receipt'),undefined);
    assert.equal(safeCashReceiptUrl('javascript:alert(1)'),undefined);
    assert.ok(safeCashReceiptUrl('https://dashboard.tosspayments.com/receipt/cash-receipt?receiptKey=fixture'));
});

test('native location permission and dark status text are packaged without background location', () => {
    const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
    const manifest=read('android/app/src/main/AndroidManifest.xml');
    for(const permission of ['ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION']) assert.ok(manifest.includes(permission));
    assert.ok(!manifest.includes('ACCESS_BACKGROUND_LOCATION'));
    assert.match(read('capacitor.config.ts'), /style: "LIGHT"/);
    assert.match(read('ios/App/App/Info.plist'), /NSLocationWhenInUseUsageDescription/);
    assert.match(locationFailureMessage(1,true), /댕다방.*앱 사용 중 허용/);
    assert.match(locationFailureMessage(2,true), /위치 기능/);
});
