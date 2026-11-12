/** Read-only production-code audit. Does not invoke generative AI, reserve credits or submit site forms. */
import {mkdir,writeFile} from 'node:fs/promises';
import {extractWebsite} from '../lib/extractWebsite';
import {analyzeWebsitePurpose,isNonCommerce} from '../lib/websitePurpose';
import {collectOwnProductContext} from '../lib/ownProductSources';
import {collectBusinessDocuments} from '../lib/businessResearch';
import {collectSiteDiagnostics} from '../lib/collectSiteDiagnostics';
import {buildServiceStrategy} from '../lib/serviceStrategy';
import {buildAnswerContentPlan} from '../lib/answerContent';
import {classifyIndustry} from '../lib/industryClassifier';
import {nonCommercePlaybook} from '../lib/nonCommercePlaybook';
import {withBudget} from '../lib/runtime/budget';
async function main(){
const urls=process.argv.slice(2);
if(!urls.length)throw new Error('Pass public URLs as arguments.');
const dir=process.env.SCANNER_AUDIT_DIR||'/tmp/scanner-url-audit';
await mkdir(dir,{recursive:true});
const summaries:unknown[]=[];
for(let i=0;i<urls.length;i+=2){
 await Promise.all(urls.slice(i,i+2).map(async url=>{
  const started=Date.now(),id=new URL(url).hostname.replace(/[^\w.-]/g,'_')+new URL(url).pathname.replace(/[^\w.-]/g,'_');
  try{
   const result=await withBudget(30000,async()=>{
    const data=await withBudget(14000,()=>extractWebsite(url));
    const initial=analyzeWebsitePurpose(data);
    const [products,documents,diagnostics]=await Promise.all([
     !data.communityContext&&(!isNonCommerce(initial)||data.productDiscovery?.sources.length)?collectOwnProductContext(data.finalUrl,{seed:data.productDiscovery,robots:data.seoEvidence?.robots,budgetMs:7000}):undefined,
     data.collectionNotice||data.communityContext?data.businessDocuments||[]:collectBusinessDocuments(data.finalUrl,{seed:data.businessDocuments?.[0],robots:data.seoEvidence?.robots,productLinks:data.productDiscovery?.productLinks,links:data.businessLinks,nonCommerce:isNonCommerce(initial),budgetMs:6000}),
     collectSiteDiagnostics(data.finalUrl,{seed:data.diagnosticSeed,robots:data.seoEvidence?.robots,limited:!!data.collectionNotice,budgetMs:6000}),
    ]);
    if(products)data.productContext=products;
    const all=[...documents,...diagnostics.pages.filter(p=>!p.noindex).flatMap(p=>p.businessDocument?[p.businessDocument]:[])];
    data.businessDocuments=all.filter((d,j,a)=>a.findIndex(x=>x.url===d.url)===j).slice(0,9);
    if(diagnostics.medicalAudit)data.medicalAudit=diagnostics.medicalAudit;
    const purpose=analyzeWebsitePurpose(data),strategy=buildServiceStrategy(data),answers=buildAnswerContentPlan(data),category=await classifyIndustry(data);
    await writeFile(`${dir}/${id}.json`,JSON.stringify({data,purpose,strategy,answers,diagnostics},null,2));
    return {url,finalUrl:data.finalUrl,http:data.seoEvidence?.httpStatus,title:data.title,kind:purpose.kind,initialKind:initial.kind,sector:purpose.sector?.id||purpose.business?.id,category,book:isNonCommerce(purpose)?nonCommercePlaybook(purpose,[data.title,data.description,...data.h1].join(' '),data.diagnosticSeed?.page.localPlaceEvidence).id:undefined,place:data.diagnosticSeed?.page.localPlaceEvidence?.sector,seasons:data.diagnosticSeed?.page.localPlaceEvidence?.seasonal?.profiles.map(p=>p.id),bodyCharacters:data.bodyTextLength,documents:data.businessDocuments.length,products:products?.sources.length||0,productStatus:products?.status,strategy:strategy?.industry,stages:strategy?.segments.length||0,observedFindings:strategy?.findings.filter(f=>f.evidence.length).length||0,questions:answers.questions.length,placeApi:diagnostics.localPlaceLookup?.status,limited:data.collectionNotice||undefined};
   });
   const row={...result,elapsedMs:Date.now()-started};summaries.push(row);console.log(JSON.stringify(row));
  }catch(error){const row={url,error:error instanceof Error?error.message:String(error),elapsedMs:Date.now()-started};summaries.push(row);console.log(JSON.stringify(row));}
 }));
}
await writeFile(`${dir}/summary.json`,JSON.stringify(summaries,null,2));

}
void main().catch(error=>{console.error(error);process.exitCode=1;});
