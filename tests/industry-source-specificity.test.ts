import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {reviewIndustry} from '../lib/industryClassifier';
import {industryDocuments,isIndustryOverview} from '../lib/industrySourceScope';
import type {BusinessDocument} from '../lib/businessContext';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {buildCompetitionScope,competitionMismatch,competitionScopeLabel,scopeAllowsKeyword} from '../lib/competitionScope';
import {captureCompetitorPage} from '../lib/competitorAnalysis';
import {finalizeSearchCandidates} from '../lib/competitorSelection';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildReportDocument} from '../lib/reportDocument';
import ReportIndustryEvidence from '../components/report/ReportIndustryEvidence';
import {fixture} from './fixtures/report';

const root='https://offering.example/';
const doc=(path:string,title:string,text:string,source:BusinessDocument['source']='merchant_html'):BusinessDocument=>({url:new URL(path,root).href,title,capturedAt:'2026-11-25T04:00:00.000Z',source,sections:[{heading:'서비스 소개',text}]});
const law=doc('/services/law','한빛 법률사무소','법률 상담을 제공합니다.');
const software=doc('/services/erp','한빛 ERP 소프트웨어','업무용 소프트웨어를 개발합니다.');
const archive=doc('/portfolio/academy','코딩 학원 교육 과정','교육 과정을 운영합니다.');
const summary=doc('/services/travel','해외 패키지 여행','가이드 투어를 운영합니다.','search_excerpt');
const website={url:root,finalUrl:root,title:'한빛 사업 소개',description:'법률 상담과 ERP 소프트웨어 사업을 소개합니다.',h1:['한빛의 사업 영역'],h2:[],bodyText:'법률 상담을 제공합니다. 업무용 소프트웨어를 개발합니다.',businessDocuments:[law,software,archive,summary]};

test('an overview exposes only confirmed separate businesses with clickable originals',()=>{
  const industryDecision=reviewIndustry(website);
  assert.equal(industryDecision.status,'review');
  if(industryDecision.status!=='review')assert.fail('Expected an overview with separate offerings');
  assert.equal(industryDecision.reason,'multiple_offers');
  assert.deepEqual(industryDecision.offerPages?.map(offer=>[offer.category,offer.url]),[['legal',law.url],['it_service',software.url]]);
  const sitePurpose=analyzeWebsitePurpose({...website,industryDecision});
  const report=MarketingReportSchema.parse({...fixture,url:root,industryDecision,sitePurpose});
  const result=renderToStaticMarkup(createElement(ReportIndustryEvidence,{report}));
  assert.match(result,/여러 사업 영역 확인.*확인한 사업별 상세 주소/);
  assert.ok(result.includes(`href="${software.url}"`));
  assert.ok(result.includes(`href="${law.url}"`));
  assert.ok(!result.includes(summary.url));
  assert.ok(buildReportDocument(report).some(block=>block.href===software.url));
});

test('a detail page ignores same-domain sibling services while keeping current and nested documents',()=>{
  const plans=doc('/services/erp/plans','한빛 ERP 요금 안내','업무용 소프트웨어를 운영합니다.');
  const data={...website,url:software.url,finalUrl:software.url,title:software.title,description:'회계 프로그램과 업무 솔루션을 제공합니다.',h1:['한빛 업무·회계 ERP 소프트웨어'],bodyText:software.sections[0].text,businessDocuments:[law,software,plans,archive,summary]};
  assert.deepEqual(industryDocuments(data.url,data.businessDocuments).map(entry=>entry.url),[software.url,plans.url]);
  const choice=reviewIndustry(data);
  assert.equal(choice.status,'matched');
  if(choice.status==='matched')assert.equal(choice.category,'it_service');
  assert.ok(choice.evidence.every(entry=>entry.url!==law.url));
  const scope=buildCompetitionScope({...data,industryDecision:choice});
  assert.equal(scope.profile,'software');
  assert.deepEqual(scope.serviceSpecialties,['업무·회계 ERP']);
});

test('route filters preserve functional query identity and ignore tracking-only differences',()=>{
  const current=doc('/service?id=77&lang=ko','한빛 ERP',software.sections[0].text);
  const different=doc('/service?lang=ko&id=78','한빛 법률 상담',law.sections[0].text);
  assert.deepEqual(industryDocuments(root+'service?utm_source=x&lang=ko&id=77#plans',[current,different]),[current]);
  assert.ok(isIndustryOverview(root+'ko/main/main.do?utm_medium=direct'));
  assert.ok(!isIndustryOverview(root+'?menu=hr'));
});

const perspectives=[
  ['insurance','자동차보험 상담','종신보험 상담','자동차·운전자보험'],
  ['legal','상속 전문 법률사무소','이혼 전문 법률사무소','상속·유언'],
  ['software','회계 ERP 소프트웨어 개발','학습 관리 시스템 개발','업무·회계 ERP'],
  ['international_logistics','해외이사 국제물류','해상화물 국제물류 포워딩','해외·귀국 이사'],
  ['travel','국내 여행 패키지 여행사','해외 패키지 여행사','국내 여행'],
] as const;
for(const [profile,ownName,otherName,focus] of perspectives)test(`same-role competition still verifies the service: ${profile}`,()=>{
  function capture(name:string,where:string){
    const url=`https://${where}.example/`;
    const description=profile==='international_logistics'?name+' 업무의 견적과 포장·통관 절차를 안내합니다.':name+' 서비스를 안내합니다.';
    return captureCompetitorPage(`<title>${name}</title><main><h1>${name}</h1><p>${description}</p><a href="/contact">상담 문의</a></main>`,url).scope!;
  }
  const own=capture(ownName,'our'),other=capture(otherName,'unrelated'),peer=capture(ownName,'verified');
  assert.equal(own.profile,profile);
  assert.equal(other.profile,profile);
  assert.deepEqual(own.serviceSpecialties,[focus]);
  assert.match(competitionMismatch(own,other)||'',/같은 세부 서비스/);
  assert.equal(competitionMismatch(own,peer),undefined);
  assert.equal(scopeAllowsKeyword(otherName,own),false);
  assert.ok(competitionScopeLabel(own).includes(focus));
});

test('a comparison verifies the service against the current candidate homepage',()=>{
  const candidates=['회계 ERP 소프트웨어 솔루션','학원 관리 시스템 소프트웨어 솔루션'].map((title,index)=>{
    const link=`https://candidate-${index}.example/`;
    return {...captureCompetitorPage(`<title>${title}</title><main><h1>${title}</h1><a href="/demo">상담 문의</a></main>`,link),link,domain:new URL(link).hostname,rank:index+1,searchRank:index+1,title,description:''};
  });
  const own=captureCompetitorPage('<title>회계 ERP 소프트웨어 솔루션</title><main><h1>회계 ERP 소프트웨어 솔루션</h1><a href="/demo">상담 문의</a></main>',root).scope!;
  assert.deepEqual(finalizeSearchCandidates(candidates,'소프트웨어',[],5,false,own).map(row=>row.domain),['candidate-0.example']);
});


test('learning software and education about developing it use different scopes',()=>{
  const scope=(title:string)=>captureCompetitorPage(`<title>${title}</title><main><h1>${title}</h1><p>${title} 안내</p><a href="/contact">문의</a></main>`,root).scope?.profile;
  assert.equal(scope('학습 관리 시스템 개발'),'software');
  assert.equal(scope('학습 관리 시스템 개발 교육 과정'),'education');
});
