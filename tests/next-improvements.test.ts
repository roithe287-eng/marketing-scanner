import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {selectSearchCandidates, finalizeSearchCandidates, nonProviderReason} from '../lib/competitorSelection';
import {analyzeCompetitors} from '../lib/competitorAnalysis';
import {buildGeoFocus} from '../lib/geoFocus';
import {buildReportDocument} from '../lib/reportDocument';
import {MarketingReportSchema, type LlmCitationQuestionResult} from '../lib/reportSchema';
import CompetitorComparison from '../components/CompetitorComparison';
import {fixture} from './fixtures/report';

const query = '광고대행';
const item = (domain: string, title = '광고대행 전문 업체') => ({title, link: `https://${domain}/`, description: '광고 대행 서비스를 제공합니다.'});
const row = (extra: Partial<LlmCitationQuestionResult> = {}): LlmCitationQuestionResult => ({engine:'chatgpt',question:'어떤 광고 업체를 선택해야 하나요?',questionType:'industry',cited:false,status:'ok',searchUsed:true,citationVerified:true,brandMentioned:false,...extra});

test('public advertising inventory is excluded by page evidence; public domains and lookalikes remain eligible', () => {
  const selection = selectSearchCandidates([item('example.com'), item('www.naver.com'),
    item('humetro.busan.kr','광고문의 > 부대사업 > 정보공개 > 부산교통공사'), item('agency.go.kr'), item('naver.com.agency.test')], 'example.com', query);
  assert.deepEqual(selection.candidates.map(c => c.domain), ['agency.go.kr','naver.com.agency.test']);
  assert.equal(selection.candidates[0].searchRank,4);
  assert.match(selection.excluded.find(c => c.domain === 'humetro.busan.kr')!.reason,/공공기관/);
  assert.equal(nonProviderReason('광고문의 > 정보공개 > 부산교통공사', '도시철도 광고 공간'),undefined);
});

test('metadata can exclude an inventory page; selection order and original response order remain distinct', () => {
  const selection = selectSearchCandidates([item('first.test','기타 업체'), item('busan.test','시설 안내'), item('agency.test')], 'example.com', query);
  const candidates = selection.candidates.map(c => ({...c, description:'', metaTitle:c.domain === 'busan.test'?'광고문의 > 정보공개 > 부산교통공사':c.title}));
  const final = finalizeSearchCandidates(candidates,query,selection.excluded);
  assert.equal(final[0].domain,'agency.test'); assert.equal(final[0].rank,1); assert.equal(final[0].searchRank,3);
  assert.equal(final[1].relevance,'needs_review'); assert.equal(selection.excluded[0].domain,'busan.test');
});

test('an agency-themed drama episode is excluded by page role while an actual service page and entertainment query remain eligible', () => {
  const episode = {...item('tving.com','종합광고대행사 찌찌: 창업편 1화 | TVING'),description:'종합광고대행사로 새롭게 태어나는 본격 코믹 창업 드라마.'};
  const agency = item('agency.test','드라마 영상 제작·광고대행 서비스');
  const selection = selectSearchCandidates([episode,agency],'example.com',query);
  assert.deepEqual(selection.candidates.map(c=>c.domain),['agency.test']);
  assert.match(selection.excluded[0].reason,/회차 시청/);
  assert.equal(nonProviderReason('창업편 1화 | TVING','창업 드라마',episode.description),undefined);
  const metadataOnly = finalizeSearchCandidates([{...selection.candidates[0],metaTitle:episode.title,metaDescription:episode.description}],query,[]);
  assert.equal(metadataOnly.length,0);
});

