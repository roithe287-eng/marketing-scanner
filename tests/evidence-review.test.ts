import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './fixtures/report';
import {finalizeReportEvidence,evidencePriorities} from '../lib/evidenceReview';
import {containsKeyword,reconcileKeywordMetadata} from '../lib/analyzeKeywordFreq';
import {reportForPresentation} from '../lib/reportPresentation';
import {buildReportDocument} from '../lib/reportDocument';
import {buildReportSummaryPage} from '../lib/reportSummaryPdf';
import {buildVisualPdfPages} from '../lib/reportVisualPdf';
import {buildDetailedReportPdf} from '../lib/reportReadingPdf';
import {buildObservationVisual} from '../lib/reportVisuals';
import {aggregateCitation} from '../lib/citationMeasurement';
import {activeCitation} from '../lib/activeCitation';
import {MarketingReportSchema,DiscoverabilitySchema,type MarketingReport,type LlmCitationQuestionResult} from '../lib/reportSchema';
import {DISCOVERY_KEYS,verifyReportEvidence} from '../lib/reportIntegrity';
import type {ExtractedWebsiteData} from '../lib/extractWebsite';
import type {PdfTextStyle} from '../lib/pdfLayout';
import EvidenceReviewPanel from '../components/report/EvidenceReviewPanel';
import {ObservationOverview} from '../components/visuals/ObservationVisuals';

const data={url:fixture.url,finalUrl:fixture.url,title:'진짜마케팅 | 광고대행·마케팅 컨설팅',description:'광고 운영과 마케팅 컨설팅을 제공합니다.',ogTitle:'진짜마케팅',ogDescription:'서비스 안내',h1:['광고대행·마케팅 컨설팅','광고대행·마케팅 컨설팅'],h2:['서비스 안내'],h3:[],buttons:['상담 문의','상담 문의','자세히 보기'],ctaButtons:['상담 문의','상담 문의'],anchorHrefs:['https://qz86j.channel.io'],links:[],bodyText:'컨설팅 운영 업무와 광고대행 서비스를 안내합니다. 컨설팅 운영 업무를 확인하세요.',bodyTextLength:60,imageCount:112,imageWithoutAlt:2,imageAlts:[],hasForm:false,hasContactInfo:false,hasReviewKeyword:true,hasTrustKeyword:true,hasPriceKeyword:false,viewportMeta:'width=device-width',pageSizeBytes:3_016_603,seoEvidence:{capturedAt:'2026-10-23T04:25:03.836Z',titleCount:1,descriptionCount:1,imagesEmptyAlt:16}} as unknown as ExtractedWebsiteData;
const discovery=DiscoverabilitySchema.parse({overallScore:74,summary:'기존 AI 의견',priorityActions:['H1 중복 해소','연락처 부재 개선'],...Object.fromEntries(DISCOVERY_KEYS.map(k=>[k,{id:k,label:k,score:70,status:'warning',currentValue:'연락처 부재 · H1 중복',diagnosis:'즉시 수정',guide:'H1 중복 제거'}]))});
const input:MarketingReport={...fixture,discoverability:discovery,pageEvidence:{version:1,requestedUrl:fixture.url,finalUrl:fixture.url,capturedAt:data.seoEvidence!.capturedAt,title:data.title,description:data.description,h1:data.h1,h2:data.h2,ctaButtons:data.ctaButtons,bodyText:data.bodyText,bodyTruncated:false},criticalIssues:[{title:'연락처 정보 부재',problem:'연락처가 없어 문의가 어렵다.',reason:'전환 손실',recommendation:'전화번호 추가',priority:'high'},{title:'H1 중복',problem:'H1 중복 때문에 순위가 낮다.',reason:'패널티',recommendation:'H1 삭제',priority:'high'},{title:'CTA 분산',problem:'CTA 4회 반복으로 집중도가 낮다.',reason:'전환 저하',recommendation:'버튼 삭제',priority:'high'}]};
const measure=(s:string,t:PdfTextStyle)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*t.size,0);

