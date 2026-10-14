import {z} from 'zod';

export const SMARTSTORE_NOTICE = '현재 진단 방식에서는 스토어 콘텐츠 대부분을 분석할 수 없습니다. 스마트스토어·브랜드스토어는 네이버가 운영하는 별도 플랫폼으로, 제목·설명 등 일부 공개 정보만 확인할 수 있으며 수집이 제한되면 URL과 업체 식별자만 표시됩니다. 일반 웹사이트 수준의 SEO·GEO·경쟁사 분석 결과는 제공되지 않습니다. 블러 화면은 실제 분석값이 아닌 예시이며, 확인할 수 없는 항목은 감점하지 않습니다.';
const HOSTS = new Set(['smartstore.naver.com','m.smartstore.naver.com','brand.naver.com','m.brand.naver.com']);
export function isSmartstoreUrl(input:string) {
  try {return HOSTS.has(new URL(/^https?:\/\//i.test(input.trim())?input.trim():`https://${input.trim()}`).hostname.toLowerCase().replace(/\.$/,''));} catch {return false;}
}
export function storePlatformLabel(input:string) {
  if(!isSmartstoreUrl(input))return null;
  const host=new URL(/^https?:\/\//i.test(input.trim())?input.trim():`https://${input.trim()}`).hostname.toLowerCase().replace(/\.$/,'').replace(/^m\./,'');
  return host==='brand.naver.com'?'브랜드스토어':'스마트스토어';
}
/** Keep the store/product path, but never tracking parameters or credentials. */
export function parseSmartstoreUrl(input:string) {
  if(!isSmartstoreUrl(input))return null;
  const u=new URL(/^https?:\/\//i.test(input.trim())?input.trim():`https://${input.trim()}`);
  if(u.username||u.password||u.port)throw new Error('스토어의 공개 HTTPS 주소를 입력해 주세요.');
  const match=u.pathname.match(/^\/([a-zA-Z0-9_-]{1,100})(?:\/products\/(\d+))?\/?$/);
  if(!match||['home','main','login','products','i','error','captcha'].includes(match[1].toLowerCase()))throw new Error(`업체 식별자가 포함된 스토어 주소를 입력해 주세요. 예: https://${storePlatformLabel(input)==='브랜드스토어'?'brand.naver.com/dongwon':'smartstore.naver.com/wodkq'}`);
  const host=u.hostname.toLowerCase().replace(/\.$/,'').replace(/^m\./,'');
  const storeId=match[1],productId=match[2];
  return {host,storeId,productId,url:`https://${host}/${storeId}${productId?`/products/${productId}`:''}`,storeUrl:`https://${host}/${storeId}`};
}
export const SmartstoreReportSchema=z.object({
  kind:z.literal('smartstore'),version:z.literal(1),url:z.string().url(),storeUrl:z.string().url(),storeId:z.string(),productId:z.string().optional(),
  observedAt:z.string(),status:z.enum(['observed','limited']),reason:z.string(),httpStatus:z.number().optional(),
  observations:z.array(z.object({id:z.string(),label:z.string(),value:z.string(),note:z.string()})),
});
export type SmartstoreReport=z.infer<typeof SmartstoreReportSchema>;
export const SMARTSTORE_EXCLUSIONS=[
  {label:'사이트 기술 SEO · SEO 종합 점수',reason:'서버·HTML 템플릿·robots.txt·사이트맵 등 플랫폼 관리 영역은 판매자의 개선 점수로 평가하지 않습니다.'},
  {label:'쇼핑 검색 순위 · 노출 · 유입 · 매출 · 전환율',reason:'공개 URL만으로 확인할 수 없습니다. 판매자센터 통계 또는 권한을 부여한 공식 연동이 필요합니다.'},
  {label:'실제 모바일 화면 · 전체 상품 · 전체 후기',reason:'정적 페이지 한 건의 관측으로 전체 스토어의 상태를 판단하지 않습니다.'},
];
