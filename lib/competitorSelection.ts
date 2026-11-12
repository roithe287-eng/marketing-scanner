import {buildCompetitionScope,competitionMismatch,eligibleMetadata,type CompetitionScope} from './competitionScope';
import {isContextOnlyEvidence,classificationText} from './websiteIdentity';
import {queryMatches} from './competitorResearch';
import {unrelatedPageReason} from './competitorRoles';
export type SearchItem = { title: string; link: string; description: string };
export type SearchCandidate = SearchItem & {
  domain: string;
  rank: number;
  searchRank: number;
  relevance?: 'keyword_match' | 'needs_review';
  selectionEvidence?: string;
  matchedTerms?: string[];
  relevanceBasis?: 'page_metadata' | 'page_content' | 'search_snippet';
};
export type ExcludedCandidate = { domain: string; link: string; title: string; reason: string };

const excludedHosts = [
  'naver.com', 'daum.net', 'google.com', 'namu.wiki', 'wikipedia.org',
  'coupang.com', 'gmarket.co.kr', 'auction.co.kr', '11st.co.kr', 'tmon.co.kr', 'wemakeprice.com', 'interpark.com',
  'ssg.com', 'lotteon.com', 'emart.com', 'hmall.com', 'hyundaihmall.com', 'akmall.com', 'galleria.co.kr', 'shinsegae.com',
  'lfmall.co.kr', 'lotteimall.com', 'gsshop.com', 'cjmall.com', 'cjonstyle.com', 'nsmall.com', 'ssgdfm.com',
  'enuri.com', 'danawa.com', 'bestkeyword.co.kr', 'oliveyoung.co.kr', 'musinsa.com', 'ablyrocks.com', 'zigzag.kr',
  'a-bly.com', 'brandi.co.kr', 'kakaomakers.com', 'kakaomakers.co.kr', 'market.kakao.com',
  'aliexpress.com', 'amazon.com', 'amazon.co.jp', 'taobao.com', 'tmall.com',
  'tiktok.com', 'tiktokshop.com', 'instagram.com', 'facebook.com', 'youtube.com', 'youtu.be',
  'twitter.com', 'x.com', 'threads.net', 'pinterest.com',
];
const belongsTo = (domain: string, parent: string) => domain === parent || domain.endsWith(`.${parent}`);
export function excludedPlatformReason(domain:string):string|undefined {
  return excludedHosts.some(host=>belongsTo(domain.toLowerCase().replace(/\.$/,''),host))?'포털·대형몰·SNS·백과사전':undefined;
}
export function stripSearchHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
}

// Apply only to agency/service queries and explicit public advertising inventory pages.
// A public domain alone never means that a page is irrelevant.
export function nonProviderReason(title: string, query: string, description = ''): string | undefined {
  if (!/광고.*대행|대행.*광고|마케팅/.test(query)) return;
  if (/광고\s*(?:문의|입찰|게재|공간)|부대사업/.test(title)
      && /교통공사|도시철도|정보공개|공공시설/.test(title)) {
    return '대행 서비스가 아닌 공공기관의 광고 매체·시설 문의 페이지';
  }
  if (/\d+\s*화|시즌\s*\d|다시\s*보기/.test(title) && /TVING|티빙|드라마|예능|에피소드/i.test(`${title} ${description}`)) {
    return '대행 서비스가 아닌 드라마·예능의 회차 시청 페이지';
  }
}

