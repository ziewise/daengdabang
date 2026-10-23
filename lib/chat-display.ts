const TRAILING_SOURCE_MARKERS = /[ \t]*(?:\[\d{1,2}\][ \t]*)+(?=\r?$)/gm;
const PROVIDER_CHAT_URL = /https?:\/\/(?:www\.)?gemini\.google\.com[^\s<>"\])}]*/gi;
const PROVIDER_CHAT_NAME = /(?:google[ \t]+)?gemini|(?:구글[ \t]*)?(?:제미나이|제미니|지미니)/gi;

export function customerVisibleChatAnswer(answer: string, hasSources: boolean) {
    const customerAnswer = answer
        .replace(PROVIDER_CHAT_URL, "https://www.daengdabang.com/privacy/#overseas")
        .replace(PROVIDER_CHAT_NAME, "AI 상담");
    if (hasSources) return customerAnswer;
    return customerAnswer.replace(TRAILING_SOURCE_MARKERS, "");
}
