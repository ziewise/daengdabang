/**
 * nav-current — 헤더 메뉴(Header) · 휴대폰 메뉴(MobilePanel)의 "지금 보고 있는 페이지" 판별 도우미 · 2026-10-26
 * ---------------------------------------------------------------------
 * 화면 표시(aria-current="page" · data-nav-current)에만 쓰는 순수 함수. 주소 · 이동 동작은 건드리지 않음.
 *  - 주소 끝 "/" · 물음표 뒤(?sub=…) · # 뒤는 비교에서 뺌(사이트는 trailingSlash: true)
 *  - isCurrentPath: 링크 하나가 지금 페이지인지(물음표가 붙은 링크는 같은 주소의 다른 화면이라 표시하지 않음)
 *  - isWithinPaths: 묶음 메뉴(쇼핑 · 매일 댕생활 …) 안의 어느 주소 아래에 있는지
 */

/** 주소에서 물음표 · # 뒤와 끝 "/" 를 뺀 비교용 경로 */
export function normalizeNavPath(path: string | null | undefined): string {
    const bare = (path || "/").split(/[?#]/)[0] || "/";
    return bare.length > 1 ? bare.replace(/\/+$/, "") || "/" : bare;
}

/** 링크(href)가 지금 페이지(pathname)인지 — 물음표가 붙은 링크는 false */
export function isCurrentPath(pathname: string | null | undefined, href: string): boolean {
    if (href.includes("?")) return false;
    return normalizeNavPath(pathname) === normalizeNavPath(href);
}

/** 지금 페이지가 hrefs 중 하나와 같거나 그 아래 주소인지(묶음 메뉴 단추 표시용) */
export function isWithinPaths(pathname: string | null | undefined, hrefs: readonly string[]): boolean {
    const current = normalizeNavPath(pathname);
    return hrefs.some((href) => {
        const base = normalizeNavPath(href);
        return base !== "/" && (current === base || current.startsWith(`${base}/`));
    });
}
