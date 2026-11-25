import {sameSite} from './siteIdentity';
import {ownBusinessRole,purposeSchemaTypes} from './websiteIdentity';
import type {ExtractedWebsiteData} from './extractWebsite';

type RolePage=Pick<ExtractedWebsiteData,'url'|'title'|'h1'> & Partial<Pick<ExtractedWebsiteData,'finalUrl'|'schemaTypes'|'jsonLdSchemas'|'productDiscovery'|'productContext'>>;
const articleType=/^(?:Article|BlogPosting|NewsArticle|TechArticle|ScholarlyArticle)$/iu;
const articles=/^(?:blog|articles?|columns?|magazine|news|insights|칼럼|블로그|뉴스)$/iu;
const guideTitle=/(?:체크리스트|(?:추천|입문|비교|이용|준비|방문|구매|진료|숙박|예약)\s*가이드)\s*(?:[|·–-]|$)/iu;
const editorialHeading=/체크리스트|(?:추천|입문|비교|이용|준비|방문|구매|진료)\s*가이드|가이드\s*(?:글|칼럼)|알아보기|무엇인가요|어떻게\s|(?:전|시)\s*(?:확인할|알아둘)|읽어\s*보기|칼럼|매거진|기사|블로그|사용\s*(?:방법|가이드)|보도자료|\b(?:guide|article|blog|news)\b/iu;

/** A submitted article is an editorial page even when its publisher also sells a service. */
export function isEditorialPage(data:RolePage):boolean{
  const url=data.finalUrl||data.url;
  const structured=purposeSchemaTypes(data);
  const products=[...data.productDiscovery?.sources||[],...data.productContext?.sources||[]];
  let page:URL;
  try{page=new URL(url);}catch{return false;}
  const pageKey=(u:URL)=>u.pathname.replace(/\/$/u,'')+u.search;
  const ownProduct=products.some(product=>sameSite(product.url,url)&&pageKey(new URL(product.url))===pageKey(page));
  if(ownProduct)return false;
  if(structured.some(type=>articleType.test(type)))return true;
  if(structured.some(type=>/^(?:Course|EducationalOccupationalProgram)$/iu.test(type)))return false;
  const names=[data.title,...data.h1||[]];
  if(names.some(title=>guideTitle.test(title)))return true;
  const name=names.join(' ');
  const path=page.pathname.split('/').filter(Boolean).map(segment=>{
    try{return decodeURIComponent(segment);}catch{return segment;}
  });
  if(path.length<2||!articles.test(path[0]))return false;
  return editorialHeading.test(name)||!ownBusinessRole({title:name});
}
