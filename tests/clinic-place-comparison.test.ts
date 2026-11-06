import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import React from 'react';
import {load} from 'cheerio';
import AnswerContentPanel from '../components/report/AnswerContentPanel';
import {clinicWebsite,collectClinicPage} from '../lib/collectClinicComparison';
import {websiteHttp} from '../lib/security/safeFetch';
import {captureClinicMedia} from '../lib/clinicMedia';
import {buildHospitalPlaceReview} from '../lib/hospitalPlace';
import {canReadClinicWebsite,emptyFieldNotes,observationInsights,type ClinicObservation} from '../lib/clinicPlaceInsights';
import {hospitalPlaceReport,hospitalHtml} from './fixtures/hospital-place-report';
import {buildAnswerContentDocument} from '../lib/answerContentDocument';

const address='https://peer-clinic.example.org/';
test('the source reader fetches clinic HTML only and separately counts visible image and video markup',async t=>{
  const requests:string[]=[];
  const media='<img src="/front.jpg" alt="병원 외관"><img src="/front.jpg"><img src="/room.jpg" alt="진료실"><img src="/logo.png" alt="로고"><video src="/visit.mp4"></video><iframe src="https://www.youtube.com/embed/demo"></iframe><form><img src="/private.jpg"></form>';
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{
    requests.push(String(input));return String(input).endsWith('/robots.txt')?new Response('User-agent: *\nAllow: /'):
      new Response(hospitalHtml.replace('</main>',media+'</main>').replace('<title>','<meta name="description" content="진료시간과 예약 안내"><title>'),{headers:{'content-type':'text/html; charset=utf-8'}});
  });
  const facts=await collectClinicPage(address);
  assert.deepEqual(requests,[address+'robots.txt',address]);
  assert.equal(facts.description,'진료시간과 예약 안내');
  assert.deepEqual(facts.media,{images:2,described:2,videos:2,subjects:['외관·입구','진료 공간']});
  assert.ok(facts.terms?.some(t=>t.term==='이석증'));
  assert.ok(!JSON.stringify(facts).includes('.jpg'));
});

test('platform URLs, private routes, private IPs and credentials cannot be comparison targets',()=>{
  for(const url of ['https://m.place.naver.com/hospital/123','https://map.naver.com/p/entry/place/123','https://naver.me/abcdef','https://clinic.test/','http://127.0.0.1/','https://user:pw@clinic.example.org/','https://clinic.example.org/patient/results','https://clinic.example.org/%70atient/results','https://clinic.example.org/login','https://clinic.example.org/%6cogin','https://clinic.example.org/%2561dmin','https://clinic.example.org/index?auth=secret'])assert.throws(()=>clinicWebsite(url),url);
  assert.equal(clinicWebsite('peer-clinic.example.org/?utm_source=demo').href,address);
});

test('a robots denial or ambiguous response stops before HTML; redirects never fetch an external destination',async t=>{
  for(const robots of [new Response('User-agent: *\nDisallow: /'),new Response('no',{status:403}),new Response('maintenance',{status:503}),new Response('<html/>',{headers:{'content-type':'text/html'}})]){
    const calls:string[]=[];const mock=t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{calls.push(String(input));return robots;});
    await assert.rejects(()=>collectClinicPage(address));assert.deepEqual(calls,[address+'robots.txt']);mock.mock.restore();
  }
  const calls:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{calls.push(String(input));return String(input).endsWith('robots.txt')?new Response('',{status:404}):new Response(null,{status:302,headers:{location:'https://m.place.naver.com/hospital/123'}});});
  await assert.rejects(()=>collectClinicPage(address));assert.deepEqual(calls,[address+'robots.txt',address]);
});

test('unverifiable institutions and pages opting out of snippets cannot yield peer findings',async t=>{
  for(const html of ['<title>동물병원 가이드</title><p>진료시간</p>',hospitalHtml.replace('<title>','<meta name="robots" content="nosnippet"><title>')]){
    const mock=t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>String(input).endsWith('robots.txt')?new Response('',{status:404}):new Response(html,{headers:{'content-type':'text/html'}}));
    await assert.rejects(()=>collectClinicPage(address));mock.mock.restore();
  }
});

test('manual observations do not acquire homepage facts or provider-supplied registration values',()=>{
  const review=buildHospitalPlaceReview(hospitalPlaceReport().siteDiagnostics)!;
  const peer:ClinicObservation={name:'비교 병원',position:2,area:'부산',query:'이석증',seenAt:new Date().toISOString(),page:null,notes:{...emptyFieldNotes,photo:'외관·입구'}};
  const insights=observationInsights(review.page,peer,[]);
  assert.deepEqual(insights.map(i=>i.label),['플레이스 미디어']);
  const authorized={...peer,notes:{...peer.notes,registered:'이석증',description:'진료 예약과 주차 안내'}};
  assert.match(JSON.stringify(observationInsights(review.page,authorized,['이석증'])),/양쪽 입력 목록/);
  const pageOnly={...peer,page:{...review.page,description:'진료 예약과 주차 안내'},notes:emptyFieldNotes};
  assert.ok(!observationInsights(review.page,pageOnly,[]).some(i=>/등록값|플레이스 미디어/.test(i.label)));
  assert.deepEqual(captureClinicMedia(load('<main><div hidden><img src="/x.jpg"></div></main>')),{images:0,described:0,videos:0,subjects:[]});
});

test('keyword cards precede the comparison on a clinic report, including older snapshots and PDFs',()=>{
  const report=hospitalPlaceReport(),review=buildHospitalPlaceReview(report.siteDiagnostics)!;
  const render=(r:typeof review|undefined)=>load(renderToStaticMarkup(React.createElement(AnswerContentPanel,{plan:report.answerContentPlan,placeReview:r})));
  const $=render(review);assert.equal($('.hospital-place .hp-category').length,4);
  assert.equal($('.hospital-place').next().attr('aria-labelledby'),'hospital-place-comparison');
  assert.ok(buildAnswerContentDocument(report).some(x=>x.text==='플레이스 일반검색 비교'));
  const old=structuredClone(report);delete old.siteDiagnostics!.pages[0].medicalEvidence!.place!.media;
  assert.equal(buildHospitalPlaceReview(old.siteDiagnostics)?.page.media,null);
  assert.equal(render(undefined)('.hp-peer,.hospital-place').length,0);
});

test('read-only viewers can compare observations and see stored evidence without an account-only fetch button',()=>{
  const report=hospitalPlaceReport(),page=report.siteDiagnostics!.pages[0];
  delete page.medicalEvidence!.place!.media;
  page.description='진료시간과 방문 안내';
  const review=buildHospitalPlaceReview(report.siteDiagnostics)!;
  const render=(webAllowed:boolean)=>load(renderToStaticMarkup(React.createElement(AnswerContentPanel,{plan:report.answerContentPlan,placeReview:review,clinicWebAllowed:webAllowed})));
  assert.match(render(false)('.hp-baseline').text(),/진료시간과 방문 안내/);
  assert.equal(render(false)('.hp-reference button').length,0);
  assert.equal(render(true)('.hp-reference button').length,1);
  const features={competitor:false,reports:true,deepdive:false};
  assert.equal(canReadClinicWebsite(null),false);
  assert.equal(canReadClinicWebsite({kind:'guest'}),false);
  assert.equal(canReadClinicWebsite({kind:'account',account:{role:'customer',features}}),false);
  assert.equal(canReadClinicWebsite({kind:'account',account:{role:'customer',features:{...features,competitor:true}}}),true);
  assert.equal(canReadClinicWebsite({kind:'internal'}),true);
});
