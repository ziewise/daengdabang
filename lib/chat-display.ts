const TRAILING_SOURCE_MARKERS = /[ \t]*(?:\[\d{1,2}\][ \t]*)+(?=\r?$)/gm;

export function customerVisibleChatAnswer(answer: string, hasSources: boolean) {
    if (!hasSources) return answer;
    return answer.replace(TRAILING_SOURCE_MARKERS, "");
}
