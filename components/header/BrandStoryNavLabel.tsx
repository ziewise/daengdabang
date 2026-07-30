import headerStyles from "./Header.module.css";

export default function BrandStoryNavLabel({ label }: { label: string }) {
    const korean = label.startsWith("댕다방");
    return (
        <span className={headerStyles.storyLabel} aria-label={label}>
            <span className={headerStyles.storyBrand} aria-hidden="true">
                <span className={`${headerStyles.storyGlyph} ${headerStyles.storyTeal}`}>
                    {korean ? "댕" : "Daeng"}
                </span>
                <span className={`${headerStyles.storyGlyph} ${headerStyles.storyRed}`}>
                    {korean ? "다" : "Da"}
                </span>
                <span className={`${headerStyles.storyGlyph} ${headerStyles.storyOrange}`}>
                    {korean ? "방" : "Bang"}
                </span>
            </span>
            <span className={headerStyles.storySuffix} aria-hidden="true">
                {korean ? "스토리" : "Story"}
            </span>
        </span>
    );
}
