import type {NextRequest} from 'next/server';
import {z} from 'zod';
import {requirePrincipal} from '@/lib/saas/auth';
import {limitRequest} from '@/lib/saas/store';
import {AccessError,failure,privateJson,readJson} from '@/lib/security/request';
import {withBudget} from '@/lib/runtime/budget';
import {canReadClinicWebsite} from '@/lib/clinicPlaceInsights';
import {clinicWebsite,collectClinicPage} from '@/lib/collectClinicComparison';

export const runtime='nodejs';
export const maxDuration=20;

export async function POST(req:NextRequest) {
  try {
    const principal=await requirePrincipal(req,true);
    if(!canReadClinicWebsite(principal)) throw new AccessError(403,'이 계정에서 병원 비교 이용 권한을 확인하세요.');
    const body=z.object({url:z.string().min(3).max(2048)}).strict().parse(await readJson(req,3500));
    const url=clinicWebsite(body.url);
    await limitRequest(req.headers,'clinic-comparison',12,60);
    return privateJson(await withBudget(12500,()=>collectClinicPage(url.href),req.signal));
  }catch(error){return failure(error);}
}
