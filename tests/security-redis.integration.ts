import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { startRedisBridge } from "./helpers/redisBridge";
import {
  db,
  key,
  createAdmin,
  createCustomer,
  saveInquiry,
  issueAccount,
  activate,
  createSession,
  sessionAccount,
  updateAccount,
  reserve,
  usage,
  verifyPassword,
  reissueInvite,
  deleteSession,
  deleteAccount,
  getAccount,
  rateLimit,
} from "../lib/saas/store";
import { DEFAULT_FEATURES, Principal } from "../lib/saas/types";
import {
  saveSharedReport,
  getSharedReport,
  updateSharedReportCompetitor,
} from "../lib/shareStore";
import { getPrincipal, requireAdmin, SESSION_COOKIE } from "../lib/saas/auth";
import { fixture } from "./fixtures/report";
let bridge: Awaited<ReturnType<typeof startRedisBridge>>;
before(async () => {
  bridge = await startRedisBridge();
  process.env.UPSTASH_REDIS_REST_URL = bridge.url;
  process.env.UPSTASH_REDIS_REST_TOKEN = "local-test-token";
  process.env.VERCEL = "1";
  process.env.ALLOWED_IPS = "203.0.113.10";
  process.env.VERCEL_ENV = "preview";
});
after(async () => bridge?.close());
const req = (cookie = "", ip = "203.0.113.11") =>
  new NextRequest("https://scanner.example/api/access", {
    headers: {
      cookie: `${SESSION_COOKIE}=${cookie}`,
      "x-vercel-forwarded-for": ip,
    },
  });
