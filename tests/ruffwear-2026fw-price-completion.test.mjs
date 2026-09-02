import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const targets = {
    rw_climatechanger_vest_25fw: 92000,
    rw_climatechanger_jacket_25fw: 106000,
    rw_sunshower_coverall_25fw: 198000,
    rw_swampcooler_zipvest: 92000,
    rw_swampcooler_zipvest_2: 92000,
    rw_swampcooler_vest: 114000,
    rw_swampcooler_vest_2: 114000,
    rw_sunshower_jacket: 114000,
    rw_mteverrest_cot_26fw: 320000,
    rw_mteverrest_cotcover_26fw: 121000,
    rw_basecamp_bed: 121000,
    rw_basecamp_bed_m: 152000,
    rw_basecamp_bed_l: 182000,
    rw_highlands_pad_m: 78000,
    rw_highlands_pad_l: 106000,
    rw_highlands_sleepingbag_m: 168000,
    rw_highlands_sleepingbag_l: 218000,
    rw_barknboot_liners: 34000,
    rw_ridgeline_shoes_26: 92000,
    rw_griptrex_bootpairs: 76000,
    rw_basecamp_antisplash: 32000,
    rw_basecamp_slowfeeder: 32000,
    rw_basecamp_mat: 54000,
    rw_bivybowl_23: 54000,
    rw_kibblecaddy: 76000,
    rw_quencher_24: 38000,
    rw_trailrunnerbowl: 32000,
    rw_collar_chainreaction_martingale_24: 46000,
    rw_collar_chainreaction_martingale: 46000,
    rw_collar_crag: 54000,
    rw_collar_crag_23: 54000,
    rw_collar_frontrange_24: 36000,
    rw_collar_frontrange: 36000,
    rw_collar_nota: 38000,
    rw_collar_toprope: 62000,
    rw_collar_webreaction_martingale: 46000,
    rw_ridgeline_harness_26: 274000,
    rw_frontrangeflex_harness_26: 104000,
    rw_swampcooler_harness_2: 128000,
    rw_swampcooler_harness: 128000,
    rw_webmaster_harness: 121000,
    rw_hiandlight_harness_26: 76000,
    rw_hiandlight_harness_24: 76000,
    rw_flagline_harness_24: 104000,
    rw_frontrange_harness_24: 89000,
    rw_frontrange_harness: 89000,
    rw_loadup_harness_24: 162000,
    rw_backtrak_evac_kit: 196000,
    rw_hometrail_hippack: 76000,
    rw_treattrader_bag: 68000,
    rw_treattrader_23: 68000,
    rw_dirtbag_seatcover: 182000,
    rw_frontrangeflex_leash_26: 54000,
    rw_hitchhiker_leash_26: 106000,
    rw_leash_roamer: 76000,
    rw_leash_roamer_long: 84000,
    rw_leash_crag_23: 62000,
    rw_leash_crag: 62000,
    rw_leash_switchback_24: 89000,
    rw_doubletrack_coupler: 52000,
    rw_leash_frontrange_24: 38000,
    rw_leash_justacinch: 54000,
    rw_knotahitch: 162000,
    rw_leash_flagline_24: 46000,
    rw_leash_nota: 76000,
    rw_leash_nota_long: 62000,
    rw_leash_trailrunner_23: 52000,
    rw_trailrunner_vest: 162000,
    rw_floatcoat_lifejacket: 162000,
    rw_confluence_lifejacket: 182000,
    rw_beacon_light: 62000,
    rw_remix_balltoy_s_26: 24000,
    rw_remix_balltoy_m_26: 34000,
    rw_hydroplane_disc_m_25: 38000,
    rw_hydroplane_disc: 38000,
    rw_notarock: 38000,
    rw_gourdo_small: 24000,
    rw_gourdo_large: 32000,
    rw_pacificloop_toy: 38000,
    rw_pacificring_toy: 38000,
};

test("all yellow 2026FW Ruffwear price rows exist at the supplier price", async () => {
    const catalogUrl = new URL("../lib/catalog/raw.json", import.meta.url);
    const catalog = JSON.parse(await readFile(catalogUrl, "utf8"));
    const byFolder = new Map(catalog.map((row) => [row.folder, row]));

    assert.equal(Object.keys(targets).length, 80);
    for (const [folder, expectedPrice] of Object.entries(targets)) {
        const row = byFolder.get(folder);
        assert.ok(row, `missing Ruffwear listing: ${folder}`);
        assert.equal(row.priceNum, expectedPrice, `wrong Ruffwear price: ${folder}`);
        assert.equal(row.priceText, `${expectedPrice.toLocaleString("ko-KR")}원`, `wrong price label: ${folder}`);
    }
});

