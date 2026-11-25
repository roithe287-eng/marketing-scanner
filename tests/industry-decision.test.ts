import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {reviewIndustry} from '../lib/industryClassifier';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {buildCompetitionScope} from '../lib/competitionScope';
import {captureCompetitorPage} from '../lib/competitorAnalysis';
import {IndustryDecisionSchema} from '../lib/industryDecisionSchema';
import {MarketingReportSchema} from '../lib/reportSchema';
import ReportIndustryEvidence from '../components/report/ReportIndustryEvidence';
import {fixture} from './fixtures/report';

const url='https://brand.example/';
const input={url,finalUrl:url,title:'브랜드 소개',description:'',h1:[],h2:[],bodyText:''};
const purposeData={...input,title:'온 법률사무소',description:'환자를 진료합니다.',bodyText:'외래 진료를 제공합니다.'};

test('a confirmed headline and first-party offering can outweigh stale meta copy',()=>{
  const data={...purposeData,bodyText:'법률 상담을 제공합니다.'};
  const result=reviewIndustry(data);
  assert.equal(result.status,'matched');
  if(result.status==='matched')assert.equal(result.category,'legal');
  assert.ok(result.evidence.every(row=>row.text!==data.description));
});

test('conflicting services stay unclassified in the report and in a candidate URL',()=>{
  const industryDecision=reviewIndustry(purposeData);
  assert.equal(industryDecision.status,'review');
  if(industryDecision.status==='review')assert.equal(industryDecision.reason,'conflicting');
  assert.ok(IndustryDecisionSchema.safeParse(industryDecision).success);
  const held={...purposeData,industryDecision};
  const sitePurpose=analyzeWebsitePurpose(held);
  assert.equal(sitePurpose.kind,'unknown');
  assert.equal(sitePurpose.business,undefined);
  assert.equal(sitePurpose.sector,undefined);
  assert.equal(buildCompetitionScope(held).kind,'unknown');
  const report=MarketingReportSchema.parse({...fixture,url,sitePurpose,industryDecision});
  const view=renderToStaticMarkup(createElement(ReportIndustryEvidence,{report}));
  assert.match(view,/업종 확인 필요.*공통 페이지 점검/);
  assert.match(view,/수집한 페이지 문구 보기/);
  assert.doesNotMatch(view,/업종 판단 근거 보기/);
  const candidate=captureCompetitorPage('<title>온 법률사무소</title><main><h1>외래 진료를 제공합니다.</h1></main>',url);
  assert.match(candidate.fetchError||'',/제공 업종 단서가 서로 다름/);
});

test('search tags, third-party work and duplicated share descriptions do not establish an industry',()=>{
  const data={...input,description:'병원, 치과, 정형외과, 의료진',ogDescription:'병원, 치과, 정형외과, 의료진',
    businessDocuments:[{url:url+'portfolio',title:'고객사 프로젝트',source:'merchant_html' as const,capturedAt:new Date().toISOString(),sections:[{heading:'고객사 사례',text:'환자를 진료합니다.'}]},
      {url:url+'catalog',title:'검색 요약',source:'search_excerpt' as const,capturedAt:new Date().toISOString(),sections:[{heading:'치과 소개',text:'환자를 진료합니다.'}]}]};
  assert.equal(reviewIndustry(data).status,'review');
  assert.equal(reviewIndustry({...input,description:'환자를 진료합니다.',ogDescription:'환자를 진료합니다.'}).status,'review');
  const known=reviewIndustry({...input,title:'브랜드 소개',bodyText:'부품을 직접 제조합니다.'});
  assert.equal(known.status,'matched');
  if(known.status==='matched')assert.equal(known.category,'manufacturing');
});

test('same-domain redirects preserve identity while another domain is highlighted for review',()=>{
  const data={...input,title:'하나 물류',bodyText:'국제 운송을 대행합니다.'};
  assert.equal(reviewIndustry({...data,finalUrl:'https://www.brand.example/services'}).status,'matched');
  const redirected=reviewIndustry({...data,finalUrl:'https://other.example/services'});
  assert.deepEqual(redirected,{status:'review',reason:'redirected',sourceUrl:'https://other.example/services',evidence:[]});
  assert.equal(reviewIndustry({...data,collectionNotice:'공개 HTML 수집 제한'}).status,'review');
});

test('multiple genuine hair products cover a brand-only page without treating a mixed catalogue as a wig store',()=>{
  const products=['인모 똑딱이 헤어피스','부분가발 탑커버'].map((name,i)=>({url:url+'product/'+i,name,description:'',categories:[],kind:'product_page' as const}));
  const data={...input,productContext:{status:'observed' as const,discovery:'public_links' as const,attemptedPages:2,sources:products,commerce:true,note:''}};
  const purpose=analyzeWebsitePurpose(data);
  assert.equal(purpose.business?.id,'hairpieces_wigs');
  const assessment=reviewIndustry(data);
  assert.equal(assessment.status,'matched');
  assert.ok(assessment.evidence.some(item=>item.url===products[0].url));
  const view=renderToStaticMarkup(createElement(ReportIndustryEvidence,{report:{...fixture,url,sitePurpose:purpose,industryDecision:assessment}}));
  assert.equal(view.match(/가발·헤어피스 전문 쇼핑몰/g)?.length,1);
  assert.match(view,/헤어피스·가발의 옵션 선택과 구매/);
  assert.notEqual(analyzeWebsitePurpose({...data,productContext:{...data.productContext,sources:[...products,{...products[1],url:url+'product/shirt',name:'면 반팔 셔츠'}]}}).business?.id,'hairpieces_wigs');
});
