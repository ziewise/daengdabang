import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("photo analysis explains local processing, realistic wait, and fail-closed retry", async () => {
    const modal = await readFile(new URL("components/petlens/PetLensModalContent.tsx", root), "utf8");

    assert.match(modal, /댕다방 로컬 분석 환경에서 꼼꼼히 살펴보고 있어요/);
    assert.match(modal, /보통 20~30초 정도/);
    assert.match(modal, /외부 사진 분석 API로 자동 전송되지 않았습니다/);
    assert.match(modal, /잠시 후 같은 사진으로 다시 시도해 주세요/);
    assert.match(modal, /role="status"/);
    assert.match(modal, /role="alert"/);
});
