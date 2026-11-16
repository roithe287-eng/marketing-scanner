import {NextRequest} from 'next/server';
import {z} from 'zod';
import {requirePrincipal} from '@/lib/saas/auth';
import {limitRequest,rateLimit} from '@/lib/saas/store';
import {AccessError,failure,privateJson,readJson} from '@/lib/security/request';
import {publicUrl} from '@/lib/security/safeFetch';
import {diagnosticPageUrl} from '@/lib/collectSiteDiagnostics';
import {withBudget} from '@/lib/runtime/budget';
import {auditBacklinks} from '@/lib/backlinkAudit';

export const runtime='nodejs';
export const maxDuration=30;
const url=z.string().url().max(2048).refine(value=>{
  const parsed=new URL(value);
  return /^https?:$/.test(parsed.protocol)&&!parsed.username&&!parsed.password;
});
const schema=z.object({
  action:z.literal('links'),target:url,sources:z.array(url).min(1).max(6),brand:z.string().trim().max(100),
}).strict();
export async function POST(req:NextRequest){
  try{
    const principal=await requirePrincipal(req,true);
    const body=schema.parse(await readJson(req,16000));
    const target=publicUrl(body.target);
    const safeTarget=diagnosticPageUrl(target.href,target.href);
    if(!safeTarget)throw new AccessError(422,'검사 가능한 공개 페이지 주소를 사용해 주세요.');
    await limitRequest(req.headers,'search-evidence-links',8,180);
    if(principal.kind==='account')await rateLimit('search-evidence:links:'+principal.account.id,8,180);
    const rows=await withBudget(15000,()=>auditBacklinks(safeTarget,body.sources,body.brand),req.signal);
    return privateJson({rows,checkedAt:new Date().toISOString()});
  }catch(error){return failure(error);}
}
