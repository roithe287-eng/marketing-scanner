import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {capturePageEvidence} from '../lib/pageEvidence';
import {analyzeKeywordFrequency} from '../lib/analyzeKeywordFreq';
import {finalizeReportEvidence} from '../lib/evidenceReview';
import {verifyReportEvidence} from '../lib/reportIntegrity';
import {reportForPresentation} from '../lib/reportPresentation';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildReportDocument} from '../lib/reportDocument';
import {buildReportSummaryPage} from '../lib/reportSummaryPdf';
import EvidenceReviewPanel from '../components/report/EvidenceReviewPanel';
import {fixture} from './fixtures/report';
import {generalEvidenceCases,generalPageResponse} from './fixtures/general-evidence';

for(const site of generalEvidenceCases)test(`shared evidence survives collection, rendering and PDF on ${site.id}`,async t=>{
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>generalPageResponse(input));
  const data=await extractWebsite(site.url);
  const original=verifyReportEvidence({...structuredClone(fixture),url:site.url,keywordFrequency:analyzeKeywordFrequency(data),pageEvidence:capturePageEvidence(data)},data);
  const report=MarketingReportSchema.parse(JSON.parse(JSON.stringify(finalizeReportEvidence(original,data))));
  const review=report.evidenceReview!;
  assert.equal(review.sourceUrl,'finalUrl' in site?site.finalUrl:new URL(site.url).href);
  assert.ok(report.checklist!.every(c=>c.sourceUrl===review.sourceUrl&&c.capturedAt===review.capturedAt));
  assert.equal(review.axes.filter(a=>a.status==='unmeasured').length,4);
  assert.ok(review.axes.every(a=>!('score' in a)));
  const presented=reportForPresentation(report);
  assert.deepEqual(presented.keywordFrequency,report.keywordFrequency,'display must not reclassify keywords from clipped metadata');
  const html=renderToStaticMarkup(React.createElement(EvidenceReviewPanel,{review}));
  assert.match(html,/미측정/);assert.match(html,/산식과 원문 근거/);
  const pdfText=buildReportDocument(presented).map(b=>b.text).join('\n');
  assert.ok(pdfText.includes(`HTML 기본 항목 ${review.passed}/${review.assessed}개 충족`));
  for(const c of review.criteria)assert.ok(pdfText.includes(c.evidence),c.id+' shares its evidence with the PDF');
  const summary=buildReportSummaryPage(presented,(s,style)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*style.size,0));
  assert.ok(summary.lines.some(line=>line.text.includes(`${review.passed} / ${review.assessed}개`)));
  assert.equal(review.score,Math.round(100*review.passed/review.assessed));
  if(site.id==='commerce'||site.id==='english'){
    assert.match(report.checklist!.find(c=>c.id==='contact_info')!.currentValue,/문의·상담 CTA 0종/);
    assert.doesNotMatch(report.checklist!.find(c=>c.id==='contact_info')!.currentValue,/unrelated/);
  }
  if(site.id==='long-html'){
    assert.match(report.checklist!.find(c=>c.id==='h1')!.currentValue,/H1 요소 12개/);
    assert.match(report.checklist!.find(c=>c.id==='h1')!.currentValue,/발췌/);
    assert.equal(report.keywordFrequency!.singles.find(k=>k.keyword===site.keyword)?.inTitle,true);
    assert.equal(report.pageEvidence!.metadataTruncated?.title,true);
    assert.equal(report.pageEvidence!.metadataTruncated?.description,true);
  }
  if(site.id==='sparse')assert.equal(review.criteria.find(c=>c.id==='image_alt')?.status,'review');
});

test('legacy metadata at the storage boundary cannot reverse a previously observed keyword match',()=>{
  const report={...fixture,pageEvidence:{version:1 as const,requestedUrl:fixture.url,finalUrl:fixture.url,capturedAt:'2026-10-23T04:00:00.000Z',title:'가'.repeat(600),description:'서비스 안내',h1:[],h2:[],ctaButtons:[],bodyText:'공정설계 공정설계',bodyTruncated:false},keywordFrequency:{totalTokens:2,uniqueSingles:1,uniquePhrases:0,singles:[{keyword:'공정설계',count:2,density:100,inTitle:true,inMetaDescription:true}],phrases:[]}};
  const presented=reportForPresentation(report);
  assert.equal(presented.keywordFrequency!.singles[0].inTitle,true,'a possibly clipped legacy title cannot disprove the stored observation');
  assert.equal(presented.keywordFrequency!.singles[0].inMetaDescription,false,'the complete description can still be checked independently');
  const complete=reportForPresentation({...report,pageEvidence:{...report.pageEvidence,metadataTruncated:{title:false,description:false}}});
  assert.equal(complete.keywordFrequency!.singles[0].inTitle,false,'an explicitly complete title at the exact limit remains checkable');
});
