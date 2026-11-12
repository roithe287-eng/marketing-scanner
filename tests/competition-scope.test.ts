import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {captureCompetitorPage,analyzeCompetitors} from '../lib/competitorAnalysis';
import {buildCompetitionScope,competitionMismatch} from '../lib/competitionScope';
import {competitorOwnText,marketKeywordCandidates,usableMarketKeyword} from '../lib/competitorResearch';
import {captureSiteEditing} from '../lib/captureSiteEditing';
import {finalizeSearchCandidates,selectSearchCandidates} from '../lib/competitorSelection';
import {websiteHttp} from '../lib/security/safeFetch';
import {competitorDisplay} from '../lib/competitorDisplay';
import {MarketingReportSchema} from '../lib/reportSchema';
import {fixture} from './fixtures/report';
const url='https://own.example/';
function html(title:string,description=title,body=''){
 return `<html><head><title>${title}</title><meta name="description" content="${description}"></head><body><main><h1>${title}</h1><section><h2>제공 업무</h2><p>${description}</p></section>${body}<a href="/contact">상담 문의</a></main></body></html>`;
}
function page(title:string,description=title,body='',u=url){return captureCompetitorPage(html(title,description,body),u);}
function scope(title:string,desc=title,body=''){const s=page(title,desc,body).scope;assert.ok(s);return s;}
function candidate(title:string,description=title,body='',u='https://candidate.example/'){
 return {rank:1,searchRank:1,title,description,link:u,domain:new URL(u).hostname,...page(title,description,body,u)};
}
const boundaries=[
 ['병원','메타 한방병원','병원 예약 소프트웨어','병원 진료 예약 SaaS 제공'],
 ['법률 상담','법무법인 가온','법률 상담 홈페이지 제작','변호사 웹 제작 대행'],
 ['미용','부산 미용실','부산 미용학원','미용사 자격증 교육'],
 ['물류','물류 소프트웨어','국제물류 운송 업체','물류 포워딩 견적'],
 ['치과','치과용 의료기기 제조기업','가온 치과','치과 진료 예약'],
 ['인테리어','부산 병원 인테리어 시공','부산 인테리어 상품 쇼핑몰','인테리어 상품 구매'],
 ['반려견','부산 반려견 호텔','부산 반려견 동반 호텔','사람의 객실 숙박 예약'],
 ['진료','부산 동물병원','부산 한방병원','진료 예약'],
 ['상담','법무법인 가온','가온 세무사 사무소','세무 상담'],
 ['진료','부산 한방병원','부산 치과','진료 예약'],
 ['미용','부산 미용학원','부산 영어학원','미용 관련 영어 수업'],
 ['스키 렌탈','무주 스키 렌탈','하이원 스키 렌탈','무주 스키 여행 정보 및 하이원 대여'],
 ['스키','무주 스키 렌탈','수상스키 강습','스키 및 웨이크보드 강습'],
 ['필라테스','부산 필라테스','서울 필라테스','필라테스 수업 예약'],
 ['한방병원','부산 한방병원','한방병원','진료 안내'],
 ['치킨','부산 치킨 식당 해운대점','치킨 프랜차이즈 창업 본사','치킨 가맹 문의 및 창업 상담'],
 ['청소','부산 청소 서비스','부산 인테리어 시공','청소 작업과 인테리어 설계 시공'],
] as const;
for(const[query,own,other,desc]of boundaries)test(`competitor boundary: ${own} vs ${other}`,()=>{
 const excluded:any[]=[];
 const results=finalizeSearchCandidates([candidate(other,desc)],query,excluded,5,false,scope(own),'own.example');
 assert.equal(results.length,0,JSON.stringify({own:scope(own),other:scope(other,desc)}));
 assert.ok(excluded[0]?.reason);
});
for(const own of ['부산 한방병원','법무법인 가온','부산 미용학원','물류 소프트웨어','치과용 의료기기 제조기업','부산 반려견 호텔','부산 동물병원','무주 스키 렌탈','부산 필라테스','부산 치킨 식당 해운대점'])test(`same actual business stays eligible: ${own}`,()=>{
 const ownScope=scope(own),other=scope(own.replace('가온','나래').replace('해운대점','서면점'));
 assert.equal(competitionMismatch(ownScope,other),undefined,JSON.stringify({ownScope,other}));
});
test('customer, related-post, other-domain and search-only text cannot generate competitor keywords',()=>{
 const source=html('광고 대행사 가온','마케팅 광고 대행 상담','<section><h2>고객사 사례</h2><p>치과 병원 진료 예약과 임플란트 77777원</p></section><section><h2>관련 글</h2><p>물류 소프트웨어 개발 88888원</p></section>');
 const data={url,title:'광고 대행사 가온',description:'마케팅 광고 대행 상담',h1:['광고 대행사 가온'],bodyText:load(source)('body').text(),siteEditing:captureSiteEditing(load(source),url,new Headers()),businessDocuments:[{url:'https://other.example/',title:'타사 물류',source:'merchant_html' as const,capturedAt:new Date().toISOString(),sections:[{heading:'운송',text:'99999원 국제운송'}]},{url:url+'search',title:'병원 진료',source:'search_excerpt' as const,capturedAt:new Date().toISOString(),sections:[{heading:'요약',text:'고객 병원 진료 예약'}]}]};
 const body=competitorOwnText(data);assert.doesNotMatch(body,/77777|88888|99999|진료 예약/);
 const site={...data,bodyText:body,businessDocuments:[],scope:buildCompetitionScope(data)};
 assert.equal(usableMarketKeyword('치과',site),false);
 assert.ok(marketKeywordCandidates(site).every(c=>/광고|마케팅|제작|대행/.test(c.keyword)));
});
test('a same-topic client case and a negative offering cannot establish a candidate match',()=>{
 const own=scope('부산 한방병원');
 for(const c of [candidate('부산 소프트웨어','고객사: 부산 한방병원'),candidate('부산 서비스','한방병원 진료는 제공하지 않습니다.'),candidate('부산 한방병원 사례','부산 한방병원 소개','','https://other.example/portfolio/clinic')]){
  assert.equal(finalizeSearchCandidates([c],'한방병원',[],5,false,own).length,0);
 }
});
test('eligible body detail can match when the candidate homepage only has a brand title',()=>{
 const c=candidate('나래','부산 한방병원 진료 안내','<section><h2>진료 안내</h2><p>교통사고 재활 진료와 입원 안내를 제공합니다.</p></section>');
 const kept=finalizeSearchCandidates([c],'교통사고 재활',[],5,false,scope('부산 한방병원'));
 assert.equal(kept.length,1);assert.equal(kept[0].relevanceBasis,'page_content');
});
test('redirected self, platforms, articles and duplicate final domains never fill competitor slots',()=>{
 const c=candidate('광고 대행','광고 대행 상담');
 for(const finalUrl of ['https://own.example/contact','https://blog.naver.com/other/1','https://other.example/blog/agency'])assert.equal(finalizeSearchCandidates([{...c,finalUrl}],'광고 대행',[],5,false,scope('광고 대행사'),'own.example').length,0);
 const candidates=[{...c,finalUrl:'https://one.example/'},{...c,domain:'two.example',link:'https://two.example/',finalUrl:'https://one.example/',searchRank:2}];
 assert.equal(finalizeSearchCandidates(candidates,'광고 대행',[],5,false,scope('광고 대행사')).length,1);
});
test('a better matching page on the same domain is not discarded for an earlier generic page',()=>{
 const selected=selectSearchCandidates([{title:'회사 소개',description:'',link:'https://other.example/'},{title:'물류 소프트웨어',description:'물류 업무 소프트웨어 제공',link:'https://other.example/logistics'}],'own.example','물류 소프트웨어');
 assert.equal(selected.candidates[0].link,'https://other.example/logistics');assert.equal(selected.candidates[0].searchRank,2);
});
test('an invalid AI client keyword falls back to the provider role and rejects the customer business',async t=>{
 const keys=['NAVER_CLIENT_ID','NAVER_CLIENT_SECRET','OPENAI_API_KEY'] as const,values=keys.map(k=>process.env[k]);keys.forEach(k=>process.env[k]='local-test');const queries:string[]=[];
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const u=String(input);
  if(u.includes('api.openai.com'))return Response.json({choices:[{message:{content:'{"keyword":"여행사"}'}}]});
  if(u.includes('openapi.naver.com')){queries.push(new URL(u).searchParams.get('query')||'');return Response.json({items:[{title:'여행사 광고 대행',description:'',link:'https://agency.example/'},{title:'여행사 광고',description:'',link:'https://travel.example/'}]});}
  throw new Error('Unexpected request '+u);
 });
 t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>new Response(String(input).includes('agency.example')?html('나래 광고대행','여행사 광고 제작과 마케팅 대행'):html('나래 여행사','광고 안내 및 여행사 투어 예약')));
 try{
 const result=await analyzeCompetitors({url,title:'가온 광고대행',ogTitle:'',description:'여행사 광고 제작과 마케팅 대행',h1:['가온 광고대행'],keywords:'여행사,광고대행',bodyText:'광고대행 서비스를 제공합니다.'});
 assert.ok(result);assert.match(result.searchKeyword,/광고|마케팅|대행/);assert.deepEqual(result.competitors.map(c=>c.domain),['agency.example']);assert.ok(queries.every(q=>q!=='여행사'));assert.ok(MarketingReportSchema.safeParse({...fixture,competitorAnalysis:result}).success);
 }finally{keys.forEach((k,i)=>{if(values[i]===undefined)delete process.env[k];else process.env[k]=values[i];});}
});
test('old stored incorrect competitor scopes are filtered without rewriting facts or old comparisons',()=>{
 const report=MarketingReportSchema.parse({...fixture,competitorAnalysis:{searchKeyword:'병원',ourSite:{url,domain:'own.example',title:'부산 한방병원',metaDescription:'한방 진료 예약',h1:'부산 한방병원',scope:scope('부산 한방병원')},competitors:[candidate('부산 병원 예약 소프트웨어','병원 SaaS 제공')],overallComparison:'부적합 업체와의 이전 비교',ourPositioning:'부적합 업체 기준 제안'}});
 const before=JSON.stringify(report);const result=competitorDisplay(report.competitorAnalysis!);
 assert.equal(result.competitors.length,0);assert.equal(result.overallComparison,undefined);assert.equal(result.ourPositioning,undefined);assert.equal(JSON.stringify(report),before);
});