const yellowAdditionTargets = {
    rw_backtrak_evac_kit: { price: 196000, colors: ["cloudburst_gray.png"] },
    rw_doubletrack_coupler: { price: 52000, colors: ["basalt_gray.png"] },
    rw_knotahitch: { price: 162000, colors: ["red_clay.png"] },
    rw_trailrunner_vest: { price: 162000, colors: ["lichen_green.png", "blue_pool.png"] },
    rw_gourdo_small: { price: 24000, colors: ["sage_green.png", "heliotrope_purple.png", "campfire_orange.png"] },
    rw_gourdo_large: { price: 32000, colors: ["sage_green.png", "heliotrope_purple.png", "campfire_orange.png"] },
    rw_pacificring_toy: { price: 38000, colors: ["sockeye_red.png", "aurora_teal.png"] },
    rw_powderhound_jacket: { price: 168000, colors: ["obsidian_black.png", "polar_blue.png", "red_currant.png"] },
    rw_powderhound_waterproof_jacket_26fw: { price: 188000, colors: ["polar_blue.png", "red_currant.png"] },
    rw_powderhound_coverall_26fw: { price: 218000, colors: ["obsidian_black.png"] },
    rw_overcoat_fuse_jacket: { price: 168000, colors: ["brown_bear.png", "cedar_green.png", "purple_umber.png"] },
    rw_timberline_fuse_vest_26fw: { price: 148000, colors: ["deep_teal.png", "driftwood.png"] },
    rw_mt_hoodie_gaiter_26fw: { price: 48000, colors: ["basalt_gray.png", "deep_teal.png"] },
    rw_lumenglow_jacket_26fw: { price: 92000, colors: ["blaze_orange.png"] },
    rw_polartrex_boots_26fw: { price: 98000, colors: ["obsidian_black.png"] },
    rw_rogue_longline_26fw: { price: 54000, colors: ["basalt_gray.png", "blaze_orange.png"] },
    rw_remix_cactus_tug_26fw: { price: 38000, colors: ["surprise.png"] },
    rw_remix_soft_disc_26fw: { price: 38000, colors: ["surprise.png"] },
};

test("yellow additions and previously missing products include real product and color images", async () => {
    const [catalog, colors] = await Promise.all([
        readFile(new URL("../lib/catalog/raw.json", import.meta.url), "utf8").then(JSON.parse),
        readFile(new URL("../lib/catalog/colors.json", import.meta.url), "utf8").then(JSON.parse),
    ]);
    const byFolder = new Map(catalog.map((row) => [row.folder, row]));

    assert.equal(byFolder.get("rw_hiandlight_leash_26")?.priceNum, 36000);
    for (const [folder, expected] of Object.entries(yellowAdditionTargets)) {
        const row = byFolder.get(folder);
        assert.ok(row, `missing yellow addition product: ${folder}`);
        assert.equal(row.priceNum, expected.price, `wrong addition product price: ${folder}`);
        assert.deepEqual(colors[folder]?.map((color) => color.file), expected.colors, `wrong added colors: ${folder}`);
        await access(new URL(`../public/images/products/catalog/${folder}/${folder}.png`, import.meta.url));
        for (const file of expected.colors) {
            await access(new URL(`../public/images/products/catalog/${folder}/colors/${file}`, import.meta.url));
        }
    }
});

const newDetailTargets = {
    rw_backtrak_evac_kit: 5,
    rw_doubletrack_coupler: 2,
    rw_knotahitch: 5,
    rw_trailrunner_vest: 5,
    rw_gourdo_small: 5,
    rw_gourdo_large: 5,
    rw_pacificring_toy: 4,
    rw_powderhound_waterproof_jacket_26fw: 5,
    rw_powderhound_coverall_26fw: 5,
    rw_timberline_fuse_vest_26fw: 7,
    rw_mt_hoodie_gaiter_26fw: 6,
    rw_lumenglow_jacket_26fw: 6,
    rw_polartrex_boots_26fw: 4,
    rw_rogue_longline_26fw: 3,
    rw_remix_cactus_tug_26fw: 2,
    rw_remix_soft_disc_26fw: 2,
};

test("all 16 newly listed Ruffwear products have sourced detail-page content", async () => {
    const catalog = JSON.parse(await readFile(new URL("../lib/catalog/raw.json", import.meta.url), "utf8"));
    const byFolder = new Map(catalog.map((row) => [row.folder, row]));

    assert.equal(Object.keys(newDetailTargets).length, 16);
    for (const [folder, originalCount] of Object.entries(newDetailTargets)) {
        const row = byFolder.get(folder);
        assert.ok(row, `missing new Ruffwear product: ${folder}`);
        assert.match(row.sourceUrl ?? "", /^https:\/\/ruffwear\.com\/products\//, `unofficial detail source: ${folder}`);
        assert.ok(row.details?.length >= originalCount + 5, `incomplete enriched detail page: ${folder}`);

        assert.ok(row.details.every((detail) => !detail.endsWith("/details/1.webp")), `generated detail panel returned: ${folder}`);
        const originalVisuals = row.details.filter((detail) => !detail.includes("/official-visual-"));
        assert.equal(originalVisuals.length, originalCount, `original detail sequence changed: ${folder}`);
        for (let index = 0; index < originalCount; index += 1) {
            const expectedPath = `/images/products/catalog/${folder}/details/${index + 2}.webp`;
            assert.equal(originalVisuals[index], expectedPath, `wrong original detail image order: ${folder}`);
            await access(new URL(`../public${expectedPath}`, import.meta.url));
        }

        const officialVisuals = row.details.filter((detail) => detail.includes("/official-visual-"));
        assert.ok(officialVisuals.length >= 5, `manufacturer visuals missing: ${folder}`);
        for (const detail of officialVisuals) {
            assert.match(detail, /\/details\/official-visual-\d+\.webp$/, `unexpected enrichment asset: ${folder}`);
            assert.ok(row.detailImageLabels?.[detail], `manufacturer visual caption missing: ${folder}`);
            await access(new URL(`../public${detail}`, import.meta.url));
        }
    }
});
