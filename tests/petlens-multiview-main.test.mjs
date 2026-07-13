import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readSource(path) {
    return readFile(new URL(path, root), "utf8");
}

test("main PetLens page and modal expose four camera slots instead of a single native upload", async () => {
    const [pageSource, modalSource, multiviewSource] = await Promise.all([
        readSource("app/pet-lens/PetLensClient.tsx"),
        readSource("components/petlens/PetLensModalContent.tsx"),
        readSource("lib/petlens-multiview.ts"),
    ]);

    for (const source of [pageSource, modalSource]) {
        assert.match(source, /PETLENS_PHOTO_VIEWS\.map/);
        assert.match(source, /data-petlens-photo-view=\{view\.id\}/);
        assert.match(source, /capture="environment"/);
        assert.match(source, /data-petlens-mobile-camera-capture/);
        assert.match(source, /buildPetLensAnalysisImage\(photoViews\)/);
        assert.match(source, /photoViews: photoViewMeta/);
        assert.doesNotMatch(source, /file:mr-3/);
        assert.doesNotMatch(source, /setImageFile/);
    }

    assert.match(pageSource, /data-petlens-page-multiview-upload/);
    assert.match(modalSource, /data-petlens-modal-multiview-upload/);
    assert.match(multiviewSource, /id: "front", label: "정면"/);
    assert.match(multiviewSource, /id: "left", label: "왼쪽"/);
    assert.match(multiviewSource, /id: "right", label: "오른쪽"/);
    assert.match(multiviewSource, /id: "back", label: "뒷면"/);
    assert.match(multiviewSource, /daengdabang-petlens-four-view\.jpg/);
});
