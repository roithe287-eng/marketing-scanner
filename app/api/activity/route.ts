import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePrincipal } from '@/lib/saas/auth';
import { rateLimit } from '@/lib/saas/store';
import { startPdf, finishPdf, targetHost } from '@/lib/saas/activity';
import { AccessError, failure, privateJson, readJson } from '@/lib/security/request';
import { getSharedReport } from '@/lib/shareStore';
import { startNetworkPdf, finishNetworkPdf } from '@/lib/saas/networkPdf';
export const runtime='nodejs';
const schema=z.discriminatedUnion('action',[
  z.object({action:z.literal('pdf_start'),eventId:z.string().uuid(),scope:z.enum(['full','summary']),reportId:z.string().regex(/^[A-Za-z0-9]{4,12}$/).optional(),url:z.string().url().max(2048)}).strict(),
  z.object({action:z.literal('pdf_event'),eventId:z.string().uuid(),ticket:z.string().regex(/^[\w-]{43}$/),phase:z.enum(['ready','failed','save','open'])}).strict(),
]);
export async function POST(req:NextRequest){
  try{
    const principal=await requirePrincipal(req,true);
    const body=schema.parse(await readJson(req,4096));
    if(principal.kind==='internal'){
      if(body.action==='pdf_start'){
        if(body.reportId&&!(await getSharedReport(body.reportId,principal)))throw new AccessError(404,'보고서가 만료되었거나 열람 권한이 없습니다.');
        return privateJson({ticket:await startNetworkPdf(req.headers,body.eventId)});
      }
      await finishNetworkPdf(req.headers,body.ticket,body.phase);
      return privateJson({ok:true});
    }
    const account=principal.account;
    await rateLimit('activity:'+account.id,100,60);
    if(body.action==='pdf_start'){
      if(body.reportId&&!(await getSharedReport(body.reportId,principal)))throw new AccessError(404,'보고서가 만료되었거나 열람 권한이 없습니다.');
      const ticket=await startPdf(account.id,account.version,req.headers,{scope:body.scope,reportId:body.reportId,target:targetHost(body.url)},body.eventId);
      return privateJson({ticket});
    }
    await finishPdf(account.id,account.version,req.headers,body.ticket,body.phase,body.eventId);
    return privateJson({ok:true});
  }catch(error){return failure(error);}
}
