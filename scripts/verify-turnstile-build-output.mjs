import { readFile } from "node:fs/promises";
import path from "node:path";

const outRoot = path.resolve("out");
const publicSiteKey = String(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    || "0x4AAAAAAD8Fivq7ZEMUPPwX",
).trim();

const pages = [
    "auth/signup/index.html",
    "forgot-password/index.html",
];

for (const relativePage of pages) {
    const pagePath = path.join(outRoot, ...relativePage.split("/"));
    const html = await readFile(pagePath, "utf8");

    if (html.includes("data-signup-bot-challenge-unavailable")) {
        throw new Error(`${relativePage} rendered the unavailable signup challenge.`);
    }

    if (!/data-signup-bot-challenge(?:=|\s|>)/.test(html)) {
        throw new Error(`${relativePage} did not render the signup challenge.`);
    }

    const referencedScripts = [
        ...html.matchAll(/(?:src|href)="([^"]+\.js)"/g),
    ].map((match) => match[1]);

    let publicKeyBundled = false;
    for (const scriptUrl of referencedScripts) {
        const pathname = new URL(scriptUrl, "https://build.invalid").pathname;
        const scriptPath = path.join(
            outRoot,
            ...decodeURIComponent(pathname).replace(/^\/+/, "").split("/"),
        );
        const script = await readFile(scriptPath, "utf8");
        if (script.includes(publicSiteKey)) {
            publicKeyBundled = true;
            break;
        }
    }

    if (!publicKeyBundled) {
        throw new Error(`${relativePage} did not bundle the public signup challenge key.`);
    }
}

console.log("Production signup challenge output verified.");
