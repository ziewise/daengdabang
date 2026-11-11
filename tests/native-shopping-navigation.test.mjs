import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('shopping and checkout route documents stay in the APK and bridge allowlist', () => {
    const bridge = readFileSync('components/native/NativeAppBridge.tsx', 'utf8');
    const packaging = readFileSync('scripts/prepare-native-web.mjs', 'utf8');
    for (const route of ['products', 'category', 'brand', 'brands', 'best', 'new', 'bundle', 'search', 'checkout', 'order-lookup']) {
        assert.ok(bridge.includes(`"/${route}"`), `${route} stays in app`);
        assert.ok(packaging.includes(`"${route}"`), `${route} is actually bundled`);
    }
    assert.ok(!bridge.includes('window.location.assign(canonicalWebUrl(url))'));
    assert.ok(bridge.includes('event.defaultPrevented'));
    assert.ok(bridge.includes('router.push(`/app/sticker/item/'));
    assert.ok(packaging.includes('await externalizeUnbundledMedia()'));
});

test('native app appearance has a durable UA fallback while bridge initializes', () => {
    const runtime = readFileSync('lib/native-runtime.ts', 'utf8');
    assert.match(runtime, /Capacitor\.isNativePlatform/);
    assert.ok(runtime.includes('DDBNative'));
    assert.ok(!runtime.includes('location.pathname'));
    for (const path of ['components/pwa/PwaInstallProvider.tsx', 'components/app-shell/useAppMode.ts']) {
        assert.ok(readFileSync(path, 'utf8').includes('isNativeAppRuntime()'));
    }
});
