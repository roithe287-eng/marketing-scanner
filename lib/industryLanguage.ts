// These expressions disambiguate homonyms for classification. The report keeps the original HTML text.
const homonyms = [
  /(?:썸|섬)네일|스마트|카페\s*24|\bcafe\s*24\b|(?:네이버|다음|팬|온라인)\s*카페|카페\s*(?:가입|게시판|회원)/giu,
  /은행\s*(?:나무|열매|잎)|(?:국회|지방|기초|광역|시의회|구의회)\s*의원|(?<![가-힣])(?:시|구|군|도)의원(?=$|[\s·,]|\s*후보)|(?:제안|시안|방안|대안|안내|실내|국내|사내)과(?=\s|[.,·]|$)/gu,
  /(?:신청(?:서)?|서류|문서|견적서|계약서|입력|제출|작성|이력서|보고서|표준)\s*양식|양식(?:을|이|에|으로)?\s*(?:작성|다운로드|내려받|첨부|제출)/gu,
  /카드\s*(?:뉴스|결제|영수증)|(?:신용|체크)카드(?:로|를)?\s*(?:결제|납부)|(?:홍보|안내|광고|버튼|오류)\s*문구|문구(?:를|의)?\s*(?:작성|수정|입력)/gu,
  /(?:서버|데이터|계정)\s*이사(?=\s|[.,]|$)|(?:물품|화물|운송|여행자)\s*보험\s*(?:포함|별도|가입\s*여부)/gu,
];
const clientNoun='(?:병의원|병원|의원|약국|학원|학교|식당|음식점|카페|호텔|은행|보험사|법무법인|공공기관|기업|브랜드|매장|기관|업체)';
const clientList=clientNoun+'(?:\\s*(?:[,·ㆍ/]|및|또는|와|과)\\s*'+clientNoun+')*';
const recipient=new RegExp(clientList+'(?:\\s*등)?(?:에|에도|에게|에만|을|를)\\s*(?:직접\\s*)?(?:납품|공급|납품하는|대상으로)', 'gu');
const proximity=new RegExp('(?:인근|주변|근처|가까운|도보권)\\s*(?:의\\s*)?'+clientList+'|'+clientList+'(?:\\s*등)?(?:이|가)?\\s*(?:인접|인근|주변|근처|가까이|도보권)', 'gu');
const intendedAudience=new RegExp(clientList+'(?:을|를)\\s*위한(?=\\s)', 'gu');
const clientLabel=/(?:주요\s*)?(?:고객사|납품처|거래처|협력사|제휴처|입점사)(?:\s*(?:목록|명단))?\s*(?:[:：]|는|은|로는)/u;
const clauseEnd=/[.!?。;\n]|(?:이며|이고|로서|로는|입니다만|이며요)[,\s]/u;
const listedTags=/^(?:(?:추천\s*)?키워드|태그|tags?)\s*[:：]|^(?:#[^\s#]+\s*){2,}$/iu;

export function industryLanguage(text:string):string{
  let value=text.normalize('NFKC');
  const label=clientLabel.exec(value);
  if(label){
    const rest=value.slice(label.index+label[0].length);
    const end=clauseEnd.exec(rest);
    value=value.slice(0,label.index)+' '+(end?rest.slice(end.index+end[0].length):'');
  }
  if(listedTags.test(value.trim()))return '';
  value=value.replace(recipient,' ').replace(proximity,' ')
    .replace(intendedAudience,' ')
    .replace(/(?:병원|병의원|의료진|약국|학교|학원)\s*(?:전용|납품용|근무자용)|(?:병원|병의원|약국|학교|학원)(?=\s*(?:유니폼|가운|근무복|단체복|포장재|홍보물|관리\s*(?:솔루션|시스템)))/gu,' ');
  for(const pattern of homonyms)value=value.replace(pattern,' ');
  return value.replace(/[ \t]+/gu,' ').trim();
}

export function keywordList(text:string):boolean{
  const words=text.trim().split(/\s*[,，|·ㆍ/#]\s*/u).filter(Boolean);
  return words.length>=3&&words.every(word=>word.length<=14&&!/합니다|입니다|제공|운영|전문|제작|진료|전용|예약하기|구매하기|신청하기/.test(word));
}

// A standalone category in a description still needs context (a title may legitimately be the name).
export function bareIndustryTag(text:string):boolean{
  return /^(?:학원|교습소|소프트웨어|인테리어|리모델링|쇼핑몰|온라인 스토어|광고 대행|수강 신청|호텔|펜션|은행|보험|카페|식당|약국|병원|의원|법률|마케팅|피트니스|스튜디오|헬스장|렌탈|네일|카드)[.!]?$/u.test(text.trim());
}

// Independent body copy or a concrete provider statement can establish a brand-only page's industry.
export function describesOwnBusiness(text:string, pattern:RegExp):boolean{
  for(const clause of text.split(/[.!?。;\n]/u)){
    const match=pattern.exec(clause);
    if(!match)continue;
    const rest=clause.slice(match.index+match[0].length);
    if(/^(?:샵|숍|점|사무소|전문점|전문업체|업체|업체로|브랜드)?\s*(?:입니다|이며|으로서|로서)|^(?:을|를)\s*(?:직접\s*)?운영/u.test(rest))return true;
  }
  return false;
}
