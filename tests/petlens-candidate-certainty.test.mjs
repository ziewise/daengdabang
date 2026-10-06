import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync("lib/daengdabang-llm.ts", "utf8");
const transpile = (code) => ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

test("even a very high model breed probability remains a visual candidate", () => {
    const start = source.indexOf("const breedCandidates: PetLensBreedCandidateView[] = [];");
    const end = source.indexOf("if (modelBacked && readyForRecommendation)", start);
    assert.ok(start > 0 && end > start);
    const result = vm.runInNewContext(transpile(`${source.slice(start, end)}
        addBreedCandidate("시츄", 0.99);
        addBreedCandidate("시바이누", 0.67);
        addBreedCandidate("믹스견", 0.1);
        breedCandidates;
    `), { PETLENS_BREED_CONFIDENCE_MIN: 0.65 });
    assert.deepEqual(Array.from(result, (item) => item.confidenceLabel), ["가까운 후보", "가까운 후보", "비교 필요"]);
});

test("usable photo status does not claim that the breed is verified", () => {
    const start = source.indexOf('const statusLabel: PetLensResultDetails["statusLabel"] = status ===');
    const end = source.indexOf("const title =", start);
    assert.ok(start > 0 && end > start);
    const code = transpile(`${source.slice(start, end)} statusLabel;`);
    assert.equal(vm.runInNewContext(code, { status: "ready" }), "후보 비교 필요");
    assert.equal(vm.runInNewContext(code, { status: "review" }), "후보 비교 필요");
    assert.equal(vm.runInNewContext(code, { status: "retake" }), "사진 보완 필요");
});
