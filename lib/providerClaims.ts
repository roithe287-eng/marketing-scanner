import type {IndustryCategory} from './reportSchema';
import {classificationText} from './websiteIdentity';

// Keep the noun next to the action the provider actually performs. A guide about a service
// has a different grammatical object, and a client's service is removed by classificationText.
function offers(object:string,action:string):RegExp{
  return new RegExp('(?:'+object+')(?:을|를)?\\s*(?:직접\\s*)?(?:'+action+')(?:합니다|하고\\s*있습니다|해\\s*드립니다|하는\\s*(?:업체|회사|곳)|하는\\s*전문점)','u');
}
const claims:Record<Exclude<IndustryCategory,'etc'>,RegExp>={
  education:offers('교육\\s*과정|강의|수업|직무\\s*교육|학원|유학\\s*상담|어학\\s*연수\\s*과정','운영|진행|개설|제공'),
  medical:offers('외래\\s*진료|건강\\s*검진|환자','시행|진료|제공'),
  commerce:offers('소매\\s*매장|편집숍|직영\\s*매장|오프라인\\s*매장','운영'),
  realestate:offers('부동산|상가|아파트|주택|전월세|매물','중개|분양'),
  legal:offers('소송|법률\\s*상담|세무\\s*신고|소송\\s*대리','대리|수행|진행|제공|대행'),
  beauty:offers('젤네일|페디큐어|왁싱|속눈썹\\s*연장|피부\\s*관리|헤어\\s*펌','시술|진행'),
  food:offers('음식점|레스토랑|로스터리\\s*카페|식당','운영'),
  travel:offers('여행\\s*상품|가이드\\s*투어|숙박\\s*시설|호텔|펜션','운영|기획'),
  logistics:offers('국제\\s*운송|해외\\s*이사|해상\\s*운송|항공\\s*운송|포워딩','대행|수행|제공'),
  fortune:offers('사주\\s*(?:풀이|상담)|타로\\s*(?:리딩|상담)','진행|제공'),
  it_service:offers('소프트웨어|솔루션|업무용\\s*앱','개발|운영'),
  manufacturing:offers('부품|설비|산업재|장비|포장재|제품','제조|생산'),
  finance:offers('보험\\s*상품|대출\\s*상품|금융\\s*상품','중개|취급|판매'),
  consulting:offers('광고|마케팅|브랜딩|경영\\s*컨설팅','대행|수행'),
  media:offers('뉴스레터|매거진|신문|뉴스','발행|보도'),
  sports:offers('(?:필라테스|피트니스|요가|골프|테니스|수영)(?:\\s*(?:레슨|강습|센터))?','지도|운영|진행'),
  pet:offers('반려견\\s*(?:미용|위탁)|반려동물\\s*돌봄|동물병원|애견호텔','운영|제공|진행'),
  automotive:offers('자동차|차량|중고차','정비|수리|매입'),
  parenting:offers('아이\\s*돌봄|영유아\\s*돌봄|산후\\s*돌봄|육아\\s*코칭','운영|제공|진행'),
  interior:offers('가구|인테리어|리모델링|(?:입주|이사)\\s*청소','제작|시공|설계|제공|진행'),
  event:offers('웨딩\\s*촬영|가족\\s*사진|행사\\s*촬영|행사\\s*대관|예식','진행|제공|운영|대행|촬영'),
  rental:offers('(?:정수기|생활\\s*가전|공기청정기|촬영\\s*장비|카메라|행사\\s*장비|사무\\s*기기|공유\\s*오피스|공간|장비)\\s*(?:렌탈|렌털|대여)','제공|운영|진행'),
  business_services:offers('시설\\s*경비|시설\\s*관리|사업장\\s*보안|건물\\s*관리|인력\\s*파견|헤드헌팅','대행|수행|제공|운영'),
  ecommerce:offers('온라인\\s*(?:쇼핑몰|스토어)|자사몰|공식몰','운영'),
};

export function directIndustries(text:string):IndustryCategory[]{
  const source=classificationText(text);
  if(!source)return [];
  return (Object.keys(claims) as (keyof typeof claims)[]).filter(id=>claims[id].test(source));
}
