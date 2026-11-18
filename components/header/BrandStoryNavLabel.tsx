import headerStyles from "./Header.module.css";

export default function BrandStoryNavLabel({ label }: { label: string }) {
    const korean = !label.endsWith("Story");
    return (
        <span className={headerStyles.storyLabel} aria-label={label}>
            <span className={headerStyles.storyBrand} aria-hidden="true">
                <span className={`${headerStyles.storyGlyph} ${headerStyles.storyTeal}`}>
                    댕
                </span>
                <span className={`${headerStyles.storyGlyph} ${headerStyles.storyRed}`}>
                    다
                </span>
                <span className={`${headerStyles.storyGlyph} ${headerStyles.storyOrange}`}>
                    방
                </span>
            </span>
            <span className={headerStyles.storySuffix} aria-hidden="true">
                {korean ? "스토리" : "Story"}
            </span>
        </span>
    );
}
