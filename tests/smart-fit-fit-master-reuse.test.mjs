import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("every background-ready path persists a photo-free Smart Fit master", async () => {
    const [background, helper] = await Promise.all([
        source("lib/pet-tryon-background.tsx"),
        source("lib/pet-tryon-fit-master.ts"),
    ]);

    const announceStart = background.indexOf("const announceReady = useCallback");
    const announceEnd = background.indexOf("const monitor = useCallback", announceStart);
    assert.ok(announceStart >= 0 && announceEnd > announceStart);
    const announce = background.slice(announceStart, announceEnd);
    assert.match(announce, /savePetTryOnFitMaster\(/);
    assert.match(announce, /ownerKey: completed\.ownerKey/);
    assert.match(announce, /petReferenceKey: completed\.petReferenceKey/);
    assert.match(announce, /jobId,/);
    assert.match(announce, /productImage: completed\.productImage/);

    for (const readyPath of [
        /if \(next\.status === "ready"\) \{\s*announceReady\(current\)/,
        /if \(first\.status === "ready"\) \{\s*announceReady\(started\)/,
        /if \(fresh\.status === "ready"\) \{\s*announceReady\(refreshed\)/,
    ]) {
        assert.match(background, readyPath);
    }

    assert.match(helper, /PET_TRYON_FIT_MASTER_STORAGE_PREFIX = "ddb\.tryon\.fit-master\.v2"/);
    assert.match(
        helper,
        /JSON\.stringify\(\{\s*jobId: value\.jobId\.trim\(\),\s*productImage: value\.productImage\.trim\(\),\s*\}\)/,
    );
    assert.doesNotMatch(helper, /JSON\.stringify\(\{[^}]*photo/si);
    assert.doesNotMatch(helper, /JSON\.stringify\(\{[^}]*token/si);
    assert.doesNotMatch(helper, /JSON\.stringify\(\{[^}]*imageDataUrl/si);
});

test("an indeterminate master restore never auto-starts another fitting", async () => {
    const modal = await source("components/products/detail/PetTryOnPreview.tsx");

    const restoreStart = modal.indexOf("const lookup = readPetTryOnFitMasterWithLegacy");
    const restoreEnd = modal.indexOf("useEffect(() => {", restoreStart);
    assert.ok(restoreStart >= 0 && restoreEnd > restoreStart);
    const restore = modal.slice(restoreStart, restoreEnd);
    assert.match(restore, /if \(lookup\.status === "missing"\)/);
    assert.match(restore, /getLatestPetTryOnMaster\(pet\.apiProfileId, product\.id, controller\.signal\)/);
    assert.match(restore, /remote\.status === "missing"/);
    assert.match(restore, /remote\.status !== "found"[\s\S]*setFitMasterRestoreBlocked\(true\)/);
    assert.match(restore, /jobId: remote\.sourceJobId/);
    assert.match(restore, /productImage: remote\.productImage/);
    assert.match(restore, /savePetTryOnFitMaster\(fitMasterIdentity/);
    assert.match(restore, /if \(lookup\.status !== "found"\)[\s\S]*setFitMasterRestoreBlocked\(true\)/);
    assert.match(
        restore,
        /if \(restored\?\.status !== "ready" \|\| !restored\.imageDataUrl\) \{[\s\S]*setFitMasterRestoreBlocked\(true\);[\s\S]*return;/,
    );

    const ambiguousResult = restore.slice(
        restore.indexOf('if (restored?.status !== "ready"'),
        restore.indexOf("const restoredFit", restore.indexOf('if (restored?.status !== "ready"')),
    );
    assert.doesNotMatch(ambiguousResult, /removePetTryOnFitMaster/);
    assert.doesNotMatch(ambiguousResult, /sessionStorage\.removeItem/);

    assert.match(modal, /if \(fitMasterRestorePending\) return/);
    assert.match(modal, /!fitMasterRestorePending[\s\S]*fitMasterRestoreBlocked[\s\S]*!sourceFit/);
    assert.doesNotMatch(modal, /void generate\(false\)/);
    assert.match(modal, /새 입혀보기는 자동으로 시작하지 않았습니다/);
    assert.match(modal, /새 결과가 필요할 때만 아래 새 이미지 생성 기능/);
});

test("server master lookup distinguishes a real miss from an unsafe transient failure", async () => {
    const [client, modal] = await Promise.all([
        source("lib/pet-tryon.ts"),
        source("components/products/detail/PetTryOnPreview.tsx"),
    ]);

    assert.match(client, /pet-tryon\/masters\/latest\?\$\{params\.toString\(\)\}/);
    assert.match(client, /data\.detail === MASTER_MISSING_DETAIL/);
    assert.match(client, /catch \{\s*return \{ status: "indeterminate" \}/);
    assert.match(client, /if \(!response\.ok\) return \{ status: "indeterminate" \}/);
    assert.match(client, /status: "found", sourceJobId, productImage, result/);

    const restoreStart = modal.indexOf("const lookup = readPetTryOnFitMasterWithLegacy");
    assert.ok(restoreStart >= 0);
    assert.match(modal, /getLatestPetTryOnMaster/);
    assert.match(modal, /setFitMasterRestorePending\(false\)/);
    assert.match(modal, /if \(fitMasterRestorePending\) return/);
    assert.doesNotMatch(modal, /void generate\(false\)/);
});

test("a legacy v1 fit master migrates without persisting the pet photo", async () => {
    const [modal, helper] = await Promise.all([
        source("components/products/detail/PetTryOnPreview.tsx"),
        source("lib/pet-tryon-fit-master.ts"),
    ]);

    assert.match(helper, /LEGACY_PET_TRYON_FIT_MASTER_STORAGE_PREFIX = "ddb\.tryon\.fit-master\.v1"/);
    assert.match(
        helper,
        /identity\.petProfileId,[\s\S]*identity\.productId,[\s\S]*legacyPetTryOnReferenceKey\(petReferenceImage\)/,
    );
    const migrationStart = helper.indexOf("export function readPetTryOnFitMasterWithLegacy");
    assert.ok(migrationStart >= 0);
    const migration = helper.slice(migrationStart);
    assert.match(
        migration,
        /legacy\.status === "found"[\s\S]*savePetTryOnFitMaster\(identity, legacy\.value\)[\s\S]*window\.sessionStorage\.removeItem\(legacyKey\)/,
    );
    assert.doesNotMatch(migration, /sessionStorage\.setItem\([^)]*petReferenceImage/s);
    assert.match(modal, /readPetTryOnFitMasterWithLegacy\(fitMasterIdentity, petReferenceImage\)/);

    const fitMaster = await import("../lib/pet-tryon-fit-master.ts");
    const records = new Map();
    const previousWindow = globalThis.window;
    globalThis.window = {
        sessionStorage: {
            getItem(key) {
                return records.get(String(key)) ?? null;
            },
            setItem(key, value) {
                records.set(String(key), String(value));
            },
            removeItem(key) {
                records.delete(String(key));
            },
        },
    };

    try {
        const petReferenceImage = "data:image/webp;base64,U0lERS1QSE9UTw==";
        let legacyHash = 0x811c9dc5;
        for (let index = 0; index < petReferenceImage.length; index += 1) {
            legacyHash = Math.imul(legacyHash ^ petReferenceImage.charCodeAt(index), 0x01000193);
        }
        const identity = {
            ownerKey: "user:7",
            petProfileId: 11,
            productId: "p_155",
            petReferenceKey: fitMaster.petTryOnReferenceKey(petReferenceImage),
        };
        const legacyKey = `ddb.tryon.fit-master.v1:11:p_155:${(legacyHash >>> 0).toString(36)}`;
        records.set(legacyKey, JSON.stringify({
            jobId: "pettryon-existing",
            productImage: "/images/products/catalog/rw/colors/strata.webp",
        }));

        const lookup = fitMaster.readPetTryOnFitMasterWithLegacy(identity, petReferenceImage);
        assert.deepEqual(lookup, {
            status: "found",
            value: {
                jobId: "pettryon-existing",
                productImage: "/images/products/catalog/rw/colors/strata.webp",
            },
        });
        assert.equal(records.has(legacyKey), false);
        const migratedRaw = records.get(fitMaster.petTryOnFitMasterStorageKey(identity));
        assert.deepEqual(JSON.parse(migratedRaw), lookup.value);
        assert.equal(migratedRaw.includes(petReferenceImage), false);
        assert.equal(/token|photoDataUrl|imageDataUrl/i.test(migratedRaw), false);
    } finally {
        globalThis.window = previousWindow;
    }
});
