import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {startRedisBridge} from './helpers/redisBridge';
import {db,key} from '../lib/saas/store';
import {saveSharedReport,getSharedReport,updateSharedReportCompetitor,listOwnReports} from '../lib/shareStore';
import {migrateReportRetention,reportKey,READ_REPORT_LUA,retentionArgs} from '../lib/reportRetentionStore';
import {REPORT_RETENTION_SECONDS} from '../lib/reportRetention';
import {digest} from '../lib/security/request';
import {createDiagnosisBaseline} from '../lib/diagnosisComparison';
import {fixture} from './fixtures/report';
import {NextRequest} from 'next/server';
import {GET} from '../app/api/share/route';
let bridge:Awaited<ReturnType<typeof startRedisBridge>>;
const principal={kind:'internal'} as const,day=86400000;
before(async()=>{bridge=await startRedisBridge();process.env.UPSTASH_REDIS_REST_URL=bridge.url;process.env.UPSTASH_REDIS_REST_TOKEN='local-test-token';process.env.VERCEL_ENV='preview';process.env.VERCEL='1';process.env.ALLOWED_IPS='203.0.113.10';process.env.LOGIN_FREE_IP_HASHES=digest('203.0.113.10');});
after(async()=>bridge?.close());
beforeEach(async()=>{await bridge.command(['FLUSHDB']);});
const stored=(age:number,report=fixture)=>({version:2,ownerId:'internal',createdAt:Date.now()-age,report});

test('saved reports and owner indexes expire within seven days; reads, resaves and patches cannot extend them',async()=>{
 const id=await saveSharedReport(fixture,principal);assert.ok(id);
 const ttl=Number(await db().pttl(reportKey(id)));assert.ok(ttl>7*day-2000&&ttl<=7*day);
 assert.ok(Number(await db().ttl(key('reports:internal')))<=REPORT_RETENTION_SECONDS);
 const first=await getSharedReport(id,principal);assert.ok(first?.sharedRetention);
 assert.deepEqual(first.llmCitationTest?.results[0].sources,fixture.llmCitationTest?.results[0].sources);
 assert.equal(await updateSharedReportCompetitor(id,{searchKeyword:'검증 업종',competitors:[]},principal),true);
 const reread=await getSharedReport(id,principal);assert.ok(reread);assert.deepEqual(reread.competitorAnalysis?.competitors,[]);
 assert.equal(reread.sharedRetention?.expiresAt,first.sharedRetention.expiresAt);
 const copy=await saveSharedReport(first,principal);assert.ok(copy);
 assert.equal((await getSharedReport(copy,principal))?.sharedRetention?.expiresAt,first.sharedRetention.expiresAt);
});

test('expired old 21-day reports are deleted and denied by the actual baseline API; seven-day boundary is exclusive',async()=>{
 await db().set(reportKey('expired7'),stored(7*day),{ex:21*86400});
 const response=await GET(new NextRequest('https://scanner.example/api/share?id=expired7&mode=diagnosis',{headers:{'x-vercel-forwarded-for':'203.0.113.10'}}));
 assert.equal(response.status,404);assert.match(response.headers.get('cache-control')!,/no-store/);
 assert.equal(await db().exists(reportKey('expired7')),0);assert.equal(await updateSharedReportCompetitor('expired7',{},principal),false);
 assert.equal(await getSharedReport('expired7',principal),null);
});

test('comparison snapshots inherit the earlier source expiry; missing or expired baseline cannot be saved again',async()=>{
 await db().set(reportKey('prior123'),stored(6*day),{ex:21*86400});
 const prior=await getSharedReport('prior123',principal);assert.ok(prior?.sharedRetention);
 const combined={...fixture,diagnosisBaseline:createDiagnosisBaseline(prior,'prior123')};
 const id=await saveSharedReport(combined,principal);assert.ok(id);
 assert.equal((await getSharedReport(id,principal))?.sharedRetention?.expiresAt,prior.sharedRetention.expiresAt);
 assert.ok(Number(await db().ttl(reportKey(id)))<=86400);
 await db().del(reportKey('prior123'));
 assert.equal(await getSharedReport(id,principal),null);assert.equal(await db().exists(reportKey(id)),0);
 await assert.rejects(()=>saveSharedReport(combined,principal),{status:410});
});

test('deployment migration handles unread old data, preserves younger timestamps, and is idempotent and environment scoped',async()=>{
 await db().set(reportKey('old12345'),stored(8*day),{ex:21*86400});
 await db().set(reportKey('young123'),stored(2*day),{ex:21*86400});
 await db().set('ms:report:untouched',{private:'other environment'},{ex:21*86400});
 await db().set('ms:preview:citation:geo-v2.4:abc:questions',['old question'],{ex:21*86400});
 await db().set('ms:preview:citation:geo-v2.6-openai:abc:questions',['current question'],{ex:7*86400});
 await db().zadd(key('reports:internal'),{score:Date.now()-8*day,member:'old12345'},{score:Date.now()-2*day,member:'young123'});
 const result=await migrateReportRetention();assert.equal(result.checked,2);assert.equal(result.removed,1);
 assert.equal(await db().exists(reportKey('old12345')),0);assert.ok(Number(await db().ttl(reportKey('young123')))<=5*86400);
 const prior=await getSharedReport('young123',principal);assert.ok(prior);
 await migrateReportRetention();assert.equal((await getSharedReport('young123',principal))?.sharedRetention?.expiresAt,prior.sharedRetention?.expiresAt);
 assert.equal(await db().exists('ms:report:untouched'),1);
 assert.equal(await db().exists('ms:preview:citation:geo-v2.4:abc:questions'),0);assert.equal(await db().exists('ms:preview:citation:geo-v2.6-openai:abc:questions'),1);
 assert.deepEqual((await listOwnReports(principal)).map(r=>r?.id),['young123']);
});

test('Redis physically expires the record without another application read, and does not resurrect older records',async()=>{
 const now=Date.now();await db().set(reportKey('near1234'),{...stored(7*day-400),createdAt:now-7*day+400},{ex:21*86400});
 assert.ok(await getSharedReport('near1234',principal));
 await new Promise(resolve=>setTimeout(resolve,500));
 assert.equal(await bridge.command(['EXISTS',reportKey('near1234')]),0);
 await db().set(reportKey('bound123'),stored(7*day),{ex:21*86400});
 const value=await db().eval(READ_REPORT_LUA,[reportKey('bound123')],retentionArgs());
 assert.equal(value,null);assert.equal(await db().exists(reportKey('bound123')),0);
});
