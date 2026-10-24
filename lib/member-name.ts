/**
 * member-name.ts — 회원 이름 정리 · 검사(2026-10-25 개인정보 페이지에서 꺼냄, 동작 그대로)
 * 유니코드 정규화(NFKC) → 제어문자 거부 → 공백 하나로 → 2~50자만 통과. 통과 못 하면 null.
 * 앱 · 웹 개인정보 화면이 같이 씀.
 */
export function normalizedMemberName(value: string): string | null {
    const normalized = value.normalize("NFKC");
    if (/\p{C}/u.test(normalized)) return null;
    const clean = normalized.replace(/\s+/g, " ").trim();
    const length = Array.from(clean).length;
    return length >= 2 && length <= 50 ? clean : null;
}