for(const slogan of ['지금 쓰는 바를거리에, 한 방울 더','함께 더 행복한 반려생활','Where Nature Meets Innovation','Sign up and save','ADD ONE DROP'])test(`a repeated marketing slogan is not a competitor market: ${slogan}`,()=>{
 assert.equal(usableMarketKeyword(slogan,{title:'가온 브랜드',description:slogan,h1:[slogan],bodyText:slogan}),false);
});
test('the logistics business profile is retained for competitor scope',()=>{
 assert.equal(scope('해외이사 국제물류','해외이사 운송과 통관 견적').profile,'international_logistics');
 assert.ok(competitionMismatch(scope('해외이사 국제물류','해외이사 운송과 통관 견적'),scope('물류 소프트웨어','해외이사 물류 SaaS 제공')));
});
test('strongly conflicting result roles do not crowd a relevant provider out of the fetch budget',()=>{
 const items=[...Array.from({length:8},(_,i)=>({title:'병원 예약 소프트웨어',description:'병원 진료 예약 SaaS 제공',link:`https://software${i}.example/`})),{title:'부산 한방병원',description:'병원 진료 예약',link:'https://clinic.example/'}];
 const selected=selectSearchCandidates(items,'own.example','병원',8,false,scope('부산 한방병원'));
 assert.equal(selected.candidates[0].domain,'clinic.example');assert.equal(selected.candidates[0].searchRank,9);
});

