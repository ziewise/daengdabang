const UNSAFE_REDIRECT_CHARACTERS = /[\\\u0000-\u001f\u007f]/;

export function safeInternalRedirect(value: string | null, origin: string): string | null {
    if (!value || !value.startsWith("/") || value.startsWith("//") || UNSAFE_REDIRECT_CHARACTERS.test(value)) {
        return null;
    }
    try {
        const decoded = decodeURIComponent(value);
        if (!decoded.startsWith("/") || decoded.startsWith("//") || UNSAFE_REDIRECT_CHARACTERS.test(decoded)) {
            return null;
        }
        const siteOrigin = new URL(origin).origin;
        const target = new URL(value, siteOrigin);
        if (target.origin !== siteOrigin) return null;
        if (!target.pathname.startsWith("/") || target.pathname.startsWith("//") || UNSAFE_REDIRECT_CHARACTERS.test(target.pathname)) {
            return null;
        }
        return `${target.pathname}${target.search}${target.hash}`;
    } catch {
        return null;
    }
}
