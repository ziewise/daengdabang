import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

test("blank member widget starts fresh, visible followups retain context, new chat clears it", async () => {
    const slots = [];
    let index = 0;
    let effects = [];
    const sent = [];
    const listeners = new Map();
    const clear = () => {};
    const member = { apiUserId: 42, email: "test@example.invalid", pets: [] };
    const depsEqual = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
    const react = {
        useState(initial) {
            const key = index++;
            if (!(key in slots)) slots[key] = typeof initial === "function" ? initial() : initial;
            return [slots[key], (next) => { slots[key] = typeof next === "function" ? next(slots[key]) : next; }];
        },
        useRef(value) { const key = index++; return slots[key] ??= { current: value }; },
        useMemo(fn, deps) {
            const key = index++;
            if (!slots[key] || !depsEqual(slots[key].deps, deps)) slots[key] = { value: fn(), deps };
            return slots[key].value;
        },
        useEffect(fn, deps) {
            const key = index++;
            if (!slots[key] || !depsEqual(slots[key].deps, deps)) { slots[key] = { deps }; effects.push(fn); }
        },
        useLayoutEffect() { index++; },
        useSyncExternalStore(_subscribe, _get, server) { index++; return server(); },
    };
    const jsx = (type, props) => ({ type, props });
    const stubs = {
        react,
        "@/hooks/useChatWindow": { useChatWindow: () => ({ desktop: false }) },
        "@/lib/chat-widget-events": { CHAT_WIDGET_OPEN_EVENT: "open-chat", consumeChatWidgetOpen: () => undefined },
        "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
        "next/link": { default: "a" },
        "@/lib/store": { useAuth: () => ({ user: member }) },
        "@/lib/daengdabang-llm": {
            answerShopQuestionSmart: async (question, context) => {
                sent.push({ question, history: context.history, conversationId: context.conversationId });
                return { answer: "답변", delivery: { status: "live" }, conversationId: "new-visible-conversation" };
            },
        },
        "@/components/site/GenerationReferenceComposer": { useGenerationReferenceAttachments: () => ({ clear, readyReferences: [] }) },
        "@/lib/storage": { snapshots: {}, subscribeStorage() {} },
        "@/lib/storefront-analytics": { trackStorefrontEvent() {} },
        "@/lib/shop-chat-conversation": {
            loadShopChatConversationId: () => "invisible-old-emergency-conversation",
            clearShopChatConversationId() {}, saveShopChatConversationId() {},
            shopChatConversationOwnerKey: () => "member:42",
        },
        "@/lib/chat-display": { customerVisibleChatAnswer: text => text },
        "@/components/site/ChatResponseExtras": { customerFriendlyLocalCareAnswer: ({ answer }) => answer, isFollowUpBundlePrompt: () => false },
        "./ChatWidget.module.css": { default: {} },
    };
    const context = vm.createContext({
        AbortController, CustomEvent: class {},
        window: { addEventListener(name, fn) { listeners.set(name, fn); }, removeEventListener(name) { listeners.delete(name); }, requestAnimationFrame() { return 0; }, cancelAnimationFrame() {}, dispatchEvent() {} },
    });
    const code = ts.transpileModule(readFileSync(new URL("../components/site/ChatWidget.tsx", import.meta.url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const module = { exports: {} };
    new vm.Script(`(function(require,module,exports){${code}\n})`).runInContext(context)(name => stubs[name] || {}, module, module.exports);
    const render = () => {
        index = 0; effects = [];
        const tree = module.exports.default();
        for (const effect of effects) effect();
        return tree;
    };
    const find = (node, predicate) => {
        if (!node || typeof node !== "object") return undefined;
        if (predicate(node)) return node;
        for (const child of [node.props?.children].flat(Infinity)) {
            const found = find(child, predicate); if (found) return found;
        }
    };
    let tree = render();
    find(tree, node => node.type === "button" && node.props["aria-expanded"] !== undefined).props.onClick();
    const ask = async text => {
        tree = render();
        find(tree, node => node.type === "input").props.onChange({ target: { value: text } });
        tree = render();
        await find(tree, node => node.type === "form").props.onSubmit({ preventDefault() {} });
        // submit starts ask asynchronously; allow its resolved promise to settle.
        await Promise.resolve();
    };
    await ask("우리 강아지 삶은계란 먹어도되나?");
    assert.equal(sent[0].conversationId, undefined);
    assert.equal(sent[0].history.length, 0);
    await ask("준비 방법도 알려줘");
    assert.equal(sent[1].conversationId, "new-visible-conversation");
    assert.equal(sent[1].history.length, 2);
    tree = render();
    find(tree, node => node.type === "input").props.onChange({ target: { value: "작성 중인 문의" } });
    listeners.get("open-chat")({ detail: {} });
    tree = render();
    assert.equal(find(tree, node => node.type === "input").props.value, "작성 중인 문의");
    await ask("같은 대화 계속");
    assert.equal(sent[2].conversationId, "new-visible-conversation");
    assert.equal(sent[2].history.length, 4);
    await ask("초기화 전 네 번째 질문");
    assert.equal(sent[3].conversationId, "new-visible-conversation");
    assert.equal(sent[3].history.length, 6);
    await ask("초기화 전 다섯 번째 질문");
    assert.equal(sent[4].conversationId, "new-visible-conversation");
    assert.equal(sent[4].history.length, 8);
    await ask("초기화 전 여섯 번째 질문");
    assert.equal(sent.length, 5, "a sixth exchange must wait for an explicit reset");
    tree = render();
    assert.equal(find(tree, node => node.type === "input").props.disabled, true);
    assert.ok(find(tree, node => node.type === "button" && node.props.children === "새 상담 시작"));
    find(tree, node => node.type === "button" && node.props.children === "새 상담 시작").props.onClick();
    await ask("강아지 바나나 먹어도 돼?");
    assert.equal(sent[5].conversationId, undefined);
    assert.equal(sent[5].history.length, 0);
});
