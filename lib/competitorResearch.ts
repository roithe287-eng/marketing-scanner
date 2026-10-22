/** Page relevance is evidence for a query, never keyword search volume. */
import type {ExtractedWebsiteData} from './extractWebsite';
import type {OwnProductSource} from './ownProductSchema';
import {isEmploymentQuery} from './competitorRoles';
export type QuerySite = {title?:string;ogTitle?:string;description?:string;ogDescription?:string;keywords?:string;h1?:string[];h2?:string[];bodyText?:string;productSources?:OwnProductSource[]};
/** Reuse the already collected page; omit known navigation, footer and licence-only text. */
export function competitorOwnText(data:Pick<ExtractedWebsiteData,'bodyText'|'siteEditing'>):string {
  const elements=data.siteEditing?.elements||[];
  const chrome=elements.filter(e=>['header','footer','nav'].includes(e.region||'')).map(e=>e.text.replace(/\s+/g,' ').trim());
  const lines=[...elements.filter(e=>!e.truncated&&['text','heading'].includes(e.kind)&&!['header','footer','nav'].includes(e.region||'')).map(e=>e.text),...(data.bodyText||'').split(/\n+/)];
  return [...new Set(lines.map(t=>t.replace(/\s+/g,' ').trim()).filter(t=>t.length>=4&&!chrome.some(c=>c.includes(t))&&!/판매업신고|사업자등록번호|통신판매업신고|copyright|개인정보처리방침|이용약관/i.test(t)))].join('\n').slice(0,8000);
}
export const normalizeSearchText=(text:string)=>text.normalize('NFKC').toLowerCase().replace(/\s+/g,'');
export function queryTerms(query:string) {
  return [...new Set(query.normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(t=>t.length>=2))].slice(0,8);
}
export function queryMatches(query:string,text:string) {
  const normalized=normalizeSearchText(text),terms=queryTerms(query);
  return {terms,matched:terms.filter(t=>normalized.includes(normalizeSearchText(t)))};
}
export function queryFields(site:QuerySite) {
  return [{label:'페이지 제목',text:site.title||site.ogTitle||'',weight:4},
    {label:'메타 설명',text:site.description||site.ogDescription||'',weight:3},
    ...(site.h1||[]).slice(0,3).map(text=>({label:'H1',text,weight:4})),
    ...(site.h2||[]).slice(0,8).map(text=>({label:'H2',text,weight:1})),
    {label:'메타 키워드',text:site.keywords||'',weight:1},
    {label:'수집된 본문',text:site.bodyText||'',weight:1},
    ...(site.productSources||[]).flatMap(p=>[{label:`상품명 · ${new URL(p.url).pathname}`,text:p.name,weight:2},{label:`상품 분류 · ${new URL(p.url).pathname}`,text:p.categories.join(' · '),weight:3},{label:`상품 설명 · ${new URL(p.url).pathname}`,text:p.description,weight:1}])].filter(f=>f.text.trim());
}
export function keywordEvidence(keyword:string,site:QuerySite) {
  const fields=queryFields(site),terms=queryTerms(keyword),joined=fields.map(f=>f.text).join(' ');
  const matched=queryMatches(keyword,joined).matched;
  const evidence=fields.flatMap(f=>{
    const hits=queryMatches(keyword,f.text).matched;
    if(!hits.length)return [];
    if(f.text.length<=500)return [{field:f.label,text:f.text,matched:hits}];
    const excerpts=hits.map(hit=>{
      const pattern=normalizeSearchText(hit).split('').map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s*');
      const index=f.text.search(new RegExp(pattern,'i'));
      return f.text.slice(Math.max(0,index-120),Math.max(0,index-120)+500);
    });
    return [...new Set(excerpts)].map(text=>({field:f.label,text,matched:queryMatches(keyword,text).matched}));
  }).slice(0,8);
  const weightedSupport=fields.reduce((sum,f)=>sum+f.weight*queryMatches(keyword,f.text).matched.length/Math.max(terms.length,1),0);
  return {keyword,terms,matched,evidence,weightedSupport,grounded:terms.length>0&&matched.length===terms.length};
}
export function keywordCandidates(site:QuerySite,limit=5) {
  const keywordSeeds=new Set((site.keywords||'').split(/[,;|]/).map(normalizeSearchText));
  const values=[...(site.keywords||'').split(/[,;|]/),...(site.h1||[]).flatMap(t=>t.split(/[|·:]/)),
    ...(site.h2||[]).flatMap(t=>t.split(/[|·:]/)),...(site.productSources||[]).flatMap(p=>p.categories),...(site.title||site.ogTitle||'').split(/[|·:–—]/)];
  const seen=new Set<string>();
  return values.map(v=>v.trim()).filter(v=>v.length>=2&&v.length<=30&&!/^(홈|메인|공식|홈페이지|사이트|쇼핑|인터넷|비즈니스|문의|상담|고객센터|공지사항|로그인|회원가입|개인정보|이용약관)(\s|$)/i.test(v))
    .filter(v=>{const key=normalizeSearchText(v);if(seen.has(key))return false;seen.add(key);return true;})
    .map(v=>{const evidence=keywordEvidence(v,site);return {...evidence,weightedSupport:evidence.weightedSupport+(keywordSeeds.has(normalizeSearchText(v))?3:0)-(evidence.evidence.length===1&&evidence.evidence[0].field==='페이지 제목'?3:0)};}).sort((a,b)=>b.weightedSupport-a.weightedSupport||a.keyword.length-b.keyword.length).slice(0,limit);
}
const marketTerms=['건강기능식품','건강식품','영양제','비타민','유산균','오메가3','구강청결제','칫솔','캔디','사료','세탁세제','단체복','과잠바','유니폼','의류','화장품','스킨케어','생활용품','반려동물용품','반려동물 사료','식품','밀키트','와인','가구','인테리어','마케팅 컨설팅','광고대행','광고 대행','메타광고','기업 교육','온라인 강의','채용 플랫폼','구인구직','소프트웨어','세무 상담','법률 상담'];
/** A company-name lookup is not a market query, even when its title repeats. */
export function usableMarketKeyword(query:string,site:QuerySite):boolean {
  const q=normalizeSearchText(query),evidence=keywordEvidence(query,site);
  if(!evidence.grounded||query.length>40||queryTerms(query).length>5||/https?:|[<>]|채용공고|연봉|기업리뷰/.test(query))return false;
  if(/^(홈|메인|공식|홈페이지|사이트|쇼핑|쇼핑몰|스토어|온라인|인터넷|비즈니스|회사|기업|제품|상품|서비스|플랫폼|브랜드|문의|상담|고객센터|공지사항|로그인|회원가입|이용약관|개인정보|건강|헬스케어|푸드|뷰티|펫|헬스|라이프)$/i.test(q))return false;
  if(/(?:핫딜|pick|매거진|베스트|카테고리|기획전|신상품|추천상품|고객센터)$/i.test(q))return false;
  const known=marketTerms.some(t=>normalizeSearchText(t)===q);
  const aliases=[site.title,site.ogTitle].filter((t):t is string=>!!t).flatMap(t=>t.split(/[|·:–—]/)).map(t=>normalizeSearchText(t).replace(/(?:공식홈페이지|공식사이트|공식몰)$/,''));
  if(!known&&aliases.some(alias=>alias.length>=2&&(q===alias||q.includes(alias))))return false;
  if(isEmploymentQuery(query)&&!isEmploymentQuery([site.title,site.ogTitle,site.description,site.ogDescription,...site.h1||[]].join(' ')))return false;
  // A category embedded in a brand (e.g. 온누리식품) is insufficient on its own.
  const exactCategoryHeading=known&&queryFields(site).some(f=>['페이지 제목','H1','H2'].includes(f.label)&&normalizeSearchText(f.text)===q);
  return exactCategoryHeading||evidence.evidence.some(e=>['메타 설명','메타 키워드','수집된 본문'].includes(e.field)||/^상품(?:명| 분류| 설명) · /.test(e.field));
}
export function marketKeywordCandidates(site:QuerySite){
  const existing=keywordCandidates(site,20),extra=marketTerms.filter(t=>keywordEvidence(t,site).grounded).map(t=>keywordEvidence(t,site));
  const seen=new Set<string>();
  return [...existing,...extra].filter(c=>usableMarketKeyword(c.keyword,site)).filter(c=>{const k=normalizeSearchText(c.keyword);if(seen.has(k))return false;seen.add(k);return true;})
    .sort((a,b)=>b.weightedSupport-a.weightedSupport||b.keyword.length-a.keyword.length).slice(0,5);
}
export const COMPETITOR_API_NOTE='네이버 웹문서 API의 제한된 응답에서 찾은 비교 후보입니다. 응답 순서는 네이버 통합검색 순위·검색량·매출 순위가 아닙니다.';
export const COMPETITOR_KEYWORD_NOTE='대표 키워드는 수집된 페이지 제목·설명·주요 제목·본문의 상품·서비스 관련성으로 선택합니다. 회사명 단독 조회와 페이지의 반복 횟수를 시장의 검색 수요로 사용하지 않습니다.';
export const COMPETITOR_SOURCES=[
  {title:'네이버 웹문서 검색 API · 응답 항목과 범위',url:'https://developers.naver.com/docs/serviceapi/search/web/web.md'},
  {title:'네이버 검색광고 API · 별도 검색량 확인 경로',url:'https://naver.github.io/searchad-apidoc/'},
];
