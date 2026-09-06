/** Pure value checks only. No observation, approval, file access or publishing. */
const uuid = x => typeof x === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(x);
const sha = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
export const SCENE_KIND = 'google_flow_scene_download.v1';
const fields = ['kind','provider','projectId','providerSceneId','actualGenerationJobId','mediaAssetId','rawSha256','downloadEvidenceSha256'];
export function validSceneIdentity(x) {
  return Boolean(x && !Array.isArray(x) && Object.keys(x).length === fields.length
    && fields.every(k => Object.hasOwn(x,k)) && x.kind === SCENE_KIND && x.provider === 'google_flow_web'
    && uuid(x.projectId) && uuid(x.providerSceneId) && x.actualGenerationJobId === null
    && (x.mediaAssetId === null || uuid(x.mediaAssetId)) && sha(x.rawSha256) && sha(x.downloadEvidenceSha256));
}
export function sceneIdentityKey(x) {
  if (!validSceneIdentity(x)) return null;
  return fields.map(k => JSON.stringify(x[k])).join('|');
}
export function sameSceneIdentity(a,b) {
  const key=sceneIdentityKey(a); return key !== null && key===sceneIdentityKey(b);
}
/** Existing job-bound records retain exact provider/job equality; null alone is never identity. */
export function sameGenerationIdentity(a,b) {
  if (a?.generationIdentity || b?.generationIdentity) return a?.provider==='google_flow_web' && b?.provider==='google_flow_web'
    && a.jobId===null && b.jobId===null && sameSceneIdentity(a.generationIdentity,b.generationIdentity);
  return Boolean(a && b && a.provider===b.provider && typeof a.jobId==='string' && a.jobId.length>0 && a.jobId===b.jobId);
}
export function sameCatalogFlowIdentity(raw,review) {
  if (raw?.videoGenerationIdentity || review?.videoGenerationIdentity)
    return raw?.videoProvider==='google_flow_web' && raw.videoJobId===null && review?.videoJobId===null
      && sameSceneIdentity(raw.videoGenerationIdentity,review.videoGenerationIdentity)
      && review.sourceVideoSha256===review.videoGenerationIdentity.rawSha256;
  return raw?.videoJobId===review?.videoJobId;
}
