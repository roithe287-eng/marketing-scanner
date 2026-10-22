/** Deterministic page-role checks. Search API responses are never sent to an AI. */
const within=(host:string,parent:string)=>host===parent||host.endsWith(`.${parent}`);
const employmentHosts=['saramin.co.kr','jobkorea.co.kr','wanted.co.kr','jobplanet.co.kr','teamblind.com','incruit.com','catch.co.kr','jumpit.co.kr','rememberapp.co.kr','work.go.kr','work24.go.kr','albamon.com','alba.co.kr','roketpunch.com','rocketpunch.com'];
const companyHosts=['thevc.kr','crunchbase.com','companyinfo.co.kr','nicebizinfo.com','bizno.net','kreport.co.kr'];
const contentHosts=['wikipedia.org','namu.wiki','news.naver.com','brunch.co.kr','tistory.com','medium.com'];
export const isEmploymentQuery=(query:string)=>/채용|구인|구직|취업|헤드헌팅|리크루팅|인재.?추천|인재.?매칭|recruit|job.?search|hr.?solution/i.test(query);
const isCompanyDataQuery=(query:string)=>/기업.?정보|기업.?분석|투자.?정보|기업.?데이터|스타트업.?데이터|신용.?평가/.test(query);
export function unrelatedPageReason(page:{domain:string;link:string;title:string;description?:string},query:string):string|undefined {
  const host=page.domain.toLowerCase().replace(/^www\./,'').replace(/\.$/,'');
  let path='';try{path=new URL(page.link).pathname;}catch{}
  if(!isEmploymentQuery(query)){
    if(employmentHosts.some(h=>within(host,h)))return '채용·구직·직장인 후기 플랫폼: 대상 상품·서비스의 판매 업체가 아님';
    if(/(?:채용\s*(?:공고|정보|안내)|모집공고|취업정보|구인구직|연봉정보|기업리뷰|회사리뷰)/.test(page.title)
      || /\/(?:recruit(?:ment)?|careers?|jobs?|salaries|company-reviews)(?:\/|$)/i.test(path))return '채용·연봉·직장 후기 페이지: 상품·서비스 비교 대상에서 제외';
  }
  if(!isCompanyDataQuery(query)&&(companyHosts.some(h=>within(host,h))||/기업정보|기업개요|기업분석|기업\s*프로필|company\s*(?:profile|overview)/i.test(page.title)))return '기업·투자 정보 조회 페이지: 해당 상품·서비스 제공 업체가 아님';
  if(contentHosts.some(h=>within(host,h))||/\/(?:news|article|articles|press|blog)(?:\/|$)/i.test(path)
    || /뉴스룸|(?:^|\s|[|:·])뉴스(?:$|\s|[|:·])|기사\s*[-|:·]|보도자료|언론보도/.test(page.title))return '기사·블로그·정보 콘텐츠: 직접 제공 업체의 상품·서비스 페이지가 아님';
}
