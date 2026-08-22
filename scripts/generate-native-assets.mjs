import { access, mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourceIcon = path.join(
    projectRoot,
    "public",
    "images",
    "pwa",
    "daengdabang-black-poodle-app-icon-master-v3.png",
);
const androidResources = path.join(projectRoot, "android", "app", "src", "main", "res");
const iosAssets = path.join(projectRoot, "ios", "App", "App", "Assets.xcassets");
const storeAssets = path.join(projectRoot, "native", "store-assets");
const background = "#fffaf0";

const androidIconSizes = {
    mdpi: { legacy: 48, foreground: 108 },
    hdpi: { legacy: 72, foreground: 162 },
    xhdpi: { legacy: 96, foreground: 216 },
    xxhdpi: { legacy: 144, foreground: 324 },
    xxxhdpi: { legacy: 192, foreground: 432 },
};

async function writeAtomically(pipeline, destination) {
    const temporary = `${destination}.tmp.png`;
    await pipeline.png({ compressionLevel: 9 }).toFile(temporary);
    await rm(destination, { force: true });
    await rename(temporary, destination);
}

async function circleIcon(size, transparent = true) {
    const mask = Buffer.from(
        `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
    );
    const pipeline = sharp(sourceIcon)
        .resize(size, size, { fit: "cover" })
        .composite([{ input: mask, blend: "dest-in" }]);
    return transparent ? pipeline : pipeline.flatten({ background });
}

async function renderAndroidIcons() {
    for (const [density, sizes] of Object.entries(androidIconSizes)) {
        const directory = path.join(androidResources, `mipmap-${density}`);
        await mkdir(directory, { recursive: true });

        await writeAtomically(
            sharp(sourceIcon).resize(sizes.legacy, sizes.legacy, { fit: "cover" }),
            path.join(directory, "ic_launcher.png"),
        );
        await writeAtomically(
            await circleIcon(sizes.legacy, true),
            path.join(directory, "ic_launcher_round.png"),
        );

        const visibleSize = Math.round(sizes.foreground * 0.72);
        const foreground = await (await circleIcon(visibleSize, true)).png().toBuffer();
        await writeAtomically(
            sharp({
                create: {
                    width: sizes.foreground,
                    height: sizes.foreground,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 0 },
                },
            }).composite([{ input: foreground, gravity: "center" }]),
            path.join(directory, "ic_launcher_foreground.png"),
        );
    }
}

async function renderSplash(destination) {
    const metadata = await sharp(destination).metadata();
    if (!metadata.width || !metadata.height) throw new Error(`Invalid splash dimensions: ${destination}`);
    const iconSize = Math.round(Math.min(metadata.width, metadata.height) * 0.38);
    const icon = await sharp(sourceIcon).resize(iconSize, iconSize, { fit: "cover" }).png().toBuffer();
    await writeAtomically(
        sharp({
            create: {
                width: metadata.width,
                height: metadata.height,
                channels: 3,
                background,
            },
        }).composite([{ input: icon, gravity: "center" }]),
        destination,
    );
}

async function renderAndroidSplashes() {
    const directories = (await readdir(androidResources, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && entry.name.startsWith("drawable"))
        .map((entry) => path.join(androidResources, entry.name, "splash.png"));
    for (const destination of directories) {
        try {
            await access(destination);
            await renderSplash(destination);
        } catch (error) {
            if (error?.code !== "ENOENT") throw error;
        }
    }
}

async function renderIosAssets() {
    const appIcon = path.join(iosAssets, "AppIcon.appiconset", "AppIcon-512@2x.png");
    await writeAtomically(
        sharp(sourceIcon).resize(1024, 1024, { fit: "cover" }).flatten({ background }),
        appIcon,
    );

    const splashDirectory = path.join(iosAssets, "Splash.imageset");
    for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
        await renderSplash(path.join(splashDirectory, name));
    }
}

async function renderStoreAssets() {
    await mkdir(storeAssets, { recursive: true });
    await writeAtomically(
        sharp(sourceIcon).resize(512, 512, { fit: "cover" }).flatten({ background }),
        path.join(storeAssets, "google-play-icon-512.png"),
    );
    await writeAtomically(
        sharp(sourceIcon).resize(1024, 1024, { fit: "cover" }).flatten({ background }),
        path.join(storeAssets, "app-store-icon-1024.png"),
    );

    const icon = await sharp(sourceIcon).resize(420, 420, { fit: "cover" }).png().toBuffer();
    const typography = Buffer.from(`
        <svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
            <text x="500" y="205" font-family="Malgun Gothic, sans-serif" font-size="72" font-weight="900" fill="#0f172a">댕다방</text>
            <text x="504" y="272" font-family="Malgun Gothic, sans-serif" font-size="31" font-weight="700" fill="#087f8c">AI로 이어가는 우리 아이의 매일</text>
            <rect x="504" y="314" width="338" height="54" rx="27" fill="#ffffff" stroke="#5fd2df" stroke-width="3"/>
            <text x="535" y="350" font-family="Malgun Gothic, sans-serif" font-size="23" font-weight="800" fill="#0f172a">사진 · 행동 · 소리 · 건강 기록</text>
        </svg>
    `);
    await writeAtomically(
        sharp({ create: { width: 1024, height: 500, channels: 3, background } })
            .composite([
                { input: icon, left: 42, top: 40 },
                { input: typography, left: 0, top: 0 },
            ])
            .flatten({ background })
            .removeAlpha(),
        path.join(storeAssets, "google-play-feature-1024x500.png"),
    );
}

await access(sourceIcon);
await access(androidResources);
await access(iosAssets);
await renderAndroidIcons();
await renderAndroidSplashes();
await renderIosAssets();
await renderStoreAssets();

console.log("Native icons, splash screens, and store graphics generated from the approved DDB master icon.");