const password = "example long secret for tests only";
test("inquiry, approval, single-use activation, login, ownership, concurrency and revocation", async () => {
  const admin = await createAdmin({
    email: "admin@example.com",
    name: "Test Admin",
    password,
  });
  await assert.rejects(
    () =>
      createAdmin({ email: "second@example.com", name: "Second", password }),
    { status: 409 },
  );
  const adminToken = await createSession(admin);
  await assert.rejects(() => requireAdmin(req(adminToken)), { status: 403 });
  assert.equal(
    (await requireAdmin(req(adminToken, "203.0.113.10"))).id,
    admin.id,
  );
  const inquiryId = await saveInquiry({
    name: "Test Customer",
    company: "Test",
    email: "customer@example.com",
    contact: "test contact",
    url: "https://example.com",
    message: "Test only",
    consent: true,
  });
  const issued = await issueAccount(
    inquiryId,
    {
      expiresAt: Date.now() + 86400000,
      monthlyLimit: 2,
      features: DEFAULT_FEATURES,
    },
    admin.id,
  );
  assert.equal(
    await sessionAccount(await createSession(issued.account)),
    null,
    "no session before activation",
  );
  const outcomes = await Promise.allSettled([
    activate(issued.invite, password),
    activate(issued.invite, password),
  ]);
  assert.equal(
    outcomes.filter((r) => r.status === "fulfilled").length,
    1,
    "activation is atomic",
  );
  const account = (
    outcomes.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<
      Awaited<ReturnType<typeof activate>>
    >
  ).value;
  assert.equal(await verifyPassword(password, account.passwordHash), true);
  assert.equal(await verifyPassword("wrong", account.passwordHash), false);
  await assert.rejects(() => activate(issued.invite, password), {
    status: 400,
  });
  const session = await createSession(account);
  assert.equal((await sessionAccount(session))?.id, account.id);
  assert.equal((await getPrincipal(req(session)))?.kind, "account");
  assert.equal(await getPrincipal(req("", "203.0.113.10")), null, 'registered IP alone never identifies an approved user');
  const principal: Principal = { kind: "account", account };
  const id = await saveSharedReport(fixture, principal);
  assert.ok(id);
  assert.equal((await getSharedReport(id, principal))?.url, fixture.url);
  const other: Principal = {
    kind: "account",
    account: { ...account, id: randomBytes(18).toString("hex") },
  };
  assert.equal(await getSharedReport(id, other), null);
  assert.equal(await updateSharedReportCompetitor(id, {}, other), false);
  await db().set("ms:preview:report:abc123", fixture, { ex: 60 });
  assert.equal(await getSharedReport("abc123", principal), null);
  assert.equal(await getSharedReport("abc123", { kind: "internal" }),null,"untraceable legacy age is not re-dated on read");
  const parallel = await Promise.allSettled(
    Array.from({ length: 12 }, () => reserve(principal, "analyze")),
  );
  assert.equal(
    parallel.filter((r) => r.status === "fulfilled").length,
    1,
    "concurrent calls share a lock and atomic quota",
  );
  const finish = (
    parallel.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<
      Awaited<ReturnType<typeof reserve>>
    >
  ).value;
  await finish(true);
  assert.equal(
    Number((await usage(account.id)).analyze),
    0,
    "failed analysis refund",
  );
  await finish(true);
  assert.equal(
    Number((await usage(account.id)).analyze),
    0,
    "refund is idempotent",
  );
  await (
    await reserve(principal, "analyze")
  )();
  await (
    await reserve(principal, "analyze")
  )();
  await assert.rejects(() => reserve(principal, "analyze"), { status: 429 });
  await (
    await reserve(principal, "competitor")
  )();
  assert.equal(
    Number((await usage(account.id)).analyze),
    2,
    "feature budgets are independent",
  );
  await updateAccount(
    account.id,
    account.version,
    {
      status: "suspended",
      expiresAt: account.expiresAt,
      monthlyLimit: 2,
      features: DEFAULT_FEATURES,
    },
    admin.id,
  );
  assert.equal(
    await sessionAccount(session),
    null,
    "suspension invalidates existing sessions",
  );
  await assert.rejects(
    () => reserve(principal, "deepdive"),
    { status: 403 },
    "stale loaded account cannot bypass atomic status check",
  );
  await deleteSession(session);
  assert.equal(await sessionAccount(session), null);
  const suspended = await getAccount(account.id);
  assert.ok(suspended);
  await updateAccount(
    account.id,
    suspended.version,
    {
      status: "approved",
      expiresAt: Date.now() + 86400000,
      monthlyLimit: 2,
      features: { ...DEFAULT_FEATURES, deepdive: false },
    },
    admin.id,
  );
  const restored = await getAccount(account.id);
  assert.ok(restored);
  await assert.rejects(
    () => reserve({ kind: "account", account: restored }, "deepdive"),
    { status: 403 },
  );
  const {invite} = await reissueInvite(account.id, admin.id);
  const activated = await activate(invite, password);
  const latest = await createSession(activated);
  await deleteAccount(account.id, activated.version, admin.id);
  assert.equal(
    await sessionAccount(latest),
    null,
    "deletion invalidates sessions",
  );
});
test("rate limits are atomic and storage failures do not authorize sessions", async () => {
  const calls = await Promise.allSettled(
    Array.from({ length: 15 }, () => rateLimit("parallel-test", 4, 60)),
  );
  assert.equal(calls.filter((r) => r.status === "fulfilled").length, 4);
  const url = process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_URL;
  await assert.rejects(
    () => sessionAccount(randomBytes(32).toString("base64url")),
    { status: 503 },
  );
  process.env.UPSTASH_REDIS_REST_URL = url;
});
test("HTTP handlers complete inquiry → approval → activation → login → private report → suspension", async () => {
  const login = await import("../app/api/login/route");
  const lead = await import("../app/api/lead/route");
  const management = await import("../app/api/admin/route");
  const activation = await import("../app/api/activate/route");
  const access = await import("../app/api/access/route");
  const share = await import("../app/api/share/route");
  const logout = await import("../app/api/logout/route");
  const setup = await import("../app/api/setup/route");
  const request = (
    path: string,
    body?: unknown,
    cookie = "",
    internal = false,
    method = body === undefined ? "GET" : "POST",
  ) =>
    new NextRequest("https://scanner.example" + path, {
      method,
      headers: {
        "content-type": "application/json",
        origin: "https://scanner.example",
        "x-vercel-forwarded-for": internal ? "203.0.113.10" : "203.0.113.12",
        cookie,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const adminLogin = await login.POST(
    request("/api/login", { email: "admin@example.com", password }, "", true),
  );
  assert.equal(adminLogin.status, 200);
  const adminCookie = adminLogin.headers.get("set-cookie")!.split(";")[0];
  assert.match(adminLogin.headers.get("set-cookie")!, /HttpOnly/i);
  assert.match(adminLogin.headers.get("set-cookie")!, /SameSite=strict/i);
  assert.equal(
    (await setup.POST(request("/api/setup", {}, "", false))).status,
    403,
  );
  assert.equal(
    (
      await lead.POST(
        request("/api/lead", {
          name: "Route Test",
          company: "Test",
          email: "routes@example.com",
          contact: "test only",
          consent: false,
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await lead.POST(
        request("/api/lead", {
          name: "Route Test",
          company: "Test",
          email: "routes@example.com",
          contact: "test only",
          consent: true,
          services: ['naver-ads', 'meta-ads'],
          planId: 'agency',
        }),
      )
    ).status,
    200,
  );
  for (const [email, services] of [['one-service@example.com', ['naver-ads']], ['no-service@example.com', []]] as const) {
    const submitted = await lead.POST(request('/api/lead', {
      name: 'Optional services', email, contact: 'test only', consent: true, services,
    }));
    assert.equal(submitted.status, 200);
  }
  const adminList = await management.GET(
    request("/api/admin", undefined, adminCookie, true),
  );
  assert.equal(adminList.status, 200);
  const savedInquiries = (await adminList.json()).inquiries;
  assert.deepEqual(savedInquiries.find((i: any) => i.email === 'one-service@example.com').services, ['naver-ads']);
  assert.deepEqual(savedInquiries.find((i: any) => i.email === 'no-service@example.com').services, []);
  const inquiry = savedInquiries.find(
    (i: any) => i.email === "routes@example.com",
  );
  assert.ok(inquiry);
  assert.deepEqual(inquiry.services, ['naver-ads', 'meta-ads']);
  assert.equal(inquiry.planId, 'agency');
  const storedInquiry = await db().get<{services: string[]; planId: string}>(key('inquiry:' + inquiry.id));
  assert.deepEqual(storedInquiry?.services, ['naver-ads', 'meta-ads']);
  assert.equal(storedInquiry?.planId, 'agency');
  assert.ok(Number(await db().ttl(key('inquiry:' + inquiry.id))) > 0);
  const grant = {
    expiresAt: Date.now() + 86400000,
    monthlyLimit: 3,
    features: DEFAULT_FEATURES,
  };
  const approve = await management.POST(
    request(
      "/api/admin",
      {
        action: "approve",
        inquiryId: inquiry.id,
        contactVerified: true,
        ...grant,
      },
      adminCookie,
      true,
    ),
  );
  assert.equal(approve.status, 200);
  const approved = await approve.json();
  assert.ok(approved.activationPath.startsWith("/activate#"));
  assert.equal(approved.account.passwordHash, undefined);
  const token = approved.activationPath.split("#")[1];
  assert.equal(
    (
      await activation.POST(
        request("/api/activate", { token, password, consent: false }),
      )
    ).status,
    400,
  );
  const enabled = await activation.POST(
    request("/api/activate", { token, password, consent: true }),
  );
  assert.equal(enabled.status, 200);
  const firstCookie = enabled.headers.get("set-cookie")!.split(";")[0];
  const loggedIn = await login.POST(
    request(
      "/api/login",
      { email: "routes@example.com", password },
      firstCookie,
    ),
  );
  assert.equal(loggedIn.status, 200);
  const customerCookie = loggedIn.headers.get("set-cookie")!.split(";")[0];
  assert.notEqual(customerCookie, firstCookie, "session rotates");
  assert.equal(
    (await access.GET(request("/api/access", undefined, firstCookie))).status,
    200,
  );
  assert.equal(
    (
      await (
        await access.GET(request("/api/access", undefined, firstCookie))
      ).json()
    ).kind,
    "guest",
  );
  const state = await access.GET(
    request("/api/access", undefined, customerCookie),
  );
  assert.equal((await state.json()).kind, "account");
  assert.match(state.headers.get("cache-control")!, /no-store/);
  assert.equal(
    (
      await management.GET(
        request("/api/admin", undefined, customerCookie, true),
      )
    ).status,
    403,
    "an approved customer cannot become an admin on the trusted network",
  );
  const save = await share.POST(
    request("/api/share", { report: fixture }, customerCookie),
  );
  assert.equal(save.status, 200);
  const { id } = await save.json();
  assert.equal(
    (await share.GET(request("/api/share?id=" + id, undefined, customerCookie)))
      .status,
    200,
  );
  assert.equal((await share.GET(request("/api/share?id=" + id))).status, 401);
  assert.equal(
    (
      await access.GET(
        request("/api/access?reports=1", undefined, customerCookie),
      )
    ).status,
    200,
  );
  const account = await getAccount(approved.account.id);
  assert.ok(account);
  assert.equal(
    (
      await management.POST(
        request(
          "/api/admin",
          {
            action: "update",
            id: account.id,
            version: account.version,
            status: "suspended",
            ...grant,
          },
          adminCookie,
          true,
        ),
      )
    ).status,
    200,
  );
  assert.equal(
    (await share.GET(request("/api/share?id=" + id, undefined, customerCookie)))
      .status,
    401,
  );
  assert.equal(
    (
      await login.POST(
        request("/api/login", { email: "routes@example.com", password }),
      )
    ).status,
    401,
  );
  assert.equal(
    (await logout.POST(request("/api/logout", {}, customerCookie))).status,
    200,
  );
});

test('benchmark Redis writes deduplicate repeated scans, expire old samples and separate methods/environments',async()=>{
 const {saveBenchmarkSample,getBenchmarkStats,benchmarkKeys,BENCHMARK_WINDOW_DAYS}=await import('../lib/benchmarkStore');
 const method='integration-v3',category='commerce',now=Date.now();
 await Promise.all(Array.from({length:12},(_,i)=>saveBenchmarkSample(category,fixture.diagnosis,'https://repeat.example/page-'+i,method,now)));
 assert.equal((await getBenchmarkStats(category,'https://self.example',method))?.sampleSize,1);
 assert.equal((await getBenchmarkStats(category,'https://repeat.example',method))?.sampleSize,0);
 await saveBenchmarkSample(category,{...fixture.diagnosis,seo:30},'https://repeat.example/changed',method,now+1);
 // Allow getBenchmarkStats' current clock to include the final update.
 const stats=await getBenchmarkStats(category,'https://self.example',method);
 assert.equal(stats?.sampleSize,1);assert.equal(stats?.metrics.seo?.average,30);
 await saveBenchmarkSample(category,fixture.diagnosis,'https://expired.example',method,now-(BENCHMARK_WINDOW_DAYS+1)*86400000);
 await saveBenchmarkSample(category,fixture.diagnosis,'https://other.example',method);
 assert.equal((await getBenchmarkStats(category,'https://self.example',method))?.sampleSize,2);
 assert.equal(Number(await db().hlen(benchmarkKeys(category,method)[0])),2);
 assert.equal((await getBenchmarkStats(category,'https://self.example','different-method'))?.sampleSize,0);
 process.env.VERCEL_ENV='production';
 try{assert.equal((await getBenchmarkStats(category,'https://self.example',method))?.sampleSize,0);}finally{process.env.VERCEL_ENV='preview';}
 assert.ok(Number(await db().ttl(benchmarkKeys(category,method)[0]))>0);
});

test('private report storage and account index are saved together with expiry; legacy claims are withheld on read',async()=>{
 const {listOwnReports}=await import('../lib/shareStore');
 const principal:Principal={kind:'internal'};
 const report={...fixture,industryBenchmark:{category:'commerce' as const,categoryLabel:'커머스',sampleSize:99,hasSufficientSample:true,summary:'unverified historical comparison'}};
 const id=await saveSharedReport(report,principal);assert.ok(id);
 assert.ok((await listOwnReports(principal)).some(r=>r?.id===id));
 const saved=await getSharedReport(id,principal);assert.equal(saved?.industryBenchmark?.hasSufficientSample,false);assert.equal(saved?.adWasteSimulation,null);
 assert.ok(Number(await db().ttl('ms:preview:report:'+id))>0);
 const index=key('reports:internal');await db().del(index);await db().set(index,'wrong-type-test');
 const before=await db().keys('ms:preview:report:*');
 try{await assert.rejects(()=>saveSharedReport(fixture,principal));assert.deepEqual((await db().keys('ms:preview:report:*')).sort(),before.sort(),'failed index write cannot leave an orphan report');}
 finally{await db().del(index);}
});

test('one-time PDF entitlement is atomic and bound to the customer and collected result', async t => {
  const { POST: adminPost } = await import('../app/api/admin/route');
  const { POST: activatePost } = await import('../app/api/activate/route');
  const { POST: loginPost } = await import('../app/api/login/route');
  const { POST: analyzePost } = await import('../app/api/analyze/route');
  const { POST: activityPost } = await import('../app/api/activity/route');
  const { POST: sharePost } = await import('../app/api/share/route');
  const { GET: accessGet } = await import('../app/api/access/route');
  const { websiteHttp } = await import('../lib/security/safeFetch');
  const { getPublicSharedReport } = await import('../lib/shareStore');
  const { generalEvidenceCases, generalPageResponse } = await import('./fixtures/general-evidence');
  const { digest } = await import('../lib/security/request');
  const owner = (await getAccount((await db().get<string>(key('admin-initialized')))!))!;
  const ownerSession = await createSession(owner);
  const ipA='203.0.113.81',ipB='2001:db8::81',adminIp='203.0.113.10';
  const email='single-pdf@example.com',origin='https://scanner.example';
  const terms={expiresAt:Date.now()+90*86400000,monthlyLimit:100,features:DEFAULT_FEATURES};
  const request=(path:string,body?:unknown,session='',ip=ipA,extra:Record<string,string>={})=>
    new NextRequest(origin+path,{method:body===undefined?'GET':'POST',
      headers:{origin,'content-type':'application/json','x-vercel-forwarded-for':ip,cookie:SESSION_COOKIE+'='+session,...extra},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
  const ownerRequest=(body:unknown)=>request('/api/admin',body,ownerSession,adminIp);
  const tokenFrom=(data:{activationPath:string})=>{
    assert.match(data.activationPath,/^\/activate#[\w-]{43}$/);
    return data.activationPath.split('#')[1];
  };
  const inquiryId=await saveInquiry({
    name:'1회권 테스트',company:'',email,contact:'test',url:'',message:'',planId:'single-pdf',consent:true,
  });
  const approval={paid:true,action:'approve',inquiryId,contactVerified:true,...terms};
  const issued=await adminPost(ownerRequest(approval));
  assert.equal(issued.status,200);
  const info=await issued.json(),token=tokenFrom(info);
  assert.equal(info.account.plan,'single-pdf');
  assert.equal(info.account.monthlyLimit,1);
  assert.deepEqual(info.account.features,{competitor:false,deepdive:false,reports:true});
  assert.equal(info.activationExpiresAt,Number(await bridge.command(['PEXPIRETIME',key('invite:'+digest(token))])));
  assert.ok(info.activationExpiresAt-Date.now()<=48*3600000);
  assert.equal((await adminPost(ownerRequest(approval))).status,409);
  const activateRequest=(value:string,ip=ipA,extra:Record<string,string>={})=>
    request('/api/activate',{token:value,password,consent:true},'',ip,extra);
  assert.equal((await activatePost(activateRequest(token,ipA,{origin:'https://other.example'}))).status,403);
  const activations=await Promise.all([activatePost(activateRequest(token)),activatePost(activateRequest(token,ipB))]);
  assert.deepEqual(activations.map(r=>r.status).sort(),[200,409]);
  const sessionA=activations.find(r=>r.ok)!.cookies.get(SESSION_COOKIE)!.value;
  const login=await loginPost(request('/api/login',{email,password},'',ipB));
  assert.equal(login.status,200);
  const sessionB=login.cookies.get(SESSION_COOKIE)!.value;
  assert.notEqual(sessionA,sessionB);

  const site=generalEvidenceCases[0],payload={url:site.url};
  const scan=(session:string,ip=ipA,body:unknown=payload)=>analyzePost(request('/api/analyze',body,session,ip));
  const access=async(session:string,ip=ipA)=>(await accessGet(request('/api/access?reports=1',undefined,session,ip))).json();
  const pdf=(session:string,reportId?:string,url:string=site.url,ip=ipA)=>activityPost(request('/api/activity',
    {action:'pdf_start',eventId:crypto.randomUUID(),scope:'full',url,...(reportId?{reportId}:{})},session,ip));
  assert.equal((await pdf(sessionA)).status,403);
  assert.equal((await analyzePost(request('/api/analyze',payload,'',ipB,{'x-forwarded-for':adminIp,'x-real-ip':adminIp}))).status,401);
  assert.equal((await scan(sessionA,ipA,{url:'https://smartstore.naver.com/sample'})).status,422);
  assert.equal((await access(sessionA)).usage.analyze,0);

  const nativeFetch=globalThis.fetch;
  const prior={OPENAI_API_KEY:process.env.OPENAI_API_KEY,ENABLE_LLM_CITATION:process.env.ENABLE_LLM_CITATION};
  t.after(()=>{for(const [key,value] of Object.entries(prior)){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
  process.env.OPENAI_API_KEY='synthetic-provider-only';
  process.env.ENABLE_LLM_CITATION='false';
  let providerFails=true;
  t.mock.method(globalThis,'fetch',async(input:Parameters<typeof fetch>[0],init?:RequestInit)=>{
    const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url);
    if(url.origin===new URL(bridge.url).origin)return nativeFetch(input,init);
    assert.equal(url.href,'https://api.openai.com/v1/chat/completions');
    const body=JSON.parse(String(init?.body));
    const value=body.messages[0].content.includes('업종 분류 도우미')?{category:'etc'}:fixture;
    return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(providerFails?null:value)},finish_reason:'stop'}]});
  });
  let pause=false,reached!:()=>void,release!:()=>void;
  const started=new Promise<void>(resolve=>{reached=resolve;});
  const unblock=new Promise<void>(resolve=>{release=resolve;});
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{
    if(pause){reached();await unblock;}
    return generalPageResponse(input);
  });
  const failed=await scan(sessionA);
  assert.ok(failed.status>=400,JSON.stringify(await failed.json()));
  assert.equal((await access(sessionA)).usage.analyze,0);
  providerFails=false;pause=true;
  const first=scan(sessionA);
  await Promise.race([started,first.then(response=>assert.fail('analysis did not start: '+response.status))]);
  try {
    const duplicate=await scan(sessionB,ipB);
    assert.equal(duplicate.status,429);
    assert.match((await duplicate.json()).message,/진행 중/);
  } finally{release();}
  const success=await first,report=await success.json();
  assert.equal(success.status,200,JSON.stringify(report));
  const id=report.sharedRetention.reportId;
  assert.equal((await access(sessionB,ipB)).usage.analyze,1);
  assert.deepEqual((await access(sessionB,ipB)).reports.map((r:{id:string})=>r.id),[id]);
  assert.equal(await getPublicSharedReport(id),null);
  const other=await createCustomer({...terms,email:'other-pdf@example.com',name:'Other',company:''},owner.id);
  const otherSession=await createSession(await activate(other.invite,password));
  assert.equal((await pdf(otherSession,id)).status,404);
  const freePdf=await pdf(otherSession);
  assert.equal(freePdf.status,200);
  assert.equal((await freePdf.json()).showWatermark,true);
  assert.equal((await sharePost(request('/api/share',{report},sessionA))).status,403);
  assert.equal((await pdf(sessionB,'notours123',site.url,ipB)).status,403);
  assert.equal((await pdf(sessionB,id,'https://different.example.com',ipB)).status,403);
  const paidPdf=await pdf(sessionB,id,site.url,ipB);
  assert.equal(paidPdf.status,200);
  const {ticket,showWatermark}=await paidPdf.json();
  assert.equal(showWatermark,false);
  assert.equal((await activityPost(request('/api/activity',{action:'pdf_event',eventId:crypto.randomUUID(),ticket,phase:'ready'},sessionA))).status,200);
  assert.equal((await pdf(sessionA,id)).status,200);
  assert.equal((await scan(sessionB,ipB)).status,429);

  const recovery={action:'reissue',id:info.account.id,contactVerified:true};
  const obsolete=tokenFrom(await (await adminPost(ownerRequest(recovery))).json());
  const replacement=tokenFrom(await (await adminPost(ownerRequest(recovery))).json());
  assert.equal((await activatePost(activateRequest(obsolete))).status,403);
  assert.equal((await access(sessionA)).kind,'guest');
  const recovered=await activatePost(activateRequest(replacement,ipB));
  assert.equal(recovered.status,200);
  const newSession=recovered.cookies.get(SESSION_COOKIE)!.value;
  assert.equal((await scan(newSession,ipB)).status,429);
  assert.equal((await pdf(newSession,id,site.url,ipB)).status,200);
  const now=Date.now(), clock=t.mock.method(Date,'now',()=>now+35*86400000);
  try{assert.equal((await scan(newSession,ipB)).status,429,'new calendar month');}
  finally{clock.mock.restore();}
  await bridge.command(['DEL','ms:preview:report:'+id]);
  assert.equal((await pdf(newSession,id,site.url,ipB)).status,404);
  assert.equal((await access(newSession,ipB)).usage.analyze,1);

  const screenOnly=await adminPost(ownerRequest({action:'create',name:'화면 진단',company:'',
    email:'single-screen@example.com',contactVerified:true,...terms,plan:'single',expiresAt:Date.now()+3600000}));
  assert.equal(screenOnly.status,200);
  const screenInfo=await screenOnly.json(),screenToken=tokenFrom(screenInfo);
  assert.equal(screenInfo.activationExpiresAt,screenInfo.account.expiresAt);
  const screen=await activatePost(activateRequest(screenToken));
  const screenSession=screen.cookies.get(SESSION_COOKIE)!.value;
  const screenReport=await scan(screenSession);
  assert.equal(screenReport.status,200);
  assert.equal((await screenReport.json()).sharedRetention,undefined);
  assert.equal((await pdf(screenSession,id)).status,403);
  assert.equal((await sharePost(request('/api/share',{report},screenSession))).status,403);
  assert.equal((await scan(screenSession,ipB)).status,429);
});
