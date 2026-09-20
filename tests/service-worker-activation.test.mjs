import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('first controlled navigation cannot block service worker activation', async () => {
    const handlers = {};
    let activation;
    let navigationStarted = false;
    let releaseNavigation;
    const navigation = new Promise(resolve => { releaseNavigation = resolve; });
    const sandbox = {
        URL, Promise, Response,
        caches: { keys: async () => [], delete: async () => true },
        self: {
            addEventListener: (name, handler) => { handlers[name] = handler; },
            clients: {
                claim: async () => {},
                matchAll: async () => [{ url: 'https://www.daengdabang.com/products/',
                    navigate: () => { navigationStarted = true; return navigation; } }],
            },
        },
    };
    vm.runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), sandbox);
    handlers.activate({ waitUntil: promise => { activation = promise; } });
    try {
        const result = await Promise.race([
            activation.then(() => 'activated'),
            new Promise(resolve => setTimeout(() => resolve('blocked'), 100)),
        ]);
        assert.equal(result, 'activated');
        assert.equal(navigationStarted, true);
    } finally { releaseNavigation(); }
});