test('live analysis contract preserves zero results and enriches only eight pages before saving selection evidence', async () => {
  const saved = {fetch:globalThis.fetch, id:process.env.NAVER_CLIENT_ID, secret:process.env.NAVER_CLIENT_SECRET, openai:process.env.OPENAI_API_KEY};
  process.env.NAVER_CLIENT_ID='test';process.env.NAVER_CLIENT_SECRET='test';delete process.env.OPENAI_API_KEY;
  let empty = false, pages = 0;
  globalThis.fetch = async input => {
    if (String(input).includes('openapi.naver.com')) {
      assert.equal(new URL(String(input)).searchParams.get('display'),'30');
      return Response.json({items:empty?[]:[...Array.from({length:12},(_,i)=>item(`agency${i}.test`))]});
    }
    pages++; return new Response('<html><title>광고대행 업체</title><h1>광고대행 서비스</h1></html>',{headers:{'content-type':'text/html;charset=utf-8'}});
  };
  const site = {url:'https://example.com',title:'예시',ogTitle:'예시',description:'광고대행',h1:[],keywords:query};
  try {
    const result = await analyzeCompetitors(site);
    assert.equal(pages,8);assert.equal(result?.competitors.length,5);assert.equal(result?.filtering.reviewedCount,12);
    const restored = MarketingReportSchema.parse({...fixture,competitorAnalysis:result});
    assert.equal(restored.competitorAnalysis?.competitors[0].relevance,'keyword_match');
    assert.ok(restored.competitorAnalysis?.competitors[0].selectionEvidence);
    empty=true;const zero = await analyzeCompetitors(site);
    assert.ok(zero);assert.equal(zero.competitors.length,0);assert.equal(zero.filtering.reviewedCount,0);
  } finally {
    globalThis.fetch=saved.fetch;
    for (const [key,value] of [['NAVER_CLIENT_ID',saved.id],['NAVER_CLIENT_SECRET',saved.secret],['OPENAI_API_KEY',saved.openai]]) {
      if (value===undefined)delete process.env[key!];else process.env[key!]=value;
    }
  }
});

test('all failed or unverified GEO results suggest restoring observation, never rewriting unobserved content', () => {
  const results=[row({status:'error',searchUsed:false,citationVerified:false}),row({engine:'gemini',status:'unverified',searchUsed:false,citationVerified:false})];
  const report={...fixture,llmCitationTest:{...fixture.llmCitationTest!,results}};
  const focus=buildGeoFocus(report)!;
  assert.deepEqual(focus.tasks.map(task=>task.id),['restore-measurement']);assert.equal(focus.questions.length,1);
});

test('valid own source and failed provider coexist without failure being treated as an uncited observation', () => {
  const results=[row({cited:true,sources:[{url:'https://example.com/faq',title:'FAQ',ownership:'own'}]}),row({engine:'gemini',status:'error',searchUsed:false,citationVerified:false})];
  const report={...fixture,llmCitationTest:{...fixture.llmCitationTest!,results}};
  const focus=buildGeoFocus(report)!;
  assert.ok(focus.tasks.some(task=>task.id==='review-source'));assert.ok(focus.tasks.some(task=>task.id==='restore-measurement'));
  assert.ok(!focus.tasks.some(task=>task.id==='answer-question'));
  const text=buildReportDocument(MarketingReportSchema.parse(JSON.parse(JSON.stringify(report)))).map(block=>block.text).join('\n');
  assert.match(text,/완료 기준/);assert.match(text,/재사용할 고객 질문/);
  const legacy={...report,llmCitationTest:{...report.llmCitationTest,measurementVersion:undefined}};
  assert.equal(buildGeoFocus(legacy),null);
});

test('failed competitor fetch retains search provenance without invented strengths or average', () => {
  const html=renderToStaticMarkup(React.createElement(CompetitorComparison,{ourUrl:'https://example.com',competitorAnalysis:{searchKeyword:query,competitors:[{...item('agency.test'),rank:1,domain:'agency.test',fetchError:'HTTP 403'}]}}));
  assert.match(html,/페이지 수집 미완료/);assert.match(html,/검색 요약/);
  assert.doesNotMatch(html,/강약점|>평균<|>✕<|calculatePosition/);
});

test('candidate exclusions, evidence and response order survive shared schema and the PDF', () => {
  const selection=selectSearchCandidates([item('humetro.busan.kr','광고문의 > 정보공개 > 부산교통공사'),item('agency.test')],'example.com',query);
  const report=MarketingReportSchema.parse({...fixture,competitorAnalysis:{searchKeyword:query,competitors:finalizeSearchCandidates(selection.candidates,query,selection.excluded),filtering:{policyVersion:1,reviewedCount:2,metadataCheckedCount:1,excluded:selection.excluded}}});
  const restored=MarketingReportSchema.parse(JSON.parse(JSON.stringify(report)));
  assert.deepEqual(restored.competitorAnalysis,report.competitorAnalysis);
  const text=buildReportDocument(restored).map(block=>block.text).join('\n');
  for (const expected of ['후보 선정 기록','공공기관','선정 근거','웹문서 검색 응답 순서: 2']) assert.ok(text.includes(expected),expected);
});
