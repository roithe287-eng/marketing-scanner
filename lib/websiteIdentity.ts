/** Identity and evidence boundaries shared by the deterministic analysis paths. */
export type OwnBusinessRole='agency'|'software'|'manufacturing'|'home'|'education'|'retail';
type IdentityInput={title?:string;description?:string;h1?:string[]};
const ownLegal=/법무법인|법률사무소|법무사|변호사|세무사|회계사/;
export function ownBusinessRole(data:IdentityInput):OwnBusinessRole|undefined{
  const headings=[data.title,...data.h1||[]].filter(Boolean).join(' ');
  // A legal practice can work on software copyright; that noun is not its role.
  if(ownLegal.test(headings)&&!/광고\s*대행|홈페이지\s*제작|웹\s*제작|소프트웨어\s*(?:개발|제공)/i.test(headings))return;
  for(const [i,text] of [headings,data.description||''].entries()){
    if(isContextOnlyEvidence('',text))continue;
    if(i===1&&/법무법인|법률사무소|병원|의원|클리닉|식당|카페|호텔|펜션|약국/.test(headings))return;
    if(/(?:인테리어|리모델링).{0,8}상품/.test(text)&&!/시공|설계/.test(text))return 'retail';
    if(i===0&&/교육|강의|수업|학습|커리큘럼/.test(text)&&!/쇼핑몰|교재|도서|판매|교육청|교육원\s*소개/.test(text))return 'education';
    if(/쇼핑몰\s*(?:구축|제작)|광고\s*대행|마케팅\s*(?:대행|에이전시)|홈페이지\s*제작|웹\s*제작|브랜딩\s*(?:대행|스튜디오)/i.test(text))return 'agency';
    if(/소프트웨어|\bSaaS\b|업무\s*솔루션|(?:예약|보험|물류|병원|쇼핑몰)\s*(?:관리\s*)?(?:솔루션|시스템)\s*(?:개발|제공)/i.test(text))return 'software';
    if(/제조\s*(?:기업|업체|회사|전문)|(?:기기|장비|부품|제품|임플란트|산업재).{0,12}(?:제조|생산)|(?:manufactur(?:er|ing))\b/i.test(text))return 'manufacturing';
    if(/인테리어|리모델링|(?:청소|소독|방역)\s*(?:전문|서비스|업체)|(?:설계|시공)\s*(?:전문|업체)/i.test(text))return 'home';
    if(/학원|교습소|자격증\s*(?:교육|과정)|지도자\s*(?:교육|양성)|수강\s*(?:신청|안내)/.test(text))return 'education';
    if(/온라인\s*쇼핑몰|쇼핑몰|온라인\s*(?:판매|스토어)|전문\s*(?:쇼핑몰|판매점)/.test(text))return 'retail';
    // A specific role in the title/H1 outranks client nouns in the description.
  }
}

/** Only provider metadata may choose a playbook or an industry. Raw metadata stays available for SEO. */
export function providerIdentity(data:IdentityInput):string{
  return classificationText([data.title,data.description,...data.h1||[]].filter((v):v is string=>!!v&&!isContextOnlyEvidence('',v)).join('\n'));
}

/** Embedded related articles/courses describe their own URLs, not this page. */
export function purposeSchemaTypes(data:{schemaTypes?:string[];jsonLdSchemas?:unknown[];url:string;finalUrl?:string;title?:string;h1?:string[]}):string[]{
  if(!data.jsonLdSchemas?.length)return data.schemaTypes||[];
  const canonical=(value:string)=>{try{const u=new URL(value,data.finalUrl||data.url);return u.origin.replace('//www.','//')+u.pathname.replace(/\/$/,'')+u.search;}catch{return '';}};
  const target=canonical(data.finalUrl||data.url),headings=[data.title,...data.h1||[]].filter(Boolean).join(' ').replace(/\s/g,'');
  const selected=data.jsonLdSchemas.filter((item):item is Record<string,unknown>=>!!item&&typeof item==='object').filter(item=>{
    const ref=item.mainEntityOfPage||item.url||item['@id'];
    const value=typeof ref==='string'?ref:ref&&typeof ref==='object'?String((ref as Record<string,unknown>)['@id']||(ref as Record<string,unknown>).url||''):'';
    if(value)return canonical(value)===target;
    const name=String(item.headline||item.name||'').replace(/\s/g,'');
    return !name||headings.includes(name);
  });
  const scoped=selected.flatMap(item=>Array.isArray(item['@type'])?item['@type']:[item['@type']]).filter((t):t is string=>typeof t==='string').map(t=>t.replace(/^https?:\/\/schema.org\//,''));
  return (data.schemaTypes||[]).map(t=>t.replace(/^https?:\/\/schema.org\//,'')).filter(t=>!/^(?:Article|BlogPosting|NewsArticle|TechArticle|ScholarlyArticle|Course|EducationalOccupationalProgram)$/.test(t)||scoped.includes(t));
}

/** Explicit third-party examples and non-offering sentences are not provider facts. */
export function isContextOnlyEvidence(heading:string,text:string,url=''):boolean{
  return /고객사|고객\s*사례|납품\s*사례|시공\s*사례|포트폴리오|이용\s*후기|고객\s*후기|사용\s*후기|\btestimonial\b|\bcase\s*stud(?:y|ies)\b/i.test(heading)
    ||/^(?:고객사|고객\s*사례|납품\s*사례|시공\s*사례)\s*[:：]/.test(text)
    ||/\/(?:portfolio|testimonials?|reviews?|client-cases)(?:[/?#]|$)/i.test(url);
}
export function isExcludedOffering(text:string):boolean{
  return /(?:제공|취급|운영|판매|진료|시행|대여)\s*(?:하지\s*않|하지\s*못|안\s*합|없)|미제공|미취급|서비스\s*종료|(?:전문|제조|판매|병원|의원|업체)(?:이|가)?\s*아닙/.test(text);
}
export function classificationText(text:string):string{
  return text.split(/(?<=[.!?。])\s+|\n+/u).filter(sentence=>!isExcludedOffering(sentence)).join(' ');
}
export function isSecondarySection(heading:string,text:string,url=''):boolean{
  return isContextOnlyEvidence(heading,text,url)||/^(?:블로그|관련\s*(?:글|기사|콘텐츠)|뉴스|칼럼|소식|추천\s*(?:글|기사))\s*(?:$|[:：·|])/.test(heading);
}

export function providerBody(data:{bodyText?:string;siteEditing?:{contentSections?:{heading:string;text:string;url?:string}[];elements?:{kind:string;heading:string;text:string;href?:string;region?:string;section?:{label:string}}[]}}):string{
  const sections=data.siteEditing?.contentSections;
  if(sections?.length)return sections.filter(s=>!isSecondarySection(s.heading,s.text,s.url)).map(s=>s.heading+'\n'+s.text).join('\n');
  if(data.siteEditing?.elements)return data.siteEditing.elements.filter(e=>['heading','text'].includes(e.kind)&&!['header','nav','footer'].includes(e.region||'')&&!isSecondarySection(e.section?.label||e.heading,e.text,e.href)).map(e=>e.text).join('\n');
  return data.bodyText||'';
}

export function isOtherBranch(title:string,branch?:string):boolean{
  if(!branch)return false;
  const names=title.split(/[\s|·:]+/u).filter(v=>/^[가-힣A-Za-z0-9]+(?:본점|지점|점)$/.test(v)&&!/(?:음식점|제과점|소매점|판매점|대리점|전문점|가맹점)$/.test(v)&&v!=='지점');
  return names.length>0&&!names.includes(branch);
}
