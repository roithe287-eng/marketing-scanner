/** Page relevance is evidence for a query, never keyword search volume. */
export type QuerySite = {title?:string;ogTitle?:string;description?:string;ogDescription?:string;keywords?:string;h1?:string[];h2?:string[]};
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
    {label:'메타 키워드',text:site.keywords||'',weight:1}].filter(f=>f.text.trim());
}
export function keywordEvidence(keyword:string,site:QuerySite) {
  const fields=queryFields(site),terms=queryTerms(keyword),joined=fields.map(f=>f.text).join(' ');
  const matched=queryMatches(keyword,joined).matched;
  const evidence=fields.flatMap(f=>{
    const hits=queryMatches(keyword,f.text).matched;
    return hits.length?[{field:f.label,text:f.text.slice(0,500),matched: hits}]:[];
  }).slice(0,8);
  const weightedSupport=fields.reduce((sum,f)=>sum+f.weight*queryMatches(keyword,f.text).matched.length/Math.max(terms.length,1),0);
  return {keyword,terms,matched,evidence,weightedSupport,grounded:terms.length>0&&matched.length===terms.length};
}
export function keywordCandidates(site:QuerySite) {
  const keywordSeeds=new Set((site.keywords||'').split(/[,;|]/).map(normalizeSearchText));
  const values=[...(site.keywords||'').split(/[,;|]/),...(site.h1||[]).flatMap(t=>t.split(/[|·:]/)),
    ...(site.h2||[]).flatMap(t=>t.split(/[|·:]/)),...(site.title||site.ogTitle||'').split(/[|·:–—]/)];
  const seen=new Set<string>();
  return values.map(v=>v.trim()).filter(v=>v.length>=2&&v.length<=30&&!/^(홈|메인|공식|홈페이지|사이트|쇼핑|인터넷|비즈니스|문의|상담|고객센터|공지사항|로그인|회원가입|개인정보|이용약관)(\s|$)/i.test(v))
    .filter(v=>{const key=normalizeSearchText(v);if(seen.has(key))return false;seen.add(key);return true;})
    .map(v=>{const evidence=keywordEvidence(v,site);return {...evidence,weightedSupport:evidence.weightedSupport+(keywordSeeds.has(normalizeSearchText(v))?3:0)-(evidence.evidence.length===1&&evidence.evidence[0].field==='페이지 제목'?3:0)};}).sort((a,b)=>b.weightedSupport-a.weightedSupport||a.keyword.length-b.keyword.length).slice(0,5);
}
export const COMPETITOR_API_NOTE='네이버 웹문서 API의 제한된 응답에서 찾은 비교 후보입니다. 응답 순서는 네이버 통합검색 순위·검색량·매출 순위가 아닙니다.';
export const COMPETITOR_VOLUME_NOTE='검색량 미측정 · 제목·설명·주요 제목의 주제 관련성으로 대표 키워드를 선택합니다. 페이지 안의 반복 횟수와 시장의 검색 수요는 다릅니다.';
export const COMPETITOR_SOURCES=[
  {title:'네이버 웹문서 검색 API · 응답 항목과 범위',url:'https://developers.naver.com/docs/serviceapi/search/web/web.md'},
  {title:'네이버 검색광고 API · 별도 검색량 확인 경로',url:'https://naver.github.io/searchad-apidoc/'},
];
