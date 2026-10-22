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
  relevanceBasis?: 'page_metadata' | 'search_snippet';
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

export function selectSearchCandidates(items: SearchItem[], ourDomain: string, query: string, limit = 8) {
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
    if (!reason && seen.has(domain)) reason = '이미 수집한 도메인의 중복 페이지';
    if (!reason) reason = excludedPlatformReason(domain);
    if (!reason) reason = unrelatedPageReason({domain,link:item.link,title,description:stripSearchHtml(item.description)},query);
    if (!reason) reason = nonProviderReason(title, query, stripSearchHtml(item.description));
    if (reason) { excluded.push({domain, link: item.link, title, reason}); return; }
    seen.add(domain);
    eligibleCount++;
    candidates.push({rank: candidates.length + 1, searchRank: i + 1,
      title, link: item.link, description: stripSearchHtml(item.description), domain});
  });
  const coverage=(c:SearchCandidate)=>queryMatches(query,`${c.title} ${c.description}`).matched.length;
  const selected=candidates.sort((a,b)=>coverage(b)-coverage(a)||a.searchRank-b.searchRank).slice(0,limit).map((c,i)=>({...c,rank:i+1}));
  return {candidates:selected, excluded, reviewedCount: items.length,eligibleCount,budgetDeferredCount:Math.max(0,eligibleCount-selected.length)};
}

export function finalizeSearchCandidates<T extends SearchCandidate & {metaTitle?: string; metaDescription?: string; h1?: string; fetchError?: string}>(
  candidates: T[], query: string, excluded: ExcludedCandidate[], limit = 5,
) {
  const kept: T[] = [];
  const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, '');
  for (const candidate of candidates) {
    const title = candidate.metaTitle || candidate.title;
    const reason = unrelatedPageReason({domain:candidate.domain,link:candidate.link,title:`${candidate.title} ${title}`,description:candidate.metaDescription||candidate.description},query)||nonProviderReason(`${candidate.title} ${title}`, query, `${candidate.description} ${candidate.metaDescription || ''}`);
    if (reason) { excluded.push({domain: candidate.domain, link: candidate.link, title, reason}); continue; }
    const hasPage=!candidate.fetchError&&!!(candidate.metaTitle||candidate.metaDescription||candidate.h1);
    const text = normalize((hasPage?[candidate.metaTitle,candidate.metaDescription,candidate.h1]:[candidate.title,candidate.description]).join(' '));
    const match=queryMatches(query,text),matchedTerms=match.matched;
    const matches = match.terms.length > 0 && matchedTerms.length===match.terms.length;
    if(!hasPage||!matches){excluded.push({domain:candidate.domain,link:candidate.link,title,reason:!hasPage?'페이지 수집·원문 근거 부족: 검색 요약만으로 경쟁 관계를 확정하지 않음':'후보 페이지 제목·설명·H1에서 대상 상품·서비스 검색어 일치를 확인하지 못함'});continue;}
    kept.push({...candidate, relevance: 'keyword_match',matchedTerms,relevanceBasis:'page_metadata',
      selectionEvidence:`페이지 제목·설명·H1에서 상품·서비스 검색어 “${query}”의 관련 표현을 확인했습니다. 실제 상품·서비스·지역·고객층·판매 방식은 별도로 대조해 주세요.`});
  }
  return kept.sort((a, b) => Number(b.relevance === 'keyword_match') - Number(a.relevance === 'keyword_match') || a.searchRank - b.searchRank)
    .slice(0, limit).map((candidate, i) => ({...candidate, rank: i + 1}));
}
