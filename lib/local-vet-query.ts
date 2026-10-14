const HOURS_QUERY = /24\s*(?:시|시간)|24\s*\/\s*7|야간|응급|심야/;

export function needsVetHoursCheck(query: string) {
    return HOURS_QUERY.test(query);
}

export function localVetQuery(question: string, suggested = "") {
    // The customer's explicit hours take precedence over a generic model CTA.
    const hours = question.match(HOURS_QUERY)?.[0] ?? suggested.match(HOURS_QUERY)?.[0];
    if (hours) return `${/24/.test(hours) ? "24시" : hours} 동물병원`;
    return "동물병원";
}
