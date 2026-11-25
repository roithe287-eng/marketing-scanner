import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {reviewIndustry} from '../lib/industryClassifier';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {buildCompetitionScope,competitionMismatch,scopeAllowsKeyword} from '../lib/competitionScope';
import {captureCompetitorPage} from '../lib/competitorAnalysis';
import ReportIndustryEvidence from '../components/report/ReportIndustryEvidence';
import {MarketingReportSchema} from '../lib/reportSchema';
import {fixture} from './fixtures/report';

const expected={
  travel_article:['page_type','editorial','content','editorial'],
  legal_article:['page_type','editorial','content','editorial'],
  dental_article:['page_type','editorial','content','editorial'],
  medical_maker:['matched','manufacturing','organization','manufacturing'],
  medical_retail:['matched','ecommerce','commerce','commerce'],
  medical_software:['matched','it_service','service','software'],
  medical_consulting:['matched','consulting','service','medical_consulting'],
  medical_clinic:['matched','medical','service','medical'],
  vet_clinic:['matched','pet','service','veterinary'],
  pet_lodging:['matched','travel','service','lodging'],
  pet_boarding:['matched','pet','service','pet_care'],
  food_payment:['matched','food','service','restaurant'],
  academy_salon:['matched','education','education','education'],
  salon:['matched','beauty','service','beauty'],
  furniture_installer:['matched','interior','service','home_service'],
  furniture_store:['matched','ecommerce','commerce','commerce'],
  lodging:['matched','travel','service','lodging'],
  tour:['matched','travel','service','travel'],
  auto_rental:['matched','automotive','service','rental'],
  insurance:['matched','finance','service','insurance'],
  online_class_product:['matched','ecommerce','commerce','commerce'],
  public:['page_type','public_service','public_service','public_service'],
  actual_food:['matched','food','service','cafe'],
  content_topics:['matched','media','content','media'],
} as const;

const rows=readFileSync(new URL('./fixtures/industry-role-cases.tsv',import.meta.url),'utf8').trim().split('\n');
for(const row of rows){
  const [id,path,title,description,body,cta]=row.split('\t');
  test(`submitted URL preserves the actual offering and page scope: ${id}`,async t=>{
    const url=`https://${id.replaceAll('_','-')}.example${path}`;
    const html=`<title>${title}</title><meta name="description" content="${description}"><main><h1>${title}</h1><p>${body}</p><p>부산광역시 해운대구 해운대로 100</p><a href="/contact">${cta}</a></main>`;
    t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{
      const requested=new URL(input),robots=requested.pathname==='/robots.txt';
      const response=new Response(robots?'User-agent: *\nAllow: /':html,{headers:{'content-type':robots?'text/plain':'text/html'}});
      Object.defineProperty(response,'url',{value:requested.href});
      return response;
    });
    const page=await extractWebsite(url);
    const industryDecision=reviewIndustry(page);
    const classified={...page,industryDecision};
    const sitePurpose=analyzeWebsitePurpose(classified);
    assert.deepEqual([industryDecision.status,industryDecision.status==='matched'?industryDecision.category:industryDecision.status==='page_type'?industryDecision.kind:industryDecision.reason,sitePurpose.kind,buildCompetitionScope(classified).profile],expected[id as keyof typeof expected]);
    if(id==='dental_article'){
      assert.equal(sitePurpose.sector,undefined);
      const report=MarketingReportSchema.parse({...fixture,url,industryDecision,sitePurpose});
      const markup=renderToStaticMarkup(createElement(ReportIndustryEvidence,{report}));
      assert.match(markup,/URL 유형.*정보·콘텐츠 페이지.*콘텐츠·검색 점검/);
      assert.doesNotMatch(markup,/업종 판정|병의원·진료형/);
    }
  });
}

test('competitor extraction honors JSON-LD belonging to this URL and rejects article and retail matches for a clinic',()=>{
  const url='https://care.example/appointments';
  const html='<title>하나치과의원</title><main><h1>하나치과의원</h1><p>외래 진료를 제공합니다. 임플란트 상담과 진료 예약이 가능합니다.</p><a href="/book">진료 예약</a></main>';
  const markup=(value:object)=>`<script type="application/ld+json">${JSON.stringify(value)}</script>`;
  const clinic=captureCompetitorPage(html+markup({'@graph':[{'@type':'Article',url:'https://care.example/blog'}, {'@type':'Article'}]}),url);
  assert.equal(clinic.scope?.profile,'medical');
  const article=captureCompetitorPage(html+markup({'@type':'Article',mainEntityOfPage:url}),url);
  const unnamedGuide=captureCompetitorPage('<title>치과 방문 전 체크리스트</title><p>예약 전에 진료 정보를 살펴보세요.</p>',url);
  assert.equal(unnamedGuide.scope?.profile,'editorial');
  assert.equal(article.scope?.profile,'editorial');
  assert.ok(competitionMismatch(clinic.scope!,article.scope!));
  const retail=captureCompetitorPage('<title>치과 장비 판매점</title><main><h1>치과 장비 판매점</h1><button>장바구니</button></main>','https://medical-shop.example/');
  assert.ok(competitionMismatch(clinic.scope!,retail.scope!));
});

test('retail comparison requires matching known product families',()=>{
  const product=(title:string,domain:string)=>captureCompetitorPage(`<title>${title}</title><main><h1>${title}</h1><button>구매하기</button></main>`,`https://${domain}.example/`).scope!;
  const equipment=product('의료기기 판매점','medical-device');
  const furniture=product('수납장 가구 쇼핑몰','storage');
  const equipmentPeer=product('치과 장비 쇼핑몰','device-two');
  assert.deepEqual(equipment.specialties,['의료기기·병원용품']);
  assert.ok(competitionMismatch(equipment,furniture));
  assert.equal(competitionMismatch(equipment,equipmentPeer),undefined);
  assert.equal(scopeAllowsKeyword('치과 예약',equipment),false);
  assert.equal(scopeAllowsKeyword('치과 장비',equipment),true);
});
