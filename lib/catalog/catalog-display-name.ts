const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
    rw_everest_coat_25fw: "러프웨어 마운틴 에베레스트 인슐레이티드 도그 침대 커버 (2025FW)",
};

/** 원본 수집명은 보존하고, 상세 이미지로 확인된 오번역만 화면 표시 단계에서 교정한다. */
export function catalogDisplayName(name: string, folder?: string): string {
    const reviewedOverride = folder ? DISPLAY_NAME_OVERRIDES[folder] : undefined;
    if (reviewedOverride) return reviewedOverride;

    // 수집명 끝에 남은 "강아지"와 연도 꼬리표만 제거한다.
    return name.replace(/\s*강아지\s*\d*\s*$/, "").trim();
}
