import type { ProductDetailContent } from "./product-detail-content";

const sections = {
    Features: "features", Specifications: "specifications", "Materials and ingredients": "composition",
    Use: "usage", Care: "care", "Important information": "cautions", Safety: "cautions",
} as const;

/** Render editable English copy in the same manufacturer theme and editorial sections. */
export function englishDetailSections(original: ProductDetailContent, description: string): ProductDetailContent {
    const lists = { features: [] as string[], specifications: [] as string[], composition: [] as string[],
        usage: [] as string[], care: [] as string[], cautions: [] as string[] };
    const paragraphs: string[] = [];
    for (const block of description.split(/\n\s*\n/)) {
        const [heading, ...body] = block.trim().split("\n");
        const key = sections[heading as keyof typeof sections];
        if (key) lists[key].push(...body.map(line => line.replace(/^•\s*/, "")));
        else if (/^(Brand|Country of origin|Manufacturer|Category|Options): /.test(heading)) lists.specifications.push(heading, ...body);
        else if (heading) paragraphs.push(block.trim());
    }
    return { ...original, ...lists, specs: undefined, safety: undefined, summary: paragraphs.join("\n\n") };
}
