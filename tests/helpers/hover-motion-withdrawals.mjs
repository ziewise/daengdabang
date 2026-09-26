import { readFileSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
export const motionWithdrawals = read('../fixtures/hover-motion-withdrawals-20260925.json');
const records = {
    ...read('../../lib/catalog/reviewed-flow-videos.json'),
    ...read('../../lib/catalog/reviewed-video-trims.json'),
    ...read('../../lib/catalog/reviewed-ziewcraft-single-videos.json'),
    ...read('../../lib/catalog/reviewed-ziewcraft-delegated-videos.json'),
};
const raw = read('../../lib/catalog/raw.json');
export const motionWithdrawnFolders = Object.keys(motionWithdrawals)
    .filter(folder => {
        const withdrawal = motionWithdrawals[folder];
        if (records[folder]) return records[folder].sha256 === withdrawal.sha256;
        // Unregistered legacy media has no approval record; retain its exact
        // product and reviewed path binding until an approved replacement exists.
        const row = raw.find(item => item.folder === folder);
        return row && `p_${row.no}` === withdrawal.productId && (
            withdrawal.video === `/images/products/catalog/${folder}/videos/${withdrawal.sha256}/hover.mp4`
            || withdrawal.video === row.video
        );
    });
