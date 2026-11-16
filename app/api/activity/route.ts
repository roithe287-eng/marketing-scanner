import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePrincipal } from '@/lib/saas/auth';
import { rateLimit, singleUseRecord } from '@/lib/saas/store';
import { accountPlan } from '@/lib/saas/types';
import { startPdf, finishPdf, targetHost, captureActivity } from '@/lib/saas/activity';
import {NETWORK_ACTIVITY_ID} from '@/lib/saas/activityTypes';
import { AccessError, failure, privateJson, readJson } from '@/lib/security/request';
import { getSharedReport } from '@/lib/shareStore';
import { startNetworkPdf, finishNetworkPdf } from '@/lib/saas/networkPdf';
export const runtime='nodejs';
const schema=z.discriminatedUnion('action',[
  z.object({action:z.literal('document_export'),eventId:z.string().uuid(),format:z.enum(['html','markdown']),reportId:z.string().regex(/^[A-Za-z0-9]{4,12}$/).optional(),url:z.string().url().max(2048)}).strict(),
  z.object({action:z.literal('pdf_start'),eventId:z.string().uuid(),scope:z.enum(['full','summary']),reportId:z.string().regex(/^[A-Za-z0-9]{4,12}$/).optional(),url:z.string().url().max(2048)}).strict(),
  z.object({action:z.literal('pdf_event'),eventId:z.string().uuid(),ticket:z.string().regex(/^[\w-]{43}$/),phase:z.enum(['ready','failed','save','open','save_started','saved','save_cancelled','save_failed']),metrics:z.object({pages:z.number().int().min(1).max(1000).optional(),bytes:z.number().int().min(1).max(500_000_000).optional(),durationMs:z.number().int().min(0).max(3_600_000).optional()}).strict().optional()}).strict(),
]);
export async function POST(req:NextRequest){
  try{
    const principal=await requirePrincipal(req,true);
    const body=schema.parse(await readJson(req,4096));
    const plan=principal.kind==='account'?accountPlan(principal.account):'monthly';
    if(plan==='single')throw new AccessError(403,'이 이용권은 화면 열람만 제공하며 PDF·문서 저장은 포함하지 않습니다.');
    if(body.action==='document_export'){
      const accountId=principal.kind==='internal'?NETWORK_ACTIVITY_ID:principal.account.id;
      await rateLimit('document-export:'+accountId,30,60);
      if(body.reportId&&!(await getSharedReport(body.reportId,principal)))throw new AccessError(404,'보고서가 만료되었거나 열람 권한이 없습니다.');
      await captureActivity(accountId,body.format==='html'?'report_html_export':'report_markdown_export',req.headers,{target:targetHost(body.url),reportId:body.reportId,scope:'full'},body.eventId);
      return privateJson({ok:true});
    }
    if(principal.kind==='internal'){
      if(body.action==='pdf_start'){
        if(body.reportId&&!(await getSharedReport(body.reportId,principal)))throw new AccessError(404,'보고서가 만료되었거나 열람 권한이 없습니다.');
        return privateJson({ticket:await startNetworkPdf(req.headers,body.eventId,{scope:body.scope,reportId:body.reportId,target:targetHost(body.url)})});
      }
      await finishNetworkPdf(req.headers,body.ticket,body.phase,body.eventId,body.metrics);
      return privateJson({ok:true});
    }
    const account=principal.account;
    await rateLimit('activity:'+account.id,100,60);
    if(body.action==='pdf_start'){
      if(plan==='single-pdf'){
        const used=await singleUseRecord(account);
        if(!body.reportId||!used||(used!=='legacy'&&used!==`report:${body.reportId}`))throw new AccessError(403,'1회 진단권으로 완료한 보고서만 PDF로 받을 수 있습니다.');
      }
      const report=body.reportId?await getSharedReport(body.reportId,principal):null;
      if(body.reportId&&!report)throw new AccessError(404,'보고서가 만료되었거나 열람 권한이 없습니다.');
      if(plan==='single-pdf'&&report?.url!==body.url)throw new AccessError(403,'보고서에 저장된 진단 URL로 다시 요청해 주세요.');
      const ticket=await startPdf(account.id,account.version,req.headers,{scope:body.scope,reportId:body.reportId,target:targetHost(report?.url??body.url)},body.eventId);
      return privateJson({ticket,showWatermark:account.paid!==true});
    }
    await finishPdf(account.id,account.version,req.headers,body.ticket,body.phase,body.eventId,body.metrics);
    return privateJson({ok:true});
  }catch(error){return failure(error);}
}