test('content pages remain eligible for an actual content comparison',()=>{
 const own=scope('마케팅 실무 블로그','마케팅 기사와 실무 칼럼');
 const c=candidate('마케팅 실무 블로그','마케팅 실무 기사와 칼럼','','https://publisher.example/blog/marketing');
 assert.equal(own.kind,'content');
 assert.equal(selectSearchCandidates([c],'own.example','마케팅',8,false,own).candidates.length,1);
 assert.equal(finalizeSearchCandidates([c],'마케팅',[],5,false,own).length,1);
 assert.equal(finalizeSearchCandidates([c],'마케팅',[],5,false,scope('마케팅 광고 대행사')).length,0);
});

test('cargo items cannot become a logistics competitor market',()=>{
 const own=scope('해외이사 국제물류','해외이사 운송과 통관 견적');
 const site={scope:own,title:'범양 운송',description:'의류 및 가구 국제운송',keywords:'의류,가구,국제운송',bodyText:'의류와 가구를 운송합니다.'};
 assert.equal(usableMarketKeyword('의류',site),false);assert.equal(usableMarketKeyword('가구',site),false);assert.equal(usableMarketKeyword('국제운송',site),true);
});
test('unsupported English headings cannot become product categories',()=>{
 const own=scope('가온 온라인 쇼핑몰');
 for(const phrase of ['Trusted Quality','Stroke Foundation'])assert.equal(usableMarketKeyword(phrase,{scope:own,title:'가온',description:phrase,h2:[phrase],bodyText:phrase}),false);
});