test('reported contact absence, H1 penalty and CTA-count conclusions become source-linked reviews across schema roundtrips',()=>{
  const before=JSON.stringify(input),r=MarketingReportSchema.parse(JSON.parse(JSON.stringify(finalizeReportEvidence(input,data))));
  assert.equal(JSON.stringify(input),before);
  assert.equal(r.evidenceReview?.score,83);assert.equal(r.evidenceReview?.passed,5);assert.equal(r.evidenceReview?.assessed,6);
  assert.equal(r.checklist?.find(c=>c.id==='contact_info')?.status,'review');
  assert.match(r.checklist!.find(c=>c.id==='contact_info')!.currentValue,/channel\.io/);
  assert.equal(r.checklist?.find(c=>c.id==='h1')?.status,'pass');
  assert.equal(r.discoverability!.contentStructure.currentValue,r.checklist!.find(c=>c.id==='h1')!.currentValue);
  assert.equal(r.discoverability!.eeat.currentValue,r.checklist!.find(c=>c.id==='contact_info')!.currentValue);
  assert.doesNotMatch(JSON.stringify([r.criticalIssues,r.discoverability!.priorityActions]),/전화번호 추가|H1 삭제|버튼 삭제|전환 손실|순위가 낮다/);
  assert.ok(r.criticalIssues.every(i=>i.evidenceStatus==='review'&&i.priority==='low'));
  assert.ok(r.checklist!.every(c=>c.sourceUrl===fixture.url&&c.capturedAt===data.seoEvidence!.capturedAt));
  assert.equal(MarketingReportSchema.safeParse({...r,evidenceReview:{...r.evidenceReview,sourceUrl:'javascript:alert(1)'}}).success,false);
});

test('unmeasured axes have no score; HTML percentage is deterministic and empty ALT attributes stay valid',()=>{
  const r=finalizeReportEvidence(input,{...data,imageWithoutAlt:0});
  assert.equal(r.evidenceReview?.score,100);
  assert.deepEqual(r.evidenceReview!.axes.filter(a=>a.status==='unmeasured').map(a=>a.key),['firstView','conversionFlow','adLanding','mobileUx']);
  for(const axis of r.evidenceReview!.axes)assert.equal('score' in axis,false);
  const html=renderToStaticMarkup(React.createElement(EvidenceReviewPanel,{review:r.evidenceReview!}));
  assert.match(html,/미측정/);assert.match(html,/산식과 원문 근거/);assert.doesNotMatch(html,/70점|65점|우수|취약/);
  const noImages=finalizeReportEvidence(input,{...data,imageCount:0,imageWithoutAlt:0});
  assert.equal(noImages.evidenceReview?.unknown,1);assert.equal(noImages.evidenceReview?.assessed,5);
});

test('stored metadata flags are reconciled once from matching page evidence and no input observations are mutated',()=>{
  const stale={...input,keywordFrequency:{totalTokens:100,uniqueSingles:2,uniquePhrases:0,singles:['컨설팅','광고'].map(keyword=>({keyword,count:12,density:12,inTitle:false,inMetaDescription:false})),phrases:[]}};
  const before=JSON.stringify(stale),r=reportForPresentation(stale);
  assert.equal(JSON.stringify(stale),before);assert.ok(r.keywordFrequency!.singles.every(k=>k.inTitle&&k.inMetaDescription));
  const wrong=reportForPresentation({...stale,pageEvidence:{...stale.pageEvidence!,requestedUrl:'https://other.example'}});
  assert.equal(wrong.keywordFrequency!.singles[0].inTitle,false);
  assert.equal(containsKeyword('광고대행·마케팅 컨설팅','광고'),true);assert.equal(containsKeyword('consulting service','consult'),false);
  assert.deepEqual(reconcileKeywordMetadata(r.keywordFrequency!,data.title,data.description),r.keywordFrequency);
  const text=buildReportDocument(r).map(b=>b.text).join('\n');
  assert.match(text,/컨설팅 · 12회 · 빈도 12% · 제목 포함 · 설명 포함/);
  assert.doesNotMatch(text,/컨설팅 · 12회[^\n]*미포함/);
});

