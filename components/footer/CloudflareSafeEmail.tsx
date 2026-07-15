function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

export default function CloudflareSafeEmail({ email }: { email: string }) {
    return (
        <span
            dangerouslySetInnerHTML={{
                __html: `<!--email_off-->${escapeHtml(email)}<!--/email_off-->`,
            }}
        />
    );
}
