// Source-contract tests also exercise the original Korean layout after labels are localized.
export function koreanMarkup(source) {
    return source
        .replace(/=\{labelText\(("(?:\\.|[^"\\])*")\)\}/g, "=$1")
        .replace(/\{labelText\(("(?:\\.|[^"\\])*")\)\}/g, (_, label) => JSON.parse(label))
        .replace(/<LocalizedMenuLabel label=\{("(?:\\.|[^"\\])*")\} \/>/g, (_, label) => JSON.parse(label))
        .replace(/<LocalizedMenuLabel label=\{([\w.]+)\}(?: english="[^"]*")? \/>/g, "{$1}");
}