test('a 1/5 aggregate cannot hide that the only citation came from an explicitly branded question',()=>{
  const rows:LlmCitationQuestionResult[]=Array.from({length:5},(_,i)=>({...fixture.llmCitationTest!.results[0],question:`질문 ${i}`,branded:i===4,cited:i===4}));
  const citation={...fixture.llmCitationTest!,...aggregateCitation(rows),results:rows,ownedCitationRate:99};
  const current=activeCitation(citation),v=buildObservationVisual(current)!;
  assert.equal(current.ownedCitationRate,20);assert.equal(v.unbrandedRate,0);assert.equal(v.unbrandedTotal,4);assert.equal(v.brandedRate,100);assert.equal(v.brandedTotal,1);
  const html=renderToStaticMarkup(React.createElement(ObservationOverview,{citation}));
  assert.match(html,/브랜드 미포함 질문/);assert.match(html,/4건 중 0건/);assert.match(html,/1건 중 1건/);
  const unknown=aggregateCitation([{...rows[0],branded:undefined},{...rows[1],status:'timeout'}]);
  assert.equal(unknown.unbrandedTests,0);assert.equal(unknown.unbrandedCitationRate,null);assert.equal(unknown.unclassifiedTests,1);
  const duplicates=aggregateCitation([rows[0],{...rows[0],cited:true}]);assert.equal(duplicates.unbrandedTests,0);
});

test('all PDF views use evidence counts and omit unsupported score panels; compact detail retains unique words and sources',()=>{
  const words=Array.from({length:30},(_,i)=>({keyword:`서비스항목${i}`,count:30-i,density:1,inTitle:false,inMetaDescription:false}));
  const r=finalizeReportEvidence({...input,keywordFrequency:{totalTokens:1000,uniqueSingles:30,uniquePhrases:0,singles:words,phrases:[]}},data);
  const summary=buildReportSummaryPage(r,measure),visuals=buildVisualPdfPages(r,measure),blocks=buildReportDocument(r);
  const text=[...summary.lines,...visuals.flatMap(p=>p.lines)].map(l=>l.text).join('\n');
  assert.match(text,/5 \/ 6개/);assert.match(text,/미측정/);assert.doesNotMatch(text,/마케팅 종합 점수|고객 전환 준비도|페이지 준비도\s+74/);
  const detail=blocks.map(b=>b.text).join('\n');for(const w of words)assert.ok(detail.includes(w.keyword));
  assert.match(detail,/산식과 근거/);assert.match(detail,/channel\.io/);
  const pages=buildDetailedReportPdf(r,measure,1).pages;
  assert.ok(pages.length<150,`detail expanded to ${pages.length} pages`);
  for(const p of [summary,...visuals,...pages])for(const line of p.lines){assert.ok(line.x+line.width<=742.1,JSON.stringify(line));assert.ok(line.y+line.lineHeight<=1039,JSON.stringify(line));}
  const large=finalizeReportEvidence(input,{...data,h1:Array.from({length:7},(_,i)=>`제목 ${i} `+'서비스 설명 '.repeat(65))});
  for(const p of buildVisualPdfPages(large,measure))for(const line of p.lines)assert.ok(line.y+line.lineHeight<=1039,JSON.stringify(line));
  const check={id:'google-document-size',title:'Googlebot 문서 수집 범위',topic:'crawl',engines:['google' as const],status:'action' as const,evidence:'수신한 문서 3,016,603바이트',interpretation:'수집 경계 확인',steps:['중요한 본문의 위치를 확인'],completion:'수집 결과 대조'};
  const prioritized={...r,officialSeoAudit:{version:1 as const,catalogVersion:'2026-10-13' as const,targetUrl:r.url,mode:'diagnosis' as const,checks:[check]}};
  assert.equal(evidencePriorities(prioritized)[0].title,check.title);
  assert.equal(evidencePriorities({...prioritized,officialSeoAudit:{...prioritized.officialSeoAudit,targetUrl:'https://other.example'}}).some(c=>c.title===check.title),false);
});
