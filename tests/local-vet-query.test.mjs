import assert from 'node:assert/strict';
import test from 'node:test';
import { localVetQuery, needsVetHoursCheck } from '../lib/local-vet-query.ts';
test('hours requested by the customer survive a generic CTA and map search', () => {
    for (const q of ['근처에 24시 병원있나?', '24시간 동물병원', '24/7 병원']) {
        assert.equal(localVetQuery(q, '동물병원'), '24시 동물병원');
        assert.equal(needsVetHoursCheck(localVetQuery(q)), true);
    }
    assert.equal(localVetQuery('근처 야간 병원', '동물병원'), '야간 동물병원');
    assert.equal(localVetQuery('근처 병원', '24시 동물병원'), '24시 동물병원');
    assert.equal(localVetQuery('동물병원 찾아줘'), '동물병원');
    assert.equal(needsVetHoursCheck('동물병원'), false);
});
