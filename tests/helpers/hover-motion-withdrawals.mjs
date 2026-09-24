import { readFileSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
export const motionWithdrawals = read('../fixtures/hover-motion-withdrawals-20260925.json');
const records = read('../../lib/catalog/reviewed-ziewcraft-delegated-videos.json');
export const motionWithdrawnFolders = Object.keys(motionWithdrawals)
    .filter(folder => records[folder]?.sha256 === motionWithdrawals[folder].sha256);
