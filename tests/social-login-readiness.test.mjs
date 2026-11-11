import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../components/auth/SocialAuthButtons.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;
const nodes = value => !value || typeof value !== 'object' ? []
    : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
const security = { requiredConsentsAccepted: true, botToken: 'verified', termsVersion: 'terms', privacyVersion: 'privacy' };

function render({ apiReady = true, enabled = null, checked = false, ...props } = {}) {
    const starts = [], resume = [];
    const state = [enabled, checked, 0];
    const loaded = { exports: {} };
    vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, URLSearchParams, process: { env: {} }, require: id => {
        if (id === 'react') return { ...require('react'), useEffect: () => {}, useMemo: fn => fn(), useState: () => [state.shift(), () => {}] };
        if (id === 'react/jsx-runtime') return require(id);
        if (id === '@/hooks/useDdbApiReady') return { useDdbApiReady: () => apiReady };
        if (id === '@/lib/customer-api') return { socialLoginHref: (provider, returnTo) => `https://api.daengdabang.com/api/v1/auth/social/${provider}/start?${new URLSearchParams({return_to:returnTo,mode:'login'})}`, startSocialLogin: (...args) => { starts.push(args); return true; } };
        if (id === '@/lib/ddb-api-base') return { PRODUCTION_DDB_API_BASE: 'https://api.daengdabang.com' };
        if (id === '@/lib/signup-email-verification') return { clearSignupEmailResume: () => resume.push('clear'), saveSignupEmailResume: () => resume.push('save') };
        throw new Error(`Unexpected import: ${id}`);
    } });
    const tree = loaded.exports.default({ mode: 'login', returnTo: '/checkout', ...props });
    const buttons = nodes(tree).filter(node => ['button', 'a'].includes(node.type) && node.props['aria-label']);
    return { buttons, starts, resume };
}

test('login starts while provider lookup is pending or failed, in both layouts', () => {
    for (const variant of ['compact', 'full']) for (const checked of [false, true]) {
        const result = render({ variant, checked });
        assert.equal(result.buttons.length, 3);
        for (const button of result.buttons) {
            assert.equal(button.props['aria-disabled'], false);
            button.props.onClick({ preventDefault() {} });
        }
        assert.deepEqual(JSON.parse(JSON.stringify(result.starts)), ['naver', 'kakao', 'google'].map(provider => [provider, '/checkout', { mode: 'login' }]));
        assert.deepEqual(result.resume, ['clear', 'clear', 'clear']);
    }
});

test('login respects a disabled provider and an unavailable API', () => {
    for (const variant of ['compact', 'full']) {
        const result = render({ variant, checked: true, enabled: { naver: false, kakao: true, google: true } });
        assert.equal(result.buttons[0].props['aria-disabled'], true);
        assert.equal(result.buttons[0].props.href, undefined);
        result.buttons[0].props.onClick({ preventDefault() {} });
        assert.equal(result.starts.length, 0);
        assert.equal(result.buttons[1].props['aria-disabled'], false);
        for (const apiReady of [false]) {
            const unavailable = render({ variant, apiReady });
            unavailable.buttons.forEach(button => { assert.equal(button.props['aria-disabled'], true); button.props.onClick({ preventDefault() {} }); });
            assert.equal(unavailable.starts.length, 0);
        }
    }
});

test('initial HTML has usable login links before hydration', () => {
    for (const variant of ['compact', 'full']) {
        const result = render({ apiReady: null, variant });
        for (const [index, provider] of ['naver', 'kakao', 'google'].entries()) {
            const button = result.buttons[index];
            assert.equal(button.type, 'a');
            assert.equal(button.props['aria-disabled'], false);
            assert.equal(button.props.href, `https://api.daengdabang.com/api/v1/auth/social/${provider}/start?return_to=%2Fcheckout&mode=login`);
        }
    }
});

test('signup waits for provider status, consent, and bot verification', () => {
    for (const variant of ['compact', 'full']) {
        const ready = { variant, mode: 'signup', checked: true, enabled: { naver: true, kakao: true, google: true }, signupSecurity: security };
        for (const override of [
            { checked: false, enabled: null }, { enabled: null },
            { signupSecurity: undefined },
            ...['requiredConsentsAccepted', 'botToken', 'termsVersion', 'privacyVersion'].map(key => ({ signupSecurity: { ...security, [key]: key === 'requiredConsentsAccepted' ? false : '' } })),
        ]) {
            const result = render({ ...ready, ...override });
            result.buttons.forEach(button => { assert.equal(button.props.disabled, true); button.props.onClick(); });
            assert.equal(result.starts.length, 0);
        }
        const result = render(ready);
        assert.equal(result.buttons[0].props.disabled, false);
        result.buttons[0].props.onClick();
        assert.deepEqual(JSON.parse(JSON.stringify(result.starts)), [['naver', '/checkout', { mode: 'signup', botToken: 'verified', termsVersion: 'terms', privacyVersion: 'privacy' }]]);
        assert.deepEqual(result.resume, ['save']);
    }
});