const commerceText=/쇼핑몰|공식몰|전문몰|온라인몰|스토어|쇼핑|\bshop\b|\bstore\b|장바구니|바로구매|구매하기|주문하기|구매하러|\bcheckout\b|\badd to cart\b|\bbuy now\b/i;
export function selectSearchCandidates(items: SearchItem[], ourDomain: string, query: string, limit = 8, preferCommerce=false, ownScope?:CompetitionScope) {
  const candidates: SearchCandidate[] = [];
  const excluded: ExcludedCandidate[] = [];
  const seen = new Set<string>();
  const own = ourDomain.toLowerCase().replace(/^www\./, '');
  let eligibleCount=0;
  items.forEach((item, i) => {
    let url: URL;
    try { url = new URL(item.link); } catch { return; }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return;
    const domain = url.hostname.toLowerCase().replace(/^www\./, '');
    const title = stripSearchHtml(item.title);
    let reason = own && (belongsTo(domain, own) || belongsTo(own, domain)) ? '자사 도메인' : undefined;
    if (!reason) reason = excludedPlatformReason(domain);
    if (!reason) reason = unrelatedPageReason({domain,link:item.link,title,description:stripSearchHtml(item.description)},query,ownScope?.kind==='content');
    if (!reason) reason = nonProviderReason(title, query, stripSearchHtml(item.description));
    if (reason) { excluded.push({domain, link: item.link, title, reason}); return; }
    candidates.push({rank: candidates.length + 1, searchRank: i + 1,
      title, link: item.link, description: stripSearchHtml(item.description), domain});
  });
  const coverage=(c:SearchCandidate)=>queryMatches(query,`${c.title} ${c.description}`).matched.length;
  const seller=(c:SearchCandidate)=>Number(commerceText.test(`${c.title} ${c.description}`)||/\/(?:goods|products?)\//i.test(c.link));
  const fit=(c:SearchCandidate)=>ownScope?Number(!competitionMismatch(ownScope,buildCompetitionScope({url:c.link,title:c.title,description:c.description}),false)):0;
  const unique=candidates.sort((a,b)=>fit(b)-fit(a)||(preferCommerce?seller(b)-seller(a):0)||coverage(b)-coverage(a)||a.searchRank-b.searchRank).filter(c=>{if(seen.has(c.domain)){excluded.push({...c,reason:'이미 수집한 도메인의 중복 페이지'});return false;}seen.add(c.domain);return true;});
  eligibleCount=unique.length;
  const selected=unique.slice(0,limit).map((c,i)=>({...c,rank:i+1}));
  return {candidates:selected, excluded, reviewedCount: items.length,eligibleCount,budgetDeferredCount:Math.max(0,eligibleCount-selected.length)};
}

export function finalizeSearchCandidates<T extends SearchCandidate & {metaTitle?:string;metaDescription?:string;h1?:string;fetchError?:string;ctaTexts?:string[];bodySnippet?:string;finalUrl?:string;scope?:CompetitionScope}>(
  candidates:T[],query:string,excluded:ExcludedCandidate[],limit=5,requireCommerce=false,ownScope?:CompetitionScope,ourDomain='',
){
  const kept:(T&SearchCandidate)[]=[],seen=new Set<string>();
  for(const candidate of candidates){
    const title=candidate.metaTitle||candidate.title;
    let link=candidate.finalUrl||candidate.link,domain=candidate.domain,reason:string|undefined;
    try{const u=new URL(link);if(!/^https?:$/.test(u.protocol)||u.username||u.password)throw new Error();domain=u.hostname.toLowerCase().replace(/^www\./,'');}catch{reason='후보 최종 URL이 유효하지 않음';}
    const own=[ourDomain,ownScope?.sourceUrl?new URL(ownScope.sourceUrl).hostname.replace(/^www\./,''):''].filter(Boolean);
    if(!reason&&own.some(host=>belongsTo(domain,host)||belongsTo(host,domain)))reason='최종 이동 URL이 자사 도메인';
    if(!reason)reason=excludedPlatformReason(domain);
    if(!reason&&seen.has(domain))reason='최종 이동 도메인이 다른 후보와 중복';
    if(!reason&&isContextOnlyEvidence(title,'',link))reason='고객사 사례·후기 페이지는 해당 업체의 제공 업무로 확정하지 않음';
    if(!reason)reason=unrelatedPageReason({domain,link,title,description:candidate.metaDescription||''},query,ownScope?.kind==='content')||nonProviderReason(title,query,candidate.metaDescription||'');
    const hasPage=!candidate.fetchError&&!!(candidate.metaTitle||candidate.metaDescription||candidate.h1||candidate.bodySnippet);
    const metadata=[candidate.metaTitle,candidate.metaDescription,candidate.h1].map(eligibleMetadata).join(' ');
    const metaMatch=queryMatches(query,metadata),match=queryMatches(query,metadata+' '+classificationText(candidate.bodySnippet||''));
    const matches=match.terms.length>0&&match.matched.length===match.terms.length;
    if(!reason&&(!hasPage||!matches))reason=!hasPage?'페이지 수집·원문 근거 부족: 검색 요약만으로 경쟁 관계를 확정하지 않음':'후보의 자사 설명 원문에서 대상 상품·서비스 검색어 일치를 확인하지 못함';
    if(!reason&&requireCommerce&&!commerceText.test([metadata,...candidate.ctaTexts||[]].join(' ')))reason='상품 판매 사이트의 비교에서 쇼핑몰·구매 동작을 원문으로 확인하지 못함';
    const scope=candidate.scope||buildCompetitionScope({url:link,title:candidate.metaTitle||'',description:candidate.metaDescription||'',h1:candidate.h1?[candidate.h1]:[],bodyText:candidate.bodySnippet||'',ctaButtons:candidate.ctaTexts});
    if(!reason&&ownScope)reason=competitionMismatch(ownScope,scope);
    if(reason){excluded.push({domain,link,title,reason});continue;}
    seen.add(domain);
    const relevanceBasis=metaMatch.matched.length===metaMatch.terms.length?'page_metadata' as const:'page_content' as const;
    kept.push({...candidate,domain,link,scope,relevance:'keyword_match',matchedTerms:match.matched,relevanceBasis,
      selectionEvidence:`자사 제공 업무 원문에서 “${query}” 확인${ownScope?` · ${scope.label}${ownScope.area?' · 지역 '+scope.area:''}${ownScope.destinations.length?' · 이용 목적지 일치':''}`:''}`});
  }
  return kept.sort((a,b)=>a.searchRank-b.searchRank).slice(0,limit).map((c,i)=>({...c,rank:i+1}));
}
