import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {safeCatalogHoverVideo} from '../lib/pet-tryon-eligibility.ts';
import {applyReviewedHoverOverride} from '../lib/catalog/reviewed-hover-overrides.ts';
import {visibleCatalogProducts} from '../lib/catalog/visible-products.ts';
import {visibleProductGroups} from '../lib/catalog/review-groups.ts';
const read=(p)=>JSON.parse(readFileSync(p,'utf8'));
const repo=resolve(import.meta.dirname,'..');
const raw=read(join(repo,'lib/catalog/raw.json'));
const groups=read(join(repo,'lib/catalog/product-groups.json'));
const listed=new Set(visibleProductGroups(visibleCatalogProducts(raw),groups).map(r=>r.folder));
const jobsRoot=resolve(process.argv[2]);
const jobs=[];
for(const dir of readdirSync(jobsRoot,{withFileTypes:true}).filter(d=>d.isDirectory())){
 const path=join(jobsRoot,dir.name,'job.json');if(!existsSync(path))continue;
 const job=read(path);
 for(const p of job.products||[])jobs.push({jobId:job.id,folder:p.folder,status:job.status,productStatus:p.status,stage:job.stage,shots:(p.shots||[]).map(s=>({id:s.id,status:s.status,review:s.humanReview?.status,path:s.resultPath})),sourceRejected:job.status==='source_rejected'||p.status==='source_rejected'});
}
const manifests=Object.fromEntries(readdirSync(join(repo,'lib/catalog')).filter(n=>/^reviewed-.+videos\.json$/.test(n)).map(n=>[n,read(join(repo,'lib/catalog',n))]));
const products=raw.filter((r,i,a)=>a.findIndex(x=>x.folder===r.folder)===i).map(row=>{
 const effective=applyReviewedHoverOverride(row);
 const video=safeCatalogHoverVideo({id:`p_${row.no}`,subcategory:'etc',folder:row.folder,name:row.name,image:row.image,video:effective.video,raw:effective});
 const manifestEntries=Object.entries(manifests).filter(([,m])=>m[row.folder]).map(([file,m])=>({file,status:m[row.folder].publicationStatus,quality:m[row.folder].videoQuality||m[row.folder].quality||m[row.folder].reviewScope}));
 const localJobs=jobs.filter(j=>j.folder===row.folder);
 return {folder:row.folder,no:row.no,name:row.name,listed:listed.has(row.folder),historical:row.supplierCatalogHistorical===true,isFood:row.isFood===true,video:video||null,provider:effective.videoProvider||null,quality:effective.videoQuality||null,manifestEntries,localJobs,
 status:!video?'missing_approved_dog_video':effective.videoQuality==='approved_product_contents'?'product_only_requires_dog_motion':'published_requires_full_motion_revalidation',
 fullMotionQaCompletedThisRun:false};
});
const counts={rawRows:raw.length,uniqueFolders:products.length,listed:products.filter(p=>p.listed).length,published:products.filter(p=>p.video).length,missing:products.filter(p=>!p.video).length,listedMissing:products.filter(p=>p.listed&&!p.video).length,productOnly:products.filter(p=>p.status==='product_only_requires_dog_motion').length,fullMotionQaCompletedThisRun:0};
writeFileSync(resolve(process.argv[3]),JSON.stringify({createdAt:new Date().toISOString(),sourceRepo:repo,counts,products},null,2)+'\n');
console.log(JSON.stringify(counts,null,2));
